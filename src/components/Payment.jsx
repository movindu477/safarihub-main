import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle,
  Calendar,
  MapPin,
  User,
  DollarSign,
  X,
  AlertCircle,
  Loader,
  Lock,
  Shield,
  Mail,
  Phone,
  Globe,
  Users,
  Navigation,
  Car,
  Languages,
  Camera,
  Package,
  FileText,
  UserCircle,
  Check
} from 'lucide-react';
import { getDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { createNotification, markNotificationAsRead } from '../App';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../payment/StripeProvider';
import CheckoutForm from '../payment/CheckoutForm';

// Park ticket prices
const parkTicketPrices = {
  'Yala National Park': 5000,
  'Wilpattu National Park': 4500,
  'Udawalawe National Park': 4000,
  'Minneriya National Park': 3500,
  'Kaudulla National Park': 3500,
  'Bundala National Park': 3000,
  'Kumana National Park': 3000
};

const getParkTicketPrice = (parkName) => {
  return parkTicketPrices[parkName] || 0;
};

export default function Payment({ user: propUser, onLogout, onShowAuth }) {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(propUser || null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser || propUser);
    });
    return () => unsubscribe();
  }, [propUser]);

  // Unlock button when all card details are filled
  useEffect(() => {
    const cardNumberValid = cardDetails.cardNumber.replace(/\s/g, '').length >= 16;
    const expiryValid = cardDetails.expiryDate.length === 5;
    const cvvValid = cardDetails.cvv.length >= 3;
    const nameValid = cardDetails.cardName.length >= 3;

    if (cardNumberValid && expiryValid && cvvValid && nameValid) {
      setIsLocked(false);
    } else {
      setIsLocked(true);
    }
  }, [cardDetails]);

  // Real-time booking listener
  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, 'bookings', bookingId);

    const unsubscribe = onSnapshot(bookingRef, async (snapshot) => {
      if (snapshot.exists()) {
        const bookingData = snapshot.data();

        // Check if already paid FIRST (before status check)
        // This prevents error when status changes from 'accepted' to 'confirmed' after payment
        if (bookingData.paymentStatus === 'paid') {
          // Mark all "accepted" booking notifications as read to prevent redirect loop
          if (user && bookingData.customerId === user.uid) {
            try {
              const notificationsRef = collection(db, 'notifications');
              const notificationsQuery = query(
                notificationsRef,
                where('bookingId', '==', bookingId),
                where('recipientId', '==', bookingData.customerId),
                where('read', '==', false)
              );
              const notificationsSnapshot = await getDocs(notificationsQuery);
              const markReadPromises = notificationsSnapshot.docs.map(doc =>
                markNotificationAsRead(doc.id)
              );
              await Promise.all(markReadPromises);
              console.log('✅ Marked booking acceptance notifications as read (already paid)');
            } catch (err) {
              console.error('Error marking notifications as read:', err);
            }
          }
          setPaymentSuccess(true);
          setLoading(false);
          return;
        }

        // Check if booking is accepted or confirmed (confirmed is allowed after payment)
        if (bookingData.status !== 'accepted' && bookingData.status !== 'confirmed') {
          setError('This booking has not been accepted yet. Please wait for the service provider to accept your booking.');
          setLoading(false);
          return;
        }

        // Check if user is the customer
        if (user && bookingData.customerId !== user.uid) {
          setError('You do not have permission to view this payment page.');
          setLoading(false);
          return;
        }

        const bookingInfo = {
          id: snapshot.id,
          ...bookingData
        };
        setBooking(bookingInfo);
        setLoading(false);
      } else {
        setError('Booking not found');
        setLoading(false);
      }
    }, (err) => {
      console.error('Error fetching booking:', err);
      setError('Failed to load booking details. Please try again.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId, user]);

  // Format dates
  const formatDates = (dates) => {
    if (!dates || !Array.isArray(dates)) return 'N/A';

    return dates.map(date => {
      try {
        const dateObj = date?.toDate ? date.toDate() : new Date(date);
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return date;
      }
    }).join(', ');
  };

  // Format card number
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Validate card details
  const validateCard = () => {
    if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length < 16) {
      return 'Please enter a valid card number';
    }
    if (!cardDetails.expiryDate || cardDetails.expiryDate.length < 5) {
      return 'Please enter a valid expiry date (MM/YY)';
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      return 'Please enter a valid CVV';
    }
    if (!cardDetails.cardName || cardDetails.cardName.length < 3) {
      return 'Please enter cardholder name';
    }
    return null;
  };

  // Process payment with real-time update
  const handlePayment = async () => {
    if (!booking) return;


    const validationError = validateCard();
    if (validationError) {
      alert(validationError);
      return;
    }

    setProcessing(true);

    try {
      // Simulate payment processing (Replace with actual Stripe/Payment Gateway API call)
      // In production, you would:
      // 1. Create a payment intent with Stripe
      // 2. Confirm the payment
      // 3. Get payment confirmation

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Real-time update: Update booking status to 'paid' in Firestore with all form data
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        ...formData, // Include all booking form data
        paymentStatus: 'paid',
        status: 'confirmed', // Change booking status to confirmed
        paidAt: serverTimestamp(),
        paidAtTimestamp: Date.now(),
        paymentMethod: paymentMethod,
        bookingDetailsCompleted: true,
        updatedAt: serverTimestamp()
      });

      // Create notification for customer
      await createNotification({
        type: 'booking',
        title: 'Payment Successful',
        message: `Your payment of LKR ${(booking.totalPrice || 0).toLocaleString()} has been processed successfully!`,
        recipientId: booking.customerId,
        senderId: booking.driverId || booking.guideId,
        senderName: booking.driverName || booking.guideName || 'Service Provider',
        bookingId: bookingId,
        relatedId: bookingId
      });

      // Create notification for service provider
      await createNotification({
        type: 'booking',
        title: 'Payment Received',
        message: `Payment of LKR ${(booking.totalPrice || 0).toLocaleString()} received from ${booking.customerName || 'Customer'}`,
        recipientId: booking.driverId || booking.guideId,
        senderId: booking.customerId,
        senderName: booking.customerName || 'Customer',
        bookingId: bookingId,
        relatedId: bookingId
      });

      // Mark all "accepted" booking notifications as read to prevent redirect loop
      try {
        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
          notificationsRef,
          where('bookingId', '==', bookingId),
          where('recipientId', '==', booking.customerId),
          where('read', '==', false)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const markReadPromises = notificationsSnapshot.docs.map(doc =>
          markNotificationAsRead(doc.id)
        );
        await Promise.all(markReadPromises);
        console.log('✅ Marked booking acceptance notifications as read');
      } catch (err) {
        console.error('Error marking notifications as read:', err);
      }

      setPaymentSuccess(true);
      setShowPaymentConfirmation(true);

    } catch (err) {
      console.error('Payment error:', err);
      alert('❌ Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <Loader className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-green-500 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 wrap-break-word">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-500 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-green-600 transition-colors cursor-pointer font-semibold text-sm sm:text-base w-full sm:w-auto"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Payment confirmation modal
  if (showPaymentConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-1">Your payment has been processed successfully</p>
            <p className="text-xs sm:text-sm text-gray-500">Your booking is now confirmed</p>
          </div>
          <button
            onClick={() => {
              setShowPaymentConfirmation(false);
              navigate('/');
            }}
            className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600">No booking found</p>
        </div>
      </div>
    );
  }

  const serviceType = booking.guideId ? 'Tour Guide' : 'Jeep Driver';
  const isJeepBooking = !booking.guideId;

  // Payment page - no form validation needed, booking details are already in Firestore


  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-5xl w-full my-2 sm:my-8 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-linear-to-r from-green-500 to-green-600 rounded-t-lg sm:rounded-t-2xl p-3 sm:p-6 text-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-bold truncate">Secure Payment</h1>
                  <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Complete your booking payment</p>
                </div>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left Column - Booking Details & Payment Form */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4 order-2 lg:order-1">
                {/* Booking Summary */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                    <span>Booking Summary</span>
                  </h2>

                  <div className="space-y-4">
                    {/* Service & Booking Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 shrink-0" />
                        <div>
                          <p className="text-gray-500 text-xs">Service Provider</p>
                          <p className="font-semibold text-gray-900">{booking.driverName || booking.guideName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{serviceType}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-500 text-xs mb-1">Selected Dates</p>
                          <div className="space-y-1">
                            {booking.datesWithTypes && booking.datesWithTypes.length > 0 ? (
                              booking.datesWithTypes.map((item, index) => {
                                const dateObj = item.date?.toDate ? item.date.toDate() : new Date(item.date);
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                const typeLabel = (item.type === 'half-day') ? 'Half Day' : 'Full Day';
                                const safariTypeLabel = item.type === 'half-day' ? `(${item.safariType || 'Safari'})` : '';
                                return (
                                  <div key={index} className="font-semibold text-gray-900 text-xs flex flex-wrap gap-1">
                                    <span>{dateStr}</span>
                                    <span className="text-gray-500">-</span>
                                    <span className={item.type === 'half-day' ? 'text-yellow-600' : 'text-green-600'}>
                                      {typeLabel} {safariTypeLabel}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="font-semibold text-gray-900 text-xs">{formatDates(booking.selectedDates)}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{booking.numberOfDays || 0} day(s)</p>
                        </div>
                      </div>
                      {booking.nationalPark && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-500 text-xs">National Park</p>
                            <p className="font-semibold text-gray-900">{booking.nationalPark}</p>
                          </div>
                        </div>
                      )}
                      {booking.safariType && (
                        <div className="flex items-start gap-2">
                          <Camera className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-gray-500 text-xs">Safari Type</p>
                            <p className="font-semibold text-gray-900">{booking.safariType}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Personal Information */}
                    {(booking.fullName || booking.email || booking.phone || booking.country) && (
                      <div className="border-t border-gray-300 pt-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Personal Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {booking.fullName && (
                            <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{booking.fullName}</span></div>
                          )}
                          {booking.email && (
                            <div><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900 break-all">{booking.email}</span></div>
                          )}
                          {booking.phone && (
                            <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{booking.phone}</span></div>
                          )}
                          {booking.country && (
                            <div><span className="text-gray-500">Country:</span> <span className="font-medium text-gray-900">{booking.country}</span></div>
                          )}
                          {booking.numberOfPassengers && (
                            <div><span className="text-gray-500">Passengers:</span> <span className="font-medium text-gray-900">{booking.numberOfPassengers}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pickup & Drop-off */}
                    {(booking.pickupLocation || booking.dropoffLocation || booking.hotelName) && (
                      <div className="border-t border-gray-300 pt-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                          <Navigation className="h-4 w-4 text-green-600" />
                          Pickup & Drop-off
                        </h3>
                        <div className="space-y-1.5 text-xs">
                          {booking.pickupLocation && (
                            <div><span className="text-gray-500">Pickup:</span> <span className="font-medium text-gray-900">{booking.pickupLocation}</span></div>
                          )}
                          {booking.dropoffLocation && (
                            <div><span className="text-gray-500">Drop-off:</span> <span className="font-medium text-gray-900">{booking.dropoffLocation}</span></div>
                          )}
                          {booking.needsHotelPickup && booking.hotelName && (
                            <div className="bg-blue-50 p-2 rounded border border-blue-200 mt-2">
                              <div className="font-medium text-gray-900">Hotel: {booking.hotelName}</div>
                              {booking.hotelAddress && <div className="text-gray-600 mt-0.5">{booking.hotelAddress}</div>}
                              {booking.roomNumber && <div className="text-gray-600">Room: {booking.roomNumber}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add-ons & Extras */}
                    {(booking.needsBinoculars || booking.needsChildSeat || booking.needsWater || booking.needsSnacks) && (
                      <div className="border-t border-gray-300 pt-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                          <Package className="h-4 w-4 text-green-600" />
                          Add-ons & Extras
                        </h3>
                        <div className="space-y-1 text-xs">
                          {booking.needsBinoculars && <div className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Binoculars <span className="text-gray-500 ml-auto">+LKR 500</span></div>}
                          {booking.needsChildSeat && <div className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Child Seat <span className="text-gray-500 ml-auto">+LKR 1,000</span></div>}
                          {booking.needsWater && <div className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Water Bottles <span className="text-gray-500 ml-auto">+LKR 300</span></div>}
                          {booking.needsSnacks && booking.selectedSnacks && booking.selectedSnacks.length > 0 && (
                            <div className="mt-1 pl-4">
                              <div className="font-medium text-gray-700">Snacks/Meals:</div>
                              {booking.selectedSnacks.map((snack, idx) => (
                                <div key={idx} className="text-gray-600">• {snack}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Emergency Contact */}
                    {(booking.emergencyContactName || booking.emergencyContactPhone) && (
                      <div className="border-t border-gray-300 pt-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                          <Phone className="h-4 w-4 text-green-600" />
                          Emergency Contact
                        </h3>
                        <div className="text-xs space-y-1">
                          {booking.emergencyContactName && <div><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{booking.emergencyContactName}</span></div>}
                          {booking.emergencyContactPhone && <div><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{booking.emergencyContactPhone}</span></div>}
                        </div>
                      </div>
                    )}

                    {/* Special Requests */}
                    {(booking.specialRequests || booking.specialAssistance || booking.additionalNotes) && (
                      <div className="border-t border-gray-300 pt-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Special Requests & Notes</h3>
                        <div className="text-xs space-y-1 text-gray-700">
                          {booking.specialRequests && <div className="bg-yellow-50 p-2 rounded border border-yellow-200">{booking.specialRequests}</div>}
                          {booking.specialAssistance && <div className="bg-blue-50 p-2 rounded border border-blue-200 mt-1">{booking.specialAssistance}</div>}
                          {booking.additionalNotes && <div className="bg-gray-100 p-2 rounded border border-gray-300 mt-1">{booking.additionalNotes}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Payment Method</h2>

                  <div className="mb-3 sm:mb-4">
                    <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-2"
                      />
                      <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium text-sm">Card</span>
                    </label>
                  </div>

                  {/* Stripe Card Payment Form */}
                  {paymentMethod === 'card' && (
                    <Elements stripe={stripePromise}>
                      <CheckoutForm
                        booking={booking}
                        userId={user?.uid}
                        userEmail={user?.email}
                        onPaymentSuccess={async () => {
                          // Update booking status and create notifications
                          try {
                            const bookingRef = doc(db, 'bookings', bookingId);
                            await updateDoc(bookingRef, {
                              paymentStatus: 'paid',
                              status: 'confirmed',
                              paidAt: serverTimestamp(),
                              updatedAt: serverTimestamp()
                            });

                            // Create notification for customer
                            await createNotification({
                              type: 'booking',
                              title: 'Payment Successful',
                              message: `Your payment of LKR ${(booking.totalPrice || 0).toLocaleString()} has been processed successfully!`,
                              recipientId: booking.customerId,
                              senderId: booking.driverId || booking.guideId,
                              senderName: booking.driverName || booking.guideName || 'Service Provider',
                              bookingId: bookingId,
                              relatedId: bookingId
                            });

                            // Create notification for service provider
                            await createNotification({
                              type: 'booking',
                              title: 'Payment Received',
                              message: `Payment of LKR ${(booking.totalPrice || 0).toLocaleString()} received from ${booking.customerName || 'Customer'}`,
                              recipientId: booking.driverId || booking.guideId,
                              senderId: booking.customerId,
                              senderName: booking.customerName || 'Customer',
                              bookingId: bookingId,
                              relatedId: bookingId
                            });

                            setPaymentSuccess(true);
                            setShowPaymentConfirmation(true);
                          } catch (err) {
                            console.error('Error updating booking after payment:', err);
                          }
                        }}
                      />
                    </Elements>
                  )}

                </div>
              </div>

              {/* Right Column - Payment Summary */}
              <div className="lg:col-span-1 order-1 lg:order-2">
                <div className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4 sm:p-5 lg:sticky lg:top-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Payment Summary</h2>

                  <div className="space-y-2 text-xs sm:text-sm mb-4">
                    {/* Calculate proper pricing */}
                    {(() => {
                      const fullDayCount = booking.datesWithTypes?.filter(d => d.type === 'full-day' || d.type === 'full').length || 0;
                      const halfDayCount = booking.datesWithTypes?.filter(d => d.type === 'half-day').length || 0;

                      const actualPricePerDay = booking.pricePerDay || 0;
                      const priceFullDay = booking.priceFullDay || actualPricePerDay;
                      const priceHalfDay = booking.priceHalfDay || (actualPricePerDay * 0.6); // approximate fallback if not set

                      let baseServiceCharge = 0;

                      const hasTypes = fullDayCount > 0 || halfDayCount > 0;

                      if (hasTypes) {
                        baseServiceCharge = (fullDayCount * priceFullDay) + (halfDayCount * priceHalfDay);
                      } else {
                        // Fallback logic
                        baseServiceCharge = actualPricePerDay * (booking.numberOfDays || 1);
                      }

                      // Calculate add-ons total
                      let addOnsTotal = 0;
                      if (booking.needsBinoculars || booking.binocularsCount > 0) {
                        addOnsTotal += (booking.binocularsCount || 1) * 500;
                      }
                      if (booking.needsChildSeat || booking.childSeatCount > 0) {
                        addOnsTotal += (booking.childSeatCount || 1) * 1000;
                      }
                      if (booking.needsWater || booking.waterBottleCount > 0) {
                        addOnsTotal += (booking.waterBottleCount || 1) * 300;
                      }

                      // Snacks total
                      if (booking.needsSnacks) {
                        const snackPrices = {
                          'Biscuits': 200, 'Chips': 250, 'Fruits': 400, 'Sandwiches': 500,
                          'Rice & Curry': 800, 'Fried Rice': 700, 'Noodles': 600, 'Soft Drinks': 150
                        };

                        if (booking.snackQuantities && Object.keys(booking.snackQuantities).length > 0) {
                          Object.entries(booking.snackQuantities).forEach(([snack, count]) => {
                            if (count > 0) {
                              addOnsTotal += (snackPrices[snack] || 0) * count;
                            }
                          });
                        } else if (booking.selectedSnacks) {
                          booking.selectedSnacks.forEach(snack => {
                            addOnsTotal += snackPrices[snack] || 0;
                          });
                        }
                      }

                      // Calculate actual total (base + add-ons)
                      const calculatedTotal = (baseServiceCharge + addOnsTotal) || booking.totalPrice || 0;

                      return (
                        <>
                          {/* Service Charges Breakdown */}
                          {hasTypes ? (
                            <>
                              {fullDayCount > 0 && (
                                <>
                                  <div className="flex justify-between text-gray-700">
                                    <span>Full Day Service</span>
                                    <span className="font-medium">LKR {priceFullDay.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600 mb-2">
                                    <span className="text-xs">× {fullDayCount} day(s)</span>
                                    <span className="font-medium">LKR {(fullDayCount * priceFullDay).toLocaleString()}</span>
                                  </div>
                                </>
                              )}

                              {halfDayCount > 0 && (
                                <>
                                  <div className="flex justify-between text-gray-700">
                                    <span>Half Day Service</span>
                                    <span className="font-medium">LKR {priceHalfDay.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600 mb-2">
                                    <span className="text-xs">× {halfDayCount} day(s)</span>
                                    <span className="font-medium">LKR {(halfDayCount * priceHalfDay).toLocaleString()}</span>
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between text-gray-700">
                                <span>Service Charge (per day)</span>
                                <span className="font-medium">LKR {actualPricePerDay.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-gray-600">
                                <span className="text-xs">× {booking.numberOfDays || 1} day(s)</span>
                                <span className="font-medium">LKR {baseServiceCharge.toLocaleString()}</span>
                              </div>
                            </>
                          )}

                          {/* Add-ons */}
                          {(booking.needsBinoculars || booking.needsChildSeat || booking.needsWater || booking.needsSnacks) && (
                            <>
                              <div className="border-t border-gray-300 pt-2 mt-2"></div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Add-ons & Extras</div>
                              {(booking.needsBinoculars || (booking.binocularsCount > 0)) && (
                                <div className="flex justify-between text-gray-600">
                                  <span className="text-xs pl-2">Binoculars {(booking.binocularsCount > 1) ? `(x${booking.binocularsCount})` : ''}</span>
                                  <span className="font-medium">+LKR {((booking.binocularsCount || 1) * 500).toLocaleString()}</span>
                                </div>
                              )}
                              {(booking.needsChildSeat || (booking.childSeatCount > 0)) && (
                                <div className="flex justify-between text-gray-600">
                                  <span className="text-xs pl-2">Child Seat {(booking.childSeatCount > 1) ? `(x${booking.childSeatCount})` : ''}</span>
                                  <span className="font-medium">+LKR {((booking.childSeatCount || 1) * 1000).toLocaleString()}</span>
                                </div>
                              )}
                              {(booking.needsWater || (booking.waterBottleCount > 0)) && (
                                <div className="flex justify-between text-gray-600">
                                  <span className="text-xs pl-2">Water Bottles {(booking.waterBottleCount > 1) ? `(x${booking.waterBottleCount})` : ''}</span>
                                  <span className="font-medium">+LKR {((booking.waterBottleCount || 1) * 300).toLocaleString()}</span>
                                </div>
                              )}
                              {booking.needsSnacks && (booking.snackQuantities && Object.keys(booking.snackQuantities).length > 0 ? (
                                Object.entries(booking.snackQuantities).map(([snack, count]) => {
                                  if (count <= 0) return null;
                                  const snackPrices = {
                                    'Biscuits': 200, 'Chips': 250, 'Fruits': 400, 'Sandwiches': 500,
                                    'Rice & Curry': 800, 'Fried Rice': 700, 'Noodles': 600, 'Soft Drinks': 150
                                  };
                                  return (
                                    <div key={snack} className="flex justify-between text-gray-600">
                                      <span className="text-xs pl-2">{snack} (x{count})</span>
                                      <span className="font-medium">+LKR {(count * (snackPrices[snack] || 0)).toLocaleString()}</span>
                                    </div>
                                  );
                                })
                              ) : (
                                booking.selectedSnacks?.map(snack => {
                                  const snackPrices = {
                                    'Biscuits': 200, 'Chips': 250, 'Fruits': 400, 'Sandwiches': 500,
                                    'Rice & Curry': 800, 'Fried Rice': 700, 'Noodles': 600, 'Soft Drinks': 150
                                  };
                                  return (
                                    <div key={snack} className="flex justify-between text-gray-600">
                                      <span className="text-xs pl-2">{snack}</span>
                                      <span className="font-medium">+LKR {(snackPrices[snack] || 0).toLocaleString()}</span>
                                    </div>
                                  );
                                })
                              ))}
                              <div className="flex justify-between text-gray-700 pt-1 mt-1">
                                <span className="text-xs font-semibold">Add-ons Subtotal</span>
                                <span className="font-medium">LKR {addOnsTotal.toLocaleString()}</span>
                              </div>
                            </>
                          )}

                          {/* Total */}
                          <div className="border-t-2 border-gray-400 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-900 text-sm sm:text-base">Total Amount</span>
                              <div className="flex items-center gap-1">
                                <span className="text-lg sm:text-2xl font-bold text-green-600">
                                  LKR {calculatedTotal.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Only show old payment button if not using Stripe card payment */}
                  {paymentMethod !== 'card' && (
                    <button
                      onClick={handlePayment}
                      disabled={processing || isLocked}
                      className={`w-full bg-linear-to-r from-green-500 to-green-600 text-white py-2.5 sm:py-3.5 rounded-lg text-sm sm:text-base font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-xl`}
                    >
                      {processing ? (
                        <>
                          <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          <span className="hidden sm:inline">Processing Payment...</span>
                          <span className="sm:hidden">Processing...</span>
                        </>
                      ) : (
                        <>
                          {isLocked ? (
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-300" />
                          ) : (
                            <div className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-500 opacity-0" />
                          )}
                          <span className="hidden sm:inline">Pay LKR {(booking.totalPrice || 0).toLocaleString()}</span>
                          <span className="sm:hidden">Pay Now</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-500">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>256-bit SSL Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Booking Form Component
function BookingForm({ formData, setFormData, formErrors, currentStep, setCurrentStep, onSubmit, booking }) {
  // Emergency Contact step removed - form submits from Additional Requests
  const steps = [
    { number: 1, title: 'Personal', shortTitle: 'Personal', icon: User },
    { number: 2, title: 'Safari Details', shortTitle: 'Safari', icon: Calendar },
    { number: 3, title: 'Pickup & Drop-off', shortTitle: 'Pickup', icon: Navigation },
    { number: 4, title: 'Additional Requests', shortTitle: 'Add-ons', icon: Package }
  ];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Indicator */}
      <div className="flex items-start justify-between mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 sm:mx-0 px-3 sm:px-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex items-start shrink-0" style={{ width: 'calc(16.666% - 8px)' }}>
              <div className="flex flex-col items-center w-full">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-green-500 border-green-500 text-white' :
                  isCompleted ? 'bg-green-100 border-green-500 text-green-600' :
                    'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  )}
                </div>
                <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${isActive ? 'text-green-600' : 'text-gray-500'
                  }`}>
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.shortTitle}</span>
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block h-0.5 w-full mx-1 sm:mx-2 -mt-4 sm:-mt-6 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 min-h-[400px] sm:min-h-[500px]">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
              <span>Personal Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 ${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="Enter your full name"
                />
                {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="your.email@example.com"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="+94 77 123 4567"
                />
                {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country of Residence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateFormData('country', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="e.g., United States, United Kingdom"
                />
                {formErrors.country && <p className="text-red-500 text-xs mt-1">{formErrors.country}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Passengers <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={formData.numberOfPassengers}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Allow empty string while typing
                    if (inputValue === '') {
                      updateFormData('numberOfPassengers', '');
                      return;
                    }
                    const numValue = parseInt(inputValue);
                    // Only allow numbers between 1 and 6
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 6) {
                      updateFormData('numberOfPassengers', numValue);
                    } else if (numValue > 6) {
                      updateFormData('numberOfPassengers', 6);
                    } else if (numValue < 1 && inputValue !== '') {
                      updateFormData('numberOfPassengers', 1);
                    }
                  }}
                  onBlur={(e) => {
                    // Ensure value is between 1-6 on blur
                    const value = parseInt(e.target.value) || 1;
                    const clampedValue = Math.min(Math.max(value, 1), 6);
                    updateFormData('numberOfPassengers', clampedValue);
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.numberOfPassengers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                />
                {formErrors.numberOfPassengers && <p className="text-red-500 text-xs mt-1">{formErrors.numberOfPassengers}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Assistance (Optional)
                </label>
                <textarea
                  value={formData.specialAssistance}
                  onChange={(e) => updateFormData('specialAssistance', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Any special requirements or assistance needed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Safari Booking Details */}
        {currentStep === 2 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
              <span>Safari Booking Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  National Park <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.nationalPark}
                  onChange={(e) => updateFormData('nationalPark', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 appearance-none pr-10 ${formErrors.nationalPark ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                >
                  <option value="">Select National Park</option>
                  <option value="Yala National Park">Yala National Park</option>
                  <option value="Udawalawe National Park">Udawalawe National Park</option>
                  <option value="Wilpattu National Park">Wilpattu National Park</option>
                  <option value="Minneriya National Park">Minneriya National Park</option>
                  <option value="Kaudulla National Park">Kaudulla National Park</option>
                  <option value="Bundala National Park">Bundala National Park</option>
                  <option value="Kumana National Park">Kumana National Park</option>
                </select>
                {formErrors.nationalPark && <p className="text-red-500 text-xs mt-1">{formErrors.nationalPark}</p>}
                {formData.nationalPark && (
                  <p className="text-xs text-gray-600 mt-1">
                    Park Ticket: LKR {getParkTicketPrice(formData.nationalPark).toLocaleString()} per person
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Safari Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.safariType}
                  onChange={(e) => updateFormData('safariType', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.safariType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                >
                  <option value="Morning Safari">Morning Safari</option>
                  <option value="Evening Safari">Evening Safari</option>
                  <option value="Full-day Safari">Full-day Safari</option>
                </select>
                {formErrors.safariType && <p className="text-red-500 text-xs mt-1">{formErrors.safariType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.preferredTime}
                  onChange={(e) => updateFormData('preferredTime', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.preferredTime ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                />
                {formErrors.preferredTime && <p className="text-red-500 text-xs mt-1">{formErrors.preferredTime}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (Optional)
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => updateFormData('duration', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 4 hours, Half day"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pickup & Drop-off Information */}
        {currentStep === 3 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
              <span className="wrap-break-word">Pickup & Drop-off Information</span>
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="needsHotelPickup"
                  checked={formData.needsHotelPickup}
                  onChange={(e) => updateFormData('needsHotelPickup', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <label htmlFor="needsHotelPickup" className="text-sm font-medium text-gray-700">
                  Do you need hotel pickup?
                </label>
              </div>

              {formData.needsHotelPickup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hotel Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.hotelName}
                      onChange={(e) => updateFormData('hotelName', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      placeholder="Hotel name"
                    />
                    {formErrors.hotelName && <p className="text-red-500 text-xs mt-1">{formErrors.hotelName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => updateFormData('roomNumber', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Room number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hotel Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.hotelAddress}
                      onChange={(e) => updateFormData('hotelAddress', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                        }`}
                      rows="2"
                      placeholder="Hotel address"
                    />
                    {formErrors.hotelAddress && <p className="text-red-500 text-xs mt-1">{formErrors.hotelAddress}</p>}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.pickupLocation}
                  onChange={(e) => updateFormData('pickupLocation', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.pickupLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="Pickup location or address"
                />
                {formErrors.pickupLocation && <p className="text-red-500 text-xs mt-1">{formErrors.pickupLocation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drop-off Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dropoffLocation}
                  onChange={(e) => updateFormData('dropoffLocation', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.dropoffLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                    }`}
                  placeholder="Drop-off location or address"
                />
                {formErrors.dropoffLocation && <p className="text-red-500 text-xs mt-1">{formErrors.dropoffLocation}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Additional Requests/Add-ons */}
        {currentStep === 4 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
              <span className="wrap-break-word">Additional Requests / Add-Ons</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {[
                { key: 'needsBinoculars', label: 'Binoculars', price: 500 },
                { key: 'needsChildSeat', label: 'Child Seat', price: 1000 },
                { key: 'needsWater', label: 'Water Bottles', price: 300 },
                { key: 'needsSnacks', label: 'Snacks / Meals', price: 0 }
              ].map(({ key, label, price }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer p-2.5 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData[key]}
                      onChange={(e) => updateFormData(key, e.target.checked)}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 rounded focus:ring-green-500 shrink-0"
                    />
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  {price > 0 && (
                    <span className="text-xs sm:text-sm font-semibold text-green-600">+LKR {price.toLocaleString()}</span>
                  )}
                </label>
              ))}
            </div>
            {formData.needsSnacks && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Snacks & Meals:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['Biscuits', 'Chips', 'Fruits', 'Sandwiches', 'Rice & Curry', 'Fried Rice', 'Noodles', 'Soft Drinks'].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded border border-gray-200">
                      <input
                        type="checkbox"
                        checked={formData.selectedSnacks?.includes(item) || false}
                        onChange={(e) => {
                          const currentSnacks = formData.selectedSnacks || [];
                          const newSnacks = e.target.checked
                            ? [...currentSnacks, item]
                            : currentSnacks.filter(s => s !== item);
                          updateFormData('selectedSnacks', newSnacks);
                        }}
                        className="w-4 h-4 text-green-500 rounded focus:ring-green-500"
                      />
                      <span className="text-xs text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-3 sm:pt-4 border-t border-gray-200 gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex-1 sm:flex-none"
        >
          Previous
        </button>

        {currentStep < steps.length ? (
          <button
            onClick={handleNext}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer flex-1 sm:flex-none"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">Proceed to Payment</span>
            <span className="sm:hidden">Proceed</span>
          </button>
        )}
      </div>
    </div>
  );
}
