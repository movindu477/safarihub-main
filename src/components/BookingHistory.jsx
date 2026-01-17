import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, MapPin, User, Phone, Mail, DollarSign, Download, CheckCircle, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from './home/Navbar';

const BookingHistory = ({ user, onLogout, onShowAuth }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'paid', 'pending'

  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    console.log('📋 Fetching booking history for user:', user.uid);

    // Query bookings where user is the customer
    const customerQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      customerQuery,
      (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('✅ Fetched bookings:', bookingsData.length);
        setBookings(bookingsData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error fetching bookings:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filter bookings based on payment status
  const filteredBookings = bookings.filter(booking => {
    if (filterType === 'paid') return booking.paymentStatus === 'paid';
    if (filterType === 'pending') return booking.paymentStatus !== 'paid';
    return true; // 'all'
  });

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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateBookingTotal = (booking) => {
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
    
    return serviceCharge + addOns;
  };

  const getServiceCharge = (booking) => {
    const actualPricePerDay = booking.pricePerDay || 0;
    let serviceCharge = 0;
    
    if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
      booking.datesWithTypes.forEach(dateObj => {
        serviceCharge += dateObj.type === 'half-day' ? actualPricePerDay * 0.5 : actualPricePerDay;
      });
    } else {
      serviceCharge = actualPricePerDay * (booking.numberOfDays || 1);
    }
    
    return serviceCharge;
  };

  const getDayTypeCounts = (booking) => {
    let fullDays = 0;
    let halfDays = 0;
    
    if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
      booking.datesWithTypes.forEach(dateObj => {
        if (dateObj.type === 'half-day') {
          halfDays++;
        } else {
          fullDays++;
        }
      });
    } else {
      fullDays = booking.numberOfDays || 1;
    }
    
    return { fullDays, halfDays };
  };

  const downloadReceipt = (booking) => {
    // Create a simple text receipt
    const total = calculateBookingTotal(booking);
    const { fullDays, halfDays } = getDayTypeCounts(booking);
    
    let receipt = `
╔═══════════════════════════════════════╗
║       SAFARI BOOKING RECEIPT          ║
╚═══════════════════════════════════════╝

Booking ID: ${booking.id}
Date: ${formatDateTime(booking.createdAt)}
Status: ${booking.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOMER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${booking.customerName || booking.fullName || 'N/A'}
Email: ${booking.email || 'N/A'}
Phone: ${booking.phone || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICE PROVIDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${booking.driverName || booking.guideName || 'Service Provider'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAFARI DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Park: ${booking.nationalPark || 'N/A'}
Type: ${booking.safariType || 'N/A'}
${fullDays > 0 ? `Full Days: ${fullDays}` : ''}
${halfDays > 0 ? `Half Days: ${halfDays}` : ''}
Total Days: ${(fullDays + halfDays) || 1}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRICE BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Base Rate: LKR ${(booking.pricePerDay || 0).toLocaleString()}/day
${fullDays > 0 ? `Full Day × ${fullDays}: LKR ${((booking.pricePerDay || 0) * fullDays).toLocaleString()}` : ''}
${halfDays > 0 ? `Half Day × ${halfDays}: LKR ${((booking.pricePerDay || 0) * 0.5 * halfDays).toLocaleString()}` : ''}
Service Subtotal: LKR ${getServiceCharge(booking).toLocaleString()}

${booking.needsBinoculars || booking.needsChildSeat || booking.needsWater ? '--- Add-ons ---' : ''}
${booking.needsBinoculars ? 'Binoculars: +LKR 500' : ''}
${booking.needsChildSeat ? 'Child Seat: +LKR 1,000' : ''}
${booking.needsWater ? 'Water: +LKR 300' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: LKR ${total.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment Status: ${booking.paymentStatus === 'paid' ? '✓ PAID' : 'PENDING'}
${booking.paidAt ? `Paid On: ${formatDateTime(booking.paidAt)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for choosing SafariHub!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Create and download the file
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SafariHub-Receipt-${booking.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <>
        <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please log in to view your booking history</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 md:py-8 px-3 sm:px-4 lg:px-6 pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-600" />
                Booking History & Receipts
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">View and download your booking receipts</p>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'paid'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Paid ({bookings.filter(b => b.paymentStatus === 'paid').length})
              </button>
              <button
                onClick={() => setFilterType('pending')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filterType === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending ({bookings.filter(b => b.paymentStatus !== 'paid').length})
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12 sm:py-16">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-600 text-sm sm:text-base mt-4">Loading your bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-8 sm:p-12 text-center">
            <Calendar className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-sm sm:text-base text-gray-600">
              {filterType === 'paid' 
                ? "You don't have any paid bookings yet."
                : filterType === 'pending'
                ? "You don't have any pending bookings."
                : "You haven't made any bookings yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredBookings.map((booking) => {
              const total = calculateBookingTotal(booking);
              const { fullDays, halfDays } = getDayTypeCounts(booking);
              const isExpanded = expandedBooking === booking.id;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Booking Card Header */}
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                            {booking.nationalPark || 'Safari Booking'}
                          </h3>
                          {booking.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex-shrink-0">
                              <CheckCircle className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{booking.driverName || booking.guideName || 'Service Provider'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">
                              {fullDays > 0 && `${fullDays} Full`}
                              {fullDays > 0 && halfDays > 0 && ', '}
                              {halfDays > 0 && `${halfDays} Half`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                            LKR {total.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(booking.createdAt?.toDate ? booking.createdAt.toDate() : booking.createdAt)}
                          </div>
                        </div>
                        
                        {booking.paymentStatus === 'paid' && (
                          <button
                            onClick={() => downloadReceipt(booking)}
                            className="p-2 sm:p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex-shrink-0"
                            title="Download Receipt"
                          >
                            <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View Full Details
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-3 sm:p-4 md:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {/* Personal Information */}
                        <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            Personal Information
                          </h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <p><span className="font-medium text-gray-600">Name:</span> <span className="text-gray-900">{booking.customerName || booking.fullName || 'N/A'}</span></p>
                            {booking.email && <p><span className="font-medium text-gray-600">Email:</span> <span className="text-gray-900 break-all">{booking.email}</span></p>}
                            {booking.phone && <p><span className="font-medium text-gray-600">Phone:</span> <span className="text-gray-900">{booking.phone}</span></p>}
                            {booking.country && <p><span className="font-medium text-gray-600">Country:</span> <span className="text-gray-900">{booking.country}</span></p>}
                          </div>
                        </div>

                        {/* Safari Details */}
                        <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                          <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            Safari Details
                          </h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <p><span className="font-medium text-gray-600">Park:</span> <span className="text-gray-900">{booking.nationalPark || 'N/A'}</span></p>
                            <p><span className="font-medium text-gray-600">Type:</span> <span className="text-gray-900">{booking.safariType || 'N/A'}</span></p>
                            {fullDays > 0 && <p><span className="font-medium text-gray-600">Full Days:</span> <span className="text-gray-900">{fullDays}</span></p>}
                            {halfDays > 0 && <p><span className="font-medium text-gray-600">Half Days:</span> <span className="text-gray-900">{halfDays}</span></p>}
                            {booking.numberOfPassengers && <p><span className="font-medium text-gray-600">Passengers:</span> <span className="text-gray-900">{booking.numberOfPassengers}</span></p>}
                          </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border-2 border-green-300 md:col-span-2">
                          <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            Payment Breakdown
                          </h4>
                          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Base Rate:</span>
                              <span className="font-medium">LKR {(booking.pricePerDay || 0).toLocaleString()}/day</span>
                            </div>
                            {fullDays > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span className="pl-2 sm:pl-3">Full Day × {fullDays}</span>
                                <span>LKR {((booking.pricePerDay || 0) * fullDays).toLocaleString()}</span>
                              </div>
                            )}
                            {halfDays > 0 && (
                              <div className="flex justify-between text-gray-600">
                                <span className="pl-2 sm:pl-3">Half Day × {halfDays}</span>
                                <span>LKR {((booking.pricePerDay || 0) * 0.5 * halfDays).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium border-t border-green-200 pt-1.5">
                              <span>Service Subtotal:</span>
                              <span>LKR {getServiceCharge(booking).toLocaleString()}</span>
                            </div>
                            
                            {(booking.needsBinoculars || booking.needsChildSeat || booking.needsWater) && (
                              <>
                                <div className="border-t border-green-200 pt-1.5 mt-1.5">
                                  <div className="font-semibold text-gray-700 mb-1">Add-ons:</div>
                                  {booking.needsBinoculars && (
                                    <div className="flex justify-between text-gray-600">
                                      <span className="pl-2 sm:pl-3">Binoculars</span>
                                      <span>+LKR 500</span>
                                    </div>
                                  )}
                                  {booking.needsChildSeat && (
                                    <div className="flex justify-between text-gray-600">
                                      <span className="pl-2 sm:pl-3">Child Seat</span>
                                      <span>+LKR 1,000</span>
                                    </div>
                                  )}
                                  {booking.needsWater && (
                                    <div className="flex justify-between text-gray-600">
                                      <span className="pl-2 sm:pl-3">Water</span>
                                      <span>+LKR 300</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            <div className="border-t-2 border-green-300 pt-2 mt-2 flex justify-between">
                              <span className="font-bold text-gray-900">Total:</span>
                              <span className="text-lg sm:text-xl font-bold text-green-700">LKR {total.toLocaleString()}</span>
                            </div>
                            
                            {booking.paymentStatus === 'paid' && booking.paidAt && (
                              <p className="text-xs text-green-600 font-medium text-center mt-2">
                                ✓ Paid on {formatDateTime(booking.paidAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default BookingHistory;
