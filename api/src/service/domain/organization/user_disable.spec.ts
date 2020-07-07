import { assert } from "chai";
import { Ctx } from "../../../lib/ctx";
import * as Result from "../../../result";
import { NotAuthorized } from "../errors/not_authorized";
import { ServiceUser } from "../organization/service_user";
import { disableUser, RequestData } from "./user_disable";
import { UserRecord } from "./user_record";
import * as GlobalPermissions from "../workflow/global_permissions";

const ctx: Ctx = { requestId: "", source: "test" };
const root: ServiceUser = { id: "root", groups: [] };
const bob: ServiceUser = { id: "bob", groups: [] };
const charlie: ServiceUser = { id: "charlie", groups: [] };
const orgaA = "orgaA";
const otherOrganization = "otherOrganization";

const basePermissions: GlobalPermissions.GlobalPermissions = {
  permissions: { "global.disableUser": ["bob"] },
  log: [],
};

const baseUser: UserRecord = {
  id: "dummy",
  createdAt: new Date().toISOString(),
  displayName: "dummy",
  organization: orgaA,
  passwordHash: "12345",
  address: "12345",
  encryptedPrivKey: "12345",
  permissions: {},
  log: [],
  additionalData: {},
};

const requestData: RequestData = {
  userId: "dummy",
};

const baseRepository = {
  getGlobalPermissions: async () => basePermissions,
  getUser: async () => baseUser,
};

describe("Disable users: permissions", () => {
  it("Without the global.disableUser permission, a user cannot disable users", async () => {
    const result = await disableUser(ctx, charlie, orgaA, requestData, {
      ...baseRepository,
    });

    // NotAuthorized error due to the missing permissions:
    assert.isTrue(Result.isErr(result), "Charlie is not authorized to disable users");
    assert.instanceOf(result, NotAuthorized, "The error is of the type 'Not Authorized'");
  });

  it("The root user doesn't need permission to disable users", async () => {
    const result = await disableUser(ctx, root, orgaA, requestData, {
      ...baseRepository,
    });
    assert.isTrue(Result.isOk(result));
  });

  it("A user can disable users if the correct permissions are given", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
    });
    if (Result.isErr(result)) {
      throw result;
    }
    assert.isTrue(Result.isOk(result));
    assert.isTrue(result.length > 0);
  });

  it("Root user cannot disable users from other organizations", async () => {
    const result = await disableUser(ctx, root, otherOrganization, requestData, {
      ...baseRepository,
    });
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, NotAuthorized, "The error is of the type 'Not Authorized'");
  });

  it("A user cannot disable users from other organizations", async () => {
    const result = await disableUser(ctx, bob, otherOrganization, requestData, {
      ...baseRepository,
    });
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, NotAuthorized, "The error is of the type 'Not Authorized'");
  });
});
