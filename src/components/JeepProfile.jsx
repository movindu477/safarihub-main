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
  X,
  User,
  Wifi,
  WifiOff,
  Car,
  DollarSign,
  Calendar as CalendarIcon,
  ShieldCheck,
  Globe,
  Camera
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
  getOtherParticipant,
  markNotificationAsRead,
  GlobalNotificationBell,
  setUserOnline,
  setUserOffline,
  getUserRole
} from "../App";

// Enhanced Chat Modal Component with Modern Design
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
  const messagesEndRef = useRef(null);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <User className="h-6 w-6" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                otherUserOnline ? 'bg-emerald-400' : 'bg-gray-400'
              }`}></div>
            </div>
            <div>
              <h3 className="font-bold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-blue-100 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${otherUserOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></span>
                {otherUserOnline ? 'Online now' : 'Offline'} • {otherUser?.role === 'tourist' ? 'Tourist' : 'Service Provider'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Start a conversation with {otherUser?.name || 'this user'}
              </p>
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${otherUserOnline ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                {otherUserOnline ? 'User is online and ready to chat' : 'User is offline - they will see your message when they come online'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-6">
                    <span className="bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-4 py-2 rounded-full border border-gray-200/50 shadow-sm">
                      {date}
                    </span>
                  </div>
                  
                  {/* Messages for this date */}
                  {dateMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative transition-all duration-200 ${
                          msg.senderId === currentUser?.uid
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 rounded-br-md'
                            : 'bg-white text-gray-800 shadow-lg shadow-gray-200/50 border border-gray-100 rounded-bl-md'
                        } group-hover:shadow-xl group-hover:scale-[1.02]`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center space-x-2 mt-2 text-xs ${
                          msg.senderId === currentUser?.uid ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.senderId === currentUser?.uid && (
                            <span className="flex items-center space-x-1">
                              {msg.read ? (
                                <CheckCheck size={12} className="text-emerald-300" title="Read" />
                              ) : msg.delivered ? (
                                <CheckCheck size={12} className="text-blue-200" title="Delivered" />
                              ) : (
                                <Check size={12} className="text-blue-200" title="Sent" />
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
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center justify-center min-w-[48px]"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
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

const JeepProfile = ({ user, onLogout, notifications, onNotificationClick, onMarkAsRead }) => {
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

  // Check if chat should be opened from URL parameter
  useEffect(() => {
    if (openChat === 'true' && driverId && currentUser) {
      setActiveTab('chat');
      // Initialize conversation if needed
      initializeConversation();
    }
  }, [openChat, driverId, currentUser]);

  // Format timestamp function
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

  // Get current user and set online status
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Determine user role and set online status
        try {
          let userRole = 'tourist';
          let userData = {};
          
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            userRole = 'tourist';
            userData = touristDoc.data();
            setUserRole('tourist');
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
            if (providerDoc.exists()) {
              userRole = 'provider';
              userData = providerDoc.data();
              setUserRole('provider');
            }
          }
          
          await setUserOnline(user.uid, userRole, {
            userName: user.displayName || userData.fullName || 'User',
            email: user.email,
            ...userData
          });
          
          console.log(`✅ User ${user.uid} set online in JeepProfile as ${userRole}`);
        } catch (error) {
          console.log('Error setting user online status in JeepProfile:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
    });

    return () => {
      if (currentUser) {
        setUserOffline(currentUser.uid);
      }
      unsubscribeAuth();
    };
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

  // Initialize conversation
  const initializeConversation = async () => {
    if (!currentUser || !driverId || !driver) return;

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

  // Initialize conversation and load messages
  useEffect(() => {
    initializeConversation();
  }, [currentUser, driverId, driver]);

  // Load messages for the conversation - REAL-TIME
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
    console.log('🔘 JeepProfile notification clicked:', notification);
    
    // Mark notification as read
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      // Check if this notification is for the current driver
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && currentUser) {
        const otherUser = getOtherParticipant(conversation, currentUser.uid);
        
        if (otherUser.id === driverId) {
          // This notification is for the current driver profile
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
          console.log(`💬 Opening chat with ${otherUser.name} from notification`);
        } else {
          // This notification is for a different conversation
          // You could navigate to that driver's profile or show a different chat
          console.log('Notification for different conversation:', otherUser);
        }
      }
    }
  };

  // Open chat modal from button
  const handleOpenChatModal = () => {
    if (driver && currentUser) {
      setChatConversationId(conversationId);
      setChatOtherUser({
        id: driver.id,
        name: driver.fullName || 'Driver',
        role: 'provider'
      });
      setIsChatModalOpen(true);
    }
  };

  // Send message function - REAL-TIME
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
        receiverName: driver.fullName || 'Driver',
        timestamp: new Date(),
        messageType: 'text'
      };

      // Send the message - This will trigger real-time updates on all devices
      await sendMessage(conversationId, messageData);

      // Create notification for the driver
      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a tourist'}`,
        content: message.trim(),
        recipientId: driverId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        conversationId: conversationId,
        relatedId: conversationId
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
        size={18}
        className={i < Math.round(rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-24 h-24 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-4xl">⚠️</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Driver Not Found</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error || "The driver you're looking for doesn't exist or may have been removed."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
      />
      
      {/* Global Notification Bell */}
      <GlobalNotificationBell 
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-6 transition-colors duration-200 group"
              >
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Drivers
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Driver Profile
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Online Status */}
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50 shadow-sm">
                <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {onlineStatus ? 'Online Now' : 'Currently Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 sticky top-8 backdrop-blur-sm bg-white/90">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="relative">
                    <img
                      src={driver.profilePicture || "/api/placeholder/120/120"}
                      alt={driver.fullName}
                      className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg mx-auto mb-4"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
                  </div>
                  <div className={`absolute bottom-4 right-4 w-5 h-5 rounded-full border-2 border-white shadow-lg ${
                    onlineStatus ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                  }`}></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{driver.fullName}</h2>
                <p className="text-gray-600 mb-3">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-full border border-yellow-200">
                    <div className="flex items-center mr-2">
                      {renderStars(driver.rating || 0)}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {driver.rating?.toFixed(1) || '0.0'}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4 mb-6">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-600 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                    <Phone size={18} className="mr-3 text-blue-500" />
                    <span className="font-medium">{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-600 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                    <Mail size={18} className="mr-3 text-purple-500" />
                    <span className="font-medium">{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-600 p-3 rounded-xl bg-gray-50/50 border border-gray-200/50">
                    <MapPin size={18} className="mr-3 text-emerald-500" />
                    <span className="font-medium">{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {currentUser && userRole === 'tourist' && (
                  <button
                    onClick={handleOpenChatModal}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center font-semibold"
                  >
                    <MessageCircle size={18} className="mr-2" />
                    Send Message
                  </button>
                )}
                
                {!currentUser && (
                  <button
                    onClick={() => navigate('/?showAuth=true')}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 mb-6 backdrop-blur-sm bg-white/90">
              <div className="border-b border-gray-200/50">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-5 px-8 text-center border-b-2 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <User size={18} />
                      <span>Overview</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-5 px-8 text-center border-b-2 font-semibold text-sm transition-all duration-200 ${
                      activeTab === 'services'
                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Car size={18} />
                      <span>Services & Rates</span>
                    </div>
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-5 px-8 text-center border-b-2 font-semibold text-sm transition-all duration-200 relative ${
                        activeTab === 'chat'
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <MessageCircle size={18} />
                        <span>Messages</span>
                      </div>
                      {messages.filter(msg => 
                        msg.senderId === driverId && !msg.read
                      ).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
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
              <div className="p-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Experience */}
                    <div className="flex items-start p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50/50 border border-blue-200/50">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                        <Clock className="text-white" size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">Experience</h3>
                        <p className="text-gray-600">
                          {driver.experienceYears || 0} years of professional experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200/50">
                        <h3 className="font-bold text-gray-900 text-lg mb-3">About Me</h3>
                        <p className="text-gray-600 leading-relaxed text-justify">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50/50 border border-emerald-200/50">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <Languages className="text-white" size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-3">Languages</h3>
                          <div className="flex flex-wrap gap-3">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 shadow-sm"
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
                      <div className="flex items-start p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-200/50">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <Globe className="text-white" size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-3">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-3">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-white text-amber-700 px-4 py-2 rounded-lg text-sm font-medium border border-amber-200 shadow-sm"
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
                      <div className="flex items-start p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50/50 border border-green-200/50">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <ShieldCheck className="text-white" size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-3">Certifications</h3>
                          <div className="flex flex-wrap gap-3">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-200 shadow-sm"
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
                      <div className="flex items-start p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50/50 border border-purple-200/50">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <Award className="text-white" size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-3">Special Skills</h3>
                          <div className="flex flex-wrap gap-3">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 shadow-sm"
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
                  <div className="space-y-8">
                    {/* Vehicle Type */}
                    {driver.vehicleType && (
                      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50/50 border border-blue-200/50">
                        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
                          <Car className="mr-3 text-blue-500" size={24} />
                          Vehicle Type
                        </h3>
                        <p className="text-gray-700 text-lg font-medium">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50/50 border border-yellow-200/50">
                        <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
                          <DollarSign className="mr-3 text-amber-500" size={24} />
                          Rates & Pricing
                        </h3>
                        <div className="bg-white rounded-xl p-6 border border-amber-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-700 font-semibold">Daily Rate:</span>
                              <p className="text-gray-500 text-sm mt-1">Full day safari service</p>
                            </div>
                            <span className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                              LKR {driver.pricePerDay.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50/50 border border-emerald-200/50">
                      <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
                        <CalendarIcon className="mr-3 text-emerald-500" size={24} />
                        Availability
                      </h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-4">
                          <p className="text-gray-600">
                            Available for <span className="font-semibold text-emerald-600">{driver.availableDates.length}</span> dates
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {driver.availableDates.slice(0, 6).map((date, index) => (
                              <div
                                key={index}
                                className="bg-white text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium border border-emerald-200 shadow-sm flex items-center justify-between"
                              >
                                <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                              </div>
                            ))}
                          </div>
                          {driver.availableDates.length > 6 && (
                            <p className="text-gray-500 text-sm text-center">
                              +{driver.availableDates.length - 6} more available dates
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">Contact for availability</p>
                          <p className="text-gray-500 text-sm mt-1">Get in touch to discuss available dates</p>
                        </div>
                      )}
                    </div>

                    {/* Service Description */}
                    {driver.description && (
                      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50/50 border border-purple-200/50">
                        <h3 className="font-bold text-gray-900 text-lg mb-4">Service Details</h3>
                        <p className="text-gray-600 leading-relaxed text-justify bg-white/50 p-4 rounded-xl border border-purple-200/30">
                          {driver.description}
                        </p>
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
                        <div className="flex-1 overflow-y-auto space-y-4 mb-6 p-2">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-12">
                              <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageCircle size={32} className="text-blue-400" />
                              </div>
                              <p className="text-lg font-semibold text-gray-700 mb-2">No messages yet</p>
                              <p className="text-gray-500">Start a conversation with {driver.fullName}!</p>
                            </div>
                          ) : (
                            messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'
                                } group`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all duration-200 ${
                                    msg.senderId === currentUser.uid
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                                      : 'bg-white text-gray-800 shadow-lg shadow-gray-200/50 border border-gray-100'
                                  } group-hover:shadow-xl group-hover:scale-[1.02]`}
                                >
                                  <p className="text-sm leading-relaxed">{msg.content}</p>
                                  <div className={`flex items-center space-x-2 mt-2 text-xs ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-blue-100' 
                                      : 'text-gray-500'
                                  }`}>
                                    <span>{formatTime(msg.timestamp)}</span>
                                    {msg.senderId === currentUser.uid && (
                                      <span className="flex items-center space-x-1">
                                        {msg.read ? <CheckCheck size={12} className="text-emerald-300" /> : <Check size={12} className="text-blue-200" />}
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
                        <form onSubmit={handleSendMessage} className="flex space-x-3 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 shadow-sm">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center justify-center font-semibold"
                          >
                            {sending ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <Send size={18} className="mr-2" />
                                Send
                              </>
                            )}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <MessageCircle size={32} className="text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          Login to Message
                        </h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Please login to start a conversation with {driver.fullName} and discuss your safari adventure.
                        </p>
                        <button
                          onClick={() => navigate('/?showAuth=true')}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
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