import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  deleteDoc,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ==================== ENHANCED ONLINE STATUS MANAGEMENT ====================

let activeListeners = new Map();

/**
 * Clean up all active listeners
 */
export const cleanupAllListeners = () => {
  activeListeners.forEach((unsubscribe, listenerId) => {
    unsubscribe();
    console.log(`🧹 Cleaned up listener: ${listenerId}`);
  });
  activeListeners.clear();
};

/**
 * Register and manage listener
 */
const registerListener = (listenerId, unsubscribe) => {
  activeListeners.set(listenerId, unsubscribe);
  return () => {
    unsubscribe();
    activeListeners.delete(listenerId);
  };
};

// ==================== REVIEW MANAGEMENT SYSTEM ====================

/**
 * Add a new review for a service provider
 */
export const addReview = async (reviewData) => {
  try {
    console.log('📝 Adding new review:', reviewData);
    
    const reviewDoc = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      timestamp: serverTimestamp(),
      timestampValue: Date.now(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      reported: false,
      reportCount: 0
    });

    // Update driver's average rating and review count
    await updateDriverRating(reviewData.driverId);

    console.log(`✅ Review added successfully with ID: ${reviewDoc.id}`);
    return reviewDoc.id;
  } catch (error) {
    console.error('❌ Error adding review:', error);
    throw error;
  }
};

/**
 * Update an existing review
 */
