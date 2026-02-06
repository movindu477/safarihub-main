import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

console.log('🔧 Supabase initialized:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0
});

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Generic file upload function for Supabase Storage
 * @param {File} file - File object to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path within the bucket
 * @returns {Promise<{url: string, error: any}>}
 */
export const uploadFile = async (file, bucket, path) => {
  try {
    console.log(`📤 Uploading to Supabase:`, {
      bucket,
      path,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error(`❌ Upload error details:`, {
        bucket,
        path,
        error: error.message,
        statusCode: error.statusCode,
        fullError: error
      });
      throw error;
    }

    console.log(`✅ Upload successful:`, data);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log(`🔗 Public URL generated:`, publicUrl);

    return { url: publicUrl, path: path, error: null };
  } catch (error) {
    console.error(`❌ Supabase Upload Error (${bucket}):`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
      fullError: error
    });
    return { url: null, path: null, error: error.message };
  }
};

/**
 * Upload Profile Image
 */
export const uploadProfileImage = async (file, userId) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `profiles/${userId}/${Date.now()}.${fileExt}`;
  return await uploadFile(file, 'PROVIDER-DOCUMENTS', filePath);
};

// Alias for compatibility with existing code
export const uploadProfileImageClientSide = uploadProfileImage;

/**
 * Upload Document (Certifications, etc.)
 */
export const uploadDocument = async (file, userId, fileName = null) => {
  const name = fileName || file.name;
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `documents/${userId}/${Date.now()}_${sanitizedName}`;
  // Consolidating to PROVIDER-DOCUMENTS if that's the bucket the user has
  return await uploadFile(file, 'PROVIDER-DOCUMENTS', filePath);
};

// Alias for compatibility
export const uploadDocumentClientSide = uploadDocument;

/**
 * Upload Provider Document
 */
export const uploadProviderDocumentClientSide = async (file, userId, fileName = null) => {
  const name = fileName || file.name;
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `providers/${userId}/${Date.now()}_${sanitizedName}`;
  return await uploadFile(file, 'PROVIDER-DOCUMENTS', filePath);
};

/**
 * Upload Product Image
 */
export const uploadProductImageClientSide = async (file, userId, fileName = null) => {
  const name = fileName || file.name;
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `products/${userId}/${Date.now()}_${sanitizedName}`;
  return await uploadFile(file, 'PROVIDER-DOCUMENTS', filePath);
};

/**
 * Get Document URL
 * @returns {Promise<string>} - Returns the URL string directly for compatibility
 */
export const getDocumentUrl = async (path, expiresIn = 3600) => {
  try {
    if (!path) return "";

    // If it's already a URL, return it
    if (path.startsWith('http')) return path;

    // Ensure path doesn't start with /
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Determine bucket from path if possible, or try default buckets
    let bucket = 'PROVIDER-DOCUMENTS';

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return publicUrl;
  } catch (error) {
    console.error("❌ Error getting document URL:", error);
    return "";
  }
};

/**
 * Delete File from Supabase
 */
export const deleteFile = async (bucket, pathOrUrl) => {
  try {
    if (!pathOrUrl) return { success: false, error: 'No path provided' };

    let cleanPath = pathOrUrl;

    // If it's a full URL, extract the path after bucket name
    if (pathOrUrl.includes('/storage/v1/object/public/')) {
      const parts = pathOrUrl.split(bucket + '/');
      if (parts.length > 1) {
        cleanPath = parts[1];
      }
    }

    // Remove query params if any
    cleanPath = cleanPath.split('?')[0];
    // Decode URI
    cleanPath = decodeURIComponent(cleanPath);

    const { error } = await supabase.storage.from(bucket).remove([cleanPath]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error(`❌ Supabase Delete Error (${bucket}):`, error);
    return { success: false, error: error.message };
  }
};

// Aliases for compatibility
export const deleteDocument = (path) => deleteFile('PROVIDER-DOCUMENTS', path);
export const deleteDocumentClientSide = deleteDocument;
export const deleteProviderDocumentClientSide = (pathOrUrl) => deleteFile('PROVIDER-DOCUMENTS', pathOrUrl);
export const deleteProfileImageClientSide = (pathOrUrl) => deleteFile('PROVIDER-DOCUMENTS', pathOrUrl);


export const testSupabase = async () => {
  try {
    const { data, error } = await supabase.from('test').select('count', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
