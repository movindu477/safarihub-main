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
  markNotificationAsRead
} from "../App";

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
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const messagesEndRef = React.useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitor other user's online status
  useEffect(() => {
    if (!otherUser?.id) return;

    const userRef = doc(db, otherUser.role === 'tourist' ? 'tourists' : 'serviceProviders', otherUser.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setOtherUserOnline(doc.data().online || false);
      }
    });

    return () => unsubscribe();
  }, [otherUser]);

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
            <div className="space-y-3">
              {messages.map((msg) => (
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

// Global Notification Bell for Bottom Right Corner
const GlobalNotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
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
    // Mark as read when clicked
    if (!notification.read && onMarkAsRead) {
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60);
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Recently';
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 notification-container">
      <div className="relative">
        {/* Notification Panel - Positioned ABOVE the button */}
        {showNotifications && (
          <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Notifications</h3>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-yellow-100 text-sm">
                    {notifications.filter(n => !n.read).length} unread
                  </p>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-yellow-200 hover:text-white text-xs underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications yet</p>
                    <p className="text-sm mt-1">Notifications will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationItemClick(notification)}
                        className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                          notification.read ? 'bg-white' : 'bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-medium text-sm ${
                                notification.read ? 'text-gray-600' : 'text-gray-900'
                              }`}>
                                {notification.senderName || 'User'}
                              </p>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <span>{formatTime(notification.timestamp)}</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {notification.message || 'New notification'}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                <span className="capitalize">
                                  {notification.type || 'message'}
                                </span>
                              </span>
                              
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notification Bell Button */}
        <button
          onClick={handleBellClick}
          className="relative bg-yellow-500 p-4 rounded-full shadow-lg border-2 border-white hover:shadow-xl transition-all duration-300 hover:scale-110"
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

export default function JeepMain({ user, onLogin, onRegister, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Get current user
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  // Load notifications when user is logged in
  useEffect(() => {
    if (user) {
      console.log(`🔔 Setting up notifications listener for user: ${user.uid}`);
      
      const unsubscribe = getUserNotifications(user.uid, (notifications) => {
        console.log(`📢 Received ${notifications.length} notifications`);
        setNotifications(notifications);
      });
      
      return () => {
        console.log(`🔴 Unsubscribing from notifications for user: ${user.uid}`);
        unsubscribe();
      };
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    console.log('🔘 Notification clicked:', notification);
    
    // Mark notification as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
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