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
// Firebase Storage removed - using Supabase Storage instead

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
// Firebase Storage removed - using Supabase Storage instead

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
 * Add a new review for a driver/guide
 */
export const addReview = async (reviewData) => {
  try {
    console.log('📝 Adding new review for provider:', reviewData.providerId);
    
    const reviewRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAtValue: Date.now()
    });
    
    // Update provider's average rating and total reviews
    await updateProviderRating(reviewData.providerId);
    
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
export const updateProviderRating = async (providerId) => {
  try {
    console.log('🔄 Updating provider rating for:', providerId);
    
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId)
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = [];
    
    reviewsSnapshot.forEach(doc => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      const providerRef = doc(db, 'serviceProviders', providerId);
      await updateDoc(providerRef, {
        rating: averageRating,
        totalReviews: reviews.length,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Provider ${providerId} rating updated: ${averageRating.toFixed(1)}/5 from ${reviews.length} reviews`);
    } else {
      // No reviews, reset to default
      const providerRef = doc(db, 'serviceProviders', providerId);
      await updateDoc(providerRef, {
        rating: 0,
        totalReviews: 0,
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ Provider ${providerId} rating reset to default (no reviews)`);
    }
    
    return reviews;
  } catch (error) {
    console.error('❌ Error updating provider rating:', error);
    throw error;
  }
};

/**
 * Get real-time reviews for a provider (driver or guide)
 */
