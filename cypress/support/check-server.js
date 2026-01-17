// Check if development server is running before tests
const http = require('http');

function checkServer(url, callback) {
  const options = {
    method: 'HEAD',
    host: 'localhost',
    port: 3000,
    path: '/',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 304) {
      console.log('✅ Development server is running on http://localhost:3000');
      callback(true);
    } else {
      console.log('❌ Server responded but with status:', res.statusCode);
      callback(false);
    }
  });

  req.on('error', (err) => {
    console.error('\n❌ ========================================');
    console.error('❌ DEVELOPMENT SERVER IS NOT RUNNING!');
    console.error('❌ ========================================\n');
    console.error('Please start the development server before running Cypress tests:\n');
    console.error('  npm run dev\n');
    console.error('Then wait for the message:');
    console.error('  ➜ Local: http://localhost:3000/\n');
    console.error('After the server is running, run Cypress again:\n');
    console.error('  npx cypress open');
    console.error('  OR');
    console.error('  npx cypress run\n');
    console.error('========================================\n');
    callback(false);
  });

  req.on('timeout', () => {
    console.error('❌ Server check timed out');
    callback(false);
  });

  req.end();
}

module.exports = checkServer;
