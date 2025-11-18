import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { Bell, MessageCircle, X, Send, Check, CheckCheck, User, LogOut, Settings, Car } from "lucide-react";
import Navbar from "../Navbar";
import JeepHero from "./JeepHero";
import JeepSection2 from "./JeepSection2";

// Import Firebase functions
import { 
  auth,
  db,
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
  getUserNotifications,
  setupPageVisibilityHandler,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  where
} from "../../firebase";

// Enhanced Chat Modal Component
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!otherUser?.id) return;

    const userRef = doc(db, otherUser.role === 'tourist' ? 'tourists' : 'serviceProviders', otherUser.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const isOnline = userData.online || userData.isOnline || false;
        setOtherUserOnline(isOnline);
      }
    });

    return () => unsubscribe();
  }, [otherUser]);

  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
        
        messagesData.forEach(msg => {
          if (msg.senderId === currentUser.uid && !msg.delivered) {
            markMessageAsDelivered(conversationId, msg.id);
          }
        });
      }
    });

    return () => {
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

      await sendMessage(conversationId, messageData);

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
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  
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

// Global Notification Bell Component
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
      <div className="relative">
        {showNotifications && (
          <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 max-h-96 overflow-hidden bg-white rounded-xl shadow-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {notifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs bg-white text-yellow-600 px-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                          !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          {notification.content && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {notification.content}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {notification.timestamp?.toDate ? 
                              notification.timestamp.toDate().toLocaleDateString() : 
                              'Recently'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

// Mark message as delivered function
const markMessageAsDelivered = async (conversationId, messageId) => {
  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      delivered: true,
      deliveredAt: serverTimestamp(),
      deliveredTimestamp: Date.now()
    });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
  }
};

// Jeep Driver Status Component
const JeepDriverStatus = ({ user, userRole, onToggleStatus, currentStatus }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onToggleStatus();
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || userRole !== 'jeep_driver') return null;

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full animate-pulse ${
          currentStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
        <span className="text-sm font-medium text-gray-700">
          {currentStatus === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
          currentStatus === 'online' 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : currentStatus === 'online' ? (
          'Go Offline'
        ) : (
          'Go Online'
        )}
      </button>
    </div>
  );
};

export default function JeepMain({ user, userRole, onLogout, notifications, onNotificationClick, onMarkAsRead }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [driverStatus, setDriverStatus] = useState('offline');
  const [loading, setLoading] = useState(true);
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Enhanced online/offline status management for Jeep Drivers
  useEffect(() => {
    let cleanupVisibilityHandler = null;
    let currentUserId = null;
    let currentUserRole = null;

    const initializeDriverStatus = async () => {
      if (user && userRole === 'jeep_driver') {
        try {
          currentUserId = user.uid;
          currentUserRole = userRole;

          // Set driver online when component mounts
          console.log(`🚙 Jeep Driver ${user.uid} logging in, setting online`);
          await setUserOnline(user.uid, userRole, {
            userName: user.displayName || 'Jeep Driver',
            email: user.email,
            lastActive: new Date()
          });
          
          setDriverStatus('online');
          
          // Set up page visibility handler for automatic status management
          cleanupVisibilityHandler = setupPageVisibilityHandler(user.uid, userRole);
          
          console.log(`✅ Jeep Driver ${user.uid} is now online`);
        } catch (error) {
          console.error('Error setting driver online:', error);
        }
      }
      setLoading(false);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (currentUserId && currentUserId !== user?.uid) {
        await setUserOffline(currentUserId, currentUserRole);
      }
      
      setCurrentUser(user);
      
      if (user) {
        currentUserId = user.uid;
        
        try {
          let userRole = await getUserRole(user.uid);
          let userName = user.displayName || 'User';
          
          if (!userRole) {
            userRole = 'tourist';
          }
          
          currentUserRole = userRole;
          
          await setUserOnline(user.uid, userRole, {
            userName: userName,
            email: user.email,
          });
        } catch (error) {
          console.log('Error setting user online status in JeepMain:', error);
        }
      } else {
        currentUserId = null;
        currentUserRole = null;
      }
    });

    initializeDriverStatus();

    return () => {
      // Cleanup function - set offline when component unmounts
      if (currentUserId && currentUserRole === 'jeep_driver') {
        console.log(`🚙 Jeep Driver ${currentUserId} dashboard unmounting, setting offline`);
        setUserOffline(currentUserId, currentUserRole);
      }
      
      if (cleanupVisibilityHandler) {
        cleanupVisibilityHandler();
      }
      
      unsubscribeAuth();
    };
  }, [user, userRole]);

  const handleToggleStatus = async () => {
    if (!user || userRole !== 'jeep_driver') return;
    
    try {
      if (driverStatus === 'online') {
        await setUserOffline(user.uid, userRole);
        setDriverStatus('offline');
        console.log(`🔴 Jeep Driver ${user.uid} manually set offline`);
      } else {
        await setUserOnline(user.uid, userRole);
        setDriverStatus('online');
        console.log(`🟢 Jeep Driver ${user.uid} manually set online`);
      }
    } catch (error) {
      console.error('Error toggling driver status:', error);
    }
  };

  const handleLogout = async () => {
    if (user && userRole === 'jeep_driver') {
      console.log(`🚙 Jeep Driver ${user.uid} manually logging out`);
      await setUserOffline(user.uid, userRole);
    }
    onLogout();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && user) {
        const otherUser = getOtherParticipant(conversation, user.uid);
        if (otherUser) {
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
        }
      }
    } else if (notification.type === 'message' && notification.relatedId) {
      const participantIds = notification.relatedId.split('_');
      const otherParticipantId = participantIds.find(id => id !== user.uid);
      
      if (otherParticipantId) {
        try {
          const providerDoc = await getDoc(doc(db, 'serviceProviders', otherParticipantId));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            setChatOtherUser({
              id: otherParticipantId,
              name: providerData.fullName || 'Driver',
              role: 'provider'
            });
            
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

  const handleNavigateToProfile = () => {
    navigate('/jeepprofile?driverId=' + user.uid);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Jeep Driver Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not a Jeep driver
  if (!user || userRole !== 'jeep_driver') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">🚙</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Jeep Drivers Only</h2>
          <p className="text-gray-600 mb-6">
            This section is exclusively for registered Jeep drivers. Please log in with a Jeep driver account to access the dashboard.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
      />
      
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={handleMarkAsRead}
      />
      
      {/* Enhanced Navbar with Driver Status */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Car className="h-8 w-8 text-yellow-500 mr-2" />
                <span className="text-xl font-bold text-gray-900">SafariHub Drivers</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Jeep Driver Status */}
              <JeepDriverStatus 
                user={user}
                userRole={userRole}
                onToggleStatus={handleToggleStatus}
                currentStatus={driverStatus}
              />
              
              {/* Navigation Buttons */}
              <button
                onClick={handleNavigateToProfile}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium flex items-center"
              >
                <User className="h-4 w-4 mr-2" />
                My Profile
              </button>
              
              <button
                onClick={handleLogout}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Driver Status Banner */}
      <div className={`py-3 px-4 ${
        driverStatus === 'online' 
          ? 'bg-green-50 border-b border-green-200' 
          : 'bg-gray-50 border-b border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                driverStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <p className={`text-sm font-medium ${
                driverStatus === 'online' ? 'text-green-800' : 'text-gray-600'
              }`}>
                {driverStatus === 'online' 
                  ? 'You are currently online and visible to tourists' 
                  : 'You are currently offline and not visible to tourists'
                }
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
      
      <JeepHero />
      <div className="h-1 bg-black"></div>
      <JeepSection2 />
    </div>
  );
}

export { getUserNotifications };