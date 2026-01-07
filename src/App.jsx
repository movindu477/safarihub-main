import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { Eye, EyeOff, Mail, Lock, User, MapPin, Phone, Globe, Camera, ChevronLeft, Bell, X, Send, Check, CheckCheck, MessageCircle, ArrowUp } from "lucide-react";

// Import images from src/assets
import logo from "./assets/logo.png";

// Import components
import Navbar from "./components/home/Navbar";
import Section1 from "./components/home/Section1";
import Section2 from "./components/home/Section2";
import Section3 from "./components/home/Section3";
import Section4 from "./components/home/Section4";
import Section5 from "./components/home/Section5";
import Footer from "./components/home/Footer";
import JeepDriversPage from "./components/jeepdrivers/JeepMain";
import JeepProfile from "./components/jeepdrivers/JeepProfile";
import NotificationPanel from "./components/NotificationPanel";

// Import Destination App
import DestinationApp from "./components/destination/App";
import DestinationDetails from "./components/destination/DestinationDetails";

// Import Guide App
import GuideApp from "./components/guides/App";
import GuideProfile from "./components/guides/GuideProfile";
import Payment from "./components/Payment";
import AboutUs from "./components/home/AboutUs";
import Admin from "./components/Admin";

// Import Chat components
import Chat from "./components/Chat";
import ChatList from "./components/ChatList";
import BookingSection from "./components/BookingSection";

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
export const storage = getStorage(app);

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
      statusUpdatedAt: serverTimestamp()
    });

    // Create notification for customer
    const statusMessage = status === 'accepted'
      ? `Your booking with ${providerName} has been accepted!`
      : `Your booking with ${providerName} has been declined.`;

    await createNotification({
      type: 'booking',
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: statusMessage,
      recipientId: customerId,
      senderId: providerId,
      senderName: providerName,
      relatedId: bookingId,
      bookingId: bookingId
    });

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
        className="bg-green-500 p-4 rounded-full shadow-lg border-2 border-white hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-green-600 cursor-pointer"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-6 w-6 text-white" />
      </button>
    </div>
  );
};

// Global Notification Bell Component (Available on all pages)
export const GlobalNotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);

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
    <div className="fixed bottom-6 left-6 z-50 notification-container">
      <div className="relative">
        {showNotifications && (
          <div className="absolute bottom-full left-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden">
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
          className="relative bg-green-500 p-4 rounded-full shadow-lg border-2 border-white hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-green-600 cursor-pointer"
        >
          <Bell className="h-6 w-6 text-white" />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>
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

      <GlobalNotificationBell
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />

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
          {/* Booking Panel - Positioned in hero section, scrolls with page */}
          {user && <BookingSection user={user} />}
        </Section1>
        <Section2 />
        <Section3 />
        <Section4 />
        <Section5 />
        <Footer />
      </div>

    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState('');

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
      window.location.href = '/';
    }
  };

  const [returnToPath, setReturnToPath] = useState(null);
  const [authInitialScreen, setAuthInitialScreen] = useState('login');

  const handleAuthSuccess = async (returnPath) => {
    setShowAuth(false);

    // Check if user is a service provider and redirect to home if they're on restricted pages
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
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
    setAuthInitialScreen(initialScreen); // Store the initial screen
    setShowAuth(true);
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

  if (showAuth) {
    return <Authentication onAuthSuccess={handleAuthSuccess} returnToPath={returnToPath} initialScreen={authInitialScreen} onBackToHome={() => setShowAuth(false)} />;
  }


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
    <Router>
      <ScrollToTop />

      {/* Welcome Message - Shows on all pages */}
      {showWelcomeMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 min-w-[300px] max-w-md">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Welcome back!</h3>
              <p className="text-sm text-green-100">Hello, {welcomeUserName || 'User'}! 👋</p>
            </div>
            <button
              onClick={() => setShowWelcomeMessage(false)}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Phone number formatting utility
const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('94')) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('0')) {
    return `+94${cleaned.substring(1)}`;
  }

  if (!cleaned.startsWith('+')) {
    return `+94${cleaned}`;
  }

  return phone;
};

// Phone number validation
const isValidSriLankanPhone = (phone) => {
  if (!phone) return false;

  const formatted = formatPhoneNumber(phone);
  const sriLankanRegex = /^\+94[0-9]{9}$/;
  return sriLankanRegex.test(formatted);
};

