# 🚨 FIX CORS NOW - No Installation Required!

Since `gsutil` is not installed, use the **Google Cloud Console** method (easiest, no installation needed).

## ⚡ Quick Fix (5 minutes)

### Step 1: Open Google Cloud Console
Click this link (it will open your bucket directly):
👉 **https://console.cloud.google.com/storage/browser/safarihub-a80bd.firebasestorage.app?project=safarihub-a80bd**

### Step 2: Open Configuration Tab
1. You should see your bucket: `safarihub-a80bd.firebasestorage.app`
2. Click on the **"Configuration"** tab at the top of the page

### Step 3: Edit CORS Configuration
1. Scroll down to find **"Cross-origin resource sharing (CORS)"** section
2. Click the **"Edit CORS configuration"** button (pencil icon)

### Step 4: Paste This JSON
Delete any existing content and paste this:

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5000",
      "https://safarihub-a80bd.web.app",
      "https://safarihub-a80bd.firebaseapp.com"
    ],
    "method": [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE"
    ],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "x-goog-resumable"
    ]
  }
]
```

### Step 5: Save
1. Click **"Save"** button
2. Wait a few seconds for the configuration to apply

### Step 6: Test
Go back to your app and try uploading a document - it should work now! ✅

---

## Alternative: Install Google Cloud SDK (If You Prefer Command Line)

If you want to use `gsutil` in the future:

1. **Download Google Cloud SDK:**
   - Visit: https://cloud.google.com/sdk/docs/install
   - Download the Windows installer
   - Run the installer

2. **After installation, run:**
   ```powershell
   gcloud auth login
   gcloud config set project safarihub-a80bd
   gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app
   ```

But the **Google Cloud Console method above is faster** and doesn't require installation! 🚀
