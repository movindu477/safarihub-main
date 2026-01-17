// ***********************************************************
// This file is processed and loaded automatically before your test files.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Import cypress-file-upload plugin
import 'cypress-file-upload';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Prevent Cypress from failing on uncaught exceptions from the application
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore Firestore and Firebase connection errors during tests
  if (err.message.includes('firestore') || 
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('CORS') ||
      err.message.includes('WebChannel') ||
      err.message.includes('Firebase') ||
      err.message.includes('auth/') ||
      err.message.includes('googleapis') ||
      err.message.includes('ResizeObserver') ||
      err.message.includes('Loading chunk') ||
      err.message.includes('dynamically imported module')) {
    return false;
  }
  // We still want to ensure there are no other unexpected errors
  return true;
});

// Global before hook - runs once before all tests
before(() => {
  cy.log('Starting SafariHub E2E Tests');
});

// Global after hook - runs once after all tests
after(() => {
  cy.log('SafariHub E2E Tests Completed');
});
