import { Ctx } from "../lib/ctx";
import * as Result from "../result";
import { ConnToken } from "./conn";
import { ServiceUser } from "./domain/organization/service_user";
import * as UserDisable from "./domain/organization/user_disable";
import { getGlobalPermissions } from "./global_permissions_get";
import { store } from "./store";
import * as UserQuery from "./user_query";

export async function disableUser(
  conn: ConnToken,
  ctx: Ctx,
  serviceUser: ServiceUser,
  requestData: UserDisable.RequestData,
): Promise<void> {
  const result = await UserDisable.disableUser(ctx, serviceUser, requestData, {
    getUser: () => UserQuery.getUser(conn, ctx, serviceUser, requestData.userId),
    getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, serviceUser),
  });
  if (Result.isErr(result)) return Promise.reject(result);

  for (const event of result) {
    await store(conn, ctx, event);
  }
}
