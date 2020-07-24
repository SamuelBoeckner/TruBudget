import { Ctx } from "../lib/ctx";
import * as Result from "../result";
import { ConnToken } from "./conn";
import * as Cache from "./cache2";
import { ServiceUser } from "./domain/organization/service_user";
import * as UserDisable from "./domain/organization/user_disable";
import { getGlobalPermissions } from "./global_permissions_get";
import { getUserAssignments } from "./user_assignments_get";
import { store } from "./store";
import * as UserQuery from "./user_query";
import { VError } from "verror";

export async function disableUser(
  conn: ConnToken,
  ctx: Ctx,
  issuer: ServiceUser,
  issuerOrganization: string,
  revokee: UserDisable.RequestData,
): Promise<Result.Type<void>> {
  const result = await Cache.withCache(conn, ctx, async (cache) =>
    UserDisable.disableUser(ctx, issuer, issuerOrganization, revokee, {
      getUser: () => UserQuery.getUser(conn, ctx, issuer, revokee.userId),
      getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, issuer),
      getUserAssignments: async () => getUserAssignments(conn, ctx, revokee),
    }),
  );
  if (Result.isErr(result)) return new VError(result, "failed to disable user");

  for (const event of result) {
    await store(conn, ctx, event);
  }
}
