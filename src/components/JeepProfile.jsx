import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Star, Calendar, Clock, Users, Shield, Award, Globe, MessageCircle, X, Send, Wifi, WifiOff } from 'lucide-react';
import { db, sendMessage, getMessages, addReview, getReviews, addBooking, getBookings, getUserOnlineStatus, setUserOnline, setUserOffline } from '../firebase';

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeep, openChat } = location.state || {};
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showChat, setShowChat] = useState(openChat || false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState({ rating: 0, message: '' });
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [driverOnlineStatus, setDriverOnlineStatus] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const messagesEndRef = useRef(null);

  // User management
  const userId = localStorage.getItem('userId') || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userName = localStorage.getItem('userName') || 'Safari Traveler';

  useEffect(() => {
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId);
    }
    if (!localStorage.getItem('userName')) {
      localStorage.setItem('userName', userName);
    }
  }, [userId, userName]);

  // Load messages from Firebase
  useEffect(() => {
    if (jeep && showChat) {
      const unsubscribe = getMessages(jeep.id, userId, (messages) => {
        setMessages(messages);
      });
      
      return () => unsubscribe();
    }
  }, [jeep, userId, showChat]);

  // Load reviews from Firebase
  useEffect(() => {
    if (jeep) {
      const unsubscribe = getReviews(jeep.id, (reviews) => {
        setReviews(reviews);
      });
      
      return () => unsubscribe();
    }
  }, [jeep]);

  // Load bookings from Firebase
  useEffect(() => {
    if (jeep) {
      const unsubscribe = getBookings(jeep.id, (bookings) => {
        setBookings(bookings);
      });
      
      return () => unsubscribe();
    }
  }, [jeep]);

  // Load driver online status
  useEffect(() => {
    if (jeep) {
      const unsubscribe = getUserOnlineStatus(jeep.id, (status) => {
        setDriverOnlineStatus(status);
      });
      
      return () => unsubscribe();
    }
  }, [jeep]);

  // Set user online when component mounts
  useEffect(() => {
    setUserOnline(userId, 'tourist', {
      userName: userName,
      lastSeen: new Date()
    });

    return () => {
      setUserOffline(userId);
    };
  }, [userId, userName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!jeep) {
    navigate('/driver');
    return null;
  }

  // Format price display
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  // Send message function using Firebase
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !jeep) return;

    const messageData = {
      userId: userId,
      driverId: jeep.id,
      message: newMessage,
      senderType: 'user',
      userName: userName,
      driverName: jeep.driverName,
      conversationId: `conv_${jeep.id}_${userId}`,
      timestamp: new Date(),
      read: false
    };

    try {
      await sendMessage(messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Review functions using Firebase
  const submitReview = async () => {
    if (userReview.rating === 0 || !userReview.message.trim()) return;

    const review = {
      userId: userId,
      userName: userName,
      rating: userReview.rating,
      message: userReview.message,
      jeepId: jeep.id,
      timestamp: new Date()
    };

    try {
      await addReview(review);
      setUserReview({ rating: 0, message: '' });
      setShowReviewModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Calendar functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isDateBooked = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.some(booking => booking.date === dateString);
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateAvailable = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return jeep.availableDates?.includes(dateString) || false;
  };

  const bookDate = async (date) => {
    if (isDateInPast(date) || isDateBooked(date) || !isDateAvailable(date)) return;

    const dateString = date.toISOString().split('T')[0];
    const bookingData = {
      userId: userId,
      userName: userName,
      jeepId: jeep.id,
      driverName: jeep.driverName,
      date: dateString,
      status: 'pending',
      timestamp: new Date()
    };

    try {
      await addBooking(bookingData);
    } catch (error) {
      console.error('Error creating booking:', error);
    }
  };

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isBooked = isDateBooked(date);
      const isPast = isDateInPast(date);
      const isAvailable = isDateAvailable(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => bookDate(date)}
          disabled={isPast || isBooked || !isAvailable}
          className={`h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
            isBooked
              ? 'bg-red-500 text-white cursor-not-allowed'
              : isPast
              ? 'text-gray-400 cursor-not-allowed bg-gray-200'
              : isAvailable
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'text-gray-400 cursor-not-allowed bg-gray-100'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Calculate average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return jeep.rating || 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const averageRating = calculateAverageRating();

  // Online Status Component
  const OnlineStatus = () => {
    if (driverOnlineStatus?.isOnline) {
      return (
        <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
          <Wifi className="h-3 w-3" />
          <span>Online Now</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50 p-4">
      {/* Compact Header */}
      <div className="bg-white rounded-xl shadow-sm border border-white/20 mb-4">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/driver')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-all duration-300 p-2 rounded-lg hover:bg-slate-100 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <OnlineStatus />
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{userName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-7xl mx-auto">
        
        {/* Left Column - Profile Information */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-white/20 backdrop-blur-sm overflow-hidden">
            {/* ✅ FIXED: Rounded Profile Photo Section */}
            <div className="relative">
              <div className="h-48 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                {jeep.imageUrl || jeep.profilePicture ? (
                  <>
                    <img
                      src={jeep.imageUrl || jeep.profilePicture}
                      alt={jeep.driverName || jeep.fullName}
                      className={`w-32 h-32 object-cover rounded-full border-4 border-white shadow-lg transition-opacity duration-300 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => setImageLoaded(true)}
                    />
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse rounded-full w-32 h-32"></div>
                    )}
                  </>
                ) : (
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <div className="text-center text-white">
                      <span className="text-3xl">🚙</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Experience Badge */}
              {(jeep.experience > 0 || jeep.experienceYears > 0) && (
                <div className="absolute top-4 right-4 bg-white/90 text-amber-600 px-3 py-1 rounded-full text-sm font-bold shadow">
                  ⭐ {(jeep.experience || jeep.experienceYears)}+ years
                </div>
              )}

              {/* Rating Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-2 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-300 text-sm">
                    {'★'.repeat(Math.floor(averageRating))}
                    {'☆'.repeat(5 - Math.floor(averageRating))}
                  </div>
                  <span className="text-sm font-medium">
                    ({averageRating > 0 ? averageRating.toFixed(1) : 'New'})
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="text-center mb-3">
                <h1 className="text-lg font-bold text-slate-800 mb-1">{jeep.driverName || jeep.fullName}</h1>
                <div className="flex items-center justify-center gap-1 text-slate-600 text-sm">
                  <MapPin className="h-3 w-3" />
                  <span>{jeep.location}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-3 p-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                <div className="text-base font-bold text-emerald-600">
                  {jeep.pricePerDay > 0 ? (
                    <>LKR {formatPrice(jeep.pricePerDay)}<span className="text-xs font-normal text-emerald-500">/day</span></>
                  ) : (
                    <span className="text-sm text-slate-500">Contact for price</span>
                  )}
                </div>
              </div>

              {/* Service Type */}
              <div className="text-center mb-3">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-lg font-bold text-xs inline-block">
                  {jeep.vehicleType || jeep.serviceType || 'Safari Jeep'}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-blue-50 rounded p-2 text-center border border-blue-100">
                  <Users className="h-3 w-3 text-blue-500 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-blue-700">6-8 Seats</div>
                </div>
                <div className="bg-purple-50 rounded p-2 text-center border border-purple-100">
                  <Clock className="h-3 w-3 text-purple-500 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-purple-700">Flexible</div>
                </div>
                <div className="bg-green-50 rounded p-2 text-center border border-green-100">
                  <Shield className="h-3 w-3 text-green-500 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-green-700">Verified</div>
                </div>
                <div className="bg-amber-50 rounded p-2 text-center border border-amber-100">
                  <Award className="h-3 w-3 text-amber-500 mx-auto mb-1" />
                  <div className="text-xs font-semibold text-amber-700">{(jeep.experience || jeep.experienceYears || 0)}+ yrs</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-white/20 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowChat(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow hover:shadow-md"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Chat</span>
              </button>
              
              <button
                onClick={() => window.open(`tel:${jeep.contactPhone}`, '_self')}
                disabled={!jeep.contactPhone || jeep.contactPhone === 'Not provided'}
                className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow hover:shadow-md"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">Call</span>
              </button>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-white/20 backdrop-blur-sm">
            <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              Contact Information
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <Phone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">Phone</div>
                  <div className="text-xs text-slate-600 truncate">
                    {jeep.contactPhone && jeep.contactPhone !== 'Not provided' ? jeep.contactPhone : 'Not available'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all">
                <Mail className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">Email</div>
                  <div className="text-xs text-slate-600 truncate">
                    {jeep.contactEmail || 'Not available'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Location</div>
                  <div className="text-xs text-slate-600">{jeep.location}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details & Actions */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          {/* Main Details Card */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-white/20 backdrop-blur-sm">
            {/* Description */}
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                About This Service
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {jeep.description || `Professional ${jeep.serviceType || 'safari jeep'} service with ${jeep.experience || jeep.experienceYears || 'several'} years of experience. Specializing in wildlife safaris and tourist transportation across Sri Lanka's most beautiful national parks and nature reserves.`}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Destinations */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  Destinations
                </h3>
                <div className="space-y-1">
                  {(jeep.destinations && jeep.destinations.length > 0) ? (
                    jeep.destinations.slice(0, 3).map((destination, index) => (
                      <div key={index} className="flex items-center gap-2 text-slate-600 text-xs">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                        <span>{destination}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-xs">Various safari destinations across Sri Lanka</div>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-1">
                  {(jeep.languages && jeep.languages.length > 0) ? (
                    jeep.languages.slice(0, 4).map((language, index) => (
                      <span
                        key={index}
                        className="bg-white px-2 py-1 rounded text-xs font-medium text-slate-700 border border-slate-200"
                      >
                        {language}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs">English, Sinhala</span>
                  )}
                </div>
              </div>
            </div>

            {/* Special Skills */}
            {jeep.specialSkills && jeep.specialSkills.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-emerald-500" />
                  Special Services
                </h3>
                <div className="flex flex-wrap gap-1">
                  {jeep.specialSkills.slice(0, 4).map((skill, index) => (
                    <span
                      key={index}
                      className="bg-white px-2 py-1 rounded text-xs font-medium text-slate-700 border border-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications & Safety */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-3 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Safety & Certifications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {jeep.certifications && jeep.certifications.length > 0 ? (
                  jeep.certifications.slice(0, 4).map((cert, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white/80 rounded p-2 border border-white">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-slate-700 text-xs font-medium">{cert}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-2 bg-white/80 rounded p-2 border border-white">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-slate-700 text-xs font-medium">Licensed Driver</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/80 rounded p-2 border border-white">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-slate-700 text-xs font-medium">First Aid Certified</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-amber-500" />
                Customer Reviews ({reviews.length})
              </h3>
              <button
                onClick={() => setShowReviewModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              >
                Add Review
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-3 text-gray-500">
                <Star className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {reviews.slice(0, 3).map(review => (
                  <div key={review.id} className="border-b border-gray-100 pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex text-amber-400 text-xs">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </div>
                      <span className="text-xs text-gray-500">
                        {review.timestamp ? new Date(review.timestamp.toDate()).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{review.message}</p>
                    <p className="text-xs text-gray-500 mt-1">- {review.userName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Booking Calendar */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-white/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-amber-500" />
                Quick Booking
              </h3>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                Available
              </span>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-center mb-2">
                <div className="text-xs text-slate-600 mb-1">Next available dates:</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {['Today', 'Tomorrow', 'In 2 days'].map((date, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium border border-green-200"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={() => setShowCalendar(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 rounded-lg font-semibold text-sm w-full hover:from-amber-600 hover:to-orange-700 transition-colors"
                >
                  Check Full Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Select Available Dates</h3>
              <button
                onClick={() => setShowCalendar(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  ‹
                </button>
                <h3 className="text-lg font-semibold text-gray-800">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  ›
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-gray-500 text-sm font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>

              {/* Calendar Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span className="text-gray-600">Past</span>
                </div>
              </div>

              {/* Selected Dates Summary */}
              {bookings.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm font-medium mb-2">
                    Your Bookings ({bookings.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {bookings.slice(0, 3).map(booking => (
                      <span key={booking.id} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                        {new Date(booking.date).toLocaleDateString()}
                      </span>
                    ))}
                    {bookings.length > 3 && (
                      <span className="text-blue-600 text-xs">
                        +{bookings.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[70vh] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {jeep.driverName?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{jeep.driverName}</h3>
                  <div className="flex items-center gap-1">
                    <OnlineStatus />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-96">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                        message.senderType === 'user'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-800">Add Your Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex gap-1 justify-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setUserReview(prev => ({ ...prev, rating: star }))}
                    className="text-2xl focus:outline-none transition-transform hover:scale-110"
                  >
                    {star <= userReview.rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Review Message */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={userReview.message}
                onChange={(e) => setUserReview(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Share your experience..."
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submitReview}
              disabled={userReview.rating === 0 || !userReview.message.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50 transition-colors hover:from-amber-600 hover:to-orange-700"
            >
              Submit Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JeepProfile;