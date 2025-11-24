# Debugging Booking Permission Error

If you're still getting "Permission denied" error, follow these steps:

## Step 1: Check Browser Console

Open your browser console (F12) and look for these logs when you try to create a booking:

1. **Check Authentication:**
   - Look for: `🔐 Current auth user: [user-id]` or `NOT AUTHENTICATED`
   - If it says "NOT AUTHENTICATED", you need to log in first

2. **Check Data Matching:**
   - Look for: `🔍 Auth UID matches customerId: true/false`
   - If it's `false`, there's a mismatch between your login and the booking data

3. **Check Required Fields:**
   - `customerId`: Should match your user ID
   - `driverId`: Should be a string (not null/undefined)
   - `selectedDates`: Should be an array with at least one date
   - `totalPrice`: Should be a number (not string)

4. **Check Error Details:**
   - Look for: `❌ Error code: permission-denied`
   - Look for: `❌ Error message: [details]`

## Step 2: Verify Firestore Rules Are Deployed

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Firestore Database** → **Rules** tab
4. Check if the rules match the `firestore.rules` file
5. If different, copy the rules from `firestore.rules` and click **Publish**

## Step 3: Test Authentication

Run this in browser console:
```javascript
import { auth } from './src/App.jsx';
console.log('Current user:', auth.currentUser);
console.log('User ID:', auth.currentUser?.uid);
```

## Step 4: Verify Booking Data

Before clicking "Confirm Booking", check the console logs:
- `📝 Current user ID:` - Should show your user ID
- `📝 Customer ID in booking data:` - Should match your user ID
- `📝 Driver ID:` - Should be a valid driver ID
- `📝 Selected dates:` - Should be an array like `["2024-01-15T00:00:00.000Z"]`
- `📝 Total price:` - Should be a number like `15000`

## Step 5: Common Issues & Fixes

### Issue 1: "NOT AUTHENTICATED"
**Fix:** Log out and log back in

### Issue 2: "customerId does not match authenticated user"
**Fix:** This shouldn't happen, but if it does, refresh the page and try again

### Issue 3: "driverId is null"
**Fix:** Make sure you're on a valid driver profile page

### Issue 4: "selectedDates is empty"
**Fix:** Select at least one date in the calendar

### Issue 5: Rules not deployed
**Fix:** Deploy rules using:
```bash
firebase deploy --only firestore:rules
```

## Step 6: Temporary Test (Less Secure)

If nothing works, temporarily make the rules more permissive for testing:

```javascript
// In firestore.rules, temporarily change bookings to:
match /bookings/{bookingId} {
  allow create: if request.auth != null;
  allow read, update, delete: if request.auth != null;
}
```

**⚠️ WARNING:** This is less secure. Only use for testing, then revert to proper rules!

## Step 7: Check Network Tab

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try creating a booking
4. Look for a request to Firestore
5. Check the request/response for error details

## Still Not Working?

Share these details:
1. Console logs (all the 📝 and ❌ messages)
2. Error code and message
3. Whether you're logged in
4. Whether rules are deployed
5. Screenshot of the error