export const getReviews = (providerId, callback) => {
  try {
    console.log('📖 Setting up real-time reviews listener for provider:', providerId);
    
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
      orderBy('createdAtValue', 'desc')
    );
    
    const unsubscribe = onSnapshot(reviewsQuery, 
      (snapshot) => {
        const reviews = [];
        snapshot.forEach(doc => {
          reviews.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📚 Received ${reviews.length} reviews for provider ${providerId}`);
        callback(reviews);
      },
      (error) => {
        console.error('❌ Error in reviews snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`reviews_${providerId}`, unsubscribe);
  } catch (error) {
    console.error('❌ Error getting reviews:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (reviewId, providerId) => {
  try {
    console.log('🗑️ Deleting review:', reviewId);
    
    await deleteDoc(doc(db, 'reviews', reviewId));
    
    // Update provider rating after deletion
    await updateProviderRating(providerId);
    
    console.log('✅ Review deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting review:', error);
    throw error;
  }
};

/**
 * Get user's existing review for a provider
 */
export const getUserReviewForProvider = async (userId, providerId) => {
  try {
    console.log('🔍 Checking user review for provider:', { userId, providerId });
    
    const userReviewQuery = query(
      collection(db, 'reviews'),
      where('providerId', '==', providerId),
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
    await updateProviderRating(reviewData.providerId);
    
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
    
    const { serviceType = 'all', maxResults = 100 } = options;
    const providersRef = collection(db, 'serviceProviders');
    
    let providersQuery;
    if (serviceType === 'all') {
      providersQuery = query(providersRef, limit(maxResults));
    } else {
      providersQuery = query(
        providersRef,
        where('serviceType', '==', serviceType),
        limit(maxResults)
      );
    }

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
            userName: provider.fullName || provider.driverName || 'Service Provider',
            userRole: 'provider',
            serviceType: provider.serviceType,
            // Include guide-specific data if available
            specialQualifications: provider.specialQualifications || [],
            areasOfExpertise: provider.areasOfExpertise || [],
            hourlyRate: provider.hourlyRate || 0,
            dailyRate: provider.dailyRate || 0,
            currencyPreference: provider.currencyPreference || 'LKR'
          };
        });
        
        const onlineCount = Object.values(onlineStatusMap).filter(p => p.isOnline).length;
        console.log(`👥 Enhanced real-time status: ${onlineCount} ${serviceType === 'all' ? 'providers' : serviceType + 's'} online out of ${snapshot.docs.length}`);
        callback(onlineStatusMap);
      },
      (error) => {
        console.error('Error in enhanced online status snapshot:', error);
        callback({});
      }
    );

    return registerListener(`enhanced_providers_online_${serviceType}_${Date.now()}`, unsubscribe);
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
      timestampValue: Date.now(),
      createdAt: serverTimestamp(),
      createdAtValue: Date.now()
    });
    
    console.log(`✅ Notification created for user ${notificationData.recipientId}`, {
      notificationId: notificationDoc.id,
      type: notificationData.type,
      recipientId: notificationData.recipientId,
      bookingId: notificationData.bookingId || 'N/A'
    });
    return notificationDoc.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
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
 * Get all service providers with real-time updates (including Tour Guides)
 */
export const getServiceProviders = (callback, options = {}) => {
  try {
    const { serviceType = 'all', maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    
    let providersQuery;
    if (serviceType === 'all') {
      providersQuery = query(
        providersRef,
        limit(maxResults)
      );
    } else {
      providersQuery = query(
        providersRef,
        where('serviceType', '==', serviceType),
        limit(maxResults)
      );
    }

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const providers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            // Common fields
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            profilePicture: data.profilePicture,
            serviceType: data.serviceType,
            location: data.location,
            experienceYears: data.experienceYears || 0,
            rating: data.rating || 0,
            totalReviews: data.totalReviews || 0,
            availability: data.availability || false,
            online: data.online || false,
            description: data.description,
            languages: data.languages || [],
            // Jeep Driver specific fields
            vehicleType: data.vehicleType,
            pricePerDay: data.pricePerDay,
            destinations: data.destinations || [],
            specialSkills: data.specialSkills || [],
            certifications: data.certifications || [],
            // Tour Guide specific fields
            specialQualifications: data.specialQualifications || [],
            areasOfExpertise: data.areasOfExpertise || [],
            verificationDocuments: data.verificationDocuments || [],
            hourlyRate: data.hourlyRate || 0,
            dailyRate: data.dailyRate || 0,
            specialPackageRates: data.specialPackageRates || '',
            currencyPreference: data.currencyPreference || 'LKR',
            // Timestamps
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        });
        console.log(`🚙 Loaded ${providers.length} ${serviceType === 'all' ? 'service providers' : serviceType + 's'}`);
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
 * Get Tour Guides specifically with all guide details
 */
export const getTourGuides = (callback, options = {}) => {
  try {
    const { maxResults = 50, filters = {} } = options;
    const providersRef = collection(db, 'serviceProviders');
    
    let tourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            // Basic info
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            profilePicture: data.profilePicture,
            serviceType: data.serviceType,
            location: data.location,
            experienceYears: data.experienceYears || 0,
            rating: data.rating || 0,
            totalReviews: data.totalReviews || 0,
            availability: data.availability || false,
            online: data.online || false,
            description: data.description,
            // Guide specific details
            specialQualifications: data.specialQualifications || [],
            areasOfExpertise: data.areasOfExpertise || [],
            verificationDocuments: data.verificationDocuments || [],
            hourlyRate: data.hourlyRate || 0,
            dailyRate: data.dailyRate || 0,
            specialPackageRates: data.specialPackageRates || '',
            currencyPreference: data.currencyPreference || 'LKR',
            languages: data.languages || [],
            // Additional fields
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            featured: data.featured || false,
            // Timestamps
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        });
        console.log(`🗺️ Loaded ${tourGuides.length} tour guides with full details`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`tour_guides_full`, unsubscribe);
  } catch (error) {
    console.error('Error getting tour guides:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get Jeep Drivers specifically
 */
export const getJeepDrivers = (callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const jeepDriversQuery = query(
      providersRef,
      where('serviceType', '==', 'Jeep Driver'),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(jeepDriversQuery, 
      (snapshot) => {
        const jeepDrivers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🚙 Loaded ${jeepDrivers.length} jeep drivers`);
        callback(jeepDrivers);
      },
      (error) => {
        console.error('Error in jeep drivers snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`jeep_drivers`, unsubscribe);
  } catch (error) {
    console.error('Error getting jeep drivers:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get specific service provider by ID with complete details
 */
export const getServiceProvider = async (providerId) => {
  try {
    const providerDoc = await getDoc(doc(db, 'serviceProviders', providerId));
    if (providerDoc.exists()) {
      const data = providerDoc.data();
      return {
        id: providerDoc.id,
        // Common fields
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        profilePicture: data.profilePicture,
        serviceType: data.serviceType,
        location: data.location,
        experienceYears: data.experienceYears || 0,
        rating: data.rating || 0,
        totalReviews: data.totalReviews || 0,
        availability: data.availability || false,
        online: data.online || false,
        description: data.description,
        languages: data.languages || [],
        // Jeep Driver specific fields
        vehicleType: data.vehicleType,
        pricePerDay: data.pricePerDay,
        destinations: data.destinations || [],
        specialSkills: data.specialSkills || [],
        certifications: data.certifications || [],
        availableDates: data.availableDates || [],
        // Tour Guide specific fields
        specialQualifications: data.specialQualifications || [],
        areasOfExpertise: data.areasOfExpertise || [],
        verificationDocuments: data.verificationDocuments || [],
        hourlyRate: data.hourlyRate || 0,
        dailyRate: data.dailyRate || 0,
        specialPackageRates: data.specialPackageRates || '',
        currencyPreference: data.currencyPreference || 'LKR',
        // Contact info
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        featured: data.featured || false,
        // Timestamps
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting service provider:', error);
    return null;
  }
};

/**
 * Update service provider profile
 */
export const updateServiceProvider = async (providerId, updateData) => {
  try {
    console.log(`✏️ Updating service provider: ${providerId}`);
    
    await updateDoc(doc(db, 'serviceProviders', providerId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Service provider ${providerId} updated successfully`);
    return true;
  } catch (error) {
    console.error('Error updating service provider:', error);
    throw error;
  }
};

// ==================== TOUR GUIDE SPECIFIC FUNCTIONS ====================

/**
 * Get tour guides by specialization
 */
export const getTourGuidesBySpecialization = (specialization, callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const tourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      where('specialQualifications', 'array-contains', specialization),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🎯 Loaded ${tourGuides.length} tour guides specialized in ${specialization}`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in specialized tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`tour_guides_${specialization}`, unsubscribe);
  } catch (error) {
    console.error('Error getting specialized tour guides:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get tour guides by area of expertise
 */
export const getTourGuidesByExpertise = (expertise, callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const tourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      where('areasOfExpertise', 'array-contains', expertise),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🗺️ Loaded ${tourGuides.length} tour guides expert in ${expertise}`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in expertise-specific tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`tour_guides_expertise_${expertise}`, unsubscribe);
  } catch (error) {
    console.error('Error getting expertise-specific tour guides:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get tour guides by language
 */
export const getTourGuidesByLanguage = (language, callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const tourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      where('languages', 'array-contains', language),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🌐 Loaded ${tourGuides.length} tour guides speaking ${language}`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in language-specific tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`tour_guides_language_${language}`, unsubscribe);
  } catch (error) {
    console.error('Error getting language-specific tour guides:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get tour guides by price range
 */
export const getTourGuidesByPriceRange = (minPrice, maxPrice, priceType = 'hourly', callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    
    let priceField = 'hourlyRate';
    if (priceType === 'daily') {
      priceField = 'dailyRate';
    }
    
    const tourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      where(priceField, '>=', minPrice),
      where(priceField, '<=', maxPrice),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`💰 Loaded ${tourGuides.length} tour guides with ${priceType} rate between ${minPrice}-${maxPrice}`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in price-range tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`tour_guides_price_${minPrice}_${maxPrice}`, unsubscribe);
  } catch (error) {
    console.error('Error getting price-range tour guides:', error);
    callback([]);
    return () => {};
  }
};

/**
 * Get featured tour guides
 */
export const getFeaturedTourGuides = (callback, options = {}) => {
  try {
    const { maxResults = 20 } = options;
    const providersRef = collection(db, 'serviceProviders');
    const featuredTourGuidesQuery = query(
      providersRef,
      where('serviceType', '==', 'Tour Guide'),
      where('featured', '==', true),
      limit(maxResults)
    );

    const unsubscribe = onSnapshot(featuredTourGuidesQuery, 
      (snapshot) => {
        const tourGuides = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`⭐ Loaded ${tourGuides.length} featured tour guides`);
        callback(tourGuides);
      },
      (error) => {
        console.error('Error in featured tour guides snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`featured_tour_guides`, unsubscribe);
  } catch (error) {
    console.error('Error getting featured tour guides:', error);
    callback([]);
    return () => {};
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
      const data = providerDoc.data();
      return {
        id: userId,
        role: 'provider',
        serviceType: data.serviceType,
        // Include guide-specific data if available
        specialQualifications: data.specialQualifications || [],
        areasOfExpertise: data.areasOfExpertise || [],
        hourlyRate: data.hourlyRate || 0,
        dailyRate: data.dailyRate || 0,
        currencyPreference: data.currencyPreference || 'LKR',
        ...data
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

/**
 * Search service providers by name, location, or service type
 */
export const searchServiceProviders = (searchTerm, callback, options = {}) => {
  try {
    const { maxResults = 50 } = options;
    const providersRef = collection(db, 'serviceProviders');
    
    // Since Firestore doesn't support OR queries directly, we'll search in memory
    const providersQuery = query(providersRef, limit(maxResults));

    const unsubscribe = onSnapshot(providersQuery, 
      (snapshot) => {
        const allProviders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const filteredProviders = allProviders.filter(provider => {
          const searchLower = searchTerm.toLowerCase();
          return (
            provider.fullName?.toLowerCase().includes(searchLower) ||
            provider.location?.toLowerCase().includes(searchLower) ||
            provider.serviceType?.toLowerCase().includes(searchLower) ||
            provider.description?.toLowerCase().includes(searchLower) ||
            (provider.specialQualifications && provider.specialQualifications.some(qual => 
              qual.toLowerCase().includes(searchLower))) ||
            (provider.areasOfExpertise && provider.areasOfExpertise.some(area => 
              area.toLowerCase().includes(searchLower)))
          );
        });
        
        console.log(`🔍 Found ${filteredProviders.length} providers matching "${searchTerm}"`);
        callback(filteredProviders);
      },
      (error) => {
        console.error('Error in search snapshot:', error);
        callback([]);
      }
    );

    return registerListener(`search_${searchTerm}`, unsubscribe);
  } catch (error) {
    console.error('Error searching service providers:', error);
    callback([]);
    return () => {};
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
export { db, auth };
export default app;