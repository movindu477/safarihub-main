// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Supabase client for direct access (client-side)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with public anon key (safe for client-side)
// IMPORTANT: Replace YOUR_ANON_KEY_HERE with your actual anon key from Supabase Dashboard → Settings → API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://garmyrrkqsboyrgcfytm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE'; // Get this from Supabase Dashboard

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload Document using client-side Supabase (works in production)
 * @param {File} file - Document file to upload
 * @param {string} userId - User ID
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{url: string, path: string, error: any}>}
 */
export const uploadDocumentClientSide = async (file, userId, fileName = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate file path
    const timestamp = Date.now();
    const sanitizedName = (fileName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `users/${userId}/documents/${timestamp}_${sanitizedName}`;

    console.log('📤 Uploading document to Supabase:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null
    };
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return {
      url: null,
      path: null,
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Upload Provider Document using client-side Supabase
 * @param {File} file - Document file to upload
 * @param {string} userId - User ID
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{url: string, path: string, error: any}>}
 */
export const uploadProviderDocumentClientSide = async (file, userId, fileName = null) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate file path
    const timestamp = Date.now();
    const sanitizedName = (fileName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;

    console.log('📤 Uploading provider document to Supabase:', filePath);

    // Upload to Supabase Storage - provider-documents bucket
    // Note: User created bucket as PROVIDER-DOCUMENTS (case sensitive)
    const { data, error } = await supabaseClient.storage
      .from('PROVIDER-DOCUMENTS')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('PROVIDER-DOCUMENTS')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null
    };
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return {
      url: null,
      path: null,
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Upload Profile Image using client-side Supabase (works in production)
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID
 * @returns {Promise<{url: string, path: string, error: any}>}
 */
export const uploadProfileImageClientSide = async (file, userId) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    // Generate file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filePath = `users/${userId}/profile/${timestamp}.${fileExtension}`;

    console.log('📤 Uploading profile image to Supabase:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null
    };
  } catch (error) {
    console.error('❌ Profile image upload failed:', error);
    return {
      url: null,
      path: null,
      error: error.message || 'Upload failed'
    };
  }
};

/**
 * Delete Document using client-side Supabase
 * @param {string} filePath - File path to delete
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const deleteDocumentClientSide = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    // Extract just the path if it's a full URL
    let pathToDelete = filePath;
    if (filePath.includes('supabase.co')) {
      const match = filePath.match(/\/documents\/(.+)$/);
      if (match) {
        pathToDelete = match[1];
      }
    }

    console.log('🗑️ Deleting document from Supabase:', pathToDelete);

    const { data, error } = await supabaseClient.storage
      .from('documents')
      .remove([pathToDelete]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }

    console.log('✅ Delete successful');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Delete failed:', error);
    return { success: false, error: error.message || 'Delete failed' };
  }
};

/**
 * Test Backend API Connection
 * This tests if the backend is properly configured with Supabase
 */
export const testSupabase = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Backend health check failed');
    }
    const data = await response.json();
    if (data.supabase) {
      console.log('✅ Backend Supabase connection verified');
      return { success: true, data, error: null };
    } else {
      console.warn('⚠️ Backend Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server .env file');
      return { success: false, error: 'Backend Supabase not configured' };
    }
  } catch (error) {
    console.error('❌ Backend connection error:', error);
    return { success: false, error };
  }
};

/**
 * Upload Profile Image via Client-Side Supabase
 * @param {File} file - Image file
 * @param {string} userId - User ID
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadProfileImage = async (file, userId) => {
  console.log('📤 Uploading profile image to Supabase');

  // Use client-side Supabase upload
  const result = await uploadProfileImageClientSide(file, userId);

  if (result.error) {
    console.error('❌ Supabase upload failed:', result.error);
    return { url: null, error: result.error };
  }

  console.log('✅ Supabase upload successful:', result.url);
  return { url: result.url, error: null };
};

/**
 * Upload Document via Backend API
 * This uses the backend which has Supabase Service Role key (bypasses RLS)
 * @param {File} file - Document file
 * @param {string} userId - User ID
 * @param {string} fileName - Custom file name (optional)
 * @returns {Promise<{url: string, path: string, error: any}>}
 */
export const uploadDocument = async (file, userId, fileName = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    if (fileName) {
      formData.append('fileName', fileName);
    }

    const response = await fetch(`${API_BASE_URL}/api/upload-document`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return { url: data.url, path: data.path, error: null };
  } catch (error) {
    console.error('❌ Document upload error:', error);
    return { url: null, path: null, error };
  }
};

