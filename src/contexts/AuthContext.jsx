import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

/**
 * AuthContext - Global authentication state management
 * 
 * Provides:
 * - user: Firebase Auth user object
 * - isAdmin: Boolean flag indicating if user is admin
 * - userRole: 'admin' | 'service_provider' | 'tourist' | null
 * - loading: Boolean indicating if auth state is being loaded
 * - userData: User data from Firestore
 */
const AuthContext = createContext({
  user: null,
  isAdmin: false,
  userRole: null,
  loading: true,
  userData: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();

  /**
   * Determine user role based on Firestore collection existence
   * Order of checks:
   * 1. admins/{uid} - if exists, user is ADMIN
   * 2. serviceProviders/{uid} - if exists, user is SERVICE_PROVIDER
   * 3. tourists/{uid} - user is TOURIST
   */
  const determineUserRole = async (uid) => {
    if (!uid) {
      return { role: null, data: null, isAdmin: false };
    }

    try {
      // Step 1: Check if document exists in admins collection
      console.log('🔍 Checking admin status for uid:', uid);
      const adminDocRef = doc(db, 'admins', uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        console.log('✅ User is ADMIN:', uid);
        return { 
          role: 'admin', 
          data: adminDoc.data(), 
          isAdmin: true 
        };
      }

      // Step 2: Check if document exists in serviceProviders collection
      console.log('🔍 Checking service provider status for uid:', uid);
      const providerDocRef = doc(db, 'serviceProviders', uid);
      const providerDoc = await getDoc(providerDocRef);
      
      if (providerDoc.exists()) {
        console.log('✅ User is SERVICE PROVIDER:', uid);
        return { 
          role: 'service_provider', 
          data: providerDoc.data(), 
          isAdmin: false 
        };
      }

      // Step 3: Check tourists collection (or default to tourist)
      console.log('🔍 Checking tourist status for uid:', uid);
      const touristDocRef = doc(db, 'tourists', uid);
      const touristDoc = await getDoc(touristDocRef);
      
      console.log('✅ User is TOURIST:', uid);
      return { 
        role: 'tourist', 
        data: touristDoc.exists() ? touristDoc.data() : null, 
        isAdmin: false 
      };

    } catch (error) {
      console.error('❌ Error determining user role:', error);
      return { role: null, data: null, isAdmin: false };
    }
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    console.log('🔐 Setting up auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('👤 User authenticated:', firebaseUser.uid);
        setUser(firebaseUser);

        // Determine user role and admin status
        const { role, data, isAdmin: adminStatus } = await determineUserRole(firebaseUser.uid);
        
        setUserRole(role);
        setUserData(data);
        setIsAdmin(adminStatus);
        
        console.log('📊 Auth state updated:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role,
          isAdmin: adminStatus
        });
        
        setLoading(false);
      } else {
        console.log('👤 No user authenticated');
        setUser(null);
        setUserRole(null);
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      console.log('🔐 Cleaning up auth state listener');
      unsubscribe();
    };
  }, [auth, db]);

  const value = {
    user,
    isAdmin,
    userRole,
    userData,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