export const updateReview = async (reviewId, reviewData) => {
  try {
    console.log(`📝 Updating review: ${reviewId}`);
    
    await updateDoc(doc(db, 'reviews', reviewId), {
      ...reviewData,
      updatedAt: serverTimestamp(),
      updatedAtValue: Date.now()
    });

    // Update driver's average rating if rating changed
    if (reviewData.rating !== undefined) {
      const reviewDoc = await getDoc(doc(db, 'reviews', reviewId));
      if (reviewDoc.exists()) {
        await updateDriverRating(reviewDoc.data().driverId);
      }
    }

    console.log(`✅ Review ${reviewId} updated successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error updating review:', error);
    throw error;
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId) => {
  try {
    console.log(`🗑️ Deleting review: ${reviewId}`);
    
    const reviewDoc = await getDoc(doc(db, 'reviews', reviewId));
    if (!reviewDoc.exists()) {
      throw new Error('Review not found');
    }

    const reviewData = reviewDoc.data();
    await deleteDoc(doc(db, 'reviews', reviewId));

    // Update driver's average rating after deletion
    await updateDriverRating(reviewData.driverId);

    console.log(`✅ Review ${reviewId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    throw error;
  }
};

/**
 * Update driver's average rating and review count
 */
export const updateDriverRating = async (driverId) => {
  try {
    console.log(`📊 Updating rating for driver: ${driverId}`);
    
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    const reviews = querySnapshot.docs.map(doc => doc.data());
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
      
      await updateDoc(doc(db, 'serviceProviders', driverId), {
        rating: roundedRating,
        totalReviews: reviews.length,
        lastRatingUpdate: serverTimestamp()
      });
      
      console.log(`✅ Driver ${driverId} rating updated: ${roundedRating} (${reviews.length} reviews)`);
    } else {
      // No reviews, reset rating
      await updateDoc(doc(db, 'serviceProviders', driverId), {
        rating: 0,
        totalReviews: 0,
        lastRatingUpdate: serverTimestamp()
      });
      
      console.log(`✅ Driver ${driverId} rating reset (no reviews)`);
    }
  } catch (error) {
    console.error('❌ Error updating driver rating:', error);
    throw error;
  }
};

/**
 * Get reviews for a specific driver with real-time updates
 */
export const getDriverReviews = (driverId, callback, options = {}) => {
  try {
    console.log(`🔔 Setting up real-time reviews listener for driver: ${driverId}`);
    
    const { limitResults = 50, orderByField = 'timestampValue', orderDirection = 'desc' } = options;
    
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(
      reviewsRef,
      where('driverId', '==', driverId),
      orderBy(orderByField, orderDirection),
      limit(limitResults)
    );

    const unsubscribe = onSnapshot(reviewsQuery, 
      (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📊 Real-time reviews update: ${reviews.length} reviews for driver ${driverId}`);
        callback(reviews);
      },
      (error) => {
        console.error('❌ Error in reviews snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`reviews_${driverId}`, unsubscribe);
  } catch (error) {
    console.error('❌ Error getting driver reviews:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get all reviews with real-time updates (for admin/moderation)
 */
export const getAllReviews = (callback, options = {}) => {
  try {
    const { limitResults = 100, orderByField = 'timestampValue', orderDirection = 'desc' } = options;
    
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(
      reviewsRef,
      orderBy(orderByField, orderDirection),
      limit(limitResults)
    );

    const unsubscribe = onSnapshot(reviewsQuery, 
      (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📊 Real-time all reviews update: ${reviews.length} reviews loaded`);
        callback(reviews);
      },
      (error) => {
        console.error('❌ Error in all reviews snapshot:', error);
        callback([]);
      }
    );

    return registerListener('all_reviews', unsubscribe);
  } catch (error) {
    console.error('❌ Error getting all reviews:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Check if user has already reviewed a driver
 */
export const getUserReviewForDriver = async (userId, driverId) => {
  try {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    
    if (!querySnapshot.empty) {
      const reviewDoc = querySnapshot.docs[0];
      return {
        id: reviewDoc.id,
        ...reviewDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error checking user review:', error);
    return null;
  }
};

/**
 * Like a review
 */
export const likeReview = async (reviewId, userId) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);
    
    if (!reviewDoc.exists()) {
      throw new Error('Review not found');
    }
    
    const reviewData = reviewDoc.data();
    
    // Check if user already liked
    if (reviewData.likedBy?.includes(userId)) {
      // Unlike
      await updateDoc(reviewRef, {
        likes: (reviewData.likes || 0) - 1,
        likedBy: arrayRemove(userId)
      });
      console.log(`👍 Review ${reviewId} unliked by user ${userId}`);
    } else {
      // Like
      const updates = {
        likes: (reviewData.likes || 0) + 1,
        likedBy: arrayUnion(userId)
      };
      
      // Remove from dislikes if user previously disliked
      if (reviewData.dislikedBy?.includes(userId)) {
        updates.dislikes = Math.max(0, (reviewData.dislikes || 0) - 1);
        updates.dislikedBy = arrayRemove(userId);
      }
      
      await updateDoc(reviewRef, updates);
      console.log(`👍 Review ${reviewId} liked by user ${userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error liking review:', error);
    throw error;
  }
};

/**
 * Dislike a review
 */
export const dislikeReview = async (reviewId, userId) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);
    
    if (!reviewDoc.exists()) {
      throw new Error('Review not found');
    }
    
    const reviewData = reviewDoc.data();
    
    // Check if user already disliked
    if (reviewData.dislikedBy?.includes(userId)) {
      // Remove dislike
      await updateDoc(reviewRef, {
        dislikes: Math.max(0, (reviewData.dislikes || 0) - 1),
        dislikedBy: arrayRemove(userId)
      });
      console.log(`👎 Review ${reviewId} undisliked by user ${userId}`);
    } else {
      // Dislike
      const updates = {
        dislikes: (reviewData.dislikes || 0) + 1,
        dislikedBy: arrayUnion(userId)
      };
      
      // Remove from likes if user previously liked
      if (reviewData.likedBy?.includes(userId)) {
        updates.likes = Math.max(0, (reviewData.likes || 0) - 1);
        updates.likedBy = arrayRemove(userId);
      }
      
      await updateDoc(reviewRef, updates);
      console.log(`👎 Review ${reviewId} disliked by user ${userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error disliking review:', error);
    throw error;
  }
};

/**
 * Report a review
 */
export const reportReview = async (reviewId, userId, reason) => {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    
    await updateDoc(reviewRef, {
      reported: true,
      reportCount: arrayUnion({
        userId: userId,
        reason: reason,
        timestamp: serverTimestamp()
      }),
      lastReportedAt: serverTimestamp()
    });
    
    console.log(`🚩 Review ${reviewId} reported by user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error reporting review:', error);
    throw error;
  }
};

/**
 * Get review statistics for a driver
 */
export const getDriverReviewStats = async (driverId) => {
  try {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    const reviews = querySnapshot.docs.map(doc => doc.data());
    
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        totalLikes: 0,
        totalDislikes: 0
      };
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });
    
    const totalLikes = reviews.reduce((sum, review) => sum + (review.likes || 0), 0);
    const totalDislikes = reviews.reduce((sum, review) => sum + (review.dislikes || 0), 0);
    
    return {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      totalLikes,
      totalDislikes
    };
  } catch (error) {
    console.error('❌ Error getting review stats:', error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      totalLikes: 0,
      totalDislikes: 0
    };
  }
};

// ==================== OPTIMIZED ONLINE STATUS MANAGEMENT ====================

/**
 * Enhanced function to set user online status with proper role detection
 */
export const setUserOnline = async (userId, userRole = null, userData = {}) => {
  try {
    console.log(`🟢 Setting user ${userId} online as ${userRole}`);
    
    // If role not provided, detect it
    let finalUserRole = userRole;
    if (!finalUserRole) {
      finalUserRole = await getUserRole(userId);
    }
    
    const onlineData = {
      userId: userId,
      userRole: finalUserRole,
      userName: userData.userName || 'User',
      email: userData.email || '',
      isOnline: true,
      online: true,
      lastSeen: serverTimestamp(),
      lastSeenTimestamp: Date.now(),
      lastOnlineStatus: 'online',
      status: 'online',
      lastActive: new Date().toISOString(),
      ...userData
    };
    
    // Update both onlineStatus collection and user's main document
    const updatePromises = [
      setDoc(doc(db, 'onlineStatus', userId), onlineData, { merge: true })
    ];
    
    // Also update the user's main document based on role
    if (finalUserRole === 'tourist') {
      updatePromises.push(
        setDoc(doc(db, 'tourists', userId), {
          online: true,
          isOnline: true,
          lastSeen: serverTimestamp(),
          lastSeenTimestamp: Date.now(),
          status: 'online'
        }, { merge: true })
      );
    } else if (finalUserRole === 'provider') {
      updatePromises.push(
        setDoc(doc(db, 'serviceProviders', userId), {
          online: true,
          isOnline: true,
          lastSeen: serverTimestamp(),
          lastSeenTimestamp: Date.now(),
          status: 'online',
          availability: true
        }, { merge: true })
      );
    }
    
    await Promise.all(updatePromises);
    
    console.log(`✅ User ${userId} successfully set online as ${finalUserRole}`);
    return true;
  } catch (error) {
    console.error('❌ Error setting user online:', error);
    throw error;
  }
};

/**
 * Enhanced function to set user offline status
 */
export const setUserOffline = async (userId, userRole = null) => {
  try {
    console.log(`🔴 Setting user ${userId} offline`);
    
    // If role not provided, detect it
    let finalUserRole = userRole;
    if (!finalUserRole) {
      finalUserRole = await getUserRole(userId);
    }
    
    const offlineData = {
      isOnline: false,
      online: false,
      lastSeen: serverTimestamp(),
      lastSeenTimestamp: Date.now(),
      lastOnlineStatus: 'offline',
      status: 'offline',
      lastActive: new Date().toISOString()
    };
    
    // Update both onlineStatus collection and user's main document
    const updatePromises = [
      setDoc(doc(db, 'onlineStatus', userId), offlineData, { merge: true })
    ];
    
    // Also update the user's main document based on role
    if (finalUserRole === 'tourist') {
      updatePromises.push(
        setDoc(doc(db, 'tourists', userId), offlineData, { merge: true })
      );
    } else if (finalUserRole === 'provider') {
      updatePromises.push(
        setDoc(doc(db, 'serviceProviders', userId), {
          ...offlineData,
          availability: false
        }, { merge: true })
      );
    }
    
    await Promise.all(updatePromises);
    
    console.log(`✅ User ${userId} successfully set offline`);
    return true;
  } catch (error) {
    console.error('❌ Error setting user offline:', error);
    throw error;
  }
};

/**
 * Enhanced user role detection
 */
export const getUserRole = async (userId) => {
  try {
    const touristDoc = await getDoc(doc(db, 'tourists', userId));
    if (touristDoc.exists()) return 'tourist';
    
    const providerDoc = await getDoc(doc(db, 'serviceProviders', userId));
    if (providerDoc.exists()) return 'provider';
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Enhanced real-time online status for service providers with detailed offline tracking
 */
export const getServiceProvidersOnlineStatus = (callback, options = {}) => {
  try {
    console.log('🔔 Setting up enhanced real-time online status listener for service providers...');
    
    const { maxResults = 100 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const providersQuery = query(
      providersRef,
      where('serviceType', '==', 'Jeep Driver'),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const onlineStatusMap = {};
        const now = Date.now();
        
        snapshot.docs.forEach(doc => {
          const provider = doc.data();
          const providerId = doc.id;
          
          // Calculate detailed offline status
          const isOnline = provider.online || provider.isOnline || false;
          const lastSeen = provider.lastSeen;
          const lastSeenTimestamp = provider.lastSeenTimestamp;
          
          let offlineText = 'Offline';
          let lastSeenText = 'Unknown';
          
          if (lastSeenTimestamp) {
            const lastSeenDate = new Date(lastSeenTimestamp);
            const diffInMinutes = Math.floor((now - lastSeenTimestamp) / (1000 * 60));
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);
            
            if (diffInMinutes < 1) {
              lastSeenText = 'Just now';
            } else if (diffInMinutes < 60) {
              lastSeenText = `${diffInMinutes}m ago`;
            } else if (diffInHours < 24) {
              lastSeenText = `${diffInHours}h ago`;
            } else {
              lastSeenText = `${diffInDays}d ago`;
            }
            
            offlineText = `Last seen ${lastSeenText}`;
          }
          
          onlineStatusMap[providerId] = {
            isOnline: isOnline,
            online: isOnline,
            lastSeen: lastSeen,
            lastSeenTimestamp: lastSeenTimestamp,
            status: isOnline ? 'online' : 'offline',
            offlineText: isOnline ? 'Online now' : offlineText,
            lastSeenText: lastSeenText,
            userName: provider.fullName || provider.driverName || 'Safari Driver',
            userRole: 'provider'
          };
        });
        
        const onlineCount = Object.values(onlineStatusMap).filter(p => p.isOnline).length;
        console.log(`👥 Enhanced real-time status: ${onlineCount} drivers online out of ${snapshot.docs.length}`);
        callback(onlineStatusMap);
      },
      (error) => {
        console.error('Error in enhanced online status snapshot:', error);
        callback({});
      }
    );

    return registerListener(`enhanced_providers_online_${Date.now()}`, unsubscribe);
  } catch (error) {
    console.error('Error getting enhanced online status:', error);
    callback({});
    return () => {};
  }
};

/**
 * Get individual user online status in real-time with detailed offline information
 */
export const getUserOnlineStatus = (userId, callback) => {
  try {
    const userRef = doc(db, 'onlineStatus', userId);
    
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const now = Date.now();
          const isOnline = data.isOnline || false;
          const lastSeenTimestamp = data.lastSeenTimestamp;
          
          let offlineText = 'Offline';
          let lastSeenText = 'Unknown';
          
          if (lastSeenTimestamp) {
            const lastSeenDate = new Date(lastSeenTimestamp);
            const diffInMinutes = Math.floor((now - lastSeenTimestamp) / (1000 * 60));
            const diffInHours = Math.floor(diffInMinutes / 60);
            const diffInDays = Math.floor(diffInHours / 24);
            
            if (diffInMinutes < 1) {
              lastSeenText = 'Just now';
            } else if (diffInMinutes < 60) {
              lastSeenText = `${diffInMinutes}m ago`;
            } else if (diffInHours < 24) {
              lastSeenText = `${diffInHours}h ago`;
            } else {
              lastSeenText = `${diffInDays}d ago`;
            }
            
            offlineText = `Last seen ${lastSeenText}`;
          }
          
          callback({
            isOnline: isOnline,
            online: isOnline,
            lastSeen: data.lastSeen,
            lastSeenTimestamp: lastSeenTimestamp,
            userType: data.userType,
            userRole: data.userRole,
            userName: data.userName,
            status: isOnline ? 'online' : 'offline',
            offlineText: isOnline ? 'Online now' : offlineText,
            lastSeenText: lastSeenText
          });
        } else {
          callback({ 
            isOnline: false, 
            online: false,
            lastSeen: null, 
            status: 'offline',
            offlineText: 'Never been online',
            lastSeenText: 'Never'
          });
        }
      },
      (error) => {
        console.error('Error in user online status:', error);
        callback({ 
          isOnline: false, 
          online: false,
          lastSeen: null, 
          status: 'offline',
          offlineText: 'Status unavailable',
          lastSeenText: 'Unknown'
        });
      }
    );
    
    return registerListener(`user_status_${userId}`, unsubscribe);
  } catch (error) {
    console.error('Error getting user online status:', error);
    callback({ 
      isOnline: false, 
      online: false,
      lastSeen: null, 
      status: 'offline',
      offlineText: 'Error loading status',
      lastSeenText: 'Unknown'
    });
    return () => {};
  }
};

// ==================== CONVERSATION & MESSAGING ====================

export const createOrGetConversation = async (user1Id, user2Id, user1Name, user2Name) => {
  try {
    const conversationId = [user1Id, user2Id].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      let user1Role = await getUserRole(user1Id) || 'tourist';
      let user2Role = await getUserRole(user2Id) || 'provider';

      await setDoc(conversationRef, {
        participantIds: [user1Id, user2Id],
        participantNames: {
          [user1Id]: user1Name,
          [user2Id]: user2Name
        },
        participantRoles: {
          [user1Id]: user1Role,
          [user2Id]: user2Role
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ New conversation created: ${conversationId}`);
    }

    return conversationId;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

export const getConversationById = async (conversationId) => {
  try {
    const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
    if (conversationDoc.exists()) {
      return {
        id: conversationDoc.id,
        ...conversationDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
};

export const getOtherParticipant = (conversation, currentUserId) => {
  if (!conversation || !conversation.participantIds) return null;
  
  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId);
  return {
    id: otherParticipantId,
    name: conversation.participantNames?.[otherParticipantId] || 'User',
    role: conversation.participantRoles?.[otherParticipantId] || 'user'
  };
};

export const getUserConversations = (userId, callback) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const userConversationsQuery = query(
      conversationsRef,
      where('participantIds', 'array-contains', userId),
      orderBy('lastMessageTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(userConversationsQuery, 
      (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`📨 Loaded ${conversations.length} conversations for user ${userId}`);
        callback(conversations);
      },
      (error) => {
        console.error('Error in conversations snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`conversations_${userId}`, unsubscribe);
  } catch (error) {
    console.error('Error getting conversations:', error);
    callback([]);
    return () => {};
  }
};

export const getMessages = (conversationId, callback) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, 
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`📬 Received ${messages.length} messages for conversation ${conversationId}`);
        callback(messages);
      },
      (error) => {
        console.error('Error in messages snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`messages_${conversationId}`, unsubscribe);
  } catch (error) {
    console.error('Error getting messages:', error);
    callback([]);
    return () => {};
  }
};

export const sendMessage = async (conversationId, messageData) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    const messageDoc = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp(),
      timestampValue: Date.now(),
      read: false,
      delivered: false
    });

    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: messageData.content,
      lastMessageTime: serverTimestamp(),
      lastMessageTimestamp: Date.now(),
      lastMessageSender: messageData.senderId,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Message sent to conversation ${conversationId}`);
    return messageDoc.id;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const unreadMessagesQuery = query(
      messagesRef,
      where('senderId', '!=', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadMessagesQuery);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
        readTimestamp: Date.now()
      })
    );

    await Promise.all(updatePromises);
    console.log(`✅ Marked ${snapshot.docs.length} messages as read in conversation ${conversationId}`);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

export const markMessageAsDelivered = async (conversationId, messageId) => {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      delivered: true,
      deliveredAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
  }
};

// ==================== NOTIFICATION FUNCTIONS ====================

export const getUserNotifications = (userId, callback) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestampValue', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🔔 Received ${notifications.length} notifications for user ${userId}`);
        callback(notifications);
      },
      (error) => {
        console.error('Error in notifications snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`notifications_${userId}`, unsubscribe);
  } catch (error) {
    console.error('Error getting notifications:', error);
    callback([]);
    return () => {};
  }
};

export const createNotification = async (notificationData) => {
  try {
    const notificationRef = collection(db, 'notifications');
    const notificationDoc = await addDoc(notificationRef, {
      ...notificationData,
      read: false,
      timestamp: serverTimestamp(),
      timestampValue: Date.now()
    });
    
    console.log(`✅ Notification created for user ${notificationData.recipientId}`);
    return notificationDoc.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp(),
      readAtTimestamp: Date.now()
    });
    console.log(`✅ Notification ${notificationId} marked as read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// ==================== SERVICE PROVIDER FUNCTIONS ====================

/**
 * Get all service providers with real-time updates
 */
export const getServiceProviders = (callback, options = {}) => {
  try {
    const { serviceType = 'Jeep Driver', maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const providersQuery = query(
      providersRef,
      where('serviceType', '==', serviceType),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const providers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🚙 Loaded ${providers.length} service providers`);
        callback(providers);
      },
      (error) => {
        console.error('Error in service providers snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`service_providers_${serviceType}`, unsubscribe);
  } catch (error) {
    console.error('Error getting service providers:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get specific service provider by ID
 */
export const getServiceProvider = async (providerId) => {
  try {
    const providerDoc = await getDoc(doc(db, 'serviceProviders', providerId));
    if (providerDoc.exists()) {
      return {
        id: providerDoc.id,
        ...providerDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting service provider:', error);
    return null;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if user exists and get basic info
 */
export const getUserInfo = async (userId) => {
  try {
    // Check tourists collection
    const touristDoc = await getDoc(doc(db, 'tourists', userId));
    if (touristDoc.exists()) {
      return {
        id: userId,
        role: 'tourist',
        ...touristDoc.data()
      };
    }
    
    // Check service providers collection
    const providerDoc = await getDoc(doc(db, 'serviceProviders', userId));
    if (providerDoc.exists()) {
      return {
        id: userId,
        role: 'provider',
        ...providerDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

/**
 * Get active listener count for debugging
 */
export const getActiveListenerCount = () => {
  return activeListeners.size;
};

/**
 * Get all active listener IDs for debugging
 */
export const getActiveListenerIds = () => {
  return Array.from(activeListeners.keys());
};

// Export Firebase instances
export { db, auth, storage };
export default app;