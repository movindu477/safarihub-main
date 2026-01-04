import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
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

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";

// Import Chat component
import Chat from "../Chat";

// Import Firebase functions from App
import {
  // createOrGetConversation, // Removed - using Chat component instead
  // sendMessage, // Removed - using Chat component instead
  // getMessages, // Removed - using Chat component instead
  // markMessagesAsRead, // Removed - using Chat component instead
  createNotification,
  getUserNotifications,
  // getConversationById, // Removed - using Chat component instead
  // getOtherParticipant, // Removed - using Chat component instead
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
          className="p-2 rounded-full"
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-full"
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
                h-8 text-sm rounded-lg
                ${selected
                  ? 'bg-emerald-600 text-white font-medium'
                  : available
                    ? isToday
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-gray-50 text-gray-700'
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
        <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <h4 className="font-medium text-emerald-800 mb-2">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <span
                key={index}
                className="bg-emerald-600 text-white px-2 py-1 rounded text-xs"
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

// Old ChatModal component removed - using Chat component instead

const GuideProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const { guideId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // const messagesEndRef = useRef(null); // Removed - using Chat component instead

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  // Old chat state removed - using Chat component instead
  // const [message, setMessage] = useState("");
  // const [messages, setMessages] = useState([]);
  // const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  // const [conversationId, setConversationId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState(null);
  const [isBooking, setIsBooking] = useState(false);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  // const [chatConversationId, setChatConversationId] = useState(null); // Removed - using Chat component instead
  const [chatOtherUser, setChatOtherUser] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const openChat = searchParams.get('openChat');

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, guideId]);

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

  // Old scrollToBottom and messages useEffect removed - using Chat component instead

  // Handle opening chat from URL parameter
  useEffect(() => {
    if (openChat === 'true' && guideId && currentUser && guide) {
      setActiveTab('chat');
      // Open chat modal instead of initializing old conversation
      setChatOtherUser({
        id: guide.id,
        name: guide.guideName || guide.fullName || 'Tour Guide',
        photo: guide.profilePicture || guide.imageUrl || '',
        role: 'guide'
      });
      setIsChatModalOpen(true);
    }
  }, [openChat, guideId, currentUser, guide]);

  // Old formatTime function removed - using Chat component instead

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

  // Old conversation initialization removed - using Chat component instead
  // const initializeConversation = async () => {
  //   // This function has been replaced by the Chat component
  // };

  // useEffect(() => {
  //   // Old message loading code removed
  // }, [conversationId, currentUser]);

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
      guide: !!guide,
      guideId: guide?.id,
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

    if (!guide) {
      console.warn('⚠️ No guide data');
      alert('Guide information not available.');
      return;
    }

    // Verify guide has a valid ID
    if (!guide.id) {
      console.error('❌ Guide ID is missing:', guide);
      alert('Guide information is incomplete. Please try again.');
      return;
    }

    console.log('✅ All pre-checks passed, starting booking process...');
    setIsBooking(true);

    try {
      // Get the authenticated user directly from Firebase Auth
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

      if (!authUser.uid) {
        console.error('❌ No user ID found in auth user');
        alert('Authentication error. Please try logging in again.');
        return;
      }

      // Calculate total price - use dailyRate or calculate from hourlyRate
      const pricePerDay = guide.dailyRate || (guide.hourlyRate ? guide.hourlyRate * 8 : 0);
      const totalPrice = selectedDates.length * pricePerDay;
      const datesString = selectedDates.map(d => d.toLocaleDateString()).join(', ');

      // Get guide email
      const guideEmail = guide.contactEmail || guide.email || '';

      // Validate guide ID
      const guideIdString = String(guide.id || '');
      if (!guideIdString || guideIdString === 'undefined' || guideIdString === 'null' || guideIdString.trim() === '') {
        console.error('❌ Invalid guide ID:', guide.id);
        alert('Invalid guide information. Please refresh the page and try again.');
        return;
      }

      // Create booking in Firestore
      const bookingData = {
        guideId: guideIdString, // Guide ID (similar to driverId)
        guideName: guide.guideName || guide.fullName || 'Tour Guide',
        guideEmail: guideEmail,
        customerId: authUser.uid, // MUST match request.auth.uid
        customerName: authUser.displayName || 'Customer',
        customerEmail: authUser.email || '',
        selectedDates: selectedDates.map(d => d.toISOString()), // Must be an array
        datesString: datesString,
        totalPrice: Number(totalPrice), // Must be a number
        pricePerDay: Number(pricePerDay),
        numberOfDays: Number(selectedDates.length),
        serviceType: 'Tour Guide',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('📝 Creating booking with data:', {
        authUid: authUser.uid,
        customerId: bookingData.customerId,
        guideId: bookingData.guideId,
        selectedDates: bookingData.selectedDates,
        totalPrice: bookingData.totalPrice
      });

      // Validate data types
      const validatedBookingData = {
        ...bookingData,
        guideId: String(bookingData.guideId),
        selectedDates: Array.isArray(bookingData.selectedDates) ? bookingData.selectedDates : [],
        totalPrice: Number(bookingData.totalPrice)
      };

      const bookingRef = collection(db, 'bookings');
      const finalBookingData = validatedBookingData;

      try {
        console.log('🚀 Attempting to create booking in Firestore...');
        const bookingDoc = await addDoc(bookingRef, finalBookingData);
        const bookingId = bookingDoc.id;

        console.log('✅ Booking created successfully with ID:', bookingId);

        // Create confirmation record
        try {
          const confirmationRef = collection(db, 'confirmations');
          const confirmationData = {
            bookingId: bookingId,
            ...bookingData,
            confirmationStatus: 'pending',
            confirmedAt: serverTimestamp(),
            confirmationType: 'booking_request'
          };
          await addDoc(confirmationRef, confirmationData);
          console.log('✅ Confirmation record created');
        } catch (confirmationError) {
          console.warn('⚠️ Could not create confirmation record (non-critical):', confirmationError);
        }

        // Create notification for guide
        try {
          const notificationData = {
            type: 'booking',
            title: 'New Booking Request',
            message: `You have a new booking request from ${authUser.displayName || 'a customer'} for ${selectedDates.length} day(s). Dates: ${datesString}. Total: ${guide.currencyPreference || 'LKR'} ${totalPrice.toLocaleString()}`,
            recipientId: guide.id, // Guide's user ID
            senderId: authUser.uid, // Tourist's user ID
            senderName: authUser.displayName || 'Customer',
            senderEmail: authUser.email || '',
            guideEmail: guideEmail,
            relatedId: bookingId,
            bookingId: bookingId,
            bookingData: {
              dates: datesString,
              selectedDates: selectedDates.map(d => d.toISOString()),
              numberOfDays: selectedDates.length,
              totalPrice: totalPrice,
              customerName: authUser.displayName || 'Customer',
              customerEmail: authUser.email || '',
              guideId: guide.id,
              guideName: guide.guideName || guide.fullName || 'Tour Guide',
              guideEmail: guideEmail,
              pricePerDay: pricePerDay,
              status: 'pending'
            }
          };

          await createNotification(notificationData);
          console.log('✅ Notification created for guide');
        } catch (notificationError) {
          console.warn('⚠️ Could not create notification (non-critical):', notificationError);
        }

        // Show success message
        setSuccessMessageData({
          guideName: guide.guideName || guide.fullName,
          dates: datesString,
          totalPrice: totalPrice,
          numberOfDays: selectedDates.length,
          bookingId: bookingId
        });
        setShowSuccessMessage(true);

        // Reset selected dates
        setSelectedDates([]);
        setIsBooking(false);

        // Don't auto-redirect - wait for user to click "Got it!" button

      } catch (bookingError) {
        console.error('❌ CRITICAL: Failed to create booking document:', bookingError);
        throw bookingError;
      }

    } catch (error) {
      setIsBooking(false);
      console.error('❌ Error creating booking:', error);

      setShowSuccessMessage(false);
      setSuccessMessageData(null);

      let errorMessage = 'Failed to create booking. ';

      if (error.code === 'permission-denied') {
        errorMessage = 'Unable to complete your booking request.\n\nThis may be due to:\n• Your session may have expired\n• Database permissions need to be updated\n\nPlease try:\n1. Log out and log back in\n2. Wait a few moments and try again\n\nIf the problem continues, please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Unable to connect to the server.\n\nPlease check your internet connection and try again.';
      } else {
        errorMessage = 'An unexpected error occurred while processing your booking.\n\nPlease try again. If the problem persists, please contact support.';
      }

      alert(errorMessage);
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);

    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }

    if (notification.type === 'message' && (notification.chatId || notification.conversationId || notification.relatedId)) {
      // Try to get chat from chatting collection (new system)
      const chatId = notification.chatId || notification.conversationId || notification.relatedId;
      try {
        const chatDoc = await getDoc(doc(db, 'chatting', chatId));
        if (chatDoc.exists() && currentUser) {
          const chatData = chatDoc.data();
          const otherId = chatData.participantIds?.find(id => id !== currentUser.uid);
          if (otherId === guideId) {
            // Get other user info
            let otherName = chatData.participantNames?.[otherId] || notification.senderName || 'User';
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
            setIsChatModalOpen(true);
          }
        }
      } catch (chatError) {
        console.warn('Error opening chat from notification:', chatError);
      }
    }
  };

  const handleOpenChatModal = () => {
    if (guide && currentUser) {
      setChatOtherUser({
        id: guide.id,
        name: guide.guideName || guide.fullName || 'Tour Guide',
        photo: guide.profilePicture || guide.imageUrl || '',
        role: 'guide'
      });
      setIsChatModalOpen(true);
    }
  };

  // Old handleSendMessage removed - using Chat component instead
  // const handleSendMessage = async (e) => {
  //   // This function has been replaced by the Chat component
  // };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide profile...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The guide you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/guide')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            Browse All Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Booking Success Message */}
      {showSuccessMessage && successMessageData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Booking Successful!
              </h2>
              <p className="text-gray-600 mb-2">
                Your booking request has been successfully submitted.
              </p>
              <p className="text-sm text-emerald-600 font-semibold mb-6">
                Please wait for the service provider's acceptance.
              </p>
              {successMessageData.bookingId && (
                <p className="text-xs text-gray-500 mb-4">
                  Booking ID: {successMessageData.bookingId.substring(0, 8)}...
                </p>
              )}

              {/* Booking Details */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Guide:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.guideName}</span>
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

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setSuccessMessageData(null);
                  if (guideId) {
                    navigate(`/guide-profile/${guideId}`, { replace: true });
                  } else if (guide?.id) {
                    navigate(`/guide-profile/${guide.id}`, { replace: true });
                  } else {
                    navigate('/guide', { replace: true });
                  }
                }}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg cursor-pointer"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {isChatModalOpen && chatOtherUser && currentUser && (
        <Chat
          user={currentUser}
          otherUserId={chatOtherUser.id}
          otherUserName={chatOtherUser.name}
          otherUserPhoto={chatOtherUser.photo}
          onClose={() => {
            setIsChatModalOpen(false);
            setChatOtherUser(null);
          }}
        />
      )}

      <GlobalNotificationBell
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />


      <div className="bg-white shadow-sm border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/guide')}
                className="flex items-center text-emerald-700 mr-6 font-medium"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back to Guides
              </button>
              <h1 className="text-3xl font-bold text-emerald-800">Tour Guide Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-8 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-8">
                <img
                  src={guide.imageUrl || "/api/placeholder/120/120"}
                  alt={guide.guideName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 mx-auto mb-5 shadow-md"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{guide.guideName}</h2>
                <p className="text-emerald-600 font-medium mb-4">Professional Tour Guide</p>

                {/* Rating */}
                <div className="flex items-center justify-center mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center">
                    {renderStars(guide.rating || 0)}
                    <span className="ml-3 text-sm font-semibold text-gray-700">
                      {guide.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      • {guide.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-8">
                {guide.contactPhone && guide.contactPhone !== 'Not provided' && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <Phone size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{guide.contactPhone}</span>
                  </div>
                )}

                {guide.contactEmail && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <Mail size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{guide.contactEmail}</span>
                  </div>
                )}

                {guide.location && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{guide.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {currentUser && userRole === 'tourist' && (
                  <>
                    <button
                      onClick={handleOpenChatModal}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl flex items-center justify-center font-semibold shadow-lg shadow-emerald-500/30"
                    >
                      <MessageCircle size={20} className="mr-2" />
                      Send Message
                    </button>

                    {selectedDates.length > 0 && (
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/80 border-2 border-emerald-200 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-emerald-800 font-bold text-sm uppercase tracking-wide">Total:</span>
                          <span className="text-emerald-900 font-black text-2xl">
                            {getCurrencySymbol(guide.currencyPreference)}{(selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0)).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={handleBooking}
                          className="w-full bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-3 px-4 rounded-xl font-bold shadow-lg"
                        >
                          Book Now ({selectedDates.length} days)
                        </button>
                      </div>
                    )}
                  </>
                )}

                {!currentUser && (
                  <button
                    onClick={() => {
                      if (onShowAuth) {
                        onShowAuth('login');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-emerald-500/30"
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
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'overview'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                      }`}
                  >
                    Overview
                    {activeTab === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'services'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                      }`}
                  >
                    Services & Rates
                    {activeTab === 'services' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'reviews'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                      }`}
                  >
                    Reviews ({guide.totalReviews || 0})
                    {activeTab === 'reviews' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'booking'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500'
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
                      onClick={() => {
                        setActiveTab('chat');
                        if (currentUser && guide) {
                          handleOpenChatModal();
                        }
                      }}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'chat'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500'
                        }`}
                    >
                      Messages
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
                    <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                      <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                        <Clock className="text-white" size={22} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Experience</h3>
                        <p className="text-gray-600">
                          {guide.experience || 0} years of experience as a professional tour guide
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {guide.description && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">About</h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                          {guide.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {guide.languages && guide.languages.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <Languages className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <Globe className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Areas of Expertise</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.areasOfExpertise.map((area, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm border-2 border-emerald-200 font-semibold shadow-sm"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <GraduationCap className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Special Qualifications</h3>
                          <div className="flex flex-wrap gap-2">
                            {guide.specialQualifications.map((qual, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-4 py-2 rounded-full text-sm border-2 border-green-200 font-semibold shadow-sm"
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
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <FileText className="text-white" size={22} />
                        </div>
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
                    <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-white border-2 border-emerald-200 shadow-xl">
                      <h3 className="font-bold text-gray-900 mb-6 flex items-center text-xl">
                        <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                          <DollarSign className="text-white" size={24} />
                        </div>
                        Rates & Pricing
                      </h3>
                      <div className="space-y-4">
                        {guide.hourlyRate > 0 && (
                          <div className="flex items-center justify-between p-6 bg-white rounded-xl border-2 border-emerald-100 shadow-md">
                            <div>
                              <span className="text-gray-800 font-bold text-lg">Hourly Rate:</span>
                              <p className="text-sm text-gray-600 mt-1">Perfect for short tours and consultations</p>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-600">
                                {getCurrencySymbol(guide.currencyPreference)}{guide.hourlyRate.toLocaleString()}
                              </span>
                              <span className="text-sm font-semibold text-gray-500 block">/hour</span>
                            </div>
                          </div>
                        )}

                        {guide.dailyRate > 0 && (
                          <div className="flex items-center justify-between p-6 bg-white rounded-xl border-2 border-emerald-100 shadow-md">
                            <div>
                              <span className="text-gray-800 font-bold text-lg">Daily Rate:</span>
                              <p className="text-sm text-gray-600 mt-1">Full day guided tours (8+ hours)</p>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-600">
                                {getCurrencySymbol(guide.currencyPreference)}{guide.dailyRate.toLocaleString()}
                              </span>
                              <span className="text-sm font-semibold text-gray-500 block">/day</span>
                            </div>
                          </div>
                        )}

                        {guide.specialPackageRates && (
                          <div className="p-3 bg-white rounded-lg border border-emerald-100">
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
                        <CalendarIcon className="text-emerald-600 mr-2" size={20} />
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
                                className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded text-sm border border-emerald-200 font-medium"
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
                                <span className="font-medium text-emerald-700">{selectedDates.length} days</span>
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
                                  <span className="text-2xl font-bold text-emerald-600">
                                    {getCurrencySymbol(guide.currencyPreference)}
                                    {(selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0)).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={handleBooking}
                                disabled={isBooking || selectedDates.length === 0}
                                className={`w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium mt-4 shadow-md ${isBooking || selectedDates.length === 0
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                                  }`}
                              >
                                {isBooking ? 'Processing...' : 'Confirm Booking'}
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
                  <ReviewSection
                    guideId={guideId}
                    currentUser={currentUser}
                    userRole={userRole}
                    onReviewAdded={handleReviewAdded}
                  />
                )}

                {/* Chat Tab - Opens Chat Modal */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col items-center justify-center">
                    {currentUser ? (
                      <div className="text-center">
                        <MessageCircle size={64} className="mx-auto mb-4 text-emerald-600" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Chat with {guide.guideName || guide.fullName || 'Tour Guide'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Click the button below to open the chat window
                        </p>
                        <button
                          onClick={handleOpenChatModal}
                          className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                        >
                          <MessageCircle size={20} />
                          Open Chat
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Please login to start a conversation with {guide.guideName || guide.fullName || 'this guide'}
                        </p>
                        <button
                          onClick={() => {
                            if (onShowAuth) {
                              onShowAuth('login');
                            }
                          }}
                          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium"
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