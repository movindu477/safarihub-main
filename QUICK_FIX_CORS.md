# 🚨 QUICK FIX: CORS Errors Blocking Document Uploads

## The Problem
You're seeing CORS errors in the console when trying to upload documents. This is because Firebase Storage needs CORS configuration to allow uploads from your localhost.

## ⚡ FASTEST SOLUTION (No Installation Required)

### Use Google Cloud Console (Web Interface)

1. **Go to Google Cloud Console:**
   - Open: https://console.cloud.google.com/storage/browser?project=safarihub-a80bd

2. **Select Your Bucket:**
   - Click on: `safarihub-a80bd.firebasestorage.app`

3. **Open Configuration:**
   - Click the **"Configuration"** tab at the top

4. **Edit CORS:**
   - Scroll down to **"Cross-origin resource sharing (CORS)"**
   - Click **"Edit CORS configuration"**

5. **Paste This JSON:**
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
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": [
         "Content-Type",
         "Authorization",
         "x-goog-resumable"
       ]
     }
   ]
   ```

6. **Click "Save"**

7. **Test:** Try uploading a document again - it should work now! ✅

---

## Alternative: Using Command Line (If You Have gsutil)

If you have Google Cloud SDK installed:

```bash
gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app
```

---

## Why This Happens

Firebase Storage blocks cross-origin requests by default for security. Since your app runs on `localhost:3000` and Firebase Storage is on `firebasestorage.googleapis.com`, the browser blocks the upload unless CORS is configured.

---

## Need More Help?

See `STORAGE_CORS_SETUP.md` for detailed instructions with all options.
