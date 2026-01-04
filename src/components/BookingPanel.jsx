import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateBookingStatus } from '../App';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, User, Phone, Mail, DollarSign, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const BookingPanel = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'pending', 'accepted', 'declined'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false); // For mobile panel visibility
  const [clickedCardRef, setClickedCardRef] = useState(null); // Store reference to clicked card

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop, always show panel. On mobile, start closed
      if (!mobile) {
        setIsPanelOpen(true);
      }
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
        console.error('Error checking user role:', error);
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
    return booking.status === selectedStatus;
  });

  // Group bookings by status
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings.filter(b => b.status === 'accepted');
  const declinedBookings = bookings.filter(b => b.status === 'declined');

  const getStatusColor = (status) => {
    switch (status) {
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

  // On mobile, show a side arrow button to open panel if closed (but not when showing details)
  if (isMobile && !isPanelOpen && !showBookingDetails) {
    return (
      <button
        onClick={() => setIsPanelOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-green-600 hover:bg-green-700 text-white p-3 rounded-r-full shadow-lg z-40 transition-all duration-300 flex items-center justify-center"
        style={{ top: 'calc(50% + 40px)' }} // Position below navbar
        aria-label="Open bookings panel"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    );
  }

  return (
    <>
      <div
        className={`fixed left-0 bg-gray-900 border-r border-gray-700 shadow-xl z-30 transition-all duration-300 ${isMobile ? 'w-full' : 'w-80'
          }`}
        style={{
          top: isMobile ? '80px' : '88px', // Navbar ends at 80px, no gap on mobile
          height: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 88px)',
          transform: isMobile && !isPanelOpen ? 'translateX(-100%)' : 'translateX(0)'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between border-b border-green-800">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h2 className="font-bold text-lg">My Bookings</h2>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              aria-label="Close panel"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="h-full flex flex-col overflow-hidden bg-gray-900">
          {/* Status Filter Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 p-2 flex gap-1">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Pending ({pendingBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('accepted')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'accepted'
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Accepted ({acceptedBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('declined')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'declined'
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Declined ({declinedBookings.length})
            </button>
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-900">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No bookings found</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-sm hover:bg-gray-750 hover:border-gray-600 transition-all cursor-pointer relative"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                    setClickedCardRef(e.currentTarget);
                    // On mobile, keep panel open but show details
                    // Don't navigate or close panel
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
                    {booking.numberOfDays && (
                      <span className="text-gray-500 flex-shrink-0">({booking.numberOfDays} day{booking.numberOfDays > 1 ? 's' : ''})</span>
                    )}
                  </div>

                  {/* Destination */}
                  {booking.nationalPark && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>{booking.nationalPark}</span>
                    </div>
                  )}

                  {/* Price */}
                  {booking.totalPrice && (
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      <span className="font-semibold text-green-400">
                        LKR {booking.totalPrice.toLocaleString()}
                      </span>
                      {booking.status === 'accepted' && !booking.paid && (
                        <span className="ml-auto text-red-400 text-xs font-medium">Payment Pending</span>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Booking Details Popup - Small box next to clicked card */}
      {showBookingDetails && selectedBooking && clickedCardRef && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowBookingDetails(false);
            setSelectedBooking(null);
            setClickedCardRef(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-2xl z-50 overflow-hidden transition-all duration-300 pointer-events-auto flex flex-col"
            style={{
              position: 'absolute',
              width: isMobile ? 'calc(100vw - 1rem)' : '420px',
              maxHeight: isMobile ? 'calc(100vh - 100px)' : '400px',
              left: isMobile ? '0.5rem' : (clickedCardRef ? `${Math.min(clickedCardRef.getBoundingClientRect().right + 10, window.innerWidth - 440)}px` : '50%'),
              top: isMobile ? '90px' : (clickedCardRef ? `${Math.max(10, clickedCardRef.getBoundingClientRect().top)}px` : '50%'),
              transform: isMobile ? 'none' : (clickedCardRef ? 'none' : 'translate(-50%, -50%)')
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-2.5 flex items-center justify-between border-b border-green-800">
              <h3 className="font-bold text-sm">Booking Details</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                  setClickedCardRef(null);
                  // Don't change panel state on mobile - just close details
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Booking Details Content */}
            <div className="p-3 space-y-2 bg-white overflow-y-auto flex-1" style={{ maxHeight: isMobile ? 'calc(100vh - 200px)' : '280px' }}>
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedBooking.status)}`}>
                {getStatusIcon(selectedBooking.status)}
                <span className="uppercase text-xs">{selectedBooking.status || 'Pending'}</span>
              </div>

              {/* Service Provider Info */}
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5 text-green-600" />
                  Service Provider
                </h4>
                <p className="text-xs text-gray-700">{selectedBooking.driverName || selectedBooking.guideName || 'Service Provider'}</p>
                {selectedBooking.driverEmail || selectedBooking.guideEmail ? (
                  <p className="text-xs text-gray-600 mt-0.5">{selectedBooking.driverEmail || selectedBooking.guideEmail}</p>
                ) : null}
              </div>

              {/* Booking Dates */}
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-green-600" />
                  Booking Dates
                </h4>
                <p className="text-xs text-gray-700">{selectedBooking.datesString || formatDates(selectedBooking.selectedDates)}</p>
                {selectedBooking.numberOfDays && (
                  <p className="text-xs text-gray-600 mt-0.5">{selectedBooking.numberOfDays} day{selectedBooking.numberOfDays > 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Destination */}
              {selectedBooking.nationalPark && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                    Destination
                  </h4>
                  <p className="text-xs text-gray-700">{selectedBooking.nationalPark}</p>
                </div>
              )}

              {/* Price */}
              {selectedBooking.totalPrice && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                    <DollarSign className="h-3.5 w-3.5 text-green-600" />
                    Total Price
                  </h4>
                  <p className="text-lg font-bold text-green-700">LKR {selectedBooking.totalPrice.toLocaleString()}</p>
                  {selectedBooking.status === 'accepted' && !selectedBooking.paid && (
                    <p className="text-xs text-red-600 mt-0.5 font-medium">Payment Pending</p>
                  )}
                </div>
              )}

              {/* Customer Info (for service providers) */}
              {userRole === 'provider' && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                    <User className="h-3.5 w-3.5 text-green-600" />
                    Customer Information
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{selectedBooking.customerName || 'N/A'}</span></p>
                    {selectedBooking.customerEmail && (
                      <p><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-900">{selectedBooking.customerEmail}</span></p>
                    )}
                    {selectedBooking.customerPhone && (
                      <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-900">{selectedBooking.customerPhone}</span></p>
                    )}
                    {selectedBooking.emergencyContactName && (
                      <p><span className="font-medium text-gray-600">Emergency:</span> <span className="text-gray-900">{selectedBooking.emergencyContactName}</span></p>
                    )}
                    {selectedBooking.emergencyContactPhone && (
                      <p className="text-xs text-gray-500 ml-3">{selectedBooking.emergencyContactPhone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Details - Compact */}
              {(selectedBooking.pickupLocation || selectedBooking.hotelName || selectedBooking.numberOfPassengers || selectedBooking.needsHotelPickup) && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Additional Details</h4>
                  <div className="space-y-1 text-xs">
                    {selectedBooking.numberOfPassengers && (
                      <p><span className="font-medium text-gray-600">Passengers:</span> <span className="text-gray-900">{selectedBooking.numberOfPassengers}</span></p>
                    )}
                    {selectedBooking.needsHotelPickup && (
                      <p><span className="font-medium text-gray-600">Hotel Pickup:</span> <span className="text-gray-900">Yes</span></p>
                    )}
                    {selectedBooking.pickupLocation && (
                      <p><span className="font-medium text-gray-600">Pickup:</span> <span className="text-gray-900">{selectedBooking.pickupLocation}</span></p>
                    )}
                    {selectedBooking.dropoffLocation && (
                      <p><span className="font-medium text-gray-600">Drop-off:</span> <span className="text-gray-900">{selectedBooking.dropoffLocation}</span></p>
                    )}
                    {selectedBooking.hotelName && (
                      <>
                        <p><span className="font-medium text-gray-600">Hotel:</span> <span className="text-gray-900">{selectedBooking.hotelName}</span></p>
                        {selectedBooking.hotelAddress && (
                          <p className="text-xs text-gray-600 ml-3">{selectedBooking.hotelAddress}</p>
                        )}
                      </>
                    )}
                    {selectedBooking.vehicleType && (
                      <p><span className="font-medium text-gray-600">Vehicle:</span> <span className="text-gray-900">{selectedBooking.vehicleType}</span></p>
                    )}
                    {selectedBooking.additionalNotes && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-300">
                        <p className="font-medium text-gray-600 mb-0.5 text-xs">Notes:</p>
                        <p className="text-xs text-gray-900 whitespace-pre-wrap">{selectedBooking.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-gray-300 flex-shrink-0">
                {/* For Service Providers - Accept/Decline */}
                {userRole === 'provider' && selectedBooking.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBookingStatusUpdate(selectedBooking.id, 'accepted');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs font-medium"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleBookingStatusUpdate(selectedBooking.id, 'declined');
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs font-medium"
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </button>
                  </div>
                )}

                {/* For Customers - Pay Now */}
                {userRole === 'tourist' && selectedBooking.status === 'accepted' && !selectedBooking.paid && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowBookingDetails(false);
                      setSelectedBooking(null);
                      setClickedCardRef(null);
                      navigate(`/payment/${selectedBooking.id}`);
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs font-medium"
                  >
                    <DollarSign className="h-3 w-3" />
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop when panel is open */}
      {isMobile && isPanelOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </>
  );
};

export default BookingPanel;
