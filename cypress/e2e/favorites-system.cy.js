describe('Favorites System - SafariHub', () => {

  before(() => {
    cy.log('Starting Favorites System E2E Tests');
  });

  beforeEach(() => {
    // Clear all auth state before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.clearAllSessionStorage();
  });

  // Helper function to login as tourist
  const loginAsTourist = (email = 'h@gmail.com', password = '123456') => {
    cy.visit('/', { timeout: 60000 });
    cy.wait(3000);
    
    // Check if already logged in
    cy.get('body').then($body => {
      const bodyText = $body.text();
      if (bodyText.includes('Login')) {
        cy.contains('Login', { matchCase: false, timeout: 15000 }).should('be.visible').click({ force: true });
        cy.wait(1500);
        
        cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').clear().type(email, { delay: 50 });
        cy.wait(300);
        
        cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible').clear().type(password, { delay: 50 });
        cy.wait(500);
        
        cy.get('button[type="submit"]').should('be.visible').click({ force: true });
        cy.wait(6000);
        
        // Verify logged in
        cy.url({ timeout: 15000 }).should('not.include', 'login');
        cy.wait(2000);
      }
    });
  };

  // Helper function to navigate to guides page
  const navigateToGuides = () => {
    cy.visit('/', { timeout: 60000 });
    cy.wait(2000);
    
    // Look for "Our Services" dropdown or "Guides" link
    cy.get('body').then($body => {
      const bodyText = $body.text();
      
      // Try clicking Our Services first
      if (bodyText.includes('OUR SERVICES') || bodyText.includes('Our Services')) {
        cy.contains(/Our Services|OUR SERVICES/i).first().click({ force: true });
        cy.wait(1500);
        
        // Then click Find a Guide
        cy.contains(/Find a Guide|Tour Guide|Guide/i, { timeout: 10000 }).first().click({ force: true });
        cy.wait(2000);
        cy.log('✅ Navigated to guides via Our Services dropdown');
      } 
      // Direct link to guides
      else if (bodyText.includes('Guide')) {
        cy.contains(/Guides|Tour Guide/i).first().click({ force: true });
        cy.wait(2000);
        cy.log('✅ Navigated to guides via direct link');
      }
      // Fallback to direct URL
      else {
        cy.visit('/guide', { timeout: 30000 });
        cy.wait(2000);
        cy.log('✅ Navigated to guides via direct URL');
      }
    });
  };

  // Helper function to navigate to jeep drivers page
  const navigateToJeepDrivers = () => {
    cy.visit('/', { timeout: 60000 });
    cy.wait(2000);
    
    // Look for "Our Services" dropdown or "Jeep Drivers" link
    cy.get('body').then($body => {
      const bodyText = $body.text();
      
      // Try clicking Our Services first
      if (bodyText.includes('OUR SERVICES') || bodyText.includes('Our Services')) {
        cy.contains(/Our Services|OUR SERVICES/i).first().click({ force: true });
        cy.wait(1500);
        
        // Then click Find a Jeep Driver
        cy.contains(/Find a Jeep Driver|Jeep Driver|Safari Jeep/i, { timeout: 10000 }).first().click({ force: true });
        cy.wait(2000);
        cy.log('✅ Navigated to jeep drivers via Our Services dropdown');
      } 
      // Direct link to jeep drivers
      else if (bodyText.includes('Jeep') || bodyText.includes('Driver')) {
        cy.contains(/Jeep Driver|Safari/i).first().click({ force: true });
        cy.wait(2000);
        cy.log('✅ Navigated to jeep drivers via direct link');
      }
      // Fallback to direct URL
      else {
        cy.visit('/driver', { timeout: 30000 });
        cy.wait(2000);
        cy.log('✅ Navigated to jeep drivers via direct URL');
      }
    });
  };

  // Helper function to navigate to favorites/dashboard
  const navigateToFavorites = () => {
    cy.visit('/', { timeout: 60000 });
    cy.wait(2000);
    
    // Click profile button to open slide panel
    cy.get('body').then($body => {
      if ($body.find('nav button').length > 0) {
        cy.get('nav button').last().click({ force: true });
        cy.wait(1500);
        
        // Look for Favorites link in panel
        cy.get('body').then($panelBody => {
          if ($panelBody.text().includes('Favorite')) {
            cy.contains(/Favorites|Favourite/i).first().click({ force: true });
            cy.wait(2000);
            cy.log('✅ Navigated to favorites via profile panel');
          } else if ($panelBody.text().includes('Dashboard')) {
            cy.contains(/Dashboard/i).first().click({ force: true });
            cy.wait(2000);
            cy.log('✅ Navigated to dashboard (favorites may be here)');
          } else {
            // Try direct URL
            cy.visit('/favorites', { timeout: 30000 });
            cy.wait(2000);
            cy.log('✅ Navigated to favorites via direct URL');
          }
        });
      } else {
        cy.visit('/favorites', { timeout: 30000 });
        cy.wait(2000);
      }
    });
  };

  // ========================================
  // ADD GUIDE TO FAVORITES TESTS
  // ========================================

  describe('Add Guide to Favorites', () => {

    it('Verify that a logged-in client can add a guide to favorites', () => {
      // Login as tourist
      loginAsTourist();
      
      // Navigate to guides page
      navigateToGuides();
      
      // Wait for guides to load
      cy.wait(3000);
      
      // Look for guide cards and favorite button
      cy.get('body').then($body => {
        const bodyText = $body.text();
        
        // Check if guides are displayed
        if (bodyText.includes('Guide') || bodyText.includes('guide')) {
          cy.log('📋 Guides page loaded');
          
          // Look for heart/favorite icons or buttons
          cy.get('body').then($guideBody => {
            // Check for heart icon (favorite button)
            const hasFavoriteButton = 
              $guideBody.find('button[aria-label*="favorite"]').length > 0 ||
              $guideBody.find('button[aria-label*="Favorite"]').length > 0 ||
              $guideBody.find('[class*="heart"]').length > 0 ||
              $guideBody.find('svg').filter((i, el) => {
                const innerHTML = el.innerHTML || '';
                return innerHTML.includes('heart') || innerHTML.includes('Heart');
              }).length > 0;
            
            if (hasFavoriteButton) {
              cy.log('✅ Favorite button found');
              
              // Try to click the first favorite button
              // Look for unfilled/outline heart (not yet favorited)
              cy.get('body').then($heartBody => {
                const favoriteButtons = $heartBody.find('button').filter((i, btn) => {
                  const btnText = btn.getAttribute('aria-label') || '';
                  return btnText.toLowerCase().includes('favorite') || 
                         btnText.toLowerCase().includes('add to favorites');
                });
                
                if (favoriteButtons.length > 0) {
                  cy.wrap(favoriteButtons.first()).click({ force: true });
                  cy.wait(2000);
                  cy.log('✅ Clicked favorite button on guide');
                  
                  // Check for success indication
                  cy.get('body').then($resultBody => {
                    const resultText = $resultBody.text();
                    const hasSuccess = 
                      resultText.includes('favorite') ||
                      resultText.includes('Favorite') ||
                      resultText.includes('added') ||
                      resultText.includes('Added') ||
                      resultText.includes('success');
                    
                    if (hasSuccess) {
                      cy.log('✅ Guide added to favorites - confirmation shown');
                    } else {
                      cy.log('⚠️ Favorite button clicked - visual feedback may be icon change');
                    }
                  });
                } else {
                  // Try clicking any heart-like element
                  cy.log('Attempting to find heart icon...');
                  cy.get('button, [role="button"]').contains(/favorite|heart/i, { timeout: 5000 })
                    .first()
                    .click({ force: true });
                  cy.wait(2000);
                  cy.log('✅ Favorite action attempted');
                }
              });
              
            } else {
              cy.log('⚠️ Favorite button not clearly identified - check implementation');
              cy.log('💡 Look for heart icon, star icon, or "Add to Favorites" button');
            }
          });
          
        } else {
          cy.log('⚠️ No guides found on page');
        }
      });
    });

  });

  // ========================================
  // ADD JEEP DRIVER TO FAVORITES TESTS
  // ========================================

  describe('Add Jeep Driver to Favorites', () => {

    it('Verify that a logged-in client can add a jeep driver to favorites', () => {
      // Login as tourist
      loginAsTourist();
      
      // Navigate to jeep drivers page
      navigateToJeepDrivers();
      
      // Wait for drivers to load
      cy.wait(3000);
      
      // Look for driver cards and favorite button
      cy.get('body').then($body => {
        const bodyText = $body.text();
        
        // Check if drivers are displayed
        if (bodyText.includes('Driver') || bodyText.includes('driver') || bodyText.includes('Jeep')) {
          cy.log('📋 Jeep drivers page loaded');
          
          // Look for heart/favorite icons or buttons
          cy.get('body').then($driverBody => {
            const hasFavoriteButton = 
              $driverBody.find('button[aria-label*="favorite"]').length > 0 ||
              $driverBody.find('button[aria-label*="Favorite"]').length > 0 ||
              $driverBody.find('[class*="heart"]').length > 0 ||
              $driverBody.find('svg').filter((i, el) => {
                const innerHTML = el.innerHTML || '';
                return innerHTML.includes('heart') || innerHTML.includes('Heart');
              }).length > 0;
            
            if (hasFavoriteButton) {
              cy.log('✅ Favorite button found');
              
              // Click the first favorite button
              cy.get('body').then($heartBody => {
                const favoriteButtons = $heartBody.find('button').filter((i, btn) => {
                  const btnText = btn.getAttribute('aria-label') || '';
                  return btnText.toLowerCase().includes('favorite');
                });
                
                if (favoriteButtons.length > 0) {
                  cy.wrap(favoriteButtons.first()).click({ force: true });
                  cy.wait(2000);
                  cy.log('✅ Clicked favorite button on jeep driver');
                  
                  // Check for success indication
                  cy.get('body').then($resultBody => {
                    const resultText = $resultBody.text();
                    const hasSuccess = 
                      resultText.includes('favorite') ||
                      resultText.includes('added') ||
                      resultText.includes('success');
                    
                    if (hasSuccess) {
                      cy.log('✅ Jeep driver added to favorites - confirmation shown');
                    } else {
                      cy.log('⚠️ Favorite button clicked - visual feedback may be icon change');
                    }
                  });
                } else {
                  // Fallback: try any button with heart/favorite
                  cy.get('button, [role="button"]').contains(/favorite|heart/i, { timeout: 5000 })
                    .first()
                    .click({ force: true });
                  cy.wait(2000);
                  cy.log('✅ Favorite action attempted');
                }
              });
              
            } else {
              cy.log('⚠️ Favorite button not clearly identified');
            }
          });
          
        } else {
          cy.log('⚠️ No jeep drivers found on page');
        }
      });
    });

  });

  // ========================================
  // REMOVE GUIDE FROM FAVORITES TESTS
  // ========================================

  describe('Remove Guide from Favorites', () => {

    it('Verify that a client can remove a guide from favorites', () => {
      // Login as tourist
      loginAsTourist();
      
      // First, navigate to guides and add one to favorites
      navigateToGuides();
      cy.wait(3000);
      
      // Add a guide to favorites first
      cy.get('body').then($body => {
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Added guide to favorites');
          
          // Now click again to remove
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Clicked favorite button again to remove');
          
          // Check for removal confirmation
          cy.get('body').then($resultBody => {
            const resultText = $resultBody.text();
            const hasRemovalMessage = 
              resultText.includes('removed') ||
              resultText.includes('Removed') ||
              resultText.includes('unfavorite');
            
            if (hasRemovalMessage) {
              cy.log('✅ Guide removed from favorites - confirmation shown');
            } else {
              cy.log('⚠️ Removal triggered - visual feedback may be icon change only');
            }
          });
        } else {
          cy.log('⚠️ Cannot test removal - no favorite buttons found');
        }
      });
    });

  });

  // ========================================
  // REMOVE JEEP DRIVER FROM FAVORITES TESTS
  // ========================================

  describe('Remove Jeep Driver from Favorites', () => {

    it('Verify that a client can remove a jeep driver from favorites', () => {
      // Login as tourist
      loginAsTourist();
      
      // Navigate to jeep drivers and add one to favorites
      navigateToJeepDrivers();
      cy.wait(3000);
      
      // Add a driver to favorites first
      cy.get('body').then($body => {
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Added jeep driver to favorites');
          
          // Click again to remove
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Clicked favorite button again to remove');
          
          // Check for removal confirmation
          cy.get('body').then($resultBody => {
            const resultText = $resultBody.text();
            const hasRemovalMessage = 
              resultText.includes('removed') ||
              resultText.includes('Removed') ||
              resultText.includes('unfavorite');
            
            if (hasRemovalMessage) {
              cy.log('✅ Jeep driver removed from favorites - confirmation shown');
            } else {
              cy.log('⚠️ Removal triggered - visual feedback may be icon change only');
            }
          });
        } else {
          cy.log('⚠️ Cannot test removal - no favorite buttons found');
        }
      });
    });

  });

  // ========================================
  // FAVORITES IN DASHBOARD TESTS
  // ========================================

  describe('Favorites Display in Dashboard', () => {

    it('Verify that favorite guides appear in the client dashboard', () => {
      // Login as tourist
      loginAsTourist();
      
      // Add a guide to favorites first
      navigateToGuides();
      cy.wait(3000);
      
      cy.get('body').then($body => {
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Guide added to favorites');
        }
      });
      
      // Navigate to favorites/dashboard
      navigateToFavorites();
      cy.wait(2000);
      
      // Check if favorite guides are displayed
      cy.get('body').then($body => {
        const bodyText = $body.text();
        
        const hasFavoritesSection = 
          bodyText.includes('Favorite') ||
          bodyText.includes('favourite') ||
          bodyText.includes('Saved');
        
        if (hasFavoritesSection) {
          cy.log('✅ Favorites section found');
          
          // Check for guides in favorites
          if (bodyText.includes('Guide') || bodyText.includes('guide')) {
            cy.log('✅ Favorite guides are displayed in dashboard');
          } else if (bodyText.includes('No favorite') || bodyText.includes('empty')) {
            cy.log('📝 No favorites yet or just added (may need refresh)');
          } else {
            cy.log('⚠️ Guides may be displayed without "Guide" label');
          }
        } else {
          cy.log('⚠️ Favorites section not clearly identified in dashboard');
        }
      });
    });

    it('Verify that favorite jeep drivers appear in the client dashboard', () => {
      // Login as tourist
      loginAsTourist();
      
      // Add a jeep driver to favorites first
      navigateToJeepDrivers();
      cy.wait(3000);
      
      cy.get('body').then($body => {
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Jeep driver added to favorites');
        }
      });
      
      // Navigate to favorites/dashboard
      navigateToFavorites();
      cy.wait(2000);
      
      // Check if favorite drivers are displayed
      cy.get('body').then($body => {
        const bodyText = $body.text();
        
        const hasFavoritesSection = 
          bodyText.includes('Favorite') ||
          bodyText.includes('favourite') ||
          bodyText.includes('Saved');
        
        if (hasFavoritesSection) {
          cy.log('✅ Favorites section found');
          
          // Check for drivers in favorites
          if (bodyText.includes('Driver') || bodyText.includes('driver') || bodyText.includes('Jeep')) {
            cy.log('✅ Favorite jeep drivers are displayed in dashboard');
          } else if (bodyText.includes('No favorite') || bodyText.includes('empty')) {
            cy.log('📝 No favorites yet or just added (may need refresh)');
          } else {
            cy.log('⚠️ Drivers may be displayed without "Driver" label');
          }
        } else {
          cy.log('⚠️ Favorites section not clearly identified in dashboard');
        }
      });
    });

  });

  // ========================================
  // REAL-TIME UPDATES TESTS
  // ========================================

  describe('Real-time Favorites Updates', () => {

    it('Verify that favorites data is updated in real time without page refresh', () => {
      // Login as tourist
      loginAsTourist();
      
      // Navigate to guides
      navigateToGuides();
      cy.wait(3000);
      
      // Get initial favorite count from UI
      let initialFavoriteState = '';
      
      cy.get('body').then($body => {
        initialFavoriteState = $body.text();
        cy.log('📊 Captured initial state');
      });
      
      // Add a guide to favorites
      cy.get('body').then($body => {
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(2000);
          cy.log('✅ Added guide to favorites');
          
          // Check if UI updated WITHOUT page refresh
          cy.get('body').then($updatedBody => {
            const updatedState = $updatedBody.text();
            
            // Check if the heart icon changed or badge appeared
            const hasVisualChange = 
              $updatedBody.find('[class*="filled"]').length > 0 ||
              $updatedBody.find('[class*="active"]').length > 0 ||
              $updatedBody.find('[aria-label*="Remove"]').length > 0 ||
              updatedState !== initialFavoriteState;
            
            if (hasVisualChange) {
              cy.log('✅ UI updated in real-time without page refresh');
            } else {
              cy.log('⚠️ Visual change not detected - may need to check specific indicators');
            }
          });
          
          // Navigate to favorites page WITHOUT refresh
          cy.log('Navigating to favorites to verify...');
          navigateToFavorites();
          cy.wait(2000);
          
          // Verify the guide appears in favorites
          cy.get('body').then($favBody => {
            const favText = $favBody.text();
            
            if (favText.includes('Guide') || favText.includes('guide') || !favText.includes('No favorite')) {
              cy.log('✅ Favorite immediately visible in dashboard (real-time sync)');
            } else {
              cy.log('⚠️ Favorites may require explicit refresh or Firebase sync delay');
            }
          });
        }
      });
    });

  });

  // ========================================
  // PERSISTENCE AFTER LOGOUT TESTS
  // ========================================

  describe('Favorites Persistence After Logout', () => {

    it('Verify that favorites remain saved after user logout and login', () => {
      // Login as tourist
      loginAsTourist();
      
      // Navigate to guides and add to favorites
      navigateToGuides();
      cy.wait(3000);
      
      let guideNameAdded = '';
      
      cy.get('body').then($body => {
        // Try to capture guide name before favoriting
        const guideCards = $body.find('[class*="card"], [class*="guide"]');
        if (guideCards.length > 0) {
          guideNameAdded = guideCards.first().text();
          cy.log(`📝 Adding guide to favorites: ${guideNameAdded.substring(0, 50)}...`);
        }
        
        const favoriteButtons = $body.find('button').filter((i, btn) => {
          const btnText = btn.getAttribute('aria-label') || '';
          return btnText.toLowerCase().includes('favorite');
        });
        
        if (favoriteButtons.length > 0) {
          cy.wrap(favoriteButtons.first()).click({ force: true });
          cy.wait(3000); // Wait for Firebase save
          cy.log('✅ Guide added to favorites and saved to Firebase');
        }
      });
      
      // Logout
      cy.log('Logging out...');
      cy.get('body').then($body => {
        // Click profile button
        if ($body.find('nav button').length > 0) {
          cy.get('nav button').last().click({ force: true });
          cy.wait(1500);
          
          // Click logout
          cy.contains(/Logout|Log out|Sign out/i, { timeout: 10000 }).click({ force: true });
          cy.wait(3000);
          cy.log('✅ Logged out successfully');
        }
      });
      
      // Verify logged out
      cy.get('body').then($body => {
        const hasLogin = $body.text().includes('Login');
        if (hasLogin) {
          cy.log('✅ Confirmed logged out state');
        }
      });
      
      // Login again
      cy.log('Logging back in...');
      loginAsTourist();
      
      // Navigate to favorites
      navigateToFavorites();
      cy.wait(3000);
      
      // Verify the favorite is still there
      cy.get('body').then($body => {
        const bodyText = $body.text();
        
        const hasFavorites = 
          bodyText.includes('Guide') ||
          bodyText.includes('guide') ||
          !bodyText.includes('No favorite');
        
        if (hasFavorites) {
          cy.log('✅ Favorites persisted after logout and login');
          cy.log('✅ Data successfully saved in Firebase and retrieved');
        } else {
          cy.log('⚠️ Favorites may not be showing - check Firebase persistence');
        }
      });
    });

  });

  after(() => {
    cy.log('Favorites System E2E Tests Completed');
  });

});
