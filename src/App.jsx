import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
} from "firebase/firestore";
// Supabase Storage imports (replacing Firebase Storage)
import { uploadProfileImage, uploadDocument } from "./lib/supabase";
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Globe, Camera, ChevronLeft, ChevronDown, Bell, X, Send, Check, CheckCheck, MessageCircle, ArrowUp, Calendar } from "lucide-react";

// Import images from src/assets
import logo from "./assets/logo.png";

// Import components
import Navbar from "./components/home/Navbar";
import Section1 from "./components/home/Section1";
import Section3 from "./components/home/Section3";
import Section4 from "./components/home/Section4";
import Section5 from "./components/home/Section5";
import Section6 from "./components/home/Section6";
import Footer from "./components/home/Footer";
import UpcomingTripBanner from "./components/UpcomingTripBanner";
import JeepDriversPage from "./components/jeepdrivers/JeepMain";
import JeepProfile from "./components/jeepdrivers/JeepProfile";
import NotificationPanel from "./components/NotificationPanel";

// Import Destination App
import DestinationApp from "./components/destination/App";
import DestinationDetails from "./components/destination/DestinationDetails";

// Import Guide App
import GuideApp from "./components/guides/App";
import GuideProfile from "./components/guides/GuideProfile";

// Import Renting App
import RentingMain from "./components/renting/RentingMain";
import RentingProfile from "./components/renting/RentingProfile";
import Payment from "./components/Payment";
import AboutUs from "./components/home/AboutUs";
import Admin from "./components/Admin";
import AdminPanel from "./components/AdminPanel";
import AdminCertificationPanel from "./components/AdminCertificationPanel";
import ProfileDashboard from "./components/ProfileDashboard";
import Favorites from "./components/Favorites";
import PaymentWallet from "./components/PaymentWallet";
import BookingHistory from "./components/BookingHistory";
import TouristBookings from "./components/TouristBookings";
import MyPackages from "./components/MyPackages";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import Chat components
import Chat from "./components/Chat";
import ChatList from "./components/ChatList";
import BookingSection from "./components/BookingSection";

// Import Availability Calendar
import AvailabilityCalendar from "./components/AvailabilityCalendar";

// Import Stripe
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from "./payment/StripeProvider";

// Import online status functions
import { setUserOnline, setUserOffline } from "./firebase";


// 🔥 Firebase Config
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
// Firebase Storage removed - using Supabase Storage instead

// Set persistence to local storage
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

// ==================== FIREBASE FUNCTIONS ====================

// User role detection
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

// Conversation Management
export const createOrGetConversation = async (user1Id, user2Id, user1Name, user2Name) => {
  try {
    const conversationId = [user1Id, user2Id].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      // Get user roles
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
    } else {
      console.log(`✅ Existing conversation found: ${conversationId}`);
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

    return unsubscribe;
  } catch (error) {
    console.error('Error getting conversations:', error);
    callback([]);
    return () => { };
  }
};

// Message Management
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
    return () => { };
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

// =========================
// Chatting Collection Functions (New - Efficient Storage)
// =========================
// Creates a unique chat ID by sorting user IDs
export const getChatId = (user1Id, user2Id) => {
  return [user1Id, user2Id].sort().join('_');
};

