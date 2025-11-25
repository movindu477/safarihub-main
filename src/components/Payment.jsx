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
  Shield
} from 'lucide-react';
import { getDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { createNotification, markNotificationAsRead } from '../App';
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

        setBooking({
          id: snapshot.id,
          ...bookingData
        });
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
      
      // Real-time update: Update booking status to 'paid' in Firestore
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'paid',
        status: 'confirmed', // Change booking status to confirmed
        paidAt: serverTimestamp(),
        paidAtTimestamp: Date.now(),
        paymentMethod: paymentMethod,
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <Loader className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors cursor-pointer font-semibold"
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-1">Your booking has been confirmed</p>
            <p className="text-sm text-gray-500">Redirecting you back...</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-green-500">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="text-sm">Processing redirect</span>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No booking found</p>
        </div>
      </div>
    );
  }

  const serviceType = booking.guideId ? 'Tour Guide' : 'Jeep Driver';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Secure Payment</h1>
                <p className="text-green-100 text-sm">Complete your booking payment</p>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Booking Details & Payment Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Booking Summary
                </h2>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
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
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Method</h2>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
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
                  <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-200">
                    <p className="font-semibold mb-3 text-gray-900">Bank Transfer Details:</p>
                    <div className="space-y-2 text-gray-700">
                      <p><span className="font-medium">Account Name:</span> SafariHub Payments</p>
                      <p><span className="font-medium">Account Number:</span> 1234567890</p>
                      <p><span className="font-medium">Bank:</span> Commercial Bank of Ceylon</p>
                      <p className="mt-3 pt-3 border-t border-gray-300">
                        <span className="font-medium">Reference:</span> <span className="font-mono text-green-600">{bookingId}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-5 sticky top-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Summary</h2>
                
                <div className="space-y-3 mb-5 text-sm">
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
                        <DollarSign className="h-5 w-5 text-green-500" />
                        <span className="text-2xl font-bold text-green-600">
                          LKR {(booking.totalPrice || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3.5 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {processing ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5" />
                      Pay LKR {(booking.totalPrice || 0).toLocaleString()}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span>256-bit SSL Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
