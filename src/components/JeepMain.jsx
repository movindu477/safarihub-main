import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Bell, MessageCircle, X, Send, Check, CheckCheck, User } from "lucide-react";
import Navbar from "./Navbar";
import JeepHero from "./JeepHero";
import JeepSection2 from "./JeepSection2";

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

// Import Firebase functions from App
import { 
  createOrGetConversation, 
  sendMessage, 
  getMessages, 
  markMessagesAsRead, 
  createNotification,
  getConversationById,
  getOtherParticipant,
  markNotificationAsRead,
  setUserOnline,
  setUserOffline,
  getUserRole,
  GlobalNotificationBell
} from "../App";

// Enhanced Chat Modal Component with Real-time Features
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
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitor other user's online status in real-time
  useEffect(() => {
    if (!otherUser?.id) return;

    const userRef = doc(db, otherUser.role === 'tourist' ? 'tourists' : 'serviceProviders', otherUser.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const isOnline = userData.online || userData.isOnline || false;
        setOtherUserOnline(isOnline);
        console.log(`👀 ${otherUser.name} online status: ${isOnline}`);
      }
    });

    return () => unsubscribe();
  }, [otherUser]);

  // Load messages when conversation changes - REAL-TIME
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    console.log(`📨 Loading messages for conversation: ${conversationId}`);

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      console.log(`📬 Received ${messagesData.length} messages`);
      setMessages(messagesData);
      
      // Mark messages as read and delivered in real-time
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
        receiverName: otherUser.name,
        timestamp: new Date(),
        messageType: 'text'
      };

      console.log(`📤 Sending message to ${otherUser.name}: ${message.trim()}`);
      
      // Send the message - This will trigger real-time updates on all devices
      await sendMessage(conversationId, messageData);

      // Create notification for the recipient
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a user'}`,
        content: message.trim(),
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
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
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                otherUserOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm">
                {otherUserOnline ? 'Online' : 'Offline'} • {otherUser?.role === 'tourist' ? 'Tourist' : 'Service Provider'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
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
              <p className="text-xs text-gray-400 mt-2">
                {otherUserOnline ? 'User is online' : 'User is offline - they will see your message when they come online'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  
                  {/* Messages for this date */}
                  {dateMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          msg.senderId === currentUser?.uid
                            ? 'bg-yellow-500 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className={`flex items-center space-x-2 mt-1 text-xs ${
                          msg.senderId === currentUser?.uid ? 'text-yellow-100' : 'text-gray-500'
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
              className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

// Notification management function
const getUserNotifications = (userId, callback) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`🔔 Received ${notifications.length} notifications for user ${userId}`);
      callback(notifications);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting notifications:', error);
    callback([]);
    return () => {};
  }
};

export default function JeepMain({ user, onLogin, onRegister, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Get current user and set online status
  useEffect(() => {
    let currentUserId = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log(`🔐 JeepMain Auth state changed:`, user ? `User ${user.uid} logged in` : 'User logged out');
      
      // Set previous user offline if exists
      if (currentUserId && currentUserId !== user?.uid) {
        console.log(`🔄 Setting previous user ${currentUserId} offline from JeepMain`);
        await setUserOffline(currentUserId);
      }
      
      setCurrentUser(user);
      
      if (user) {
        currentUserId = user.uid;
        
        try {
          // Determine user role and set online status
          let userRole = await getUserRole(user.uid);
          let userName = user.displayName || 'User';
          
          if (!userRole) {
            // If no role found, default to tourist
            userRole = 'tourist';
          }
          
          await setUserOnline(user.uid, userRole, {
            userName: userName,
            email: user.email,
          });
          
          console.log(`✅ User ${user.uid} set online in JeepMain as ${userRole}`);
        } catch (error) {
          console.log('Error setting user online status in JeepMain:', error);
        }
      } else {
        currentUserId = null;
      }
    });

    return () => {
      if (currentUserId) {
        setUserOffline(currentUserId);
      }
      unsubscribeAuth();
    };
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    console.log('🔘 Notification clicked:', notification);
    
    // Mark notification as read
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      // Open chat modal with the conversation
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && user) {
        const otherUser = getOtherParticipant(conversation, user.uid);
        if (otherUser) {
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
          console.log(`💬 Opening chat with ${otherUser.name}`);
        }
      }
    } else if (notification.type === 'message' && notification.relatedId) {
      // Handle legacy notification format
      const participantIds = notification.relatedId.split('_');
      const otherParticipantId = participantIds.find(id => id !== user.uid);
      
      if (otherParticipantId) {
        // Try to get user data to open chat
        try {
          // Check if it's a service provider
          const providerDoc = await getDoc(doc(db, 'serviceProviders', otherParticipantId));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            setChatOtherUser({
              id: otherParticipantId,
              name: providerData.fullName || 'Driver',
              role: 'provider'
            });
            
            // Create or get conversation
            const conversationId = await createOrGetConversation(
              user.uid,
              otherParticipantId,
              user.displayName || 'User',
              providerData.fullName || 'Driver'
            );
            
            setChatConversationId(conversationId);
            setIsChatModalOpen(true);
          }
        } catch (error) {
          console.error('Error handling notification:', error);
        }
      }
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
      />
      
      {/* Global Notification Bell (Bottom Right) */}
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkAsRead}
      />
      
      <Navbar 
        user={user} 
        onLogin={onLogin || onShowAuth} 
        onRegister={onRegister || onShowAuth} 
        onLogout={onLogout} 
      />
      <JeepHero />
      <div className="h-1 bg-black"></div>
      <JeepSection2 />
    </div>
  );
}

export { getUserNotifications };