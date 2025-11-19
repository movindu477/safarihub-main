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
  arrayUnion,
  arrayRemove,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
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

// ==================== USER MANAGEMENT FUNCTIONS ====================

/**
 * Set user online status
 */
export const setUserOnline = async (userId, userType = 'tourist', userData = {}) => {
  try {
    console.log(`🟢 Setting user ${userId} online as ${userType}`);
    
    const onlineData = {
      userId: userId,
      userType: userType,
      isOnline: true,
      online: true,
      lastSeen: serverTimestamp(),
      lastSeenTimestamp: Date.now(),
      status: 'online',
      ...userData
    };
    
    // Update both onlineStatus collection and user's main document
    await Promise.all([
      setDoc(doc(db, 'onlineStatus', userId), onlineData, { merge: true }),
      setDoc(doc(db, userType === 'tourist' ? 'tourists' : 'serviceProviders', userId), {
        online: true,
        isOnline: true,
        lastSeen: serverTimestamp(),
        lastSeenTimestamp: Date.now(),
        status: 'online'
      }, { merge: true })
    ]);
    
    console.log(`✅ User ${userId} successfully set online`);
    return true;
  } catch (error) {
    console.error('❌ Error setting user online:', error);
    throw error;
  }
};

/**
 * Set user offline status
 */
export const setUserOffline = async (userId, userType = null) => {
  try {
    console.log(`🔴 Setting user ${userId} offline`);
    
    const offlineData = {
      isOnline: false,
      online: false,
      lastSeen: serverTimestamp(),
      lastSeenTimestamp: Date.now(),
      status: 'offline'
    };
    
    const updatePromises = [
      setDoc(doc(db, 'onlineStatus', userId), offlineData, { merge: true })
    ];
    
    // Update user's main document if userType is provided
    if (userType) {
      updatePromises.push(
        setDoc(doc(db, userType === 'tourist' ? 'tourists' : 'serviceProviders', userId), offlineData, { merge: true })
      );
    } else {
      // Update both collections to ensure we catch the user regardless of role
      updatePromises.push(
        setDoc(doc(db, 'tourists', userId), offlineData, { merge: true }).catch(() => null),
        setDoc(doc(db, 'serviceProviders', userId), offlineData, { merge: true }).catch(() => null)
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
 * Get user online status in real-time
 */
export const getUserOnlineStatus = (userId, callback) => {
  try {
    const userRef = doc(db, 'onlineStatus', userId);
    
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          callback({
            isOnline: data.isOnline || false,
            online: data.online || false,
            lastSeen: data.lastSeen,
            userType: data.userType,
            userName: data.userName
          });
        } else {
          callback({ isOnline: false, online: false, lastSeen: null });
        }
      },
      (error) => {
        console.error('Error in online status snapshot:', error);
        callback({ isOnline: false, online: false, lastSeen: null });
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error getting user online status:', error);
    callback({ isOnline: false, online: false, lastSeen: null });
    return () => {};
  }
};

/**
 * Get all service providers online status in real-time
 */
export const getServiceProvidersOnlineStatus = (callback) => {
  try {
    const providersRef = collection(db, 'serviceProviders');
    const providersQuery = query(
      providersRef,
      where('serviceType', '==', 'Jeep Driver')
    );

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const providers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Create a map of online statuses
        const onlineStatusMap = {};
        providers.forEach(provider => {
          onlineStatusMap[provider.id] = {
            isOnline: provider.online || provider.isOnline || false,
            lastSeen: provider.lastSeen,
            lastSeenTimestamp: provider.lastSeenTimestamp
          };
        });
        
        console.log(`👥 Real-time online status update: ${providers.filter(p => p.online || p.isOnline).length} drivers online`);
        callback(onlineStatusMap);
      },
      (error) => {
        console.error('Error in online status snapshot:', error);
        callback({});
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting online status:', error);
    callback({});
    return () => {};
  }
};

// ==================== CONVERSATION & MESSAGING FUNCTIONS ====================

/**
 * Create or get existing conversation between two users
 */
export const createOrGetConversation = async (user1Id, user2Id, user1Name, user2Name) => {
  try {
    const conversationId = [user1Id, user2Id].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      // Get user roles
      let user1Role = 'tourist';
      let user2Role = 'provider';
      
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', user1Id));
        user1Role = touristDoc.exists() ? 'tourist' : 'provider';
        
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user2Id));
        user2Role = providerDoc.exists() ? 'provider' : 'tourist';
      } catch (error) {
        console.log('Error getting user roles, using defaults');
      }

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
    } else {
      console.log(`✅ Existing conversation found: ${conversationId}`);
    }

    return conversationId;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get conversation by ID
 */
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

/**
 * Get other participant in conversation
 */
export const getOtherParticipant = (conversation, currentUserId) => {
  if (!conversation || !conversation.participantIds) return null;
  
  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId);
  return {
    id: otherParticipantId,
    name: conversation.participantNames?.[otherParticipantId] || 'User',
    role: conversation.participantRoles?.[otherParticipantId] || 'user'
  };
};

