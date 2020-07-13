import Joi = require("joi");
import isEqual = require("lodash.isequal");
import Intent from "../../../authz/intents";
import { Ctx } from "../../../lib/ctx";
import * as Result from "../../../result";
import { BusinessEvent } from "../business_event";
import { InvalidCommand } from "../errors/invalid_command";
import { NotAuthorized } from "../errors/not_authorized";
import { PreconditionError } from "../errors/precondition_error";
import { ServiceUser } from "./service_user";
import * as UserEventSourcing from "./user_eventsourcing";
import * as UserDisabled from "./user_disabled";
import * as UserRecord from "./user_record";
import * as GlobalPermissions from "../workflow/global_permissions";
import * as Project from "../workflow/project";
import * as Subproject from "../workflow/subproject";
import * as Workflowitem from "../workflow/workflowitem";
import { map } from "../../../result";

export interface RequestData {
  userId: string;
}

const requestDataSchema = Joi.object({
  userId: UserRecord.idSchema.required(),
});

export function validate(input: any): Result.Type<RequestData> {
  const { value, error } = Joi.validate(input, requestDataSchema);
  return !error ? value : error;
}

interface Repository {
  getUser(userId: string): Promise<Result.Type<UserRecord.UserRecord>>;
  getGlobalPermissions(): Promise<GlobalPermissions.GlobalPermissions>;
  getAllProjects(): Promise<Project.Project[]>;
  getSubprojects(projectId: string): Promise<Result.Type<Subproject.Subproject[]>>;
  getWorkflowitems(
    projectId: string,
    subprojectId: string,
  ): Promise<Result.Type<Workflowitem.Workflowitem[]>>;
}

async function checkAssignments(repository: Repository, userToDisable: string) {
  let assignedProjects: Project.Project[] = [];
  let assignedSubprojects: Subproject.Subproject[] = [];
  let assignedWorkflowitems: Workflowitem.Workflowitem[] = [];

  const projects = await repository.getAllProjects();
  //assignedProjects = projects.filter((project) => project.assignee === userToDisable && project.status === "open");
  for await (const project of projects) {
    if (project.status === "closed") continue;
    if (project.assignee === userToDisable) {
      assignedProjects.push(project);
    }
    const subprojects = await repository.getSubprojects(project.id);
    if (Result.isErr(subprojects)) continue;
    for await (const subproject of subprojects) {
      if (subproject.status === "closed") continue;
      if (subproject.assignee === userToDisable) {
        assignedSubprojects.push(subproject);
      }
      const workflowitems = await repository.getWorkflowitems(project.id, subproject.id);
      if (Result.isErr(workflowitems)) continue;
      for await (const workflowitem of workflowitems) {
        if (workflowitem.status === "closed") continue;
        if (workflowitem.assignee === userToDisable) {
          assignedWorkflowitems.push(workflowitem);
        }
      }
    }
  }
  if (
    assignedProjects.length === 0 &&
    assignedSubprojects.length === 0 &&
    assignedWorkflowitems.length === 0
  ) {
    return false;
  }
  return { assignedProjects, assignedSubprojects, assignedWorkflowitems };
}

export async function disableUser(
  ctx: Ctx,
  issuer: ServiceUser,
  issuerOrganization: string,
  data: RequestData,
  repository: Repository,
): Promise<Result.Type<BusinessEvent[]>> {
  const source = ctx.source;
  const publisher = issuer.id;
  const validationResult = validate(data);
  const intent: Intent = "global.disableUser";
  const currentGlobalPermissions = await repository.getGlobalPermissions();
  const userToDisable = data.userId;
  // Create the new event:
  const userDisabled = UserDisabled.createEvent(source, publisher, {
    id: userToDisable,
  });

  if (Result.isErr(validationResult)) {
    return new PreconditionError(ctx, userDisabled, validationResult.message);
  }

  const userResult = await repository.getUser(userToDisable);
  if (Result.isErr(userResult)) {
    return new PreconditionError(ctx, userDisabled, "Error getting user");
  }
  const user = userResult;

  // Check if revokee and issuer belong to the same organization
  if (userResult.organization !== issuerOrganization) {
    return new NotAuthorized({
      ctx,
      userId: issuer.id,
      intent,
      target: currentGlobalPermissions,
    });
  }

  // Check authorization (if not root):
  if (issuer.id !== "root") {
    const isAuthorized = GlobalPermissions.permits(currentGlobalPermissions, issuer, [intent]);
    if (!isAuthorized) {
      return new NotAuthorized({
        ctx,
        userId: issuer.id,
        intent,
        target: currentGlobalPermissions,
      });
    }
  }

  // Check if user is assigned to project / subproject / workflowitem
  const assignments = await checkAssignments(repository, userToDisable);
  if (assignments) {
    console.log(" yes this user is assigned somehow - error");
    console.log(assignments);
    return new PreconditionError(
      ctx,
      userDisabled,
      "Error - This user is still assigned to some project/subproject/wf-item: ",
    );
  }
  console.log(" no ");
  console.log(assignments);

  const updatedUser = UserEventSourcing.newUserFromEvent(ctx, user, userDisabled);
  if (Result.isErr(updatedUser)) {
    return new InvalidCommand(ctx, userDisabled, [updatedUser]);
  }
  // Only emit the event if it causes any changes to the permissions:
  if (isEqual(user.permissions, updatedUser.permissions)) {
    return [];
  } else {
    return [userDisabled];
  }
}
