import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateBookingStatus } from '../App';
import { Calendar, CheckCircle, XCircle, Clock, MapPin, User, DollarSign, X, Check, ArrowRight } from 'lucide-react';

const BookingSection = ({ user }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [clickedCardRef, setClickedCardRef] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ left: 0, top: 0, arrowOnLeft: true });

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user || !user.uid) {
        setUserRole(null);
        return;
      }

      try {
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
        if (providerDoc.exists()) {
          setUserRole('provider');
          return;
        }

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

  // Fetch bookings
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    console.log('📋 Fetching bookings for user:', user.uid);

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

    const unsubscribers = [];
    const allBookings = new Map();

    const updateBookings = () => {
      const bookingsArray = Array.from(allBookings.values());
      bookingsArray.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return bTime - aTime;
      });
      setBookings(bookingsArray);
      setLoading(false);
    };

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

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'pending') return booking.status === 'pending';
    if (selectedStatus === 'accepted') {
      return (booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus === 'paid';
    }
    if (selectedStatus === 'declined') return booking.status === 'declined';
    return booking.status === selectedStatus;
  });

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const acceptedBookings = bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed');
  const confirmedBookings = bookings.filter(b =>
    (b.status === 'accepted' || b.status === 'confirmed') && b.paymentStatus === 'paid'
  );
  const declinedBookings = bookings.filter(b => b.status === 'declined');

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
      case 'confirmed':
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
      case 'confirmed':
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

      setShowBookingDetails(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  // Hide on mobile devices
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update popup position on scroll/resize
  useEffect(() => {
    if (!showBookingDetails || !clickedCardRef) {
      setPopupPosition({ left: 0, top: 0, arrowOnLeft: true });
      return;
    }

    const updatePosition = () => {
      if (!clickedCardRef) return;

      const cardRect = clickedCardRef.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 400;
      const spacing = 12;

      // Position popup to the right of the clicked card (inside the booking panel area)
      // This way it won't appear from the left side of the screen
      let left = cardRect.right + spacing;
      let top = cardRect.top;

      // If popup would go off-screen to the right, position it to the left of the card instead
      if (left + popupWidth > window.innerWidth - 10) {
        left = cardRect.left - popupWidth - spacing;
        // If still off-screen, center it or adjust
        if (left < 10) {
          left = Math.max(10, (window.innerWidth - popupWidth) / 2);
        }
      }

      // Ensure popup stays within viewport vertically
      const maxTop = window.innerHeight - popupHeight - 10;
      if (top > maxTop) {
        top = Math.max(10, maxTop);
      }
      if (top < 10) {
        top = 10;
      }

      // Determine arrow position: 
      // If popup is on the right of the card, arrow should be on the left side of popup (pointing left toward card)
      // If popup is on the left of the card, arrow should be on the right side of popup (pointing right toward card)
      const arrowOnLeft = left > cardRect.right;

      setPopupPosition({ left, top, arrowOnLeft });
    };

    // Initial position calculation
    updatePosition();

    // Update on scroll and resize - use requestAnimationFrame for smooth updates
    let rafId;
    const handleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [showBookingDetails, clickedCardRef]);

  if (isMobile) {
    return null;
  }

  return (
    <div className="relative">
      <section className="absolute top-28 right-4 z-40 w-80 h-[calc(100vh-180px)] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between border-b border-green-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h2 className="font-bold text-lg">My Bookings</h2>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 overflow-x-auto flex-shrink-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`flex-shrink-0 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`flex-shrink-0 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Requests ({pendingBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('accepted')}
              className={`flex-shrink-0 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'accepted'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Confirmed ({confirmedBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('declined')}
              className={`flex-shrink-0 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'declined'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Declined ({declinedBookings.length})
            </button>
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-2">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No bookings found</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-sm hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer"
                  onClick={(e) => {
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                    setClickedCardRef(e.currentTarget);
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
                    <span className="text-sm font-semibold text-gray-900">
                      {userRole === 'provider'
                        ? (booking.customerName || 'Customer')
                        : (booking.driverName || booking.guideName || 'Service Provider')
                      }
                    </span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
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
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{booking.nationalPark}</span>
                    </div>
                  )}

                  {/* Price */}
                  {booking.totalPrice && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-sm text-green-600">
                          LKR {booking.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      {(booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus !== 'paid' && (
                        <span className="text-red-500 text-xs font-medium">Payment Pending</span>
                      )}
                      {booking.paymentStatus === 'paid' && (
                        <span className="text-green-500 text-xs font-medium">✓ Paid</span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Booking Details Popup - Small box next to clicked card */}
      {showBookingDetails && selectedBooking && clickedCardRef && (
        <React.Fragment>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 pointer-events-auto bg-black/10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowBookingDetails(false);
              setSelectedBooking(null);
              setClickedCardRef(null);
            }}
          />
          {/* Popup - positioned fixed to follow card on scroll */}
          <div
            className="bg-white rounded-lg shadow-2xl z-50 overflow-hidden pointer-events-auto flex flex-col border border-gray-200 relative"
            style={{
              position: 'fixed',
              width: '320px',
              maxHeight: '400px',
              left: `${popupPosition.left}px`,
              top: `${popupPosition.top}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointing to the booking card */}
            <div
              className={`absolute top-6 ${popupPosition.arrowOnLeft ? 'right-0' : 'left-0'}`}
              style={{
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                [popupPosition.arrowOnLeft ? 'borderRight' : 'borderLeft']: '8px solid white',
                transform: popupPosition.arrowOnLeft ? 'translateX(100%)' : 'translateX(-100%)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              }}
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-2 flex items-center justify-between border-b border-green-800 flex-shrink-0">
              <h3 className="font-bold text-xs">Booking Details</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                  setClickedCardRef(null);
                }}
                className="p-0.5 hover:bg-white/20 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-2.5 space-y-1.5 bg-white overflow-y-auto flex-1" style={{ maxHeight: '360px' }}>
              {/* Status */}
              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(selectedBooking.status)}`}>
                {getStatusIcon(selectedBooking.status)}
                <span className="uppercase text-xs">{selectedBooking.status || 'Pending'}</span>
              </div>

              {/* Service Provider */}
              <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs">
                  <User className="h-3 w-3 text-green-600" />
                  Service Provider
                </h4>
                <p className="text-xs text-gray-700">{selectedBooking.driverName || selectedBooking.guideName || 'Service Provider'}</p>
              </div>

              {/* Dates */}
              <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3 text-green-600" />
                  Booking Dates
                </h4>
                <p className="text-xs text-gray-700">{selectedBooking.datesString || formatDates(selectedBooking.selectedDates)}</p>
                {selectedBooking.numberOfDays && (
                  <p className="text-xs text-gray-600 mt-0.5">{selectedBooking.numberOfDays} day{selectedBooking.numberOfDays > 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Destination */}
              {selectedBooking.nationalPark && (
                <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3 text-green-600" />
                    Destination
                  </h4>
                  <p className="text-xs text-gray-700">{selectedBooking.nationalPark}</p>
                </div>
              )}

              {/* Price */}
              {selectedBooking.totalPrice && (
                <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-1 text-xs">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    Total Price
                  </h4>
                  <p className="text-base font-bold text-green-700">LKR {selectedBooking.totalPrice.toLocaleString()}</p>
                  {(selectedBooking.status === 'accepted' || selectedBooking.status === 'confirmed') && selectedBooking.paymentStatus !== 'paid' && (
                    <p className="text-xs text-red-600 mt-0.5 font-medium">Payment Pending</p>
                  )}
                  {selectedBooking.paymentStatus === 'paid' && (
                    <p className="text-xs text-green-600 mt-0.5 font-medium">✓ Payment Completed</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-1 pt-1.5 border-t border-gray-300 flex-shrink-0">
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

                {userRole === 'tourist' && selectedBooking.status === 'accepted' && selectedBooking.paymentStatus !== 'paid' && (
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
        </React.Fragment>
      )}
    </div>
  );
};

export default BookingSection;
