/**
 * Personalization Service
 * Handles user preferences, tracking, and recommendations
 */

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const db = getFirestore();

/**
 * User Preferences Data Model
 */
export const DEFAULT_PREFERENCES = {
  // Search & Filter Preferences
  preferredLocation: '',
  preferredPriceRange: '',
  preferredServiceTypes: [], // ['Jeep Driver', 'Tour Guide', 'Renting']
  preferredCategories: [], // For equipment: ['Camera', 'Camping']
  lastUsedFilters: {},
  
  // Booking Preferences
  preferredBookingType: '', // 'full-day' or 'half-day'
  autoFillBookingInfo: true,
  
  // Notification Preferences
  notifications: {
    bookingUpdates: true,
    priceDrops: true,
    availabilityAlerts: true,
    newPackages: true,
    promotions: false
  },
  
  // Privacy
  enablePersonalization: true,
  trackBehavior: true,
  
  // Metadata
  createdAt: null,
  updatedAt: null
};

/**
 * User Activity Tracking Model
 */
const createActivityRecord = (userId, type, itemId, itemType, metadata = {}) => ({
  userId,
  type, // 'view', 'favorite', 'booking', 'search'
  itemId,
  itemType, // 'jeep-driver', 'tour-guide', 'package', 'product', 'renting-shop'
  metadata,
  timestamp: serverTimestamp()
});

/**
 * Initialize user preferences
 */
