import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc
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
  DollarSign,
  Calendar as CalendarIcon,
  BookOpen,
  GraduationCap,
  Globe,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Flag,
  AlertCircle,
  CheckCircle
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

// Import the fixed ReviewSection component
// import ReviewSection from "./ReviewSection";

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
  GlobalNotificationBell
} from "../../App";

// Calendar Component for Date Selection
const DatePickerCalendar = ({ selectedDates, onDateSelect, availableDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isDateAvailable = (date) => {
    if (!availableDates || availableDates.length === 0) return true;
    
    const dateString = date.toISOString().split('T')[0];
    return availableDates.some(availableDate => {
      const availableDateString = new Date(availableDate).toISOString().split('T')[0];
      return availableDateString === dateString;
    });
  };

  const isDateSelected = (date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) return;
    onDateSelect(date);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button 
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={16} className="rotate-180" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const available = isDateAvailable(day);
          const selected = isDateSelected(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              disabled={!available}
              className={`
                h-8 text-sm rounded-lg transition-all
                ${selected 
                  ? 'bg-blue-600 text-white font-medium' 
                  : available
                    ? isToday
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {selectedDates.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <span 
                key={index}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                {date.toLocaleDateString()}
              </span>
            ))}
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
  currentUser 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
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

      await sendMessage(conversationId, messageData);

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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-blue-100 text-sm">
                {otherUser?.role === 'tourist' ? 'Tourist' : 'Tour Guide'}
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
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${
                      msg.senderId === currentUser?.uid ? 'text-blue-100' : 'text-gray-500'
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

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

const GuideProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const { guideId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const openChat = searchParams.get('openChat');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (openChat === 'true' && guideId && currentUser) {
      setActiveTab('chat');
      initializeConversation();
    }
  }, [openChat, guideId, currentUser]);

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
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
          console.log('Error getting user role:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
      }
    });

    return () => unsubscribeAuth();
  }, []);

useEffect(() => {
  const fetchGuideData = async () => {
    if (!guideId) {
      setError("No guide ID provided");
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching guide data for ID:', guideId);
      
      // First, try to get data from sessionStorage (from guide listing)
      const storedGuideData = sessionStorage.getItem('currentGuideData');
      
      if (storedGuideData) {
        console.log('✅ Found guide data in sessionStorage');
        const guideData = JSON.parse(storedGuideData);
        
        // Only use stored data if it matches the current guideId
        if (guideData.id === guideId) {
          setGuide(guideData);
          setLoading(false);
          return;
        }
      }
      
      // If no stored data or ID mismatch, fetch from Firestore
      console.log('📡 No stored data found, fetching from Firestore...');
      const guideDoc = await getDoc(doc(db, 'serviceProviders', guideId));
      
      if (guideDoc.exists()) {
        const guideData = guideDoc.data();
        console.log('✅ Guide data found in Firestore:', guideData);
        
        // Transform data to match the structure expected by the profile page
        const transformedGuide = {
          id: guideDoc.id,
          guideName: guideData.fullName || guideData.guideName || 'Tour Guide',
          imageUrl: guideData.profilePicture || guideData.imageUrl || '',
          location: guideData.location || guideData.baseLocation || 'Sri Lanka',
          rating: typeof guideData.rating === 'number' ? guideData.rating : 
                 typeof guideData.rating === 'string' ? parseFloat(guideData.rating) || 0 : 0,
          totalReviews: guideData.totalReviews || 0,
          hourlyRate: guideData.hourlyRate || 0,
          dailyRate: guideData.dailyRate || 0,
          specialPackageRates: guideData.specialPackageRates || '',
          currencyPreference: guideData.currencyPreference || 'LKR',
          experience: guideData.experienceYears || guideData.experience || 0,
          specialQualifications: Array.isArray(guideData.specialQualifications) ? guideData.specialQualifications : 
                               guideData.specialQualifications ? [guideData.specialQualifications] : [],
          areasOfExpertise: Array.isArray(guideData.areasOfExpertise) ? guideData.areasOfExpertise :
                         guideData.areasOfExpertise ? [guideData.areasOfExpertise] : [],
          verificationDocuments: Array.isArray(guideData.verificationDocuments) ? guideData.verificationDocuments :
                              guideData.verificationDocuments ? [guideData.verificationDocuments] : [],
          languages: Array.isArray(guideData.languages) ? guideData.languages :
                    Array.isArray(guideData.languagesSpoken) ? guideData.languagesSpoken :
                    guideData.languagesSpoken ? [guideData.languagesSpoken] :
                    guideData.languages ? [guideData.languages] :
                    ['English', 'Sinhala'],
          contactPhone: guideData.contactPhone || guideData.phone || guideData.phoneNumber || 'Not provided',
          contactEmail: guideData.contactEmail || guideData.email || '',
          description: guideData.description || guideData.bio || 'Experienced tour guide',
          featured: guideData.featured || false,
          availability: guideData.availability !== false,
          availableDates: guideData.availableDates || [],
          isCurrentUser: currentUser && currentUser.uid === guideId
        };
        
        setGuide(transformedGuide);
      } else {
        console.log('❌ Guide not found for ID:', guideId);
        setError("Tour guide not found");
      }
    } catch (err) {
      console.error("Error fetching guide:", err);
      setError("Failed to load guide information");
    } finally {
      setLoading(false);
    }
  };

  fetchGuideData();
}, [guideId, currentUser]);

  const initializeConversation = async () => {
    if (!currentUser || !guideId || !guide) return;

    try {
      const conversationId = await createOrGetConversation(
        currentUser.uid,
        guideId,
        currentUser.displayName || 'User',
        guide.guideName || 'Tour Guide'
      );
      
      setConversationId(conversationId);
      await markMessagesAsRead(conversationId, currentUser.uid);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  useEffect(() => {
    initializeConversation();
  }, [currentUser, guideId, guide]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      const unreadMessages = messagesData.filter(msg => 
        msg.senderId !== currentUser?.uid && !msg.read
      );
      
      if (unreadMessages.length > 0 && currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

  const handleDateSelect = (date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(selectedDate => 
        selectedDate.toDateString() === date.toDateString()
      );
      
      if (isSelected) {
        return prev.filter(selectedDate => 
          selectedDate.toDateString() !== date.toDateString()
        );
      } else {
        return [...prev, date];
      }
    });
  };

  const handleBooking = () => {
    if (selectedDates.length === 0) {
      alert('Please select at least one date for your booking.');
      return;
    }
    
    const totalPrice = selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0);
    alert(`Booking confirmed for ${selectedDates.length} day(s)! Total: ${guide.currencyPreference || 'LKR'} ${totalPrice.toLocaleString()}`);
    
    console.log('Booking details:', {
      guideId: guide.id,
      guideName: guide.guideName,
      selectedDates: selectedDates.map(d => d.toISOString()),
      totalPrice,
      customerId: currentUser?.uid
    });
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && currentUser) {
        const otherUser = getOtherParticipant(conversation, currentUser.uid);
        
        if (otherUser.id === guideId) {
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
        }
      }
    }
  };

  const handleOpenChatModal = () => {
    if (guide && currentUser) {
      setChatConversationId(conversationId);
      setChatOtherUser({
        id: guide.id,
        name: guide.guideName || 'Tour Guide',
        role: 'provider'
      });
      setIsChatModalOpen(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser || !guideId || !conversationId || sending) return;

    setSending(true);
    
    try {
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: guideId,
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);

      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a tourist'}`,
        recipientId: guideId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        relatedId: conversationId,
        conversationId: conversationId
      });

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderStars = (rating) => {
    const numericRating = Number(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(numericRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const handleReviewAdded = async () => {
    // Refresh guide data to update rating
    if (guideId) {
      const guideDoc = await getDoc(doc(db, 'serviceProviders', guideId));
      if (guideDoc.exists()) {
        const guideData = guideDoc.data();
        const transformedGuide = {
          id: guideDoc.id,
          guideName: guideData.fullName || guideData.guideName || 'Tour Guide',
          imageUrl: guideData.profilePicture || guideData.imageUrl || '',
          location: guideData.location || guideData.baseLocation || 'Sri Lanka',
          rating: typeof guideData.rating === 'number' ? guideData.rating : 
                 typeof guideData.rating === 'string' ? parseFloat(guideData.rating) || 0 : 0,
          totalReviews: guideData.totalReviews || 0,
          hourlyRate: guideData.hourlyRate || 0,
          dailyRate: guideData.dailyRate || 0,
          specialPackageRates: guideData.specialPackageRates || '',
          currencyPreference: guideData.currencyPreference || 'LKR',
          experience: guideData.experienceYears || guideData.experience || 0,
          specialQualifications: Array.isArray(guideData.specialQualifications) ? guideData.specialQualifications : 
                               guideData.specialQualifications ? [guideData.specialQualifications] : [],
          areasOfExpertise: Array.isArray(guideData.areasOfExpertise) ? guideData.areasOfExpertise :
                         guideData.areasOfExpertise ? [guideData.areasOfExpertise] : [],
          verificationDocuments: Array.isArray(guideData.verificationDocuments) ? guideData.verificationDocuments :
                              guideData.verificationDocuments ? [guideData.verificationDocuments] : [],
          languages: Array.isArray(guideData.languages) ? guideData.languages :
                    Array.isArray(guideData.languagesSpoken) ? guideData.languagesSpoken :
                    guideData.languagesSpoken ? [guideData.languagesSpoken] :
                    guideData.languages ? [guideData.languages] :
                    ['English', 'Sinhala'],
          contactPhone: guideData.contactPhone || guideData.phone || guideData.phoneNumber || 'Not provided',
          contactEmail: guideData.contactEmail || guideData.email || '',
          description: guideData.description || guideData.bio || 'Experienced tour guide',
          featured: guideData.featured || false,
          availability: guideData.availability !== false,
          availableDates: guideData.availableDates || [],
          isCurrentUser: currentUser && currentUser.uid === guideId
        };
        setGuide(transformedGuide);
      }
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return 'LKR ';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide profile...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The guide you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/guides')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Browse All Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
      />
      
      <GlobalNotificationBell 
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />
      
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/guides')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4 transition-colors"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Guides
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Tour Guide Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={guide.imageUrl || "/api/placeholder/120/120"}
                    alt={guide.guideName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 mx-auto mb-4 shadow-md"
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{guide.guideName}</h2>
                <p className="text-gray-600">Professional Tour Guide</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-2">
                  <div className="flex items-center">
                    {renderStars(guide.rating || 0)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({guide.rating?.toFixed(1) || '0.0'}/5) • {guide.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4 mb-6">
                {guide.contactPhone && guide.contactPhone !== 'Not provided' && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <Phone size={18} className="mr-3 text-blue-600" />
                    <span className="font-medium">{guide.contactPhone}</span>
                  </div>
                )}
                
                {guide.contactEmail && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <Mail size={18} className="mr-3 text-blue-600" />
                    <span className="font-medium">{guide.contactEmail}</span>
                  </div>
                )}
                
                {guide.location && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <MapPin size={18} className="mr-3 text-blue-600" />
                    <span className="font-medium">{guide.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {currentUser && userRole === 'tourist' && (
                  <>
                    <button
                      onClick={handleOpenChatModal}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium shadow-md"
                    >
                      <MessageCircle size={18} className="mr-2" />
                      Send Message
                    </button>
                    
                    {selectedDates.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-blue-800 font-medium">Total:</span>
                          <span className="text-blue-800 font-bold text-lg">
                            {getCurrencySymbol(guide.currencyPreference)}{(selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0)).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={handleBooking}
                          className="w-full bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-800 transition-colors font-medium"
                        >
                          Book Now ({selectedDates.length} days)
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                {!currentUser && (
                  <button
                    onClick={onShowAuth}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                  >
                    Login to Book or Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'services'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Services & Rates
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        activeTab === 'booking'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CalendarIcon size={16} className="inline mr-2" />
                      Book Now
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'reviews'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Reviews ({guide.totalReviews || 0})
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap relative ${
                        activeTab === 'chat'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages
                      {messages.filter(msg => 
                        msg.senderId === guideId && !msg.read
                      ).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {messages.filter(msg => 
                            msg.senderId === guideId && !msg.read
                          ).length}
                        </span>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <Clock className="text-blue-600 mt-1 mr-4 flex-shrink-0" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Experience</h3>
                        <p className="text-gray-600">
                          {guide.experience || 0} years of experience as a professional tour guide
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {guide.description && (
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {guide.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {guide.languages && guide.languages.length > 0 && (
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Languages className="text-blue-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Areas of Expertise */}
                    {guide.areasOfExpertise && guide.areasOfExpertise.length > 0 && (
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Globe className="text-blue-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Areas of Expertise</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.areasOfExpertise.map((area, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200 font-medium"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Qualifications */}
                    {guide.specialQualifications && guide.specialQualifications.length > 0 && (
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <GraduationCap className="text-blue-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Special Qualifications</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.specialQualifications.map((qual, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200 font-medium"
                              >
                                {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verification Documents */}
                    {guide.verificationDocuments && guide.verificationDocuments.length > 0 && (
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="text-blue-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Verification Documents</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.verificationDocuments.map((doc, index) => (
                              <span
                                key={index}
                                className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm border border-purple-200 font-medium"
                              >
                                {doc}
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
                    {/* Pricing */}
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <DollarSign className="text-blue-600 mr-2" size={20} />
                        Rates & Pricing
                      </h3>
                      <div className="space-y-4">
                        {guide.hourlyRate > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                            <div>
                              <span className="text-gray-700 font-medium">Hourly Rate:</span>
                              <p className="text-sm text-gray-500">Perfect for short tours and consultations</p>
                            </div>
                            <span className="text-2xl font-bold text-blue-600">
                              {getCurrencySymbol(guide.currencyPreference)}{guide.hourlyRate.toLocaleString()}
                              <span className="text-sm font-normal text-gray-500">/hour</span>
                            </span>
                          </div>
                        )}
                        
                        {guide.dailyRate > 0 && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                            <div>
                              <span className="text-gray-700 font-medium">Daily Rate:</span>
                              <p className="text-sm text-gray-500">Full day guided tours (8+ hours)</p>
                            </div>
                            <span className="text-2xl font-bold text-blue-600">
                              {getCurrencySymbol(guide.currencyPreference)}{guide.dailyRate.toLocaleString()}
                              <span className="text-sm font-normal text-gray-500">/day</span>
                            </span>
                          </div>
                        )}
                        
                        {guide.specialPackageRates && (
                          <div className="p-3 bg-white rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-700 font-medium">Special Packages:</span>
                            </div>
                            <p className="text-gray-600 text-sm">{guide.specialPackageRates}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Currency Preference:</span>
                          <span className="font-medium">{guide.currencyPreference || 'LKR - Sri Lankan Rupee'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Description */}
                    {guide.description && (
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                        <p className="text-gray-600 leading-relaxed">{guide.description}</p>
                      </div>
                    )}

                    {/* Availability */}
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <CalendarIcon className="text-blue-600 mr-2" size={20} />
                        Availability
                      </h3>
                      {guide.availableDates && guide.availableDates.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-600">
                            Available on {guide.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {guide.availableDates.slice(0, 6).map((date, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm border border-blue-200 font-medium"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {guide.availableDates.length > 6 && (
                              <span className="text-gray-500 text-sm font-medium">
                                +{guide.availableDates.length - 6} more dates
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Contact for availability</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Booking Tab */}
                {activeTab === 'booking' && currentUser && userRole === 'tourist' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Calendar */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Select Your Dates</h3>
                        <DatePickerCalendar 
                          selectedDates={selectedDates}
                          onDateSelect={handleDateSelect}
                          availableDates={guide.availableDates}
                        />
                      </div>

                      {/* Booking Summary */}
                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                          
                          {selectedDates.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">
                              Select dates to see booking details
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Selected dates:</span>
                                <span className="font-medium text-blue-700">{selectedDates.length} days</span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Daily rate:</span>
                                <span className="font-medium">
                                  {getCurrencySymbol(guide.currencyPreference)}{guide.dailyRate?.toLocaleString() || (guide.hourlyRate * 8)?.toLocaleString() || '0'}
                                </span>
                              </div>
                              
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                                  <span className="text-2xl font-bold text-blue-600">
                                    {getCurrencySymbol(guide.currencyPreference)}
                                    {(selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={handleBooking}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4 shadow-md"
                              >
                                Confirm Booking
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Guide Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Guide Information</h3>
                          <p className="text-gray-600 text-sm">
                            You'll be booking with {guide.guideName}, an experienced tour guide with {guide.experience || 0} years of experience and expertise in {guide.areasOfExpertise?.slice(0, 2).join(', ') || 'various areas'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Reviews functionality coming soon...</p>
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
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-blue-100' 
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
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          Please login to start a conversation with {guide.guideName}
                        </p>
                        <button
                          onClick={onShowAuth}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
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

export default GuideProfile;