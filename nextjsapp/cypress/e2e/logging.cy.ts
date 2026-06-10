describe("Logging correlation ID", () => {
  it("returns x-correlation-id on page responses", () => {
    cy.request("/").then((response) => {
      const correlationId = response.headers["x-correlation-id"];
      expect(correlationId).to.be.a("string");
      expect(correlationId).to.not.equal("");
    });
  });

  it("renders correlation id meta tag on the home page", () => {
    cy.visit("/");
    cy.get('meta[name="x-correlation-id"]')
      .should("have.attr", "content")
      .and("not.be.empty");
  });
});
