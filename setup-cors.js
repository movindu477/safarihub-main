/**
 * Firebase Storage CORS Setup Script
 * 
 * This script helps you set up CORS for Firebase Storage using gsutil.
 * 
 * Prerequisites:
 * 1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
 * 2. Run: npm install -g @google-cloud/storage (optional, for Node.js method)
 * 
 * Usage:
 * 1. Make sure you have gsutil installed and authenticated
 * 2. Run: node setup-cors.js
 * 
 * Or manually run:
 * gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = 'safarihub-a80bd.firebasestorage.app';
const CORS_FILE = path.join(__dirname, 'cors.json');

console.log('🔧 Firebase Storage CORS Setup\n');

// Check if cors.json exists
if (!fs.existsSync(CORS_FILE)) {
  console.error('❌ Error: cors.json file not found!');
  process.exit(1);
}

console.log('✅ Found cors.json file');
console.log('\n📋 CORS Configuration:');
console.log(fs.readFileSync(CORS_FILE, 'utf8'));
console.log('\n');

// Check if gsutil is available
try {
  execSync('gsutil --version', { stdio: 'ignore' });
  console.log('✅ gsutil is installed');
} catch (error) {
  console.error('❌ Error: gsutil is not installed or not in PATH');
  console.error('\n📥 Please install Google Cloud SDK:');
  console.error('   https://cloud.google.com/sdk/docs/install\n');
  console.error('💡 Alternative: Use Google Cloud Console to set CORS manually');
  console.error('   https://console.cloud.google.com/storage/browser\n');
  process.exit(1);
}

// Apply CORS configuration
console.log(`📤 Applying CORS configuration to ${BUCKET_NAME}...\n`);

try {
  const command = `gsutil cors set ${CORS_FILE} gs://${BUCKET_NAME}`;
  console.log(`Running: ${command}\n`);

  execSync(command, { stdio: 'inherit' });

  console.log('\n✅ CORS configuration applied successfully!\n');

  // Verify the configuration
  console.log('🔍 Verifying CORS configuration...\n');
  try {
    execSync(`gsutil cors get gs://${BUCKET_NAME}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Could not verify CORS configuration, but it may have been set successfully');
  }

  console.log('\n✅ Setup complete! Try uploading a document now.');

} catch (error) {
  console.error('\n❌ Error applying CORS configuration:');
  console.error(error.message);
  console.error('\n💡 Make sure you are authenticated:');
  console.error('   gcloud auth login');
  console.error('   gcloud config set project safarihub-a80bd\n');
  process.exit(1);
}
