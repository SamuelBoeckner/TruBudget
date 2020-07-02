import { Ctx } from "../lib/ctx";
import * as Result from "../result";
import { ConnToken } from "./conn";
import { ServiceUser } from "./domain/organization/service_user";
import * as UserEnable from "./domain/organization/user_enable";
import { getGlobalPermissions } from "./global_permissions_get";
import { store } from "./store";
import * as UserQuery from "./user_query";

export async function enableUser(
  conn: ConnToken,
  ctx: Ctx,
  serviceUser: ServiceUser,
  requestData: UserEnable.RequestData,
): Promise<void> {
  const result = await UserEnable.enableUser(ctx, serviceUser, requestData, {
    getUser: () => UserQuery.getUser(conn, ctx, serviceUser, requestData.userId),
    getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, serviceUser),
  });
  if (Result.isErr(result)) return Promise.reject(result);

  for (const event of result) {
    await store(conn, ctx, event);
  }
}
