import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateBookingStatus } from '../App';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, User, Phone, Mail, DollarSign, X, Check } from 'lucide-react';

const BookingPanel = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'pending', 'accepted', 'declined'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [clickedCardRef, setClickedCardRef] = useState(null); // Store reference to clicked card

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

  // Hide panel completely on mobile devices - only show on desktop
  if (isMobile) {
    return null;
  }

  return (
    <>
      <div
        className="fixed right-0 bg-gray-900 border-l border-gray-700 shadow-xl z-30 w-96 rounded-l-[10px] overflow-hidden"
        style={{
          top: '88px',
          height: 'calc(100vh - 180px)'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between border-b border-green-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <h2 className="font-bold text-lg">My Bookings</h2>
          </div>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden bg-gray-900 min-h-0">
          {/* Status Filter Tabs */}
          <div className="bg-gray-800 border-b border-gray-700 p-2 flex gap-1 flex-shrink-0">
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
              Requests ({pendingBookings.length})
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
              onClick={() => setSelectedStatus('confirmed')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'confirmed'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Confirmed ({confirmedBookings.length})
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
                  {booking.totalPrice && (() => {
                    // Calculate the correct total based on half-day/full-day + add-ons
                    const actualPricePerDay = booking.pricePerDay || 0;
                    let serviceCharge = 0;

                    if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
                      booking.datesWithTypes.forEach(dateObj => {
                        serviceCharge += dateObj.type === 'half-day' ? actualPricePerDay * 0.5 : actualPricePerDay;
                      });
                    } else {
                      serviceCharge = actualPricePerDay * (booking.numberOfDays || 1);
                    }

                    let addOns = 0;
                    if (booking.needsBinoculars) addOns += 500;
                    if (booking.needsChildSeat) addOns += 1000;
                    if (booking.needsWater) addOns += 300;

                    const correctTotal = serviceCharge + addOns;

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <DollarSign className="h-3 w-3 text-green-500" />
                          <span className="font-semibold text-green-400">
                            LKR {correctTotal.toLocaleString()}
                          </span>
                          {booking.status === 'accepted' && booking.paymentStatus !== 'paid' && (
                            <span className="ml-auto text-red-400 text-xs font-medium">Payment Pending</span>
                          )}
                          {booking.paymentStatus === 'paid' && (
                            <span className="ml-auto text-green-400 text-xs font-medium">✓ Paid</span>
                          )}
                        </div>

                        {/* Pay Now Button for Accepted bookings */}
                        {userRole === 'tourist' && booking.status === 'accepted' && booking.paymentStatus !== 'paid' && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/payment/${booking.id}`);
                            }}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-all transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-1.5 mt-1"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            PAY NOW
                          </button>
                        )}
                      </div>
                    );
                  })()}

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
              width: '450px',
              maxHeight: '520px',
              right: clickedCardRef ? `${Math.max(10, window.innerWidth - clickedCardRef.getBoundingClientRect().right - 460)}px` : '50%',
              top: clickedCardRef ? `${Math.max(10, clickedCardRef.getBoundingClientRect().top)}px` : '50%',
              transform: clickedCardRef ? 'none' : 'translate(50%, -50%)'
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

            {/* Booking Details Content - Enhanced */}
            <div className="p-3 space-y-2 bg-white overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedBooking.status)}`}>
                {getStatusIcon(selectedBooking.status)}
                <span className="uppercase text-xs">{selectedBooking.status || 'Pending'}</span>
                {selectedBooking.paymentStatus === 'paid' && (
                  <span className="ml-2 bg-green-600 text-white px-2 py-0.5 rounded-full">PAID</span>
                )}
              </div>

              {/* Service Provider/Customer Info */}
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5 text-green-600" />
                  {userRole === 'provider' ? 'Customer Information' : 'Service Provider'}
                </h4>
                <div className="space-y-0.5 text-xs">
                  <p className="font-medium text-gray-900">
                    {userRole === 'provider'
                      ? (selectedBooking.customerName || selectedBooking.fullName || 'N/A')
                      : (selectedBooking.driverName || selectedBooking.guideName || 'Service Provider')}
                  </p>
                  {userRole === 'provider' && selectedBooking.email && (
                    <p className="text-gray-600">{selectedBooking.email}</p>
                  )}
                  {userRole === 'provider' && selectedBooking.phone && (
                    <p className="text-gray-600">{selectedBooking.phone}</p>
                  )}
                  {userRole === 'provider' && selectedBooking.country && (
                    <p className="text-gray-600">{selectedBooking.country}</p>
                  )}
                </div>
              </div>

              {/* Safari Details */}
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-green-600" />
                  Safari Details
                </h4>
                <div className="space-y-0.5 text-xs">
                  <p><span className="font-medium text-gray-600">Dates:</span> <span className="text-gray-900">{selectedBooking.datesString || formatDates(selectedBooking.selectedDates)}</span></p>
                  {selectedBooking.numberOfDays && (
                    <p><span className="font-medium text-gray-600">Duration:</span> <span className="text-gray-900">{selectedBooking.numberOfDays} day{selectedBooking.numberOfDays > 1 ? 's' : ''}</span></p>
                  )}
                  {selectedBooking.nationalPark && (
                    <p><span className="font-medium text-gray-600">Park:</span> <span className="text-gray-900">{selectedBooking.nationalPark}</span></p>
                  )}
                  {selectedBooking.safariType && (
                    <p><span className="font-medium text-gray-600">Type:</span> <span className="text-gray-900">{selectedBooking.safariType}</span></p>
                  )}
                  {selectedBooking.preferredTime && (
                    <p><span className="font-medium text-gray-600">Time:</span> <span className="text-gray-900">{new Date(selectedBooking.preferredTime).toLocaleString()}</span></p>
                  )}
                  {selectedBooking.numberOfPassengers && (
                    <p><span className="font-medium text-gray-600">Passengers:</span> <span className="text-gray-900">{selectedBooking.numberOfPassengers}</span></p>
                  )}
                </div>
              </div>

              {/* Pickup & Drop-off */}
              {(selectedBooking.pickupLocation || selectedBooking.dropoffLocation || selectedBooking.hotelName) && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Pickup & Drop-off</h4>
                  <div className="space-y-0.5 text-xs">
                    {selectedBooking.pickupLocation && (
                      <p><span className="font-medium text-gray-600">Pickup:</span> <span className="text-gray-900">{selectedBooking.pickupLocation}</span></p>
                    )}
                    {selectedBooking.dropoffLocation && (
                      <p><span className="font-medium text-gray-600">Drop-off:</span> <span className="text-gray-900">{selectedBooking.dropoffLocation}</span></p>
                    )}
                    {selectedBooking.needsHotelPickup && selectedBooking.hotelName && (
                      <div className="bg-blue-50 p-1.5 rounded border border-blue-200 mt-1">
                        <p className="font-medium text-gray-900">{selectedBooking.hotelName}</p>
                        {selectedBooking.hotelAddress && <p className="text-gray-600">{selectedBooking.hotelAddress}</p>}
                        {selectedBooking.roomNumber && <p className="text-gray-600">Room: {selectedBooking.roomNumber}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add-ons & Extras */}
              {(selectedBooking.needsBinoculars || selectedBooking.needsChildSeat || selectedBooking.needsWater || selectedBooking.needsSnacks) && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Add-ons & Extras</h4>
                  <div className="space-y-0.5 text-xs">
                    {selectedBooking.needsBinoculars && <p>• Binoculars <span className="text-gray-500">(LKR 500)</span></p>}
                    {selectedBooking.needsChildSeat && <p>• Child Seat <span className="text-gray-500">(LKR 1,000)</span></p>}
                    {selectedBooking.needsWater && <p>• Water Bottles <span className="text-gray-500">(LKR 300)</span></p>}
                    {selectedBooking.needsSnacks && selectedBooking.selectedSnacks && selectedBooking.selectedSnacks.length > 0 && (
                      <div className="pl-2 mt-1">
                        <p className="font-medium text-gray-700">Snacks/Meals:</p>
                        {selectedBooking.selectedSnacks.map((snack, idx) => (
                          <p key={idx} className="text-gray-600">- {snack}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {(selectedBooking.emergencyContactName || selectedBooking.emergencyContactPhone) && (
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1.5 text-xs">Emergency Contact</h4>
                  <div className="space-y-0.5 text-xs">
                    {selectedBooking.emergencyContactName && (
                      <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{selectedBooking.emergencyContactName}</span></p>
                    )}
                    {selectedBooking.emergencyContactPhone && (
                      <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-900">{selectedBooking.emergencyContactPhone}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              {selectedBooking.totalPrice && (() => {
                // Get the actual price per day from booking (driver's/guide's rate)
                const actualPricePerDay = selectedBooking.pricePerDay || 0;

                // Calculate base service charge based on full-day and half-day bookings
                let baseServiceCharge = 0;
                let fullDayCount = 0;
                let halfDayCount = 0;

                // Check if we have datesWithTypes (which includes half-day/full-day info)
                if (selectedBooking.datesWithTypes && selectedBooking.datesWithTypes.length > 0) {
                  selectedBooking.datesWithTypes.forEach(dateObj => {
                    if (dateObj.type === 'half-day') {
                      halfDayCount++;
                      baseServiceCharge += actualPricePerDay * 0.5; // Half-day is 50% of full-day rate
                    } else {
                      fullDayCount++;
                      baseServiceCharge += actualPricePerDay; // Full-day rate
                    }
                  });
                } else {
                  // Fallback: if no datesWithTypes, assume all are full days
                  fullDayCount = selectedBooking.numberOfDays || 1;
                  baseServiceCharge = actualPricePerDay * fullDayCount;
                }

                // Calculate add-ons total
                let addOnsTotal = 0;
                if (selectedBooking.needsBinoculars) addOnsTotal += 500;
                if (selectedBooking.needsChildSeat) addOnsTotal += 1000;
                if (selectedBooking.needsWater) addOnsTotal += 300;

                // Calculate actual total (base + add-ons)
                const calculatedTotal = baseServiceCharge + addOnsTotal;

                return (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border-2 border-green-300">
                    <h4 className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <DollarSign className="h-3.5 w-3.5 text-green-600" />
                      Payment Details
                    </h4>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Rate:</span>
                        <span className="font-medium">LKR {actualPricePerDay.toLocaleString()}/day</span>
                      </div>
                      {fullDayCount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span className="text-xs pl-2">Full Day × {fullDayCount}</span>
                          <span className="font-medium">LKR {(actualPricePerDay * fullDayCount).toLocaleString()}</span>
                        </div>
                      )}
                      {halfDayCount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span className="text-xs pl-2">Half Day × {halfDayCount}</span>
                          <span className="font-medium">LKR {(actualPricePerDay * 0.5 * halfDayCount).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-700 font-medium border-t border-green-200 pt-0.5 mt-0.5">
                        <span className="text-xs">Service Subtotal:</span>
                        <span>LKR {baseServiceCharge.toLocaleString()}</span>
                      </div>
                      {(selectedBooking.needsBinoculars || selectedBooking.needsChildSeat || selectedBooking.needsWater) && (
                        <>
                          <div className="border-t border-green-200 pt-1 mt-1"></div>
                          <div className="text-xs font-semibold text-gray-700">Add-ons:</div>
                          {selectedBooking.needsBinoculars && (
                            <div className="flex justify-between text-gray-600">
                              <span className="pl-2">Binoculars:</span>
                              <span>+LKR 500</span>
                            </div>
                          )}
                          {selectedBooking.needsChildSeat && (
                            <div className="flex justify-between text-gray-600">
                              <span className="pl-2">Child Seat:</span>
                              <span>+LKR 1,000</span>
                            </div>
                          )}
                          {selectedBooking.needsWater && (
                            <div className="flex justify-between text-gray-600">
                              <span className="pl-2">Water:</span>
                              <span>+LKR 300</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-700 pt-0.5">
                            <span className="text-xs font-semibold">Add-ons Subtotal:</span>
                            <span className="font-medium">LKR {addOnsTotal.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div className="border-t border-green-300 pt-1 mt-1 flex justify-between">
                        <span className="font-bold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-green-700">LKR {calculatedTotal.toLocaleString()}</span>
                      </div>
                      {selectedBooking.paymentStatus === 'paid' ? (
                        <p className="text-xs text-green-600 font-medium text-center mt-1">✓ Payment Completed</p>
                      ) : selectedBooking.status === 'accepted' ? (
                        <p className="text-xs text-red-600 font-medium text-center mt-1">Payment Pending</p>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              {/* Special Requests */}
              {(selectedBooking.specialRequests || selectedBooking.specialAssistance || selectedBooking.additionalNotes) && (
                <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-300">
                  <h4 className="font-semibold text-gray-900 mb-1 text-xs">Special Requests & Notes</h4>
                  <div className="space-y-1 text-xs text-gray-700">
                    {selectedBooking.specialRequests && <p className="bg-white p-1 rounded">• {selectedBooking.specialRequests}</p>}
                    {selectedBooking.specialAssistance && <p className="bg-white p-1 rounded">• {selectedBooking.specialAssistance}</p>}
                    {selectedBooking.additionalNotes && <p className="bg-white p-1 rounded">• {selectedBooking.additionalNotes}</p>}
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

    </>
  );
};

export default BookingPanel;
