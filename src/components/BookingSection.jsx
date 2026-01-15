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
  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Format dates with their types (half-day/full-day)
  const formatDatesWithTypes = (booking) => {
    // If datesWithTypes is available, use it to show each date with its type
    if (booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0) {
      return booking.datesWithTypes.map(item => {
        const date = item.date ? new Date(item.date) : null;
        const type = item.type || 'full-day';
        const typeLabel = type === 'half-day' ? 'Half Day' : 'Full Day';
        if (date) {
          return `${date.toLocaleDateString()} (${typeLabel})`;
        }
        return '';
      }).filter(Boolean).join(', ');
    }
    // Fallback to datesString if available
    if (booking.datesString) {
      return booking.datesString;
    }
    // Fallback to formatDates
    if (booking.selectedDates && Array.isArray(booking.selectedDates)) {
      return formatDates(booking.selectedDates.map(d => d.toDate ? d.toDate() : new Date(d)));
    }
    return 'N/A';
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

      // Collapse the expanded booking after status update
      setExpandedBookingId(null);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Early returns - must be after all hooks
  if (!user) {
    return null;
  }

  // Hide booking panel for service providers (they have admin panel)
  if (userRole === 'provider') {
    return null;
  }

  if (isMobile) {
    return null;
  }

  return (
    <div className="relative">
      <section className="absolute top-28 right-4 z-40 w-96 h-[calc(100vh-180px)] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center justify-between border-b border-green-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <h2 className="font-bold text-lg">My Bookings</h2>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 flex-shrink-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Requests ({pendingBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('accepted')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'accepted'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Confirmed ({confirmedBookings.length})
            </button>
            <button
              onClick={() => setSelectedStatus('declined')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${selectedStatus === 'declined'
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
              filteredBookings.map((booking) => {
                const isExpanded = expandedBookingId === booking.id;
                return (
                  <div
                    key={booking.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all"
                  >
                    {/* Main Card Content */}
                    <div
                      className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        setExpandedBookingId(isExpanded ? null : booking.id);
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
                          {formatDatesWithTypes(booking)}
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

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-gray-300 bg-black rounded-b-lg animate-slideUp">
                        <div className="space-y-2 mt-2">
                          {/* Service Provider Details */}
                          <div className="bg-gray-900 rounded p-2 border border-gray-700">
                            <h4 className="font-semibold text-white mb-1 flex items-center gap-1 text-xs">
                              <User className="h-3 w-3 text-green-400" />
                              Service Provider
                            </h4>
                            <p className="text-xs text-gray-300">{booking.driverName || booking.guideName || 'Service Provider'}</p>
                          </div>

                          {/* Booking Dates Details */}
                          <div className="bg-gray-900 rounded p-2 border border-gray-700">
                            <h4 className="font-semibold text-white mb-1 flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3 text-green-400" />
                              Booking Dates
                            </h4>
                            <div className="space-y-1">
                              {booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0 ? (
                                booking.datesWithTypes.map((item, index) => {
                                  const date = item.date ? new Date(item.date) : null;
                                  const type = item.type || 'full-day';
                                  const typeLabel = type === 'half-day' ? 'Half Day' : 'Full Day';
                                  const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';
                                  if (!date) return null;
                                  return (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-300">{date.toLocaleDateString()}</span>
                                      <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-gray-300">{formatDatesWithTypes(booking)}</p>
                              )}
                            </div>
                            {booking.numberOfDays && (
                              <p className="text-xs text-gray-400 mt-1.5 pt-1 border-t border-gray-700">{booking.numberOfDays} day{booking.numberOfDays > 1 ? 's' : ''}</p>
                            )}
                          </div>

                          {/* Destination Details */}
                          {booking.nationalPark && (
                            <div className="bg-gray-900 rounded p-2 border border-gray-700">
                              <h4 className="font-semibold text-white mb-1 flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3 text-green-400" />
                                Destination
                              </h4>
                              <p className="text-xs text-gray-300">{booking.nationalPark}</p>
                            </div>
                          )}

                          {/* Price Details */}
                          {booking.totalPrice && (
                            <div className="bg-gray-900 rounded p-2 border border-gray-700">
                              <h4 className="font-semibold text-white mb-1 flex items-center gap-1 text-xs">
                                <DollarSign className="h-3 w-3 text-green-400" />
                                Total Price
                              </h4>
                              <p className="text-base font-bold text-green-400">LKR {booking.totalPrice.toLocaleString()}</p>
                              {(booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus !== 'paid' && (
                                <p className="text-xs text-red-400 mt-0.5 font-medium">Payment Pending</p>
                              )}
                              {booking.paymentStatus === 'paid' && (
                                <p className="text-xs text-green-400 mt-0.5 font-medium">✓ Payment Completed</p>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="space-y-1 pt-1 border-t border-gray-700">
                            {userRole === 'provider' && booking.status === 'pending' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookingStatusUpdate(booking.id, 'accepted');
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-xs font-medium"
                                >
                                  <Check className="h-3 w-3" />
                                  Accept
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookingStatusUpdate(booking.id, 'declined');
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-xs font-medium"
                                >
                                  <X className="h-3 w-3" />
                                  Decline
                                </button>
                              </div>
                            )}

                            {userRole === 'tourist' && booking.status === 'accepted' && booking.paymentStatus !== 'paid' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBookingId(null);
                                  navigate(`/payment/${booking.id}`);
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
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingSection;
