# Quick Deploy Script - Opens Firebase Console and Copies Rules to Clipboard

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  FIREBASE RULES DEPLOYMENT HELPER" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Copy rules to clipboard
Write-Host "Step 1: Copying firestore.rules to clipboard..." -ForegroundColor Yellow
$rulesPath = "firestore.rules"

if (Test-Path $rulesPath) {
    Get-Content $rulesPath -Raw | Set-Clipboard
    Write-Host "✅ Rules copied to clipboard!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: firestore.rules file not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Open Firebase Console
Write-Host "Step 2: Opening Firebase Console..." -ForegroundColor Yellow
$firebaseUrl = "https://console.firebase.google.com/project/safarihub-a80bd/firestore/rules"
Start-Process $firebaseUrl
Write-Host "✅ Firebase Console opened in browser!" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS (DO THIS IN FIREBASE CONSOLE):" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Wait for Firebase Console to load" -ForegroundColor White
Write-Host "2. Click in the rules editor" -ForegroundColor White
Write-Host "3. Press Ctrl+A (select all)" -ForegroundColor White
Write-Host "4. Press Ctrl+V (paste - rules are in clipboard)" -ForegroundColor White
Write-Host "5. Click the blue 'Publish' button" -ForegroundColor White
Write-Host "6. Wait for 'Rules published successfully'" -ForegroundColor White
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  AFTER PUBLISHING:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go back to your application" -ForegroundColor White
Write-Host "2. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "3. Refresh the page (F5)" -ForegroundColor White
Write-Host "4. Try registering again" -ForegroundColor White
Write-Host ""
Write-Host "✅ Registration will work!" -ForegroundColor Green
Write-Host ""

# Keep window open
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
