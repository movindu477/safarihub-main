import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  onSnapshot
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
  CheckCircle,
  Package
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

// Calendar Component for Date Selection with Availability Display
const DatePickerCalendar = ({ selectedDates, onDateSelect, availableDates, availabilityCalendar }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
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

  const getDateKey = (date) => {
    if (!date) return null;
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  const getAvailabilityStatus = (date) => {
    if (!date) return null;
    const dateKey = getDateKey(date);

    // Check new availability calendar format (object)
    if (availabilityCalendar && typeof availabilityCalendar === 'object' && !Array.isArray(availabilityCalendar)) {
      const status = availabilityCalendar[dateKey];
      // Return status if it exists, otherwise return null (which means available)
      if (status && ['busy', 'halfday', 'unavailable'].includes(status)) {
        return status;
      }
      // If no status marked, return null (available by default)
      return null;
    }

    // Fallback to old availableDates array format
    if (availableDates && Array.isArray(availableDates)) {
      const dateString = date.toISOString().split('T')[0];
      const isInArray = availableDates.some(availableDate => {
        const availableDateString = new Date(availableDate).toISOString().split('T')[0];
        return availableDateString === dateString;
      });
      return isInArray ? null : 'unavailable'; // If in array = available, if not = unavailable
    }

    // Default: no status means available
    return null;
  };

  const isDateAvailable = (date) => {
    const status = getAvailabilityStatus(date);
    // Available if status is null/undefined or 'available' (not marked as busy/unavailable)
    return status === null || status === 'available' || status === 'halfday';
  };

  const isDateSelected = (date) => {
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
    if (!isDateAvailable(date)) return; // Don't allow selection of unavailable dates
    onDateSelect(date);
  };

  const getDateClassName = (date) => {
    if (!date) return '';
    const status = getAvailabilityStatus(date);
    const selected = isDateSelected(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isPast = isDatePast(date);

    const baseClasses = 'relative w-full h-8 sm:h-10 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium flex items-center justify-center';

    if (isPast) {
      return `${baseClasses} bg-gray-800/50 text-gray-600 cursor-not-allowed`;
    }

    if (selected) {
      return `${baseClasses} bg-black text-white ring-2 ring-gray-400`;
    }

    // Handle availability statuses
    if (status === 'busy') {
      return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
    } else if (status === 'halfday') {
      return `${baseClasses} bg-yellow-500 text-white hover:bg-yellow-600`;
    } else if (status === 'unavailable') {
      return `${baseClasses} bg-gray-600 text-white cursor-not-allowed opacity-75`;
    } else {
      // No status or null means available (green) - this is the default
      return `${baseClasses} ${isToday ? 'bg-gray-200 text-black border-2 border-gray-400' : 'bg-gray-500/20 text-gray-300 border border-black/30 hover:bg-gray-500/30'} cursor-pointer`;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/40 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateMonth(-1);
          }}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateMonth(1);
          }}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 rotate-180" />
        </button>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-2 bg-gray-800/30 rounded-lg border border-gray-700/40">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-gray-500/20 border border-black/30 rounded"></div>
          <span className="text-gray-300">Available</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-300">Busy</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-300">Half Day</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-gray-600 rounded"></div>
          <span className="text-gray-300">Unavailable</span>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-8 sm:h-10"></div>;
          }

          const dateKey = getDateKey(date);
          const status = getAvailabilityStatus(date);
          const isPast = isDatePast(date);
          const isAvailable = isDateAvailable(date);

          return (
            <button
              key={dateKey || `date-${index}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isPast && isAvailable) {
                  handleDateClick(date);
                }
              }}
              disabled={!isAvailable || isPast}
              className={getDateClassName(date)}
              title={(() => {
                if (isPast) return 'Past date';
                if (status === 'busy') return 'Busy - Not available';
                if (status === 'halfday') return 'Half day available';
                if (status === 'unavailable') return 'Unavailable';
                return 'Available - Click to select';
              })()}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDates.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
          <h4 className="font-medium text-gray-700 mb-2 text-sm">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <span
                key={index}
                className="bg-black text-white px-2 py-1 rounded text-xs"
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
  const [hasAcceptedBooking, setHasAcceptedBooking] = useState(false);

  // Package booking states
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [dateBookingTypes, setDateBookingTypes] = useState({}); // { 'dateKey': 'fullDay' | 'halfDay' }
  const [showDayTypeModal, setShowDayTypeModal] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const [expandedPackage, setExpandedPackage] = useState(null); // Track which package is expanded

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

  // Check for accepted bookings to enable messaging
  useEffect(() => {
    const checkAcceptedBooking = async () => {
      if (!currentUser || !guideId) {
        setHasAcceptedBooking(false);
        return;
      }

      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('customerId', '==', currentUser.uid),
          where('guideId', '==', guideId),
          where('status', 'in', ['accepted', 'confirmed', 'completed'])
        );

        const snapshot = await getDocs(q);
        setHasAcceptedBooking(!snapshot.empty);
      } catch (error) {
        console.error('Error checking for accepted bookings:', error);
        setHasAcceptedBooking(false);
      }
    };

    checkAcceptedBooking();
  }, [currentUser, guideId]);

  // Handle opening chat from URL parameter
  useEffect(() => {
    if (openChat === 'true' && guideId && currentUser && guide && hasAcceptedBooking) {
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
  }, [openChat, guideId, currentUser, guide, hasAcceptedBooking]);

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

            // Pricing - map all possible field names
            hourlyRate: guideData.hourlyRate || 0,
            dailyRate: guideData.dailyRate || guideData.fullDayPrice || guideData.priceFullDay || 0,
            priceFullDayStandard: guideData.priceFullDayStandard || guideData.fullDayPrice || guideData.priceFullDay || guideData.dailyRate || 0,
            priceHalfDayStandard: guideData.priceHalfDayStandard || guideData.halfDayPrice || guideData.priceHalfDay || Math.round((guideData.dailyRate || guideData.fullDayPrice || 0) * 0.6),
            fullDayPrice: guideData.fullDayPrice || guideData.priceFullDay || guideData.dailyRate || 0,
            halfDayPrice: guideData.halfDayPrice || guideData.priceHalfDay || Math.round((guideData.fullDayPrice || guideData.dailyRate || 0) * 0.6),

            specialPackageRates: guideData.specialPackageRates || '',
            currencyPreference: guideData.currencyPreference || 'LKR',
            experience: guideData.experienceYears || guideData.experience || guideData.yearsOfExperience || 0,

            specialQualifications: Array.isArray(guideData.specialQualifications) ? guideData.specialQualifications :
              guideData.specialQualifications ? [guideData.specialQualifications] : [],

            areasOfExpertise: Array.isArray(guideData.areasOfExpertise) ? guideData.areasOfExpertise :
              Array.isArray(guideData.expertise) ? guideData.expertise :
                guideData.areasOfExpertise ? [guideData.areasOfExpertise] :
                  guideData.expertise ? [guideData.expertise] : [],

            // Destinations - map all possible field names
            destinations: Array.isArray(guideData.destinations) ? guideData.destinations :
              Array.isArray(guideData.destinationsCovered) ? guideData.destinationsCovered :
                Array.isArray(guideData.destination) ? guideData.destination :
                  guideData.destinations ? [guideData.destinations] :
                    guideData.destinationsCovered ? [guideData.destinationsCovered] :
                      guideData.destination ? [guideData.destination] : [],

            // Certifications
            certifications: Array.isArray(guideData.certifications) ? guideData.certifications :
              guideData.certifications ? [guideData.certifications] : [],
            certificationStatus: guideData.certificationStatus || 'non-certified',
            verificationDocuments: Array.isArray(guideData.verificationDocuments) ? guideData.verificationDocuments :
              guideData.verificationDocuments ? [guideData.verificationDocuments] : [],

            // Languages
            languages: Array.isArray(guideData.languages) ? guideData.languages :
              Array.isArray(guideData.languagesSpoken) ? guideData.languagesSpoken :
                guideData.languagesSpoken ? [guideData.languagesSpoken] :
                  guideData.languages ? [guideData.languages] :
                    ['English', 'Sinhala'],

            contactPhone: guideData.contactPhone || guideData.phone || guideData.phoneNumber || 'Not provided',
            contactEmail: guideData.contactEmail || guideData.email || '',
            description: guideData.description || guideData.bio || guideData.about || 'Experienced tour guide',
            featured: guideData.featured || false,
            availability: guideData.availability !== false,

            // Ensure availability is an object, not array
            availabilityCalendar: (guideData.availability && typeof guideData.availability === 'object' && !Array.isArray(guideData.availability))
              ? guideData.availability
              : {}, // Object: { "YYYY-MM-DD": "busy"|"halfday"|"unavailable" }
            availableDates: guideData.availableDates || [], // Keep for backward compatibility

            // Packages - will be fetched separately via useEffect
            packages: [],

            isCurrentUser: currentUser && currentUser.uid === guideId
          };

          setGuide(transformedGuide);

          // Fetch certification documents if guide is certified
          if (guideData.certificationStatus === 'certified') {
            try {
              const certDocRef = doc(db, 'guideCertifications', guideId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                console.log('✅ Certification documents found:', certData);

                // Set certification documents with URLs
                if (certData.documents && Array.isArray(certData.documents)) {
                  transformedGuide.certificationDocuments = certData.documents;
                  setGuide({ ...transformedGuide, certificationDocuments: certData.documents });
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents:', err);
            }
          }
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

  // Fetch packages for this guide
  useEffect(() => {
    if (!guideId) return;

    const packagesQuery = query(
      collection(db, 'servicePackages'),
      where('providerId', '==', guideId)
    );

    const unsubscribe = onSnapshot(packagesQuery, (snapshot) => {
      const packagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackages(packagesData);

      // Also update guide object with packages
      setGuide(prev => prev ? { ...prev, packages: packagesData } : null);
    });

    return () => unsubscribe();
  }, [guideId]);

  // Old conversation initialization removed - using Chat component instead
  // const initializeConversation = async () => {
  //   // This function has been replaced by the Chat component
  // };

  // useEffect(() => {
  //   // Old message loading code removed
  // }, [conversationId, currentUser]);

  const handleDateSelect = (date) => {
    if (selectedPackage) {
      // Package booking mode - show Full Day/Half Day modal
      setPendingDate(date);
      setShowDayTypeModal(true);
    } else {
      // Regular booking mode - toggle date selection
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
    }
  };

  const handleDayTypeSelection = (dayType) => {
    if (!pendingDate) return;

    const dateKey = pendingDate.toDateString();
    const isSelected = selectedDates.some(d => d.toDateString() === dateKey);

    if (isSelected) {
      // Remove date
      setSelectedDates(prev => prev.filter(d => d.toDateString() !== dateKey));
      setDateBookingTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes[dateKey];
        return newTypes;
      });
    } else {
      // Add date with booking type
      setSelectedDates(prev => [...prev, pendingDate]);
      setDateBookingTypes(prev => ({
        ...prev,
        [dateKey]: dayType
      }));
    }

    setShowDayTypeModal(false);
    setPendingDate(null);
  };

  const clearPackageSelection = () => {
    setSelectedPackage(null);
    setSelectedDates([]);
    setDateBookingTypes({});
  };

  const calculateTotal = () => {
    if (!selectedPackage) {
      // Regular booking
      return selectedDates.length * (guide?.dailyRate || guide?.hourlyRate * 8 || 0);
    }

    // Package booking
    let total = 0;
    selectedDates.forEach(date => {
      const dateKey = date.toDateString();
      const dayType = dateBookingTypes[dateKey];
      if (dayType === 'fullDay') {
        total += selectedPackage.fullDayPrice || 0;
      } else if (dayType === 'halfDay') {
        total += selectedPackage.halfDayPrice || 0;
      }
    });
    return total;
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
          destinations: Array.isArray(guideData.destinations) ? guideData.destinations :
            guideData.destinations ? [guideData.destinations] : [],
          certifications: Array.isArray(guideData.certifications) ? guideData.certifications :
            guideData.certifications ? [guideData.certifications] : [],
          certificationStatus: guideData.certificationStatus || 'non-certified',
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
          priceFullDayStandard: guideData.priceFullDayStandard || guideData.dailyRate || 0,
          priceHalfDayStandard: guideData.priceHalfDayStandard || Math.round((guideData.dailyRate || 0) * 0.6),
          isCurrentUser: currentUser && currentUser.uid === guideId
        };

        // Fetch certification documents if guide is certified
        if (guideData.certificationStatus === 'certified') {
          try {
            const certDocRef = doc(db, 'guideCertifications', guideId);
            const certDocSnap = await getDoc(certDocRef);

            if (certDocSnap.exists()) {
              const certData = certDocSnap.data();
              console.log('✅ Certification documents found (refresh):', certData);

              if (certData.documents && Array.isArray(certData.documents)) {
                transformedGuide.certificationDocuments = certData.documents;
              }
            }
          } catch (err) {
            console.error('Error fetching certification documents (refresh):', err);
          }
        }

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
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide profile...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The guide you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/guide')}
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Browse All Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 flex flex-col lg:overflow-hidden lg:max-h-screen">
      {/* Booking Success Message */}
      {showSuccessMessage && successMessageData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-gray-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Booking Successful!
              </h2>
              <p className="text-gray-600 mb-2">
                Your booking request has been successfully submitted.
              </p>
              <p className="text-sm text-gray-700 font-semibold mb-6">
                Please wait for the service provider's acceptance.
              </p>
              {successMessageData.bookingId && (
                <p className="text-xs text-gray-500 mb-4">
                  Booking ID: {successMessageData.bookingId.substring(0, 8)}...
                </p>
              )}

              {/* Booking Details */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 border border-gray-300">
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
                <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                  <span className="text-gray-600 font-bold">Total:</span>
                  <span className="text-black font-bold text-lg">LKR {successMessageData.totalPrice.toLocaleString()}</span>
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
                className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold shadow-lg cursor-pointer hover:bg-gray-800 transition-colors"
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


      <div className="bg-gradient-to-r from-black via-gray-800 to-black border-b border-gray-300 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
            <div className="flex items-center">
              <button
                onClick={() => {
                  // Navigate back to guide listing page
                  navigate('/guide');
                  // The scroll will be handled by GuideSection2 component
                }}
                className="flex items-center text-white mr-3 sm:mr-4 md:mr-6 font-medium hover:text-gray-200 transition-colors touch-manipulation"
              >
                <ArrowLeft size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
                <span className="text-sm sm:text-base md:text-lg">
                  <span className="hidden sm:inline">Back to Guides</span>
                  <span className="sm:hidden">Back</span>
                </span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white">Tour Guide Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:overflow-hidden flex flex-col">
        <div className="w-full lg:flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col lg:h-full shadow-xl lg:overflow-y-auto">
              {/* Profile Header */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <img
                  src={guide.imageUrl || "/api/placeholder/120/120"}
                  alt={guide.guideName}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-black shadow-2xl mx-auto mb-2 sm:mb-2.5 md:mb-3"
                />
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black mb-1">{guide.guideName}</h2>
                <p className="text-gray-700 font-medium mb-2 sm:mb-2.5 md:mb-3 text-xs sm:text-sm md:text-base">Professional Tour Guide</p>

                {/* Rating */}
                <div className="flex items-center justify-center mt-2 sm:mt-2.5 md:mt-3 bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-gray-300">
                  <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2">
                    {renderStars(guide.rating || 0)}
                    <span className="text-xs sm:text-sm font-semibold text-black">
                      {guide.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    {guide.totalReviews > 0 && (
                      <span className="text-xs sm:text-sm text-gray-600">
                        • {guide.totalReviews} reviews
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-3 sm:mb-4 md:mb-5 flex-1">
                {guide.contactPhone && guide.contactPhone !== 'Not provided' && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-gray-50 border border-gray-300">
                    <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                      <Phone size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black break-words">{guide.contactPhone}</span>
                  </div>
                )}

                {guide.contactEmail && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-gray-50 border border-gray-300">
                    <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                      <Mail size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black break-words">{guide.contactEmail}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {currentUser && userRole === 'tourist' && (
                  <>
                    {selectedDates.length > 0 && (
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-2xl p-5 shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-black font-bold text-sm uppercase tracking-wide">Total:</span>
                          <span className="text-black font-black text-2xl">
                            {getCurrencySymbol(guide.currencyPreference)}{(selectedDates.length * (guide.dailyRate || guide.hourlyRate * 8 || 0)).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={handleBooking}
                          className="w-full bg-black text-white py-3 px-4 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-colors"
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
                    className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:bg-gray-800 transition-colors"
                  >
                    Login to Book
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden flex flex-col lg:flex-1 min-h-0 w-full">
              <div className="border-b border-gray-300 bg-gradient-to-r from-gray-200 to-gray-100">
                <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'overview'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'services'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    <span className="hidden sm:inline">Service Packages</span>
                    <span className="sm:hidden">Packages</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'reviews'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    <span className="hidden sm:inline">Reviews</span>
                    <span className="sm:hidden">Rev</span>
                    {guide.totalReviews > 0 && ` (${guide.totalReviews})`}
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'booking'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                      <CalendarIcon size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 inline mr-1.5 sm:mr-2 md:mr-2.5" />
                      <span className="hidden sm:inline">Book Now</span>
                      <span className="sm:hidden">Book</span>
                    </button>
                  )}
                  {currentUser && hasAcceptedBooking && (
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        if (currentUser && guide) {
                          handleOpenChatModal();
                        }
                      }}
                      className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'chat'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                      <span className="hidden sm:inline">Messages</span>
                      <span className="sm:hidden">Msg</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-2.5 sm:p-3 md:p-4 lg:p-5 lg:overflow-hidden lg:flex-1 bg-gradient-to-b from-white to-gray-50 text-black">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* About - Moved to top */}
                    {guide.description && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">About</h3>
                        <p className="text-gray-700 leading-relaxed text-xs sm:text-sm line-clamp-3">
                          {guide.description}
                        </p>
                      </div>
                    )}

                    {/* Experience */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                        <Clock className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">Experience</h3>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                          {guide.experience || 0} years of experience as a professional tour guide
                        </p>
                      </div>
                    </div>

                    {/* Pricing - Full Day and Half Day Rates */}
                    {(guide.priceFullDayStandard > 0 || guide.priceHalfDayStandard > 0) && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-2 sm:mb-2.5 flex items-center text-xs sm:text-sm md:text-base">
                          <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                            <DollarSign className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                          </div>
                          Rates
                          {guide.certificationStatus === 'certified' && guide.certificationApproved && (
                            <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium border border-yellow-300">
                              Certified Rates
                            </span>
                          )}
                        </h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {/* Full Day Price */}
                          {guide.priceFullDayStandard > 0 && (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Full Day Tour:</span>
                                <p className="text-xs text-emerald-600 mt-0.5">Full day guided tour</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                  LKR {guide.priceFullDayStandard.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 block">/day</span>
                              </div>
                            </div>
                          )}
                          {/* Half Day Price */}
                          {guide.priceHalfDayStandard > 0 && (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Half Day Tour:</span>
                                <p className="text-xs text-emerald-600 mt-0.5">Half day guided tour</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                  LKR {guide.priceHalfDayStandard.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 block">/half day</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {guide.languages && guide.languages.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <Languages className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Languages</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destination Covered */}
                    {guide.destinations && guide.destinations.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <MapPin className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Destination Covered</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.destinations.map((dest, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {dest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications - Only for certified guides */}
                    {guide.certificationStatus === 'certified' && (guide.certificationDocuments?.length > 0 || guide.certifications?.length > 0) && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <Award className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Certifications</h3>
                          <div className="space-y-1.5">
                            {/* Display certificationDocuments (with URLs) */}
                            {guide.certificationDocuments?.map((doc, index) => (
                              <div
                                key={`doc-${index}`}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-300 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <FileText size={14} className="text-gray-600 flex-shrink-0" />
                                  <span className="font-semibold truncate">{doc.certificationName || 'Certification'}</span>
                                </div>
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 text-blue-600 hover:text-blue-800 underline text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}

                            {/* Display certifications array (names only) */}
                            {guide.certifications?.filter(cert =>
                              !guide.certificationDocuments?.some(doc => doc.certificationName === cert)
                            ).map((cert, index) => (
                              <div
                                key={`cert-${index}`}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-300 flex items-center gap-1.5"
                              >
                                <FileText size={14} className="text-gray-600 flex-shrink-0" />
                                <span className="font-semibold">{cert}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Areas of Expertise */}
                    {guide.areasOfExpertise && guide.areasOfExpertise.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <Globe className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Areas of Expertise</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.areasOfExpertise.map((area, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
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
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <GraduationCap className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Special Qualifications</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.specialQualifications.map((qual, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
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
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 flex-shrink-0">
                          <FileText className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Verification Documents</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.verificationDocuments.map((doc, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
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
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* Check if packages exist */}
                    {guide.packages && guide.packages.length > 0 ? (
                      <div className="space-y-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Available Service Packages</h2>
                        {guide.packages.map((pkg, index) => (
                          <div key={index} className="bg-white border-2 border-gray-300 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              {/* Package Info */}
                              <div className="flex-1">
                                <h3 className="text-lg sm:text-xl font-bold text-black mb-2">{pkg.title || 'Tour Package'}</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-4">{pkg.description || ''}</p>
                              </div>

                              {/* Pricing - Tour Guide (Single set of prices) */}
                              <div className="flex flex-col gap-2 lg:min-w-[200px]">
                                {/* Full Day Price */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-700 text-sm font-medium">🚙 Full Day</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xl sm:text-2xl font-black text-emerald-700">
                                      LKR {pkg.fullDayPrice?.toLocaleString() || '0'}
                                    </span>
                                  </div>
                                </div>

                                {/* Half Day Price */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-700 text-sm font-medium">🚙 Half Day</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xl sm:text-2xl font-black text-emerald-700">
                                      LKR {pkg.halfDayPrice?.toLocaleString() || '0'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details - Shows ABOVE button when expanded */}
                            {expandedPackage === pkg.id && (pkg.rules || pkg.benefits || pkg.facilities) && (
                              <div className="mt-4 space-y-4">
                                {/* Rules & Regulations */}
                                {pkg.rules && pkg.rules.trim() && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-5 w-5 text-blue-600" />
                                      <h4 className="font-semibold text-blue-900">Rules & Regulations</h4>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pkg.rules}</p>
                                  </div>
                                )}

                                {/* Benefits */}
                                {pkg.benefits && pkg.benefits.trim() && (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                      <h4 className="font-semibold text-green-900">Benefits</h4>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pkg.benefits}</p>
                                  </div>
                                )}

                                {/* Facilities */}
                                {pkg.facilities && pkg.facilities.trim() && (
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Package className="h-5 w-5 text-purple-600" />
                                      <h4 className="font-semibold text-purple-900">Facilities</h4>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{pkg.facilities}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Book Button */}
                            {currentUser && userRole === 'tourist' && (
                              <button
                                onClick={() => {
                                  // Select package and navigate to booking tab
                                  setSelectedPackage(pkg);
                                  setActiveTab('booking');
                                  setSelectedDates([]);
                                  setDateBookingTypes({});
                                }}
                                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                              >
                                <CalendarIcon className="h-5 w-5" />
                                Book This Package
                              </button>
                            )}

                            {/* Expand/Collapse Trigger - BELOW button */}
                            {(pkg.rules || pkg.benefits || pkg.facilities) && (
                              <div
                                className="text-center text-sm text-gray-500 mt-3 cursor-pointer hover:text-gray-700 transition-colors"
                                onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id)}
                              >
                                {expandedPackage === pkg.id ? 'Click to collapse' : 'Click to see more details'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Empty state for packages */
                      <div className="flex flex-col items-center justify-center py-16 sm:py-20 md:py-24">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-4 sm:mb-6">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-full h-full text-gray-400"
                          >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700 mb-2">
                          No Packages Available
                        </h3>
                        <p className="text-sm sm:text-base text-gray-500 text-center max-w-md">
                          This service provider hasn't created any packages yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Tab */}
                {activeTab === 'booking' && currentUser && userRole === 'tourist' && (
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* Package Selection Banner */}
                    {selectedPackage && (
                      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 relative">
                        <button
                          onClick={clearPackageSelection}
                          className="absolute top-3 right-3 p-1 hover:bg-emerald-100 rounded-full transition-colors"
                          title="Clear package selection"
                        >
                          <X className="h-5 w-5 text-emerald-700" />
                        </button>
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-600 rounded-lg">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 pr-8">
                            <h4 className="font-bold text-emerald-900 text-base mb-2">{selectedPackage.title}</h4>
                            <div className="flex flex-wrap gap-3 mb-2">
                              <span className="text-sm text-emerald-800">
                                <strong>Full Day:</strong> LKR {selectedPackage.fullDayPrice?.toLocaleString()}
                              </span>
                              <span className="text-sm text-emerald-800">
                                <strong>Half Day:</strong> LKR {selectedPackage.halfDayPrice?.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-emerald-700 flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              Package booking mode active - Click X to return to regular booking
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Full Day/Half Day Selection Modal */}
                    {showDayTypeModal && pendingDate && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDayTypeModal(false)}>
                        <div className="bg-white rounded-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Select Tour Duration
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            {pendingDate.toLocaleDateString()}
                          </p>
                          <div className="space-y-3">
                            <button
                              onClick={() => handleDayTypeSelection('fullDay')}
                              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                              Full Day
                            </button>
                            <button
                              onClick={() => handleDayTypeSelection('halfDay')}
                              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                            >
                              Half Day
                            </button>
                            <button
                              onClick={() => {
                                setShowDayTypeModal(false);
                                setPendingDate(null);
                              }}
                              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                      {/* Calendar */}
                      <div className="min-h-0">
                        <h3 className="font-semibold text-black mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">
                          {selectedPackage ? 'Step 2: Select Your Dates' : 'Select Your Dates'}
                        </h3>
                        <div className="overflow-y-auto max-h-[300px] sm:max-h-[350px] md:max-h-[400px]">
                          <DatePickerCalendar
                            selectedDates={selectedDates}
                            onDateSelect={handleDateSelect}
                            availableDates={guide.availableDates}
                            availabilityCalendar={guide.availabilityCalendar}
                          />
                        </div>
                      </div>

                      {/* Booking Summary */}
                      <div className="space-y-2.5 sm:space-y-3 md:space-y-4 min-h-0">
                        <div className="bg-white border border-gray-300 rounded-lg p-2.5 sm:p-3 md:p-4">
                          <h3 className="font-semibold text-black mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">Booking Summary</h3>

                          {selectedDates.length === 0 ? (
                            <p className="text-gray-600 text-center py-3 sm:py-4 text-xs sm:text-sm">
                              Select dates to see booking details
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* Package Info Badge */}
                              {selectedPackage && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 text-emerald-700 mb-1">
                                    <Package className="h-4 w-4" />
                                    <span className="font-semibold text-sm">Package Booking</span>
                                  </div>
                                  <p className="text-emerald-800 font-medium text-xs">{selectedPackage.title}</p>
                                </div>
                              )}

                              {/* Selected Dates Header */}
                              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                <span className="text-gray-700 text-xs sm:text-sm font-medium">Selected dates:</span>
                                <span className="font-semibold text-black text-xs sm:text-sm">{selectedDates.length} day(s)</span>
                              </div>

                              {/* Date List with Types and Prices */}
                              <div className="space-y-2">
                                {selectedDates.sort((a, b) => a - b).map((date, index) => {
                                  const dateKey = date.toDateString();
                                  const dayType = dateBookingTypes[dateKey];
                                  const price = selectedPackage
                                    ? (dayType === 'fullDay' ? selectedPackage.fullDayPrice : selectedPackage.halfDayPrice)
                                    : (guide?.dailyRate || guide?.hourlyRate * 8 || 0);

                                  return (
                                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded border border-gray-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-700">{date.toLocaleDateString('en-US', { month: '1/2-digit', day: '2-digit', year: 'numeric' })}</span>
                                        {selectedPackage && dayType && (
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${dayType === 'fullDay' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                            {dayType === 'fullDay' ? 'Full Day' : 'Half Day'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-semibold text-black">LKR {price?.toLocaleString()}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Price per day (for non-package bookings) */}
                              {!selectedPackage && (
                                <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-2">
                                  <span className="text-gray-700">Price per day:</span>
                                  <span className="font-medium text-black">LKR {(guide?.dailyRate || guide?.hourlyRate * 8 || 0).toLocaleString()}</span>
                                </div>
                              )}

                              {/* Total */}
                              <div className="border-t-2 border-gray-300 pt-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-base sm:text-lg font-bold text-black">Total:</span>
                                  <span className="text-xl sm:text-2xl font-black text-black">
                                    LKR {calculateTotal().toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Continue Button */}
                              <button
                                onClick={handleBooking}
                                disabled={isBooking || selectedDates.length === 0}
                                className={`w-full bg-black text-white py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${isBooking || selectedDates.length === 0
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-gray-800'
                                  }`}
                              >
                                {isBooking ? 'Processing...' : 'Continue to Booking Details'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    <ReviewSection
                      guideId={guideId}
                      currentUser={currentUser}
                      userRole={userRole}
                      onReviewAdded={handleReviewAdded}
                    />
                  </div>
                )}

                {/* Chat Tab - Opens Chat Modal */}
                {activeTab === 'chat' && (
                  <div className="min-h-[300px] lg:h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                    {currentUser ? (
                      <div className="text-center">
                        <MessageCircle size={48} className="sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 text-black" />
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black mb-2">
                          Chat with {guide.guideName || guide.fullName || 'Tour Guide'}
                        </h3>
                        <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-4 sm:mb-6">
                          Click the button below to open the chat window
                        </p>
                        <button
                          onClick={handleOpenChatModal}
                          className="bg-gray-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 mx-auto text-xs sm:text-sm md:text-base"
                        >
                          <MessageCircle size={16} className="sm:w-5 sm:h-5" />
                          Open Chat
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <MessageCircle size={40} className="sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-3 sm:mb-4 text-gray-400" />
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-700 text-xs sm:text-sm mb-4">
                          Please login to start a conversation with {guide.guideName || guide.fullName || 'this guide'}
                        </p>
                        <button
                          onClick={() => {
                            if (onShowAuth) {
                              onShowAuth('login');
                            }
                          }}
                          className="bg-gray-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm"
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