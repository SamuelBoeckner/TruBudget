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
import * as UserEnabled from "./user_enabled";
import * as UserRecord from "./user_record";
import * as GlobalPermissions from "../workflow/global_permissions";

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
}

export async function enableUser(
  ctx: Ctx,
  issuer: ServiceUser,
  data: RequestData,
  repository: Repository,
): Promise<Result.Type<BusinessEvent[]>> {
  const source = ctx.source;
  const publisher = issuer.id;
  const validationResult = validate(data);
  const intent: Intent = "global.enableUser";
  const currentGlobalPermissions = await repository.getGlobalPermissions();

  // Create the new event:
  const userEnabled = UserEnabled.createEvent(source, publisher, {
    id: data.userId,
  });

  if (Result.isErr(validationResult)) {
    return new PreconditionError(ctx, userEnabled, validationResult.message);
  }

  const userResult = await repository.getUser(data.userId);
  if (Result.isErr(userResult)) {
    return new PreconditionError(ctx, userEnabled, "Error getting user");
  }
  const user = userResult;

  // Check authorization (if not root):
  if (issuer.id !== "root") {
    const isAuthorized = GlobalPermissions.permits(currentGlobalPermissions, issuer, [intent]);
    console.log("CHECK IF ATHORIZED!!!");
    console.log(isAuthorized);
    if (!isAuthorized) {
      return new NotAuthorized({
        ctx,
        userId: issuer.id,
        intent,
        target: currentGlobalPermissions,
      });
    }
  }

  const updatedUser = UserEventSourcing.newUserFromEvent(ctx, user, userEnabled);
  console.log("next ...!!!");
  console.log(updatedUser);
  console.log("newuserFromEvent finished  ...  (enable)!");
  if (Result.isErr(updatedUser)) {
    return new InvalidCommand(ctx, userEnabled, [updatedUser]);
  }
  // Only emit the event if it causes any changes to the permissions:
  if (isEqual(user.permissions, updatedUser.permissions)) {
    return [];
  } else {
    console.log("perm changed: user_enable");
    return [userEnabled];
  }
}
