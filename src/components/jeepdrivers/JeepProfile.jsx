import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../App";
import { 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Clock, 
  Shield, 
  Award, 
  Languages, 
  Calendar,
  MessageCircle,
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Bell,
  X,
  User,
  Car,
  DollarSign,
  Calendar as CalendarIcon,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Flag,
  AlertCircle,
  CheckCircle,
  Navigation,
  Package,
  UserCircle,
  Globe,
  FileText
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
// Use auth from App.jsx instead of creating new instance

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";

// Import Chat component
import Chat from "../Chat";

// Import Firebase functions from App
import { 
  // createOrGetConversation, // Removed - using Chat component instead
  // sendMessage, // Removed - using Chat component instead
  // getMessages, // Removed - using Chat component instead
  // markMessagesAsRead, // Removed - using Chat component instead
  createNotification,
  getUserNotifications,
  // getConversationById, // Removed - using Chat component instead
  // getOtherParticipant, // Removed - using Chat component instead
  markNotificationAsRead,
  GlobalNotificationBell,
} from "../../App";

// Calendar Component for Date Selection
const DatePickerCalendar = ({ selectedDates, onDateSelect, selectedDatesWithType, onDateTypeChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Add empty cells for days before the first day of the month
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDatePast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date) => {
    if (!date || isDatePast(date)) return;
    onDateSelect(date);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-full"
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button 
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-full"
        >
          <ArrowLeft size={16} className="rotate-180" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-8"></div>;
          }
          
          const selected = isDateSelected(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = isDatePast(day);
          
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              disabled={isPast}
              className={`
                h-8 text-sm rounded-lg
                ${selected 
                  ? 'bg-emerald-600 text-white font-medium shadow-lg' 
                  : isPast
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isToday
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 font-semibold'
                      : 'bg-gray-50 text-gray-700'
                }
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {selectedDates.length > 0 && (
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200">
          <h4 className="font-bold text-emerald-800 mb-3">Selected Dates:</h4>
          <div className="space-y-2">
            {selectedDates.map((date, index) => {
              const dateString = date.toDateString();
              const dateType = selectedDatesWithType?.[dateString] || 'full-day';
              return (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">
                      {date.toLocaleDateString()}
                    </span>
                    <span className="ml-2 text-xs text-emerald-600 font-semibold">
                      ({dateType === 'half-day' ? 'Half Day' : 'Full Day'})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDateTypeChange) onDateTypeChange(dateString, 'half-day');
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${dateType === 'half-day'
                          ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Half Day
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDateTypeChange) onDateTypeChange(dateString, 'full-day');
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${dateType === 'full-day'
                          ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Full Day
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Booking Form Modal Component
const BookingFormModal = ({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  formErrors, 
  setFormErrors,
  currentStep, 
  setCurrentStep,
  onSubmit,
  driver,
  selectedDates,
  selectedDatesWithType,
  onDateTypeChange
}) => {
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
      // Clear errors when moving to next step
      setFormErrors({});
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Clear errors when moving to previous step
      setFormErrors({});
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = () => {
    const errors = {};
    
    if (currentStep === 1) {
      if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
      if (!formData.email.trim()) errors.email = 'Email is required';
      if (!formData.phone.trim()) errors.phone = 'Phone number is required';
      if (!formData.country.trim()) errors.country = 'Country is required';
      if (!formData.numberOfPassengers || formData.numberOfPassengers < 1) {
        errors.numberOfPassengers = 'Number of passengers must be at least 1';
      }
    } else if (currentStep === 2) {
      if (!formData.nationalPark.trim()) errors.nationalPark = 'National park is required';
      if (!formData.safariType) errors.safariType = 'Safari type is required';
    } else if (currentStep === 3) {
      if (formData.needsHotelPickup) {
        if (!formData.hotelName.trim()) errors.hotelName = 'Hotel name is required';
        if (!formData.hotelAddress.trim()) errors.hotelAddress = 'Hotel address is required';
      } else {
      if (!formData.pickupLocation.trim()) errors.pickupLocation = 'Pickup location is required';
      if (!formData.dropoffLocation.trim()) errors.dropoffLocation = 'Drop-off location is required';
      }
    } else if (currentStep === 6) {
      if (!formData.emergencyContactName.trim()) errors.emergencyContactName = 'Emergency contact name is required';
      if (!formData.emergencyContactPhone.trim()) errors.emergencyContactPhone = 'Emergency contact phone is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-4xl w-full my-2 sm:my-8 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-t-lg sm:rounded-t-2xl p-3 sm:p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold truncate">Booking Details</h1>
                <p className="text-emerald-100 text-xs sm:text-sm hidden sm:block">Complete your booking information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg cursor-pointer flex-shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-start justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-start flex-shrink-0" style={{ width: 'calc(16.666% - 8px)' }}>
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-emerald-500 border-emerald-500 text-white' :
                      isCompleted ? 'bg-emerald-100 border-emerald-500 text-emerald-600' :
                      'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${isActive ? 'text-emerald-600' : 'text-gray-500'
                    }`}>
                      <span className="hidden sm:inline">{step.title}</span>
                      <span className="sm:hidden">{step.shortTitle}</span>
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block h-0.5 w-full mx-1 sm:mx-2 -mt-4 sm:-mt-6 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content - I'll use the same form fields from Payment.jsx but in a more compact modal format */}
        <div className="p-4 sm:p-6">
          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                Personal Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
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
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
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
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      updateFormData('phone', value);
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
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
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                    placeholder="e.g., United States"
                  />
                  {formErrors.country && <p className="text-red-500 text-xs mt-1">{formErrors.country}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Passengers <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="numberOfPassengers"
                    id="numberOfPassengers"
                    min="1"
                    max="20"
                    value={formData.numberOfPassengers}
                    onChange={(e) => updateFormData('numberOfPassengers', parseInt(e.target.value) || 1)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.numberOfPassengers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    rows="3"
                    placeholder="Any special requirements"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Safari Booking Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                Safari Booking Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National Park <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="nationalPark"
                    id="nationalPark"
                    value={formData.nationalPark}
                    onChange={(e) => updateFormData('nationalPark', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 ${formErrors.nationalPark ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                    disabled={!!(driver?.destinations && driver.destinations.length > 0)}
                  >
                    <option value={formData.nationalPark}>{formData.nationalPark || 'Select National Park'}</option>
                  </select>
                  {formErrors.nationalPark && <p className="text-red-500 text-xs mt-1">{formErrors.nationalPark}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Safari Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="safariType"
                    id="safariType"
                    value={formData.safariType}
                    onChange={(e) => updateFormData('safariType', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.safariType ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  >
                    <option value="Morning Safari">Morning Safari</option>
                    <option value="Evening Safari">Evening Safari</option>
                    <option value="Full-day Safari">Full-day Safari</option>
                  </select>
                  {formErrors.safariType && <p className="text-red-500 text-xs mt-1">{formErrors.safariType}</p>}
                </div>
              </div>

              {/* Selected Dates with Half Day/Full Day */}
              {selectedDates.length > 0 && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Selected Dates & Type:</h3>
                  <div className="space-y-2">
                    {selectedDates.map((date, index) => {
                      const dateString = date.toDateString();
                      const dateType = selectedDatesWithType[dateString] || 'full-day';
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200">
                          <span className="text-sm font-medium text-gray-700">
                {date.toLocaleDateString()}
              </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDateTypeChange) onDateTypeChange(dateString, 'half-day');
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-medium ${dateType === 'half-day'
                                  ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Half Day
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDateTypeChange) onDateTypeChange(dateString, 'full-day');
                              }}
                              className={`px-3 py-1 rounded-md text-xs font-medium ${dateType === 'full-day'
                                  ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Full Day
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pickup & Drop-off - Similar structure, abbreviated for space */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Navigation className="h-5 w-5 text-emerald-500" />
                Pickup & Drop-off Information
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needsHotelPickup}
                    onChange={(e) => updateFormData('needsHotelPickup', e.target.checked)}
                    className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Do you need hotel pickup?</span>
                </label>
                {formData.needsHotelPickup && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hotel Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="hotelName"
                        id="hotelName"
                        value={formData.hotelName}
                        onChange={(e) => updateFormData('hotelName', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                      />
                      {formErrors.hotelName && <p className="text-red-500 text-xs mt-1">{formErrors.hotelName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hotel Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="hotelAddress"
                        id="hotelAddress"
                        value={formData.hotelAddress}
                        onChange={(e) => updateFormData('hotelAddress', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                        }`}
                      />
                      {formErrors.hotelAddress && <p className="text-red-500 text-xs mt-1">{formErrors.hotelAddress}</p>}
                    </div>
                  </div>
                )}
                {!formData.needsHotelPickup && (
                  <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                        name="pickupLocation"
                        id="pickupLocation"
                    value={formData.pickupLocation}
                    onChange={(e) => updateFormData('pickupLocation', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.pickupLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {formErrors.pickupLocation && <p className="text-red-500 text-xs mt-1">{formErrors.pickupLocation}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                        name="dropoffLocation"
                        id="dropoffLocation"
                    value={formData.dropoffLocation}
                    onChange={(e) => updateFormData('dropoffLocation', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.dropoffLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {formErrors.dropoffLocation && <p className="text-red-500 text-xs mt-1">{formErrors.dropoffLocation}</p>}
                </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Vehicle & Driver Preferences - Abbreviated */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-emerald-500" />
                Vehicle & Driver Preferences
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jeep Type</label>
                  <select
                    value={formData.jeepType}
                    onChange={(e) => updateFormData('jeepType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled
                  >
                    <option value={formData.jeepType}>{formData.jeepType}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driver Language</label>
                  <select
                    value={formData.driverLanguage}
                    onChange={(e) => updateFormData('driverLanguage', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="English">English</option>
                    <option value="Sinhala">Sinhala</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.needsNaturalist}
                      onChange={(e) => updateFormData('needsNaturalist', e.target.checked)}
                      className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Request for a naturalist/guide with the jeep (optional)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Additional Requests - Abbreviated */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Additional Requests / Add-Ons
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'needsBinoculars', label: 'Binoculars' },
                  { key: 'needsCamera', label: 'Camera Hire' },
                  { key: 'needsChildSeat', label: 'Child Seat' },
                  { key: 'needsWater', label: 'Water Bottles' },
                  { key: 'needsSnacks', label: 'Snacks / Meals' },
                  { key: 'needsPhotographyPackage', label: 'Photography Package' },
                  { key: 'parkEntranceIncluded', label: 'Park Entrance Tickets' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg">
                    <input
                      type="checkbox"
                      checked={formData[key]}
                      onChange={(e) => updateFormData(key, e.target.checked)}
                      className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
            ))}
          </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => updateFormData('passportNumber', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Park Ticket Proof (Optional)</label>
                  <input
                    type="text"
                    value={formData.parkTicketProof}
                    onChange={(e) => updateFormData('parkTicketProof', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
        </div>
      )}

          {/* Step 6: Emergency Contact */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-500" />
                Emergency Contact
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => updateFormData('emergencyContactName', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.emergencyContactName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {formErrors.emergencyContactName && <p className="text-red-500 text-xs mt-1">{formErrors.emergencyContactName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="emergencyContactPhone"
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      updateFormData('emergencyContactPhone', value);
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.emergencyContactPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {formErrors.emergencyContactPhone && <p className="text-red-500 text-xs mt-1">{formErrors.emergencyContactPhone}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-between items-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
          >
            Previous
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={() => {
                if (validateStep()) {
                  handleNext();
                }
              }}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-emerald-500 text-white rounded-lg font-medium flex-1 sm:flex-none"
            >
              Next
            </button>
          ) : (
            <button
              onClick={async (e) => {
    e.preventDefault();
                e.stopPropagation();
                console.log('🔵 Confirm Booking button clicked');
                if (validateStep()) {
                  console.log('✅ Step validation passed, calling onSubmit');
                  try {
                    await onSubmit();
    } catch (error) {
                    console.error('❌ Error in onSubmit:', error);
                    alert('An error occurred. Please try again.');
                  }
                } else {
                  console.warn('⚠️ Step validation failed');
                }
              }}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-emerald-500 text-white rounded-lg font-medium flex-1 sm:flex-none hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Confirm Booking
          </button>
                      )}
                    </div>
      </div>
    </div>
  );
};

// Old ChatModal component removed - using Chat component instead

const JeepProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeepId } = useParams(); // Get jeepId from URL parameter
  // const messagesEndRef = useRef(null); // Removed - using Chat component instead
  
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  // Old chat state removed - using Chat component instead
  // const [message, setMessage] = useState("");
  // const [messages, setMessages] = useState([]);
  // const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  // const [conversationId, setConversationId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedDatesWithType, setSelectedDatesWithType] = useState({}); // {dateString: 'half-day' | 'full-day'}
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [bookingFormData, setBookingFormData] = useState({
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
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const driverId = jeepId || searchParams.get('driverId'); // Use jeepId from URL params, fallback to query params
  const openChat = searchParams.get('openChat');

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, driverId]);

  // Also handle popstate (back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }, 0);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Reset state when driverId changes (navigating to different driver or going back)
  useEffect(() => {
    // Reset component state when driverId changes or is cleared
    setError("");
    setActiveTab("overview");
    // setMessage("");
    // setMessages([]);
    // setConversationId(null);
    setSelectedDates([]);
    setIsChatModalOpen(false);
    setChatConversationId(null);
    setChatOtherUser(null);
  }, [driverId]);

  // Old scrollToBottom and messages useEffect removed - using Chat component instead

  // Handle opening chat from URL parameter
  useEffect(() => {
    if (openChat === 'true' && driverId && currentUser && driver) {
      setActiveTab('chat');
      // Open chat modal instead of initializing old conversation
      setChatOtherUser({
        id: driver.id,
        name: driver.fullName || 'Driver',
        photo: driver.profilePicture || driver.imageUrl || '',
        role: 'driver'
      });
      setIsChatModalOpen(true);
    }
  }, [openChat, driverId, currentUser, driver]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(selectedDate => 
        selectedDate.toDateString() === date.toDateString()
      );
      
      if (isSelected) {
        // Remove date and its type
        const newTypes = { ...selectedDatesWithType };
        delete newTypes[date.toDateString()];
        setSelectedDatesWithType(newTypes);
        return prev.filter(selectedDate => 
          selectedDate.toDateString() !== date.toDateString()
        );
      } else {
        // Add date with default 'full-day'
        setSelectedDatesWithType(prev => ({
          ...prev,
          [date.toDateString()]: 'full-day'
        }));
        return [...prev, date].sort((a, b) => a - b);
      }
    });
  };

  const handleDateTypeChange = (dateString, type) => {
    setSelectedDatesWithType(prev => ({
      ...prev,
      [dateString]: type
    }));
  };

  // Calculate total price based on selected dates and their types (half-day vs full-day)
  const calculateTotalPrice = () => {
    if (!driver || selectedDates.length === 0) return 0;
    const dailyPrice = driver.pricePerDay || 0;
    let total = 0;
    selectedDates.forEach(date => {
      const dateString = date.toDateString();
      const dateType = selectedDatesWithType[dateString] || 'full-day';
      total += dateType === 'half-day' ? dailyPrice * 0.6 : dailyPrice;
    });
    return total;
  };

  // Validate booking form and return errors with step mapping
  const validateBookingForm = () => {
    const errors = {};
    
    // Helper function to safely trim strings
    const safeTrim = (value) => {
      return value && typeof value === 'string' ? value.trim() : '';
    };

    // Step 1: Personal Details
    if (!safeTrim(bookingFormData.fullName)) errors.fullName = 'Full name is required';
    if (!safeTrim(bookingFormData.email)) errors.email = 'Email is required';
    if (!safeTrim(bookingFormData.phone)) errors.phone = 'Phone number is required';
    if (!safeTrim(bookingFormData.country)) errors.country = 'Country is required';
    if (!bookingFormData.numberOfPassengers || bookingFormData.numberOfPassengers < 1) {
      errors.numberOfPassengers = 'Number of passengers must be at least 1';
    }

    // Step 2: Safari Details
    if (!safeTrim(bookingFormData.nationalPark)) errors.nationalPark = 'National park is required';
    if (!bookingFormData.safariType) errors.safariType = 'Safari type is required';

    // Step 3: Pickup & Drop-off
    if (bookingFormData.needsHotelPickup) {
      if (!safeTrim(bookingFormData.hotelName)) errors.hotelName = 'Hotel name is required';
      if (!safeTrim(bookingFormData.hotelAddress)) errors.hotelAddress = 'Hotel address is required';
    } else {
      if (!safeTrim(bookingFormData.pickupLocation)) errors.pickupLocation = 'Pickup location is required';
      if (!safeTrim(bookingFormData.dropoffLocation)) errors.dropoffLocation = 'Drop-off location is required';
    }

    // Step 6: Emergency Contact
    if (!safeTrim(bookingFormData.emergencyContactName)) errors.emergencyContactName = 'Emergency contact name is required';
    if (!safeTrim(bookingFormData.emergencyContactPhone)) errors.emergencyContactPhone = 'Emergency contact phone is required';
    
    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Map field names to their step numbers
  const getStepForField = (fieldName) => {
    const stepMap = {
      fullName: 1, email: 1, phone: 1, country: 1, numberOfPassengers: 1,
      nationalPark: 2, safariType: 2,
      hotelName: 3, hotelAddress: 3, pickupLocation: 3, dropoffLocation: 3,
      emergencyContactName: 6, emergencyContactPhone: 6
    };
    return stepMap[fieldName] || 1;
  };

  const handleBookingFormSubmit = async () => {
    console.log('🔵 handleBookingFormSubmit called');

    // Validate the entire form (step validation is already done in the button click handler)
    const validation = validateBookingForm();
    if (!validation.isValid) {
      console.warn('⚠️ Full form validation failed', validation.errors);

      // Find the first error and navigate to that step
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        const targetStep = getStepForField(firstErrorField);
        setCurrentStep(targetStep);

        // Scroll to the error field after a brief delay
        setTimeout(() => {
          // Try multiple selectors to find the error field
          const selectors = [
            `[name="${firstErrorField}"]`,
            `#${firstErrorField}`,
            `input[id*="${firstErrorField}"]`,
            `textarea[id*="${firstErrorField}"]`,
            `select[id*="${firstErrorField}"]`
          ];

          let errorElement = null;
          for (const selector of selectors) {
            errorElement = document.querySelector(selector);
            if (errorElement) break;
          }

          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              errorElement.focus();
              // Highlight the field
              errorElement.style.border = '2px solid red';
              setTimeout(() => {
                errorElement.style.border = '';
              }, 2000);
            }, 100);
          }
        }, 300);

        // Show which field is missing
        const fieldLabel = firstErrorField.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        alert(`Please fill in: ${fieldLabel}\n\nNavigating to the required field...`);
      } else {
      alert('Please fill in all required fields correctly.');
      }
      return;
    }

    console.log('✅ Validation passed, proceeding with booking...');

    // Don't close the form immediately - let handleBooking handle it after success
    // This ensures the success message shows properly
    try {
      await handleBooking();
    } catch (error) {
      console.error('❌ Error in handleBooking:', error);
      alert('An error occurred while processing your booking. Please try again.');
    }
  };

  const handleBooking = async () => {
    // Prevent double-clicks
    if (isBooking) {
      console.warn('⚠️ Booking already in progress, ignoring click');
      return;
    }
    
    console.log('🔵 handleBooking called');
    console.log('🔵 Current state:', {
      selectedDates: selectedDates.length,
      currentUser: !!currentUser,
      driver: !!driver,
      driverId: driver?.id,
      isBooking: isBooking
    });
    
    if (selectedDates.length === 0) {
      console.warn('⚠️ No dates selected');
      alert('Please select at least one date for your booking. Go back to the "Book Now" tab to select dates.');
      setIsBooking(false);
      return;
    }
    
    if (!currentUser) {
      console.warn('⚠️ No current user');
      alert('Please login to make a booking.');
      return;
    }
    
    if (!driver) {
      console.warn('⚠️ No driver data');
      alert('Driver information not available.');
      return;
    }
      
      // Verify driver has a valid ID
      if (!driver.id) {
        console.error('❌ Driver ID is missing:', driver);
        alert('Driver information is incomplete. Please try again.');
        return;
      }
      
    console.log('✅ All pre-checks passed, starting booking process...');
    setIsBooking(true);
    
    try {
      // Get the authenticated user directly from Firebase Auth
      // This ensures we have the most up-to-date auth state
      const authUser = auth.currentUser;
      
      console.log('🔐 Auth check:', {
        authUser: !!authUser,
        authUserUid: authUser?.uid,
        authUserEmail: authUser?.email,
        currentUser: !!currentUser,
        currentUserUid: currentUser?.uid
      });
      
      if (!authUser) {
        console.error('❌ No authenticated user found');
        alert('Please login to make a booking. No authenticated user found.');
        return;
      }
      
      // Verify we have a valid user ID
      if (!authUser.uid) {
        console.error('❌ No user ID found in auth user');
        alert('Authentication error. Please try logging in again.');
        return;
      }
      
      // Verify user is logged in as tourist (optional check, but helpful for debugging)
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', authUser.uid));
        if (!touristDoc.exists()) {
          console.warn('⚠️ User is not in tourists collection. They might be a provider.');
        } else {
          console.log('✅ User confirmed as tourist');
        }
      } catch (roleCheckError) {
        console.warn('⚠️ Could not verify user role:', roleCheckError);
      }
      
      // Calculate total price based on half-day/full-day
      let totalPrice = 0;
      selectedDates.forEach(date => {
        const dateString = date.toDateString();
        const dateType = selectedDatesWithType[dateString] || 'full-day';
        const dailyPrice = driver.pricePerDay || 0;
        totalPrice += dateType === 'half-day' ? dailyPrice * 0.6 : dailyPrice;
      });
      
      const datesString = selectedDates.map(d => {
        const dateType = selectedDatesWithType[d.toDateString()] || 'full-day';
        return `${d.toLocaleDateString()} (${dateType === 'half-day' ? 'Half Day' : 'Full Day'})`;
      }).join(', ');
      
      const datesWithTypes = selectedDates.map(d => ({
        date: d.toISOString(),
        type: selectedDatesWithType[d.toDateString()] || 'full-day'
      }));
      
      // Get driver email from driver data (could be contactEmail, email, or from auth)
      const driverEmail = driver.contactEmail || driver.email || '';
      
      // Validate driver ID before proceeding
      const driverIdString = String(driver.id || '');
      if (!driverIdString || driverIdString === 'undefined' || driverIdString === 'null' || driverIdString.trim() === '') {
        console.error('❌ Invalid driver ID:', driver.id);
        alert('Invalid driver information. Please refresh the page and try again.');
        return;
      }
      
      // Create booking in Firestore with all form data
      // Ensure all fields match Firestore rules requirements exactly
      const bookingData = {
        driverId: driverIdString, // Must be a string
        driverName: driver.fullName || driver.driverName || 'Driver',
        driverEmail: driverEmail, // Store driver email in booking
        customerId: authUser.uid, // MUST match request.auth.uid
        customerName: bookingFormData.fullName || authUser.displayName || 'Customer',
        customerEmail: bookingFormData.email || authUser.email || '',
        selectedDates: selectedDates.map(d => d.toISOString()), // Must be an array
        datesWithTypes: datesWithTypes, // Array of {date, type}
        datesString: datesString,
        totalPrice: Number(totalPrice.toFixed(2)), // Must be a number
        pricePerDay: Number(driver.pricePerDay || 0),
        numberOfDays: Number(selectedDates.length),
        serviceType: driver.serviceType || 'Jeep Driver',
        status: 'pending',
        // Include all booking form data
        ...bookingFormData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Log booking data for debugging
      console.log('📝 Creating booking with data:', {
        authUid: authUser.uid,
        authUserEmail: authUser.email,
        customerId: bookingData.customerId,
        customerIdMatch: authUser.uid === bookingData.customerId,
        driverId: bookingData.driverId,
        driverIdType: typeof bookingData.driverId,
        driverIdIsString: typeof bookingData.driverId === 'string',
        driverIdLength: String(bookingData.driverId).length,
        selectedDates: bookingData.selectedDates,
        selectedDatesType: Array.isArray(bookingData.selectedDates) ? 'array' : typeof bookingData.selectedDates,
        selectedDatesIsArray: Array.isArray(bookingData.selectedDates),
        selectedDatesLength: bookingData.selectedDates.length,
        totalPrice: bookingData.totalPrice,
        totalPriceType: typeof bookingData.totalPrice,
        totalPriceIsNumber: typeof bookingData.totalPrice === 'number',
        fullBookingData: bookingData
      });
      
      // Create the booking document in Firestore 'bookings' collection
      // This is the critical operation - if this fails, the whole booking fails
      console.log('🔐 Pre-booking validation:', {
        authUserExists: !!authUser,
        authUserUid: authUser?.uid,
        authUserEmail: authUser?.email,
        customerId: bookingData.customerId,
        customerIdMatch: authUser?.uid === bookingData.customerId,
        driverId: bookingData.driverId,
        driverIdType: typeof bookingData.driverId,
        selectedDatesCount: bookingData.selectedDates.length,
        selectedDatesIsArray: Array.isArray(bookingData.selectedDates),
        totalPrice: bookingData.totalPrice,
        totalPriceType: typeof bookingData.totalPrice,
        allFieldsPresent: {
          customerId: !!bookingData.customerId,
          driverId: !!bookingData.driverId,
          selectedDates: !!bookingData.selectedDates,
          totalPrice: bookingData.totalPrice !== null && bookingData.totalPrice !== undefined
        }
      });
      
      // Double-check data types before sending
      const validatedBookingData = {
        ...bookingData,
        driverId: String(bookingData.driverId), // Ensure it's a string
        selectedDates: Array.isArray(bookingData.selectedDates) ? bookingData.selectedDates : [],
        totalPrice: Number(bookingData.totalPrice) // Ensure it's a number
      };
      
      console.log('✅ Validated booking data:', validatedBookingData);
      
      const bookingRef = collection(db, 'bookings');
      let bookingId;
      
      // Store bookingData in outer scope for error handling
      const finalBookingData = validatedBookingData;
      
      try {
        console.log('🚀 Attempting to create booking in Firestore...');
        console.log('🚀 Data being sent:', {
          customerId: finalBookingData.customerId,
          driverId: finalBookingData.driverId,
          selectedDates: finalBookingData.selectedDates,
          selectedDatesLength: finalBookingData.selectedDates.length,
          totalPrice: finalBookingData.totalPrice,
          authUid: authUser.uid,
          match: authUser.uid === finalBookingData.customerId,
          fullData: JSON.stringify(finalBookingData, null, 2)
        });
        
        // Final validation before sending
        if (authUser.uid !== finalBookingData.customerId) {
          throw new Error('Customer ID mismatch! Auth UID: ' + authUser.uid + ', Customer ID: ' + finalBookingData.customerId);
        }
        
        console.log('✅ Validation passed, creating document...');
        const bookingDoc = await addDoc(bookingRef, finalBookingData);
        bookingId = bookingDoc.id;
        
        console.log('✅ Booking created successfully with ID:', bookingId);
        console.log('📦 Booking stored in Firestore:', {
          collection: 'bookings',
          documentId: bookingId,
          customerId: finalBookingData.customerId,
          driverId: finalBookingData.driverId,
          totalPrice: finalBookingData.totalPrice,
          numberOfDays: finalBookingData.numberOfDays
        });
      } catch (bookingError) {
        console.error('❌ CRITICAL: Failed to create booking document:', bookingError);
        console.error('❌ Booking error details:', {
          code: bookingError.code,
          message: bookingError.message,
          stack: bookingError.stack,
          dataSent: {
            customerId: finalBookingData.customerId,
            driverId: finalBookingData.driverId,
            selectedDatesLength: finalBookingData.selectedDates.length,
            totalPrice: finalBookingData.totalPrice
          }
        });
        throw bookingError; // Re-throw to be caught by outer catch block
      }
      
      // Also create a confirmation record in a 'confirmations' subcollection for better tracking
      try {
        const confirmationRef = collection(db, 'confirmations');
        const confirmationData = {
          bookingId: bookingId,
          ...bookingData,
          confirmationStatus: 'pending',
          confirmedAt: serverTimestamp(),
          confirmationType: 'booking_request'
        };
        const confirmationDoc = await addDoc(confirmationRef, confirmationData);
        console.log('✅ Confirmation record created with ID:', confirmationDoc.id);
      } catch (confirmationError) {
        console.warn('⚠️ Could not create confirmation record (non-critical):', confirmationError);
        // Don't fail the booking if confirmation record fails
      }
      
      // Create comprehensive notification for driver with all booking details
      // Wrap in try-catch so notification failure doesn't break the booking
      try {
        // Create detailed message with all booking information
        const notificationMessage = `New booking from ${bookingFormData.fullName || authUser.displayName || 'Customer'}:
        
📅 Dates: ${datesString}
👥 Passengers: ${bookingFormData.numberOfPassengers}
📍 Park: ${bookingFormData.nationalPark}
🚗 Safari: ${bookingFormData.safariType}
💰 Total: LKR ${totalPrice.toLocaleString()}

📞 Contact: ${bookingFormData.phone}
📧 Email: ${bookingFormData.email}
🌍 Country: ${bookingFormData.country}

🚗 Vehicle: ${bookingFormData.jeepType}
🗣️ Language: ${bookingFormData.driverLanguage}
📍 Pickup: ${bookingFormData.pickupLocation}
📍 Drop-off: ${bookingFormData.dropoffLocation}${bookingFormData.needsHotelPickup ? `\n🏨 Hotel: ${bookingFormData.hotelName}, ${bookingFormData.hotelAddress}` : ''}

📝 Special Requests: ${bookingFormData.specialAssistance || 'None'}
🆘 Emergency Contact: ${bookingFormData.emergencyContactName} - ${bookingFormData.emergencyContactPhone}`;

        const notificationData = {
          type: 'booking',
          title: 'New Booking Request',
          message: notificationMessage,
          recipientId: driver.id, // Driver's user ID (from serviceProviders collection)
          senderId: authUser.uid, // Tourist's user ID
          senderName: bookingFormData.fullName || authUser.displayName || 'Customer', // Tourist's name
          senderEmail: bookingFormData.email || authUser.email || '', // Tourist's email
          driverEmail: driverEmail, // Driver's email stored in booking
          relatedId: bookingId,
          bookingId: bookingId,
          bookingData: {
            ...bookingFormData,
            dates: datesString, // Formatted dates string for display
            selectedDates: selectedDates.map(d => d.toISOString()), // ISO date strings
            datesWithTypes: datesWithTypes,
            numberOfDays: selectedDates.length,
            totalPrice: totalPrice,
            customerName: bookingFormData.fullName || authUser.displayName || 'Customer',
            customerEmail: bookingFormData.email || authUser.email || '',
            driverId: driver.id,
            driverName: driver.fullName || driver.driverName || 'Driver',
            driverEmail: driverEmail,
            pricePerDay: driver.pricePerDay || 0,
            status: 'pending'
          }
        };
        
        const notificationId = await createNotification(notificationData);
        console.log('✅ Notification created for driver:', {
          notificationId: notificationId,
          recipientId: driver.id,
          bookingId: bookingId
        });
      } catch (notificationError) {
        console.warn('⚠️ Could not create notification (non-critical):', notificationError);
        // Don't fail the booking if notification fails - booking is already created
      }
      
      // Show success animation with booking ID
      console.log('✅ Setting success message data:', {
        driverName: driver.fullName,
        dates: datesString,
        totalPrice: totalPrice,
        numberOfDays: selectedDates.length,
        bookingId: bookingId
      });

      setSuccessMessageData({
        driverName: driver.fullName,
        dates: datesString,
        totalPrice: totalPrice,
        numberOfDays: selectedDates.length,
        bookingId: bookingId
      });

      console.log('✅ Setting showSuccessMessage to true');

      // Close booking form first
      setShowBookingForm(false);
      setCurrentStep(1);

      // Then show success message after a brief delay to ensure form is closed
      setTimeout(() => {
      setShowSuccessMessage(true);
        console.log('✅ Success message should now be visible');
      }, 100);
      // Reset selected dates and form
      setSelectedDates([]);
      setSelectedDatesWithType({});
      setBookingFormData({
        fullName: '',
        email: '',
        phone: '',
        country: '',
        numberOfPassengers: 1,
        specialAssistance: '',
        nationalPark: '',
        safariType: 'Morning Safari',
        preferredTime: '',
        duration: '',
        pickupLocation: '',
        hotelName: '',
        hotelAddress: '',
        dropoffLocation: '',
        needsHotelPickup: true,
        jeepType: 'Standard Jeep',
        driverLanguage: 'English',
        needsNaturalist: false,
        needsBinoculars: false,
        needsCamera: false,
        needsChildSeat: false,
        needsWater: false,
        needsSnacks: false,
        needsPhotographyPackage: false,
        parkEntranceIncluded: false,
        passportNumber: '',
        parkTicketProof: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
      });
      setIsBooking(false);
      
      // Don't auto-redirect - wait for user to click "Got it!" button
      
    } catch (error) {
      setIsBooking(false);
      console.error('❌ Error creating booking:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      
      // Hide any success message that might have been shown
      setShowSuccessMessage(false);
      setSuccessMessageData(null);

      // Re-open the booking form so user can try again
      setShowBookingForm(true);
      
      let errorMessage = 'Failed to create booking. ';
      
      // Get auth user for error details
      const authUserForError = auth.currentUser;
      
      if (error.code === 'permission-denied') {
        console.error('❌ Permission denied details:', {
          authUser: authUserForError?.uid,
          authUserEmail: authUserForError?.email,
          errorCode: error.code,
          errorMessage: error.message
        });
        errorMessage = 'Unable to complete your booking request.\n\nThis may be due to:\n• Your session may have expired\n• Database permissions need to be updated\n\nPlease try:\n1. Log out and log back in\n2. Wait a few moments and try again\n\nIf the problem continues, please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Unable to connect to the server.\n\nPlease check your internet connection and try again.';
      } else if (error.code === 'failed-precondition') {
        errorMessage = 'The booking system is temporarily unavailable.\n\nPlease refresh the page and try again in a few moments.';
      } else if (error.message && !error.message.includes('localhost')) {
        // Only show error message if it doesn't contain localhost
        const cleanMessage = error.message.replace(/localhost:\d+/g, '').trim();
        if (cleanMessage) {
          errorMessage = `Booking failed: ${cleanMessage}`;
        } else {
          errorMessage = 'An unexpected error occurred while processing your booking.\n\nPlease try again. If the problem persists, please contact support.';
        }
      } else {
        errorMessage = 'An unexpected error occurred while processing your booking.\n\nPlease try again. If the problem persists, please contact support.';
      }
      
      alert(errorMessage);
    }
  };

  const [userTouristData, setUserTouristData] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            setUserRole('tourist');
            setUserTouristData(touristDoc.data());
          } else {
            const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
            if (providerDoc.exists()) {
              setUserRole('provider');
            }
          }
        } catch (error) {
          console.log('Error getting user role:', error);
        }
      } else {
        setCurrentUser(null);
        setUserRole('');
        setUserTouristData(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Auto-fill booking form data when form opens
  useEffect(() => {
    if (showBookingForm && currentUser && userTouristData) {
      setBookingFormData(prev => ({
        ...prev,
        fullName: prev.fullName || currentUser.displayName || userTouristData.fullName || userTouristData.name || '',
        email: prev.email || currentUser.email || userTouristData.email || '',
        phone: prev.phone || userTouristData.phone || userTouristData.phoneNumber || '',
        country: prev.country || userTouristData.country || userTouristData.location || '',
        // Auto-fill national park from driver's first destination
        nationalPark: prev.nationalPark || (driver?.destinations && driver.destinations.length > 0 ? driver.destinations[0] : ''),
        // Auto-fill jeep type from driver's vehicle type
        jeepType: prev.jeepType || driver?.vehicleType || 'Standard Safari Jeep'
      }));
    }
  }, [showBookingForm, currentUser, userTouristData, driver]);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (!driverId) {
        setError("No driver ID provided");
        setLoading(false);
        return;
      }

      // Reset state before fetching
      setLoading(true);
      setError("");
      setDriver(null);
      setActiveTab("overview");

      try {
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          setDriver({
            id: driverDoc.id,
            ...driverData
          });
        } else {
          setError("Driver not found");
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
        setError("Failed to load driver information");
      } finally {
        setLoading(false);
      }
    };

    if (driverId) {
      fetchDriverData();
    }
  }, [driverId]);

  // Old conversation initialization removed - using Chat component instead
  // const initializeConversation = async () => {
  //   if (!currentUser || !driverId || !driver) return;
  //   try {
  //     const conversationId = await createOrGetConversation(...);
  //     setConversationId(conversationId);
  //     await markMessagesAsRead(conversationId, currentUser.uid);
  //   } catch (error) {
  //     console.error('Error initializing conversation:', error);
  //   }
  // };

  // useEffect(() => {
  //   if (currentUser && driverId && driver && !loading) {
  //     initializeConversation();
  //   }
  // }, [currentUser, driverId, driver, loading]);

  // useEffect(() => {
  //   // Old message loading code removed
  // }, [conversationId, currentUser]);


  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && (notification.chatId || notification.conversationId || notification.relatedId)) {
      // Try to get chat from chatting collection (new system)
      const chatId = notification.chatId || notification.conversationId || notification.relatedId;
      try {
        const chatDoc = await getDoc(doc(db, 'chatting', chatId));
        if (chatDoc.exists() && currentUser) {
          const chatData = chatDoc.data();
          const otherId = chatData.participantIds?.find(id => id !== currentUser.uid);
          if (otherId === driverId) {
            // Get other user info
            let otherName = chatData.participantNames?.[otherId] || notification.senderName || 'User';
            let photo = '';
            try {
              const touristDoc = await getDoc(doc(db, 'tourists', otherId));
              if (touristDoc.exists()) {
                photo = touristDoc.data().profilePicture || '';
              } else {
                const providerDoc = await getDoc(doc(db, 'serviceProviders', otherId));
                if (providerDoc.exists()) {
                  photo = providerDoc.data().profilePicture || '';
                }
              }
            } catch (photoError) {
              console.warn('Error fetching photo:', photoError);
            }

            setChatOtherUser({
              id: otherId,
              name: otherName,
              photo: photo,
              role: chatData.participantRoles?.[otherId] || 'user'
            });
          setIsChatModalOpen(true);
        }
        }
      } catch (chatError) {
        console.warn('Error opening chat from notification:', chatError);
      }
    }
  };

  const handleOpenChatModal = () => {
    if (driver && currentUser) {
      setChatOtherUser({
        id: driver.id,
        name: driver.fullName || 'Driver',
        photo: driver.profilePicture || driver.imageUrl || '',
        role: 'driver'
      });
      setIsChatModalOpen(true);
    }
  };

  // Old handleSendMessage removed - using Chat component instead
  // const handleSendMessage = async (e) => {
  //   // This function has been replaced by the Chat component
  // };

  const renderStars = (rating) => {
    const numericRating = Number(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(numericRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const handleReviewAdded = async () => {
    // Refresh driver data to update rating
    if (driverId) {
      const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
      if (driverDoc.exists()) {
        setDriver({
          id: driverDoc.id,
          ...driverDoc.data()
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Booking Success Message */}
      {showSuccessMessage && successMessageData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Booking Successful!
              </h2>
              <p className="text-gray-600 mb-2">
                Your booking request has been successfully submitted.
              </p>
              <p className="text-sm text-emerald-600 font-semibold mb-6">
                Please wait for the service provider's acceptance.
              </p>
              {successMessageData.bookingId && (
                <p className="text-xs text-gray-500 mb-4">
                  Booking ID: {successMessageData.bookingId.substring(0, 8)}...
                </p>
              )}
              
              {/* Booking Details */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Driver:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Dates:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.dates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Days:</span>
                  <span className="text-gray-900 font-semibold">{successMessageData.numberOfDays} day(s)</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2 mt-2">
                  <span className="text-gray-600 font-bold">Total:</span>
                  <span className="text-emerald-600 font-bold text-lg">LKR {successMessageData.totalPrice.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessMessage(false);
                  setSuccessMessageData(null);
                  // Ensure we're on the correct route
                  if (driverId) {
                    navigate(`/jeepprofile?driverId=${driverId}`, { replace: true });
                  } else if (driver?.id) {
                    navigate(`/jeepprofile?driverId=${driver.id}`, { replace: true });
                  } else {
                    navigate('/driver', { replace: true });
                  }
                }}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isChatModalOpen && chatOtherUser && currentUser && (
        <Chat
          user={currentUser}
          otherUserId={chatOtherUser.id}
          otherUserName={chatOtherUser.name}
          otherUserPhoto={chatOtherUser.photo}
          onClose={() => {
            setIsChatModalOpen(false);
            setChatOtherUser(null);
          }}
      />
      )}
      
      <BookingFormModal
        isOpen={showBookingForm}
        onClose={() => setShowBookingForm(false)}
        formData={bookingFormData}
        setFormData={setBookingFormData}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        onSubmit={handleBookingFormSubmit}
        driver={driver}
        selectedDates={selectedDates}
        selectedDatesWithType={selectedDatesWithType}
        onDateTypeChange={handleDateTypeChange}
      />
      
      <GlobalNotificationBell 
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />
      
      
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-emerald-700 mr-6 font-medium"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back
              </button>
              <h1 className="text-3xl font-bold text-emerald-800">Jeep Driver Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-8 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-8">
                <img
                  src={driver.profilePicture || "/api/placeholder/120/120"}
                  alt={driver.fullName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 mx-auto mb-5 shadow-md"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{driver.fullName}</h2>
                <p className="text-emerald-600 font-medium mb-4">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-3 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center">
                    {renderStars(driver.rating || 0)}
                    <span className="ml-3 text-sm font-semibold text-gray-700">
                      {driver.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      • {driver.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-8">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <Phone size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <Mail size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-700 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200/50">
                    <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                      <MapPin size={16} className="text-white" />
                    </div>
                    <span className="font-semibold">{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {!currentUser && (
                  <button
                    onClick={() => {
                      if (onShowAuth) {
                        onShowAuth('login');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-emerald-500/30"
                  >
                    Login to Book or Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-100/50 mb-8 overflow-hidden">
              <div className="border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/50 to-transparent">
                <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'overview'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                    }`}
                  >
                    Overview
                    {activeTab === 'overview' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'services'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                    }`}
                  >
                    Services & Rates
                    {activeTab === 'services' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'reviews'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-gray-500'
                    }`}
                  >
                    Reviews ({driver.totalReviews || 0})
                    {activeTab === 'reviews' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                    )}
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'booking'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500'
                      }`}
                    >
                      <CalendarIcon size={16} className="inline mr-2" />
                      Book Now
                      {activeTab === 'booking' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                      )}
                    </button>
                  )}
                  {currentUser && (
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        if (currentUser && driver) {
                          handleOpenChatModal();
                        }
                      }}
                      className={`py-5 px-8 text-center border-b-3 font-semibold text-sm whitespace-nowrap relative ${activeTab === 'chat'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                        : 'border-transparent text-gray-500'
                      }`}
                    >
                      Messages
                      {activeTab === 'chat' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-8 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                      <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                        <Clock className="text-white" size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1 text-lg">Experience</h3>
                        <p className="text-gray-700">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">About</h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <Languages className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm border-2 border-emerald-200 font-semibold shadow-sm"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destinations */}
                    {driver.destinations && driver.destinations.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <MapPin className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 px-4 py-2 rounded-full text-sm border-2 border-emerald-200 font-semibold shadow-sm"
                              >
                                {destination}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {driver.certifications && driver.certifications.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <Award className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Certifications</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm border-2 border-blue-200 font-semibold shadow-sm"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Skills */}
                    {driver.specialSkills && driver.specialSkills.length > 0 && (
                      <div className="flex items-start p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <div className="p-3 bg-emerald-500 rounded-xl mr-4 flex-shrink-0 shadow-lg">
                          <Shield className="text-white" size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 text-lg">Special Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 px-4 py-2 rounded-full text-sm border-2 border-purple-200 font-semibold shadow-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Services & Rates Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    {/* Vehicle Type */}
                    {driver.vehicleType && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 flex items-center text-lg">
                          <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                            <Car className="text-white" size={22} />
                          </div>
                          Vehicle Type
                        </h3>
                        <p className="text-gray-700 text-xl font-bold">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-white border-2 border-emerald-200 shadow-xl">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center text-xl">
                          <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                            <DollarSign className="text-white" size={24} />
                          </div>
                          Rates
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-5 bg-white rounded-xl border-2 border-emerald-100 shadow-md">
                            <div>
                              <span className="text-gray-800 font-bold text-lg">Price per day:</span>
                              <p className="text-sm text-gray-600 mt-1">Full day safari tours</p>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-emerald-600">
                                LKR {driver.pricePerDay.toLocaleString()}
                              </span>
                              <span className="text-sm font-semibold text-gray-500 block">/day</span>
                            </div>
                          </div>
                          {driver.pricePerHour && (
                            <div className="flex items-center justify-between p-5 bg-white rounded-xl border-2 border-emerald-100 shadow-md">
                              <div>
                                <span className="text-gray-800 font-bold text-lg">Price per hour:</span>
                                <p className="text-sm text-gray-600 mt-1">Hourly rate</p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-black text-emerald-600">
                                  LKR {driver.pricePerHour.toLocaleString()}
                                </span>
                                <span className="text-sm font-semibold text-gray-500 block">/hour</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                        <div className="p-2 bg-emerald-600 rounded-xl mr-3 shadow-lg">
                          <CalendarIcon className="text-white" size={22} />
                        </div>
                        Availability
                      </h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-700 font-medium">
                            Available on {driver.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {driver.availableDates.slice(0, 6).map((date, index) => (
                              <span
                                key={index}
                                className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm border-2 border-emerald-200 font-semibold shadow-sm"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {driver.availableDates.length > 6 && (
                              <span className="text-gray-600 text-sm font-semibold">
                                +{driver.availableDates.length - 6} more dates
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600">Contact for availability</p>
                      )}
                    </div>

                    {/* Service Description */}
                    {driver.description && (
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-100/50 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-3 text-lg">Service Details</h3>
                        <p className="text-gray-700 leading-relaxed text-base">{driver.description}</p>
                      </div>
                    )}
                  </div>
                )}


                {activeTab === 'reviews' && (
                  <ReviewSection 
                    driverId={driverId}
                    currentUser={currentUser}
                    userRole={userRole}
                    onReviewAdded={handleReviewAdded}
                  />
                )}

                {/* Booking Tab */}
                {activeTab === 'booking' && currentUser && userRole === 'tourist' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Calendar */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Select Your Dates</h3>
                        <DatePickerCalendar 
                          selectedDates={selectedDates}
                          onDateSelect={handleDateSelect}
                          selectedDatesWithType={selectedDatesWithType}
                          onDateTypeChange={handleDateTypeChange}
                        />
                      </div>

                      {/* Booking Summary */}
                      <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
                          
                          {selectedDates.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">
                              Select dates to see booking details
                            </p>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Selected dates:</span>
                                <span className="font-medium text-green-700">{selectedDates.length} day(s)</span>
                              </div>
                              
                              {/* Show breakdown of dates and their types */}
                              <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {selectedDates.map((date, index) => {
                                  const dateString = date.toDateString();
                                  const dateType = selectedDatesWithType[dateString] || 'full-day';
                                  const dayPrice = dateType === 'half-day' ? (driver.pricePerDay || 0) * 0.6 : (driver.pricePerDay || 0);
                                  return (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                      <span className="text-gray-600">
                                        {date.toLocaleDateString()} ({dateType === 'half-day' ? 'Half Day' : 'Full Day'})
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        LKR {dayPrice.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Price per day:</span>
                                <span className="font-medium">LKR {driver.pricePerDay?.toLocaleString() || '0'}</span>
                              </div>
                              
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                                  <span className="text-2xl font-bold text-green-600">
                                    LKR {calculateTotalPrice().toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (selectedDates.length === 0) {
                                    alert('Please select at least one date for your booking.');
                                    return;
                                  }
                                  if (!currentUser) {
                                    alert('Please login to make a booking.');
                                    return;
                                  }
                                  setShowBookingForm(true);
                                }}
                                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium mt-4 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                disabled={selectedDates.length === 0}
                              >
                                {selectedDates.length === 0 ? (
                                  'Select Dates First'
                                ) : (
                                  'Continue to Booking Details'
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Driver Info */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Driver Information</h3>
                          <p className="text-gray-600 text-sm">
                            You'll be booking with {driver.fullName}, an experienced {driver.serviceType} with {driver.experienceYears || 0} years of experience.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Tab - Opens Chat Modal */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col items-center justify-center">
                    {currentUser ? (
                      <div className="text-center">
                        <MessageCircle size={64} className="mx-auto mb-4 text-green-600" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Chat with {driver.fullName}
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Click the button below to open the chat window
                        </p>
                          <button
                          onClick={handleOpenChatModal}
                          className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                          >
                          <MessageCircle size={20} />
                          Open Chat
                          </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-600 mb-4">
                          Please login to start a conversation with {driver.fullName}
                        </p>
                        <button
                          onClick={() => {
                            if (onShowAuth) {
                              onShowAuth('login');
                            }
                          }}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium"
                        >
                          Login Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JeepProfile;