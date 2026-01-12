# Firebase Storage CORS Configuration

## Problem
If you're seeing CORS errors when uploading documents, it means Firebase Storage is not configured to allow requests from your application's origin.

## Solution

### Option 1: Using gsutil (Recommended)

1. **Install Google Cloud SDK** (if not already installed):
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `npm install -g @google-cloud/storage`

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project safarihub-a80bd
   ```

4. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app
   ```

5. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://safarihub-a80bd.firebasestorage.app
   ```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `safarihub-a80bd`
3. Navigate to **Storage** in the left sidebar
4. Click on **Settings** (gear icon)
5. Scroll to **CORS configuration**
6. Click **Edit CORS configuration**
7. Paste the contents of `cors.json`:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
     }
   ]
   ```
8. Click **Save**

### Option 3: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `safarihub-a80bd`
3. Navigate to **Cloud Storage** > **Buckets**
4. Find your bucket: `safarihub-a80bd.firebasestorage.app`
5. Click on the bucket name
6. Go to **Configuration** tab
7. Scroll to **CORS configuration**
8. Click **Edit**
9. Paste the CORS configuration from `cors.json`
10. Click **Save**

## For Production

For production, replace `"origin": ["*"]` with your actual domain:
```json
[
  {
    "origin": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"]
  }
]
```

## Troubleshooting

- **Still seeing CORS errors?** Clear your browser cache and try again
- **Uploads still failing?** Check Firebase Storage security rules in Firebase Console
- **Need help?** Check Firebase Storage documentation: https://firebase.google.com/docs/storage/web/upload-files