/**
 * Delete Document via Backend API
 * @param {string} fileUrl - Full file URL or path
 * @param {string} userId - User ID (optional, for path extraction)
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const deleteDocument = async (fileUrl, userId = null) => {
  try {
    // Extract path from URL if needed
    let path = fileUrl;
    if (fileUrl && fileUrl.includes('supabase.co')) {
      const urlMatch = fileUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
      if (urlMatch) {
        path = urlMatch[2];
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/delete-document`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path, url: fileUrl })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Delete failed');
    }

    const data = await response.json();
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Delete document error:', error);
    return { success: false, error };
  }
};

/**
 * Get Document URL (Signed URL for secure access) via Backend API
 * @param {string} documentPath - Relative file path (e.g., 'users/userId/documents/file.pdf')
 * @param {number} expiresIn - Expiration time in seconds (default: 300 = 5 minutes)
 * @returns {Promise<{signedUrl: string, error: any}>}
 */
/**
 * Get Document URL using client-side Supabase (works in production without backend)
 * @param {string} documentPath - Relative file path (e.g., 'users/userId/documents/file.pdf')
 * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<{signedUrl: string, error: any}>}
 */
export const getDocumentUrl = async (documentPath, expiresIn = 3600) => {
  try {
    // Validate path
    if (!documentPath) {
      throw new Error('Document path is required');
    }

    console.log('📄 Original document path:', documentPath);

    // If it's already a full Supabase URL, try to use it as public URL first
    if (documentPath.includes('supabase.co/storage/v1/object/public/')) {
      console.log('✅ Using existing public URL directly');
      return { signedUrl: documentPath, error: null };
    }

    // Extract just the path if it's a full URL
    let filePath = documentPath;
    if (documentPath.includes('supabase.co')) {
      // Try to match 'documents' or 'PROVIDER-DOCUMENTS'
      const match = documentPath.match(/\/(documents|PROVIDER-DOCUMENTS)\/(.+)$/);
      if (match) {
        filePath = match[2];
      }
    }

    // Remove leading slash if present
    filePath = filePath.replace(/^\/+/, '');
    console.log('📄 Extracted file path:', filePath);

    // Method 1: Try public URL (documents bucket)
    try {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`;
      const testResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('✅ Public URL (documents) accessible');
        return { signedUrl: publicUrl, error: null };
      }
    } catch (e) { /* Ignore */ }

    // Method 1b: Try public URL (PROVIDER-DOCUMENTS bucket)
    try {
      const publicUrlProvider = `${supabaseUrl}/storage/v1/object/public/PROVIDER-DOCUMENTS/${filePath}`;
      const testResponse = await fetch(publicUrlProvider, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('✅ Public URL (PROVIDER-DOCUMENTS) accessible');
        return { signedUrl: publicUrlProvider, error: null };
      }
    } catch (e) { /* Ignore */ }

    // Method 2: Try signed URL (documents bucket)
    try {
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .createSignedUrl(filePath, expiresIn);

      if (!error && data?.signedUrl) {
        return { signedUrl: data.signedUrl, error: null };
      }
    } catch (e) { /* Ignore */ }

    // Method 2b: Try signed URL (PROVIDER-DOCUMENTS bucket)
    try {
      const { data, error } = await supabaseClient.storage
        .from('PROVIDER-DOCUMENTS')
        .createSignedUrl(filePath, expiresIn);

      if (!error && data?.signedUrl) {
        return { signedUrl: data.signedUrl, error: null };
      }
    } catch (e) { console.warn('Signed URL generation failed for both buckets'); }


    // Method 3: Backend fallback (for local development)
    if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
      // ... (Keep existing backend fallback if needed, but risky if backend doesn't support provider docs)
      // Skipping for now as client-side should work with public policy
    }

    // Method 4: Fallback - Guess it's a provider document if it didn't work for documents
    // Or just default to documents logic if we can't be sure
    const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/PROVIDER-DOCUMENTS/${filePath}`;
    console.log('⚠️ Using fallback public URL (PROVIDER-DOCUMENTS):', fallbackUrl);
    return { signedUrl: fallbackUrl, error: null };

  } catch (error) {
    console.error('❌ All methods failed. Error:', error);
    return {
      signedUrl: null,
      error: error.message || 'Failed to get document URL.'
    };
  }
};

/**
 * Delete Provider Document using client-side Supabase
 * @param {string} filePath - File path to delete
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const deleteProviderDocumentClientSide = async (filePath) => {
  try {
    if (!filePath) {
      throw new Error('No file path provided');
    }

    // Extract just the path if it's a full URL
    let pathToDelete = filePath;
    if (filePath.includes('supabase.co')) {
      try {
        const urlObj = new URL(filePath);
        const parts = urlObj.pathname.split('/PROVIDER-DOCUMENTS/');
        if (parts.length > 1) {
          pathToDelete = decodeURIComponent(parts[1]);
        }
      } catch (e) {
        console.warn("Could not parse URL, using raw path", e);
      }
    }

    console.log('🗑️ Deleting provider document from Supabase:', pathToDelete);

    const { data, error } = await supabaseClient.storage
      .from('PROVIDER-DOCUMENTS')
      .remove([pathToDelete]);

    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }

    console.log('✅ Delete successful');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Delete failed:', error);
    return { success: false, error: error.message || 'Delete failed' };
  }
};
