// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
 * Upload Profile Image via Backend API
 * This uses the backend which has Supabase Service Role key (bypasses RLS)
 * @param {File} file - Image file
 * @param {string} userId - User ID
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadProfileImage = async (file, userId) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const response = await fetch(`${API_BASE_URL}/api/upload-profile-image`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return { url: data.url, error: null };
  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    return { url: null, error };
  }
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
export const getDocumentUrl = async (documentPath, expiresIn = 300) => {
  try {
    // Validate path is not a URL
    if (!documentPath) {
      throw new Error('Document path is required');
    }

    if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
      throw new Error('Path must be relative (e.g., users/userId/documents/file.pdf), not a full URL');
    }

    const response = await fetch(`${API_BASE_URL}/api/get-document-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        path: documentPath, // ✅ Only send relative path
        expiresIn 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to get document URL' }));
      throw new Error(errorData.error || 'Failed to get document URL');
    }

    const data = await response.json();
    return { signedUrl: data.signedUrl, error: null };
  } catch (error) {
    console.error('❌ Get document URL error:', error);
    // Return more detailed error for better debugging
    const errorMessage = error.message.includes('fetch') 
      ? 'Backend server is not accessible. Please ensure the server is running or configure VITE_API_URL environment variable.'
      : error.message;
    return { signedUrl: null, error: errorMessage };
  }
};
