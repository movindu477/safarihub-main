import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Star, Calendar, Clock, Users, Shield, Award, Globe, Sparkles, Check } from 'lucide-react';

const JeepProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeep } = location.state || {};
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  if (!jeep) {
    navigate('/driver');
    return null;
  }

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  const handleWhatsAppClick = () => {
    if (jeep.contactPhone && jeep.contactPhone !== 'Not provided') {
      let phoneNumber = jeep.contactPhone.replace(/[^\d+]/g, '');
      if (phoneNumber.startsWith('94')) {
        phoneNumber = `+${phoneNumber}`;
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = `+94${phoneNumber.substring(1)}`;
      } else if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+94${phoneNumber}`;
      }
      
      const message = `Hello ${jeep.driverName || jeep.fullName || 'there'}! I found your profile on SafariHub and I'm interested in booking your ${jeep.serviceType || 'safari jeep'} service. Could you please provide more details about availability and pricing?`;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCallClick = () => {
    if (jeep.contactPhone && jeep.contactPhone !== 'Not provided') {
      let phoneNumber = jeep.contactPhone.replace(/[^\d+]/g, '');
      const telNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      window.open(`tel:${telNumber}`, '_self');
    }
  };

  const handleEmailClick = () => {
    if (jeep.contactEmail) {
      const subject = `Safari Jeep Booking Inquiry - ${jeep.driverName || jeep.fullName}`;
      const body = `Hello ${jeep.driverName || jeep.fullName},\n\nI'm interested in booking your ${jeep.serviceType || 'safari jeep'} service. Could you please provide more information about availability and pricing?\n\nThank you!`;
      window.open(`mailto:${jeep.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    }
  };

  const isValidPhoneForWhatsApp = () => {
    if (!jeep.contactPhone || jeep.contactPhone === 'Not provided') return false;
    const phoneNumber = jeep.contactPhone.replace(/[^\d+]/g, '');
    return phoneNumber.length >= 9;
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

  // Check if date is available (from driver's availableDates array)
  const isDateAvailable = (date) => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return false;
    
    // Convert the date to the same format as stored in availableDates (YYYY-MM-DD)
    const dateString = date.toISOString().split('T')[0];
    
    // Check if this date exists in the driver's availableDates array
    return jeep.availableDates.includes(dateString);
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

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-6"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isAvailable = isDateAvailable(date);
      const isPast = isDateInPast(date);

      days.push(
        <div
          key={day}
          className={`h-6 rounded text-xs flex items-center justify-center font-medium ${
            isAvailable
              ? 'bg-green-500 text-white'
              : isPast
              ? 'text-gray-300'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  // Get next available dates for quick view
  const getNextAvailableDates = () => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return jeep.availableDates
      .map(dateString => new Date(dateString))
      .filter(date => date >= today)
      .sort((a, b) => a - b)
      .slice(0, 3)
      .map(date => date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }));
  };

  const nextAvailableDates = getNextAvailableDates();

  // Get total available dates count
  const getAvailableDatesCount = () => {
    if (!jeep.availableDates || jeep.availableDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return jeep.availableDates
      .map(dateString => new Date(dateString))
      .filter(date => date >= today)
      .length;
  };

  const availableDatesCount = getAvailableDatesCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50">
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
            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">Premium Driver</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 max-w-7xl mx-auto h-[calc(100vh-80px)]">
          
          {/* Left Column - Profile Information */}
          <div className="xl:col-span-5 flex flex-col gap-4 h-full">
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
                      {'★'.repeat(Math.floor(jeep.rating || 0))}
                    </div>
                    <span className="text-xs font-medium">
                      ({jeep.rating > 0 ? jeep.rating.toFixed(1) : 'New'})
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
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-white/20 backdrop-blur-sm flex-1 overflow-y-auto">
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
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span className="text-xs text-gray-600">Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Availability Note */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  💡 Green dates show when this driver is available for bookings
                </p>
              </div>

              {/* Debug Info (remove in production) */}
              {process.env.NODE_ENV === 'development' && jeep.availableDates && (
                <div className="mt-3 p-2 bg-gray-100 rounded border border-gray-300">
                  <p className="text-xs text-gray-600">
                    <strong>Debug:</strong> {jeep.availableDates.length} dates stored
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    Sample: {jeep.availableDates.slice(0, 3).join(', ')}...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Details & Actions */}
          <div className="xl:col-span-7 flex flex-col gap-4 h-full">
            {/* Action Buttons - Top Right */}
            <div className="bg-white rounded-2xl shadow-xl p-5 border border-white/20 backdrop-blur-sm">
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={handleWhatsAppClick}
                  disabled={!isValidPhoneForWhatsApp()}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span className="text-xl">💬</span>
                  <span className="text-sm font-medium">WhatsApp</span>
                </button>
                
                <button
                  onClick={handleCallClick}
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
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-white/20 backdrop-blur-sm flex-1 overflow-y-auto">
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
                    onClick={handleCallClick}
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
                    onClick={handleEmailClick}
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
    </div>
  );
};

export default JeepProfile;