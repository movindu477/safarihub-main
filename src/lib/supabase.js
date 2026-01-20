// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Supabase client for direct access (client-side)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with public anon key (safe for client-side)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nlzsojxtzmmbkyakdfvl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5senNvanh0em1tYmt5YWtkZnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDgxMzAsImV4cCI6MjA1MTIyNDEzMH0.aTWt36pAQCUZxYYFTQ6_MqW3jlA7n0QBqOMKYb28rMw';

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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
      const match = documentPath.match(/\/documents\/(.+)$/);
      if (match) {
        filePath = match[1];
      }
    }

    // Remove leading slash if present
    filePath = filePath.replace(/^\/+/, '');

    console.log('📄 Extracted file path:', filePath);

    // Method 1: Try public URL first (fastest, works for public buckets)
    try {
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`;
      console.log('🔗 Trying public URL:', publicUrl);
      
      // Test if URL is accessible
      const testResponse = await fetch(publicUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('✅ Public URL accessible, using it directly');
        return { signedUrl: publicUrl, error: null };
      }
    } catch (publicError) {
      console.log('⚠️ Public URL not accessible, trying signed URL...');
    }

    // Method 2: Try client-side signed URL (works with RLS policies)
    try {
      const { data, error } = await supabaseClient.storage
        .from('documents')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.warn('⚠️ Client-side signed URL error:', error);
        throw error;
      }

      if (data?.signedUrl) {
        console.log('✅ Client-side signed URL generated successfully');
        return { signedUrl: data.signedUrl, error: null };
      }
    } catch (clientError) {
      console.warn('⚠️ Client-side signed URL failed, trying backend...', clientError);
    }

    // Method 3: Backend fallback (for local development)
    if (API_BASE_URL && !API_BASE_URL.includes('localhost')) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/get-document-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            path: filePath,
            expiresIn 
          }),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const data = await response.json();
        if (data?.signedUrl) {
          console.log('✅ Backend signed URL generated successfully');
          return { signedUrl: data.signedUrl, error: null };
        }
      } catch (backendError) {
        console.warn('⚠️ Backend fallback failed:', backendError.message);
      }
    }

    // Method 4: Last resort - construct public URL and hope for the best
    const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/documents/${filePath}`;
    console.log('⚠️ Using fallback public URL (may not work):', fallbackUrl);
    return { signedUrl: fallbackUrl, error: null };

  } catch (error) {
    console.error('❌ All methods failed. Error:', error);
    return { 
      signedUrl: null, 
      error: error.message || 'Failed to get document URL. Please ensure documents are uploaded correctly.' 
    };
  }
};
