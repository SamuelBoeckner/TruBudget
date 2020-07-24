import { Ctx } from "../lib/ctx";
import * as Result from "../result";
import { ConnToken } from "./conn";
import { ServiceUser } from "./domain/organization/service_user";
import * as UserEnable from "./domain/organization/user_enable";
import { getGlobalPermissions } from "./global_permissions_get";
import { store } from "./store";
import * as UserQuery from "./user_query";
import { VError } from "verror";

export async function enableUser(
  conn: ConnToken,
  ctx: Ctx,
  issuer: ServiceUser,
  issuerOrganization: string,
  revokee: UserEnable.RequestData,
): Promise<Result.Type<void>> {
  const result = await UserEnable.enableUser(ctx, issuer, issuerOrganization, revokee, {
    getUser: () => UserQuery.getUser(conn, ctx, issuer, revokee.userId),
    getGlobalPermissions: async () => getGlobalPermissions(conn, ctx, issuer),
  });
  if (Result.isErr(result)) return new VError(result, "failed to enable user");

  for (const event of result) {
    await store(conn, ctx, event);
  }
}
