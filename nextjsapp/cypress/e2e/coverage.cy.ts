describe('E2E coverage example', () => {
  it('should load the home page and collect coverage', () => {
    cy.visit('/');

    cy.contains('To get started, edit the page.tsx file.').should('be.visible');
  });
});
