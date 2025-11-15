import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Online Status Management
export const setUserOnline = async (userId, userType, userData) => {
  try {
    await setDoc(doc(db, 'onlineStatus', userId), {
      userId,
      userType,
      ...userData,
      isOnline: true,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error setting user online:', error);
  }
};

export const setUserOffline = async (userId) => {
  try {
    await updateDoc(doc(db, 'onlineStatus', userId), {
      isOnline: false,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error setting user offline:', error);
  }
};

export const getUserOnlineStatus = (userId, callback) => {
  return onSnapshot(doc(db, 'onlineStatus', userId), (doc) => {
    callback(doc.exists() ? doc.data() : null);
  });
};

// Messaging Functions
export const sendMessage = async (messageData) => {
  try {
    const message = {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'messages'), message);
    
    // Create notification for the recipient
    const recipientId = messageData.senderType === 'user' ? messageData.driverId : messageData.userId;
    const recipientType = messageData.senderType === 'user' ? 'provider' : 'tourist';
    
    await addDoc(collection(db, 'notifications'), {
      userId: recipientId,
      userType: recipientType,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${messageData.senderType === 'user' ? messageData.userName : messageData.driverName}`,
      data: {
        conversationId: messageData.conversationId,
        senderId: messageData.senderType === 'user' ? messageData.userId : messageData.driverId,
        senderName: messageData.senderType === 'user' ? messageData.userName : messageData.driverName
      },
      read: false,
      timestamp: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getMessages = (jeepId, userId, callback) => {
  const conversationId = `conv_${jeepId}_${userId}`;
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    callback(messages);
  });
};

export const markMessagesAsRead = async (conversationId, userId) => {
  try {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      where('read', '==', false),
      where('senderType', '!=', 'user')
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = [];
    
    snapshot.forEach((doc) => {
      updatePromises.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Notifications Functions
export const getNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  });
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Reviews Functions
export const addReview = async (reviewData) => {
  try {
    const review = {
      ...reviewData,
      timestamp: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'reviews'), review);
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
  
  return onSnapshot(q, (snapshot) => {
    const reviews = [];
    snapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });
    callback(reviews);
  });
};

// Bookings Functions
export const addBooking = async (bookingData) => {
  try {
    const booking = {
      ...bookingData,
      timestamp: serverTimestamp(),
      status: 'pending'
    };
    const docRef = await addDoc(collection(db, 'bookings'), booking);
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
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const bookings = [];
    snapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() });
    });
    callback(bookings);
  });
};

export default app;