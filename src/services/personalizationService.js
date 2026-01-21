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
    newPackages: true
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
    
    // Get favorites from tourists collection
    const touristDoc = await getDoc(doc(db, 'tourists', userId));
    const favoriteJeepDrivers = touristDoc.exists() ? (touristDoc.data().favoriteJeepDrivers || []) : [];
    const favoriteGuides = touristDoc.exists() ? (touristDoc.data().favoriteGuides || []) : [];
    
    const recommendations = {
      jeepDrivers: [],
      tourGuides: [],
      packages: [],
      products: [],
      rentingShops: []
    };
    
    // Analyze booking patterns for smart recommendations
    const nationalParks = bookingHistory
      .map(b => b.nationalPark || b.destination)
      .filter(Boolean);
    const parkFrequency = {};
    nationalParks.forEach(park => {
      parkFrequency[park] = (parkFrequency[park] || 0) + 1;
    });
    
    // Get most frequented park
    const mostVisitedPark = Object.keys(parkFrequency).length > 0
      ? Object.entries(parkFrequency).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    
    // List of all major national parks in Sri Lanka
    const allNationalParks = [
      'Yala National Park',
      'Udawalawe National Park',
      'Wilpattu National Park',
      'Minneriya National Park',
      'Kaudulla National Park',
      'Bundala National Park',
      'Wasgamuwa National Park',
      'Kumana National Park',
      'Gal Oya National Park',
      'Horton Plains National Park'
    ];
    
    // Smart recommendation: If user frequently visits one park, suggest others
    const otherParks = mostVisitedPark
      ? allNationalParks.filter(park => park !== mostVisitedPark)
      : allNationalParks;
    
    // 1. Recommend jeep drivers from other national parks
    if (otherParks.length > 0) {
      const jeepDriversRef = collection(db, 'serviceProviders');
      const jeepQuery = query(
        jeepDriversRef,
        where('serviceType', '==', 'Jeep Driver'),
        where('rating', '>=', 4.0),
        limit(20)
      );
      
      const jeepSnapshot = await getDocs(jeepQuery);
      const jeepDrivers = jeepSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(driver => {
          // Exclude already booked or favorited
          if (favoriteJeepDrivers.includes(driver.id)) return false;
          
          // Prefer drivers from other parks
          const driverDestinations = driver.destinations || [];
          return driverDestinations.some(dest => otherParks.includes(dest));
        });
      
      recommendations.jeepDrivers.push(...jeepDrivers);
    }
    
    // 2. Recommend tour guides from other destinations
    if (otherParks.length > 0) {
      const guidesRef = collection(db, 'serviceProviders');
      const guideQuery = query(
        guidesRef,
        where('serviceType', '==', 'Tour Guide'),
        where('rating', '>=', 4.0),
        limit(20)
      );
      
      const guideSnapshot = await getDocs(guideQuery);
      const guides = guideSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(guide => {
          // Exclude already booked or favorited
          if (favoriteGuides.includes(guide.id)) return false;
          
          // Prefer guides from other parks
          const guideDestinations = guide.destinations || [];
          return guideDestinations.some(dest => otherParks.includes(dest));
        });
      
      recommendations.tourGuides.push(...guides);
    }
    
    // 3. If no booking history, suggest top-rated providers
    if (bookingHistory.length === 0) {
      // Get top jeep drivers
      const topJeepsRef = collection(db, 'serviceProviders');
      const topJeepsQuery = query(
        topJeepsRef,
        where('serviceType', '==', 'Jeep Driver'),
        orderBy('rating', 'desc'),
        limit(10)
      );
      const topJeepsSnapshot = await getDocs(topJeepsQuery);
      const topJeeps = topJeepsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(driver => !favoriteJeepDrivers.includes(driver.id));
      recommendations.jeepDrivers.push(...topJeeps);
      
      // Get top tour guides
      const topGuidesRef = collection(db, 'serviceProviders');
      const topGuidesQuery = query(
        topGuidesRef,
        where('serviceType', '==', 'Tour Guide'),
        orderBy('rating', 'desc'),
        limit(10)
      );
      const topGuidesSnapshot = await getDocs(topGuidesQuery);
      const topGuides = topGuidesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(guide => !favoriteGuides.includes(guide.id));
      recommendations.tourGuides.push(...topGuides);
    }
    
    // 4. Recommend based on recently viewed (similar services)
    if (recentlyViewed.length > 0) {
      const viewedJeeps = recentlyViewed.filter(item => item.itemType === 'jeep-driver');
      const viewedGuides = recentlyViewed.filter(item => item.itemType === 'tour-guide');
      
      if (viewedJeeps.length > 0 && recommendations.jeepDrivers.length < limitCount) {
        const jeepsRef = collection(db, 'serviceProviders');
        const similarJeepsQuery = query(
          jeepsRef,
          where('serviceType', '==', 'Jeep Driver'),
          where('rating', '>=', 3.5),
          limit(10)
        );
        const similarJeepsSnapshot = await getDocs(similarJeepsQuery);
        const similarJeeps = similarJeepsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(driver => 
            !viewedJeeps.some(v => v.itemId === driver.id) &&
            !favoriteJeepDrivers.includes(driver.id)
          );
        recommendations.jeepDrivers.push(...similarJeeps);
      }
      
      if (viewedGuides.length > 0 && recommendations.tourGuides.length < limitCount) {
        const guidesRef = collection(db, 'serviceProviders');
        const similarGuidesQuery = query(
          guidesRef,
          where('serviceType', '==', 'Tour Guide'),
          where('rating', '>=', 3.5),
          limit(10)
        );
        const similarGuidesSnapshot = await getDocs(similarGuidesQuery);
        const similarGuides = similarGuidesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(guide => 
            !viewedGuides.some(v => v.itemId === guide.id) &&
            !favoriteGuides.includes(guide.id)
          );
        recommendations.tourGuides.push(...similarGuides);
      }
    }
    
    // 5. Recommend renting shops
    const rentingRef = collection(db, 'serviceProviders');
    const rentingQuery = query(
      rentingRef,
      where('serviceType', '==', 'Renting'),
      orderBy('rating', 'desc'),
      limit(10)
    );
    const rentingSnapshot = await getDocs(rentingQuery);
    const rentingShops = rentingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    recommendations.rentingShops.push(...rentingShops);
    
    // 6. Recommend service packages
    const packagesRef = collection(db, 'servicePackages');
    const packagesQuery = query(packagesRef, limit(10));
    const packagesSnapshot = await getDocs(packagesQuery);
    const packages = packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    recommendations.packages.push(...packages);
    
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
