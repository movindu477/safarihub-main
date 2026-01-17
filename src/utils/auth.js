import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * Determine user role based on document existence in Firestore collections
 * 
 * Logic:
 * 1. Check admins/{uid} - if exists, user is ADMIN
 * 2. Check serviceProviders/{uid} - if exists, user is SERVICE_PROVIDER
 * 3. Otherwise, user is TOURIST
 * 
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<{role: 'admin'|'service_provider'|'tourist', data: object|null}>}
 */
export async function getUserRole(uid) {
  if (!uid) {
    return { role: 'tourist', data: null };
  }

  const db = getFirestore();

  try {
    // Step 1: Check if document exists in admins collection
    const adminDocRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminDocRef);
    
    if (adminDoc.exists()) {
      console.log('🔑 User is ADMIN:', uid);
      return { role: 'admin', data: adminDoc.data() };
    }

    // Step 2: Check if document exists in serviceProviders collection
    const providerDocRef = doc(db, 'serviceProviders', uid);
    const providerDoc = await getDoc(providerDocRef);
    
    if (providerDoc.exists()) {
      console.log('🔑 User is SERVICE PROVIDER:', uid);
      return { role: 'service_provider', data: providerDoc.data() };
    }

    // Step 3: User is a tourist (default)
    console.log('🔑 User is TOURIST:', uid);
    const touristDocRef = doc(db, 'tourists', uid);
    const touristDoc = await getDoc(touristDocRef);
    
    return { 
      role: 'tourist', 
      data: touristDoc.exists() ? touristDoc.data() : null 
    };

  } catch (error) {
    console.error('Error determining user role:', error);
    return { role: 'tourist', data: null };
  }
}

/**
 * Check if user is admin (simple check)
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isAdmin(uid) {
  if (!uid) return false;

  const db = getFirestore();
  
  try {
    const adminDocRef = doc(db, 'admins', uid);
    const adminDoc = await getDoc(adminDocRef);
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if user is service provider
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<boolean>}
 */
export async function isServiceProvider(uid) {
  if (!uid) return false;

  const db = getFirestore();
  
  try {
    const providerDocRef = doc(db, 'serviceProviders', uid);
    const providerDoc = await getDoc(providerDocRef);
    return providerDoc.exists();
  } catch (error) {
    console.error('Error checking service provider status:', error);
    return false;
  }
}