// Create or get chat in chatting collection
export const createOrGetChat = async (user1Id, user2Id, user1Name, user2Name) => {
  try {
    const chatId = getChatId(user1Id, user2Id);
    const chatRef = doc(db, 'chatting', chatId);

    // Try to get existing chat (this might fail if we don't have read permission, but that's okay)
    let chatDoc = null;
    try {
      chatDoc = await getDoc(chatRef);
    } catch (readError) {
      console.warn('Could not read chat document (might not exist):', readError);
      // Continue to create the chat
    }

    if (!chatDoc || !chatDoc.exists()) {
      // Get user roles (with error handling)
      let user1Role = 'tourist';
      let user2Role = 'provider';

      try {
        const role1 = await getUserRole(user1Id);
        if (role1) user1Role = role1;
      } catch (roleError) {
        console.warn('Could not get role for user1, using default:', roleError);
      }

      try {
        const role2 = await getUserRole(user2Id);
        if (role2) user2Role = role2;
      } catch (roleError) {
        console.warn('Could not get role for user2, using default:', roleError);
      }

      // Ensure participantIds is a proper array and sorted (must match chatId format)
      const participantIds = [user1Id, user2Id].sort();

      // Verify chatId matches the sorted participantIds
      const expectedChatId = participantIds.join('_');
      if (expectedChatId !== chatId) {
        console.error(`❌ ChatId mismatch! Expected: ${expectedChatId}, Got: ${chatId}`);
        throw new Error('ChatId does not match participantIds');
      }

      const chatData = {
        chatId: chatId,
        participantIds: participantIds,
        participantNames: {
          [user1Id]: user1Name || 'User',
          [user2Id]: user2Name || 'User'
        },
        participantRoles: {
          [user1Id]: user1Role,
          [user2Id]: user2Role
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: Date.now(),
        lastMessageSender: null,
        unreadCount: {
          [user1Id]: 0,
          [user2Id]: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('📝 Attempting to create chat with data:', {
        chatId,
        participantIds,
        user1Id,
        user2Id,
        user1Role,
        user2Role
      });

      await setDoc(chatRef, chatData);

      console.log(`✅ New chat created: ${chatId}`);
    } else {
      console.log(`✅ Existing chat found: ${chatId}`);
    }

    return chatId;
  } catch (error) {
    console.error('❌ Error creating chat:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get user chats from chatting collection
export const getUserChats = (userId, callback) => {
  try {
    const chatsRef = collection(db, 'chatting');

    // Query without orderBy to avoid index requirements, sort client-side
    const userChatsQuery = query(
      chatsRef,
      where('participantIds', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(userChatsQuery,
      (snapshot) => {
        const chats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by last message timestamp (most recent first)
        chats.sort((a, b) => {
          const getTimestamp = (chat) => {
            if (chat.lastMessageTimestamp) return chat.lastMessageTimestamp;
            if (chat.lastMessageTime?.toMillis) return chat.lastMessageTime.toMillis();
            if (chat.lastMessageTime?.seconds) return chat.lastMessageTime.seconds * 1000;
            if (chat.updatedAt?.toMillis) return chat.updatedAt.toMillis();
            if (chat.updatedAt?.seconds) return chat.updatedAt.seconds * 1000;
            return 0;
          };
          return getTimestamp(b) - getTimestamp(a);
        });

        console.log(`📨 Loaded ${chats.length} chats for user ${userId}`);
        callback(chats);
      },
      (error) => {
        console.error('Error in chats snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting chats:', error);
    callback([]);
    return () => { };
  }
};

// Get messages from chatting collection
export const getChatMessages = (chatId, callback) => {
  try {
    const messagesRef = collection(db, 'chatting', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestampValue', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`📬 Received ${messages.length} messages for chat ${chatId}`);
        callback(messages);
      },
      (error) => {
        console.error('Error in chat messages snapshot:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error getting chat messages:', error);
    callback([]);
    return () => { };
  }
};

// Send message to chatting collection
export const sendChatMessage = async (chatId, messageData) => {
  if (!chatId) {
    throw new Error('Chat ID is required');
  }

  if (!messageData || !messageData.content || !messageData.senderId || !messageData.receiverId) {
    throw new Error('Invalid message data: content, senderId, and receiverId are required');
  }

  try {
    console.log(`📤 Attempting to send message to chat: ${chatId}`);

    // Ensure chat document exists first
    const chatRef = doc(db, 'chatting', chatId);
    const chatDoc = await getDoc(chatRef);

    let receiverName = 'User';
    let senderName = messageData.senderName || 'User';

    if (!chatDoc.exists()) {
      console.warn(`⚠️ Chat ${chatId} doesn't exist, creating it...`);
      // Create chat document if it doesn't exist
      let user1Role = 'tourist';
      let user2Role = 'provider';

      try {
        const role1 = await getUserRole(messageData.senderId);
        if (role1) user1Role = role1;
      } catch (roleError) {
        console.warn('Could not get role for sender, using default:', roleError);
      }

      try {
        const role2 = await getUserRole(messageData.receiverId);
        if (role2) user2Role = role2;
      } catch (roleError) {
        console.warn('Could not get role for receiver, using default:', roleError);
      }

      // Try to get receiver name
      try {
        const receiverTouristDoc = await getDoc(doc(db, 'tourists', messageData.receiverId));
        if (receiverTouristDoc.exists()) {
          receiverName = receiverTouristDoc.data().fullName || 'User';
        } else {
          const receiverProviderDoc = await getDoc(doc(db, 'serviceProviders', messageData.receiverId));
          if (receiverProviderDoc.exists()) {
            receiverName = receiverProviderDoc.data().fullName || 'User';
          }
        }
      } catch (nameError) {
        console.warn('Could not fetch receiver name:', nameError);
      }

      // Ensure participantIds is sorted (important for chatId consistency)
      const participantIds = [messageData.senderId, messageData.receiverId].sort();

      await setDoc(chatRef, {
        chatId: chatId,
        participantIds: participantIds,
        participantNames: {
          [messageData.senderId]: senderName,
          [messageData.receiverId]: receiverName
        },
        participantRoles: {
          [messageData.senderId]: user1Role,
          [messageData.receiverId]: user2Role
        },
        lastMessage: '',
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: Date.now(),
        lastMessageSender: null,
        unreadCount: {
          [messageData.senderId]: 0,
          [messageData.receiverId]: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Created chat document: ${chatId}`);
    } else {
      // Get receiver name from existing chat
      const chatData = chatDoc.data();
      receiverName = chatData.participantNames?.[messageData.receiverId] || 'User';
    }

    // Now send the message
    const messagesRef = collection(db, 'chatting', chatId, 'messages');

    const messageDoc = await addDoc(messagesRef, {
      content: messageData.content,
      senderId: messageData.senderId,
      senderName: senderName,
      receiverId: messageData.receiverId,
      timestamp: serverTimestamp(),
      timestampValue: Date.now(),
      read: false,
      delivered: false
    });

    console.log(`✅ Message document created: ${messageDoc.id}`);

    // Update chat last message and unread count
    const updatedChatDoc = await getDoc(chatRef);
    if (updatedChatDoc.exists()) {
      const chatData = updatedChatDoc.data();
      const receiverId = messageData.receiverId;

      // Get current unreadCount object or create new one
      const currentUnreadCount = chatData.unreadCount || {};
      const receiverUnreadCount = currentUnreadCount[receiverId] || 0;

      // Build update data with proper nested structure
      const updateData = {
        lastMessage: messageData.content,
        lastMessageTime: serverTimestamp(),
        lastMessageTimestamp: Date.now(),
        lastMessageSender: messageData.senderId,
        updatedAt: serverTimestamp(),
        unreadCount: {
          ...currentUnreadCount,
          [receiverId]: receiverUnreadCount + 1
        }
      };

      await updateDoc(chatRef, updateData);
      console.log(`✅ Updated chat document: ${chatId}`);
    }

    // ALWAYS create notification for the recipient (works for both online and offline users)
    try {
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${senderName}: "${messageData.content.substring(0, 50)}${messageData.content.length > 50 ? '...' : ''}"`,
        recipientId: messageData.receiverId,
        senderId: messageData.senderId,
        senderName: senderName,
        relatedId: chatId,
        conversationId: chatId,
        chatId: chatId,
        messageId: messageDoc.id
      });
      console.log(`✅ Notification created for ${receiverName} (${messageData.receiverId})`);
    } catch (notifError) {
      // Log but don't fail the message send if notification fails
      console.error('⚠️ Failed to create notification (message still sent):', notifError);
    }

    console.log(`✅ Message sent successfully to chat ${chatId}`);
    return messageDoc.id;
  } catch (error) {
    console.error('❌ Error sending chat message:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Mark chat messages as read
export const markChatMessagesAsRead = async (chatId, userId) => {
  try {
    const messagesRef = collection(db, 'chatting', chatId, 'messages');
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

    // Reset unread count for this user
    const chatRef = doc(db, 'chatting', chatId);
    const chatDoc = await getDoc(chatRef);
    if (chatDoc.exists()) {
      const chatData = chatDoc.data();
      const currentUnreadCount = chatData.unreadCount || {};
      await updateDoc(chatRef, {
        unreadCount: {
          ...currentUnreadCount,
          [userId]: 0
        },
        updatedAt: serverTimestamp()
      });
    }

    console.log(`✅ Marked ${snapshot.docs.length} messages as read in chat ${chatId}`);
  } catch (error) {
    console.error('Error marking chat messages as read:', error);
  }
};

// Notification Management
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
    return () => { };
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

// Booking Management - Works for both drivers and guides
export const updateBookingStatus = async (bookingId, status, providerId, customerId, providerName, customerName) => {
  try {
    // Get booking to check if it's a driver or guide booking
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    const isGuideBooking = !!bookingData.guideId;
    const serviceType = isGuideBooking ? 'guide' : 'driver';
    const serviceProviderName = isGuideBooking ? 'guide' : 'driver';

    // Update booking status
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: status,
      updatedAt: serverTimestamp(),
      statusUpdatedAt: serverTimestamp(),
      ...(status === 'completed' && { completedAt: serverTimestamp() })
    });

    // Update provider availability if booking is accepted
    if (status === 'accepted') {
      try {
        const providerRef = doc(db, 'serviceProviders', providerId);
        const providerDoc = await getDoc(providerRef);
        const currentAvailability = providerDoc.exists() ? (providerDoc.data().availability || {}) : {};
        const updates = {};

        // Extract dates with types from booking data
        if (bookingData.datesWithTypes && Array.isArray(bookingData.datesWithTypes)) {
          bookingData.datesWithTypes.forEach(d => {
            const date = d.date ? (d.date.toDate ? d.date.toDate() : new Date(d.date)) : null;
            if (date) {
              // Format as YYYY-MM-DD
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateKey = `${year}-${month}-${day}`;

              const bookingType = d.type || 'full-day';
              const safariTypeLabel = d.safariType || ''; // 'Morning Safari' or 'Evening Safari'
              const currentStatus = currentAvailability[dateKey];

              if (bookingType === 'full-day' || bookingType === 'full') {
                updates[`availability.${dateKey}`] = 'busy';
              } else if (bookingType === 'half-day' || bookingType === 'half') {
                const isMorning = safariTypeLabel.toLowerCase().includes('morning');
                const isEvening = safariTypeLabel.toLowerCase().includes('evening');

                if (isMorning) {
                  // If evening was already booked, the day is now fully busy
                  if (currentStatus === 'halfday-evening') {
                    updates[`availability.${dateKey}`] = 'busy';
                  } else {
                    updates[`availability.${dateKey}`] = 'halfday-morning';
                  }
                } else if (isEvening) {
                  // If morning was already booked, the day is now fully busy
                  if (currentStatus === 'halfday-morning') {
                    updates[`availability.${dateKey}`] = 'busy';
                  } else {
                    updates[`availability.${dateKey}`] = 'halfday-evening';
                  }
                } else {
                  // Fallback: if safari type not specified, just mark as busy to be safe
                  updates[`availability.${dateKey}`] = 'busy';
                }
              }
            }
          });
        } else if (bookingData.selectedDates && Array.isArray(bookingData.selectedDates)) {
          // Fallback legacy support
          bookingData.selectedDates.forEach(d => {
            const date = d ? (d.toDate ? d.toDate() : new Date(d)) : null;
            if (date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateKey = `${year}-${month}-${day}`;
              updates[`availability.${dateKey}`] = 'busy';
            }
          });
        }

        if (Object.keys(updates).length > 0) {
          console.log(`📅 Updating availability for provider ${providerId}:`, updates);
          await updateDoc(providerRef, updates);
        }
      } catch (err) {
        console.error("Error updating provider availability:", err);
      }
    }

    // Create notification for customer based on status
    let statusMessage = '';
    let notificationTitle = '';

    if (status === 'accepted') {
      statusMessage = `Your booking with ${providerName} has been accepted!`;
      notificationTitle = 'Booking Accepted';
    } else if (status === 'declined') {
      statusMessage = `Your booking with ${providerName} has been declined.`;
      notificationTitle = 'Booking Declined';
    } else if (status === 'completed') {
      statusMessage = `Your trip with ${providerName} is completed! Please take a moment to review your experience.`;
      notificationTitle = 'Trip Completed - Review Your Experience';
    }

    if (statusMessage) {
      await createNotification({
        type: status === 'completed' ? 'review' : 'booking',
        title: notificationTitle,
        message: statusMessage,
        recipientId: customerId,
        senderId: providerId,
        senderName: providerName,
        relatedId: bookingId,
        bookingId: bookingId
      });
    }

    console.log(`✅ Booking ${bookingId} status updated to ${status} (${serviceType})`);
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

export const getBookingById = async (bookingId) => {
  try {
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (bookingDoc.exists()) {
      return {
        id: bookingDoc.id,
        ...bookingDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting booking:', error);
    return null;
  }
};

// Send reminder notifications 3 days before booking
export const sendBookingReminders = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const threeDaysStart = new Date(threeDaysFromNow.setHours(0, 0, 0, 0));
    const threeDaysEnd = new Date(threeDaysFromNow.setHours(23, 59, 59, 999));

    // Query accepted bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('status', '==', 'accepted')
    );

    const snapshot = await getDocs(bookingsQuery);

    for (const docSnapshot of snapshot.docs) {
      const booking = docSnapshot.data();
      const bookingId = docSnapshot.id;

      // Check if reminder already sent
      if (booking.reminderSent) continue;

      // Get earliest booking date
      let earliestDate = null;
      if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
        const dates = booking.datesWithTypes.map(d => new Date(d.date));
        earliestDate = new Date(Math.min(...dates));
      } else if (booking.selectedDates) {
        const dates = Array.isArray(booking.selectedDates)
          ? booking.selectedDates.map(d => new Date(d))
          : [new Date(booking.selectedDates)];
        earliestDate = new Date(Math.min(...dates));
      }

      // If earliest date is exactly 3 days from now, send reminders
      if (earliestDate && earliestDate >= threeDaysStart && earliestDate <= threeDaysEnd) {
        const isGuideBooking = !!booking.guideId;
        const providerId = isGuideBooking ? booking.guideId : booking.driverId;
        const providerName = isGuideBooking ? booking.guideName : booking.driverName;
        const customerId = booking.customerId;
        const customerName = booking.customerName;

        const dateStr = earliestDate.toLocaleDateString();

        // Send notification to customer
        await createNotification({
          type: 'reminder',
          title: 'Upcoming Trip Reminder',
          message: `Your trip with ${providerName} is coming up in 3 days (${dateStr}). Get ready for an amazing experience!`,
          recipientId: customerId,
          senderId: providerId,
          senderName: providerName,
          relatedId: bookingId,
          bookingId: bookingId
        });

        // Send notification to provider
        await createNotification({
          type: 'reminder',
          title: 'Upcoming Trip Reminder',
          message: `You have an upcoming trip with ${customerName} in 3 days (${dateStr}). Please prepare accordingly.`,
          recipientId: providerId,
          senderId: customerId,
          senderName: customerName,
          relatedId: bookingId,
          bookingId: bookingId
        });

        // Mark reminder as sent
        await updateDoc(doc(db, 'bookings', bookingId), {
          reminderSent: true,
          reminderSentAt: serverTimestamp()
        });

        console.log(`✅ Reminders sent for booking ${bookingId}`);
      }
    }
  } catch (error) {
    console.error('Error sending booking reminders:', error);
  }
};


// Chat Modal Component
const ChatModal = ({
  isOpen,
  onClose,
  conversationId,
  otherUser,
  currentUser
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    console.log(`📨 Loading messages for conversation: ${conversationId}`);

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      console.log(`📬 Received ${messagesData.length} messages`);
      setMessages(messagesData);

      // Mark messages as read and delivered
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);

        // Mark own messages as delivered
        messagesData.forEach(msg => {
          if (msg.senderId === currentUser.uid && !msg.delivered) {
            markMessageAsDelivered(conversationId, msg.id);
          }
        });
      }
    });

    return () => {
      console.log(`🔴 Unsubscribing from messages for conversation: ${conversationId}`);
      unsubscribe();
    };
  }, [conversationId, isOpen, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending || !currentUser || !otherUser) return;

    try {
      setSending(true);

      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: otherUser.id,
        timestamp: new Date()
      };

      console.log(`📤 Sending message to ${otherUser.name}: ${message.trim()}`);

      // Send the message
      await sendMessage(conversationId, messageData);

      // Create notification for the recipient
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a user'}: "${message.trim()}"`,
        recipientId: otherUser.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        conversationId: conversationId,
        relatedId: conversationId
      });

      console.log(`✅ Notification sent to ${otherUser.name}`);
      setMessage('');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm">
                {otherUser?.role === 'tourist' ? 'Tourist' : 'Service Provider'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with {otherUser?.name || 'this user'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.senderId === currentUser?.uid
                      ? 'bg-yellow-500 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${msg.senderId === currentUser?.uid ? 'text-yellow-100' : 'text-gray-500'
                      }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.senderId === currentUser?.uid && (
                        <span className="flex items-center space-x-1">
                          {msg.read ? (
                            <CheckCheck size={12} className="text-blue-300" title="Read" />
                          ) : msg.delivered ? (
                            <CheckCheck size={12} className="text-gray-300" title="Delivered" />
                          ) : (
                            <Check size={12} className="text-gray-300" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Global Scroll to Top Button Component (Available on all pages)
export const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div
      className={`fixed bottom-6 left-6 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}
    >
      <button
        onClick={scrollToTop}
        className="bg-green-400 p-2 sm:p-3 md:p-4 rounded-full shadow-lg border-2 border-green-300 hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-green-500 cursor-pointer"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
      </button>
    </div>
  );
};

// Global Notification Bell Component (Available on all pages) with Countdown
export const GlobalNotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  // Fetch upcoming trip for countdown badge
  useEffect(() => {
    if (!user || !user.uid) return;

    // Determine if user is a service provider or customer
    const isServiceProvider = user.serviceType === 'Jeep Driver' || user.serviceType === 'Tour Guide' || user.serviceType === 'Renting';

    let bookingQuery;
    if (isServiceProvider) {
      // For service providers: query by driverId or guideId
      const isGuide = user.serviceType === 'Tour Guide';
      const providerField = isGuide ? 'guideId' : 'driverId';
      bookingQuery = query(
        collection(db, 'bookings'),
        where(providerField, '==', user.uid),
        where('status', '==', 'accepted')
      );
    } else {
      // For customers: query by customerId
      bookingQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', '==', 'accepted')
      );
    }

    const unsubscribe = onSnapshot(bookingQuery, (snapshot) => {
      console.log('🔍 Countdown: Checking for upcoming trips...', {
        totalBookings: snapshot.docs.length,
        userId: user.uid
      });

      const now = new Date();
      let nearestTrip = null;
      let nearestDate = null;

      snapshot.docs.forEach(doc => {
        const booking = { id: doc.id, ...doc.data() };
        console.log('📅 Countdown: Found booking:', {
          id: doc.id,
          status: booking.status,
          datesWithTypes: booking.datesWithTypes,
          selectedDates: booking.selectedDates
        });

        // Get earliest booking date
        let earliestDate = null;
        if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
          const dates = booking.datesWithTypes.map(d => new Date(d.date));
          earliestDate = new Date(Math.min(...dates));
        } else if (booking.selectedDates) {
          const dates = Array.isArray(booking.selectedDates)
            ? booking.selectedDates.map(d => new Date(d))
            : [new Date(booking.selectedDates)];
          earliestDate = new Date(Math.min(...dates));
        }

        console.log('📆 Countdown: Parsed date:', {
          earliestDate,
          isInFuture: earliestDate ? earliestDate > now : false
        });

        // Only consider future trips
        if (earliestDate && earliestDate > now) {
          if (!nearestDate || earliestDate < nearestDate) {
            nearestDate = earliestDate;
            nearestTrip = { ...booking, tripDate: earliestDate };
          }
        }
      });

      console.log('✅ Countdown: Nearest trip found:', nearestTrip ? {
        tripDate: nearestTrip.tripDate,
        destination: nearestTrip.destination
      } : 'No upcoming trips');

      setUpcomingTrip(nearestTrip);
    });

    return () => unsubscribe();
  }, [user]);

  // Update countdown every minute
  useEffect(() => {
    if (!upcomingTrip || !upcomingTrip.tripDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const difference = upcomingTrip.tripDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        setCountdown({ days, hours, minutes });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [upcomingTrip]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleNotificationItemClick = async (notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await onMarkAsRead(notification.id);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 notification-container">
      <div className="flex items-center gap-3">
        {/* Digital Clock Countdown (appears to the left of bell when there's an upcoming trip) */}
        {upcomingTrip && (
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border-2 border-emerald-400/50 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Trip Countdown</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Days */}
              <div className="flex flex-col items-center">
                <div className="bg-black/60 rounded px-2 py-1 min-w-[32px] border border-emerald-500/30">
                  <span className="text-emerald-400 font-mono text-lg font-bold leading-none">
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 font-medium">DAYS</span>
              </div>

              {/* Separator */}
              <span className="text-emerald-400 text-lg font-bold mb-3">:</span>

              {/* Hours */}
              <div className="flex flex-col items-center">
                <div className="bg-black/60 rounded px-2 py-1 min-w-[32px] border border-emerald-500/30">
                  <span className="text-emerald-400 font-mono text-lg font-bold leading-none">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 font-medium">HRS</span>
              </div>

              {/* Separator */}
              <span className="text-emerald-400 text-lg font-bold mb-3">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <div className="bg-black/60 rounded px-2 py-1 min-w-[32px] border border-emerald-500/30">
                  <span className="text-emerald-400 font-mono text-lg font-bold leading-none">
                    {String(countdown.minutes).padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 font-medium">MIN</span>
              </div>
            </div>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          {showNotifications && (
            <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden">
              <NotificationPanel
                notifications={notifications}
                onClose={() => setShowNotifications(false)}
                onNotificationClick={handleNotificationItemClick}
                onMarkAsRead={onMarkAsRead}
                currentUser={user}
              />
            </div>
          )}

          <button
            onClick={handleBellClick}
            className="relative bg-green-400 p-2 sm:p-3 md:p-4 rounded-full shadow-lg border-2 border-green-300 hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-green-500 cursor-pointer"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse font-bold">
                {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Home Page Component
const HomePage = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState(null);
  const location = useLocation();

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Also handle popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle notification click - OPEN CHAT MODAL
  const handleNotificationClick = async (notification) => {
    console.log('🔘 Notification clicked:', notification);

    // Mark notification as read
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }

    if (notification.type === 'message' && (notification.conversationId || notification.chatId || notification.relatedId)) {
      try {
        // Get chat/conversation ID
        const chatId = notification.chatId || notification.conversationId || notification.relatedId;

        // Try chatting collection first (new system)
        try {
          const chatDoc = await getDoc(doc(db, 'chatting', chatId));
          if (chatDoc.exists() && user) {
            const chatData = chatDoc.data();
            const otherId = chatData.participantIds?.find(id => id !== user.uid);
            if (otherId) {
              // Get other user's name from chat data
              const otherName = chatData.participantNames?.[otherId] || notification.senderName || 'User';

              // Try to get photo from user collections
              let photo = '';
              try {
                const touristDoc = await getDoc(doc(db, 'tourists', otherId));
                if (touristDoc.exists()) {
                  photo = touristDoc.data().profilePicture || '';
                } else {
                  const providerDoc = await getDoc(doc(db, 'serviceProviders', otherId));
                  if (providerDoc.exists()) {
                    photo = providerDoc.data().profilePicture || '';
                  }
                }
              } catch (photoError) {
                console.warn('Error fetching photo:', photoError);
              }

              setChatOtherUser({
                id: otherId,
                name: otherName,
                photo: photo,
                role: chatData.participantRoles?.[otherId] || 'user'
              });
              setShowChatModal(true);
              console.log(`💬 Opening chat with ${otherName}`);
              return;
            }
          }
        } catch (chatError) {
          console.warn('Chat not found in chatting collection, trying conversations:', chatError);
        }

        // Fallback: Try conversations collection (legacy)
        try {
          const conversation = await getConversationById(chatId);
          if (conversation && user) {
            const otherUser = getOtherParticipant(conversation, user.uid);
            if (otherUser) {
              setChatOtherUser({
                id: otherUser.id,
                name: otherUser.name,
                photo: '',
                role: otherUser.role
              });
              setShowChatModal(true);
              console.log(`💬 Opening chat with ${otherUser.name}`);
              return;
            }
          }
        } catch (convError) {
          console.warn('Conversation not found:', convError);
        }

        // Last resort: Use senderId from notification
        if (notification.senderId && notification.senderId !== user.uid) {
          // Fetch sender info
          let senderData = null;
          try {
            const senderDoc = await getDoc(doc(db, 'tourists', notification.senderId));
            if (senderDoc.exists()) {
              senderData = senderDoc.data();
            } else {
              const providerDoc = await getDoc(doc(db, 'serviceProviders', notification.senderId));
              if (providerDoc.exists()) {
                senderData = providerDoc.data();
              }
            }
          } catch (senderError) {
            console.warn('Error fetching sender data:', senderError);
          }

          if (senderData || notification.senderName) {
            setChatOtherUser({
              id: notification.senderId,
              name: notification.senderName || senderData?.fullName || 'User',
              photo: senderData?.profilePicture || '',
              role: senderData?.serviceType === 'Tour Guide' ? 'guide' :
                senderData?.serviceType === 'Jeep Driver' ? 'driver' : 'user'
            });
            setShowChatModal(true);
            console.log(`💬 Opening chat with ${notification.senderName || 'User'}`);
          }
        }
      } catch (error) {
        console.error('Error opening chat from notification:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Chat Modal */}
      {showChatModal && chatOtherUser && user && (
        <Chat
          user={user}
          otherUserId={chatOtherUser.id}
          otherUserName={chatOtherUser.name}
          otherUserPhoto={chatOtherUser.photo}
          onClose={() => {
            setShowChatModal(false);
            setChatOtherUser(null);
          }}
        />
      )}

      {/* Scroll to Top Button - Always visible regardless of login status */}
      <ScrollToTopButton />

      {/* Booking Section - Integrated into page */}

      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => onShowAuth(screen || 'login')}
        onRegister={(screen) => onShowAuth(screen || 'register')}
        onOpenChatList={() => setShowChatList(true)}
      />

      {/* Chat List Modal */}
      {showChatList && user && (
        <ChatList
          user={user}
          onClose={() => setShowChatList(false)}
        />
      )}

      {/* Home Content with All Sections */}
      <div className="pt--1 space-y-1">


        <Section1>
          {/* Booking Panel - Only show for tourists, not for service providers */}
          {/* BookingSection component handles its own visibility based on user role */}
          {user && <BookingSection user={user} />}
        </Section1>
        <Section3 />
        <Section4 />
        <Section5 />
        <Section6 />
        <Footer />
      </div>

    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(() => {
    // Restore showAuth state from sessionStorage on page load
    const saved = sessionStorage.getItem('showAuth');
    return saved === 'true';
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');

  // Persist showAuth state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('showAuth', showAuth.toString());
  }, [showAuth]);

  // TEMPORARY TEST: Verify Stripe Public Key is loaded
  useEffect(() => {
    console.log("Stripe Public Key:", import.meta.env.VITE_STRIPE_PUBLIC_KEY);
  }, []);

  // Auth state listener
  const previousUserRef = useRef(null);
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log(`🔐 Auth state changed:`, user ? `User ${user.uid} logged in` : 'User logged out');

      // Check if this is a new login (user exists now but didn't before)
      const isNewLogin = user && !previousUserRef.current;

      setUser(user);
      setLoading(false);

      if (!user) {
        setNotifications([]);
        setShowWelcomeMessage(false);
        previousUserRef.current = null;
      } else {
        // If this is a new login, show welcome message
        if (isNewLogin) {
          try {
            // Try to get user's name from their profile
            let userName = user.displayName || '';

            // Try to get from tourists collection
            try {
              const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
              if (touristDoc.exists()) {
                userName = touristDoc.data().fullName || touristDoc.data().name || userName;
              }
            } catch (e) {
              // Try serviceProviders collection
              try {
                const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
                if (providerDoc.exists()) {
                  userName = providerDoc.data().fullName || providerDoc.data().name || userName;
                }
              } catch (e2) {
                console.log('Could not fetch user name from collections');
              }
            }

            setWelcomeUserName(userName || 'User');
            setShowWelcomeMessage(true);

            // Auto-hide after 5 seconds
            setTimeout(() => {
              setShowWelcomeMessage(false);
            }, 5000);
          } catch (error) {
            console.error('Error fetching user name for welcome message:', error);
            setWelcomeUserName('User');
            setShowWelcomeMessage(true);
            setTimeout(() => {
              setShowWelcomeMessage(false);
            }, 5000);
          }
        }
        // Set user online status for service providers
        try {
          // Check if user is a service provider by checking serviceProviders collection
          const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            await setUserOnline(user.uid, 'provider', {
              email: user.email || providerData.email || '',
              userName: user.displayName || providerData.fullName || 'Service Provider'
            });
          }
        } catch (error) {
          console.error('Error setting user online status:', error);
        }

        // Update previous user reference
        previousUserRef.current = user;
      }
    }, (error) => {
      // Handle auth errors
      console.error('❌ Auth state error:', error);
      setLoading(false);
    });

    return () => {
      console.log('🔴 Cleaning up auth listener');
      unsubscribeAuth();
    };
  }, []);

  // Load notifications when user is logged in
  useEffect(() => {
    if (user) {
      console.log(`🔔 Setting up notifications listener for user: ${user.uid}`);

      const processedNotifications = new Set(); // Track processed notifications to prevent multiple redirects

      const unsubscribe = getUserNotifications(user.uid, async (notifications) => {
        console.log(`📢 Received ${notifications.length} notifications`);
        setNotifications(notifications);

        // NOTE: Auto-redirect removed - users will now see Accept/Decline buttons in notifications
        // and can choose to go to payment page by clicking Accept
      });

      return () => {
        console.log(`🔴 Unsubscribing from notifications for user: ${user.uid}`);
        unsubscribe();
      };
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Send booking reminders 3 days before trip date
  useEffect(() => {
    // Run reminder check immediately on mount
    sendBookingReminders();

    // Then run every 6 hours
    const interval = setInterval(() => {
      console.log('🔔 Checking for booking reminders...');
      sendBookingReminders();
    }, 6 * 60 * 60 * 1000); // 6 hours

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout...');

      // Set user offline if they're a service provider
      const currentUserId = user?.uid;
      if (currentUserId) {
        try {
          // Check if user is a service provider by checking serviceProviders collection
          const providerDoc = await getDoc(doc(db, 'serviceProviders', currentUserId));
          if (providerDoc.exists()) {
            await setUserOffline(currentUserId, 'provider');
          }
        } catch (error) {
          console.error('Error setting user offline status:', error);
        }
      }

      // Force immediate UI update
      setUser(null);
      setNotifications([]);

      // Clear auth session storage
      sessionStorage.removeItem('showAuth');
      sessionStorage.removeItem('authInitialScreen');
      sessionStorage.removeItem('authRole');
      sessionStorage.removeItem('authScreen');
      sessionStorage.removeItem('authServiceType');

      await signOut(auth);

      // Force navigation
      setTimeout(() => {
        window.history.replaceState(null, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);

    } catch (error) {
      console.error('Logout error:', error);
      // Still reset state
      setUser(null);
      // Clear auth session storage on error too
      sessionStorage.removeItem('showAuth');
      sessionStorage.removeItem('authInitialScreen');
      sessionStorage.removeItem('authRole');
      sessionStorage.removeItem('authScreen');
      sessionStorage.removeItem('authServiceType');
      window.location.href = '/';
    }
  };

  const [returnToPath, setReturnToPath] = useState(() => {
    // Restore returnToPath from sessionStorage on page load
    const saved = sessionStorage.getItem('returnToPath');
    return saved || null;
  });
  const [authInitialScreen, setAuthInitialScreen] = useState(() => {
    // Restore authInitialScreen from sessionStorage on page load
    const saved = sessionStorage.getItem('authInitialScreen');
    return saved || 'login';
  });

  // Persist authInitialScreen to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('authInitialScreen', authInitialScreen);
  }, [authInitialScreen]);

  const handleAuthSuccess = async (returnPath) => {
    // Clear session storage after successful auth
    sessionStorage.removeItem('showAuth');
    sessionStorage.removeItem('authInitialScreen');
    sessionStorage.removeItem('authRole');
    sessionStorage.removeItem('authScreen');
    sessionStorage.removeItem('authServiceType');
    sessionStorage.removeItem('returnToPath');

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Step 1: Check if user is admin (ONLY by document existence)
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        if (adminDoc.exists()) {
          console.log('✅ Admin user logged in, redirecting to admin panel');
          setTimeout(() => {
            window.location.href = '/admin-panel';
          }, 500);
          setReturnToPath(null);
          return;
        }

        // Step 2: Check if user is a service provider
        const providerDoc = await getDoc(doc(db, 'serviceProviders', currentUser.uid));
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          if (providerData.serviceType === 'Jeep Driver' || providerData.serviceType === 'Tour Guide') {
            // Service provider logged in - redirect to home if on restricted pages
            const restrictedRoutes = ['/destination', '/guide', '/driver'];
            if (returnPath && restrictedRoutes.some(route => returnPath.startsWith(route))) {
              setTimeout(() => {
                window.location.href = '/';
              }, 500);
              setReturnToPath(null);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking user role in handleAuthSuccess:', error);
      }
    }

    if (returnPath && returnPath !== '/login' && returnPath !== '/register') {
      // Redirect to the previous page after successful login
      setTimeout(() => {
        window.location.href = returnPath;
      }, 500);
    }
    setReturnToPath(null);
  };

  const handleShowAuth = (initialScreen = 'login') => {
    // Save current location before showing auth
    const currentPath = window.location.pathname;
    setReturnToPath(currentPath);
    sessionStorage.setItem('returnToPath', currentPath); // Save to sessionStorage for persistence
    setAuthInitialScreen(initialScreen); // Store the initial screen

    // Navigate to the auth route instead of using modal
    const authRoute = initialScreen === 'register' ? '/register' : '/login';
    window.location.href = authRoute;
  };

  const handleNotificationClick = async (notification) => {
    console.log('🔘 Global notification clicked:', notification);

    // Mark notification as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    // Auto-redirect to payment page if booking is accepted
    if (notification.type === 'booking' && notification.bookingId) {
      try {
        const booking = await getBookingById(notification.bookingId);
        if (booking && booking.status === 'accepted' && notification.message && notification.message.toLowerCase().includes('accepted')) {
          // Check if user is the customer
          if (user && booking.customerId === user.uid) {
            console.log('🔄 Redirecting to payment page for accepted booking');
            // Use window.location for reliable navigation in production/Vercel
            const paymentUrl = `/payment/${notification.bookingId}`;
            window.location.href = paymentUrl;
            return;
          }
        }
      } catch (err) {
        console.error('Error checking booking status:', err);
      }
    }

    console.log('Notification click handled by global system:', notification);
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  // Scroll to top component - handles route changes and back/forward button
  const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
      // Scroll to top on route change
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    useEffect(() => {
      // Handle back/forward button navigation
      const handlePopState = () => {
        // Small delay to ensure page has rendered
        setTimeout(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }, 0);
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }, []);

    return null;
  };

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />

        {/* Scroll to Top Button - Always visible on all pages regardless of login status */}
        <ScrollToTopButton />

        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />

          {/* Authentication Routes - Dynamic routes MUST come before static ones */}
          <Route
            path="/login"
            element={
              <AuthenticationWrapper
                onAuthSuccess={handleAuthSuccess}
                returnToPath={returnToPath}
                initialScreen="login"
                onBackToHome={() => {
                  const backPath = returnToPath || '/';
                  sessionStorage.removeItem('returnToPath');
                  sessionStorage.removeItem('showAuth');
                  sessionStorage.removeItem('authInitialScreen');
                  sessionStorage.removeItem('authRole');
                  sessionStorage.removeItem('authScreen');
                  sessionStorage.removeItem('authServiceType');
                  window.location.href = backPath;
                }}
              />
            }
          />
          {/* Dynamic Service Type Registration Routes - MORE SPECIFIC, comes first */}
          <Route
            path="/register/:serviceType"
            element={
              <AuthenticationWrapper
                onAuthSuccess={handleAuthSuccess}
                returnToPath={returnToPath}
                initialScreen="register"
                onBackToHome={() => {
                  const backPath = returnToPath || '/';
                  sessionStorage.removeItem('returnToPath');
                  sessionStorage.removeItem('showAuth');
                  sessionStorage.removeItem('authInitialScreen');
                  sessionStorage.removeItem('authRole');
                  sessionStorage.removeItem('authScreen');
                  sessionStorage.removeItem('authServiceType');
                  window.location.href = backPath;
                }}
              />
            }
          />
          {/* Static register route - comes after dynamic */}
          <Route
            path="/register"
            element={
              <AuthenticationWrapper
                onAuthSuccess={handleAuthSuccess}
                returnToPath={returnToPath}
                initialScreen="register"
                onBackToHome={() => {
                  const backPath = returnToPath || '/';
                  sessionStorage.removeItem('returnToPath');
                  sessionStorage.removeItem('showAuth');
                  sessionStorage.removeItem('authInitialScreen');
                  sessionStorage.removeItem('authRole');
                  sessionStorage.removeItem('authScreen');
                  sessionStorage.removeItem('authServiceType');
                  window.location.href = backPath;
                }}
              />
            }
          />

          <Route
            path="/driver"
            element={
              <JeepDriversPage
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/jeep"
            element={
              <JeepDriversPage
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/jeep-profile/:jeepId"
            element={
              <JeepProfile
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          {/* Destination Routes - Specific routes first */}
          <Route
            path="/destination/:destinationId"
            element={
              <DestinationDetails
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/destination"
            element={
              <DestinationApp
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          {/* Guide Route */}
          <Route
            path="/guide"
            element={
              <GuideApp
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/guide-profile/:guideId"
            element={
              <GuideProfile
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          {/* Renting Routes */}
          <Route
            path="/rent"
            element={
              <RentingMain
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/renting"
            element={
              <RentingMain
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/renting-profile/:providerId"
            element={
              <RentingProfile
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          {/* Payment Route */}
          <Route
            path="/payment/:bookingId"
            element={
              <Payment
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
              />
            }
          />
          {/* About Us Route */}
          <Route
            path="/about"
            element={
              <AboutUs
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <Admin
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            }
          />
          <Route
            path="/admin-panel"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-certifications"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminCertificationPanel adminUser={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProfileDashboard
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
              />
            }
          />
          <Route
            path="/favorites"
            element={
              <Favorites
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
              />
            }
          />
          <Route
            path="/payment-wallet"
            element={
              <Elements stripe={stripePromise}>
                <PaymentWallet
                  user={user}
                  onLogout={handleLogout}
                  onShowAuth={handleShowAuth}
                />
              </Elements>
            }
          />
          <Route
            path="/booking-history"
            element={
              <BookingHistory
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
              />
            }
          />
          <Route
            path="/my-bookings"
            element={
              <TouristBookings
                user={user}
                onLogout={handleLogout}
                onShowAuth={handleShowAuth}
              />
            }
          />
          <Route
            path="/my-packages"
            element={
              <MyPackages
                user={user}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Notification Bell with Countdown - Visible on ALL pages */}
        <GlobalNotificationBell
          user={user}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAsRead={handleMarkAsRead}
        />

      </Router>
    </AuthProvider>
  );
}

// Phone number formatting utility - Format: +94 743090367
const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove + if present for processing
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle different input formats
  if (cleaned.startsWith('94')) {
    // Already has country code
    const number = cleaned.substring(2);
    // Remove leading 0 if present
    const finalNumber = number.startsWith('0') ? number.substring(1) : number;
    return `+94 ${finalNumber}`;
  }

  if (cleaned.startsWith('0')) {
    // Remove leading 0 and add country code
    const number = cleaned.substring(1);
    return `+94 ${number}`;
  }

  // Just the number (9 digits), add country code
  return `+94 ${cleaned}`;
};

// Phone number validation - Format: +94 743090367 (9 digits, no leading 0) (deprecated - use isValidPhone with country code)
const isValidSriLankanPhone = (phone) => {
  if (!phone) return false;
  const formatted = phone.replace(/\s/g, '');
  const sriLankanRegex = /^\+94[0-9]{9}$/;
  return sriLankanRegex.test(formatted);
};

// Country codes with phone number formats (shared across components)
const countryCodes = [
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', maxLength: 9, pattern: /^[7-9]\d{8}$/ },
  { code: '+1', country: 'United States', flag: '🇺🇸', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', maxLength: 10, pattern: /^\d{10,11}$/ },
  { code: '+91', country: 'India', flag: '🇮🇳', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+61', country: 'Australia', flag: '🇦🇺', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+86', country: 'China', flag: '🇨🇳', maxLength: 11, pattern: /^\d{11}$/ },
  { code: '+81', country: 'Japan', flag: '🇯🇵', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', maxLength: 8, pattern: /^\d{8}$/ },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', maxLength: 10, pattern: /^\d{9,10}$/ },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+971', country: 'UAE', flag: '🇦🇪', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', maxLength: 9, pattern: /^\d{9}$/ },
];

// Validate phone number based on country code
const isValidPhone = (phone, countryCode) => {
  if (!phone) return false;
  const country = countryCodes.find(c => c.code === countryCode);
  if (!country) return false;
  const digits = phone.replace(/\D/g, '');

  // Special validation for Sri Lanka (+94) - must be 9 digits, no leading 0
  if (countryCode === '+94') {
    // Must be exactly 9 digits, starting from 7 (or other valid digits, but not 0)
    return digits.length === 9 && !digits.startsWith('0');
  }

  // For other countries, use standard pattern validation
  return country.pattern.test(digits);
};

// Authentication Wrapper Component - Handles URL params
function AuthenticationWrapper({ onAuthSuccess, returnToPath, initialScreen = "login", onBackToHome }) {
  const { serviceType: urlServiceType } = useParams();
  const navigate = useNavigate();

  return (
    <Authentication
      onAuthSuccess={onAuthSuccess}
      returnToPath={returnToPath}
      initialScreen={initialScreen}
      onBackToHome={onBackToHome}
      urlServiceType={urlServiceType}
      navigate={navigate}
    />
  );
}

// Authentication Component
function Authentication({ onAuthSuccess, returnToPath, initialScreen = "login", onBackToHome, urlServiceType, navigate }) {
  // CRITICAL: When URL has serviceType, ALWAYS set role and screen immediately
  const initialRole = urlServiceType ? 'provider' : (sessionStorage.getItem('authRole') || null);
  const initialScreenValue = urlServiceType ? 'register' : (sessionStorage.getItem('authScreen') || initialScreen);

  const [screen, setScreen] = useState(initialScreenValue);
  const [role, setRole] = useState(initialRole);

  // Immediately sync to sessionStorage if URL has serviceType
  useEffect(() => {
    if (urlServiceType) {
      console.log('🔒 URL serviceType detected, forcing states');
      if (role !== 'provider') {
        setRole('provider');
        sessionStorage.setItem('authRole', 'provider');
      }
      if (screen !== 'register') {
        setScreen('register');
        sessionStorage.setItem('authScreen', 'register');
      }
    }
  }, [urlServiceType]); // Run whenever urlServiceType changes
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successUserName, setSuccessUserName] = useState('');

  // Persist screen and role to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('authScreen', screen);
  }, [screen]);

  useEffect(() => {
    if (role) {
      sessionStorage.setItem('authRole', role);
    } else {
      sessionStorage.removeItem('authRole');
    }
  }, [role]);

  // Common Fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [language, setLanguage] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Provider fields
  const [locationBase, setLocationBase] = useState("");
  const [experience, setExperience] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [serviceType, setServiceType] = useState(() => {
    // Priority: URL param > sessionStorage > empty
    if (urlServiceType) {
      // Convert URL slug back to proper service type name
      const serviceTypeMap = {
        'jeep-driver': 'Jeep Driver',
        'jeep': 'Jeep Driver',
        'tour-guide': 'Tour Guide',
        'guide': 'Tour Guide',
        'renting-store': 'Renting Store',
        'renting': 'Renting Store'
      };
      const mappedType = serviceTypeMap[urlServiceType.toLowerCase()];
      if (mappedType) {
        console.log('✅ Service type from URL:', mappedType);
        sessionStorage.setItem('authServiceType', mappedType);
        return mappedType;
      }
    }
    // Restore serviceType from sessionStorage on page load
    const saved = sessionStorage.getItem('authServiceType');
    if (saved) {
      console.log('✅ Service type restored from session:', saved);
    }
    return saved || "";
  });
  const [vehicleTypes, setVehicleTypes] = useState([]); // Changed to array for multiple selection

  // Persist serviceType to sessionStorage and update URL
  useEffect(() => {
    if (serviceType) {
      sessionStorage.setItem('authServiceType', serviceType);
      console.log('💾 Service type saved:', serviceType);

      // Update URL when service type changes
      if (navigate && screen === 'register' && role === 'provider') {
        const serviceTypeSlug = {
          'Jeep Driver': 'jeep-driver',
          'Tour Guide': 'tour-guide',
          'Renting Store': 'renting-store'
        }[serviceType];

        if (serviceTypeSlug) {
          const currentPath = window.location.pathname;
          const expectedPath = `/register/${serviceTypeSlug}`;
          if (currentPath !== expectedPath) {
            navigate(expectedPath, { replace: true });
          }
        }
      }
    } else {
      sessionStorage.removeItem('authServiceType');
    }
  }, [serviceType, navigate, screen, role]);

  // Debug and sync: Ensure everything is properly set when component mounts
  useEffect(() => {
    console.log('🔍 Authentication component mounted');
    console.log('   - urlServiceType:', urlServiceType);
    console.log('   - serviceType:', serviceType);
    console.log('   - screen:', screen);
    console.log('   - role:', role);
    console.log('   - Will show:', !role ? 'UserTypeSelection' : 'RegistrationForm');

    // If URL has serviceType but role/screen aren't set properly, fix it immediately
    if (urlServiceType && serviceType) {
      let needsUpdate = false;

      if (!role || role !== 'provider') {
        console.log('⚠️ Fixing role to provider due to URL serviceType');
        setRole('provider');
        sessionStorage.setItem('authRole', 'provider');
        needsUpdate = true;
      }

      if (screen !== 'register') {
        console.log('⚠️ Fixing screen to register due to URL serviceType');
        setScreen('register');
        sessionStorage.setItem('authScreen', 'register');
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log('✅ State synchronized with URL');
      }
    }
  }, []);
  const [pricePerDay, setPricePerDay] = useState("");
  // Separate prices for different vehicle types
  const [priceFullDayStandard, setPriceFullDayStandard] = useState("");
  const [priceHalfDayStandard, setPriceHalfDayStandard] = useState("");
  const [priceFullDayLuxury, setPriceFullDayLuxury] = useState("");
  const [priceHalfDayLuxury, setPriceHalfDayLuxury] = useState("");
  const [destinations, setDestinations] = useState("");
  const [languages, setLanguages] = useState([]);
  const [specialSkills, setSpecialSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [certificationFiles, setCertificationFiles] = useState({}); // Map of cert name to File
  const [certificationStatus, setCertificationStatus] = useState("non-certified"); // 'certified' or 'non-certified'
  const [description, setDescription] = useState("");
  const [availableDates, setAvailableDates] = useState({}); // Object: { "YYYY-MM-DD": "busy"|"halfday"|"unavailable" }

  // Tour Guide specific fields
  const [specialQualifications, setSpecialQualifications] = useState([]);
  const [areasOfExpertise, setAreasOfExpertise] = useState([]);
  const [verificationDocuments, setVerificationDocuments] = useState([]);
  const [verificationDocumentFiles, setVerificationDocumentFiles] = useState({}); // Map of doc name to File
  const [hourlyRate, setHourlyRate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [specialPackageRates, setSpecialPackageRates] = useState("");
  const [currencyPreference, setCurrencyPreference] = useState("LKR");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+94"); // Default to Sri Lanka

  // Get selected country info
  const getSelectedCountry = () => {
    return countryCodes.find(c => c.code === phoneCountryCode) || countryCodes[0];
  };

  // Handle phone number input - only digits, remove leading 0 for Sri Lanka
  const handlePhoneChange = (value) => {
    const selectedCountry = getSelectedCountry();
    // Only allow digits (no letters or special characters)
    let cleaned = value.replace(/\D/g, '');

    // For Sri Lanka (+94), remove leading 0 and limit to 9 digits
    if (phoneCountryCode === '+94') {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      // Limit to 9 digits (starting from 7 or other valid digits)
      if (cleaned.length > 9) {
        cleaned = cleaned.substring(0, 9);
      }
    } else {
      // For other countries, use standard max length
      if (cleaned.length > selectedCountry.maxLength) {
        cleaned = cleaned.substring(0, selectedCountry.maxLength);
      }
    }
    setPhone(cleaned);
  };

  // Reset form function
  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setConfirm("");
    setCountry("");
    setPhone("");
    setAddress("");
    setPhoneCountryCode("+94");
    setLanguage("");
    setProfileFile(null);
    setProfilePreview(null);
    setLocationBase("");
    setExperience("");
    setLanguagesSpoken("");
    setServiceType("");
    setVehicleTypes([]);
    setPricePerDay("");
    setPriceFullDayStandard("");
    setPriceHalfDayStandard("");
    setPriceFullDayLuxury("");
    setPriceHalfDayLuxury("");
    setDestinations("");
    setLanguages([]);
    setSpecialSkills([]);
    setCertifications([]);
    setCertificationFiles({});
    setCertificationStatus("non-certified");
    setDescription("");
    setAvailableDates({});
    setSpecialQualifications([]);
    setAreasOfExpertise([]);
    setVerificationDocuments([]);
    setVerificationDocumentFiles({});
    setHourlyRate("");
    setDailyRate("");
    setSpecialPackageRates("");
    setCurrencyPreference("LKR");
    setMsg("");
    setBusy(false);
  };

  // Handle profile image selection
  const handleProfileImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMsg("❌ Image size should be less than 2MB");
        return;
      }
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Handle certification file selection
  const handleCertificationFileSelect = (certName, e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMsg(`❌ File size should be less than 10MB for ${certName}`);
        return;
      }
      setCertificationFiles(prev => ({
        ...prev,
        [certName]: file
      }));
    }
  };

  // Handle verification document file selection
  const handleVerificationDocumentFileSelect = (docName, e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMsg(`❌ File size should be less than 10MB for ${docName}`);
        return;
      }
      setVerificationDocumentFiles(prev => ({
        ...prev,
        [docName]: file
      }));
    }
  };

  // Register Function
  const handleRegister = async (e) => {
    e.preventDefault();

    console.log("🔄 Starting registration process...");
    console.log("Role:", role);
    console.log("Form data:", {
      email, fullName, phone, address, serviceType, vehicleTypes, experience,
      priceFullDayStandard, priceHalfDayStandard, priceFullDayLuxury, priceHalfDayLuxury,
      destinations, languages, specialSkills, certifications, specialQualifications,
      areasOfExpertise, verificationDocuments, hourlyRate, dailyRate, specialPackageRates, currencyPreference
    });

    // Basic validation
    if (!email || !fullName || !password) {
      setMsg("❌ Please fill in all required fields");
      return;
    }

    if (password !== confirm) {
      setMsg("❌ Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      setMsg("❌ Password must be at least 6 characters!");
      return;
    }

    // Phone validation for service providers
    if (role === 'provider' && phone && !isValidPhone(phone, phoneCountryCode)) {
      const selectedCountry = getSelectedCountry();
      setMsg(`❌ Please enter a valid ${selectedCountry.country} phone number`);
      return;
    }

    // Certification validation for certified providers
    if (role === 'provider' && certificationStatus === 'certified') {
      if (!certifications || certifications.length === 0) {
        setMsg("❌ Certified providers must select at least one certification");
        return;
      }

      // Check if at least one certification has a file uploaded
      const hasUploadedCert = certifications.some(cert => certificationFiles[cert]);
      if (!hasUploadedCert) {
        setMsg("❌ Please upload at least one certification document");
        return;
      }
    }

    // Price validation for service providers
    if (role === 'provider') {
      const parsePrice = (price) => {
        if (!price) return 0;
        const cleanPrice = String(price).replace(/,/g, '');
        return parseInt(cleanPrice) || 0;
      };

      const fullDayStd = parsePrice(priceFullDayStandard);
      const halfDayStd = parsePrice(priceHalfDayStandard);
      const fullDayLux = parsePrice(priceFullDayLuxury);
      const halfDayLux = parsePrice(priceHalfDayLuxury);

      // Check if vehicle types are selected
      const hasStandardJeep = vehicleTypes && vehicleTypes.includes("Standard Safari Jeep");
      const hasLuxuryJeep = vehicleTypes && vehicleTypes.includes("Luxury Safari Jeep");

      // Compulsory price validation based on vehicle type selection
      if (hasStandardJeep) {
        if (!priceFullDayStandard || fullDayStd < 1) {
          setMsg("❌ Full Day Standard price is required and must be at least 1 LKR");
          return;
        }
        if (!priceHalfDayStandard || halfDayStd < 1) {
          setMsg("❌ Half Day Standard price is required and must be at least 1 LKR");
          return;
        }
      }

      if (hasLuxuryJeep) {
        if (!priceFullDayLuxury || fullDayLux < 1) {
          setMsg("❌ Full Day Luxury price is required and must be at least 1 LKR");
          return;
        }
        if (!priceHalfDayLuxury || halfDayLux < 1) {
          setMsg("❌ Half Day Luxury price is required and must be at least 1 LKR");
          return;
        }
      }

      if (certificationStatus === 'non-certified') {
        // Non-certified providers have maximum price limits
        if (fullDayStd > 25000) {
          setMsg("❌ Non-certified Full Day Standard price cannot exceed 25,000 LKR");
          return;
        }
        if (halfDayStd > 12000 && serviceType === 'Jeep Driver') {
          setMsg("❌ Non-certified Half Day Standard price cannot exceed 12,000 LKR");
          return;
        }
        if (halfDayStd > 15000 && serviceType === 'Tour Guide') {
          setMsg("❌ Non-certified Half Day Tour Guide price cannot exceed 15,000 LKR");
          return;
        }
        if (fullDayLux > 35000) {
          setMsg("❌ Non-certified Full Day Luxury price cannot exceed 35,000 LKR");
          return;
        }
        if (halfDayLux > 18000) {
          setMsg("❌ Non-certified Half Day Luxury price cannot exceed 18,000 LKR");
          return;
        }
      } else if (certificationStatus === 'certified') {
        // Certified providers have minimum price requirements
        if (fullDayStd > 0 && fullDayStd < 25000) {
          setMsg("❌ Certified Full Day Standard price must be at least 25,000 LKR");
          return;
        }
        if (halfDayStd > 0 && halfDayStd < 12000 && serviceType === 'Jeep Driver') {
          setMsg("❌ Certified Half Day Standard price must be at least 12,000 LKR");
          return;
        }
        if (halfDayStd > 0 && halfDayStd < 15000 && serviceType === 'Tour Guide') {
          setMsg("❌ Certified Half Day Tour Guide price must be at least 15,000 LKR");
          return;
        }
        if (fullDayLux > 0 && fullDayLux < 35000) {
          setMsg("❌ Certified Full Day Luxury price must be at least 35,000 LKR");
          return;
        }
        if (halfDayLux > 0 && halfDayLux < 18000) {
          setMsg("❌ Certified Half Day Luxury price must be at least 18,000 LKR");
          return;
        }
      }
    }

    setBusy(true);
    setMsg("⏳ Creating your account...");

    try {
      console.log("Creating user with email:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      console.log("✅ User created with UID:", uid);

      // Format phone number for storage: countryCode + phone (e.g., +9407432090367)
      const formattedPhone = phone ? `${phoneCountryCode}${phone}` : "";

      let userData = {
        uid,
        email,
        fullName: fullName.trim(),
        phone: formattedPhone,
        address: address?.trim() || "",
        profilePicture: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: role,
      };

      let collectionName = "";

      if (role === "tourist") {
        collectionName = "tourists";
        // Handle custom language if "other" was selected
        let finalLanguage = language || "english";
        if (language?.startsWith('other:')) {
          finalLanguage = language.replace('other:', '').trim() || "english";
        }

        userData = {
          ...userData,
          country: country?.trim() || "",
          preferredLanguage: finalLanguage,
          bookings: [],
          favorites: [],
        };
      } else {
        collectionName = "serviceProviders";

        // Helper function to parse price with commas (e.g., "25,000" -> 25000)
        const parsePrice = (price) => {
          if (!price) return 0;
          // Remove commas and parse as integer
          const cleanPrice = String(price).replace(/,/g, '');
          return parseInt(cleanPrice) || 0;
        };

        // Base provider data
        userData = {
          ...userData,
          location: locationBase?.trim() || "",
          experienceYears: experience ? parseInt(experience) : 0,
          serviceType: serviceType || "Jeep Driver",
          certificationStatus: certificationStatus || "non-certified", // 'certified' or 'non-certified'
          // Certification approval fields (only for certified providers)
          certificationApproved: false, // Admin must approve
          certificationRejected: false,
          certificationApprovedBy: null,
          certificationApprovedAt: null,
          certificationApprovedByName: null,
          certificationRejectedBy: null,
          certificationRejectedAt: null,
          certificationRejectedByName: null,
          certificationRejectionReason: null,
          vehicleTypes: vehicleTypes || [], // Array of selected vehicle types
          pricePerDay: pricePerDay ? parsePrice(pricePerDay) : 0,
          // Separate prices for different vehicle types
          priceFullDayStandard: priceFullDayStandard ? parsePrice(priceFullDayStandard) : 0,
          priceHalfDayStandard: priceHalfDayStandard ? parsePrice(priceHalfDayStandard) : 0,
          priceFullDayLuxury: priceFullDayLuxury ? parsePrice(priceFullDayLuxury) : 0,
          priceHalfDayLuxury: priceHalfDayLuxury ? parsePrice(priceHalfDayLuxury) : 0,
          rating: 0,
          totalRatings: 0,
          availability: true,
          contactEmail: email,
          contactPhone: formattedPhone,
        };

        // Service type specific data
        if (serviceType === "Tour Guide") {
          // Convert single destination to array format for Firestore compatibility
          const destinationsArray = destinations ? [destinations] : [];
          userData = {
            ...userData,
            destinations: destinationsArray,
            specialQualifications: specialQualifications || [],
            areasOfExpertise: areasOfExpertise || [],
            verificationDocuments: verificationDocuments || [],
            verificationDocumentUrls: {}, // Will be populated after file uploads
            hourlyRate: hourlyRate ? parseInt(hourlyRate) : 0,
            dailyRate: dailyRate ? parseInt(dailyRate) : 0,
            specialPackageRates: specialPackageRates || "",
            currencyPreference: currencyPreference || "LKR",
            languages: languages || [],
            availability: availableDates || {}, // Object mapping dates to status (busy, halfday, unavailable)
            description: description?.trim() || "",
            featured: false,
          };
        } else {
          // For Jeep Driver and other services
          // Convert single destination to array format for Firestore compatibility
          const destinationsArray = destinations ? [destinations] : [];
          userData = {
            ...userData,
            destinations: destinationsArray,
            languages: languages || [],
            specialSkills: specialSkills || [],
            certifications: certifications || [],
            certificationUrls: {}, // Will be populated after file uploads
            availability: availableDates || {}, // Object mapping dates to status (busy, halfday, unavailable)
            description: description?.trim() || "",
            featured: false,
          };
        }
      }

      console.log("Saving user data to collection:", collectionName);
      console.log("User data:", userData);

      await setDoc(doc(db, collectionName, uid), userData);
      console.log("✅ User data saved to Firestore successfully!");

      // Update profile display name immediately
      await updateProfile(userCredential.user, {
        displayName: fullName
      });

      // Handle profile picture upload - Upload immediately to ensure it's saved
      if (profileFile) {
        // Upload profile picture immediately (don't wait)
        (async () => {
          try {
            console.log("📸 Uploading profile picture to Supabase Storage...");
            const { url: photoURL, error } = await uploadProfileImage(profileFile, uid);

            if (error) {
              console.error("❌ Profile image upload failed:", error);
              console.error("   Error details:", error.message || error);
              // Profile picture can be uploaded later via profile settings
              return;
            }

            if (!photoURL) {
              console.error("❌ Profile image upload returned no URL");
              return;
            }

            console.log("✅ Profile image uploaded to Supabase, URL:", photoURL);

            // Update Firestore with profile picture URL immediately
            await setDoc(doc(db, collectionName, uid), {
              profilePicture: photoURL,
              updatedAt: serverTimestamp(),
            }, { merge: true });

            // Update Firebase Auth profile
            try {
              await updateProfile(userCredential.user, {
                displayName: fullName,
                photoURL: photoURL
              });
            } catch (authError) {
              console.warn("⚠️ Could not update Firebase Auth photoURL:", authError);
              // Continue - Firestore update is more important
            }

            console.log("✅ Profile picture saved to Firestore (and Firebase Auth)");
            console.log("   Profile image URL:", photoURL);
          } catch (uploadError) {
            console.error("❌ Profile image upload failed:", uploadError);
            console.error("   Error details:", uploadError.message || uploadError);
            // Profile picture can be uploaded later via profile settings
          }
        })(); // Immediately invoke async function
      }

      // Complete account creation first, then upload files in background
      setMsg("🎉 Account created successfully! Redirecting to login...");
      setBusy(false);

      // Upload certification files in background (non-blocking)
      // For Jeep Driver and Renting service types
      if ((serviceType === "Jeep Driver" || serviceType === "Renting") && Object.keys(certificationFiles).length > 0) {
        // Start background upload without blocking
        setTimeout(async () => {
          try {
            console.log("📄 Starting background upload of certification files for Jeep Driver...");
            const documents = [];
            let uploadedCount = 0;

            for (const [certName, file] of Object.entries(certificationFiles)) {
              try {
                const ext = file.name.split(".").pop();
                const timestamp = Date.now();
                const fileName = `${uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

                console.log(`📤 Uploading ${certName} to Supabase Storage...`);

                // Upload to Supabase Storage
                const { url: fileURL, error, path } = await uploadDocument(file, uid, fileName);

                if (error) {
                  console.error(`❌ Failed to upload certification ${certName}:`, error);

                  // Save document metadata even if upload fails (with error status)
                  documents.push({
                    certificationName: certName,
                    fileName: fileName,
                    fileUrl: null, // No URL for failed uploads
                    fileSize: file.size,
                    fileType: file.type || `application/${ext}`,
                    uploadedAt: new Date(),
                    documentId: `${uid}_${timestamp}`,
                    supabasePath: null, // No path for failed uploads
                    uploadStatus: 'failed',
                    uploadError: error.message || 'Upload failed'
                  });
                  // Continue with other files
                  continue;
                }

                if (!path) {
                  console.error(`❌ Upload succeeded but no path returned for ${certName}`);
                  // Still save metadata but mark as failed
                  documents.push({
                    certificationName: certName,
                    fileName: fileName,
                    fileUrl: fileURL || null,
                    fileSize: file.size,
                    fileType: file.type || `application/${ext}`,
                    uploadedAt: new Date(),
                    documentId: `${uid}_${timestamp}`,
                    supabasePath: null,
                    uploadStatus: 'failed',
                    uploadError: 'Upload succeeded but path not returned'
                  });
                  continue;
                }

                console.log(`✅ File uploaded to Supabase: ${certName}`);
                console.log(`✅ Path stored: ${path}`);

                // Add to documents array
                // Note: fileURL might be null for private buckets, but supabasePath is always returned
                documents.push({
                  certificationName: certName,
                  fileName: fileName,
                  fileUrl: fileURL || null, // May be null for private buckets
                  fileSize: file.size,
                  fileType: file.type || `application/${ext}`,
                  uploadedAt: new Date(),
                  documentId: `${uid}_${timestamp}`, // Unique ID for this document
                  supabasePath: path, // Store Supabase path (REQUIRED for viewing/deleting)
                  uploadStatus: 'uploaded' // ✅ Mark as successfully uploaded
                });
                uploadedCount++;
              } catch (fileError) {
                console.error(`❌ Failed to upload certification ${certName}:`, fileError);
                console.error('Error details:', {
                  message: fileError.message,
                  stack: fileError.stack
                });

                // Save document metadata even if upload fails (with error status)
                documents.push({
                  certificationName: certName,
                  fileName: `${uid}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
                  fileUrl: null, // No URL for failed uploads
                  fileSize: file.size,
                  fileType: file.type || `application/${file.name.split('.').pop()}`,
                  uploadedAt: new Date(),
                  documentId: `${uid}_${Date.now()}`,
                  supabasePath: null, // No path for failed uploads
                  uploadStatus: 'failed',
                  uploadError: fileError.message || 'Upload failed'
                });
                // Continue with other files
              }
            }

            // Store all documents under one user ID in Firestore (even if some uploads failed)
            if (documents.length > 0) {
              try {
                const userCertDocRef = doc(db, 'jeepDriverCertifications', uid);
                const existingDoc = await getDoc(userCertDocRef);

                console.log(`💾 Saving ${documents.length} document(s) to Firestore...`);
                console.log('📋 Documents to save:', documents.map(d => ({
                  name: d.certificationName,
                  hasPath: !!d.supabasePath,
                  hasUrl: !!d.fileUrl,
                  status: d.uploadStatus
                })));

                if (existingDoc.exists()) {
                  // Update existing document - merge with existing documents
                  const existingData = existingDoc.data();
                  const existingDocuments = existingData.documents || [];
                  const allDocuments = [...existingDocuments, ...documents];

                  await setDoc(userCertDocRef, {
                    providerId: uid,
                    documents: allDocuments,
                    updatedAt: serverTimestamp()
                  }, { merge: true });

                  console.log(`✅ Updated Firestore: ${allDocuments.length} total documents (${existingDocuments.length} existing + ${documents.length} new)`);
                } else {
                  // Create new document
                  await setDoc(userCertDocRef, {
                    providerId: uid,
                    documents: documents,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });

                  console.log(`✅ Created new Firestore document with ${documents.length} document(s)`);
                }

                console.log(`✅ Successfully saved ${documents.length} certification document(s) to Firestore`);
                console.log(`   - ${uploadedCount} successfully uploaded to Supabase Storage`);
                console.log(`   - ${documents.length - uploadedCount} failed or pending`);
              } catch (firestoreError) {
                console.error('❌ Failed to save to Firestore:', firestoreError);
                console.error('Error details:', {
                  code: firestoreError.code,
                  message: firestoreError.message,
                  stack: firestoreError.stack
                });
              }
            } else {
              console.warn("⚠️ No certification files to save");
            }
          } catch (uploadError) {
            console.error("❌ Certification files upload failed:", uploadError);
            console.error('Upload error details:', {
              message: uploadError.message,
              code: uploadError.code,
              stack: uploadError.stack
            });
            // Files will be uploaded later via admin panel if needed
          }
        }, 500); // Increased delay to ensure account creation completes
      }

      // Upload verification document files in background (non-blocking) for Tour Guides
      if (serviceType === "Tour Guide" && Object.keys(verificationDocumentFiles).length > 0) {
        // Start background upload without blocking
        setTimeout(async () => {
          try {
            console.log("📄 Starting background upload of verification document files for Tour Guide...");
            const documents = [];
            let uploadedCount = 0;

            for (const [docName, file] of Object.entries(verificationDocumentFiles)) {
              try {
                const ext = file.name.split(".").pop();
                const timestamp = Date.now();
                const fileName = `${uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

                console.log(`📤 Uploading ${docName} to Supabase Storage...`);

                // Upload to Supabase Storage
                const { url: fileURL, error, path } = await uploadDocument(file, uid, fileName);

                if (error) {
                  console.error(`❌ Failed to upload document ${docName}:`, error);

                  // Save document metadata even if upload fails (with error status)
                  documents.push({
                    certificationName: docName,
                    fileName: fileName,
                    fileUrl: null, // No URL for failed uploads
                    fileSize: file.size,
                    fileType: file.type || `application/${ext}`,
                    uploadedAt: new Date(),
                    documentId: `${uid}_${timestamp}`,
                    supabasePath: null, // No path for failed uploads
                    uploadStatus: 'failed',
                    uploadError: error.message || 'Upload failed'
                  });
                  // Continue with other files
                  continue;
                }

                if (!path) {
                  console.error(`❌ Upload succeeded but no path returned for ${docName}`);
                  // Still save metadata but mark as failed
                  documents.push({
                    certificationName: docName,
                    fileName: fileName,
                    fileUrl: fileURL || null,
                    fileSize: file.size,
                    fileType: file.type || `application/${ext}`,
                    uploadedAt: new Date(),
                    documentId: `${uid}_${timestamp}`,
                    supabasePath: null,
                    uploadStatus: 'failed',
                    uploadError: 'Upload succeeded but path not returned'
                  });
                  continue;
                }

                console.log(`✅ File uploaded to Supabase: ${docName}`);
                console.log(`✅ Path stored: ${path}`);

                // Add to documents array
                // Note: fileURL might be null for private buckets, but supabasePath is always returned
                documents.push({
                  certificationName: docName,
                  fileName: fileName,
                  fileUrl: fileURL || null, // May be null for private buckets
                  fileSize: file.size,
                  fileType: file.type || `application/${ext}`,
                  uploadedAt: new Date(),
                  documentId: `${uid}_${timestamp}`, // Unique ID for this document
                  supabasePath: path, // Store Supabase path (REQUIRED for viewing/deleting)
                  uploadStatus: 'uploaded' // ✅ Mark as successfully uploaded
                });
                uploadedCount++;
              } catch (fileError) {
                console.error(`❌ Failed to upload verification document ${docName}:`, fileError);
                console.error('Error details:', {
                  message: fileError.message,
                  code: fileError.code,
                  stack: fileError.stack
                });

                // Check for CORS error
                if (fileError.message && (fileError.message.includes('CORS') || fileError.message.includes('blocked') || fileError.code === 'storage/unauthorized')) {
                  console.error('⚠️ CORS ERROR DETECTED:');
                  console.error('   Firebase Storage CORS is not configured.');
                  console.error('   To fix: Run "gsutil cors set cors.json gs://safarihub-a80bd.firebasestorage.app"');
                  console.error('   Or configure CORS in Firebase Console: Storage > Settings > CORS');
                }

                // Save document metadata even if upload fails (with error status)
                documents.push({
                  certificationName: docName,
                  fileName: `${uid}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
                  fileUrl: null, // No URL for failed uploads
                  fileSize: file.size,
                  fileType: file.type || `application/${file.name.split('.').pop()}`,
                  uploadedAt: new Date(),
                  documentId: `${uid}_${Date.now()}`,
                  supabasePath: null, // No path for failed uploads
                  uploadStatus: 'failed',
                  uploadError: fileError.message || 'Upload failed'
                });
                // Continue with other files
              }
            }

            // Store all documents under one user ID in Firestore (even if some uploads failed)
            if (documents.length > 0) {
              try {
                const userCertDocRef = doc(db, 'guideCertifications', uid);
                const existingDoc = await getDoc(userCertDocRef);

                console.log(`💾 Saving ${documents.length} document(s) to Firestore...`);
                console.log('📋 Documents to save:', documents.map(d => ({
                  name: d.certificationName,
                  hasPath: !!d.supabasePath,
                  hasUrl: !!d.fileUrl,
                  status: d.uploadStatus
                })));

                if (existingDoc.exists()) {
                  // Update existing document - merge with existing documents
                  const existingData = existingDoc.data();
                  const existingDocuments = existingData.documents || [];
                  const allDocuments = [...existingDocuments, ...documents];

                  await setDoc(userCertDocRef, {
                    providerId: uid,
                    documents: allDocuments,
                    updatedAt: serverTimestamp()
                  }, { merge: true });

                  console.log(`✅ Updated Firestore: ${allDocuments.length} total documents (${existingDocuments.length} existing + ${documents.length} new)`);
                } else {
                  // Create new document
                  await setDoc(userCertDocRef, {
                    providerId: uid,
                    documents: documents,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  });

                  console.log(`✅ Created new Firestore document with ${documents.length} document(s)`);
                }

                console.log(`✅ Successfully saved ${documents.length} verification document(s) to Firestore`);
                console.log(`   - ${uploadedCount} successfully uploaded to Supabase Storage`);
                console.log(`   - ${documents.length - uploadedCount} failed or pending`);
              } catch (firestoreError) {
                console.error('❌ Failed to save to Firestore:', firestoreError);
                console.error('Error details:', {
                  code: firestoreError.code,
                  message: firestoreError.message,
                  stack: firestoreError.stack
                });
              }
            } else {
              console.warn("⚠️ No verification document files to save");
            }
          } catch (uploadError) {
            console.error("❌ Verification document files upload failed:", uploadError);
            console.error('Upload error details:', {
              message: uploadError.message,
              code: uploadError.code,
              stack: uploadError.stack
            });
            // Files will be uploaded later via admin panel if needed
          }
        }, 500); // Increased delay to ensure account creation completes
      }

      setTimeout(() => {
        signOut(auth);
        setScreen("login");
        setRole(null); // Reset role after successful registration
        resetForm();
        // Clear session storage after successful registration
        sessionStorage.removeItem('authRole');
        sessionStorage.removeItem('authScreen');
        sessionStorage.removeItem('authServiceType');
        sessionStorage.setItem('authScreen', 'login');
        // Stay on the same auth page after registration
        // No redirect happens - user can click login after seeing success message
      }, 2000);

    } catch (error) {
      console.error("❌ Registration error:", error);
      let errorMessage = "❌ Registration failed! ";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage += "Email is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage += "Invalid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage += "Password is too weak.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage += "Network error. Please check your connection.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }

      setMsg(errorMessage);
      setBusy(false);
    }
  };

  // Login Function
  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user's name for success message
      let userName = user.displayName || '';
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
        if (touristDoc.exists()) {
          userName = touristDoc.data().fullName || touristDoc.data().name || userName;
        } else {
          const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
          if (providerDoc.exists()) {
            userName = providerDoc.data().fullName || providerDoc.data().name || userName;
          }
        }
      } catch (nameError) {
        console.log('Could not fetch user name:', nameError);
      }

      // Show success popup with user's name
      setSuccessUserName(userName || 'User');
      setShowSuccessPopup(true);
      setBusy(false);

      setTimeout(() => {
        setShowSuccessPopup(false);
        onAuthSuccess(returnToPath);
      }, 2500);
    } catch (error) {
      let errorMessage = "❌ Login failed! ";

      if (error.code === 'auth/invalid-credential') {
        errorMessage += "Invalid email or password.";
      } else if (error.code === 'auth/user-not-found') {
        errorMessage += "No account found with this email.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage += "Incorrect password.";
      } else {
        errorMessage += "Please try again.";
      }

      setMsg(errorMessage);
      setBusy(false);
    }
  };

  // Reset form when changing screens
  useEffect(() => {
    if (screen === "login" || screen === "register") {
      resetForm();
    }
  }, [screen]);

  // Update screen when initialScreen prop changes
  useEffect(() => {
    if (initialScreen) {
      setScreen(initialScreen);
    }
  }, [initialScreen]);

  // Login Page
  if (screen === "login")
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Welcome Back!</h3>
                  <p className="text-lg text-green-100">Hello, {successUserName}!</p>
                  <p className="text-sm text-green-200 mt-2">Login successful. Redirecting...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Back Button */}
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="absolute top-4 left-4 text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-2 text-sm transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Home
              </button>
            )}

            <div className="text-center mb-8">
              <img
                src={logo}
                alt="SafariHub Logo"
                className="h-24 sm:h-28 md:h-32 w-auto object-contain mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onBackToHome || (() => { })}
              />
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <p className="text-gray-300 mt-2">Sign in to continue your adventure</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white font-medium text-sm">
                  <Mail className="h-4 w-4 text-yellow-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-sm"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white font-medium text-sm">
                  <Lock className="h-4 w-4 text-yellow-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-sm pr-12"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {busy ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="text-center pt-4 border-t border-white/10">
                <p className="text-gray-300 text-sm">
                  New to site?{" "}
                  <button
                    type="button"
                    onClick={() => setScreen("register")}
                    className="text-yellow-400 hover:text-yellow-300 font-semibold underline"
                  >
                    REGISTER
                  </button>
                </p>
              </div>
            </form>

            {/* Error messages only - success shows as popup */}
            {msg && msg.includes("❌") && (
              <div className="mt-4 p-4 rounded-xl text-center animate-slideUp bg-red-500/20 text-red-300 border border-red-500/30">
                <p className="text-sm font-medium">{msg}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );

  // Register Page
  if (screen === "register") {
    // CRITICAL: If URL has serviceType but role isn't set yet, wait for state to sync
    if (urlServiceType && !role) {
      console.log('⏳ Waiting for role to sync with URL serviceType...');
      // Return a minimal loader while state syncs
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
          <div className="text-white">Loading...</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Back Button - Now scrolls with content */}
          {onBackToHome && (
            <button
              onClick={() => {
                if (role) {
                  setRole(null);
                  setServiceType('');
                  resetForm();
                  // Clear role and service type from session storage when going back to selection
                  sessionStorage.removeItem('authRole');
                  sessionStorage.removeItem('authServiceType');
                  sessionStorage.setItem('authScreen', 'register');
                  // Navigate back to /register without service type
                  if (navigate) {
                    navigate('/register', { replace: true });
                  }
                } else {
                  // Clear all auth session storage when going back to home
                  sessionStorage.removeItem('showAuth');
                  sessionStorage.removeItem('authInitialScreen');
                  sessionStorage.removeItem('authRole');
                  sessionStorage.removeItem('authScreen');
                  sessionStorage.removeItem('authServiceType');
                  onBackToHome();
                }
              }}
              className="mb-3 text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-2 text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to {role ? 'Selection' : 'Home'}
            </button>
          )}

          {/* CRITICAL: Show RegistrationForm if ANY of these are true:
              1. role is set (user selected provider/tourist)
              2. urlServiceType exists (URL like /register/jeep-driver)
              3. serviceType is set (state has service type)
          */}
          {(() => {
            // Check if we should show the form or the selection
            const hasRole = Boolean(role);
            const hasUrlServiceType = Boolean(urlServiceType);
            const hasServiceType = Boolean(serviceType);
            const shouldShowForm = hasRole || hasUrlServiceType || hasServiceType;

            console.log('🎯 RENDER DECISION:');
            console.log('   - role:', role, '→', hasRole);
            console.log('   - urlServiceType:', urlServiceType, '→', hasUrlServiceType);
            console.log('   - serviceType:', serviceType, '→', hasServiceType);
            console.log('   - DECISION:', shouldShowForm ? '✅ SHOW FORM' : '❌ SHOW SELECTION');

            return null;
          })()}
          {(role || urlServiceType || serviceType) ? (
            <RegistrationForm
              role={role || 'provider'}
              serviceType={serviceType}
              formData={{
                email, fullName, password, confirm, country, phone, address, phoneCountryCode, language,
                locationBase, experience, languagesSpoken, serviceType,
                vehicleTypes, pricePerDay, priceFullDayStandard, priceHalfDayStandard, priceFullDayLuxury, priceHalfDayLuxury,
                destinations: typeof destinations === 'string' ? destinations : (destinations && destinations.length > 0 ? destinations[0] : ""), // Convert array to string for single select
                languages,
                specialSkills, certifications, certificationStatus, certificationFiles, description,
                availableDates, specialQualifications, areasOfExpertise,
                verificationDocuments, hourlyRate, dailyRate, specialPackageRates, currencyPreference
              }}
              handlers={{
                setEmail, setFullName, setPassword, setConfirm, setCountry, setPhone: handlePhoneChange, setAddress, setLanguage,
                setLocationBase, setExperience, setLanguagesSpoken, setServiceType,
                setVehicleTypes, setPricePerDay, setPriceFullDayStandard, setPriceHalfDayStandard, setPriceFullDayLuxury, setPriceHalfDayLuxury, setDestinations, setLanguages,
                setSpecialSkills, setCertifications, setCertificationStatus, setCertificationFiles, setDescription,
                setAvailableDates, setSpecialQualifications, setAreasOfExpertise,
                setVerificationDocuments, setHourlyRate, setDailyRate, setSpecialPackageRates, setCurrencyPreference, setPhoneCountryCode
              }}
              profilePreview={profilePreview}
              onProfileImageSelect={handleProfileImageSelect}
              certificationFiles={certificationFiles}
              onCertificationFileSelect={handleCertificationFileSelect}
              verificationDocumentFiles={verificationDocumentFiles}
              onVerificationDocumentFileSelect={handleVerificationDocumentFileSelect}
              onSubmit={handleRegister}
              busy={busy}
              msg={msg}
            />
          ) : (
            <UserTypeSelection onSelect={setRole} logo={logo} onBackToHome={onBackToHome} />
          )}
        </div>
      </div>
    );
  }

  return null;
}

// User Type Selection Component
const UserTypeSelection = ({ onSelect, logo, onBackToHome }) => (
  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
    <div className="text-center mb-6">
      <img
        src={logo}
        alt="SafariHub Logo"
        className="h-24 sm:h-28 md:h-32 w-auto object-contain mx-auto mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onBackToHome || (() => { })}
      />
      <h2 className="text-xl font-bold text-white">Join SafariHub</h2>
      <p className="text-gray-300 text-sm mt-1">Choose your adventure type</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <button
        onClick={() => onSelect('tourist')}
        className="relative bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-lg backdrop-blur-sm"
      >
        {/* Content */}
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-2">Tourist</h3>
          <p className="text-gray-300 text-sm">
            Explore amazing destinations
          </p>
        </div>
      </button>

      <button
        onClick={() => onSelect('provider')}
        className="relative bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center shadow-lg backdrop-blur-sm"
      >
        {/* Content */}
        <div className="relative z-10">
          <h3 className="text-xl font-bold text-white mb-2">Service Provider</h3>
          <p className="text-gray-300 text-sm">
            Offer your services
          </p>
        </div>
      </button>
    </div>
  </div>
);

// RegistrationForm Component
const RegistrationForm = ({ role, serviceType, formData, handlers, profilePreview, onProfileImageSelect, certificationFiles, onCertificationFileSelect, verificationDocumentFiles, onVerificationDocumentFileSelect, onSubmit, busy, msg }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [previousServiceType, setPreviousServiceType] = useState(serviceType);

  const isTourist = role === 'tourist';
  const isJeepDriver = serviceType === "Jeep Driver";
  const isTourGuide = serviceType === "Tour Guide";

  // Reset ALL form fields when service type changes
  useEffect(() => {
    if (!isTourist && serviceType && serviceType !== previousServiceType && previousServiceType) {
      console.log('🔄 Service type changed from', previousServiceType, 'to', serviceType, '- Clearing form');

      // Clear ALL fields - both common and service-specific
      // Common fields
      if (handlers.setFullName) handlers.setFullName('');
      if (handlers.setEmail) handlers.setEmail('');
      if (handlers.setPassword) handlers.setPassword('');
      if (handlers.setConfirm) handlers.setConfirm('');
      if (handlers.setCountry) handlers.setCountry('');
      if (handlers.setPhone) handlers.setPhone('');
      if (handlers.setAddress) handlers.setAddress('');
      if (handlers.setPhoneCountryCode) handlers.setPhoneCountryCode('+94');

      // Service-specific fields
      if (handlers.setVehicleTypes) handlers.setVehicleTypes([]);
      if (handlers.setPriceFullDayStandard) handlers.setPriceFullDayStandard('');
      if (handlers.setPriceHalfDayStandard) handlers.setPriceHalfDayStandard('');
      if (handlers.setPriceFullDayLuxury) handlers.setPriceFullDayLuxury('');
      if (handlers.setPriceHalfDayLuxury) handlers.setPriceHalfDayLuxury('');
      if (handlers.setDestinations) handlers.setDestinations('');
      if (handlers.setLanguages) handlers.setLanguages([]);
      if (handlers.setSpecialSkills) handlers.setSpecialSkills([]);
      if (handlers.setCertifications) handlers.setCertifications([]);
      if (handlers.setCertificationStatus) handlers.setCertificationStatus('non-certified');
      if (handlers.setSpecialQualifications) handlers.setSpecialQualifications([]);
      if (handlers.setAreasOfExpertise) handlers.setAreasOfExpertise([]);
      if (handlers.setVerificationDocuments) handlers.setVerificationDocuments([]);
      if (handlers.setDescription) handlers.setDescription('');
      if (handlers.setHourlyRate) handlers.setHourlyRate('');
      if (handlers.setDailyRate) handlers.setDailyRate('');
      if (handlers.setExperience) handlers.setExperience('');
      if (handlers.setLocationBase) handlers.setLocationBase('');
      if (handlers.setLanguagesSpoken) handlers.setLanguagesSpoken('');
      if (handlers.setPricePerDay) handlers.setPricePerDay('');
      if (handlers.setSpecialPackageRates) handlers.setSpecialPackageRates('');
      if (handlers.setCurrencyPreference) handlers.setCurrencyPreference('LKR');
    }
    setPreviousServiceType(serviceType);
  }, [serviceType, previousServiceType, isTourist, handlers]);

  const serviceTypes = [
    "Jeep Driver",
    "Tour Guide",
    "Renting Store"
  ];

  const vehicleTypes = [
    "Standard Safari Jeep",
    "Luxury Safari Jeep"
  ];

  const destinations = [
    "Yala National Park",
    "Wilpattu National Park",
    "Udawalawe National Park",
    "Minneriya National Park",
    "Kaudulla National Park",
    "Bundala National Park",
    "Kumana National Park",
    "Horton Plains",
    "Sinharaja Forest Reserve",
    "Knuckles Mountain Range",
    "Mirissa Beach",
    "Unawatuna Beach",
    "Lunugamvehera"
  ];

  const languages = [
    "English", "Sinhala", "Tamil", "Hindi",
    "French", "German", "Chinese", "Japanese",
    "Spanish", "Korean", "Russian", "Arabic"
  ];

  const specialSkills = [
    "Bird identification knowledge",
    "Tusker identification knowledge",
    "Leopard identification knowledge",
    "Reptile identification knowledge",
    "Flora identification knowledge",
    "First aid knowledge"
  ];

  const certifications = [
    "Wildlife Department of Sri Lanka certification",
    "Tourist Board of Sri Lanka certification"
  ];

  // Tour Guide specific options
  const specialQualifications = [
    "Tourism License",
    "Tour Guide Certificate",
    "Wildlife Department Certification",
    "Eco Tourism Certification",
    "Cultural Heritage Knowledge",
    "Adventure Tourism Certified"
  ];

  const areasOfExpertise = [
    "National Parks",
    "Campsites",
    "Wetlands",
    "Beaches",
    "Forest Reserves",
    "Mountain Regions",
    "Cultural Heritage Sites",
    "Historical Sites",
    "Knowledgeable about animal behavior"
  ];

  const verificationDocuments = [
    "Government Guide License",
    "First Aid Certificate",
    "Driving License",
    "Police Clearance Certificate"
  ];

  const currencyOptions = [
    "LKR - Sri Lankan Rupee",
    "USD - US Dollar",
    "EUR - Euro",
    "GBP - British Pound"
  ];

  // Phone input helper text (deprecated - using inline validation now)
  const getPhoneHelperText = () => {
    if (!formData.phone) {
      const selectedCountry = countryCodes.find(c => c.code === (formData.phoneCountryCode || '+94')) || countryCodes[0];
      return `Enter ${selectedCountry.country} phone number`;
    }
    return "";
  };

  // Handle multi-select changes
  const handleMultiSelectChange = (field, value) => {
    const currentArray = formData[field] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];

    handlers[`set${field.charAt(0).toUpperCase() + field.slice(1)}`](updatedArray);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto relative">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {isTourist ? 'Tourist Registration' : 'Service Provider Registration'}
        </h2>
        <p className="text-gray-300 text-xs mt-1">
          {isTourist ? 'Create your adventure account' : 'Join our network of service providers'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Service Type Selection (For Service Providers - Show First) */}
        {!isTourist && (
          <div className="space-y-1 mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <label className="flex items-center gap-2 text-white font-medium text-sm">
              <User className="h-4 w-4 text-yellow-400" />
              Service Type *
            </label>
            <select
              value={formData.serviceType}
              onChange={(e) => handlers.setServiceType(e.target.value)}
              required
              className={`w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-lg focus:outline-none focus:border-yellow-400 text-sm font-medium ${formData.serviceType ? 'text-white' : 'text-gray-400'
                }`}
            >
              <option value="" disabled hidden>Select Service Type</option>
              {serviceTypes.map(type => (
                <option key={type} value={type} className="text-white">{type}</option>
              ))}
            </select>
            {!formData.serviceType && (
              <p className="text-xs text-yellow-300 mt-1">
                Please select your service type to continue with registration
              </p>
            )}
          </div>
        )}

        {/* Show form fields only after service type is selected (for providers) or always for tourists */}
        {(isTourist || formData.serviceType) && (
          <>
            {(() => {
              console.log('📋 Form fields rendering - isTourist:', isTourist, 'serviceType:', formData.serviceType);
              return null;
            })()}

            {/* Certification Status Selection (for both Jeep Drivers and Tour Guides) */}
            {(isJeepDriver || isTourGuide) && (
              <div className="space-y-2 mb-4">
                <label className="block text-white font-medium text-xs">
                  Certification Status *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlers.setCertificationStatus('non-certified')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-xs font-medium ${formData.certificationStatus === 'non-certified'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                      }`}
                  >
                    Non-Certified Service Provider
                  </button>
                  <button
                    type="button"
                    onClick={() => handlers.setCertificationStatus('certified')}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-xs font-medium ${formData.certificationStatus === 'certified'
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                      }`}
                  >
                    Certified Service Provider
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formData.certificationStatus === 'certified'
                    ? '✓ Certified providers can charge premium rates and must upload certifications'
                    : '✓ Non-certified providers have maximum price limits'}
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <User className="h-3 w-3 text-yellow-400" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => {
                    // Only allow letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    handlers.setFullName(value);
                  }}
                  required
                  pattern="[A-Za-z\s]+"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Mail className="h-3 w-3 text-yellow-400" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handlers.setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Lock className="h-3 w-3 text-yellow-400" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handlers.setPassword(e.target.value)}
                    required
                    minLength="6"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs pr-8"
                    placeholder="Create password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Lock className="h-3 w-3 text-yellow-400" />
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirm}
                    onChange={(e) => handlers.setConfirm(e.target.value)}
                    required
                    minLength="6"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs pr-8"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Phone Number */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Phone className="h-3 w-3 text-yellow-400" />
                  Phone Number {!isTourist && <span className="text-red-400">*</span>}
                </label>
                <div className="flex gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowCountryDropdown(!showCountryDropdown);
                      }}
                      className="flex items-center gap-1.5 px-2 py-2 text-xs border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 min-w-[90px] text-white"
                    >
                      <span className="text-sm">{countryCodes.find(c => c.code === (formData.phoneCountryCode || '+94'))?.flag || '🇱🇰'}</span>
                      <span className="text-xs font-medium">{formData.phoneCountryCode || '+94'}</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                    {showCountryDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowCountryDropdown(false)}
                        />
                        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto min-w-[200px]">
                          {countryCodes.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                if (handlers && handlers.setPhoneCountryCode) {
                                  handlers.setPhoneCountryCode(country.code);
                                  if (handlers.setPhone) {
                                    handlers.setPhone(''); // Clear phone when country changes
                                  }
                                }
                                setShowCountryDropdown(false);
                              }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition-colors text-white ${(formData.phoneCountryCode || '+94') === country.code ? 'bg-yellow-500/20' : ''
                                }`}
                            >
                              <span className="text-sm">{country.flag}</span>
                              <span className="flex-1 text-left">{country.country}</span>
                              <span className="text-gray-300 font-medium">{country.code}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Phone Number Input */}
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (handlers && handlers.setPhone) {
                          handlers.setPhone(value);
                        }
                      }}
                      required={!isTourist}
                      maxLength={countryCodes.find(c => c.code === (formData.phoneCountryCode || '+94'))?.maxLength || 10}
                      className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none text-xs ${formData.phone && isValidPhone(formData.phone, formData.phoneCountryCode || '+94')
                        ? 'border-green-400 focus:border-green-400'
                        : formData.phone
                          ? 'border-red-400 focus:border-red-400'
                          : 'border-white/10 focus:border-yellow-400'
                        }`}
                      placeholder={formData.phoneCountryCode === '+94' ? '743090367' : 'Enter phone number'}
                    />
                  </div>
                </div>
                {formData.phone && (
                  <p className={`text-xs mt-1 ${isValidPhone(formData.phone, formData.phoneCountryCode || '+94')
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    {isValidPhone(formData.phone, formData.phoneCountryCode || '+94')
                      ? `✓ Valid ${countryCodes.find(c => c.code === (formData.phoneCountryCode || '+94'))?.country || 'phone'} number`
                      : `Invalid format`}
                  </p>
                )}
              </div>

              {/* Address Field */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <MapPin className="h-3 w-3 text-yellow-400" />
                  Address {!isTourist && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handlers.setAddress(e.target.value)}
                  required={!isTourist}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder={isTourist ? "Your address" : "Service location address"}
                />
              </div>
            </div>

            {/* Country field for tourists */}
            {isTourist && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <MapPin className="h-3 w-3 text-yellow-400" />
                  Country *
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handlers.setCountry(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder="Your country"
                />
              </div>
            )}

            {/* Tourist Specific Fields */}
            {isTourist && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Globe className="h-3 w-3 text-yellow-400" />
                  Preferred Language
                </label>
                <select
                  value={formData.language?.startsWith('other:') ? 'other' : formData.language}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      handlers.setLanguage('other:');
                    } else {
                      handlers.setLanguage(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs cursor-pointer"
                  style={{
                    backgroundColor: '#111827',
                    color: '#ffffff'
                  }}
                >
                  <option value="english" style={{ backgroundColor: '#111827', color: '#ffffff' }}>English</option>
                  <option value="sinhala" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Sinhala</option>
                  <option value="tamil" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Tamil</option>
                  <option value="hindi" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Hindi</option>
                  <option value="french" style={{ backgroundColor: '#111827', color: '#ffffff' }}>French</option>
                  <option value="german" style={{ backgroundColor: '#111827', color: '#ffffff' }}>German</option>
                  <option value="spanish" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Spanish</option>
                  <option value="chinese" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Chinese</option>
                  <option value="japanese" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Japanese</option>
                  <option value="korean" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Korean</option>
                  <option value="arabic" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Arabic</option>
                  <option value="portuguese" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Portuguese</option>
                  <option value="italian" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Italian</option>
                  <option value="russian" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Russian</option>
                  <option value="other" style={{ backgroundColor: '#111827', color: '#ffffff' }}>Other</option>
                </select>
                {(formData.language === 'other' || formData.language?.startsWith('other:')) && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.language?.startsWith('other:') ? formData.language.replace('other:', '') : ''}
                      onChange={(e) => {
                        handlers.setLanguage(`other:${e.target.value}`);
                      }}
                      placeholder="Please specify your language"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Service Provider Specific Fields */}
            {!isTourist && formData.serviceType && (
              <>
                {/* Vehicle Type Selection (Multiple Choice for Jeep Driver) */}
                {formData.serviceType === "Jeep Driver" && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-white font-medium text-xs">
                      Vehicle Type(s) <span className="text-gray-400 text-xs">(Select all that apply)</span>
                    </label>
                    <div className="border border-white/10 rounded-lg p-3 bg-white/5 space-y-2">
                      {vehicleTypes.map(type => (
                        <div key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`vehicle-${type}`}
                            checked={formData.vehicleTypes?.includes(type) || false}
                            onChange={(e) => handleMultiSelectChange('vehicleTypes', type)}
                            className="mr-2 h-3.5 w-3.5 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded cursor-pointer"
                          />
                          <label htmlFor={`vehicle-${type}`} className="text-white text-xs cursor-pointer">
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                    {formData.vehicleTypes && formData.vehicleTypes.length > 0 && (
                      <p className="text-xs text-gray-300 mt-1">
                        Selected: {formData.vehicleTypes.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Price Fields (for Jeep Drivers) - Show based on vehicle type selection */}
                {formData.serviceType === "Jeep Driver" && formData.vehicleTypes && formData.vehicleTypes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-white font-semibold text-sm">
                      Pricing Information
                      {formData.certificationStatus === 'certified' && (
                        <span className="text-yellow-400 text-xs ml-2">(Certified - Premium Rates)</span>
                      )}
                      {formData.certificationStatus === 'non-certified' && (
                        <span className="text-emerald-400 text-xs ml-2">(Non-Certified - Standard Rates)</span>
                      )}
                    </h4>

                    {/* Standard Safari Jeep Prices */}
                    {formData.vehicleTypes.includes("Standard Safari Jeep") && (
                      <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5">
                        <p className="text-green-400 font-medium text-xs mb-2">Standard Safari Jeep Pricing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Full Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 25,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 25,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceFullDayStandard}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceFullDayStandard(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 25,000' : 'Maximum: 25,000'}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Half Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 12,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 12,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceHalfDayStandard}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceHalfDayStandard(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 12,000' : 'Maximum: 12,000'}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Luxury Safari Jeep Prices */}
                    {formData.vehicleTypes.includes("Luxury Safari Jeep") && (
                      <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-500/5">
                        <p className="text-purple-400 font-medium text-xs mb-2">Luxury Safari Jeep Pricing</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Full Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 35,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 35,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceFullDayLuxury}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceFullDayLuxury(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 35,000' : 'Maximum: 35,000'}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Half Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 18,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 18,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceHalfDayLuxury}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceHalfDayLuxury(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 18,000' : 'Maximum: 18,000'}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special packages text - shown after all pricing */}
                    <p className="text-xs text-blue-300 italic mt-2">
                      Add your special packages to your profile from your Service Provider Dashboard
                    </p>
                  </div>
                )}

                {/* Tour Guide Specific Fields */}
                {isTourGuide && (
                  <>
                    {/* Tour Guide Pricing Information */}
                    <div className="space-y-3">
                      <h4 className="text-white font-semibold text-sm">
                        Tour Guide Price
                        {formData.certificationStatus === 'certified' && (
                          <span className="text-yellow-400 text-xs ml-2">(Certified - Premium Rates)</span>
                        )}
                        {formData.certificationStatus === 'non-certified' && (
                          <span className="text-emerald-400 text-xs ml-2">(Non-Certified - Standard Rates)</span>
                        )}
                      </h4>

                      <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Full Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 25,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 25,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceFullDayStandard}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceFullDayStandard(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 25,000' : 'Maximum: 25,000'}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-white font-medium text-xs">
                              Half Day Price (LKR) *
                              {formData.certificationStatus === 'non-certified' && (
                                <span className="text-emerald-400 text-[10px]">(Max: 15,000)</span>
                              )}
                              {formData.certificationStatus === 'certified' && (
                                <span className="text-yellow-400 text-[10px]">(Min: 15,000)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={formData.priceHalfDayStandard}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent starting with 0
                                if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                  return;
                                }
                                handlers.setPriceHalfDayStandard(value);
                              }}
                              required
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                              placeholder={formData.certificationStatus === 'certified' ? 'Minimum: 15,000' : 'Maximum: 15,000'}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-blue-300 mt-2 italic">
                          Add your special packages to your profile from your Service Provider Dashboard
                        </p>
                      </div>
                    </div>

                    {/* Destination (Custom dropdown for Tour Guide) */}
                    <div className="space-y-1 relative">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Destination *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.destinations || ""}
                          onChange={(e) => {
                            handlers.setDestinations(e.target.value);
                            setShowDestinationDropdown(true);
                          }}
                          onFocus={() => setShowDestinationDropdown(true)}
                          required
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                          placeholder="Type to search destinations..."
                          autoComplete="off"
                        />
                        <ChevronDown
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 cursor-pointer"
                          onClick={() => setShowDestinationDropdown(!showDestinationDropdown)}
                        />
                        {showDestinationDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowDestinationDropdown(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {destinations
                                .filter(dest =>
                                  dest.toLowerCase().includes((formData.destinations || '').toLowerCase())
                                )
                                .map((destination) => (
                                  <button
                                    key={destination}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlers.setDestinations(destination);
                                      setShowDestinationDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors text-white ${(formData.destinations || '') === destination ? 'bg-yellow-500/20' : ''
                                      }`}
                                  >
                                    {destination}
                                  </button>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 text-[10px] mt-1">
                        Select the primary destination where you operate
                      </p>
                    </div>

                    {/* Years of Experience (Full Width) */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Years of Experience *
                      </label>
                      <input
                        type="number"
                        value={formData.experience}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Prevent 0 and ensure minimum is 1
                          if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 50)) {
                            handlers.setExperience(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Prevent typing 0 as first digit
                          if (e.key === '0' && e.target.value === '') {
                            e.preventDefault();
                          }
                        }}
                        required
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                        placeholder="Enter years of experience"
                      />
                    </div>

                    {/* Languages Spoken */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Languages Spoken
                      </label>
                      <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                        {languages.map(language => (
                          <div key={language} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`guide-lang-${language}`}
                              checked={formData.languages?.includes(language) || false}
                              onChange={(e) => handleMultiSelectChange('languages', language)}
                              className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                            />
                            <label htmlFor={`guide-lang-${language}`} className="text-white text-xs">
                              {language}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Areas of Expertise (Multi-select) */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Areas of Expertise
                      </label>
                      <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                        {areasOfExpertise.map(area => (
                          <div key={area} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`area-${area}`}
                              checked={formData.areasOfExpertise?.includes(area) || false}
                              onChange={(e) => handleMultiSelectChange('areasOfExpertise', area)}
                              className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                            />
                            <label htmlFor={`area-${area}`} className="text-white text-xs">
                              {area}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Certifications (Multi-select) - Only shown for certified providers */}
                    {formData.certificationStatus === 'certified' && (
                      <div className="space-y-1 border-2 border-yellow-500/40 rounded-lg p-3 bg-yellow-500/5">
                        <label className="flex items-center gap-2 text-yellow-400 font-semibold text-xs">
                          Certifications *
                          <span className="text-yellow-300/70 text-[10px] font-normal">(Upload at least one certification)</span>
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5 space-y-2">
                          {certifications.map(cert => (
                            <div key={cert} className="space-y-1">
                              <div className="flex items-center mb-1">
                                <input
                                  type="checkbox"
                                  id={`guide-cert-${cert}`}
                                  checked={formData.certifications?.includes(cert) || false}
                                  onChange={(e) => handleMultiSelectChange('certifications', cert)}
                                  className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                                />
                                <label htmlFor={`guide-cert-${cert}`} className="text-white text-xs">
                                  {cert}
                                </label>
                              </div>
                              {formData.certifications?.includes(cert) && (
                                <div className="ml-5 mt-1">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={(e) => onCertificationFileSelect(cert, e)}
                                    required
                                    className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-400 file:text-black hover:file:bg-yellow-500 text-xs"
                                  />
                                  {certificationFiles[cert] && (
                                    <p className="text-xs text-green-400 mt-1">✓ {certificationFiles[cert].name}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-yellow-300/70 mt-2">
                          ⚠️ At least one certification with uploaded document is required for certified providers
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Jeep Driver Specific Fields */}
                {!isTourGuide && (
                  <>
                    {/* Destination (Custom dropdown for Jeep Driver) */}
                    <div className="space-y-1 relative">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Destination *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.destinations || ""}
                          onChange={(e) => {
                            handlers.setDestinations(e.target.value);
                            setShowDestinationDropdown(true);
                          }}
                          onFocus={() => setShowDestinationDropdown(true)}
                          required
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                          placeholder="Type to search destinations..."
                          autoComplete="off"
                        />
                        <ChevronDown
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 cursor-pointer"
                          onClick={() => setShowDestinationDropdown(!showDestinationDropdown)}
                        />
                        {showDestinationDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowDestinationDropdown(false)}
                            />
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {destinations
                                .filter(dest =>
                                  dest.toLowerCase().includes((formData.destinations || '').toLowerCase())
                                )
                                .map((destination) => (
                                  <button
                                    key={destination}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handlers.setDestinations(destination);
                                      setShowDestinationDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors text-white ${(formData.destinations || '') === destination ? 'bg-yellow-500/20' : ''
                                      }`}
                                  >
                                    {destination}
                                  </button>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-gray-400 text-[10px] mt-1">
                        Select the primary destination where you operate
                      </p>
                    </div>

                    {/* Years of Experience (Full Width) */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Years of Experience *
                      </label>
                      <input
                        type="number"
                        value={formData.experience}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Prevent 0 and ensure minimum is 1
                          if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 50)) {
                            handlers.setExperience(value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Prevent typing 0 as first digit
                          if (e.key === '0' && e.target.value === '') {
                            e.preventDefault();
                          }
                        }}
                        required
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                        placeholder="Enter years of experience"
                      />
                    </div>

                    {/* Languages Spoken (Multi-select) */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Languages Spoken
                      </label>
                      <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                        {languages.map(language => (
                          <div key={language} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`lang-${language}`}
                              checked={formData.languages?.includes(language) || false}
                              onChange={(e) => handleMultiSelectChange('languages', language)}
                              className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                            />
                            <label htmlFor={`lang-${language}`} className="text-white text-xs">
                              {language}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special Skills (Multi-select) */}
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 text-white font-medium text-xs">
                        Special Skills
                      </label>
                      <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                        {specialSkills.map(skill => (
                          <div key={skill} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`skill-${skill}`}
                              checked={formData.specialSkills?.includes(skill) || false}
                              onChange={(e) => handleMultiSelectChange('specialSkills', skill)}
                              className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                            />
                            <label htmlFor={`skill-${skill}`} className="text-white text-xs">
                              {skill}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Certifications (Multi-select) - Only shown for certified providers */}
                    {formData.certificationStatus === 'certified' && (
                      <div className="space-y-1 border-2 border-yellow-500/40 rounded-lg p-3 bg-yellow-500/5">
                        <label className="flex items-center gap-2 text-yellow-400 font-semibold text-xs">
                          Certifications *
                          <span className="text-yellow-300/70 text-[10px] font-normal">(Upload at least one certification)</span>
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5 space-y-2">
                          {certifications.map(cert => (
                            <div key={cert} className="space-y-1">
                              <div className="flex items-center mb-1">
                                <input
                                  type="checkbox"
                                  id={`cert-${cert}`}
                                  checked={formData.certifications?.includes(cert) || false}
                                  onChange={(e) => handleMultiSelectChange('certifications', cert)}
                                  className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                                />
                                <label htmlFor={`cert-${cert}`} className="text-white text-xs">
                                  {cert}
                                </label>
                              </div>
                              {formData.certifications?.includes(cert) && (
                                <div className="ml-5 mt-1">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,image/*"
                                    onChange={(e) => onCertificationFileSelect(cert, e)}
                                    required
                                    className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-400 file:text-black hover:file:bg-yellow-500 text-xs"
                                  />
                                  {certificationFiles[cert] && (
                                    <p className="text-xs text-green-400 mt-1">✓ {certificationFiles[cert].name}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-yellow-300/70 mt-2">
                          ⚠️ At least one certification with uploaded document is required for certified providers
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Service Provider Bio */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Service Provider Bio
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handlers.setDescription(e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                    placeholder="Describe your services, expertise, and what makes you unique..."
                  />
                </div>

              </>
            )}

            {/* Profile Picture */}
            {(isTourist || formData.serviceType) && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <Camera className="h-3 w-3 text-yellow-400" />
                  Profile Picture (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {profilePreview && (
                    <img src={profilePreview} alt="Profile preview" className="w-8 h-8 rounded-full object-cover border border-yellow-400" />
                  )}
                  <input
                    type="file"
                    onChange={onProfileImageSelect}
                    accept="image/*"
                    className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-400 file:text-black hover:file:bg-yellow-500 text-xs"
                  />
                </div>
                <p className="text-xs text-gray-400">Max file size: 2MB</p>
              </div>
            )}

            {/* Close the main conditional wrapper */}
          </>
        )}

        {/* Submit Button */}
        {(isTourist || formData.serviceType) && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {busy ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                isTourist ? "Create Tourist Account" : "Register as Provider"
              )}
            </button>
          </div>
        )}
      </form>

      {msg && (
        <div className={`mt-3 p-2 rounded text-center text-xs font-medium ${msg.includes("❌")
          ? "bg-red-500/20 text-red-300 border border-red-500/30"
          : msg.includes("⏳")
            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
            : "bg-green-500/20 text-green-300 border border-green-500/30"
          }`}>
          {msg}
        </div>
      )}
    </div>
  );
};

export default App;