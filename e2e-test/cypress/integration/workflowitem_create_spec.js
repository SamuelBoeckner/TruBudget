describe("Workflowitem create", function() {
  let projectId;
  let subprojectId;
  const today = Cypress.moment().format("YYYY-MM-DD");

  before(() => {
    cy.login();

    cy.createProject("workflowitem create test project", "workflowitem create test", [])
      .then(({ id }) => {
        projectId = id;
        return cy.createSubproject(projectId, "workflowitem create test", "EUR");
      })
      .then(({ id }) => {
        subprojectId = id;
      });
  });

  beforeEach(function() {
    cy.login();
    cy.visit(`/projects/${projectId}/${subprojectId}`);
  });

  it("When creating an allocated workflowitem, the currency is equal to the subproject's currency", function() {
    // Open create-dialog of workflow item
    cy.get("[data-test=createWorkflowitem]").click();
    cy.get("[data-test=creation-dialog]").should("be.visible");

    cy.get("[data-test=nameinput] input")
      .click()
      .type("Test");
    cy.get("[data-test=datepicker-due-date]")
      .click()
      .type("2050-02-02");
    cy.get("[data-test=commentinput] textarea")
      .last()
      .click()
      .type("Test");
    cy.get("[data-test=amount-type-allocated]").click();
    cy.get("[data-test=dropdown-currencies-click]").should("contain", "EUR");

    // When the currency is equal to the currency of the subproject
    // the exchange rate field is disabled
    cy.get("[data-test=rateinput] input").should("be.disabled");
  });

  it("Check warnings that permissions are not assigned", function() {
    // Create a workflow item
    cy.get("[data-test=createWorkflowitem]").click();
    cy.get("[data-test=nameinput] input")
      .should("be.visible")
      .click()
      .type("Test");
    cy.get("[data-test=datepicker-due-date]")
      .click()
      .type("2050-02-02");
    cy.get("[data-test=commentinput] textarea")
      .last()
      .click()
      .type("Test");
    cy.get("[data-test=amount-type-allocated]").click();

    // Select a different currency than the subproject currency
    cy.get("[data-test=dropdown-currencies-click]").click();
    cy.get("[data-value=USD]")
      .should("be.visible")
      .click();

    // Enter amount
    cy.get("[data-test=amountinput] input")
      .click()
      .type("1234");

    // The exchange rate field should be enabled because
    // we selected a different currency
    cy.get("[data-test=rateinput] input").should("be.enabled");
    cy.get("[data-test=rateinput] input")
      .click()
      .type("1.5");
    cy.get("[data-test=next]").click();
    cy.get("[data-test=submit]").click();

    //Check snackbar warning visible
    cy.get("[data-test=client-snackbar]")
      .should("be.visible")
      .should("contain", "permissions");

    //Check warning badge
    cy.get("[data-test=perm-warning-badge-enabled]").should("be.visible");

    // Check if warning badge dissappears after opening the permission-dialog
    cy.get("[data-test=workflowitem-table]")
      .find("[data-test=show-workflowitem-permissions]")
      .last()
      .click({ force: true });
    cy.get("[data-test=permission-container]")
      .should("be.visible")
      .get("[data-test=permission-submit]")
      .click();

    cy.get("[data-test=perm-warning-badge-disabled]").should("be.visible");
  });

  it("Show exchange rate correctly when currency of workflowitem differs from the subproject currency", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "allocated",
      amount: "1",
      currency: "USD",
      exchangeRate: "1.4"
    }).then(({ id }) => {
      let workflowitemId = id;
      // The workflow item amount should be displayed in the
      // subproject's currency
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get("[data-test=workflowitem-amount]")
        .first()
        .should("contain", "€");
      // The information on the workflow item amount
      // and exchange rate is displayed in a tooltip
      cy.get("[data-test=amount-explanation]")
        .first()
        .should("have.attr", "title")
        .should("contain", "$");
    });
  });

  it("Root can not create a Workflowitem", function() {
    cy.login("root", "root-secret");
    cy.visit(`/projects/${projectId}/${subprojectId}`);

    // When root is logged in the create workflow item button
    // is disabled
    cy.get("[data-test=createWorkflowitem]").should("be.visible");
    cy.get("[data-test=createWorkflowitem]").should("be.disabled");
  });

  it("If the due-date is set and not exceeded, it should be displayed in workflowitem details without alert-border", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: "2050-03-03"
    }).then(({ id }) => {
      let workflowitemId = id;
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='workflowitem-info-button-${workflowitemId}']`).click();
      cy.get("[data-test=due-date]").should("be.visible");
      // No orange alertborder
      cy.get("[data-test=due-date]").should("not.have.css", "border", "3px solid rgb(255, 143, 0)");
    });
  });

  it("If the due-date is set and exceeded, it should be displayed in workflowitem details with alert-border", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: "2000-03-03"
    }).then(({ id }) => {
      let workflowitemId = id;
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='workflowitem-info-button-${workflowitemId}']`).click();
      cy.get("[data-test=due-date]").should("be.visible");
      // With orange alert-border
      cy.get("[data-test=due-date]").should("have.css", "border", "3px solid rgb(255, 143, 0)");
    });
  });

  it("If the due-date is not set (empty string), it should not be displayed in workflowitem details", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: ""
    }).then(({ id }) => {
      let workflowitemId = id;
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='workflowitem-info-button-${workflowitemId}']`).click();
      cy.get("[data-test=due-date]").should("not.be.visible");
    });
  });

  it("If the due-date is not set, it should not be displayed in workflowitem details", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test").then(({ id }) => {
      let workflowitemId = id;
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='workflowitem-info-button-${workflowitemId}']`).click();
      cy.get("[data-test=due-date]").should("not.be.visible");
    });
  });

  it("If the due-date is set and exceeded, the info icon badge is displayed", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: "2000-03-03"
    }).then(({ id }) => {
      let workflowitemId = id;
      // Check if info icon badge is displayed
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='info-warning-badge-enabled-${workflowitemId}']`).should("be.visible");
    });
  });

  it("If the due-date is set to today, the due-date is exceeded and the info icon badge is displayed", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: today
    }).then(({ id }) => {
      let workflowitemId = id;
      // Check if info icon badge is displayed
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='info-warning-badge-enabled-${workflowitemId}']`).should("be.visible");
    });
  });

  it("If the due-date is set and not exceeded, the info icon badge is not displayed", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: "2050-03-03"
    }).then(({ id }) => {
      let workflowitemId = id;
      // Check if info icon badge is NOT displayed
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='info-warning-badge-enabled-${workflowitemId}']`).should("not.be.visible");
    });
  });
  it("If the due-date is not set, the info icon badge is not displayed", function() {
    // Create a workflow item
    cy.createWorkflowitem(projectId, subprojectId, "workflowitem assign test", {
      amountType: "N/A",
      dueDate: undefined
    }).then(({ id }) => {
      let workflowitemId = id;
      // Check if info icon badge is NOT displayed
      cy.get("[data-test=workflowitem-" + workflowitemId + "]").should("be.visible");
      cy.get(`[data-test^='info-warning-badge-enabled-${workflowitemId}']`).should("not.be.visible");
    });
  });
});
