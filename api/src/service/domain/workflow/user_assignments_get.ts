import * as Project from "./project";
import * as Subproject from "./subproject";
import * as Workflowitem from "./workflowitem";
import * as Result from "../../../result";
import * as UserAssignments from "./user_assignments";

interface Repository {
  getAllProjects(): Promise<Project.Project[]>;
  getSubprojects(projectId: string): Promise<Result.Type<Subproject.Subproject[]>>;
  getWorkflowitems(
    projectId: string,
    subprojectId: string,
  ): Promise<Result.Type<Workflowitem.Workflowitem[]>>;
}

export async function getUserAssignments(
  userId: string,
  repository: Repository,
): Promise<UserAssignments.UserAssignments> {
  const assignedProjects: Project.Project[] = [];
  const assignedSubprojects: Subproject.Subproject[] = [];
  const assignedWorkflowitems: Workflowitem.Workflowitem[] = [];

  const projects = await repository.getAllProjects();
  for await (const project of projects) {
    if (project.status === "closed") continue;
    if (project.assignee === userId) {
      assignedProjects.push(project);
    }
    const subprojects = await repository.getSubprojects(project.id);
    if (Result.isErr(subprojects)) continue;
    for await (const subproject of subprojects) {
      if (subproject.status === "closed") continue;
      if (subproject.assignee === userId) {
        assignedSubprojects.push(subproject);
      }
      const workflowitems = await repository.getWorkflowitems(project.id, subproject.id);
      if (Result.isErr(workflowitems)) continue;
      for await (const workflowitem of workflowitems) {
        if (workflowitem.status === "closed") continue;
        if (workflowitem.assignee === userId) {
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
    return {};
  } else {
    return {
      projects: assignedProjects,
      subprojects: assignedSubprojects,
      workflowitems: assignedWorkflowitems,
    };
  }
}

export function toString(assignments: UserAssignments.UserAssignments) {
  let projects = "";
  let subprojects = "";
  let workflowitems = "";
  if (assignments.projects !== undefined) {
    projects = assignments.projects.reduce((x: string, curr: Project.Project) => {
      return x + curr.displayName + ", ";
    }, "Assigned projects: ");
  }
  if (assignments.subprojects !== undefined) {
    subprojects = assignments.subprojects.reduce((x: string, curr: Subproject.Subproject) => {
      return x + curr.displayName + ", ";
    }, " Assigned subprojects: ");
  }
  if (assignments.workflowitems !== undefined) {
    workflowitems = assignments.workflowitems.reduce(
      (x: string, curr: Workflowitem.Workflowitem) => {
        return x + curr.displayName + ", ";
      },
      " Assigned workflowitems: ",
    );
  }
  return projects + subprojects + workflowitems;
}
