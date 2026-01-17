// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom Cypress configuration
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  const defaultOptions = {
    timeout: 30000,
    failOnStatusCode: false,
  };
  
  return originalFn(url, { ...defaultOptions, ...options });
});

// Add a custom command to wait for network idle
Cypress.Commands.add('waitForNetworkIdle', (timeout = 3000) => {
  cy.window().then(win => {
    return new Cypress.Promise((resolve) => {
      let timeoutId;
      let requestCount = 0;
      
      const checkIdle = () => {
        if (requestCount === 0) {
          resolve();
        }
      };
      
      win.addEventListener('fetch', () => {
        requestCount++;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          requestCount = Math.max(0, requestCount - 1);
          checkIdle();
        }, timeout);
      });
      
      timeoutId = setTimeout(resolve, timeout);
    });
  });
});
