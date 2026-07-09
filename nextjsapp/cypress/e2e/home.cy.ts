describe("Home page", () => {
  it("renders the Sutoremu marketing frontpage", () => {
    cy.visit("/");

    cy.contains("Sutoremu").should("be.visible");
    cy.contains("Stream smarter. Grow faster.").should("be.visible");
    cy.contains("a", "Login").should("be.visible");
    cy.contains("a", "Sign up").should("not.exist");

    cy.get('[data-testid="products-dropdown-trigger"]')
      .should("have.attr", "data-hydrated", "true")
      .click();
    cy.get('[data-testid="products-menu"]').should("be.visible");
    cy.contains('[role="menuitem"]', "Sub Analytics").should("be.visible");
  });

  it("loads the Sub Analytics placeholder route", () => {
    cy.visit("/products/sub-analytics");

    cy.contains("Sub Analytics").should("be.visible");
    cy.contains("Coming soon.").should("be.visible");
  });
});
