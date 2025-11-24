# Quick Fix for Permission Denied Error

## The Problem
Firestore is blocking the booking creation because the security rules haven't been deployed to Firebase yet.

## Solution: Deploy Firestore Rules

### Option 1: Using Terminal (Fastest)

1. **Open Terminal/PowerShell** in your project folder

2. **Run this command:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **If you get "firebase: command not found":**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

### Option 2: Using Firebase Console (Web)

1. Go to: https://console.firebase.google.com
2. Select your project: **safarihub-a80bd**
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at the top
5. **Copy ALL the content** from `firestore.rules` file
6. **Paste** it into the rules editor
7. Click **Publish** button

## Verify It Worked

After deploying, wait 10-30 seconds, then:

1. **Refresh your browser**
2. **Try creating a booking again**
3. The error should be gone!

## Still Not Working?

### Check 1: Are you logged in?
- Look at the top right of your page
- You should see your name/email
- If not, click "Login" and log in

### Check 2: Open Browser Console (F12)
Look for these messages when you try to book:
- `🔐 Current auth user:` - Should show your user ID
- `📝 Current user ID:` - Should match the ID above
- `❌ Error code:` - If it still says "permission-denied", rules might not be deployed

### Check 3: Verify Rules Are Deployed
1. Go to Firebase Console
2. Firestore Database → Rules
3. Scroll to the "Bookings" section (around line 96)
4. Make sure it says:
   ```
   match /bookings/{bookingId} {
     allow create: if request.auth != null
       && request.auth.uid == request.data.customerId
       ...
   }
   ```

## Test Script

Run this in your browser console (F12) to test:

```javascript
// Test authentication
import { auth } from './src/App.jsx';
console.log('User logged in:', auth.currentUser ? 'YES' : 'NO');
console.log('User ID:', auth.currentUser?.uid);

// Test Firestore connection
import { db } from './src/App.jsx';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// This will show if rules are working
const testBooking = {
  customerId: auth.currentUser?.uid,
  driverId: 'test-driver-id',
  selectedDates: ['2024-01-15'],
  totalPrice: 1000
};

console.log('Test booking data:', testBooking);
```

## Need More Help?

Share:
1. Screenshot of the error
2. Browser console output (F12 → Console tab)
3. Whether you deployed the rules (yes/no)

