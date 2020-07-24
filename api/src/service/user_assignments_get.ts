import { Ctx } from "../lib/ctx";
import * as Cache from "./cache2";
import { ConnToken } from "./conn";
import * as UserDisable from "./domain/organization/user_disable";
import * as UserAssignmentsGet from "./domain/workflow/user_assignments_get";
import * as UserAssignments from "./domain/workflow/user_assignments";

export async function getUserAssignments(
  conn: ConnToken,
  ctx: Ctx,
  revokee: UserDisable.RequestData,
): Promise<UserAssignments.UserAssignments> {
  return await Cache.withCache(
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
}
