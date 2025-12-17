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
  UserCircle
} from 'lucide-react';
import { getDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { createNotification, markNotificationAsRead, ScrollToTopButton } from '../App';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser || propUser);
    });
    return () => unsubscribe();
  }, [propUser]);

  // Auto-redirect to home page when payment is successful
  useEffect(() => {
    if (paymentSuccess) {
      console.log('✅ Payment successful, redirecting to home page in 2 seconds...');
      const redirectTimer = setTimeout(() => {
        console.log('🔄 Redirecting to home page now...');
        // Use window.location.href for reliable redirect (works in all environments including Vercel)
        // Use replace to prevent back button from going back to payment page
        window.location.replace('/');
      }, 2000);
      
      return () => {
        clearTimeout(redirectTimer);
      };
    }
  }, [paymentSuccess]);

  // Real-time booking listener
  useEffect(() => {
    if (!bookingId) return;

    const bookingRef = doc(db, 'bookings', bookingId);
    
    const unsubscribe = onSnapshot(bookingRef, async (snapshot) => {
      if (snapshot.exists()) {
        const bookingData = snapshot.data();
        
        // Check if booking is accepted
        if (bookingData.status !== 'accepted') {
          setError('This booking has not been accepted yet. Please wait for the service provider to accept your booking.');
          setLoading(false);
          return;
        }

        // Check if already paid
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
      
      // Redirect is handled by useEffect when paymentSuccess becomes true

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 break-words">{error}</p>
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

  // Payment success state
  if (paymentSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <div className="mb-4 sm:mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-1">Your booking has been confirmed</p>
            <p className="text-xs sm:text-sm text-gray-500">Redirecting you back...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-green-500">
            <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            <span className="text-xs sm:text-sm">Processing redirect</span>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
      <ScrollToTopButton />
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-5xl w-full my-2 sm:my-8 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-lg sm:rounded-t-2xl p-3 sm:p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold truncate">Secure Payment</h1>
                <p className="text-green-100 text-xs sm:text-sm hidden sm:block">Complete your booking payment</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-2"
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
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <span>Booking Summary</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Service Provider</p>
                      <p className="font-semibold text-gray-900">{booking.driverName || booking.guideName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{serviceType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Selected Dates</p>
                      <p className="font-semibold text-gray-900 text-xs">{formatDates(booking.selectedDates)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Location</p>
                      <p className="font-semibold text-gray-900">{booking.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-xs">Duration</p>
                      <p className="font-semibold text-gray-900">{booking.numberOfDays || 0} day(s)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Payment Method</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
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

                  <label className={`flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'bank' ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-2"
                    />
                    <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="font-medium text-sm">Bank Transfer</span>
                  </label>
                </div>

                {/* Card Payment Form */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardDetails.cardName}
                        onChange={(e) => setCardDetails({...cardDetails, cardName: e.target.value})}
                        placeholder="John Doe"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                      <input
                        type="text"
                        value={cardDetails.cardNumber}
                        onChange={(e) => setCardDetails({...cardDetails, cardNumber: formatCardNumber(e.target.value)})}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input
                          type="text"
                          value={cardDetails.expiryDate}
                          onChange={(e) => setCardDetails({...cardDetails, expiryDate: formatExpiryDate(e.target.value)})}
                          placeholder="MM/YY"
                          maxLength="5"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                        <input
                          type="text"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                          placeholder="123"
                          maxLength="4"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Transfer Info */}
                {paymentMethod === 'bank' && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-xs sm:text-sm border border-gray-200">
                    <p className="font-semibold mb-2 sm:mb-3 text-gray-900">Bank Transfer Details:</p>
                    <div className="space-y-1.5 sm:space-y-2 text-gray-700">
                      <p className="break-words"><span className="font-medium">Account Name:</span> SafariHub Payments</p>
                      <p className="break-all"><span className="font-medium">Account Number:</span> 1234567890</p>
                      <p className="break-words"><span className="font-medium">Bank:</span> Commercial Bank of Ceylon</p>
                      <p className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-300 break-all">
                        <span className="font-medium">Reference:</span> <span className="font-mono text-green-600 text-[10px] sm:text-xs">{bookingId}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4 sm:p-5 lg:sticky lg:top-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Payment Summary</h2>
                
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5 text-xs sm:text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium">LKR {((booking.totalPrice || 0) / (booking.numberOfDays || 1)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Days</span>
                    <span className="font-medium">{booking.numberOfDays || 0}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                        <span className="text-lg sm:text-2xl font-bold text-green-600">
                          LKR {(booking.totalPrice || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 sm:py-3.5 rounded-lg text-sm sm:text-base font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {processing ? (
                    <>
                      <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span className="hidden sm:inline">Processing Payment...</span>
                      <span className="sm:hidden">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="hidden sm:inline">Pay LKR {(booking.totalPrice || 0).toLocaleString()}</span>
                      <span className="sm:hidden">Pay Now</span>
                    </>
                  )}
                </button>

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
  const steps = [
    { number: 1, title: 'Personal', shortTitle: 'Personal', icon: User },
    { number: 2, title: 'Safari Details', shortTitle: 'Safari', icon: Calendar },
    { number: 3, title: 'Pickup & Drop-off', shortTitle: 'Pickup', icon: Navigation },
    { number: 4, title: 'Vehicle & Preferences', shortTitle: 'Vehicle', icon: Car },
    { number: 5, title: 'Additional Requests', shortTitle: 'Add-ons', icon: Package },
    { number: 6, title: 'Emergency Contact', shortTitle: 'Emergency', icon: Phone }
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
            <div key={step.number} className="flex items-start flex-shrink-0" style={{ width: 'calc(16.666% - 8px)' }}>
              <div className="flex flex-col items-center w-full">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isActive ? 'bg-green-500 border-green-500 text-white' :
                  isCompleted ? 'bg-green-100 border-green-500 text-green-600' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  )}
                </div>
                <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.shortTitle}</span>
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`hidden sm:block h-0.5 w-full mx-1 sm:mx-2 -mt-4 sm:-mt-6 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
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
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
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
                  className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  max="20"
                  value={formData.numberOfPassengers}
                  onChange={(e) => updateFormData('numberOfPassengers', parseInt(e.target.value) || 1)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.numberOfPassengers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.nationalPark ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Safari Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.safariType}
                  onChange={(e) => updateFormData('safariType', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.safariType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.preferredTime ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
              <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
              <span className="break-words">Pickup & Drop-off Information</span>
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
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                        formErrors.hotelName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                        formErrors.hotelAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.pickupLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.dropoffLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Drop-off location or address"
                />
                {formErrors.dropoffLocation && <p className="text-red-500 text-xs mt-1">{formErrors.dropoffLocation}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Vehicle & Driver Preferences */}
        {currentStep === 4 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Car className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
              <span className="break-words">Vehicle & Driver Preferences</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jeep Type
                </label>
                <select
                  value={formData.jeepType}
                  onChange={(e) => updateFormData('jeepType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Standard Jeep">Standard Jeep</option>
                  <option value="Luxury Jeep">Luxury Jeep</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Language Preference
                </label>
                <select
                  value={formData.driverLanguage}
                  onChange={(e) => updateFormData('driverLanguage', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="English">English</option>
                  <option value="Sinhala">Sinhala</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needsNaturalist}
                    onChange={(e) => updateFormData('needsNaturalist', e.target.checked)}
                    className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Request for a naturalist/guide with the jeep (optional)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Additional Requests/Add-ons */}
        {currentStep === 5 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
              <span className="break-words">Additional Requests / Add-Ons</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 sm:p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsBinoculars}
                  onChange={(e) => updateFormData('needsBinoculars', e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 rounded focus:ring-green-500 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Binoculars</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsCamera}
                  onChange={(e) => updateFormData('needsCamera', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Camera Hire</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsChildSeat}
                  onChange={(e) => updateFormData('needsChildSeat', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Child Seat</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsWater}
                  onChange={(e) => updateFormData('needsWater', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Water Bottles</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsSnacks}
                  onChange={(e) => updateFormData('needsSnacks', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Snacks / Meals</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsPhotographyPackage}
                  onChange={(e) => updateFormData('needsPhotographyPackage', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Photography Package</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 md:col-span-2">
                <input
                  type="checkbox"
                  checked={formData.parkEntranceIncluded}
                  onChange={(e) => updateFormData('parkEntranceIncluded', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Park entrance tickets included in booking
                </span>
              </label>
            </div>

            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passport Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.passportNumber}
                  onChange={(e) => updateFormData('passportNumber', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="For national park registration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Park Ticket Proof (Optional)
                </label>
                <input
                  type="text"
                  value={formData.parkTicketProof}
                  onChange={(e) => updateFormData('parkTicketProof', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Reference number if purchased separately"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Emergency Contact */}
        {currentStep === 6 && (
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
              <span>Emergency Contact</span>
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.emergencyContactName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="Full name"
                />
                {formErrors.emergencyContactName && <p className="text-red-500 text-xs mt-1">{formErrors.emergencyContactName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateFormData('emergencyContactPhone', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
                    formErrors.emergencyContactPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'
                  }`}
                  placeholder="+94 77 123 4567"
                />
                {formErrors.emergencyContactPhone && <p className="text-red-500 text-xs mt-1">{formErrors.emergencyContactPhone}</p>}
              </div>
            </div>
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
