describe('Home page', () => {
  it('renders the home page heading', () => {
    cy.visit('/');
    cy.contains('To get started, edit the page.tsx file.').should('be.visible');
  });
});
