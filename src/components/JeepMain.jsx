import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { Bell, MessageCircle, X, Send, Check, CheckCheck, User, Wifi, WifiOff } from "lucide-react";
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
  GlobalNotificationBell,
  markMessageAsDelivered,
  setupPageVisibilityHandler,
  setupUserHeartbeat
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
  const [otherUserStatus, setOtherUserStatus] = useState('offline');
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enhanced: Monitor other user's online status in real-time with better error handling
  useEffect(() => {
    if (!otherUser?.id) return;

    console.log(`👀 Setting up real-time status monitor for ${otherUser.name} (${otherUser.id})`);

    const userRef = doc(db, otherUser.role === 'tourist' ? 'tourists' : 'serviceProviders', otherUser.id);
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          const isOnline = userData.online || userData.isOnline || false;
          const status = userData.status || 'offline';
          
          setOtherUserOnline(isOnline);
          setOtherUserStatus(status);
          
          console.log(`👀 ${otherUser.name} status: ${isOnline ? 'Online' : 'Offline'} (${status})`);
        }
      },
      (error) => {
        console.error(`❌ Error monitoring ${otherUser.name} status:`, error);
      }
    );

    return () => {
      console.log(`🔴 Unsubscribing from ${otherUser.name} status monitor`);
      unsubscribe();
    };
  }, [otherUser]);

  // Enhanced: Load messages when conversation changes - REAL-TIME with better error handling
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    console.log(`📨 Loading messages for conversation: ${conversationId}`);

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      console.log(`📬 Received ${messagesData.length} messages for conversation ${conversationId}`);
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

  // Get status display text
  const getStatusDisplay = () => {
    if (otherUserOnline) {
      return 'Online • Active now';
    }
    return 'Offline • Will see your message later';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                otherUserOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm flex items-center gap-1">
                {otherUserOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Online • Active now</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline • Will see your message later</span>
                  </>
                )}
                <span className="mx-1">•</span>
                <span>{otherUser?.role === 'tourist' ? 'Tourist' : 'Service Provider'}</span>
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
              <MessageCircle className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No messages yet</p>
              <p className="text-sm text-gray-500 mt-1">Start a conversation with {otherUser?.name || 'this user'}</p>
              <p className={`text-xs mt-3 px-3 py-1 rounded-full ${
                otherUserOnline 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {otherUserOnline ? '🟢 User is online and active' : '⚫ User is offline - they will see your message when they come online'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
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
                            ? 'bg-yellow-500 text-white rounded-br-none shadow-md'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
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

        {/* Enhanced Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={otherUserOnline ? `Message ${otherUser?.name || 'User'}...` : `${otherUser?.name || 'User'} is offline - they will see your message later`}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-300"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-yellow-500 text-white p-3 rounded-full hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          {!otherUserOnline && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 This user is currently offline. They will receive your message when they come back online.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

// Enhanced notification management function
const getUserNotifications = (userId, callback) => {
  try {
    console.log(`🔔 Setting up notifications listener for user: ${userId}`);
    
    const notificationsRef = collection(db, 'notifications');
    const notificationsQuery = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, 
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`📢 Received ${notifications.length} notifications for user ${userId}`);
        callback(notifications);
      },
      (error) => {
        console.error('❌ Error in notifications snapshot:', error);
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

export default function JeepMain({ user, onLogin, onRegister, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Enhanced logout handler for JeepMain
  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out from JeepMain...');
      
      // Set user offline in Firebase
      if (currentUser && userRole) {
        await setUserOffline(currentUser.uid, userRole);
      }
      
      // Sign out from Firebase Auth
      await signOut(auth);
      
      // Clear local state
      setCurrentUser(null);
      setUserRole(null);
      
      console.log('✅ Successfully logged out from JeepMain');
      
      // Force page refresh to ensure clean state and show login/register buttons
      window.location.href = '/'; // Redirect to home page
      
    } catch (error) {
      console.error('❌ Logout error in JeepMain:', error);
      // Even if there's an error, still redirect to home
      window.location.href = '/';
    }
  };

  // Enhanced: Get current user and set online status with proper cleanup
  useEffect(() => {
    let currentUserId = null;
    let currentUserRole = null;
    let cleanupVisibilityHandler = null;
    let cleanupHeartbeat = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log(`🔐 JeepMain Auth state changed:`, user ? `User ${user.uid} logged in` : 'User logged out');
      
      // Set previous user offline if exists
      if (currentUserId && currentUserId !== user?.uid) {
        console.log(`🔄 Setting previous user ${currentUserId} offline from JeepMain`);
        await setUserOffline(currentUserId, currentUserRole);
        
        // Clean up previous handlers
        if (cleanupVisibilityHandler) {
          cleanupVisibilityHandler();
        }
        if (cleanupHeartbeat) {
          cleanupHeartbeat();
        }
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
          
          currentUserRole = userRole;
          setUserRole(userRole);
          
          // Set user online immediately
          await setUserOnline(user.uid, userRole, {
            userName: userName,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
          
          console.log(`✅ User ${user.uid} set online in JeepMain as ${userRole}`);
          
          // Set up page visibility handler for real-time status updates
          cleanupVisibilityHandler = setupPageVisibilityHandler(user.uid, userRole);
          
          // Set up heartbeat to keep user online while active
          cleanupHeartbeat = setupUserHeartbeat(user.uid, userRole);
          
        } catch (error) {
          console.log('❌ Error setting user online status in JeepMain:', error);
        }
      } else {
        currentUserId = null;
        currentUserRole = null;
        setUserRole(null);
      }
    });

    return () => {
      console.log('🔴 Cleaning up JeepMain auth listener');
      if (currentUserId) {
        setUserOffline(currentUserId, currentUserRole);
      }
      if (cleanupVisibilityHandler) {
        cleanupVisibilityHandler();
      }
      if (cleanupHeartbeat) {
        cleanupHeartbeat();
      }
      unsubscribeAuth();
    };
  }, []);

  // Enhanced: Handle notification click with better error handling
  const handleNotificationClick = async (notification) => {
    console.log('🔘 JeepMain Notification clicked:', notification);
    
    try {
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
            console.log(`💬 Opening chat with ${otherUser.name} from notification`);
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
              console.log(`💬 Created new conversation with ${providerData.fullName || 'Driver'}`);
            }
          } catch (error) {
            console.error('❌ Error handling legacy notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling notification click:', error);
      alert('Failed to open conversation. Please try again.');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      console.log(`✅ Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Enhanced: Handle page unload to set user offline
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentUser && userRole) {
        console.log(`📴 Page unloading, setting user ${currentUser.uid} offline`);
        await setUserOffline(currentUser.uid, userRole);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, userRole]);

  // Handle login navigation for JeepMain
  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate('/');
    }
  };

  // Handle register navigation for JeepMain
  const handleRegisterClick = () => {
    if (onRegister) {
      onRegister();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Chat Modal */}
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
      
      {/* Enhanced Navbar with proper logout handling */}
      <Navbar 
        user={user} 
        onLogin={handleLoginClick} 
        onRegister={handleRegisterClick} 
        onLogout={handleLogout} 
      />
      
      {/* Jeep Hero Section */}
      <JeepHero />
      
      {/* Divider */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg"></div>
      
      {/* Jeep Section with Drivers List */}
      <JeepSection2 />
    </div>
  );
}

export { getUserNotifications };