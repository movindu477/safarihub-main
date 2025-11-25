import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../App";
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
  Car,
  DollarSign,
  Calendar as CalendarIcon,
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
// Use auth from App.jsx instead of creating new instance

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";

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
const DatePickerCalendar = ({ selectedDates, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Add empty cells for days before the first day of the month
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
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

  const isDateSelected = (date) => {
    if (!date) return false;
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDatePast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date) => {
    if (!date || isDatePast(date)) return;
    onDateSelect(date);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-8"></div>;
          }
          
          const selected = isDateSelected(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = isDatePast(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              disabled={isPast}
              className={`
                h-8 text-sm rounded-lg transition-all
                ${selected 
                  ? 'bg-emerald-600 text-white font-medium shadow-lg' 
                  : isPast
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isToday
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 font-semibold'
                      : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md'
                }
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {selectedDates.length > 0 && (
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
          <h4 className="font-bold text-emerald-800 mb-3">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <span 
                key={index}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md"
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
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-emerald-100 text-sm">
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
                        ? 'bg-emerald-600 text-white rounded-br-none shadow-lg'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-md'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${
                      msg.senderId === currentUser?.uid ? 'text-emerald-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.senderId === currentUser?.uid && (
                        <span className="flex items-center space-x-1">
                          {msg.read ? (
                            <CheckCheck size={12} className="text-emerald-300" title="Read" />
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
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

const JeepProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
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
  const [conversationId, setConversationId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const driverId = searchParams.get('driverId');
  const openChat = searchParams.get('openChat');

  // Reset state when driverId changes (navigating to different driver or going back)
  useEffect(() => {
    // Reset component state when driverId changes or is cleared
    setError("");
    setActiveTab("overview");
    setMessage("");
    setMessages([]);
    setConversationId(null);
    setSelectedDates([]);
    setIsChatModalOpen(false);
    setChatConversationId(null);
    setChatOtherUser(null);
  }, [driverId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (openChat === 'true' && driverId && currentUser) {
      setActiveTab('chat');
      initializeConversation();
    }
  }, [openChat, driverId, currentUser]);

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
        return [...prev, date].sort((a, b) => a - b);
      }
    });
  };

  const handleBooking = async () => {
    // Prevent double-clicks
    if (isBooking) {
      console.warn('⚠️ Booking already in progress, ignoring click');
      return;
    }
    
    console.log('🔵 handleBooking called');
    console.log('🔵 Current state:', {
      selectedDates: selectedDates.length,
      currentUser: !!currentUser,
      driver: !!driver,
      driverId: driver?.id,
      isBooking: isBooking
    });
    
    if (selectedDates.length === 0) {
      console.warn('⚠️ No dates selected');
      alert('Please select at least one date for your booking.');
      return;
    }
    
    if (!currentUser) {
      console.warn('⚠️ No current user');
      alert('Please login to make a booking.');
      return;
    }
    
    if (!driver) {
      console.warn('⚠️ No driver data');
      alert('Driver information not available.');
      return;
    }
      
      // Verify driver has a valid ID
      if (!driver.id) {
        console.error('❌ Driver ID is missing:', driver);
        alert('Driver information is incomplete. Please try again.');
        return;
      }
      
    console.log('✅ All pre-checks passed, starting booking process...');
    setIsBooking(true);
    
    try {
      // Get the authenticated user directly from Firebase Auth
      // This ensures we have the most up-to-date auth state
      const authUser = auth.currentUser;
      
      console.log('🔐 Auth check:', {
        authUser: !!authUser,
        authUserUid: authUser?.uid,
        authUserEmail: authUser?.email,
        currentUser: !!currentUser,
        currentUserUid: currentUser?.uid
      });
      
      if (!authUser) {
        console.error('❌ No authenticated user found');
        alert('Please login to make a booking. No authenticated user found.');
        return;
      }
      
      // Verify we have a valid user ID
      if (!authUser.uid) {
        console.error('❌ No user ID found in auth user');
        alert('Authentication error. Please try logging in again.');
        return;
      }
      
      // Verify user is logged in as tourist (optional check, but helpful for debugging)
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', authUser.uid));
        if (!touristDoc.exists()) {
          console.warn('⚠️ User is not in tourists collection. They might be a provider.');
        } else {
          console.log('✅ User confirmed as tourist');
        }
      } catch (roleCheckError) {
        console.warn('⚠️ Could not verify user role:', roleCheckError);
      }
      
      const totalPrice = selectedDates.length * (driver.pricePerDay || 0);
      const datesString = selectedDates.map(d => d.toLocaleDateString()).join(', ');
      
      // Get driver email from driver data (could be contactEmail, email, or from auth)
      const driverEmail = driver.contactEmail || driver.email || '';
      
      // Validate driver ID before proceeding
      const driverIdString = String(driver.id || '');
      if (!driverIdString || driverIdString === 'undefined' || driverIdString === 'null' || driverIdString.trim() === '') {
        console.error('❌ Invalid driver ID:', driver.id);
        alert('Invalid driver information. Please refresh the page and try again.');
        return;
      }
      
      // Create booking in Firestore
      // Ensure all fields match Firestore rules requirements exactly
      const bookingData = {
        driverId: driverIdString, // Must be a string
        driverName: driver.fullName || driver.driverName || 'Driver',
        driverEmail: driverEmail, // Store driver email in booking
        customerId: authUser.uid, // MUST match request.auth.uid
        customerName: authUser.displayName || 'Customer',
        customerEmail: authUser.email || '',
        selectedDates: selectedDates.map(d => d.toISOString()), // Must be an array
        datesString: datesString,
        totalPrice: Number(totalPrice), // Must be a number
        pricePerDay: Number(driver.pricePerDay || 0),
        numberOfDays: Number(selectedDates.length),
        serviceType: driver.serviceType || 'Jeep Driver',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Log booking data for debugging
      console.log('📝 Creating booking with data:', {
        authUid: authUser.uid,
        authUserEmail: authUser.email,
        customerId: bookingData.customerId,
        customerIdMatch: authUser.uid === bookingData.customerId,
        driverId: bookingData.driverId,
        driverIdType: typeof bookingData.driverId,
        driverIdIsString: typeof bookingData.driverId === 'string',
        driverIdLength: String(bookingData.driverId).length,
        selectedDates: bookingData.selectedDates,
        selectedDatesType: Array.isArray(bookingData.selectedDates) ? 'array' : typeof bookingData.selectedDates,
        selectedDatesIsArray: Array.isArray(bookingData.selectedDates),
        selectedDatesLength: bookingData.selectedDates.length,
        totalPrice: bookingData.totalPrice,
        totalPriceType: typeof bookingData.totalPrice,
        totalPriceIsNumber: typeof bookingData.totalPrice === 'number',
        fullBookingData: bookingData
      });
      
      // Create the booking document in Firestore 'bookings' collection
      // This is the critical operation - if this fails, the whole booking fails
      console.log('🔐 Pre-booking validation:', {
        authUserExists: !!authUser,
        authUserUid: authUser?.uid,
        authUserEmail: authUser?.email,
        customerId: bookingData.customerId,
        customerIdMatch: authUser?.uid === bookingData.customerId,
        driverId: bookingData.driverId,
        driverIdType: typeof bookingData.driverId,
        selectedDatesCount: bookingData.selectedDates.length,
        selectedDatesIsArray: Array.isArray(bookingData.selectedDates),
        totalPrice: bookingData.totalPrice,
        totalPriceType: typeof bookingData.totalPrice,
        allFieldsPresent: {
          customerId: !!bookingData.customerId,
          driverId: !!bookingData.driverId,
          selectedDates: !!bookingData.selectedDates,
          totalPrice: bookingData.totalPrice !== null && bookingData.totalPrice !== undefined
        }
      });
      
      // Double-check data types before sending
      const validatedBookingData = {
        ...bookingData,
        driverId: String(bookingData.driverId), // Ensure it's a string
        selectedDates: Array.isArray(bookingData.selectedDates) ? bookingData.selectedDates : [],
        totalPrice: Number(bookingData.totalPrice) // Ensure it's a number
      };
      
      console.log('✅ Validated booking data:', validatedBookingData);
      
      const bookingRef = collection(db, 'bookings');
      let bookingId;
      
      // Store bookingData in outer scope for error handling
      const finalBookingData = validatedBookingData;
      
      try {
        console.log('🚀 Attempting to create booking in Firestore...');
        console.log('🚀 Data being sent:', {
          customerId: finalBookingData.customerId,
          driverId: finalBookingData.driverId,
          selectedDates: finalBookingData.selectedDates,
          selectedDatesLength: finalBookingData.selectedDates.length,
          totalPrice: finalBookingData.totalPrice,
          authUid: authUser.uid,
          match: authUser.uid === finalBookingData.customerId,
          fullData: JSON.stringify(finalBookingData, null, 2)
        });
        
        // Final validation before sending
        if (authUser.uid !== finalBookingData.customerId) {
          throw new Error('Customer ID mismatch! Auth UID: ' + authUser.uid + ', Customer ID: ' + finalBookingData.customerId);
        }
        
        console.log('✅ Validation passed, creating document...');
        const bookingDoc = await addDoc(bookingRef, finalBookingData);
        bookingId = bookingDoc.id;
        
        console.log('✅ Booking created successfully with ID:', bookingId);
        console.log('📦 Booking stored in Firestore:', {
          collection: 'bookings',
          documentId: bookingId,
          customerId: finalBookingData.customerId,
          driverId: finalBookingData.driverId,
          totalPrice: finalBookingData.totalPrice,
          numberOfDays: finalBookingData.numberOfDays
        });
      } catch (bookingError) {
        console.error('❌ CRITICAL: Failed to create booking document:', bookingError);
        console.error('❌ Booking error details:', {
          code: bookingError.code,
          message: bookingError.message,
          stack: bookingError.stack,
          dataSent: {
            customerId: finalBookingData.customerId,
            driverId: finalBookingData.driverId,
            selectedDatesLength: finalBookingData.selectedDates.length,
            totalPrice: finalBookingData.totalPrice
          }
        });
        throw bookingError; // Re-throw to be caught by outer catch block
      }
      
      // Also create a confirmation record in a 'confirmations' subcollection for better tracking
      try {
        const confirmationRef = collection(db, 'confirmations');
        const confirmationData = {
          bookingId: bookingId,
          ...bookingData,
          confirmationStatus: 'pending',
          confirmedAt: serverTimestamp(),
          confirmationType: 'booking_request'
        };
        const confirmationDoc = await addDoc(confirmationRef, confirmationData);
        console.log('✅ Confirmation record created with ID:', confirmationDoc.id);
      } catch (confirmationError) {
        console.warn('⚠️ Could not create confirmation record (non-critical):', confirmationError);
        // Don't fail the booking if confirmation record fails
      }
      
      // Create comprehensive notification for driver with all booking details
      // Wrap in try-catch so notification failure doesn't break the booking
      try {
        const notificationData = {
          type: 'booking',
          title: 'New Booking Request',
          message: `You have a new booking request from ${authUser.displayName || 'a customer'} for ${selectedDates.length} day(s). Dates: ${datesString}. Total: LKR ${totalPrice.toLocaleString()}`,
          recipientId: driver.id, // Driver's user ID (from serviceProviders collection)
          senderId: authUser.uid, // Tourist's user ID
          senderName: authUser.displayName || 'Customer', // Tourist's name
          senderEmail: authUser.email || '', // Tourist's email
          driverEmail: driverEmail, // Driver's email stored in booking
          relatedId: bookingId,
          bookingId: bookingId,
          bookingData: {
            dates: datesString, // Formatted dates string for display
            selectedDates: selectedDates.map(d => d.toISOString()), // ISO date strings
            numberOfDays: selectedDates.length,
            totalPrice: totalPrice,
            customerName: authUser.displayName || 'Customer',
            customerEmail: authUser.email || '',
            driverId: driver.id,
            driverName: driver.fullName || driver.driverName || 'Driver',
            driverEmail: driverEmail,
            pricePerDay: driver.pricePerDay || 0,
            status: 'pending'
          }
        };
        
        const notificationId = await createNotification(notificationData);
        console.log('✅ Notification created for driver:', {
          notificationId: notificationId,
          recipientId: driver.id,
          bookingId: bookingId
        });
      } catch (notificationError) {
        console.warn('⚠️ Could not create notification (non-critical):', notificationError);
        // Don't fail the booking if notification fails - booking is already created
      }
      
      // Show success animation with booking ID
      setSuccessMessageData({
        driverName: driver.fullName,
        dates: datesString,
        totalPrice: totalPrice,
        numberOfDays: selectedDates.length,
        bookingId: bookingId
      });
      setShowSuccessMessage(true);
      
      // Reset selected dates
      setSelectedDates([]);
      setIsBooking(false);
      
      // Redirect to JeepProfile page after showing success message (3 seconds)
      setTimeout(() => {
        console.log('🔄 Redirecting to JeepProfile page...');
        setShowSuccessMessage(false);
        setSuccessMessageData(null);
        // Ensure we're on the correct route with driverId
        if (driverId) {
          navigate(`/jeepprofile?driverId=${driverId}`, { replace: true });
        } else if (driver?.id) {
          navigate(`/jeepprofile?driverId=${driver.id}`, { replace: true });
        } else {
          // If no driverId, go to driver listing page
          navigate('/driver', { replace: true });
        }
      }, 3000);
      
    } catch (error) {
      setIsBooking(false);
      console.error('❌ Error creating booking:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      
      // Hide any success message that might have been shown
      setShowSuccessMessage(false);
      setSuccessMessageData(null);
      
      let errorMessage = 'Failed to create booking. ';
      
      // Get auth user for error details
      const authUserForError = auth.currentUser;
      
      if (error.code === 'permission-denied') {
        console.error('❌ Permission denied details:', {
          authUser: authUserForError?.uid,
          authUserEmail: authUserForError?.email,
          errorCode: error.code,
          errorMessage: error.message
        });
        errorMessage = 'Unable to complete your booking request.\n\nThis may be due to:\n• Your session may have expired\n• Database permissions need to be updated\n\nPlease try:\n1. Log out and log back in\n2. Wait a few moments and try again\n\nIf the problem continues, please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Unable to connect to the server.\n\nPlease check your internet connection and try again.';
      } else if (error.code === 'failed-precondition') {
        errorMessage = 'The booking system is temporarily unavailable.\n\nPlease refresh the page and try again in a few moments.';
      } else if (error.message && !error.message.includes('localhost')) {
        // Only show error message if it doesn't contain localhost
        const cleanMessage = error.message.replace(/localhost:\d+/g, '').trim();
        if (cleanMessage) {
          errorMessage = `Booking failed: ${cleanMessage}`;
        } else {
          errorMessage = 'An unexpected error occurred while processing your booking.\n\nPlease try again. If the problem persists, please contact support.';
        }
      } else {
        errorMessage = 'An unexpected error occurred while processing your booking.\n\nPlease try again. If the problem persists, please contact support.';
      }
      
      alert(errorMessage);
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
    const fetchDriverData = async () => {
      if (!driverId) {
        setError("No driver ID provided");
        setLoading(false);
        return;
      }

      // Reset state before fetching
      setLoading(true);
      setError("");
      setDriver(null);
      setActiveTab("overview");

      try {
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          setDriver({
            id: driverDoc.id,
            ...driverData
          });
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

    if (driverId) {
      fetchDriverData();
    }
  }, [driverId]);

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
      await markMessagesAsRead(conversationId, currentUser.uid);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  useEffect(() => {
    // Only initialize conversation if driver data is loaded
    if (currentUser && driverId && driver && !loading) {
      initializeConversation();
    }
  }, [currentUser, driverId, driver, loading]);

  useEffect(() => {
    if (!conversationId || !currentUser) {
      setMessages([]);
      return;
    }

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      const unreadMessages = messagesData.filter(msg => 
        msg.senderId !== currentUser.uid && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => {
      unsubscribe();
      setMessages([]);
    };
  }, [conversationId, currentUser]);


  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && currentUser) {
        const otherUser = getOtherParticipant(conversation, currentUser.uid);
        
        if (otherUser.id === driverId) {
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
        }
      }
    }
  };

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

      await sendMessage(conversationId, messageData);

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
    // Refresh driver data to update rating
    if (driverId) {
      const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
      if (driverDoc.exists()) {
        setDriver({
          id: driverDoc.id,
          ...driverDoc.data()
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-3 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50">
      {/* Success Message Animation */}
      {showSuccessMessage && successMessageData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-slideUp">
            <div className="text-center">
              {/* Success Icon Animation */}
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-scaleIn">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
              
              {/* Success Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-fadeIn">
                Booking Confirmed! 🎉
              </h2>
              <p className="text-gray-600 mb-2">
                Your booking request has been successfully sent to the driver.
              </p>
              <p className="text-sm text-emerald-600 font-semibold mb-6">
                The driver will receive a notification and can accept or decline your booking.
              </p>
              {successMessageData.bookingId && (
                <p className="text-xs text-gray-500 mb-4">
                  Booking ID: {successMessageData.bookingId.substring(0, 8)}...
                </p>
              )}
              
              {/* Booking Details */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Driver:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Dates:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.dates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Days:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.numberOfDays} day(s)</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
                  <span className="text-gray-600 font-bold">Total:</span>
                  <span className="text-emerald-600 font-bold text-lg">LKR {successMessageData.totalPrice.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Info Message */}
              <p className="text-sm text-gray-500 mb-4">
                The driver will receive a notification and can accept or decline your booking.
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setSuccessMessageData(null);
                  // Ensure we're on the correct route
                  if (driverId) {
                    navigate(`/jeepprofile?driverId=${driverId}`, { replace: true });
                  } else if (driver?.id) {
                    navigate(`/jeepprofile?driverId=${driver.id}`, { replace: true });
                  } else {
                    navigate('/driver', { replace: true });
                  }
                }}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-lg"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-emerald-700 hover:text-emerald-900 mr-6 transition-all duration-300 hover:scale-105 font-medium group"
              >
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                Back
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-900 bg-clip-text text-transparent">Jeep Driver Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-100/50 p-8 sticky top-8 transition-all duration-300 hover:shadow-emerald-200/20">
              {/* Profile Header */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-xl opacity-30"></div>
                  <img
                    src={driver.profilePicture || "/api/placeholder/120/120"}
                    alt={driver.fullName}
                    className="relative w-36 h-36 rounded-full object-cover border-4 border-emerald-500 mx-auto mb-5 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-100"
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{driver.fullName}</h2>
                <p className="text-emerald-600 font-medium mb-4">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center">
                    {renderStars(driver.rating || 0)}
                    <span className="ml-3 text-sm font-semibold text-gray-700">
                      {driver.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      • {driver.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-8">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-md transition-all duration-300 group">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                      <Phone size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-md transition-all duration-300 group">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                      <Mail size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50 hover:shadow-md transition-all duration-300 group">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {currentUser && userRole === 'tourist' && (
                  <>
                    <button
                      onClick={handleOpenChatModal}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 flex items-center justify-center font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transform"
                    >
                      <MessageCircle size={20} className="mr-2" />
                      Send Message
                    </button>
                  </>
                )}
                
                {!currentUser && (
                  <button
                    onClick={onShowAuth}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transform"
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
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-100/50 mb-8 overflow-hidden">
              <div className="border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 to-transparent">
                <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                      activeTab === 'overview'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                    }`}
                  >
                    Overview
                    {activeTab === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                      activeTab === 'services'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                    }`}
                  >
                    Services & Rates
                    {activeTab === 'services' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                      activeTab === 'reviews'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                    }`}
                  >
                    Reviews ({driver.totalReviews || 0})
                    {activeTab === 'reviews' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                        activeTab === 'booking'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                          : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                      }`}
                    >
                      <CalendarIcon size={16} className="inline mr-2" />
                      Book Now
                      {activeTab === 'booking' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                      )}
                    </button>
                  )}
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative ${
                        activeTab === 'chat'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                          : 'border-transparent text-gray-500 hover:text-emerald-600 hover:bg-emerald-50/30'
                      }`}
                    >
                      Messages
                      {messages.filter(msg => 
                        msg.senderId === driverId && !msg.read
                      ).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                          {messages.filter(msg => 
                            msg.senderId === driverId && !msg.read
                          ).length}
                        </span>
                      )}
                      {activeTab === 'chat' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-8 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                        <Clock className="text-white" size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1 text-lg">Experience</h3>
                        <p className="text-gray-700">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">About</h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                          <Languages className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm border-2 border-emerald-200 font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                          <MapPin className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm border-2 border-emerald-200 font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                          <Award className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Certifications</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm border-2 border-blue-200 font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md hover:shadow-lg transition-all duration-300 group">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                          <Shield className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Special Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 px-4 py-2 rounded-full text-sm border-2 border-purple-200 font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
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
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                          <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                            <Car className="text-white" size={22} />
                          </div>
                          Vehicle Type
                        </h3>
                        <p className="text-gray-700 text-xl font-bold">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-white border-2 border-emerald-200 shadow-xl">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center text-xl">
                          <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                            <DollarSign className="text-white" size={24} />
                          </div>
                          Rates
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-5 bg-white rounded-xl border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                            <div>
                              <span className="text-gray-800 font-bold text-lg">Price per day:</span>
                              <p className="text-sm text-gray-600 mt-1">Full day safari tours</p>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-600">
                                LKR {driver.pricePerDay.toLocaleString()}
                              </span>
                              <span className="text-sm font-semibold text-gray-500 block">/day</span>
                            </div>
                          </div>
                          {driver.pricePerHour && (
                            <div className="flex items-center justify-between p-5 bg-white rounded-xl border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                              <div>
                                <span className="text-gray-800 font-bold text-lg">Price per hour:</span>
                                <p className="text-sm text-gray-600 mt-1">Hourly rate</p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-black text-emerald-600">
                                  LKR {driver.pricePerHour.toLocaleString()}
                                </span>
                                <span className="text-sm font-semibold text-gray-500 block">/hour</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                        <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                          <CalendarIcon className="text-white" size={22} />
                        </div>
                        Availability
                      </h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-700 font-medium">
                            Available on {driver.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {driver.availableDates.slice(0, 6).map((date, index) => (
                              <span
                                key={index}
                                className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm border-2 border-emerald-200 font-semibold shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {driver.availableDates.length > 6 && (
                              <span className="text-gray-600 text-sm font-semibold">
                                +{driver.availableDates.length - 6} more dates
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
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">Service Details</h3>
                        <p className="text-gray-700 leading-relaxed text-base">{driver.description}</p>
                      </div>
                    )}
                  </div>
                )}


                {activeTab === 'reviews' && (
                  <ReviewSection 
                    driverId={driverId}
                    currentUser={currentUser}
                    userRole={userRole}
                    onReviewAdded={handleReviewAdded}
                  />
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
                                <span className="font-medium text-green-700">{selectedDates.length} days</span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Price per day:</span>
                                <span className="font-medium">LKR {driver.pricePerDay?.toLocaleString() || '0'}</span>
                              </div>
                              
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                                  <span className="text-2xl font-bold text-green-600">
                                    LKR {(selectedDates.length * (driver.pricePerDay || 0)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔵 Confirm Booking button clicked');
                                  console.log('🔵 Button state:', {
                                    selectedDates: selectedDates.length,
                                    currentUser: !!currentUser,
                                    driver: !!driver,
                                    isBooking: isBooking
                                  });
                                  if (!isBooking) {
                                    handleBooking().catch((error) => {
                                      console.error('❌ Unhandled error in handleBooking:', error);
                                      setIsBooking(false);
                                      alert('An unexpected error occurred. Please check the console (F12) for details.');
                                    });
                                  }
                                }}
                                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium mt-4 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                disabled={selectedDates.length === 0 || isBooking}
                              >
                                {isBooking ? (
                                  <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Processing...
                                  </>
                                ) : selectedDates.length === 0 ? (
                                  'Select Dates First'
                                ) : (
                                  'Confirm Booking'
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Driver Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Driver Information</h3>
                          <p className="text-gray-600 text-sm">
                            You'll be booking with {driver.fullName}, an experienced {driver.serviceType} with {driver.experienceYears || 0} years of experience.
                          </p>
                        </div>
                      </div>
                    </div>
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
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-green-100' 
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
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          onClick={onShowAuth}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
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