/**
 * Get user conversations in real-time
 */
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

    return unsubscribe;
  } catch (error) {
    console.error('Error getting conversations:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get messages for a conversation in real-time
 */
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

    return unsubscribe;
  } catch (error) {
    console.error('Error getting messages:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Send message to conversation
 */
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

    // Update conversation last message
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

/**
 * Mark messages as read in conversation
 */
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

/**
 * Mark message as delivered
 */
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

/**
 * Get user notifications in real-time
 */
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

    return unsubscribe;
  } catch (error) {
    console.error('Error getting notifications:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Create notification
 */
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

/**
 * Mark notification as read
 */
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
    throw error;
  }
};

/**
 * Mark all notifications as read for user
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const unreadNotificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(unreadNotificationsQuery);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
        readAtTimestamp: Date.now()
      })
    );

    await Promise.all(updatePromises);
    console.log(`✅ Marked ${snapshot.docs.length} notifications as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// ==================== REVIEW FUNCTIONS ====================

/**
 * Add review for a service provider
 */
export const addReview = async (reviewData) => {
  try {
    const reviewWithTimestamp = {
      ...reviewData,
      timestamp: serverTimestamp(),
      timestampValue: Date.now()
    };
    
    const docRef = await addDoc(collection(db, 'reviews'), reviewWithTimestamp);
    
    // Update service provider's average rating
    await updateServiceProviderRating(reviewData.jeepId);
    
    console.log('✅ Review added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding review:', error);
    throw error;
  }
};

/**
 * Get reviews for a service provider in real-time
 */
export const getReviews = (jeepId, callback) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('jeepId', '==', jeepId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const reviews = [];
        querySnapshot.forEach((doc) => {
          reviews.push({ id: doc.id, ...doc.data() });
        });
        callback(reviews);
      },
      (error) => {
        console.error('Error in reviews snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting reviews:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Update service provider's average rating
 */
const updateServiceProviderRating = async (providerId) => {
  try {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('jeepId', '==', providerId)
    );
    
    const snapshot = await getDocs(reviewsQuery);
    const reviews = snapshot.docs.map(doc => doc.data());
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const averageRating = totalRating / reviews.length;
      const totalRatings = reviews.length;
      
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        rating: parseFloat(averageRating.toFixed(1)),
        totalRatings: totalRatings
      });
      
      console.log(`✅ Updated rating for provider ${providerId}: ${averageRating.toFixed(1)} (${totalRatings} reviews)`);
    }
  } catch (error) {
    console.error('Error updating service provider rating:', error);
  }
};

// ==================== BOOKING FUNCTIONS ====================

/**
 * Add booking
 */
export const addBooking = async (bookingData) => {
  try {
    const bookingWithTimestamp = {
      ...bookingData,
      timestamp: serverTimestamp(),
      timestampValue: Date.now(),
      status: 'pending'
    };
    
    const docRef = await addDoc(collection(db, 'bookings'), bookingWithTimestamp);
    
    // Create notification for the service provider
    await createNotification({
      type: 'booking',
      title: 'New Booking Request',
      message: `You have a new booking request from ${bookingData.userName}`,
      recipientId: bookingData.driverId,
      senderId: bookingData.userId,
      senderName: bookingData.userName,
      relatedId: docRef.id
    });
    
    console.log('✅ Booking added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding booking:', error);
    throw error;
  }
};

/**
 * Get bookings for a service provider in real-time
 */
