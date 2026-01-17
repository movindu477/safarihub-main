// ***********************************************
// Custom commands for SafariHub E2E testing
// ***********************************************

// Login command for reusable authentication
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.wait(1000);
  cy.contains('Login', { matchCase: false, timeout: 10000 }).click();
  cy.wait(500);
  cy.get('input[type="email"]').clear().type(email);
  cy.get('input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  cy.wait(2000);
});

// Register tourist command
Cypress.Commands.add('registerTourist', (userData) => {
  const {
    fullName = 'Hiruka',
    email = 'h@gmail.com',
    phone = '0742341234',
    country = 'Sri Lanka',
    password = '123456'
  } = userData;

  cy.visit('/');
  cy.wait(1000);
  cy.contains('Register', { matchCase: false, timeout: 10000 }).click();
  cy.wait(1000);
  
  // Select tourist role if role selection exists
  cy.get('body').then($body => {
    if ($body.text().includes('Tourist') || $body.text().includes('TOURIST')) {
      cy.contains('Tourist', { matchCase: false }).click();
      cy.wait(500);
    }
  });
  
  // Fill form
  cy.get('input[type="text"]').first().clear().type(fullName);
  cy.get('input[type="email"]').clear().type(email);
  
  cy.get('input[type="tel"]').then($phone => {
    if ($phone.length > 0) {
      cy.wrap($phone).first().clear().type(phone);
    }
  });
  
  cy.get('select').then($selects => {
    if ($selects.length > 0) {
      cy.wrap($selects).first().select(country);
    }
  });
  
  cy.get('input[type="password"]').first().clear().type(password);
  cy.get('input[type="password"]').last().clear().type(password);
  
  cy.get('button[type="submit"]').click();
  cy.wait(3000);
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.contains('Logout', { matchCase: false }).click();
  cy.wait(1000);
});

// Wait for Firestore to be ready
Cypress.Commands.add('waitForFirestore', () => {
  cy.window().its('firebase', { timeout: 10000 }).should('exist');
  cy.wait(1000);
});
