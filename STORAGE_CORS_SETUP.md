# Firebase Storage CORS Configuration

⚠️ **IMPORTANT**: CORS errors are blocking document uploads. You MUST configure CORS for Firebase Storage to fix this issue.

To fix the CORS errors when uploading documents, you need to configure CORS for your Firebase Storage bucket.

## Option 1: Using gsutil (Recommended - FASTEST)

**Quick Setup (3 commands):**

1. Install Google Cloud SDK if you haven't already:
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `npm install -g @google-cloud/storage` (alternative)

2. Authenticate and set project (one-time setup):
   ```bash
   gcloud auth login
   gcloud config set project safarihub-a80bd
   ```

3. Apply CORS configuration:
   ```bash
   gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app
   ```

**OR use the automated script:**
```bash
node setup-cors.js
```

## Option 2: Using Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: safarihub-a80bd
3. Go to Storage
4. Click on the "Rules" tab
5. The CORS configuration needs to be set via gsutil (Option 1) as Firebase Console doesn't have a CORS UI

## Option 3: Using Google Cloud Console

1. Go to: https://console.cloud.google.com/storage/browser
2. Select your bucket: safarihub-a80bd.firebasestorage.app
3. Click on "Configuration" tab
4. Scroll to "Cross-origin resource sharing (CORS)"
5. Click "Edit CORS configuration"
6. Paste the following JSON:
   ```json
   [
     {
       "origin": ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000", "https://safarihub-a80bd.web.app", "https://safarihub-a80bd.firebaseapp.com"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"]
     }
   ]
   ```
7. Click "Save"

## Verify CORS Configuration

After setting up CORS, verify it's working:
```bash
gsutil cors get gs://safarihub-a80bd.firebasestorage.app
```

You should see the CORS configuration you just set.

## Note

The CORS configuration allows requests from:
- Local development: localhost:3000, localhost:5173, localhost:5000
- Production: safarihub-a80bd.web.app, safarihub-a80bd.firebaseapp.com

If you're using a different port or domain, add it to the `origin` array in `cors.json`.
