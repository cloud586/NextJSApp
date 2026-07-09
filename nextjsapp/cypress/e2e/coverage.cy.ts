describe('E2E coverage example', () => {
  it('should load the home page and collect coverage', () => {
    cy.visit('/');

    cy.contains('Sutoremu').should('be.visible');
    cy.contains('Stream smarter. Grow faster.').should('be.visible');
  });
});
