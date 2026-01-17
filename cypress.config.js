import { defineConfig } from "cypress";
import http from 'http';

// Check if dev server is running
function checkDevServer() {
  return new Promise((resolve) => {
      const options = {
        method: 'HEAD',
        host: 'localhost',
        port: 3000,
        path: '/',
        timeout: 3000
      };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 302) {
        console.log('\n✅ Development server is running on http://localhost:3000\n');
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => {
      console.error('\n╔════════════════════════════════════════════════════════╗');
      console.error('║  ❌ DEVELOPMENT SERVER IS NOT RUNNING!               ║');
      console.error('╚════════════════════════════════════════════════════════╝\n');
      console.error('📝 Please start the development server first:\n');
      console.error('   npm run dev\n');
      console.error('⏳ Wait for this message:');
      console.error('   ➜ Local: http://localhost:5173/\n');
      console.error('✅ Then run Cypress again:\n');
      console.error('   npx cypress open  (interactive mode)');
      console.error('   OR');
      console.error('   npx cypress run   (headless mode)\n');
      console.error('════════════════════════════════════════════════════════\n');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Check if server is running before tests
      on('before:run', async () => {
        const serverRunning = await checkDevServer();
        if (!serverRunning) {
        console.error('⚠️  Tests may fail because the dev server is not accessible.\n');
        throw new Error('Development server is not running on http://localhost:3000');
        }
      });

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Disable web security for Firebase/Firestore
          launchOptions.args.push('--disable-web-security');
          launchOptions.args.push('--disable-site-isolation-trials');
          launchOptions.args.push('--disable-features=IsolateOrigins,site-per-process');
        }
        return launchOptions;
      });
    },
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 60000,
    // Increase retries for flaky tests
    retries: {
      runMode: 2,
      openMode: 0
    },
    // Chrome flags for better Firestore compatibility
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalSessionAndOrigin: true,
    // Ignore specific errors
    experimentalStudio: true,
  },
});
