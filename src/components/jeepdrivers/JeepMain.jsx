import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { MessageCircle, X, Send, Check, CheckCheck, User } from "lucide-react";
import Navbar from "../home/Navbar";
import JeepHero from "./JeepHero";
import JeepSection2 from "./JeepSection2";
import Footer from "../home/Footer";
import ChatList from "../ChatList";

// Import Firebase functions
import {
  db,
  auth,
  createOrGetConversation,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  createNotification,
  getConversationById,
  getOtherParticipant,
  markNotificationAsRead,
  getUserRole
} from '../../firebase';

// Import shared notification bell + scroll-to-top from App.jsx
import { GlobalNotificationBell } from '../../App';

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
    return () => { };
  }
};

export default function JeepMain({ user, onLogin, onRegister, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState(() => {
    // Restore selectedDestination from sessionStorage on mount
    return sessionStorage.getItem('selectedDestination') || null;
  });
  const [showDestinationSelector, setShowDestinationSelector] = useState(() => {
    // Restore showDestinationSelector from sessionStorage on mount
    const saved = sessionStorage.getItem('showDestinationSelector');
    return saved === null ? true : saved === 'false' ? false : true;
  });

  // All available destinations
  const allDestinations = [
    'Yala National Park',
    'Wilpattu National Park',
    'Udawalawe National Park',
    'Minneriya National Park',
    'Kaudulla National Park',
    'Bundala National Park',
    'Kumana National Park',
    'Horton Plains',
    'Sinharaja Forest Reserve',
    'Knuckles Mountain Range',
    'Mirissa Beach',
    'Unawatuna Beach',
    'Lunugamvehera'
  ];

  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);
  const [showChatList, setShowChatList] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log(`🔐 JeepMain Auth state changed:`, user ? `User ${user.uid} logged in` : 'User logged out');

      // Check if user is a service provider before allowing page to render
      if (user) {
        try {
          const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
          if (providerDoc.exists()) {
            const providerData = providerDoc.data();
            if (providerData.serviceType === 'Jeep Driver' || providerData.serviceType === 'Tour Guide') {
              // Redirect immediately without showing page content
              navigate('/', { replace: true });
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }

      setCurrentUser(user);
      setCheckingRole(false);
    });

    return () => {
      console.log('🔴 Cleaning up JeepMain auth listener');
      unsubscribeAuth();
    };
  }, [navigate]);

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Check if we should scroll to a specific driver card
    const shouldScrollToDriver = sessionStorage.getItem('scrollToDriver') === 'true';
    const lastViewedDriverId = sessionStorage.getItem('lastViewedDriverId');

    if (shouldScrollToDriver && lastViewedDriverId && location.pathname === '/driver') {
      // First scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      // Then scroll to the specific driver card after a short delay
      setTimeout(() => {
        const driverCard = document.getElementById(`driver-card-${lastViewedDriverId}`);
        if (driverCard) {
          driverCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the card briefly
          driverCard.style.transition = 'box-shadow 0.3s ease';
          driverCard.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.5)';
          setTimeout(() => {
            driverCard.style.boxShadow = '';
          }, 2000);
        }
        // Clear the flag
        sessionStorage.removeItem('scrollToDriver');
        sessionStorage.removeItem('lastViewedDriverId');
      }, 100);
    } else {
      // Normal scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Also handle popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setTimeout(() => {
        // Check if we should scroll to a specific driver card
        const shouldScrollToDriver = sessionStorage.getItem('scrollToDriver') === 'true';
        const lastViewedDriverId = sessionStorage.getItem('lastViewedDriverId');

        if (shouldScrollToDriver && lastViewedDriverId && location.pathname === '/driver') {
          // First scroll to top
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

          // Then scroll to the specific driver card
          setTimeout(() => {
            const driverCard = document.getElementById(`driver-card-${lastViewedDriverId}`);
            if (driverCard) {
              driverCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the card briefly
              driverCard.style.transition = 'box-shadow 0.3s ease';
              driverCard.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.5)';
              setTimeout(() => {
                driverCard.style.boxShadow = '';
              }, 2000);
            }
            // Clear the flag
            sessionStorage.removeItem('scrollToDriver');
            sessionStorage.removeItem('lastViewedDriverId');
          }, 100);
        } else {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    console.log('🔘 Notification clicked:', notification);

    // Mark notification as read
    if (!notification.read && onMarkAsRead) {
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

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

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
        onLogin={(screen) => (onLogin ? onLogin(screen) : (onShowAuth ? onShowAuth(screen || 'login') : null))}
        onRegister={(screen) => (onRegister ? onRegister(screen) : (onShowAuth ? onShowAuth(screen || 'register') : null))}
        onLogout={onLogout}
        onOpenChatList={() => setShowChatList(true)}
      />

      {/* Chat List Modal */}
      {showChatList && currentUser && (
        <ChatList
          user={currentUser}
          onClose={() => setShowChatList(false)}
        />
      )}
      <JeepHero />
      <div className="h-1 bg-black"></div>

      {/* Destination Selection Box */}
      {showDestinationSelector && (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex items-center justify-center py-8 px-4">
          <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-5 max-w-lg w-full">
            <h2 className="text-xl font-bold text-emerald-700 mb-1.5 text-center">Select a Destination</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">Choose a destination to find available jeep drivers</p>
            <select
              value={selectedDestination || ''}
              onChange={(e) => {
                const value = e.target.value || null;
                setSelectedDestination(value);
                setShowDestinationSelector(false);
                // Save to sessionStorage
                if (value) {
                  sessionStorage.setItem('selectedDestination', value);
                  sessionStorage.setItem('showDestinationSelector', 'false');
                } else {
                  sessionStorage.removeItem('selectedDestination');
                  sessionStorage.setItem('showDestinationSelector', 'true');
                }
              }}
              className="w-full p-2.5 text-base border-2 border-emerald-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white appearance-none"
            >
              <option value="">All Destinations</option>
              {allDestinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedDestination(null);
                setShowDestinationSelector(false);
                // Clear from sessionStorage
                sessionStorage.removeItem('selectedDestination');
                sessionStorage.setItem('showDestinationSelector', 'false');
              }}
              className="mt-3 w-full bg-emerald-700 text-white py-2 px-4 rounded-lg font-medium text-sm"
            >
              Show All Drivers
            </button>
          </div>
        </div>
      )}

      {!showDestinationSelector && (
        <>
          {selectedDestination && (
            <div className="bg-emerald-100 border-b border-emerald-200 py-4">
              <div className="container mx-auto px-4 flex items-center justify-between">
                <p className="text-emerald-900 font-semibold">
                  Showing drivers for: <span className="text-emerald-700">{selectedDestination}</span>
                </p>
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    setShowDestinationSelector(true);
                    // Clear from sessionStorage
                    sessionStorage.removeItem('selectedDestination');
                    sessionStorage.setItem('showDestinationSelector', 'true');
                  }}
                  className="text-emerald-700 hover:text-emerald-900 font-medium underline"
                >
                  Change Destination
                </button>
              </div>
            </div>
          )}
          <JeepSection2 currentUser={user} selectedDestination={selectedDestination} />
          <div className="h-1 bg-black"></div>
          <Footer />
        </>
      )}
    </div>
  );
}

export { getUserNotifications };