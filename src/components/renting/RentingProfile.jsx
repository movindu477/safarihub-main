import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  updateDoc,
  getDocs
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
  Package,
  UserCircle,
  Globe,
  FileText
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
// Use auth from App.jsx instead of creating new instance

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";

// Import Chat component
import Chat from "../Chat";

// Import Supabase helper for document URLs
import { getDocumentUrl } from '../../lib/supabase';


// Import rating update function
import { updateRentalProviderRating } from "../../reviewservice";

// Import personalization service
import { trackActivity } from "../../services/personalizationService";

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
  GlobalNotificationBell,
} from "../../App";

// Product/Package Component for Renting
const PackageCard = ({ pkg, isOwner }) => {
  const [inStock, setInStock] = useState(pkg.available !== false);
  const navigate = useNavigate();

  const toggleStock = async (e) => {
    e.stopPropagation();
    if (!isOwner) return;

    try {
      const db = getFirestore();
      const pkgRef = doc(db, 'rentalProducts', pkg.id);
      await updateDoc(pkgRef, {
        available: !inStock
      });
      setInStock(!inStock);
    } catch (error) {
      console.error("Error updating stock status:", error);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {pkg.images && pkg.images.length > 0 ? (
          <img
            src={pkg.images[0]}
            alt={pkg.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Package size={48} />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${inStock
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white'
            }`}>
            {inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        {pkg.category && (
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-medium">
              {pkg.category}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
            {pkg.title}
          </h3>
        </div>

        {(pkg.brand || pkg.model) && (
          <p className="text-xs text-gray-500 mb-3 font-medium">
            {pkg.brand} {pkg.model && `• ${pkg.model}`}
          </p>
        )}

        <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
          {pkg.description}
        </p>

        {!isOwner && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 font-medium leading-tight">
              Contact service provider to rent this product
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 mt-auto">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Price per day</p>
              <p className="text-xl font-black text-gray-900">
                LKR {(pkg.pricePerDay || 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">/day</span>
              </p>
            </div>

            {isOwner && (
              <button
                onClick={toggleStock}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Change Status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Old ChatModal component removed - using Chat component instead



const RentingProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { providerId: paramProviderId } = useParams(); // Get providerId from URL parameter
  // const messagesEndRef = useRef(null); // Removed - using Chat component instead

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatOtherUser, setChatOtherUser] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);


  const searchParams = new URLSearchParams(location.search);
  const providerId = paramProviderId || searchParams.get('providerId'); // Use providerId from URL params, fallback to query params
  const openChat = searchParams.get('openChat');

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, providerId]);

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

  // Reset state when providerId changes
  useEffect(() => {
    setError("");
    setActiveTab("overview");
    setIsChatModalOpen(false);
    setChatOtherUser(null);
  }, [providerId]);

  // Track recently viewed
  useEffect(() => {
    if (providerId && currentUser && provider) {
      trackActivity(currentUser.uid, 'view', providerId, 'renting-shop', {
        fullName: provider.fullName || '',
        location: provider.location || '',
        rating: provider.rating || 0
      });
    }
  }, [providerId, currentUser, provider]);

  // Handle opening chat from URL parameter
  useEffect(() => {
    if (openChat === 'true' && providerId && currentUser && provider) {
      setActiveTab('chat');
      setChatOtherUser({
        id: provider.id,
        name: provider.fullName || 'provider',
        photo: provider.profilePicture || provider.imageUrl || '',
        role: 'provider'
      });
      setIsChatModalOpen(true);
    }
  }, [openChat, providerId, currentUser, provider]);

  // Fetch packages subcollection
  useEffect(() => {
    const fetchPackageData = async () => {
      if (!providerId) return;
      setLoadingPackages(true);
      try {
        const pkgRef = collection(db, 'rentalProducts');
        const q = query(pkgRef, where('providerId', '==', providerId));
        const pkgSnap = await getDocs(q);
        const pkgs = pkgSnap.docs.map(doc => ({
          id: doc.id,
          providerId,
          ...doc.data()
        }));
        setPackages(pkgs);
      } catch (err) {
        console.error("Error fetching packages:", err);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchPackageData();
  }, [providerId]);

  // User role and auth tracking
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
      if (!providerId) {
        setError("No provider ID provided");
        setLoading(false);
        return;
      }

      // Reset state before fetching
      setLoading(true);
      setError("");
      setProvider(null);
      setActiveTab("overview");

      try {
        const driverDoc = await getDoc(doc(db, 'serviceProviders', providerId));

        if (driverDoc.exists()) {
          const driverData = driverDoc.data();

          const providerInfo = {
            id: driverDoc.id,
            ...driverData,
            // Ensure availability is an object, not array
            availabilityCalendar: (driverData.availability && typeof driverData.availability === 'object' && !Array.isArray(driverData.availability))
              ? driverData.availability
              : {}, // Object mapping dates to status
            availableDates: driverData.availableDates || [] // Keep for backward compatibility
          };

          // Fetch certification documents if provider is certified
          if (driverData.certificationStatus === 'certified') {
            try {
              // Renting stores use jeepDriverCertifications collection (same as drivers)
              const certDocRef = doc(db, 'jeepDriverCertifications', providerId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                console.log('✅ Certification documents found:', certData);

                if (certData.documents && Array.isArray(certData.documents)) {
                  // Resolve URLs if needed
                  const documentsWithUrls = await Promise.all(certData.documents.map(async (doc) => {
                    if (doc.fileUrl) return doc; // URL already exists
                    if (doc.supabasePath) {
                      const { signedUrl } = await getDocumentUrl(doc.supabasePath);
                      return { ...doc, fileUrl: signedUrl };
                    }
                    return doc;
                  }));
                  providerInfo.certificationDocuments = documentsWithUrls;
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents:', err);
            }
          }

          setProvider(providerInfo);
        } else {
          setError("provider not found");
        }
      } catch (err) {
        console.error("Error fetching provider:", err);
        setError("Failed to load provider information");
      } finally {
        setLoading(false);
      }
    };

    if (providerId) {
      fetchDriverData();
    }
  }, [providerId]);

  // No longer fetching bookings as calendar is removed

  // Old conversation initialization removed - using Chat component instead
  // const initializeConversation = async () => {
  //   if (!currentUser || !providerId || !provider) return;
  //   try {
  //     const conversationId = await createOrGetConversation(...);
  //     setConversationId(conversationId);
  //     await markMessagesAsRead(conversationId, currentUser.uid);
  //   } catch (error) {
  //     console.error('Error initializing conversation:', error);
  //   }
  // };

  // useEffect(() => {
  //   if (currentUser && providerId && provider && !loading) {
  //     initializeConversation();
  //   }
  // }, [currentUser, providerId, provider, loading]);

  // useEffect(() => {
  //   // Old message loading code removed
  // }, [conversationId, currentUser]);


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
          if (otherId === providerId) {
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
    if (provider && currentUser) {
      setChatOtherUser({
        id: provider.id,
        name: provider.fullName || 'provider',
        photo: provider.profilePicture || provider.imageUrl || '',
        role: 'provider'
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
    // Update provider rating in database
    if (providerId) {
      try {
        await updateRentalProviderRating(providerId);
        // Refresh provider data to update rating display
        const driverDoc = await getDoc(doc(db, 'serviceProviders', providerId));
        if (driverDoc.exists()) {
          setProvider({
            id: driverDoc.id,
            ...driverDoc.data()
          });
        }
      } catch (error) {
        console.error('Error updating provider rating:', error);
        // Still refresh provider data even if rating update fails
        const driverDoc = await getDoc(doc(db, 'serviceProviders', providerId));
        if (driverDoc.exists()) {
          setProvider({
            id: driverDoc.id,
            ...driverDoc.data()
          });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading provider profile...</p>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">provider Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The provider you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-linear-to-r from-black to-gray-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:from-gray-800 hover:to-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 flex flex-col lg:overflow-hidden lg:max-h-screen">
      {/* Booking Success Message Removed */}

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

      {/* Booking Form Modal Removed */}

      <GlobalNotificationBell
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />


      <div className="bg-linear-to-r from-black via-gray-900 to-black border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
            <div className="flex items-center">
              <button
                onClick={() => {
                  // Navigate back to renting listing page
                  navigate('/renting');
                  // The scroll will be handled by RentingSection2 component
                }}
                className="flex items-center text-white mr-3 sm:mr-4 md:mr-6 font-medium hover:text-gray-300 transition-colors touch-manipulation"
              >
                <ArrowLeft size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
                <span className="text-sm sm:text-base md:text-lg">Back</span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white">Renting Store Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:overflow-hidden flex flex-col">
        <div className="w-full lg:flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="bg-linear-to-b from-white to-gray-50 border-2 border-gray-300 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col lg:h-full shadow-xl lg:overflow-y-auto">
              {/* Profile Header */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <img
                  src={provider.profilePicture || "/api/placeholder/120/120"}
                  alt={provider.fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-black shadow-2xl mx-auto mb-2 sm:mb-2.5 md:mb-3"
                />
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black mb-1">{provider.fullName}</h2>
                <p className="text-gray-700 font-medium mb-2 sm:mb-2.5 md:mb-3 text-xs sm:text-sm md:text-base">{provider.serviceType}</p>

                {/* Rating */}
                <div className="flex items-center justify-center mt-2 sm:mt-2.5 bg-gray-100 rounded-lg p-2 sm:p-2.5 md:p-3 border border-gray-300">
                  <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2">
                    {renderStars(provider.rating || 0)}
                    <span className="text-xs sm:text-sm font-semibold text-black">
                      {provider.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    {provider.totalReviews > 0 && (
                      <span className="text-xs text-gray-600">
                        • {provider.totalReviews} reviews
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-2 sm:mb-3 md:mb-4 flex-1">
                {provider.contactPhone && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <Phone size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{provider.contactPhone}</span>
                  </div>
                )}

                {provider.contactEmail && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <Mail size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{provider.contactEmail}</span>
                  </div>
                )}

                {provider.location && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <MapPin size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{provider.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-2.5">
                {!currentUser && (
                  <button
                    onClick={() => {
                      if (onShowAuth) {
                        onShowAuth('login');
                      }
                    }}
                    className="w-full bg-linear-to-r from-black to-gray-800 text-white py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 rounded-lg font-semibold text-xs sm:text-sm md:text-base shadow-lg hover:from-gray-800 hover:to-gray-700 transition-all touch-manipulation min-h-[40px]"
                  >
                    Login to Book or Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="bg-linear-to-b from-white to-gray-50 rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden flex flex-col lg:flex-1 min-h-0 w-full">
              <div className="border-b border-gray-300 bg-linear-to-r from-gray-100 to-white">
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
                    onClick={() => setActiveTab('reviews')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'reviews'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    <span className="hidden sm:inline">Reviews</span>
                    <span className="sm:hidden">Rev</span>
                    {provider.totalReviews > 0 && ` (${provider.totalReviews})`}
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('packages')}
                      className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'packages'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                      <Package size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 inline mr-1.5 sm:mr-2 md:mr-2.5" />
                      <span className="hidden sm:inline">Products</span>
                      <span className="sm:hidden">Prods</span>
                    </button> // Messages tab removed
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-2.5 sm:p-3 md:p-4 lg:p-5 lg:overflow-hidden lg:flex-1 bg-linear-to-b from-white to-gray-50 text-black">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* Experience */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                        <Clock className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">Experience</h3>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                          {provider.experienceYears || 0} years of experience as a {provider.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {provider.description && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">About</h3>
                        <p className="text-gray-700 leading-relaxed text-xs sm:text-sm line-clamp-2">
                          {provider.description}
                        </p>
                      </div>
                    )}

                    {/* Equipment Type */}
                    {provider.equipmentType && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 flex items-center text-xs sm:text-sm md:text-base">
                          <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                            <Car className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                          </div>
                          Equipment Type
                        </h3>
                        <p className="text-gray-700 text-sm sm:text-base md:text-lg font-bold mt-1">{provider.equipmentType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {(provider.pricePerDay > 0) && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-2 sm:mb-2.5 flex items-center text-xs sm:text-sm md:text-base">
                          <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                            <DollarSign className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                          </div>
                          Rates
                        </h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {/* Full Day Price */}
                          <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-300">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="text-black font-bold text-xs sm:text-sm block">Full Day Safari:</span>
                              <p className="text-xs text-gray-600 mt-0.5">Full day safari tours</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base md:text-lg font-black text-black">
                                LKR {provider.pricePerDay.toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-gray-600 block">/day</span>
                            </div>
                          </div>
                          {/* Half Day Price */}
                          <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-300">
                            <div className="flex-1 min-w-0 pr-2">
                              <span className="text-black font-bold text-xs sm:text-sm block">Half Day Safari:</span>
                              <p className="text-xs text-gray-600 mt-0.5">Half day safari tours</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base md:text-lg font-black text-black">
                                LKR {Math.round(provider.pricePerDay * 0.6).toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-gray-600 block">/half day</span>
                            </div>
                          </div>
                          {provider.pricePerHour && (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-300">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-black font-bold text-xs sm:text-sm block">Price per hour:</span>
                                <p className="text-xs text-gray-600 mt-0.5">Hourly rate</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs sm:text-sm md:text-base font-black text-black">
                                  LKR {provider.pricePerHour.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-gray-600 block">/hour</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {provider.languages && provider.languages.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Languages className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Languages</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {provider.languages.map((lang, index) => (
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

                    {/* Destinations */}
                    {provider.destinations && provider.destinations.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <MapPin className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {provider.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {destination}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {(provider.certificationStatus === 'certified' && provider.certificationDocuments && provider.certificationDocuments.length > 0) ? (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Award className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Certifications</h3>
                          <div className="space-y-1.5">
                            {provider.certificationDocuments.map((doc, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-300 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <FileText size={14} className="text-gray-600 shrink-0" />
                                  <span className="font-semibold truncate">{doc.certificationName || 'Certification'}</span>
                                </div>
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (provider.certifications && provider.certifications.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Award className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Certifications</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {provider.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Special Skills */}
                    {provider.specialSkills && provider.specialSkills.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Shield className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Special Skills</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {provider.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
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


                {activeTab === 'reviews' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    <ReviewSection
                      providerId={providerId}
                      providerType="renting"
                      currentUser={currentUser}
                      userRole={userRole}
                      onReviewAdded={handleReviewAdded}
                    />
                  </div>
                )}

                {/* Products/Packages Tab */}
                {activeTab === 'packages' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    {loadingPackages ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : packages.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <Package size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No products available</h3>
                        <p className="text-gray-500">This provider hasn't listed any products yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                        {packages.map(pkg => (
                          <PackageCard
                            key={pkg.id}
                            pkg={pkg}
                            isOwner={currentUser?.uid === providerId}
                          />
                        ))}
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

export default RentingProfile;
