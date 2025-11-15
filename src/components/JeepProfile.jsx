import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Star, Calendar, Clock, Users, Shield, Award, Globe, Sparkles, Check, MessageCircle, X, Send, Bell } from 'lucide-react';
import io from 'socket.io-client';
import './JeepProfile.css';

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeep } = location.state || {};
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState({ rating: 0, message: '' });
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
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

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to messaging server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Join conversation when jeep data is available
  useEffect(() => {
    if (socket && isConnected && jeep) {
      socket.emit('user_join', {
        userId: userId,
        driverId: jeep.id,
        userName: userName
      });
    }
  }, [socket, isConnected, jeep, userId, userName]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('new_message', (messageData) => {
        setMessages(prev => [...prev, messageData]);
        
        if (messageData.senderType === 'driver') {
          addNotification({
            id: Date.now(),
            type: 'message',
            message: `New message from ${jeep.driverName}`,
            timestamp: new Date().toISOString(),
            read: false
          });
        }
      });

      socket.on('conversation_history', (history) => {
        setMessages(history);
      });

      socket.on('new_message_notification', (notification) => {
        addNotification({
          id: Date.now(),
          type: 'message',
          message: `New message from ${notification.senderType === 'user' ? 'user' : jeep.driverName}`,
          timestamp: new Date().toISOString(),
          read: false
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('conversation_history');
        socket.off('new_message_notification');
      }
    };
  }, [socket, jeep]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load initial data
  useEffect(() => {
    if (jeep) {
      loadReviews();
      loadNotifications();
    }
  }, [jeep]);

  const loadReviews = async () => {
    const savedReviews = localStorage.getItem(`jeep_reviews_${jeep.id}`);
    if (savedReviews) {
      setReviews(JSON.parse(savedReviews));
    }
  };

  const loadNotifications = async () => {
    const savedNotifications = localStorage.getItem('user_notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  };

  const addNotification = (notification) => {
    const updatedNotifications = [notification, ...notifications];
    setNotifications(updatedNotifications);
    localStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));
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

  // Send message function
  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected || !jeep) return;

    const messageData = {
      userId: userId,
      driverId: jeep.id,
      message: newMessage,
      senderType: 'user',
      userName: userName,
      driverName: jeep.driverName
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Review functions
  const submitReview = () => {
    if (userReview.rating === 0 || !userReview.message.trim()) return;

    const review = {
      id: Date.now(),
      userId: userId,
      userName: userName,
      rating: userReview.rating,
      message: userReview.message,
      timestamp: new Date().toISOString(),
      jeepId: jeep.id
    };

    const updatedReviews = [...reviews, review];
    setReviews(updatedReviews);
    localStorage.setItem(`jeep_reviews_${jeep.id}`, JSON.stringify(updatedReviews));
    
    addNotification({
      id: Date.now(),
      type: 'review',
      message: `You submitted a ${userReview.rating}-star review for ${jeep.driverName}`,
      timestamp: new Date().toISOString(),
      read: false
    });

    setUserReview({ rating: 0, message: '' });
    setShowReviewModal(false);
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

  const isDateAvailable = (date) => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return false;
    const dateString = date.toISOString().split('T')[0];
    return jeep.availableDates.includes(dateString);
  };

  const isDateBooked = (date) => {
    const bookedDates = JSON.parse(localStorage.getItem('booked_dates') || '{}');
    const dateString = date.toISOString().split('T')[0];
    return bookedDates[dateString] && bookedDates[dateString].includes(jeep.id);
  };

  const bookDate = (date) => {
    if (isDateInPast(date) || !isDateAvailable(date) || isDateBooked(date)) return;

    const dateString = date.toISOString().split('T')[0];
    const bookedDates = JSON.parse(localStorage.getItem('booked_dates') || '{}');
    
    if (!bookedDates[dateString]) {
      bookedDates[dateString] = [];
    }
    
    if (!bookedDates[dateString].includes(jeep.id)) {
      bookedDates[dateString].push(jeep.id);
      localStorage.setItem('booked_dates', JSON.stringify(bookedDates));
      
      addNotification({
        id: Date.now(),
        type: 'booking',
        message: `Booking confirmed for ${jeep.driverName} on ${dateString}`,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      setCurrentMonth(new Date(currentMonth));
    }
  };

  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-6"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isAvailable = isDateAvailable(date);
      const isBooked = isDateBooked(date);
      const isPast = isDateInPast(date);

      days.push(
        <button
          key={day}
          onClick={() => bookDate(date)}
          disabled={!isAvailable || isBooked || isPast}
          className={`h-6 rounded text-xs flex items-center justify-center font-medium transition-all ${
            isBooked
              ? 'bg-red-500 text-white cursor-not-allowed'
              : isAvailable && !isPast
              ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
              : isPast
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Get next available dates
  const getNextAvailableDates = () => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return jeep.availableDates
      .map(dateString => new Date(dateString))
      .filter(date => date >= today && !isDateBooked(date))
      .sort((a, b) => a - b)
      .slice(0, 3)
      .map(date => date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }));
  };

  const nextAvailableDates = getNextAvailableDates();

  // Get available dates count
  const getAvailableDatesCount = () => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return jeep.availableDates
      .map(dateString => new Date(dateString))
      .filter(date => date >= today && !isDateBooked(date))
      .length;
  };

  const availableDatesCount = getAvailableDatesCount();

  // Mark notification as read
  const markNotificationAsRead = (id) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));
  };

  // Calculate average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return jeep.rating || 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const averageRating = calculateAverageRating();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
      {/* Notifications Bell */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all"
        >
          <Bell className="h-6 w-6 text-gray-600" />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 top-14 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">Notifications</h3>
            </div>
            <div className="p-2">
              {notifications.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <p className="text-sm text-gray-700">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/driver')}
              className="group flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-all duration-300 p-2 rounded-xl hover:bg-white/50"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium text-sm">Back to Drivers</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{userName}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">Premium Driver</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-7xl mx-auto">
          
          {/* Left Column - Profile Information */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm overflow-hidden">
              <div className="relative h-48 bg-gradient-to-br from-amber-400 to-orange-500">
                {jeep.imageUrl || jeep.profilePicture ? (
                  <>
                    <img
                      src={jeep.imageUrl || jeep.profilePicture}
                      alt={jeep.driverName || jeep.fullName}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      onLoad={() => setImageLoaded(true)}
                    />
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse"></div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">🚙</span>
                      </div>
                      <p className="text-sm font-medium">No Photo Available</p>
                    </div>
                  </div>
                )}
                
                {/* Experience Badge */}
                {(jeep.experience > 0 || jeep.experienceYears > 0) && (
                  <div className="absolute top-3 right-3 bg-white/90 text-amber-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    ⭐ {(jeep.experience || jeep.experienceYears)}+ years
                  </div>
                )}

                {/* Rating Overlay */}
                <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-xl">
                  <div className="flex items-center gap-1">
                    <div className="flex text-amber-300 text-xs">
                      {'★'.repeat(Math.floor(averageRating))}
                      {'☆'.repeat(5 - Math.floor(averageRating))}
                    </div>
                    <span className="text-xs font-medium">
                      ({averageRating > 0 ? averageRating.toFixed(1) : 'New'})
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-slate-800 mb-2">{jeep.driverName || jeep.fullName}</h1>
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm font-medium">{jeep.location}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center mb-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-600">
                    {jeep.pricePerDay > 0 ? (
                      <>LKR {formatPrice(jeep.pricePerDay)}<span className="text-xs font-normal text-emerald-500">/day</span></>
                    ) : (
                      <span className="text-sm text-slate-500">Contact for price</span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">All inclusive • No hidden fees</p>
                </div>

                {/* Service Type */}
                <div className="text-center mb-4">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm inline-block">
                    {jeep.vehicleType || jeep.serviceType || 'Safari Jeep'}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                    <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-blue-700">6-8 Seats</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                    <Clock className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-purple-700">Flexible</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                    <Shield className="h-4 w-4 text-green-500 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-green-700">Verified</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Dates Calendar */}
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-white/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Available Dates
                </h3>
                {availableDatesCount > 0 && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {availableDatesCount} dates available
                  </span>
                )}
              </div>
              
              {/* Quick Available Dates */}
              {nextAvailableDates.length > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-600 font-medium">Next available dates:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextAvailableDates.map((date, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm font-medium border border-green-200"
                      >
                        {date}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  No upcoming availability dates scheduled
                </div>
              )}

              {/* Mini Calendar */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-1 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-1 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    ›
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-2 font-medium">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-center py-1">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>

                {/* Calendar Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span className="text-xs text-gray-600">Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Availability Note */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  💡 Click on green dates to book instantly
                </p>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-white/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-amber-500" />
                  Customer Reviews
                </h3>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                >
                  Add Review
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex text-amber-400">
                          {'★'.repeat(review.rating)}
                          {'☆'.repeat(5 - review.rating)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(review.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.message}</p>
                      <p className="text-xs text-gray-500 mt-1">- {review.userName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details & Actions */}
          <div className="xl:col-span-7 flex flex-col gap-4">
            {/* Action Buttons - Top Right */}
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-white/20 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setShowChat(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Chat</span>
                </button>
                
                <button
                  onClick={() => window.open(`tel:${jeep.contactPhone}`, '_self')}
                  disabled={!jeep.contactPhone || jeep.contactPhone === 'Not provided'}
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Phone className="h-5 w-5" />
                  <span className="text-sm font-medium">Call Now</span>
                </button>

                <button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <Calendar className="h-5 w-5" />
                  <span className="text-sm font-medium">Book Now</span>
                </button>
              </div>
            </div>

            {/* Main Details Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-white/20 backdrop-blur-sm">
              {/* Availability Status */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  availableDatesCount > 0 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {availableDatesCount > 0 
                      ? `Available for Booking (${availableDatesCount} dates)` 
                      : 'Check Availability'
                    }
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  About This Service
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {jeep.description || `Professional ${jeep.serviceType || 'safari jeep'} service with ${jeep.experience || jeep.experienceYears || 'several'} years of experience. Specializing in wildlife safaris and tourist transportation across Sri Lanka's most beautiful national parks and nature reserves.`}
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Destinations */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    Destinations Covered
                  </h3>
                  <div className="space-y-2">
                    {(jeep.destinations && jeep.destinations.length > 0) ? (
                      jeep.destinations.slice(0, 4).map((destination, index) => (
                        <div key={index} className="flex items-center gap-2 text-slate-600 text-sm">
                          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                          <span>{destination}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-sm">Various safari destinations across Sri Lanka</div>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Languages Spoken
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(jeep.languages && jeep.languages.length > 0) ? (
                      jeep.languages.map((language, index) => (
                        <span
                          key={index}
                          className="bg-white px-3 py-1 rounded-full text-sm font-medium text-slate-700 border border-slate-200"
                        >
                          {language}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">English, Sinhala</span>
                    )}
                  </div>
                </div>

                {/* Special Skills */}
                {jeep.specialSkills && jeep.specialSkills.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 md:col-span-2">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-emerald-500" />
                      Special Services & Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {jeep.specialSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="bg-white px-3 py-1 rounded-full text-sm font-medium text-slate-700 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Certifications & Safety */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-5 border border-slate-200 mb-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Safety & Certifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jeep.certifications && jeep.certifications.length > 0 ? (
                    jeep.certifications.map((cert, index) => (
                      <div key={index} className="flex items-center gap-3 bg-white/80 rounded-lg p-3 border border-white">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 text-sm font-medium">{cert}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3 border border-white">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 text-sm font-medium">Licensed Safari Driver</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3 border border-white">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 text-sm font-medium">First Aid Certified</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Phone & Email */}
                <div className="space-y-4">
                  <button
                    onClick={() => window.open(`tel:${jeep.contactPhone}`, '_self')}
                    disabled={!jeep.contactPhone || jeep.contactPhone === 'Not provided'}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-800 text-sm">Phone Number</div>
                      <div className="text-slate-600 text-sm">
                        {jeep.contactPhone && jeep.contactPhone !== 'Not provided' ? jeep.contactPhone : 'Not available'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => window.open(`mailto:${jeep.contactEmail}`, '_self')}
                    disabled={!jeep.contactEmail}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all duration-300 disabled:opacity-50"
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-800 text-sm">Email Address</div>
                      <div className="text-slate-600 text-sm">
                        {jeep.contactEmail || 'Not available'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">Base Location</div>
                    <div className="text-slate-600 text-sm">{jeep.location}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {jeep.driverName?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{jeep.driverName}</h3>
                  <p className="text-xs text-gray-500">
                    {isConnected ? 'Online' : 'Connecting...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.senderType === 'user'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-2 rounded-full hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Add Your Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex gap-1 star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setUserReview(prev => ({ ...prev, rating: star }))}
                    className="text-2xl focus:outline-none"
                  >
                    {star <= userReview.rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Review Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={userReview.message}
                onChange={(e) => setUserReview(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Share your experience with this driver..."
                rows="4"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submitReview}
              disabled={userReview.rating === 0 || !userReview.message.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
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