# Supabase Storage Setup Guide

## ✅ Architecture

**React Frontend** → **Node.js Backend** → **Supabase Storage**

- Frontend uses Firebase Auth (for user authentication)
- Backend uses Supabase Service Role Key (bypasses RLS policies)
- No direct Supabase connection from frontend

## 🔹 STEP 1: Get Supabase Service Role Key

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Copy the **Service Role Key** (NOT the anon key)
   - ⚠️ **NEVER** put this in React/frontend code
   - ⚠️ **ONLY** use in backend/server code

## 🔹 STEP 2: Configure Backend (.env file in project root)

Add these to your `.env` file:

```env
# Supabase Configuration (Backend Only)
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Backend API URL (for frontend)
VITE_API_URL=http://localhost:5000
```

## 🔹 STEP 3: Create Storage Buckets in Supabase

1. Go to **Supabase Dashboard** → **Storage**
2. Create two buckets:

   **Bucket 1: `profile-images`**
   - Public: ✅ Yes
   - File size limit: 5MB
   - Allowed MIME types: image/*

   **Bucket 2: `documents`**
   - Public: ✅ Yes (or Private if you prefer)
   - File size limit: 10MB
   - Allowed MIME types: application/*, image/*

## 🔹 STEP 4: Storage Policies (Optional)

Since we're using Service Role Key in the backend, RLS policies don't matter for uploads.
However, you can set policies for direct access:

**For `profile-images` bucket:**
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-images');
```

**For `documents` bucket:**
```sql
-- Allow public read access (or restrict as needed)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
```

## 🔹 STEP 5: Test the Setup

1. Start your backend server: `npm run server` or `npm run dev`
2. Check console for: `✅ Supabase initialized with Service Role (backend only)`
3. Test health endpoint: `http://localhost:5000/api/health`
   - Should show `"supabase": true`

## 🔹 STEP 6: API Endpoints

The backend provides these endpoints:

- **POST** `/api/upload-profile-image`
  - Body: FormData with `file` and `userId`
  - Returns: `{ success: true, url: "...", path: "..." }`

- **POST** `/api/upload-document`
  - Body: FormData with `file`, `userId`, and optional `fileName`
  - Returns: `{ success: true, url: "...", path: "..." }`

- **DELETE** `/api/delete-document`
  - Body: `{ path: "..." }` or `{ url: "..." }`
  - Returns: `{ success: true }`

## ✅ How It Works

1. **User uploads file** in React app
2. **React sends file** to backend API (`/api/upload-*`)
3. **Backend receives file** and uploads to Supabase using Service Role Key
4. **Service Role Key bypasses RLS** (no authentication needed)
5. **Backend returns public URL** to React
6. **React saves URL** to Firestore

## 🔒 Security

- ✅ Service Role Key is **NEVER** exposed to frontend
- ✅ All uploads go through backend (can add validation, rate limiting, etc.)
- ✅ Firebase Auth still handles user authentication
- ✅ Supabase Storage handles file storage

## 🐛 Troubleshooting

**Error: "Supabase not configured"**
- Check `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart backend server after adding env variables

**Error: "StorageApiError: new row violates row-level security policy"**
- This shouldn't happen with Service Role Key
- If it does, check that you're using Service Role Key (not anon key)

**Error: "Bucket not found"**
- Create the buckets in Supabase Dashboard → Storage
- Bucket names must match: `profile-images` and `documents`
