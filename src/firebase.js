// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXjQQ9BYX4upBJx_Ko5jTUq9nTCIDItSA",
  authDomain: "safarihub-a80bd.firebaseapp.com",
  projectId: "safarihub-a80bd",
  storageBucket: "safarihub-a80bd.firebasestorage.app",
  messagingSenderId: "212343673085",
  appId: "1:212343673085:web:708338fc194fbea7f5ee94"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export services to use across your app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Firestore functions for messaging
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

export const sendMessage = async (messageData) => {
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...messageData,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
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
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

export const addReview = async (reviewData) => {
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      timestamp: serverTimestamp()
    });
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
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(reviews);
  });
};

export const addBooking = async (bookingData) => {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      timestamp: serverTimestamp()
    });
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
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(bookings);
  });
};