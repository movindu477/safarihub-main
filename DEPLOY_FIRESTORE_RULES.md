# Deploy Firestore Rules

The booking system requires updated Firestore rules to work properly. Follow these steps to deploy:

## Method 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy the contents of `firestore.rules` file
6. Paste into the rules editor
7. Click **Publish** button

## Method 2: Using Firebase CLI

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Verify Deployment

After deploying, test the booking functionality:
1. Log in as a tourist
2. Go to a Jeep Driver profile
3. Select dates and click "Confirm Booking"
4. It should work without permission errors

## Important Notes

- Rules must be deployed for changes to take effect
- The rules allow authenticated users to create bookings where `customerId` matches their `auth.uid`
- Drivers can read and update bookings where they are the `driverId`
- Customers can read and update their own bookings