// Authentication Component
function Authentication({ onAuthSuccess, returnToPath, initialScreen = "login", onBackToHome }) {
  const [screen, setScreen] = useState(initialScreen);
  const [role, setRole] = useState(null);
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Common Fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Provider fields
  const [locationBase, setLocationBase] = useState("");
  const [experience, setExperience] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState("");
  const [serviceType, setServiceType] = useState("Jeep Driver");
  const [vehicleType, setVehicleType] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [destinations, setDestinations] = useState("");
  const [languages, setLanguages] = useState([]);
  const [specialSkills, setSpecialSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [certificationFiles, setCertificationFiles] = useState({}); // Map of cert name to File
  const [description, setDescription] = useState("");
  const [availableDates, setAvailableDates] = useState([]);

  // Tour Guide specific fields
  const [specialQualifications, setSpecialQualifications] = useState([]);
  const [areasOfExpertise, setAreasOfExpertise] = useState([]);
  const [verificationDocuments, setVerificationDocuments] = useState([]);
  const [verificationDocumentFiles, setVerificationDocumentFiles] = useState({}); // Map of doc name to File
  const [hourlyRate, setHourlyRate] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [specialPackageRates, setSpecialPackageRates] = useState("");
  const [currencyPreference, setCurrencyPreference] = useState("LKR");

  // Handle phone number input with formatting
  const handlePhoneChange = (value) => {
    const cleaned = value.replace(/[^\d+]/g, '');
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
    setLanguage("");
    setProfileFile(null);
    setProfilePreview(null);
    setLocationBase("");
    setExperience("");
    setLanguagesSpoken("");
    setServiceType("Jeep Driver");
    setVehicleType("");
    setPricePerDay("");
    setDestinations("");
    setLanguages([]);
    setSpecialSkills([]);
    setCertifications([]);
    setCertificationFiles({});
    setDescription("");
    setAvailableDates([]);
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
      email, fullName, phone, serviceType, vehicleType, experience, pricePerDay,
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
    if (role === 'provider' && phone && !isValidSriLankanPhone(phone)) {
      setMsg("❌ Please enter a valid Sri Lankan phone number (e.g., +94701234567)");
      return;
    }

    setBusy(true);
    setMsg("⏳ Creating your account...");

    try {
      console.log("Creating user with email:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      console.log("✅ User created with UID:", uid);

      // Format phone number for storage
      const formattedPhone = phone ? formatPhoneNumber(phone) : "";

      let userData = {
        uid,
        email,
        fullName: fullName.trim(),
        phone: formattedPhone,
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

        // Base provider data
        userData = {
          ...userData,
          location: locationBase?.trim() || "",
          experienceYears: experience ? parseInt(experience) : 0,
          serviceType: serviceType || "Jeep Driver",
          vehicleType: vehicleType || "",
          pricePerDay: pricePerDay ? parseInt(pricePerDay) : 0,
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
            availableDates: availableDates || [],
            description: description?.trim() || "",
            featured: false,
          };
        }
      }

      console.log("Saving user data to collection:", collectionName);
      console.log("User data:", userData);

      await setDoc(doc(db, collectionName, uid), userData);
      console.log("✅ User data saved to Firestore successfully!");

      // Handle profile picture upload
      let photoURL = null;
      if (profileFile) {
        try {
          console.log("📸 Uploading profile picture...");
          const ext = profileFile.name.split(".").pop();
          const storageRef = sRef(storage, `profile-pictures/${role === 'tourist' ? 'tourists' : 'service-providers'}/${uid}.${ext}`);
          const snap = await uploadBytes(storageRef, profileFile);
          photoURL = await getDownloadURL(snap.ref);

          await setDoc(doc(db, collectionName, uid), {
            profilePicture: photoURL,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          await updateProfile(userCredential.user, {
            displayName: fullName,
            photoURL: photoURL
          });

          console.log("✅ Profile picture uploaded successfully");
        } catch (uploadError) {
          console.error("❌ Profile image upload failed:", uploadError);
          // Continue without profile picture
        }
      } else {
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      }

      // Handle certification files upload (Jeep Drivers) - Save to separate collection
      if (serviceType !== "Tour Guide" && Object.keys(certificationFiles).length > 0) {
        try {
          console.log("📄 Uploading certification files for Jeep Driver...");
          const certificationUrls = {};
          const certificationDocs = [];

          for (const [certName, file] of Object.entries(certificationFiles)) {
            try {
              const ext = file.name.split(".").pop();
              const sanitizedCertName = certName.replace(/[^a-zA-Z0-9]/g, '_');
              const storageRef = sRef(storage, `jeep-driver-certifications/${uid}/${sanitizedCertName}.${ext}`);
              const snap = await uploadBytes(storageRef, file);
              const fileURL = await getDownloadURL(snap.ref);
              certificationUrls[certName] = fileURL;

              // Create document in jeepDriverCertifications collection
              const certDocRef = doc(db, 'jeepDriverCertifications', `${uid}_${sanitizedCertName}`);
              await setDoc(certDocRef, {
                providerId: uid,
                certificationName: certName,
                fileName: file.name,
                fileUrl: fileURL,
                fileSize: file.size,
                fileType: file.type || `application/${ext}`,
                uploadedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              certificationDocs.push(certDocRef.id);
              console.log(`✅ Uploaded and saved certification: ${certName}`);
            } catch (fileError) {
              console.error(`❌ Failed to upload certification ${certName}:`, fileError);
            }
          }

          // Also update serviceProviders document with URLs for backward compatibility
          if (Object.keys(certificationUrls).length > 0) {
            await setDoc(doc(db, collectionName, uid), {
              certificationUrls: certificationUrls,
              updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log("✅ Certification files uploaded and saved to Firestore collections successfully");
          }
        } catch (uploadError) {
          console.error("❌ Certification files upload failed:", uploadError);
          // Continue without certification files
        }
      }

      // Handle verification document files upload (Tour Guides) - Save to separate collection
      if (serviceType === "Tour Guide" && Object.keys(verificationDocumentFiles).length > 0) {
        try {
          console.log("📄 Uploading verification document files for Tour Guide...");
          const verificationDocumentUrls = {};
          const verificationDocs = [];

          for (const [docName, file] of Object.entries(verificationDocumentFiles)) {
            try {
              const ext = file.name.split(".").pop();
              const sanitizedDocName = docName.replace(/[^a-zA-Z0-9]/g, '_');
              const storageRef = sRef(storage, `guide-certifications/${uid}/${sanitizedDocName}.${ext}`);
              const snap = await uploadBytes(storageRef, file);
              const fileURL = await getDownloadURL(snap.ref);
              verificationDocumentUrls[docName] = fileURL;

              // Create document in guideCertifications collection
              const certDocRef = doc(db, 'guideCertifications', `${uid}_${sanitizedDocName}`);
              await setDoc(certDocRef, {
                providerId: uid,
                certificationName: docName,
                fileName: file.name,
                fileUrl: fileURL,
                fileSize: file.size,
                fileType: file.type || `application/${ext}`,
                uploadedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              verificationDocs.push(certDocRef.id);
              console.log(`✅ Uploaded and saved verification document: ${docName}`);
            } catch (fileError) {
              console.error(`❌ Failed to upload verification document ${docName}:`, fileError);
            }
          }

          // Also update serviceProviders document with URLs for backward compatibility
          if (Object.keys(verificationDocumentUrls).length > 0) {
            await setDoc(doc(db, collectionName, uid), {
              verificationDocumentUrls: verificationDocumentUrls,
              updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log("✅ Verification document files uploaded and saved to Firestore collections successfully");
          }
        } catch (uploadError) {
          console.error("❌ Verification document files upload failed:", uploadError);
          // Continue without verification document files
        }
      }

      setMsg("🎉 Account created successfully! Redirecting to login...");
      setBusy(false);

      setTimeout(() => {
        signOut(auth);
        setScreen("login");
        resetForm();
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
      await signInWithEmailAndPassword(auth, email, password);
      setMsg("✅ Welcome back! Redirecting...");
      setTimeout(() => {
        onAuthSuccess(returnToPath);
      }, 1000);
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
    } finally {
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

            {msg && (
              <div className={`mt-4 p-3 rounded-xl text-center text-sm font-medium ${msg.includes("❌")
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-green-500/20 text-green-300 border border-green-500/30"
                }`}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    );

  // Register Page
  if (screen === "register")
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          {/* Back Button */}
          {onBackToHome && (
            <button
              onClick={() => {
                if (role) {
                  setRole(null);
                  resetForm();
                } else {
                  onBackToHome();
                }
              }}
              className="absolute top-4 left-4 text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-2 text-sm transition-colors z-10"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to {role ? 'Selection' : 'Home'}
            </button>
          )}

          {!role ? (
            <UserTypeSelection onSelect={setRole} logo={logo} onBackToHome={onBackToHome} />
          ) : (
            <RegistrationForm
              role={role}
              serviceType={serviceType}
              formData={{
                email, fullName, password, confirm, country, phone, language,
                locationBase, experience, languagesSpoken, serviceType,
                vehicleType, pricePerDay,
                destinations: typeof destinations === 'string' ? destinations : (destinations && destinations.length > 0 ? destinations[0] : ""), // Convert array to string for single select
                languages,
                specialSkills, certifications, description,
                availableDates, specialQualifications, areasOfExpertise,
                verificationDocuments, hourlyRate, dailyRate, specialPackageRates, currencyPreference
              }}
              handlers={{
                setEmail, setFullName, setPassword, setConfirm, setCountry, setPhone: handlePhoneChange, setLanguage,
                setLocationBase, setExperience, setLanguagesSpoken, setServiceType,
                setVehicleType, setPricePerDay, setDestinations, setLanguages,
                setSpecialSkills, setCertifications, setDescription,
                setAvailableDates, setSpecialQualifications, setAreasOfExpertise,
                setVerificationDocuments, setHourlyRate, setDailyRate, setSpecialPackageRates, setCurrencyPreference
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
          )}
        </div>
      </div>
    );

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

  const isTourist = role === 'tourist';
  const isTourGuide = serviceType === "Tour Guide";

  const serviceTypes = [
    "Jeep Driver",
    "Tour Guide",
    "Renting"
  ];

  const vehicleTypes = [
    "Standard Safari Jeep",
    "Luxury Safari Jeep",
    "Open Roof Jeep",
    "4x4 Modified Jeep"
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
    "French", "German", "Chinese", "Japanese"
  ];

  const specialSkills = [
    "Wildlife photography knowledge",
    "Birdwatching expertise",
    "Family-friendly tours",
    "Private tours",
    "Full-day safari",
    "Half-day safari"
  ];

  const certifications = [
    "Wildlife Department Certified",
    "Tourism Board Licensed",
    "First Aid Certified",
    "Eco Tourism Certified"
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
    "Beaches & Coastal Areas",
    "Forest Reserves",
    "Camping Sites",
    "Wildlife Sanctuaries",
    "Cultural Heritage Sites",
    "Adventure Tourism",
    "Bird Watching Areas",
    "Historical Sites",
    "Mountain Regions"
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

  // Phone input helper text
  const getPhoneHelperText = () => {
    if (!formData.phone) return "Enter your Sri Lankan phone number";

    const formatted = formData.phone.startsWith('+') ? formData.phone : `+94${formData.phone.replace(/^0/, '')}`;
    const isValid = /^\+94[0-9]{9}$/.test(formatted);

    if (isValid) {
      return "✓ Valid Sri Lankan number";
    } else {
      return "Enter a valid Sri Lankan number (e.g., +94701234567)";
    }
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
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl max-h-[80vh] overflow-y-auto">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {isTourist ? 'Tourist Registration' : 'Service Provider Registration'}
        </h2>
        <p className="text-gray-300 text-xs mt-1">
          {isTourist ? 'Create your adventure account' : 'Join our network of service providers'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
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
              onChange={(e) => handlers.setFullName(e.target.value)}
              required
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
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <Phone className="h-3 w-3 text-yellow-400" />
              Phone Number {!isTourist && <span className="text-red-400">*</span>}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlers.setPhone(e.target.value)}
              required={!isTourist}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder="+94701234567"
            />
            <p className="text-xs text-gray-400 mt-1">
              {getPhoneHelperText()}
            </p>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-white font-medium text-xs">
              <MapPin className="h-3 w-3 text-yellow-400" />
              {isTourist ? 'Country' : 'Base Location'} *
            </label>
            <input
              type="text"
              value={isTourist ? formData.country : formData.locationBase}
              onChange={(e) => isTourist ? handlers.setCountry(e.target.value) : handlers.setLocationBase(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
              placeholder={isTourist ? 'Your country' : 'Your base city/location'}
            />
          </div>
        </div>

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
        {!isTourist && (
          <>
            {/* Service Type and Vehicle Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  <User className="h-3 w-3 text-yellow-400" />
                  Service Type *
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) => handlers.setServiceType(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                >
                  <option value="">Select Service Type</option>
                  {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type (only show for Jeep Driver) */}
              {formData.serviceType === "Jeep Driver" && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => handlers.setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                  >
                    <option value="">Select Vehicle Type</option>
                    {vehicleTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Experience and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-white font-medium text-xs">
                  Experience (Years) *
                </label>
                <input
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handlers.setExperience(e.target.value)}
                  required
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                  placeholder="Years of experience"
                />
              </div>

              {/* Price per Day (for Jeep Drivers) */}
              {formData.serviceType === "Jeep Driver" && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Price per Day (LKR)
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => handlers.setPricePerDay(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                    placeholder="e.g., 12000"
                  />
                </div>
              )}
            </div>

            {/* Tour Guide Specific Fields */}
            {isTourGuide && (
              <>
                {/* Special Qualifications (Multi-select) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Special Qualifications
                  </label>
                  <div className="max-h-24 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5">
                    {specialQualifications.map(qualification => (
                      <div key={qualification} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          id={`qual-${qualification}`}
                          checked={formData.specialQualifications?.includes(qualification) || false}
                          onChange={(e) => handleMultiSelectChange('specialQualifications', qualification)}
                          className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                        />
                        <label htmlFor={`qual-${qualification}`} className="text-white text-xs">
                          {qualification}
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

                {/* Verification Documents (Multi-select) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Verification Documents
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg p-2 bg-white/5 space-y-2">
                    {verificationDocuments.map(doc => (
                      <div key={doc} className="space-y-1">
                        <div className="flex items-center mb-1">
                          <input
                            type="checkbox"
                            id={`verif-${doc}`}
                            checked={formData.verificationDocuments?.includes(doc) || false}
                            onChange={(e) => handleMultiSelectChange('verificationDocuments', doc)}
                            className="mr-2 h-3 w-3 text-yellow-400 focus:ring-yellow-400 border-gray-300 rounded"
                          />
                          <label htmlFor={`verif-${doc}`} className="text-white text-xs">
                            {doc}
                          </label>
                        </div>
                        {formData.verificationDocuments?.includes(doc) && (
                          <div className="ml-5 mt-1">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,image/*"
                              onChange={(e) => onVerificationDocumentFileSelect(doc, e)}
                              className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-yellow-400 file:text-black hover:file:bg-yellow-500 text-xs"
                            />
                            {verificationDocumentFiles[doc] && (
                              <p className="text-xs text-green-400 mt-1">✓ {verificationDocumentFiles[doc].name}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-white font-medium text-xs">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => handlers.setHourlyRate(e.target.value)}
                      min="0"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                      placeholder="e.g., 2000"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-white font-medium text-xs">
                      Daily Rate
                    </label>
                    <input
                      type="number"
                      value={formData.dailyRate}
                      onChange={(e) => handlers.setDailyRate(e.target.value)}
                      min="0"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                      placeholder="e.g., 15000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-white font-medium text-xs">
                      Special Package Rates
                    </label>
                    <input
                      type="text"
                      value={formData.specialPackageRates}
                      onChange={(e) => handlers.setSpecialPackageRates(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                      placeholder="e.g., 3-day package: 40,000 LKR"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-white font-medium text-xs">
                      Currency Preference
                    </label>
                    <select
                      value={formData.currencyPreference}
                      onChange={(e) => handlers.setCurrencyPreference(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                    >
                      {currencyOptions.map(currency => (
                        <option key={currency} value={currency.split(' - ')[0]}>{currency}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Destination (Single-select for Tour Guide - same as Jeep Driver) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    National Park / Destination *
                  </label>
                  <select
                    value={formData.destinations || ""}
                    onChange={(e) => handlers.setDestinations(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                  >
                    <option value="">Select Your National Park</option>
                    {destinations.map(destination => (
                      <option key={destination} value={destination} className="bg-gray-800">
                        {destination}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-[10px] mt-1">
                    Select the primary destination you operate in
                  </p>
                </div>
              </>
            )}

            {/* Jeep Driver Specific Fields */}
            {!isTourGuide && (
              <>
                {/* Destination (Single-select for Jeep Driver - one park only) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    National Park / Destination *
                  </label>
                  <select
                    value={formData.destinations || ""}
                    onChange={(e) => handlers.setDestinations(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-yellow-400 text-xs"
                  >
                    <option value="">Select Your National Park</option>
                    {destinations.map(destination => (
                      <option key={destination} value={destination} className="bg-gray-800">
                        {destination}
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-[10px] mt-1">
                    Jeep drivers operate at one park location
                  </p>
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

                {/* Certifications (Multi-select) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-white font-medium text-xs">
                    Certifications
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
                </div>
              </>
            )}

            {/* Description */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-white font-medium text-xs">
                {isTourGuide ? 'Service Description' : 'Service Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handlers.setDescription(e.target.value)}
                rows="2"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-xs"
                placeholder={isTourGuide ? "Describe your guiding services, expertise, and what makes you unique..." : "Describe your services, expertise, and what makes you unique..."}
              />
            </div>
          </>
        )}

        {/* Profile Picture */}
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

        {/* Submit Button */}
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