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

// ==================== REVIEW SYSTEM FUNCTIONS ====================

/**
 * Add a new review for a driver
 */
export const addReview = async (reviewData) => {
  try {
    console.log('📝 Adding new review for driver:', reviewData.driverId);
    
    const reviewRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtValue: Date.now()
    });
    
    // Update provider's average rating and total reviews
    await updateProviderRating(reviewData.driverId);
    
    console.log('✅ Review added successfully with ID:', reviewRef.id);
    return reviewRef.id;
  } catch (error) {
    console.error('❌ Error adding review:', error);
    throw error;
  }
};

/**
 * Update provider's average rating and total reviews count
 */
export const updateProviderRating = async (driverId) => {
  try {
    console.log('🔄 Updating provider rating for:', driverId);
    
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId)
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = [];
    
    reviewsSnapshot.forEach(doc => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      const providerRef = doc(db, 'serviceProviders', driverId);
      await updateDoc(providerRef, {
        rating: averageRating,
        totalReviews: reviews.length,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Provider ${driverId} rating updated: ${averageRating.toFixed(1)}/5 from ${reviews.length} reviews`);
    } else {
      // No reviews, reset to default
      const providerRef = doc(db, 'serviceProviders', driverId);
      await updateDoc(providerRef, {
        rating: 0,
        totalReviews: 0,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Provider ${driverId} rating reset to default (no reviews)`);
    }
    
    return reviews;
  } catch (error) {
    console.error('❌ Error updating provider rating:', error);
    throw error;
  }
};

/**
 * Get real-time reviews for a driver
 */
export const getReviews = (driverId, callback) => {
  try {
    console.log('📖 Setting up real-time reviews listener for driver:', driverId);
    
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId),
      orderBy('createdAtValue', 'desc')
    );
    
    const unsubscribe = onSnapshot(reviewsQuery, 
      (snapshot) => {
        const reviews = [];
        snapshot.forEach(doc => {
          reviews.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📚 Received ${reviews.length} reviews for driver ${driverId}`);
        callback(reviews);
      },
      (error) => {
        console.error('❌ Error in reviews snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`reviews_${driverId}`, unsubscribe);
  } catch (error) {
    console.error('❌ Error getting reviews:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId, driverId) => {
  try {
    console.log('🗑️ Deleting review:', reviewId);
    
    await deleteDoc(doc(db, 'reviews', reviewId));
    
    // Update provider rating after deletion
    await updateProviderRating(driverId);
    
    console.log('✅ Review deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    throw error;
  }
};

/**
 * Get user's existing review for a driver
 */
export const getUserReviewForDriver = async (userId, driverId) => {
  try {
    console.log('🔍 Checking user review for driver:', { userId, driverId });
    
    const userReviewQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(userReviewQuery);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const reviewData = { id: doc.id, ...doc.data() };
      console.log('✅ Found existing user review');
      return reviewData;
    }
    
    console.log('ℹ️ No existing review found for user');
    return null;
  } catch (error) {
    console.error('❌ Error getting user review:', error);
    throw error;
  }
};

/**
 * Update an existing review
 */
export const updateReview = async (reviewId, reviewData) => {
  try {
    console.log('✏️ Updating review:', reviewId);
    
    await updateDoc(doc(db, 'reviews', reviewId), {
      ...reviewData,
      updatedAt: serverTimestamp()
    });
    
    // Update provider rating
    await updateProviderRating(reviewData.driverId);
    
    console.log('✅ Review updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating review:', error);
    throw error;
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