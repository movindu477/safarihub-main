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
  arrayRemove
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ ENHANCED: Chat Functions with Notifications
export const sendMessage = async (messageData) => {
  try {
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
    throw error;
  }
};

export const getMessages = (driverId, userId, callback) => {
  const conversationId = `conv_${driverId}_${userId}`;
  
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    callback(messages);
  });
};

// ✅ ENHANCED: Online Status Functions
export const setUserOnline = async (userId, userType, userData) => {
  try {
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
  }
};

export const setUserOffline = async (userId) => {
  try {
    await setDoc(doc(db, 'onlineStatus', userId), {
      isOnline: false,
      lastSeen: serverTimestamp()
    }, { merge: true });
    console.log('✅ User set offline:', userId);
  } catch (error) {
    console.error('❌ Error setting user offline:', error);
  }
};

export const getUserOnlineStatus = (userId, callback) => {
  const userRef = doc(db, 'onlineStatus', userId);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback({ isOnline: false, lastSeen: null });
    }
  });
};

// ✅ NEW: Notification Functions
export const createNotification = async (notificationData) => {
  try {
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
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const notifications = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  });
};

export const markNotificationAsRead = async (notificationId) => {
  try {
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
  const q = query(
    collection(db, 'reviews'),
    where('jeepId', '==', jeepId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const reviews = [];
    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    callback(reviews);
  });
};

// Booking Functions
export const addBooking = async (bookingData) => {
  try {
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
  const q = query(
    collection(db, 'bookings'),
    where('jeepId', '==', jeepId),
    orderBy('date', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() });
    });
    callback(bookings);
  });
};

export { db };