export const getBookings = (jeepId, callback) => {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('jeepId', '==', jeepId),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const bookings = [];
        querySnapshot.forEach((doc) => {
          bookings.push({ id: doc.id, ...doc.data() });
        });
        callback(bookings);
      },
      (error) => {
        console.error('Error in bookings snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting bookings:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get user bookings in real-time
 */
export const getUserBookings = (userId, callback) => {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const bookings = [];
        querySnapshot.forEach((doc) => {
          bookings.push({ id: doc.id, ...doc.data() });
        });
        callback(bookings);
      },
      (error) => {
        console.error('Error in user bookings snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting user bookings:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, status, driverId = null) => {
  try {
    const updateData = {
      status: status,
      updatedAt: serverTimestamp()
    };
    
    if (driverId) {
      updateData.driverId = driverId;
    }
    
    await updateDoc(doc(db, 'bookings', bookingId), updateData);
    
    // Get booking data to create notification
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (bookingDoc.exists()) {
      const bookingData = bookingDoc.data();
      
      await createNotification({
        type: 'booking_update',
        title: `Booking ${status}`,
        message: `Your booking has been ${status}`,
        recipientId: bookingData.userId,
        senderId: driverId || bookingData.driverId,
        senderName: 'System',
        relatedId: bookingId
      });
    }
    
    console.log(`✅ Booking ${bookingId} status updated to: ${status}`);
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

// ==================== SERVICE PROVIDER FUNCTIONS ====================

/**
 * Get all service providers in real-time
 */
export const getServiceProviders = (callback, filters = {}) => {
  try {
    let providersQuery = query(
      collection(db, 'serviceProviders'),
      where('serviceType', '==', 'Jeep Driver')
    );

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const providers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Apply filters if provided
        let filteredProviders = providers;
        
        if (filters.destination) {
          filteredProviders = filteredProviders.filter(provider => 
            provider.destinations?.some(dest => 
              dest.toLowerCase().includes(filters.destination.toLowerCase())
            )
          );
        }
        
        if (filters.minRating) {
          filteredProviders = filteredProviders.filter(provider => 
            (provider.rating || 0) >= filters.minRating
          );
        }
        
        if (filters.maxPrice) {
          filteredProviders = filteredProviders.filter(provider => 
            (provider.pricePerDay || 0) <= filters.maxPrice
          );
        }
        
        if (filters.vehicleType) {
          filteredProviders = filteredProviders.filter(provider => 
            provider.vehicleType?.toLowerCase() === filters.vehicleType.toLowerCase()
          );
        }
        
        callback(filteredProviders);
      },
      (error) => {
        console.error('Error in service providers snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting service providers:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get service provider by ID
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
    throw error;
  }
};

/**
 * Update service provider profile
 */
export const updateServiceProvider = async (providerId, updateData) => {
  try {
    await updateDoc(doc(db, 'serviceProviders', providerId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Service provider ${providerId} updated successfully`);
  } catch (error) {
    console.error('Error updating service provider:', error);
    throw error;
  }
};

// ==================== USER PROFILE FUNCTIONS ====================

/**
 * Get user profile data
 */
export const getUserProfile = async (userId) => {
  try {
    // Try tourists collection first
    let userDoc = await getDoc(doc(db, 'tourists', userId));
    
    // If not found in tourists, try serviceProviders
    if (!userDoc.exists()) {
      userDoc = await getDoc(doc(db, 'serviceProviders', userId));
    }
    
    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, userType, updateData) => {
  try {
    const collectionName = userType === 'tourist' ? 'tourists' : 'serviceProviders';
    
    await updateDoc(doc(db, collectionName, userId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ User profile ${userId} updated successfully`);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// ==================== FAVORITES FUNCTIONS ====================

/**
 * Add service provider to user favorites
 */
export const addToFavorites = async (userId, providerId) => {
  try {
    await updateDoc(doc(db, 'tourists', userId), {
      favorites: arrayUnion(providerId),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Provider ${providerId} added to favorites for user ${userId}`);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Remove service provider from user favorites
 */
export const removeFromFavorites = async (userId, providerId) => {
  try {
    await updateDoc(doc(db, 'tourists', userId), {
      favorites: arrayRemove(providerId),
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Provider ${providerId} removed from favorites for user ${userId}`);
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Get user favorites in real-time
 */
export const getUserFavorites = (userId, callback) => {
  try {
    const userRef = doc(db, 'tourists', userId);
    
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          callback(userData.favorites || []);
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error('Error in favorites snapshot:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error getting user favorites:', error);
    callback([]);
    return () => {};
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get user role (tourist or provider)
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
 * Format timestamp for display
 */
export const formatFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    return '';
  }
};

/**
 * Get time ago string from timestamp
 */
export const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Unknown time';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return 'Unknown time';
  }
};

// Export Firebase instances
export { db, auth, storage };
export default app;