export const initializeUserPreferences = async (userId) => {
  try {
    const preferencesRef = doc(db, 'userPreferences', userId);
    const preferencesDoc = await getDoc(preferencesRef);
    
    if (!preferencesDoc.exists()) {
      await setDoc(preferencesRef, {
        ...DEFAULT_PREFERENCES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return DEFAULT_PREFERENCES;
    }
    
    return preferencesDoc.data();
  } catch (error) {
    console.error('Error initializing user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Get user preferences
 */
export const getUserPreferences = async (userId) => {
  try {
    const preferencesRef = doc(db, 'userPreferences', userId);
    const preferencesDoc = await getDoc(preferencesRef);
    
    if (preferencesDoc.exists()) {
      return preferencesDoc.data();
    }
    
    return await initializeUserPreferences(userId);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId, updates) => {
  try {
    const preferencesRef = doc(db, 'userPreferences', userId);
    await updateDoc(preferencesRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return false;
  }
};

/**
 * Clear personalization data
 */
export const clearPersonalizationData = async (userId) => {
  try {
    // Clear preferences
    const preferencesRef = doc(db, 'userPreferences', userId);
    await setDoc(preferencesRef, {
      ...DEFAULT_PREFERENCES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Clear activity history
    const activitiesRef = collection(db, 'userActivities');
    const q = query(activitiesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(doc => 
      doc.ref.delete()
    );
    await Promise.all(deletePromises);
    
    // Clear recently viewed
    await updateRecentlyViewed(userId, []);
    
    // Clear favorites
    await updateFavorites(userId, []);
    
    return true;
  } catch (error) {
    console.error('Error clearing personalization data:', error);
    return false;
  }
};

/**
 * Track user activity
 */
export const trackActivity = async (userId, type, itemId, itemType, metadata = {}) => {
  try {
    if (!userId) return;
    
    // Check if personalization is enabled
    const preferences = await getUserPreferences(userId);
    if (!preferences.trackBehavior) return;
    
    const activitiesRef = collection(db, 'userActivities');
    const activityRecord = createActivityRecord(userId, type, itemId, itemType, metadata);
    
    await setDoc(doc(activitiesRef), activityRecord);
    
    // Update recently viewed if it's a view action
    if (type === 'view') {
      await addToRecentlyViewed(userId, itemId, itemType, metadata);
    }
    
    return true;
  } catch (error) {
    console.error('Error tracking activity:', error);
    return false;
  }
};

/**
 * Recently Viewed Management
 */
export const addToRecentlyViewed = async (userId, itemId, itemType, metadata = {}) => {
  try {
    const recentlyViewedRef = doc(db, 'recentlyViewed', userId);
    const recentlyViewedDoc = await getDoc(recentlyViewedRef);
    
    let items = [];
    if (recentlyViewedDoc.exists()) {
      items = recentlyViewedDoc.data().items || [];
    }
    
    // Remove if already exists (to move to front)
    items = items.filter(item => item.itemId !== itemId);
    
    // Add to front
    items.unshift({
      itemId,
      itemType,
      metadata,
      viewedAt: new Date().toISOString()
    });
    
    // Keep only last 20 items
    items = items.slice(0, 20);
    
    await setDoc(recentlyViewedRef, {
      items,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    return false;
  }
};

export const getRecentlyViewed = async (userId) => {
  try {
    const recentlyViewedRef = doc(db, 'recentlyViewed', userId);
    const recentlyViewedDoc = await getDoc(recentlyViewedRef);
    
    if (recentlyViewedDoc.exists()) {
      return recentlyViewedDoc.data().items || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting recently viewed:', error);
    return [];
  }
};

export const updateRecentlyViewed = async (userId, items) => {
  try {
    const recentlyViewedRef = doc(db, 'recentlyViewed', userId);
    await setDoc(recentlyViewedRef, {
      items,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating recently viewed:', error);
    return false;
  }
};

/**
 * Favorites Management
 */
export const addToFavorites = async (userId, itemId, itemType, metadata = {}) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesDoc = await getDoc(favoritesRef);
    
    let items = [];
    if (favoritesDoc.exists()) {
      items = favoritesDoc.data().items || [];
    }
    
    // Check if already favorited
    const exists = items.some(item => item.itemId === itemId);
    if (exists) {
      return { success: false, message: 'Already in favorites' };
    }
    
    // Add to favorites
    items.push({
      itemId,
      itemType,
      metadata,
      favoritedAt: new Date().toISOString()
    });
    
    await setDoc(favoritesRef, {
      items,
      updatedAt: serverTimestamp()
    });
    
    // Track activity
    await trackActivity(userId, 'favorite', itemId, itemType, metadata);
    
    return { success: true, message: 'Added to favorites' };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, message: 'Failed to add to favorites' };
  }
};

export const removeFromFavorites = async (userId, itemId) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesDoc = await getDoc(favoritesRef);
    
    if (!favoritesDoc.exists()) {
      return { success: false, message: 'No favorites found' };
    }
    
    let items = favoritesDoc.data().items || [];
    items = items.filter(item => item.itemId !== itemId);
    
    await setDoc(favoritesRef, {
      items,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, message: 'Removed from favorites' };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, message: 'Failed to remove from favorites' };
  }
};

export const getFavorites = async (userId) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    const favoritesDoc = await getDoc(favoritesRef);
    
    if (favoritesDoc.exists()) {
      return favoritesDoc.data().items || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

export const isFavorited = async (userId, itemId) => {
  try {
    const favorites = await getFavorites(userId);
    return favorites.some(item => item.itemId === itemId);
  } catch (error) {
    console.error('Error checking if favorited:', error);
    return false;
  }
};

export const updateFavorites = async (userId, items) => {
  try {
    const favoritesRef = doc(db, 'favorites', userId);
    await setDoc(favoritesRef, {
      items,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating favorites:', error);
    return false;
  }
};

/**
 * Get user's booking history
 */
export const getUserBookingHistory = async (userId) => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef, 
      where('customerId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting booking history:', error);
    return [];
  }
};

/**
 * Get user's rental history
 */
export const getUserRentalHistory = async (userId) => {
  try {
    const rentalsRef = collection(db, 'rentals');
    const q = query(
      rentalsRef,
      where('customerId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting rental history:', error);
    return [];
  }
};

/**
 * Generate personalized recommendations
 */
export const getRecommendations = async (userId, type = 'all', limitCount = 10) => {
  try {
    const preferences = await getUserPreferences(userId);
    const bookingHistory = await getUserBookingHistory(userId);
    const rentalHistory = await getUserRentalHistory(userId);
    const recentlyViewed = await getRecentlyViewed(userId);
    const favorites = await getFavorites(userId);
    
    const recommendations = {
      jeepDrivers: [],
      tourGuides: [],
      packages: [],
      products: [],
      rentingShops: []
    };
    
    // 1. Recommend based on booking history
    if (bookingHistory.length > 0) {
      const providerIds = [...new Set(bookingHistory.map(b => b.driverId || b.guideId).filter(Boolean))];
      const serviceTypes = [...new Set(bookingHistory.map(b => b.serviceType).filter(Boolean))];
      
      // Get similar providers
      for (const serviceType of serviceTypes) {
        const providersRef = collection(db, 'serviceProviders');
        const q = query(
          providersRef,
          where('serviceType', '==', serviceType),
          where('rating', '>=', 4.0),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const providers = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !providerIds.includes(p.id)); // Exclude already booked
        
        if (serviceType === 'Jeep Driver') {
          recommendations.jeepDrivers.push(...providers);
        } else if (serviceType === 'Tour Guide') {
          recommendations.tourGuides.push(...providers);
        }
      }
    }
    
    // 2. Recommend based on rental history
    if (rentalHistory.length > 0) {
      const categories = [...new Set(rentalHistory.map(r => r.productCategory).filter(Boolean))];
      
      for (const category of categories) {
        const productsRef = collection(db, 'rentalProducts');
        const q = query(
          productsRef,
          where('category', '==', category),
          where('available', '==', true),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        recommendations.products.push(...products);
      }
    }
    
    // 3. Recommend based on recently viewed
    if (recentlyViewed.length > 0) {
      const viewedTypes = [...new Set(recentlyViewed.map(item => item.itemType))];
      
      for (const itemType of viewedTypes) {
        let collectionName = '';
        let categoryKey = '';
        
        if (itemType === 'jeep-driver' || itemType === 'tour-guide') {
          collectionName = 'serviceProviders';
        } else if (itemType === 'product') {
          collectionName = 'rentalProducts';
        } else if (itemType === 'package') {
          collectionName = 'servicePackages';
        }
        
        if (collectionName) {
          const ref = collection(db, collectionName);
          const q = query(ref, limit(5));
          const snapshot = await getDocs(q);
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (itemType === 'product') {
            recommendations.products.push(...items);
          } else if (itemType === 'package') {
            recommendations.packages.push(...items);
          }
        }
      }
    }
    
    // 4. Recommend based on preferences
    if (preferences.preferredServiceTypes.length > 0) {
      for (const serviceType of preferences.preferredServiceTypes) {
        const providersRef = collection(db, 'serviceProviders');
        const q = query(
          providersRef,
          where('serviceType', '==', serviceType),
          orderBy('rating', 'desc'),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const providers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (serviceType === 'Jeep Driver') {
          recommendations.jeepDrivers.push(...providers);
        } else if (serviceType === 'Tour Guide') {
          recommendations.tourGuides.push(...providers);
        } else if (serviceType === 'Renting') {
          recommendations.rentingShops.push(...providers);
        }
      }
    }
    
    // Remove duplicates and limit
    Object.keys(recommendations).forEach(key => {
      recommendations[key] = Array.from(
        new Map(recommendations[key].map(item => [item.id, item])).values()
      ).slice(0, limitCount);
    });
    
    // Return based on type
    if (type === 'all') {
      return recommendations;
    } else {
      return recommendations[type] || [];
    }
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return type === 'all' ? {
      jeepDrivers: [],
      tourGuides: [],
      packages: [],
      products: [],
      rentingShops: []
    } : [];
  }
};

/**
 * Save search filters for next time
 */
export const saveLastUsedFilters = async (userId, filterType, filters) => {
  try {
    const preferencesRef = doc(db, 'userPreferences', userId);
    await updateDoc(preferencesRef, {
      [`lastUsedFilters.${filterType}`]: filters,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving filters:', error);
    return false;
  }
};

/**
 * Get saved search filters
 */
export const getLastUsedFilters = async (userId, filterType) => {
  try {
    const preferences = await getUserPreferences(userId);
    return preferences.lastUsedFilters?.[filterType] || {};
  } catch (error) {
    console.error('Error getting saved filters:', error);
    return {};
  }
};

/**
 * Create personalized notification
 */
export const createPersonalizedNotification = async (userId, type, data) => {
  try {
    const preferences = await getUserPreferences(userId);
    
    // Check if user has enabled this notification type
    if (!preferences.notifications[type]) {
      return false;
    }
    
    const notificationsRef = collection(db, 'notifications');
    await setDoc(doc(notificationsRef), {
      userId,
      type,
      data,
      read: false,
      createdAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating personalized notification:', error);
    return false;
  }
};

/**
 * Check for price drops on favorited items
 */
export const checkPriceDrops = async (userId) => {
  try {
    const favorites = await getFavorites(userId);
    const priceDrops = [];
    
    for (const favorite of favorites) {
      if (favorite.itemType === 'product') {
        const productRef = doc(db, 'rentalProducts', favorite.itemId);
        const productDoc = await getDoc(productRef);
        
        if (productDoc.exists()) {
          const currentPrice = productDoc.data().pricePerDay;
          const originalPrice = favorite.metadata.pricePerDay;
          
          if (originalPrice && currentPrice < originalPrice) {
            priceDrops.push({
              itemId: favorite.itemId,
              itemType: favorite.itemType,
              oldPrice: originalPrice,
              newPrice: currentPrice,
              percentageOff: Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
            });
          }
        }
      }
    }
    
    return priceDrops;
  } catch (error) {
    console.error('Error checking price drops:', error);
    return [];
  }
};

export default {
  initializeUserPreferences,
  getUserPreferences,
  updateUserPreferences,
  clearPersonalizationData,
  trackActivity,
  addToRecentlyViewed,
  getRecentlyViewed,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  isFavorited,
  getUserBookingHistory,
  getUserRentalHistory,
  getRecommendations,
  saveLastUsedFilters,
  getLastUsedFilters,
  createPersonalizedNotification,
  checkPriceDrops
};
