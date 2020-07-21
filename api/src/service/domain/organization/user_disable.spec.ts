import { assert } from "chai";
import { Ctx } from "../../../lib/ctx";
import * as Result from "../../../result";
import { NotAuthorized } from "../errors/not_authorized";
import { PreconditionError } from "../errors/precondition_error";
import { ServiceUser } from "../organization/service_user";
import { disableUser, RequestData } from "./user_disable";
import { UserRecord } from "./user_record";
import * as GlobalPermissions from "../workflow/global_permissions";
import * as Project from "../workflow/project";
import * as Subproject from "../workflow/subproject";
import * as Workflowitem from "../workflow/workflowitem";

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

const baseProject: Project.Project = {
  assignee: undefined,
  id: "projectId",
  createdAt: new Date().toISOString(),
  status: "open",
  displayName: "dummy",
  description: "dummy",
  projectedBudgets: [],
  permissions: {},
  log: [],
  additionalData: {},
  tags: [],
};

const baseSubproject: Subproject.Subproject = {
  assignee: undefined,
  projectId: "projectId",
  id: "subprojectId",
  createdAt: new Date().toISOString(),
  status: "open",
  displayName: "dummy",
  description: "dummy",
  currency: "EUR",
  projectedBudgets: [],
  workflowitemOrdering: [],
  permissions: {},
  log: [],
  additionalData: {},
};

const baseWorkflowitem: Workflowitem.Workflowitem = {
  assignee: undefined,
  isRedacted: false,
  id: "workflowitemId",
  subprojectId: "subprojectId",
  createdAt: new Date().toISOString(),
  dueDate: new Date().toISOString(),
  status: "open",
  displayName: "dummy",
  description: "dummy",
  amountType: "N/A",
  documents: [],
  permissions: {},
  log: [],
  additionalData: {},
  workflowitemType: "general",
};

const baseRepository = {
  getGlobalPermissions: async () => basePermissions,
  getUser: async () => baseUser,
  getAllProjects: async () => [],
  getSubprojects: async (_pId) => [],
  getWorkflowitems: async (_pId, _spId) => [],
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

describe("Disable users: Check all Assignees", () => {
  // User is still assigned to Project
  it("If the user is assigned to a project, the user cannot be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject, assignee: requestData.userId }],
      getSubprojects: async (_pId) => [],
      getWorkflowitems: async (_pId, _spId) => [],
    });

    // PreconditionError because dummy is assigned for project:
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, PreconditionError);
  });

  it("If the user is not assigned to a project, the user can be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject, assignee: undefined }],
      getSubprojects: async (_pId) => [],
      getWorkflowitems: async (_pId, _spId) => [],
    });
    if (Result.isErr(result)) {
      throw result;
    }
    assert.isTrue(Result.isOk(result));
    assert.isTrue(result.length > 0);
  });

  // User is still assigned to Subproject
  it("If the user is assigned to a subproject, the user cannot be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject }],
      getSubprojects: async (_pId) => [{ ...baseSubproject, assignee: requestData.userId }],
      getWorkflowitems: async (_pId, _spId) => [],
    });

    // PreconditionError because dummy is assigned for subproject:
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, PreconditionError);
  });

  it("If the user is not assigned to a subproject, the user can be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject }],
      getSubprojects: async (_pId) => [{ ...baseSubproject, assignee: undefined }],
      getWorkflowitems: async (_pId, _spId) => [],
    });
    if (Result.isErr(result)) {
      throw result;
    }
    assert.isTrue(Result.isOk(result));
    assert.isTrue(result.length > 0);
  });

  // User is still assigned to workflowitem
  it("If the user is assigned to a workflowitem, the user cannot be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject }],
      getSubprojects: async (_pId) => [{ ...baseSubproject }],
      getWorkflowitems: async (_pId, _spId) => [
        { ...baseWorkflowitem, assignee: requestData.userId },
      ],
    });

    // PreconditionError because dummy is assigned for workflowitem:
    assert.isTrue(Result.isErr(result));
    assert.instanceOf(result, PreconditionError);
  });

  it("If the user is not assigned to a workflowitem, the user can be disabled", async () => {
    const result = await disableUser(ctx, bob, orgaA, requestData, {
      ...baseRepository,
      getAllProjects: async () => [{ ...baseProject }],
      getSubprojects: async (_pId) => [{ ...baseSubproject }],
      getWorkflowitems: async (_pId, _spId) => [{ ...baseWorkflowitem, assignee: undefined }],
    });
    if (Result.isErr(result)) {
      throw result;
    }
    assert.isTrue(Result.isOk(result));
    assert.isTrue(result.length > 0);
  });
});
