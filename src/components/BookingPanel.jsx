import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateBookingStatus } from '../App';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, User, Phone, Mail, DollarSign, X, Check } from 'lucide-react';

const BookingPanel = ({ user, notifications = [] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'pending', 'accepted', 'declined'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [clickedCardRef, setClickedCardRef] = useState(null); // Store reference to clicked card

  // Calculate unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Check if mobile device - hide panel on mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user || !user.uid) {
        setUserRole(null);
        return;
      }

      try {
        // Check if user is a service provider
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
        if (providerDoc.exists()) {
          setUserRole('provider');
          return;
        }

        // Check if user is a tourist
        const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
        if (touristDoc.exists()) {
          setUserRole('tourist');
          return;
        }

        setUserRole(null);
      } catch (error) {

        setUserRole(null);
      }
    };

    checkUserRole();
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    console.log('📋 Fetching bookings for user:', user.uid);

    // Query bookings where user is either the customer OR the service provider
    // We need to fetch both and combine them
    const customerQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );

    const driverQuery = query(
      collection(db, 'bookings'),
      where('driverId', '==', user.uid)
    );

    const guideQuery = query(
      collection(db, 'bookings'),
      where('guideId', '==', user.uid)
    );

    // Set up listeners for all three queries
    const unsubscribers = [];

    const allBookings = new Map(); // Use Map to avoid duplicates

    const updateBookings = () => {
      const bookingsArray = Array.from(allBookings.values());
      // Sort by createdAt if available
      bookingsArray.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return bTime - aTime; // Descending order
      });
      setBookings(bookingsArray);
      setLoading(false);
    };

    // Customer bookings
    const unsubscribeCustomer = onSnapshot(
      customerQuery,
      (snapshot) => {
        snapshot.docs.forEach(doc => {
          allBookings.set(doc.id, { id: doc.id, ...doc.data() });
        });
        updateBookings();
      },
      (error) => {
        console.error('Error fetching customer bookings:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(unsubscribeCustomer);

    // Driver bookings
    const unsubscribeDriver = onSnapshot(
      driverQuery,
      (snapshot) => {
        snapshot.docs.forEach(doc => {
          allBookings.set(doc.id, { id: doc.id, ...doc.data() });
        });
        updateBookings();
      },
      (error) => {
        console.error('Error fetching driver bookings:', error);
      }
    );
    unsubscribers.push(unsubscribeDriver);

    // Guide bookings
    const unsubscribeGuide = onSnapshot(
      guideQuery,
      (snapshot) => {
        snapshot.docs.forEach(doc => {
          allBookings.set(doc.id, { id: doc.id, ...doc.data() });
        });
        updateBookings();
      },
      (error) => {
        console.error('Error fetching guide bookings:', error);
      }
    );
    unsubscribers.push(unsubscribeGuide);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // Filter bookings by status
  const filteredBookings = bookings.filter(booking => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'pending') return booking.status === 'pending';
    if (selectedStatus === 'accepted') {
      // Show accepted bookings that are NOT yet paid
      return booking.status === 'accepted' && booking.paymentStatus !== 'paid';
    }
    if (selectedStatus === 'confirmed') {
      // Show confirmed bookings (accepted or confirmed) that ARE paid
      return (booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus === 'paid';
    }
    if (selectedStatus === 'declined') return booking.status === 'declined';
    return booking.status === selectedStatus;
  });

  // Group bookings by status
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'paid');
  const confirmedBookings = bookings.filter(b =>
    (b.status === 'accepted' || b.status === 'confirmed') && b.paymentStatus === 'paid'
  );
  const declinedBookings = bookings.filter(b => b.status === 'declined');

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'declined':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatDates = (dates) => {
    if (!dates || !Array.isArray(dates) || dates.length === 0) return 'N/A';
    if (dates.length === 1) {
      return formatDate(dates[0]);
    }
    return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
  };

  // Hide panel on destination details pages and guide profile pages
  if (location.pathname.startsWith('/destination/') || location.pathname.startsWith('/guide-profile/')) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Handle booking status update (for service providers)
  const handleBookingStatusUpdate = async (bookingId, status) => {
    if (!user || !user.uid) return;

    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const providerId = booking.driverId || booking.guideId;
      const providerName = booking.driverName || booking.guideName || 'Service Provider';
      const customerId = booking.customerId;
      const customerName = booking.customerName || 'Customer';

      await updateBookingStatus(
        bookingId,
        status,
        providerId,
        customerId,
        providerName,
        customerName
      );

      // Close details panel
      setShowBookingDetails(false);
      setSelectedBooking(null);
      setClickedCardRef(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  // Hide panel completely on mobile devices, if user is a provider, or on profile pages
  const isOnProfilePage = location.pathname.includes('/guide-profile/') || location.pathname.includes('/jeep-profile/');
  if (isMobile || !user || userRole === 'provider' || isOnProfilePage) {
    return null;
  }

  return (

    <div
      className="absolute top-1/2 -translate-y-1/2 right-6 z-30 w-80 h-[50vh] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl bg-black/40 border border-white/10 flex flex-col"
    >
      <div className="relative flex-1 overflow-hidden">
        {/* LIST VIEW */}
        <div
          className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${showBookingDetails ? '-translate-x-full' : 'translate-x-0'
            }`}
        >
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-sm p-4 flex items-center justify-between border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <h2 className="font-bold text-lg tracking-wide">My Bookings</h2>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="bg-white/5 border-b border-white/10 p-2 flex gap-1 flex-shrink-0 backdrop-blur-md">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'all'
                ? 'bg-emerald-600/90 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'pending'
                ? 'bg-yellow-500/80 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              Req
            </button>
            <button
              onClick={() => setSelectedStatus('accepted')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'accepted'
                ? 'bg-green-500/80 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              Acc
            </button>
            <button
              onClick={() => setSelectedStatus('confirmed')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'confirmed'
                ? 'bg-emerald-600/90 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              Conf
            </button>
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-white/20 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No bookings found</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 shadow-sm hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer relative group backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                  }}
                >
                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border mb-2 ${getStatusColor(booking.status)}`}>
                    {getStatusIcon(booking.status)}
                    <span className="uppercase">{booking.status || 'Pending'}</span>
                  </div>

                  {/* Service Provider/Customer Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-200">
                      {userRole === 'provider'
                        ? (booking.customerName || 'Customer')
                        : (booking.driverName || booking.guideName || 'Service Provider')
                      }
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {booking.datesString || formatDates(booking.selectedDates)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 text-xs mt-2 border-t border-white/5 pt-2">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">
                      LKR {(booking.totalPrice || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DETAILS VIEW - Slide In */}
        <div
          className={`absolute inset-0 flex flex-col bg-gray-900 transition-transform duration-300 ease-in-out ${showBookingDetails ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          {selectedBooking && (
            <>
              {/* Header */}
              <div className="bg-emerald-600 p-3 flex items-center gap-3 shadow-lg flex-shrink-0">
                <button
                  onClick={() => setShowBookingDetails(false)}
                  className="p-1 hover:bg-emerald-700 rounded-full transition-colors text-white"
                >
                  <div className="h-5 w-5 flex items-center justify-center font-bold">←</div>
                </button>
                <h3 className="font-bold text-white text-sm">Booking Details</h3>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50">
                {/* Status */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </div>
                </div>

                {/* Info Cards */}
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">
                      {userRole === 'provider'
                        ? (selectedBooking.customerName || 'Customer')
                        : (selectedBooking.driverName || selectedBooking.guideName || 'Service Provider')}
                    </span>
                  </div>
                  {selectedBooking.nationalPark && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{selectedBooking.nationalPark}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span>{selectedBooking.datesString || formatDates(selectedBooking.selectedDates)}</span>
                  </div>
                </div>

                {/* Price Breakdown Details */}
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase">Payment Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold text-emerald-700">LKR {(selectedBooking.totalPrice || 0).toLocaleString()}</span>
                  </div>
                  {selectedBooking.paymentStatus === 'paid' ? (
                    <div className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded text-center font-bold mt-2">
                      PAID
                    </div>
                  ) : (
                    <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-center font-bold mt-2">
                      PAYMENT PENDING
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  {userRole === 'tourist' && selectedBooking.status === 'accepted' && selectedBooking.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => navigate(`/payment/${selectedBooking.id}`)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPanel;
