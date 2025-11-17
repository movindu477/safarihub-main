import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Clock, 
  Shield, 
  Award, 
  Languages, 
  Calendar,
  MessageCircle,
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Bell,
  X
} from "lucide-react";

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
  getUserNotifications,
  getConversationById,
  getOtherParticipant
} from "../App";

// Notification Bell Component for JeepProfile
const NotificationBell = ({ user, notifications, onNotificationClick, onMarkAsRead }) => {
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
    <div className="relative notification-container">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell size={24} />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {notifications.filter(n => !n.read).length}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {notifications.filter(n => !n.read).length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationItemClick(notification)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {notification.senderName || 'User'}
                    </h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-gray-600 text-xs mb-2">{notification.message}</p>
                  <p className="text-gray-400 text-xs">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Chat Modal Component
const ChatModal = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  otherUser, 
  currentUser, 
  onSendMessage 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      // Mark messages as read
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, isOpen, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending || !currentUser) return;

    try {
      setSending(true);
      
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: otherUser?.id,
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);
      setMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
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
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-yellow-100 text-sm">Online</p>
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
                        <span>
                          {msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
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

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  
  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  // Get driver ID from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const driverId = searchParams.get('driverId');
  const openChat = searchParams.get('openChat');

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if chat should be opened
  useEffect(() => {
    if (openChat === 'true' && driverId) {
      setActiveTab('chat');
    }
  }, [openChat, driverId]);

  // Format timestamp function
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate();
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  // Get current user and notifications
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Determine user role
        try {
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            setUserRole('tourist');
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
            if (providerDoc.exists()) {
              setUserRole('provider');
            }
          }
        } catch (error) {
          console.error('Error getting user role:', error);
        }

        // Load notifications
        const unsubscribeNotifications = getUserNotifications(user.uid, (notifications) => {
          setNotifications(notifications);
        });

        return () => unsubscribeNotifications();
      } else {
        setCurrentUser(null);
        setUserRole('');
        setNotifications([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Fetch driver data
  useEffect(() => {
    const fetchDriverData = async () => {
      if (!driverId) {
        setError("No driver ID provided");
        setLoading(false);
        return;
      }

      try {
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          setDriver({
            id: driverDoc.id,
            ...driverData
          });
          
          // Set online status
          setOnlineStatus(driverData.online || false);
        } else {
          setError("Driver not found");
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Failed to load driver information");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [driverId]);

  // Listen for real-time online status updates
  useEffect(() => {
    if (!driverId) return;

    const driverRef = doc(db, 'serviceProviders', driverId);
    const unsubscribe = onSnapshot(driverRef, (doc) => {
      if (doc.exists()) {
        const driverData = doc.data();
        setOnlineStatus(driverData.online || false);
        
        // Update driver data if needed
        setDriver(prev => prev ? { ...prev, ...driverData } : null);
      }
    });

    return () => unsubscribe();
  }, [driverId]);

  // Initialize conversation and load messages
  useEffect(() => {
    if (!currentUser || !driverId || !driver) return;

    const initializeConversation = async () => {
      try {
        const conversationId = await createOrGetConversation(
          currentUser.uid,
          driverId,
          currentUser.displayName || 'User',
          driver.fullName || 'Driver'
        );
        
        setConversationId(conversationId);
        
        // Mark existing messages as read
        await markMessagesAsRead(conversationId, currentUser.uid);
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initializeConversation();
  }, [currentUser, driverId, driver]);

  // Load messages for the conversation
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      // Mark new messages as read
      const unreadMessages = messagesData.filter(msg => 
        msg.senderId !== currentUser?.uid && !msg.read
      );
      
      if (unreadMessages.length > 0 && currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

  // Handle notification click - OPEN CHAT MODAL
  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark notification as read
    if (!notification.read) {
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true,
        readAt: serverTimestamp()
      });
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      // Open chat modal with the conversation
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && currentUser) {
        const otherUser = getOtherParticipant(conversation, currentUser.uid);
        setChatConversationId(notification.conversationId);
        setChatOtherUser(otherUser);
        setIsChatModalOpen(true);
      }
    } else if (notification.type === 'message' && driverId) {
      // If it's a message notification for this driver, open the chat tab
      setActiveTab('chat');
    }
  };

  // Open chat modal from button
  const handleOpenChatModal = () => {
    if (driver && currentUser) {
      setChatConversationId(conversationId);
      setChatOtherUser({
        id: driver.id,
        name: driver.fullName || 'Driver'
      });
      setIsChatModalOpen(true);
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Send message function
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser || !driverId || !conversationId || sending) return;

    setSending(true);
    
    try {
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: driverId,
        timestamp: new Date()
      };

      // Send the message
      await sendMessage(conversationId, messageData);

      // Create notification for the driver
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a tourist'}`,
        recipientId: driverId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        relatedId: conversationId,
        conversationId: conversationId
      });

      setMessage("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Render star ratings
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
      />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Online Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {onlineStatus ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Notification Bell */}
              <NotificationBell 
                user={currentUser}
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={driver.profilePicture || "/api/placeholder/120/120"}
                    alt={driver.fullName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-yellow-400 mx-auto mb-4"
                  />
                  <div className={`absolute bottom-4 right-4 w-4 h-4 rounded-full border-2 border-white ${
                    onlineStatus ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{driver.fullName}</h2>
                <p className="text-gray-600">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-2">
                  <div className="flex items-center">
                    {renderStars(driver.rating || 0)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({driver.rating?.toFixed(1) || '0.0'}/5)
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-600">
                    <Phone size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-600">
                    <Mail size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-600">
                    <MapPin size={18} className="mr-3 text-yellow-500" />
                    <span>{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {currentUser && userRole === 'tourist' && (
                  <button
                    onClick={handleOpenChatModal}
                    className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center"
                  >
                    <MessageCircle size={18} className="mr-2" />
                    Send Message
                  </button>
                )}
                
                {!currentUser && (
                  <button
                    onClick={() => navigate('/?showAuth=true')}
                    className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Login to Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="border-b">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'services'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Services & Rates
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm relative ${
                        activeTab === 'chat'
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages
                      {messages.filter(msg => 
                        msg.senderId === driverId && !msg.read
                      ).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {messages.filter(msg => 
                            msg.senderId === driverId && !msg.read
                          ).length}
                        </span>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start">
                      <Clock className="text-yellow-500 mt-1 mr-4" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900">Experience</h3>
                        <p className="text-gray-600">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start">
                        <Languages className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Languages</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destinations */}
                    {driver.destinations && driver.destinations.length > 0 && (
                      <div className="flex items-start">
                        <MapPin className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm border border-yellow-200"
                              >
                                {destination}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {driver.certifications && driver.certifications.length > 0 && (
                      <div className="flex items-start">
                        <Award className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Certifications</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Skills */}
                    {driver.specialSkills && driver.specialSkills.length > 0 && (
                      <div className="flex items-start">
                        <Shield className="text-yellow-500 mt-1 mr-4" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900">Special Skills</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Services & Rates Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    {/* Vehicle Type */}
                    {driver.vehicleType && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Vehicle Type</h3>
                        <p className="text-gray-600">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Rates</h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Price per day:</span>
                            <span className="text-2xl font-bold text-yellow-600">
                              LKR {driver.pricePerDay.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-gray-600">
                            Available on {driver.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {driver.availableDates.slice(0, 5).map((date, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm border border-green-200"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {driver.availableDates.length > 5 && (
                              <span className="text-gray-500 text-sm">
                                +{driver.availableDates.length - 5} more dates
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Contact for availability</p>
                      )}
                    </div>

                    {/* Service Description */}
                    {driver.description && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                        <p className="text-gray-600 leading-relaxed">{driver.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col">
                    {currentUser ? (
                      <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                              <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                              <p>No messages yet. Start a conversation!</p>
                            </div>
                          ) : (
                            messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    msg.senderId === currentUser.uid
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-yellow-100' 
                                      : 'text-gray-500'
                                  }`}>
                                    {formatTime(msg.timestamp)}
                                    {msg.senderId === currentUser.uid && (
                                      <span className="ml-1">
                                        {msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="flex space-x-2">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {sending ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Please login to start a conversation with {driver.fullName}
                        </p>
                        <button
                          onClick={() => navigate('/?showAuth=true')}
                          className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          Login Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JeepProfile;