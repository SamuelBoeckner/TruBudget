describe("Login", function() {
  let projectId, subprojectId, workflowitemId, baseUrl, apiRoute;

  // Generate random IDs since every ID can only exists once in the multichain
  const baseId = Math.floor(Math.random() * 10000);

  before(function() {
    baseUrl = Cypress.env("API_BASE_URL") || `${Cypress.config("baseUrl")}/test`;
    apiRoute = baseUrl.toLowerCase().includes("test") ? "/test/api" : "/api";
    cy.login();
    cy.createProject("p-enableUser", "enable/disable user test").then(({ id }) => {
      projectId = id;
      cy.createSubproject(projectId, "sp-enableUser").then(({ id }) => {
        subprojectId = id;
        cy.createWorkflowitem(projectId, subprojectId, "wf-enableUser").then(({ id }) => {
          workflowitemId = id;
          // Logout
          localStorage.setItem("state", undefined);
        });
      });
    });
  });

  beforeEach(function() {
    // Login as user admin
    cy.login("mstein", "test");
    cy.visit("/users");
  });

  it("Create a new user and check if the user can log in normally", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.createUser").as("createUser");
    cy.route("POST", apiRoute + "/user.authenticate").as("authenticate");
    // Create new user
    const userId = createTestUserUi(baseId + 1);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@createUser");
    // Logout
    logout();
    // Test if the user can log in
    tryLoginUi(userId, "test");
    cy.get("[data-test=login-page").should("not.be.visible");
    cy.wait("@authenticate");
    cy.get("[data-test=openSideNavbar]").should("be.visible");
  });

  it("When the user has been created, the user is showing up in the proper user list", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.createUser").as("createUser");
    cy.route("GET", apiRoute + "/user.list").as("userList");
    // Create new user
    const userId = createTestUserUi(baseId + 2);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@createUser");
    cy.wait("@userList");
    // Check user list
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.get("[aria-label=disabledUsersTab]").click();
    cy.get(`[data-test=user-${userId}]`).should("not.be.visible");
  });

  it("When the user has been disabled sucessfully, it dissappears in user list and shows up in disabled-user list", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUser");
    cy.route("GET", apiRoute + "/user.list").as("userList");
    // Create new user
    const userId = createTestUser(baseId + 3);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@userList");
    // Disable user
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUser");
    cy.wait("@userList");
    // Check disabled-user list
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=user-${userId}]`).should("not.be.visible");
    cy.get("[aria-label=disabledUsersTab]").click();
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
  });

  it("When the user has been restored (re-enabled) sucessfully, it dissappears in disabled-user list and shows up in user list", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUser");
    cy.route("POST", apiRoute + "/global.enableUser").as("enableUser");
    cy.route("GET", apiRoute + "/user.list").as("userList");
    // Create new user
    const userId = createTestUser(baseId + 4);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@userList");
    // Disable user
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUser");
    cy.wait("@userList");
    // Restore user
    cy.get("[aria-label=disabledUsersTab]")
      .should("be.visible")
      .click();
    cy.wait("@userList");
    cy.get(`[data-test=enable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@enableUser");
    cy.wait("@userList");
    // Check user list
    cy.get("[aria-label=usersTab]")
      .should("be.visible")
      .click();
    cy.wait("@userList");
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.get("[aria-label=disabledUsersTab]").click();
    cy.get(`[data-test=user-${userId}]`).should("not.be.visible");
  });

  it("Disabled user has to use correct password to see that he has been disabled", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.createUser").as("createUser");
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUser");
    cy.route("GET", apiRoute + "/user.list").as("userList");
    // Create new user
    const userId = createTestUser(baseId + 5);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@userList");
    // Disable user
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUser");
    cy.wait("@userList");
    // Logout
    logout();
    //Login with wrong password
    tryLoginUi(userId, "wrongPassword");
    cy.get("[data-test=incorrect-password]").should("be.visible");
    cy.get("[data-test=login-disabled]").should("not.be.visible");
    //Login with right password
    tryLoginUi(userId, "test");
    cy.get("[data-test=incorrect-password]").should("not.be.visible");
    cy.get("[data-test=login-disabled]").should("be.visible");
  });

  it("Restore a user and check if Login page works properly", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUser");
    cy.route("POST", apiRoute + "/global.enableUser").as("enableUser");
    cy.route("GET", apiRoute + "/user.list").as("userList");
    cy.route("POST", apiRoute + "/user.authenticate").as("authenticate");
    // Create new user
    const userId = createTestUser(baseId + 6);
    cy.get(`[data-test=user-${userId}]`).should("be.visible");
    cy.wait("@userList");
    // Disable and restore(re-enable) user
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUser");
    cy.wait("@userList");
    cy.get("[aria-label=disabledUsersTab]")
      .should("be.visible")
      .click();
    cy.wait("@userList");
    cy.get(`[data-test=enable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@enableUser");
    cy.wait("@userList");
    // Logout
    logout();
    // Test if the right error message is shown by typing wrong password
    tryLoginUi(userId, "wrongPassword");
    cy.get("[data-test=incorrect-password]").should("be.visible");
    cy.get("[data-test=login-disabled]").should("not.be.visible");
    // Test if user can login properly
    tryLoginUi(userId, "test");
    cy.get("[data-test=login-page]").should("not.be.visible");
    cy.wait("@authenticate");
    cy.get("[data-test=openSideNavbar]").should("be.visible");
  });

  it("The user-disable action is rejected if the user is still assigned to a project", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUserFail");
    // Create new user and project
    const userId = createTestUser(baseId + 7);
    // Assign to project
    cy.updateProjectAssignee(projectId, userId);
    // Disabling user should fail
    cy.visit("/users");
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUserFail").then(xhr => {
      // Error because this user is still assigned to a project
      expect(xhr.response.body.error.code).to.eql(412);
    });
  });

  it("The user-disable action is rejected if the user is still assigned to a subproject", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUserFail");
    // Create new user and project
    const userId = createTestUser(baseId + 8);
    // Assign to subproject
    cy.updateSubrojectAssignee(projectId, subprojectId, userId);
    // Disabling user should fail
    cy.visit("/users");
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUserFail").then(xhr => {
      // Error because this user is still assigned to a subproject
      expect(xhr.response.body.error.code).to.eql(412);
    });
  });

  it("The user-disable action is rejected if the user is still assigned to a workflowitem", function() {
    cy.server();
    cy.route("POST", apiRoute + "/global.disableUser").as("disableUserFail");
    // Create new user and project
    const userId = createTestUser(baseId + 9);
    // Assign to workflowitem
    cy.updateWorkflowitemAssignee(projectId, subprojectId, workflowitemId, userId);
    // Disabling user should fail
    cy.visit("/users");
    cy.get("[aria-label=usersTab]").click();
    cy.get(`[data-test=disable-user-${userId}]`)
      .should("be.visible")
      .click();
    cy.wait("@disableUserFail").then(xhr => {
      // Error because this user is still assigned to a workflowitem
      expect(xhr.response.body.error.code).to.eql(412);
    });
  });
});

function createTestUserUi(num) {
  //cy.visit("/users");
  cy.get("[data-test=create]").click();
  cy.get("[data-test=accountname] input")
    .type(`Test User${num}`)
    .should("have.value", `Test User${num}`);
  cy.get("[data-test=username] input")
    .type(`testuser${num}`)
    .should("have.value", `testuser${num}`);
  cy.get("[data-test=password] input")
    .type("test")
    .should("have.value", "test");
  cy.get("[data-test=submit]").click();
  return `testuser${num}`;
}

function createTestUser(num) {
  // when e2e-tests run local, set organization to "ACMECorp" instead of "KfW"
  cy.addUser(`Test User${num}`, `testuser${num}`, "test", "KfW");
  //Refresh user list
  cy.visit("/users");
  return `testuser${num}`;
}

function tryLoginUi(userId, password) {
  cy.visit("/");
  cy.get("#loginpage")
    .should("be.visible")
    .get("#username")
    .type(userId)
    .should("have.value", userId)
    .get("#password")
    .type(password)
    .should("have.value", password)
    .get("#loginbutton")
    .click();
}

function logout() {
  cy.visit("/");
  cy.get("#logoutbutton")
    .should("be.visible")
    .click();
  // Check if logged out correctly
  cy.get("#loginpage").should("be.visible");
}
