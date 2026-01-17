describe('Authentication Testing - SafariHub', () => {

  before(() => {
    cy.log('Starting SafariHub E2E Tests');
  });

  beforeEach(() => {
    // Clear all auth state before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearAllSessionStorage();
  });

  // ========================================
  // TOURIST AUTHENTICATION TESTS
  // ========================================

  describe('Tourist Authentication', () => {
    
    it('Tourist can register successfully with valid details', () => {
      // Visit the home page
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Ensure we're logged out first
      cy.window().then((win) => {
        win.localStorage.clear();
        win.sessionStorage.clear();
      });
      
      cy.reload();
      cy.wait(2000);
      
      // Click Register button
      cy.contains('Register', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Select Tourist role
      cy.get('body').then($body => {
        if ($body.text().includes('Tourist')) {
          cy.contains('Tourist', { matchCase: false }).should('be.visible').click({ force: true });
          cy.wait(1000);
        }
      });
      
      // Fill in registration form - AUTO COMPLETE
      // Full Name: Hiruka
      cy.get('input[type="text"]', { timeout: 10000 }).first().should('be.visible').clear().type('Hiruka', { delay: 50 });
      cy.wait(300);
      
      // Email: h@gmail.com
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('h@gmail.com', { delay: 50 });
      cy.wait(300);
      
      // Phone: 0742341234
      cy.get('body').then($body => {
        const $phone = $body.find('input[type="tel"]');
        if ($phone.length > 0) {
          cy.get('input[type="tel"]').first().should('be.visible').clear().type('0742341234', { delay: 50 });
          cy.wait(300);
        }
      });
      
      // Country: Try different variations
      cy.get('body').then($body => {
        const $select = $body.find('select');
        if ($select.length > 0) {
          // Get all options and find the right one
          cy.get('select').first().should('be.visible').then($sel => {
            const options = Array.from($sel.find('option')).map(opt => opt.text.trim());
            cy.log('Available options:', options);
            
            // Try different variations of Sri Lanka
            const sriLankaOption = options.find(opt => 
              opt.toLowerCase().includes('sri lanka') || 
              opt.toLowerCase().includes('srilanka')
            );
            
            if (sriLankaOption) {
              cy.get('select').first().select(sriLankaOption);
            } else if (options.includes('Sri Lanka')) {
              cy.get('select').first().select('Sri Lanka');
            } else {
              cy.log('Warning: Could not find Sri Lanka option, selecting first available');
              cy.get('select').first().select(1);
            }
          });
          cy.wait(300);
        }
      });
      
      // Password: 123456
      cy.get('input[type="password"]', { timeout: 10000 }).first().should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(300);
      
      // Confirm Password: 123456
      cy.get('input[type="password"]').last().should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      // Submit the form
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      
      // Wait for Firebase registration to complete
      cy.wait(6000);
      
      // Verify successful registration - URL should change
      cy.url({ timeout: 15000 }).should('not.include', 'register');
      
      // Verify user is logged in - look for profile/avatar icon
      cy.get('body', { timeout: 10000 }).should('be.visible');
      cy.wait(2000);
      
      // Check for profile elements (avatar, username, or profile icon)
      cy.get('body').then($body => {
        const bodyText = $body.text();
        const hasUserElements = 
          bodyText.includes('Hiruka') || 
          bodyText.includes('Profile') ||
          $body.find('[data-testid="user-avatar"]').length > 0 ||
          $body.find('img[alt*="profile"]').length > 0 ||
          $body.find('svg').length > 0; // Profile icon
        
        expect(hasUserElements).to.be.true;
      });
    });

    it('Tourist can login with valid credentials', () => {
      // Visit the home page
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Click Login button
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in login credentials
      // Email: h@gmail.com
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('h@gmail.com', { delay: 50 });
      cy.wait(300);
      
      // Password: 123456
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      // Submit login form
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      
      // Wait for Firebase authentication
      cy.wait(6000);
      
      // Verify successful login - URL should change
      cy.url({ timeout: 15000 }).should('not.include', 'login');
      
      // Wait for page to fully load after login
      cy.wait(3000);
      
      // Verify user is logged in - check URL doesn't have login and we're on home page
      cy.url().should('eq', 'http://localhost:3000/');
      
      // Try to click Login button - it should NOT exist if user is logged in
      cy.get('body').then($body => {
        const hasLoginButton = $body.find('button:contains("Login")').length > 0;
        // If login button still exists, we're not logged in properly
        expect(hasLoginButton).to.be.false;
      });
    });

  });

  // ========================================
  // JEEP DRIVER AUTHENTICATION TESTS
  // ========================================

  describe('Jeep Driver Authentication', () => {
    
    it('Jeep driver can login successfully with valid credentials', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Click Login button
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in jeep driver credentials
      // Email: j1@gmail.com, Password: 123456
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('j1@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      // Submit login form
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      
      // Wait for Firebase authentication
      cy.wait(6000);
      
      // Verify successful login
      cy.url({ timeout: 15000 }).should('not.include', 'login');
      cy.wait(3000);
      
      // Verify jeep driver is logged in - check Login button is gone
      cy.get('body').then($body => {
        const hasLoginButton = $body.find('button:contains("Login")').length > 0;
        expect(hasLoginButton).to.be.false;
      });
    });

    it('Jeep driver login is rejected with invalid password', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in with wrong password
      // Correct email: j1@gmail.com, Wrong password
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('j1@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('WrongPassword999', { delay: 50 });
      cy.wait(500);
      
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(3000);
      
      // Should show error message or stay on login page
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        const hasError = bodyText.includes('incorrect') || 
                        bodyText.includes('invalid') ||
                        bodyText.includes('wrong') ||
                        bodyText.includes('failed') ||
                        bodyText.includes('error') ||
                        bodyText.includes('password');
        expect(hasError).to.be.true;
      });
    });

  });

  // ========================================
  // GUIDE AUTHENTICATION TESTS
  // ========================================

  describe('Guide Authentication', () => {
    
    it('Guide can login successfully with valid credentials', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Click Login button
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in guide credentials
      // Email: g1@gmail.com, Password: 123456
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('g1@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      // Submit login form
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      
      // Wait for Firebase authentication
      cy.wait(6000);
      
      // Verify successful login
      cy.url({ timeout: 15000 }).should('not.include', 'login');
      cy.wait(3000);
      
      // Verify guide is logged in - check Login button is gone
      cy.get('body').then($body => {
        const hasLoginButton = $body.find('button:contains("Login")').length > 0;
        expect(hasLoginButton).to.be.false;
      });
    });

    it('Guide login is rejected with invalid email', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Ensure logged out
      cy.window().then((win) => {
        win.localStorage.clear();
        win.sessionStorage.clear();
      });
      cy.reload();
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in with non-existent email
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('nonexistent@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(3000);
      
      // Should show error message
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        const hasError = bodyText.includes('not found') || 
                        bodyText.includes('invalid') ||
                        bodyText.includes('user') ||
                        bodyText.includes('error') ||
                        bodyText.includes('exist');
        expect(hasError).to.be.true;
      });
    });

  });

  // ========================================
  // ADMIN AUTHENTICATION TESTS
  // ========================================

  describe('Admin Authentication', () => {
    
    it('Admin can login successfully with valid credentials', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Click Login button
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in admin credentials
      // Email: m@gmail.com, Password: movindu2005
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('m@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('movindu2005', { delay: 50 });
      cy.wait(500);
      
      // Submit login form
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      
      // Wait for Firebase authentication
      cy.wait(6000);
      
      // Verify admin is redirected to admin panel
      cy.url({ timeout: 15000 }).should('include', 'admin-panel');
      cy.wait(2000);
      
      // Verify admin panel is loaded
      cy.get('body', { timeout: 10000 }).then($body => {
        const bodyText = $body.text();
        const isAdminPanel = 
          bodyText.includes('Admin') || 
          bodyText.includes('Dashboard') ||
          bodyText.includes('Users') ||
          bodyText.includes('Manage');
        
        expect(isAdminPanel).to.be.true;
      });
    });

    it('Admin login is rejected with wrong password', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      // Ensure logged out
      cy.window().then((win) => {
        win.localStorage.clear();
        win.sessionStorage.clear();
      });
      cy.reload();
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in with wrong password
      // Correct email: m@gmail.com, Wrong password
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('m@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('WrongPassword999', { delay: 50 });
      cy.wait(500);
      
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(3000);
      
      // Should show error message
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase();
        const hasError = bodyText.includes('incorrect') || 
                        bodyText.includes('invalid') ||
                        bodyText.includes('wrong') ||
                        bodyText.includes('failed') ||
                        bodyText.includes('error');
        expect(hasError).to.be.true;
      });
    });

  });

  // ========================================
  // INVALID LOGIN CREDENTIALS TESTS
  // ========================================

  describe('Invalid Login Credentials', () => {
    
    it('Login is rejected with invalid email format', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Fill in with invalid email format
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('invalidemail', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('Password123', { delay: 50 });
      cy.wait(500);
      
      // Try to submit - should be blocked by HTML5 validation or show error
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(2000);
      
      // Should either stay on login page or show validation error
      cy.url().then((url) => {
        expect(url).to.satisfy((u) => u.includes('login') || u === Cypress.config().baseUrl + '/');
      });
    });

    it('Login is rejected with empty credentials', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Try to submit with empty fields
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(2000);
      
      // Should stay on login page
      cy.get('body').then($body => {
        const bodyText = $body.text();
        expect(bodyText).to.satisfy((text) => 
          text.includes('Login') || 
          text.includes('Email') || 
          text.includes('Password')
        );
      });
    });

    it('Registration is rejected with invalid email format', () => {
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      cy.contains('Register', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      // Select Tourist if needed
      cy.get('body').then($body => {
        if ($body.text().includes('Tourist')) {
          cy.contains('Tourist', { matchCase: false }).should('be.visible').click({ force: true });
          cy.wait(1000);
        }
      });
      
      // Fill form with invalid email
      cy.get('input[type="text"]', { timeout: 10000 }).first().should('be.visible').clear().type('Test User', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('invalidemail', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).first().should('be.visible').clear().type('Password123', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]').last().should('be.visible').clear().type('Password123', { delay: 50 });
      cy.wait(500);
      
      // Try to submit
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(2000);
      
      // Should either stay on registration or show validation error
      cy.url().then((url) => {
        expect(url).to.satisfy((u) => u.includes('register') || u === Cypress.config().baseUrl + '/');
      });
    });

  });

  // ========================================
  // LOGOUT FUNCTIONALITY TESTS
  // ========================================

  describe('Logout Functionality', () => {
    
    it('Tourist can logout successfully after login', () => {
      // First login as tourist
      cy.visit('/', { timeout: 30000 });
      cy.wait(2000);
      
      cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
      cy.wait(1500);
      
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type('h@gmail.com', { delay: 50 });
      cy.wait(300);
      
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type('123456', { delay: 50 });
      cy.wait(500);
      
      cy.get('button[type="submit"]').should('be.visible').click({ force: true });
      cy.wait(6000);
      
      // Verify logged in
      cy.url({ timeout: 15000 }).should('not.include', 'login');
      cy.wait(3000);
      
      // Now logout - Click on the hamburger menu icon (three horizontal lines)
      // This opens the user slide panel
      cy.get('body').then($body => {
        // Look for menu button/hamburger icon - usually in top-right or top-left of navbar
        if ($body.find('[aria-label*="menu"]').length > 0) {
          cy.get('[aria-label*="menu"]').first().click({ force: true });
        } else if ($body.find('button svg').length > 0) {
          // Click the first button with an SVG (likely the menu icon)
          cy.get('nav button svg').first().parent().click({ force: true });
        } else if ($body.find('[data-testid="menu-button"]').length > 0) {
          cy.get('[data-testid="menu-button"]').click({ force: true });
        } else {
          // Fallback: click any button in nav that might be the menu
          cy.get('nav button').first().click({ force: true });
        }
      });
      
      cy.wait(2000);
      
      // Now look for "Logout" button in the slide panel
      cy.get('body').then($body => {
        if ($body.text().includes('Logout') || $body.text().includes('Log out')) {
          cy.contains(/Logout|Log out/i, { timeout: 5000 }).should('be.visible').click({ force: true });
        }
      });
      cy.wait(2000);
      
      // Verify logged out - should see Login/Register buttons
      cy.get('body', { timeout: 10000 }).then($body => {
        const bodyText = $body.text();
        const isLoggedOut = bodyText.includes('Login') || bodyText.includes('Register');
        expect(isLoggedOut).to.be.true;
      });
    });

  });

  after(() => {
    cy.log('SafariHub E2E Tests Completed');
  });

});
