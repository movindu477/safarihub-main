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
  enableIndexedDbPersistence,
  limit
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94"
};

// Initialize Firebase with error handling
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Enable offline persistence
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ Offline persistence enabled');
    })
    .catch((err) => {
      console.warn('⚠️ Offline persistence failed:', err);
    });
    
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Connection test function
export const testFirebaseConnection = async () => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    const testRef = collection(db, 'test');
    const q = query(testRef, limit(1));
    await getDocs(q);
    console.log('✅ Firebase connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// ✅ ENHANCED: Chat Functions with Notifications
export const sendMessage = async (messageData) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const messageWithTimestamp = {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageWithTimestamp);
    
    // ✅ Create notification for the driver
    await createNotification({
      userId: messageData.driverId,
      type: 'message',
      title: 'New Message',
      message: `New message from ${messageData.userName}`,
      relatedId: messageData.conversationId,
      senderId: messageData.userId,
      senderName: messageData.userName,
      timestamp: serverTimestamp(),
      read: false
    });
    
    console.log('✅ Message sent with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    
    // Enhanced error handling
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore rules.');
    } else if (error.code === 'unavailable') {
      throw new Error('Network unavailable. Please check your connection.');
    } else {
      throw error;
    }
  }
};

export const getMessages = (driverId, userId, callback) => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    callback([]);
    return () => {};
  }
  
  const conversationId = `conv_${driverId}_${userId}`;
  
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    q, 
    (querySnapshot) => {
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    },
    (error) => {
      console.error('❌ Error in getMessages:', error);
      callback([]);
    }
  );
};

// ✅ ENHANCED: Online Status Functions
export const setUserOnline = async (userId, userType, userData) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    await setDoc(doc(db, 'onlineStatus', userId), {
      isOnline: true,
      userType: userType,
      userName: userData.userName,
      email: userData.email,
      lastSeen: serverTimestamp(),
      ...userData
    });
    console.log('✅ User set online:', userId);
  } catch (error) {
    console.error('❌ Error setting user online:', error);
    throw error;
  }
};

export const setUserOffline = async (userId) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    await setDoc(doc(db, 'onlineStatus', userId), {
      isOnline: false,
      lastSeen: serverTimestamp()
    }, { merge: true });
    console.log('✅ User set offline:', userId);
  } catch (error) {
    console.error('❌ Error setting user offline:', error);
    throw error;
  }
};

export const getUserOnlineStatus = (userId, callback) => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    callback({ isOnline: false, lastSeen: null });
    return () => {};
  }

  const userRef = doc(db, 'onlineStatus', userId);
  
  return onSnapshot(
    userRef, 
    (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback({ isOnline: false, lastSeen: null });
      }
    },
    (error) => {
      console.error('❌ Error in getUserOnlineStatus:', error);
      callback({ isOnline: false, lastSeen: null });
    }
  );
};

// ✅ NEW: Notification Functions
export const createNotification = async (notificationData) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const notificationWithTimestamp = {
      ...notificationData,
      timestamp: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationWithTimestamp);
    console.log('✅ Notification created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = (userId, callback) => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    q, 
    (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      callback(notifications);
    },
    (error) => {
      console.error('❌ Error in getUserNotifications:', error);
      callback([]);
    }
  );
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
    console.log('✅ Notification marked as read:', notificationId);
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    console.log('✅ All notifications marked as read for user:', userId);
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    throw error;
  }
};

// Review Functions
export const addReview = async (reviewData) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const reviewWithTimestamp = {
      ...reviewData,
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'reviews'), reviewWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

export const getReviews = (jeepId, callback) => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'reviews'),
    where('jeepId', '==', jeepId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    q, 
    (querySnapshot) => {
      const reviews = [];
      querySnapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() });
      });
      callback(reviews);
    },
    (error) => {
      console.error('❌ Error in getReviews:', error);
      callback([]);
    }
  );
};

// Booking Functions
export const addBooking = async (bookingData) => {
  try {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const bookingWithTimestamp = {
      ...bookingData,
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'bookings'), bookingWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error adding booking:', error);
    throw error;
  }
};

export const getBookings = (jeepId, callback) => {
  if (!db) {
    console.error('❌ Firestore not initialized');
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'bookings'),
    where('jeepId', '==', jeepId),
    orderBy('date', 'asc')
  );

  return onSnapshot(
    q, 
    (querySnapshot) => {
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });
      callback(bookings);
    },
    (error) => {
      console.error('❌ Error in getBookings:', error);
      callback([]);
    }
  );
};

export { db, app };