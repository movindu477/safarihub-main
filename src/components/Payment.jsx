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
  const [showBookingForm, setShowBookingForm] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: '',
    email: '',
    phone: '',
    country: '',
    numberOfPassengers: 1,
    specialAssistance: '',
    // Safari Booking Details
    nationalPark: '',
    safariType: 'Morning Safari',
    preferredTime: '',
    duration: '',
    // Pickup & Drop-off
    pickupLocation: '',
    hotelName: '',
    hotelAddress: '',
    roomNumber: '',
    dropoffLocation: '',
    needsHotelPickup: true,
    // Vehicle & Driver Preferences
    jeepType: 'Standard Jeep',
    driverLanguage: 'English',
    needsNaturalist: false,
    // Additional Requests
    needsBinoculars: false,
    needsCamera: false,
    needsChildSeat: false,
    needsWater: false,
    needsSnacks: false,
    needsPhotographyPackage: false,
    parkEntranceIncluded: false,
    // Documents
    passportNumber: '',
    parkTicketProof: '',
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

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
        
        // Initialize form data from booking and user
        if (user) {
          setFormData(prev => ({
            ...prev,
            fullName: bookingData.fullName || user.displayName || '',
            email: bookingData.email || user.email || '',
            phone: bookingData.phone || '',
            country: bookingData.country || '',
            numberOfPassengers: bookingData.numberOfPassengers || 1,
            specialAssistance: bookingData.specialAssistance || '',
            nationalPark: bookingData.nationalPark || '',
            safariType: bookingData.safariType || 'Morning Safari',
            preferredTime: bookingData.preferredTime || '',
            duration: bookingData.duration || '',
            pickupLocation: bookingData.pickupLocation || '',
            hotelName: bookingData.hotelName || '',
            hotelAddress: bookingData.hotelAddress || '',
            roomNumber: bookingData.roomNumber || '',
            dropoffLocation: bookingData.dropoffLocation || '',
            needsHotelPickup: bookingData.needsHotelPickup !== undefined ? bookingData.needsHotelPickup : true,
            jeepType: bookingData.jeepType || 'Standard Jeep',
            driverLanguage: bookingData.driverLanguage || 'English',
            needsNaturalist: bookingData.needsNaturalist || false,
            needsBinoculars: bookingData.needsBinoculars || false,
            needsCamera: bookingData.needsCamera || false,
            needsChildSeat: bookingData.needsChildSeat || false,
            needsWater: bookingData.needsWater || false,
            needsSnacks: bookingData.needsSnacks || false,
            needsPhotographyPackage: bookingData.needsPhotographyPackage || false,
            parkEntranceIncluded: bookingData.parkEntranceIncluded || false,
            passportNumber: bookingData.passportNumber || '',
            parkTicketProof: bookingData.parkTicketProof || '',
            emergencyContactName: bookingData.emergencyContactName || '',
            emergencyContactPhone: bookingData.emergencyContactPhone || ''
          }));
          
          // Check if booking details are already completed
          if (bookingData.bookingDetailsCompleted) {
            setShowBookingForm(false);
          }
        }
        
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
  const isJeepBooking = !booking.guideId;

  // Validate form data
  const validateForm = () => {
    const errors = {};
    
    if (isJeepBooking && showBookingForm) {
      // Personal Details
      if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
      if (!formData.email.trim()) errors.email = 'Email is required';
      if (!formData.phone.trim()) errors.phone = 'Phone number is required';
      if (!formData.country.trim()) errors.country = 'Country is required';
      if (!formData.numberOfPassengers || formData.numberOfPassengers < 1) {
        errors.numberOfPassengers = 'Number of passengers must be at least 1';
      }
      
      // Safari Booking Details
      if (!formData.nationalPark.trim()) errors.nationalPark = 'National park is required';
      if (!formData.safariType) errors.safariType = 'Safari type is required';
      if (!formData.preferredTime.trim()) errors.preferredTime = 'Preferred time is required';
      
      // Pickup & Drop-off
      if (formData.needsHotelPickup) {
        if (!formData.hotelName.trim()) errors.hotelName = 'Hotel name is required';
        if (!formData.hotelAddress.trim()) errors.hotelAddress = 'Hotel address is required';
      }
      if (!formData.pickupLocation.trim()) errors.pickupLocation = 'Pickup location is required';
      if (!formData.dropoffLocation.trim()) errors.dropoffLocation = 'Drop-off location is required';
      
      // Emergency Contact
      if (!formData.emergencyContactName.trim()) errors.emergencyContactName = 'Emergency contact name is required';
      if (!formData.emergencyContactPhone.trim()) errors.emergencyContactPhone = 'Emergency contact phone is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission and proceed to payment
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly.');
      return;
    }

    try {
      // Update booking with form data
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        ...formData,
        bookingDetailsCompleted: true,
        updatedAt: serverTimestamp()
      });
      
      setShowBookingForm(false);
    } catch (err) {
      console.error('Error saving booking details:', err);
      alert('Failed to save booking details. Please try again.');
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
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
          {/* Booking Form - Show only for Jeep bookings and if not completed */}
          {isJeepBooking && showBookingForm ? (
            <BookingForm
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              onSubmit={handleFormSubmit}
              booking={booking}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

// Booking Form Component
function BookingForm({ formData, setFormData, formErrors, currentStep, setCurrentStep, onSubmit, booking }) {
  const steps = [
    { number: 1, title: 'Personal Details', icon: User },
    { number: 2, title: 'Safari Details', icon: Calendar },
    { number: 3, title: 'Pickup & Drop-off', icon: Navigation },
    { number: 4, title: 'Vehicle & Preferences', icon: Car },
    { number: 5, title: 'Additional Requests', icon: Package },
    { number: 6, title: 'Emergency Contact', icon: Phone }
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
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          
          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isActive ? 'bg-green-500 border-green-500 text-white' :
                  isCompleted ? 'bg-green-100 border-green-500 text-green-600' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-full mx-2 -mt-6 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="bg-gray-50 rounded-lg p-6 min-h-[500px]">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-6 w-6 text-green-500" />
              Personal Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-green-500" />
              Safari Booking Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation className="h-6 w-6 text-green-500" />
              Pickup & Drop-off Information
            </h2>
            
            <div className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="h-6 w-6 text-green-500" />
              Vehicle & Driver Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-green-500" />
              Additional Requests / Add-Ons
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.needsBinoculars}
                  onChange={(e) => updateFormData('needsBinoculars', e.target.checked)}
                  className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Binoculars</span>
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="h-6 w-6 text-green-500" />
              Emergency Contact
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Previous
        </button>
        
        {currentStep < steps.length ? (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer"
          >
            Next
          </button>
        ) : (
          <button
            onClick={onSubmit}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors cursor-pointer"
          >
            Proceed to Payment
          </button>
        )}
      </div>
    </div>
  );
}
