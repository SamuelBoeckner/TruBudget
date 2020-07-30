import { Ctx } from "../lib/ctx";
import * as Cache from "./cache2";
import { ConnToken } from "./conn";
import * as Result from "../result";
import * as UserDisable from "./domain/organization/user_disable";
import * as UserAssignmentsGet from "./domain/workflow/user_assignments_get";
import * as UserAssignments from "./domain/workflow/user_assignments";

export async function getUserAssignments(
  conn: ConnToken,
  ctx: Ctx,
  revokee: UserDisable.RequestData,
): Promise<Result.Type<UserAssignments.UserAssignments>> {
  const userAssignmentResult = await Cache.withCache(
    conn,
    ctx,
    async (cache) =>
      await UserAssignmentsGet.getUserAssignments(revokee.userId, {
        getAllProjects: async () => {
          return cache.getProjects();
        },
        getSubprojects: async (pId) => {
          return cache.getSubprojects(pId);
        },
        getWorkflowitems: async (pId, spId) => {
          return cache.getWorkflowitems(pId, spId);
        },
      }),
  );
  if (Result.isErr(userAssignmentResult)) {
    userAssignmentResult.message = `could not fetch project permissions: ${userAssignmentResult.message}`;
    return userAssignmentResult;
  }
  return userAssignmentResult;
}
