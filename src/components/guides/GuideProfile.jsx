import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
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
  ArrowRight,
  ChevronRight,
  Send,
  Check,
  CheckCheck,
  Bell,
  X,
  User,
  DollarSign,
  Calendar as CalendarIcon,
  BookOpen,
  GraduationCap,
  Globe,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Flag,
  AlertCircle,
  CheckCircle,
  Package,
  Navigation
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";

// Import Chat component
import Chat from "../Chat";

// Import personalization service
import { trackActivity } from "../../services/personalizationService";

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
  GlobalNotificationBell
} from "../../App";

// Calendar Component for Date Selection with Availability Display
const DatePickerCalendar = ({ selectedDates, onDateSelect, selectedDatesWithType, onDateTypeChange, availabilityCalendar, availableDates, onDateDoubleClick }) => {
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

  const handleDateClick = (date) => {
    if (!date) return;
    onDateSelect(date);
  };

  const getAvailabilityStatus = (date) => {
    if (!date) return null;

    // Get year, month, day in local time to construct the key
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    // Priority 1: Check new availability calendar format (object)
    if (availabilityCalendar && typeof availabilityCalendar === 'object' && !Array.isArray(availabilityCalendar)) {
      const status = availabilityCalendar[dateKey];
      // Check for both legacy and new status strings
      if (status && [
        'busy',
        'halfday',
        'unavailable',
        'halfday-morning',
        'halfday-evening',
        'unavailable-fullday',
        'unavailable-halfday-morning',
        'unavailable-halfday-evening'
      ].includes(status)) {
        return status;
      }
    }

    // Default: Assume available (null)
    // We removed the legacy availableDates fallback because empty arrays were marking all dates as unavailable.
    return null;
  };

  const isDatePast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getDateClassName = (date) => {
    if (!date) return "p-2 bg-transparent";

    const baseClasses = "relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 cursor-pointer";
    const status = getAvailabilityStatus(date);
    const isPast = isDatePast(date);
    const selected = selectedDates.some(d => d.toDateString() === date.toDateString());
    const isToday = date.toDateString() === new Date().toDateString();

    if (isPast) return `${baseClasses} text-gray-300 cursor-not-allowed bg-gray-50`;

    if (selected) {
      const dateString = date.toDateString();
      const dateType = selectedDatesWithType[dateString] || 'full-day';
      if (dateType === 'half-day') {
        return `${baseClasses} bg-yellow-500 text-white shadow-lg scale-105 z-10`;
      } else {
        return `${baseClasses} bg-red-600 text-white shadow-lg scale-105 z-10`;
      }
    }

    if (status === 'busy' || status === 'unavailable' || status === 'unavailable-fullday') {
      return `${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-200`;
    }

    if (status === 'halfday' || status === 'halfday-morning' || status === 'halfday-evening' || status === 'unavailable-halfday-morning' || status === 'unavailable-halfday-evening') {
      return `${baseClasses} bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100 font-bold`;
    }

    if (isToday) {
      return `${baseClasses} bg-emerald-100 text-emerald-800 border-2 border-emerald-400 hover:scale-105 z-10 font-bold`;
    }

    return `${baseClasses} bg-emerald-50 text-emerald-600 border border-emerald-100 hover:border-emerald-600 hover:scale-105`;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-emerald-600" />
          {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 group">
            <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:text-black" />
          </button>
          <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 group">
            <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-black" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="h-10 w-10 sm:h-12 sm:w-12" />;
          const status = getAvailabilityStatus(day);
          const isPast = isDatePast(day);
          const isAvailable = (status !== 'busy' && status !== 'unavailable' && status !== 'unavailable-fullday' && !isPast);

          return (
            <button
              key={day.toISOString()}
              onClick={() => isAvailable && handleDateClick(day)}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onDateDoubleClick && selectedDates.some(d => d.toDateString() === day.toDateString())) {
                  onDateDoubleClick(day);
                }
              }}
              disabled={!isAvailable}
              className={getDateClassName(day)}
              title={(() => {
                if (isPast) return 'Past date';
                if (status === 'busy') return 'Busy - Not available';
                if (status === 'halfday' || status === 'halfday-morning' || status === 'halfday-evening' || status === 'unavailable-halfday-morning' || status === 'unavailable-halfday-evening') return 'Half day available';
                if (status === 'unavailable' || status === 'unavailable-fullday') return 'Unavailable';
                return 'Available - Click to select';
              })()}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

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
  guide,
  selectedDates,
  selectedDatesWithType,
  onDateTypeChange,
  selectedPackage,
  halfDayTimes
}) => {
  const allSteps = [
    { number: 1, title: 'Personal', shortTitle: 'Personal', icon: User },
    { number: 2, title: 'Tour Details', shortTitle: 'Tour', icon: Calendar },
    { number: 3, title: 'Pickup & Drop-off', shortTitle: 'Pickup', icon: Navigation },
    { number: 4, title: 'Additional Requests', shortTitle: 'Add-ons', icon: Package }
  ];

  const steps = allSteps;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setFormErrors({});
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
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
      if (!formData.numberOfPassengers || formData.numberOfPassengers < 1 || formData.numberOfPassengers > 20) {
        errors.numberOfPassengers = 'Number of passengers must be between 1 and 20';
      }
    } else if (currentStep === 2) {
      if (!formData.nationalPark.trim()) errors.nationalPark = 'National park/Destination is required';
    } else if (currentStep === 3) {
      if (formData.needsHotelPickup) {
        if (!formData.hotelName.trim()) errors.hotelName = 'Hotel name is required';
        if (!formData.hotelAddress.trim()) errors.hotelAddress = 'Hotel address is required';
      } else {
        if (!formData.pickupLocation.trim()) errors.pickupLocation = 'Pickup location is required';
        if (!formData.dropoffLocation.trim()) errors.dropoffLocation = 'Drop-off location is required';
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-4xl w-full my-2 sm:my-8 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-linear-to-r from-black to-gray-900 rounded-t-lg sm:rounded-t-2xl p-3 sm:p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold truncate">Booking Details</h1>
                <p className="text-gray-300 text-xs sm:text-sm hidden sm:block">Complete your booking information</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 sm:p-2 rounded-lg cursor-pointer shrink-0 ml-2"><X className="h-5 w-5 sm:h-6 sm:w-6" /></button>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-start justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <div key={step.number} className="flex items-start shrink-0" style={{ width: 'calc(25% - 8px)' }}>
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-black border-black text-white' : isCompleted ? 'bg-gray-100 border-black text-black' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </div>
                    <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${isActive ? 'text-black' : 'text-gray-500'}`}>
                      <span className="hidden sm:inline">{step.title}</span><span className="sm:hidden">{step.shortTitle}</span>
                    </span>
                  </div>
                  {index < steps.length - 1 && <div className={`hidden sm:block h-0.5 w-full mx-1 sm:mx-2 -mt-4 sm:-mt-6 ${isCompleted ? 'bg-black' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><User className="h-5 w-5 text-black" />Personal Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input type="text" value={formData.fullName} onChange={(e) => updateFormData('fullName', e.target.value)} className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'}`} />
                  {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input type="email" value={formData.email} onChange={(e) => updateFormData('email', e.target.value)} className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => updateFormData('phone', e.target.value)} className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`} placeholder="+94 77 123 4567" />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                  <input type="text" value={formData.country} onChange={(e) => updateFormData('country', e.target.value)} className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.country ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Passengers *</label>
                  <input type="number" value={formData.numberOfPassengers} onChange={(e) => updateFormData('numberOfPassengers', e.target.value)} className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.numberOfPassengers ? 'border-red-500' : 'border-gray-300'}`} />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-black" />Tour Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-medium cursor-not-allowed">
                  {formData.nationalPark || 'No destination specified'}
                </div>
              </div>
              {selectedDates.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package className="h-5 w-5 text-emerald-600" />Booking Summary</h3>

                  {/* Package Information */}
                  {selectedPackage && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-800 font-semibold text-xs">Package Booking</span>
                      </div>
                      <p className="text-emerald-700 text-xs font-medium">{selectedPackage.title}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedDates.map((date, index) => {
                      const dateString = date.toDateString();
                      const dateType = selectedDatesWithType[dateString] || 'full-day';
                      const timeOfDay = halfDayTimes[dateString];
                      // Format date with month as text: "January 22, 2026"
                      const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      return (
                        <div key={index} className="text-sm text-gray-700 border-b border-gray-200 pb-2">
                          <p className="font-medium">{formattedDate}</p>
                          <p className="text-xs text-gray-500">{dateType === 'half-day' ? 'Half Day' : 'Full Day'}{timeOfDay ? ` (${timeOfDay === 'morning' ? 'Morning' : 'Evening'})` : ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Navigation className="h-5 w-5 text-black" />Pickup & Drop-off</h2>
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input type="checkbox" checked={formData.needsHotelPickup} onChange={(e) => updateFormData('needsHotelPickup', e.target.checked)} className="w-5 h-5 text-black rounded" />
                <span className="text-sm font-medium text-gray-700">Do you need hotel pickup?</span>
              </label>
              {formData.needsHotelPickup ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter hotel name"
                      value={formData.hotelName}
                      onChange={(e) => updateFormData('hotelName', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.hotelName ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.hotelName && <p className="text-red-500 text-xs mt-1">{formErrors.hotelName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter hotel address"
                      value={formData.hotelAddress}
                      onChange={(e) => updateFormData('hotelAddress', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.hotelAddress ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.hotelAddress && <p className="text-red-500 text-xs mt-1">{formErrors.hotelAddress}</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter pickup location"
                      value={formData.pickupLocation}
                      onChange={(e) => updateFormData('pickupLocation', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.pickupLocation ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.pickupLocation && <p className="text-red-500 text-xs mt-1">{formErrors.pickupLocation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Drop-off Location <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Enter drop-off location"
                      value={formData.dropoffLocation}
                      onChange={(e) => updateFormData('dropoffLocation', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-lg ${formErrors.dropoffLocation ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.dropoffLocation && <p className="text-red-500 text-xs mt-1">{formErrors.dropoffLocation}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-black" />
                Additional Requests / Add-Ons
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { key: 'needsBinoculars', countKey: 'binocularsCount', label: 'Binoculars', price: 500, icon: '🔭' },
                  { key: 'needsChildSeat', countKey: 'childSeatCount', label: 'Child Seat', price: 1000, icon: '👶' },
                  { key: 'needsWater', countKey: 'waterBottleCount', label: 'Water Bottles', price: 300, icon: '💧' }
                ].map(({ key, countKey, label, price, icon }) => {
                  const count = formData[countKey] || 0;
                  return (
                    <div key={key} className={`border rounded-xl p-4 transition-all duration-200 ${count > 0 ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-500/20' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{label}</h3>
                            <p className="text-xs text-gray-500 font-medium">+LKR {price.toLocaleString()} / item</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg p-1.5 border border-gray-200 shadow-sm">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); updateFormData(countKey, Math.max(0, count - 1)); }}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Qty</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); updateFormData(countKey, (count || 0) + 1); }}
                          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={`border rounded-xl p-4 transition-all duration-200 ${formData.needsSnacks ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-gray-300'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍱</span>
                    <span className="font-bold text-gray-900">Add Snacks / Meals</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.needsSnacks}
                    onChange={(e) => updateFormData('needsSnacks', e.target.checked)}
                    className="w-6 h-6 text-emerald-600 rounded-md focus:ring-emerald-500 border-gray-300"
                  />
                </label>
              </div>

              {formData.needsSnacks && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Available Snacks & Meals:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: 'Biscuits', price: 200 }, { name: 'Chips', price: 250 }, { name: 'Fruits', price: 400 },
                      { name: 'Sandwiches', price: 500 }, { name: 'Rice & Curry', price: 800 },
                      { name: 'Fried Rice', price: 700 }, { name: 'Noodles', price: 600 }, { name: 'Soft Drinks', price: 150 }
                    ].map(({ name, price }) => {
                      const qty = formData.snackQuantities?.[name] || 0;
                      return (
                        <div key={name} className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-colors ${qty > 0 ? 'border-emerald-500 shadow-sm' : 'border-gray-200'}`}>
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">{name}</span>
                            <span className="text-xs text-gray-500 font-semibold">+LKR {price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {qty > 0 ? (
                              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQtys = { ...(formData.snackQuantities || {}) };
                                    newQtys[name] = Math.max(0, qty - 1);
                                    updateFormData('snackQuantities', newQtys);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-bold text-sm text-gray-900">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQtys = { ...(formData.snackQuantities || {}) };
                                    newQtys[name] = (qty || 0) + 1;
                                    updateFormData('snackQuantities', newQtys);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const newQtys = { ...(formData.snackQuantities || {}) };
                                  newQtys[name] = 1;
                                  updateFormData('snackQuantities', newQtys);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all transform active:scale-95"
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex justify-between items-center gap-3">
          <button onClick={handlePrevious} disabled={currentStep === 1} className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 disabled:opacity-50">Previous</button>
          {currentStep < steps.length ? (
            <button onClick={() => { if (validateStep()) handleNext(); }} className="px-6 py-2 bg-black text-white rounded-lg font-medium">Next</button>
          ) : (
            <button onClick={() => { if (validateStep()) onSubmit(); }} className="px-6 py-2 bg-black text-white rounded-lg font-medium">Confirm Booking</button>
          )}
        </div>
      </div>
    </div>
  );
};

const GuideProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const { guideId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // const messagesEndRef = useRef(null); // Removed - using Chat component instead

  const [guide, setGuide] = useState(null);
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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageData, setSuccessMessageData] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [userTouristData, setUserTouristData] = useState(null);

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  // const [chatConversationId, setChatConversationId] = useState(null); // Removed - using Chat component instead
  const [chatOtherUser, setChatOtherUser] = useState(null);
  const [hasAcceptedBooking, setHasAcceptedBooking] = useState(false);

  // Package booking states
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [dateBookingTypes, setDateBookingTypes] = useState({}); // { 'dateKey': 'fullDay' | 'halfDay' }
  const [showDayTypeModal, setShowDayTypeModal] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const [expandedPackage, setExpandedPackage] = useState(null); // Track which package is expanded

  // Jeep Driver style booking states
  const [selectedDatesWithType, setSelectedDatesWithType] = useState({}); // { 'dateKey': 'full-day' | 'half-day' }
  const [dateTypeMenuDate, setDateTypeMenuDate] = useState(null);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [halfDayTimes, setHalfDayTimes] = useState({}); // {dateString: 'morning' | 'evening'}
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [bookingFormData, setBookingFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    numberOfPassengers: 1,
    specialAssistance: '',
    nationalPark: '',
    safariType: 'Morning Safari',
    pickupLocation: '',
    hotelName: '',
    hotelAddress: '',
    roomNumber: '',
    dropoffLocation: '',
    needsHotelPickup: true,
    needsBinoculars: false,
    needsChildSeat: false,
    needsWater: false,
    needsSnacks: false,
    binocularsCount: 0,
    childSeatCount: 0,
    waterBottleCount: 0,
    snackQuantities: {},
    selectedSnacks: []
  });

  // Reset showTimeMenu when dateTypeMenuDate changes
  useEffect(() => {
    if (!dateTypeMenuDate) {
      setShowTimeMenu(false);
    }
  }, [dateTypeMenuDate]);

  // Auto-fill booking form data when form opens
  useEffect(() => {
    if (showBookingForm && currentUser && userTouristData) {
      setBookingFormData(prev => ({
        ...prev,
        fullName: prev.fullName || currentUser.displayName || userTouristData.fullName || userTouristData.name || '',
        email: prev.email || currentUser.email || userTouristData.email || '',
        phone: prev.phone || userTouristData.phone || userTouristData.phoneNumber || '',
        country: prev.country || userTouristData.country || userTouristData.location || '',
        nationalPark: prev.nationalPark || (guide?.destinations && guide.destinations.length > 0 ? guide.destinations[0] : ''),
      }));
    }
  }, [showBookingForm, currentUser, userTouristData, guide]);

  const searchParams = new URLSearchParams(location.search);
  const openChat = searchParams.get('openChat');

  // Scroll to top when page loads or navigates (including back button)
  useEffect(() => {
    // Scroll to top on mount and when location changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname, guideId]);

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

  // Old scrollToBottom and messages useEffect removed - using Chat component instead

  // Check for accepted bookings to enable messaging
  useEffect(() => {
    const checkAcceptedBooking = async () => {
      if (!currentUser || !guideId) {
        setHasAcceptedBooking(false);
        return;
      }

      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('customerId', '==', currentUser.uid),
          where('guideId', '==', guideId),
          where('status', 'in', ['accepted', 'confirmed', 'completed'])
        );

        const snapshot = await getDocs(q);
        setHasAcceptedBooking(!snapshot.empty);
      } catch (error) {
        console.error('Error checking for accepted bookings:', error);
        setHasAcceptedBooking(false);
      }
    };

    checkAcceptedBooking();
  }, [currentUser, guideId]);

  // Track recently viewed when profile is loaded
  useEffect(() => {
    if (guideId && currentUser && guide) {
      trackActivity(currentUser.uid, 'view', guideId, 'tour-guide', {
        fullName: guide.fullName || guide.guideName || '',
        location: guide.location || '',
        rating: guide.rating || 0,
        fullDayPrice: guide.fullDayPrice || guide.priceFullDayStandard || 0
      });
    }
  }, [guideId, currentUser, guide]);

  // Handle opening chat from URL parameter
  useEffect(() => {
    if (openChat === 'true' && guideId && currentUser && guide && hasAcceptedBooking) {
      setActiveTab('chat');
      // Open chat modal instead of initializing old conversation
      setChatOtherUser({
        id: guide.id,
        name: guide.guideName || guide.fullName || 'Tour Guide',
        photo: guide.profilePicture || guide.imageUrl || '',
        role: 'guide'
      });
      setIsChatModalOpen(true);
    }
  }, [openChat, guideId, currentUser, guide, hasAcceptedBooking]);

  // Old formatTime function removed - using Chat component instead

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
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const fetchGuideData = async () => {
      if (!guideId) {
        setError("No guide ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching guide data for ID:', guideId);

        // First, try to get data from sessionStorage (from guide listing)
        const storedGuideData = sessionStorage.getItem('currentGuideData');

        if (storedGuideData) {
          console.log('✅ Found guide data in sessionStorage');
          const guideData = JSON.parse(storedGuideData);

          // Only use stored data if it matches the current guideId
          if (guideData.id === guideId) {
            setGuide(guideData);
            setLoading(false);
            return;
          }
        }

        // If no stored data or ID mismatch, fetch from Firestore
        console.log('📡 No stored data found, fetching from Firestore...');
        const guideDoc = await getDoc(doc(db, 'serviceProviders', guideId));

        if (guideDoc.exists()) {
          const guideData = guideDoc.data();
          console.log('✅ Guide data found in Firestore:', guideData);

          // Debug: Log pricing fields from database
          console.log('💰 Pricing fields from database:', {
            priceFullDayStandard: guideData.priceFullDayStandard,
            priceHalfDayStandard: guideData.priceHalfDayStandard,
            fullDayPrice: guideData.fullDayPrice,
            halfDayPrice: guideData.halfDayPrice,
            dailyRate: guideData.dailyRate,
            hourlyRate: guideData.hourlyRate
          });

          // Transform data to match the structure expected by the profile page
          const transformedGuide = {
            id: guideDoc.id,
            guideName: guideData.fullName || guideData.guideName || 'Tour Guide',
            imageUrl: guideData.profilePicture || guideData.imageUrl || '',
            location: guideData.location || guideData.baseLocation || 'Sri Lanka',
            rating: typeof guideData.rating === 'number' ? guideData.rating :
              typeof guideData.rating === 'string' ? parseFloat(guideData.rating) || 0 : 0,
            totalReviews: guideData.totalReviews || 0,

            // Pricing - map all possible field names
            hourlyRate: guideData.hourlyRate || 0,
            dailyRate: guideData.dailyRate || guideData.fullDayPrice || guideData.priceFullDay || 0,
            priceFullDayStandard: guideData.priceFullDayStandard || guideData.fullDayPrice || guideData.priceFullDay || guideData.dailyRate || 0,
            priceHalfDayStandard: guideData.priceHalfDayStandard || guideData.halfDayPrice || guideData.priceHalfDay || Math.round((guideData.dailyRate || guideData.fullDayPrice || 0) * 0.6),
            fullDayPrice: guideData.fullDayPrice || guideData.priceFullDay || guideData.dailyRate || 0,
            halfDayPrice: guideData.halfDayPrice || guideData.priceHalfDay || Math.round((guideData.fullDayPrice || guideData.dailyRate || 0) * 0.6),

            specialPackageRates: guideData.specialPackageRates || '',
            currencyPreference: guideData.currencyPreference || 'LKR',
            experience: guideData.experienceYears || guideData.experience || guideData.yearsOfExperience || 0,

            specialQualifications: Array.isArray(guideData.specialQualifications) ? guideData.specialQualifications :
              guideData.specialQualifications ? [guideData.specialQualifications] : [],

            areasOfExpertise: Array.isArray(guideData.areasOfExpertise) ? guideData.areasOfExpertise :
              Array.isArray(guideData.expertise) ? guideData.expertise :
                guideData.areasOfExpertise ? [guideData.areasOfExpertise] :
                  guideData.expertise ? [guideData.expertise] : [],

            // Destinations - map all possible field names
            destinations: Array.isArray(guideData.destinations) ? guideData.destinations :
              Array.isArray(guideData.destinationsCovered) ? guideData.destinationsCovered :
                Array.isArray(guideData.destination) ? guideData.destination :
                  guideData.destinations ? [guideData.destinations] :
                    guideData.destinationsCovered ? [guideData.destinationsCovered] :
                      guideData.destination ? [guideData.destination] : [],

            // Certifications
            certifications: Array.isArray(guideData.certifications) ? guideData.certifications :
              guideData.certifications ? [guideData.certifications] : [],
            certificationStatus: guideData.certificationStatus || 'non-certified',
            verificationDocuments: Array.isArray(guideData.verificationDocuments) ? guideData.verificationDocuments :
              guideData.verificationDocuments ? [guideData.verificationDocuments] : [],

            // Languages
            languages: Array.isArray(guideData.languages) ? guideData.languages :
              Array.isArray(guideData.languagesSpoken) ? guideData.languagesSpoken :
                guideData.languagesSpoken ? [guideData.languagesSpoken] :
                  guideData.languages ? [guideData.languages] :
                    ['English', 'Sinhala'],

            contactPhone: guideData.contactPhone || guideData.phone || guideData.phoneNumber || 'Not provided',
            contactEmail: guideData.contactEmail || guideData.email || '',
            description: guideData.description || guideData.bio || guideData.about || 'Experienced tour guide',
            featured: guideData.featured || false,
            availability: guideData.availability !== false,

            // Ensure availability is an object, not array
            availabilityCalendar: (guideData.availability && typeof guideData.availability === 'object' && !Array.isArray(guideData.availability))
              ? guideData.availability
              : {}, // Object: { "YYYY-MM-DD": "busy"|"halfday"|"unavailable" }
            availableDates: guideData.availableDates || [], // Keep for backward compatibility

            // Packages - will be fetched separately via useEffect
            packages: [],

            isCurrentUser: currentUser && currentUser.uid === guideId
          };

          // Debug: Log transformed pricing values
          console.log('💰 Transformed pricing values:', {
            priceFullDayStandard: transformedGuide.priceFullDayStandard,
            priceHalfDayStandard: transformedGuide.priceHalfDayStandard,
            fullDayPrice: transformedGuide.fullDayPrice,
            halfDayPrice: transformedGuide.halfDayPrice
          });

          setGuide(transformedGuide);

          // Fetch certification documents if guide is certified
          if (guideData.certificationStatus === 'certified') {
            try {
              const certDocRef = doc(db, 'guideCertifications', guideId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                console.log('✅ Certification documents found:', certData);

                // Set certification documents with URLs
                if (certData.documents && Array.isArray(certData.documents)) {
                  transformedGuide.certificationDocuments = certData.documents;
                  setGuide({ ...transformedGuide, certificationDocuments: certData.documents });
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents:', err);
            }
          }
        } else {
          console.log('❌ Guide not found for ID:', guideId);
          setError("Tour guide not found");
        }
      } catch (err) {
        console.error("Error fetching guide:", err);
        setError("Failed to load guide information");
      } finally {
        setLoading(false);
      }
    };

    fetchGuideData();
  }, [guideId, currentUser]);

  // Populate booking form when user/guide loads
  useEffect(() => {
    if (guide || currentUser) {
      setBookingFormData(prev => ({
        ...prev,
        fullName: prev.fullName || currentUser?.displayName || userTouristData?.fullName || '',
        email: prev.email || currentUser?.email || userTouristData?.email || '',
        phone: prev.phone || userTouristData?.phone || '',
        nationalPark: prev.nationalPark || guide?.location || guide?.destinations?.[0] || '',
      }));
    }
  }, [guide, currentUser, userTouristData]);

  // Fetch packages for this guide
  useEffect(() => {
    if (!guideId) return;

    const packagesQuery = query(
      collection(db, 'servicePackages'),
      where('providerId', '==', guideId)
    );

    const unsubscribe = onSnapshot(packagesQuery, (snapshot) => {
      const packagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackages(packagesData);
      setLoadingPackages(false);

      // Also update guide object with packages
      setGuide(prev => prev ? { ...prev, packages: packagesData } : null);
    }, (error) => {
      console.error("Error fetching packages:", error);
      setLoadingPackages(false);
    });

    return () => unsubscribe();
  }, [guideId]);

  // Old conversation initialization removed - using Chat component instead
  // const initializeConversation = async () => {
  //   // This function has been replaced by the Chat component
  // };

  // useEffect(() => {
  //   // Old message loading code removed
  // }, [conversationId, currentUser]);

  const handleDateSelect = (date, type = 'full-day') => {
    if (!date) return;
    const dateString = date.toDateString();

    setSelectedDates(prev => {
      const isSelected = prev.some(selectedDate =>
        selectedDate.toDateString() === dateString
      );

      if (isSelected) {
        // If we're providing a type AND it's different from current, just update the type
        const currentType = selectedDatesWithType[dateString];
        if (type !== 'full-day' && currentType !== type) {
          setSelectedDatesWithType(prevTypes => ({
            ...prevTypes,
            [dateString]: type
          }));
          return prev; // Don't remove from selectedDates
        }

        // Toggle OFF
        const newTypes = { ...selectedDatesWithType };
        delete newTypes[dateString];
        setSelectedDatesWithType(newTypes);

        // Also remove half day time if exists
        setHalfDayTimes(prevTimes => {
          const newTimes = { ...prevTimes };
          delete newTimes[dateString];
          return newTimes;
        });

        return prev.filter(selectedDate =>
          selectedDate.toDateString() !== dateString
        );
      } else {
        // Add date
        setSelectedDatesWithType(prev => ({
          ...prev,
          [dateString]: type
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

  const handleDayTypeSelection = (dayType) => {
    if (!pendingDate) return;

    const dateKey = pendingDate.toDateString();
    const isSelected = selectedDates.some(d => d.toDateString() === dateKey);

    if (isSelected) {
      // Remove date
      setSelectedDates(prev => prev.filter(d => d.toDateString() !== dateKey));
      setDateBookingTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes[dateKey];
        return newTypes;
      });
    } else {
      // Add date with booking type
      setSelectedDates(prev => [...prev, pendingDate]);
      setDateBookingTypes(prev => ({
        ...prev,
        [dateKey]: dayType
      }));
    }

    setShowDayTypeModal(false);
    setPendingDate(null);
  };

  const clearPackageSelection = () => {
    setSelectedPackage(null);
    setSelectedDates([]);
    setDateBookingTypes({});
  };

  const calculateTotal = () => {
    if (!guide || selectedDates.length === 0) return 0;

    let total = 0;

    // If package is selected, use package prices
    if (selectedPackage) {
      selectedDates.forEach(date => {
        const dateString = date.toDateString();
        const dateType = selectedDatesWithType[dateString] || 'full-day';
        total += dateType === 'half-day' ? (selectedPackage.halfDayPrice || 0) : (selectedPackage.fullDayPrice || 0);
      });
      return total;
    }

    // Regular booking - use guide's standard prices from register form
    selectedDates.forEach(date => {
      const dateString = date.toDateString();
      const dateType = selectedDatesWithType[dateString] || 'full-day';

      let dayPrice = 0;
      dayPrice = dateType === 'half-day'
        ? (guide.priceHalfDayStandard || (guide.dailyRate || 0) * 0.6 || 0)
        : (guide.priceFullDayStandard || guide.dailyRate || 0);

      total += dayPrice;
    });

    // Add add-ons (regular bookings only)
    if (!selectedPackage) {
      if (bookingFormData.binocularsCount > 0) total += bookingFormData.binocularsCount * 500;
      if (bookingFormData.childSeatCount > 0) total += bookingFormData.childSeatCount * 1000;
      if (bookingFormData.waterBottleCount > 0) total += bookingFormData.waterBottleCount * 300;

      if (bookingFormData.needsSnacks && bookingFormData.snackQuantities) {
        const snackPrices = {
          'Biscuits': 200, 'Chips': 250, 'Fruits': 400, 'Sandwiches': 500,
          'Rice & Curry': 800, 'Fried Rice': 700, 'Noodles': 600, 'Soft Drinks': 150
        };
        Object.entries(bookingFormData.snackQuantities).forEach(([name, qty]) => {
          total += (snackPrices[name] || 0) * (qty || 0);
        });
      }
    }

    return total;
  };

  const handleBookingFormSubmit = async () => {
    try {
      await handleBooking();
    } catch (error) {
      console.error('Error in handleBookingFormSubmit:', error);
    }
  };

  const handleBooking = async () => {
    // Prevent double-clicks
    if (isBooking) {
      console.warn('⚠️ Booking already in progress, ignoring click');
      return;
    }

    if (selectedDates.length === 0) {
      console.warn('⚠️ No dates selected');
      alert('Please select at least one date for your booking.');
      return;
    }

    if (!currentUser) {
      console.warn('⚠️ No current user');
      alert('Please login to make a booking.');
      return;
    }

    if (!guide) {
      console.warn('⚠️ No guide data');
      alert('Guide information not available.');
      return;
    }

    // Verify guide has a valid ID
    if (!guide.id) {
      console.error('❌ Guide ID is missing:', guide);
      alert('Guide information is incomplete. Please try again.');
      return;
    }

    setIsBooking(true);

    try {
      const authUser = auth.currentUser;

      if (!authUser) {
        alert('Please login to make a booking.');
        return;
      }

      // Calculate total price using standard full-day/half-day prices
      const totalPrice = calculateTotal();

      const datesString = selectedDates.map(d => {
        const dateType = selectedDatesWithType[d.toDateString()] || 'full-day';
        const timeOfDay = halfDayTimes[d.toDateString()];
        return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${dateType === 'half-day' ? 'Half Day' : 'Full Day'}${timeOfDay ? ' - ' + timeOfDay : ''})`;
      }).join(', ');

      const datesWithTypes = selectedDates.map(d => {
        const dString = d.toDateString();
        const dateType = selectedDatesWithType[dString] || 'full-day';
        const timeSelection = halfDayTimes[dString];

        // Determine safariType for consistency with JeepProfile
        let safariType = 'Morning Safari';
        if (dateType === 'half-day' && timeSelection === 'evening') {
          safariType = 'Evening Safari';
        } else if (dateType === 'full-day') {
          safariType = 'Full Day Safari';
        }

        return {
          date: d.toISOString(),
          type: dateType,
          time: timeSelection || (dateType === 'full-day' ? 'full' : 'morning'),
          safariType: safariType,
          price: dateType === 'half-day'
            ? (selectedPackage ? (selectedPackage.halfDayPrice || 0) : (guide.priceHalfDayStandard || (guide.dailyRate || 0) * 0.6))
            : (selectedPackage ? (selectedPackage.fullDayPrice || 0) : (guide.priceFullDayStandard || guide.dailyRate || 0))
        };
      });

      // Get guide email
      const guideEmail = guide.contactEmail || guide.email || '';

      // Create booking in Firestore
      const bookingData = {
        guideId: String(guide.id),
        guideName: guide.guideName || guide.fullName || 'Tour Guide',
        guideEmail: guideEmail,
        customerId: authUser.uid,
        customerName: bookingFormData.fullName || authUser.displayName || 'Customer',
        customerEmail: bookingFormData.email || authUser.email || '',
        customerPhone: bookingFormData.phone,
        customerCountry: bookingFormData.country,
        numberOfPassengers: Number(bookingFormData.numberOfPassengers),

        nationalPark: bookingFormData.nationalPark,
        needsHotelPickup: bookingFormData.needsHotelPickup,
        hotelName: bookingFormData.hotelName || '',
        hotelAddress: bookingFormData.hotelAddress || '',
        pickupLocation: bookingFormData.pickupLocation || '',
        dropoffLocation: bookingFormData.dropoffLocation || '',

        selectedDates: selectedDates.map(d => d.toISOString()),
        datesWithTypes: datesWithTypes,
        datesString: datesString,
        totalPrice: Number(totalPrice),
        serviceType: 'Tour Guide',
        packageId: selectedPackage ? selectedPackage.id : null,
        packageName: selectedPackage ? selectedPackage.title : null,
        status: 'pending',
        ...bookingFormData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const bookingRef = collection(db, 'bookings');
      const bookingDoc = await addDoc(bookingRef, bookingData);
      const bookingId = bookingDoc.id;

      // Create confirmation record
      try {
        const confirmationData = {
          bookingId: bookingId,
          ...bookingData,
          confirmationStatus: 'pending',
          confirmedAt: serverTimestamp(),
          confirmationType: 'booking_request'
        };
        await addDoc(collection(db, 'confirmations'), confirmationData);
      } catch (e) {
        console.warn('Confirmation error:', e);
      }

      // Create notification
      try {
        await createNotification({
          type: 'booking',
          title: 'New Guide Booking',
          message: `New booking request from ${bookingData.customerName} for ${selectedDates.length} day(s).`,
          recipientId: guide.id,
          senderId: authUser.uid,
          relatedId: bookingId,
          bookingId: bookingId
        });
      } catch (e) {
        console.warn('Notification error:', e);
      }

      setSuccessMessageData({
        guideName: guide.guideName || guide.fullName,
        dates: datesString,
        datesWithTypes: datesWithTypes,
        totalPrice: totalPrice,
        numberOfDays: selectedDates.length,
        bookingId: bookingId,
        nationalPark: bookingFormData.nationalPark
      });
      setShowSuccessMessage(true);
      setShowBookingForm(false);
      setSelectedDates([]);
      setSelectedDatesWithType({});
      setHalfDayTimes({});
      setIsBooking(false);

    } catch (error) {
      setIsBooking(false);
      console.error('❌ Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    }
  };

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
          if (otherId === guideId) {
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
    if (guide && currentUser) {
      setChatOtherUser({
        id: guide.id,
        name: guide.guideName || guide.fullName || 'Tour Guide',
        photo: guide.profilePicture || guide.imageUrl || '',
        role: 'guide'
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
    // Refresh guide data to update rating
    if (guideId) {
      const guideDoc = await getDoc(doc(db, 'serviceProviders', guideId));
      if (guideDoc.exists()) {
        const guideData = guideDoc.data();
        const transformedGuide = {
          id: guideDoc.id,
          guideName: guideData.fullName || guideData.guideName || 'Tour Guide',
          imageUrl: guideData.profilePicture || guideData.imageUrl || '',
          location: guideData.location || guideData.baseLocation || 'Sri Lanka',
          rating: typeof guideData.rating === 'number' ? guideData.rating :
            typeof guideData.rating === 'string' ? parseFloat(guideData.rating) || 0 : 0,
          totalReviews: guideData.totalReviews || 0,
          hourlyRate: guideData.hourlyRate || 0,
          dailyRate: guideData.dailyRate || 0,
          specialPackageRates: guideData.specialPackageRates || '',
          currencyPreference: guideData.currencyPreference || 'LKR',
          experience: guideData.experienceYears || guideData.experience || 0,
          specialQualifications: Array.isArray(guideData.specialQualifications) ? guideData.specialQualifications :
            guideData.specialQualifications ? [guideData.specialQualifications] : [],
          areasOfExpertise: Array.isArray(guideData.areasOfExpertise) ? guideData.areasOfExpertise :
            guideData.areasOfExpertise ? [guideData.areasOfExpertise] : [],
          destinations: Array.isArray(guideData.destinations) ? guideData.destinations :
            guideData.destinations ? [guideData.destinations] : [],
          certifications: Array.isArray(guideData.certifications) ? guideData.certifications :
            guideData.certifications ? [guideData.certifications] : [],
          certificationStatus: guideData.certificationStatus || 'non-certified',
          verificationDocuments: Array.isArray(guideData.verificationDocuments) ? guideData.verificationDocuments :
            guideData.verificationDocuments ? [guideData.verificationDocuments] : [],
          languages: Array.isArray(guideData.languages) ? guideData.languages :
            Array.isArray(guideData.languagesSpoken) ? guideData.languagesSpoken :
              guideData.languagesSpoken ? [guideData.languagesSpoken] :
                guideData.languages ? [guideData.languages] :
                  ['English', 'Sinhala'],
          contactPhone: guideData.contactPhone || guideData.phone || guideData.phoneNumber || 'Not provided',
          contactEmail: guideData.contactEmail || guideData.email || '',
          description: guideData.description || guideData.bio || 'Experienced tour guide',
          featured: guideData.featured || false,
          availability: guideData.availability !== false,
          availableDates: guideData.availableDates || [],
          priceFullDayStandard: guideData.priceFullDayStandard || guideData.dailyRate || 0,
          priceHalfDayStandard: guideData.priceHalfDayStandard || Math.round((guideData.dailyRate || 0) * 0.6),
          isCurrentUser: currentUser && currentUser.uid === guideId
        };

        // Fetch certification documents if guide is certified
        if (guideData.certificationStatus === 'certified') {
          try {
            const certDocRef = doc(db, 'guideCertifications', guideId);
            const certDocSnap = await getDoc(certDocRef);

            if (certDocSnap.exists()) {
              const certData = certDocSnap.data();
              console.log('✅ Certification documents found (refresh):', certData);

              if (certData.documents && Array.isArray(certData.documents)) {
                transformedGuide.certificationDocuments = certData.documents;
              }
            }
          } catch (err) {
            console.error('Error fetching certification documents (refresh):', err);
          }
        }

        setGuide(transformedGuide);
      }
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return 'LKR ';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guide profile...</p>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The guide you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/guide')}
            className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Browse All Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 flex flex-col lg:overflow-hidden lg:max-h-screen">
      {/* Booking Success Message */}
      {showSuccessMessage && successMessageData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col">
            <div className="text-center space-y-3">
              <div className="flex justify-center -mb-2">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-black" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Booking Successful!
                </h2>
                <p className="text-gray-600 text-sm">
                  Your booking request has been successfully submitted.
                </p>
                <p className="text-xs text-black font-semibold">
                  Please wait for the service provider's acceptance.
                </p>
              </div>

              {/* Enhanced Summary View - Receipt Style */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3 pb-3 border-b border-gray-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Guide:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.guideName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Destination:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.nationalPark || 'Selected Destination'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Passengers:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.numberOfPassengers} Person(s)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Total Days:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.numberOfDays} Day(s)</span>
                  </div>
                </div>

                {/* Individual Dates Breakdown */}
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Detailed Breakdown</h4>
                  {successMessageData.datesWithTypes?.map((dateInfo, index) => {
                    const dateObj = new Date(dateInfo.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const isHalf = dateInfo.type === 'half-day';
                    const timeLabel = isHalf ? (dateInfo.time === 'morning' ? '☀️ Morning' : '🌙 Evening') : '🌕 Full Day';

                    return (
                      <div key={index} className="flex justify-between items-center py-1.5 px-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800">{formattedDate}</span>
                          <span className={`text-[10px] ${isHalf ? 'text-amber-600' : 'text-emerald-600'} font-medium`}>
                            {timeLabel}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-black">
                          LKR {dateInfo.price?.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center bg-gray-900 text-white p-3 rounded-xl mt-4 shadow-lg">
                  <span className="text-sm font-bold">Grand Total:</span>
                  <div className="text-right">
                    <span className="text-lg font-black block leading-none">LKR {successMessageData.totalPrice.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400">Includes all service charges</span>
                  </div>
                </div>
              </div>

              {successMessageData.bookingId && (
                <p className="text-[10px] text-gray-400">
                  Booking ID: <span className="font-mono">{successMessageData.bookingId}</span>
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowSuccessMessage(false);
                setSuccessMessageData(null);
                if (guideId) {
                  navigate(`/guide-profile/${guideId}`, { replace: true });
                } else if (guide?.id) {
                  navigate(`/guide-profile/${guide.id}`, { replace: true });
                } else {
                  navigate('/guide', { replace: true });
                }
              }}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold shadow-lg cursor-pointer hover:bg-gray-800 transition-colors"
            >
              Got it!
            </button>
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

      <GlobalNotificationBell
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />


      <div className="bg-linear-to-r from-black via-gray-800 to-black border-b border-gray-300 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
            <div className="flex items-center">
              <button
                onClick={() => {
                  // Navigate back to guide listing page
                  navigate('/guide');
                  // The scroll will be handled by GuideSection2 component
                }}
                className="flex items-center text-white mr-3 sm:mr-4 md:mr-6 font-medium hover:text-gray-200 transition-colors touch-manipulation"
              >
                <ArrowLeft size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
                <span className="text-sm sm:text-base md:text-lg">
                  <span className="hidden sm:inline">Back to Guides</span>
                  <span className="sm:hidden">Back</span>
                </span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white">Tour Guide Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:overflow-hidden flex flex-col">
        <div className="w-full lg:flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col lg:h-full shadow-xl lg:overflow-y-auto">
              {/* Profile Header */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <img
                  src={guide.imageUrl || "/api/placeholder/120/120"}
                  alt={guide.guideName}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-black shadow-2xl mx-auto mb-2 sm:mb-2.5 md:mb-3"
                />
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black mb-1">{guide.guideName}</h2>
                <p className="text-gray-700 font-medium mb-2 sm:mb-2.5 md:mb-3 text-xs sm:text-sm md:text-base">Professional Tour Guide</p>

                {/* Rating */}
                <div className="flex items-center justify-center mt-2 sm:mt-2.5 md:mt-3 bg-gray-50 rounded-lg p-2 sm:p-2.5 md:p-3 border border-gray-300">
                  <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2">
                    {renderStars(guide.rating || 0)}
                    <span className="text-xs sm:text-sm font-semibold text-black">
                      {guide.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    {guide.totalReviews > 0 && (
                      <span className="text-xs sm:text-sm text-gray-600">
                        • {guide.totalReviews} reviews
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-3 sm:mb-4 md:mb-5 flex-1">
                {guide.contactPhone && guide.contactPhone !== 'Not provided' && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-gray-50 border border-gray-300">
                    <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                      <Phone size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black break-words">{guide.contactPhone}</span>
                  </div>
                )}

                {guide.contactEmail && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-gray-50 border border-gray-300">
                    <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                      <Mail size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black break-words">{guide.contactEmail}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {currentUser && userRole === 'tourist' && (
                  <>
                  </>
                )}

                {!currentUser && (
                  <button
                    onClick={() => {
                      if (onShowAuth) {
                        onShowAuth('login');
                      }
                    }}
                    className="w-full bg-black text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:bg-gray-800 transition-colors"
                  >
                    Login to Book
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden flex flex-col lg:flex-1 min-h-0 w-full">
              <div className="border-b border-gray-300 bg-linear-to-r from-gray-200 to-gray-100">
                <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'overview'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'services'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    <span className="hidden sm:inline">Service Packages</span>
                    <span className="sm:hidden">Packages</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'reviews'
                      ? 'border-black text-black bg-white'
                      : 'border-transparent text-gray-600 hover:text-black'
                      }`}
                  >
                    <span className="hidden sm:inline">Reviews</span>
                    <span className="sm:hidden">Rev</span>
                    {guide.totalReviews > 0 && ` (${guide.totalReviews})`}
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'booking'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                      <CalendarIcon size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 inline mr-1.5 sm:mr-2 md:mr-2.5" />
                      <span className="hidden sm:inline">Book Now</span>
                      <span className="sm:hidden">Book</span>
                    </button>
                  )}
                  {currentUser && hasAcceptedBooking && (
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        if (currentUser && guide) {
                          handleOpenChatModal();
                        }
                      }}
                      className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'chat'
                        ? 'border-black text-black bg-white'
                        : 'border-transparent text-gray-600 hover:text-black'
                        }`}
                    >
                      <span className="hidden sm:inline">Messages</span>
                      <span className="sm:hidden">Msg</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-2.5 sm:p-3 md:p-4 lg:p-5 lg:overflow-hidden lg:flex-1 bg-linear-to-b from-white to-gray-50 text-black">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* About - Moved to top */}
                    {guide.description && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">About</h3>
                        <p className="text-gray-700 leading-relaxed text-xs sm:text-sm line-clamp-3">
                          {guide.description}
                        </p>
                      </div>
                    )}

                    {/* Experience */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                        <Clock className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">Experience</h3>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                          {guide.experience || 0} years of experience as a professional tour guide
                        </p>
                      </div>
                    </div>

                    {/* Pricing - Guide's Registered Rates (Always Visible) */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                        <DollarSign className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-2 sm:mb-2.5 flex items-center text-xs sm:text-sm md:text-base">
                          Rates
                          {guide.certificationStatus === 'certified' && guide.certificationApproved && (
                            <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium border border-yellow-300">
                              Certified Rates
                            </span>
                          )}
                        </h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {/* Full Day Price */}
                          {guide.priceFullDayStandard > 0 ? (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Standard Full Day:</span>
                                <p className="text-xs text-emerald-600 mt-0.5">Full day safari tour guiding</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                  LKR {guide.priceFullDayStandard.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 block">/day</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-gray-800 font-bold text-xs sm:text-sm block">Full Day Tour:</span>
                                <p className="text-xs text-gray-600 mt-0.5">Full day guided tour</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs sm:text-sm text-gray-500 italic">Not Set</span>
                              </div>
                            </div>
                          )}
                          {/* Half Day Price */}
                          {guide.priceHalfDayStandard > 0 ? (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Standard Half Day:</span>
                                <p className="text-xs text-emerald-600 mt-0.5">Half day safari tour guiding</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                  LKR {guide.priceHalfDayStandard.toLocaleString()}
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 block">/half day</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="text-gray-800 font-bold text-xs sm:text-sm block">Half Day Tour:</span>
                                <p className="text-xs text-gray-600 mt-0.5">Half day guided tour</p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs sm:text-sm text-gray-500 italic">Not Set</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Languages */}
                    {guide.languages && guide.languages.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Languages className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Languages</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destination Covered (Always Visible) */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                        <MapPin className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Destination Covered</h3>
                        {guide.destinations && guide.destinations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.destinations.map((dest, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {dest}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500 italic">No destinations specified</p>
                        )}
                      </div>
                    </div>

                    {/* Certifications - Only for certified guides */}
                    {guide.certificationStatus === 'certified' && (guide.certificationDocuments?.length > 0 || guide.certifications?.length > 0) && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Award className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Certifications</h3>
                          <div className="space-y-1.5">
                            {/* Display certificationDocuments (with URLs) */}
                            {guide.certificationDocuments?.map((doc, index) => (
                              <div
                                key={`doc-${index}`}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-300 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  <FileText size={14} className="text-gray-600 shrink-0" />
                                  <span className="font-semibold truncate">{doc.certificationName || 'Certification'}</span>
                                </div>
                                {doc.fileUrl && (
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-blue-600 hover:text-blue-800 underline text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}

                            {/* Display certifications array (names only) */}
                            {guide.certifications?.filter(cert =>
                              !guide.certificationDocuments?.some(doc => doc.certificationName === cert)
                            ).map((cert, index) => (
                              <div
                                key={`cert-${index}`}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm border border-gray-300 flex items-center gap-1.5"
                              >
                                <FileText size={14} className="text-gray-600 shrink-0" />
                                <span className="font-semibold">{cert}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Areas of Expertise */}
                    {guide.areasOfExpertise && guide.areasOfExpertise.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Globe className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Areas of Expertise</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.areasOfExpertise.map((area, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Qualifications */}
                    {guide.specialQualifications && guide.specialQualifications.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <GraduationCap className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Special Qualifications</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.specialQualifications.map((qual, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verification Documents */}
                    {guide.verificationDocuments && guide.verificationDocuments.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <FileText className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Verification Documents</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {guide.verificationDocuments.map((doc, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Service Packages Tab */}
                {activeTab === 'services' && (
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* Check if packages exist */}
                    {guide.packages && guide.packages.length > 0 ? (
                      <div className="space-y-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-black mb-4">Available Service Packages</h2>
                        {guide.packages.map((pkg, index) => (
                          <div key={index} className="bg-white border-2 border-gray-300 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                              {/* Package Info */}
                              <div className="flex-1">
                                <h3 className="text-lg sm:text-xl font-bold text-black mb-2">{pkg.title || 'Tour Package'}</h3>
                                <p className="text-sm sm:text-base text-gray-600 mb-4">{pkg.description || ''}</p>
                              </div>

                              {/* Pricing - Tour Guide (Single set of prices) */}
                              <div className="flex flex-col gap-2 lg:min-w-[200px]">
                                {/* Full Day Price */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-700 text-sm font-medium">🚙 Full Day</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xl sm:text-2xl font-black text-emerald-700">
                                      LKR {pkg.fullDayPrice?.toLocaleString() || '0'}
                                    </span>
                                  </div>
                                </div>

                                {/* Half Day Price */}
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-700 text-sm font-medium">🚙 Half Day</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xl sm:text-2xl font-black text-emerald-700">
                                      LKR {pkg.halfDayPrice?.toLocaleString() || '0'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details - Shows ABOVE button when expanded */}
                            {expandedPackage === pkg.id && (pkg.rules || pkg.benefits || pkg.facilities) && (
                              <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                                {/* Rules & Regulations */}
                                {pkg.rules && pkg.rules.trim() && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                      Rules & Regulations
                                    </h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-200">
                                      {pkg.rules}
                                    </p>
                                  </div>
                                )}

                                {/* Benefits */}
                                {pkg.benefits && pkg.benefits.trim() && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                                      Benefits
                                    </h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                      {pkg.benefits}
                                    </p>
                                  </div>
                                )}

                                {/* Facilities */}
                                {pkg.facilities && pkg.facilities.trim() && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <Package className="h-4 w-4 text-purple-600" />
                                      Facilities
                                    </h4>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap bg-purple-50 p-3 rounded-lg border border-purple-200">
                                      {pkg.facilities}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Book Button */}
                            {currentUser && userRole === 'tourist' && (
                              <button
                                onClick={() => {
                                  // Select package and navigate to booking tab
                                  setSelectedPackage(pkg);
                                  setActiveTab('booking');
                                  setSelectedDates([]);
                                  setDateBookingTypes({});
                                }}
                                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                              >
                                <CalendarIcon className="h-5 w-5" />
                                Book This Package
                              </button>
                            )}

                            {/* Expand/Collapse Trigger - BELOW button */}
                            {(pkg.rules || pkg.benefits || pkg.facilities) && (
                              <div
                                className="text-center text-sm text-gray-500 mt-3 cursor-pointer hover:text-gray-700 transition-colors"
                                onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id)}
                              >
                                {expandedPackage === pkg.id ? 'Click to collapse' : 'Click to see more details'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                          No Packages Available
                        </h3>
                        <p className="text-gray-500">
                          This service provider hasn't created any packages yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Tab */}
                {activeTab === 'booking' && currentUser && userRole === 'tourist' && (
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:h-full lg:overflow-y-auto pr-1 sm:pr-2">
                    {/* Package Info Banner (if package is selected) */}
                    {selectedPackage && (
                      <div className="bg-linear-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-400 rounded-lg p-4 mb-4 relative">
                        {/* Close/Unselect Button */}
                        <button
                          onClick={() => {
                            // Clear selected package
                            setSelectedPackage(null);
                            // Reset selections to start fresh
                            setSelectedDates([]);
                            setSelectedDatesWithType({});
                            setHalfDayTimes({});
                            setDateTypeMenuDate(null);
                            setShowTimeMenu(false);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white border border-emerald-400 text-emerald-700 hover:text-emerald-900 transition-all hover:scale-110"
                          title="Remove package and return to normal booking"
                        >
                          <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-6 w-6 text-emerald-600" />
                          <h3 className="text-lg font-bold text-emerald-900 pr-8">{selectedPackage.title}</h3>
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1 text-emerald-700">
                              <span className="font-semibold">Full Day:</span>
                              <span>LKR {selectedPackage.fullDayPrice?.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-700">
                              <span className="font-semibold">Half Day:</span>
                              <span>LKR {selectedPackage.halfDayPrice?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-emerald-600 mt-2 italic">
                          📦 Package booking mode active - Click X to return to regular booking
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                      {/* Calendar */}
                      <div className="min-h-0">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3 md:mb-4">
                          <CalendarIcon className="h-5 w-5 text-gray-700" />
                          <h3 className="font-semibold text-black text-xs sm:text-sm md:text-base">
                            {selectedPackage ? 'Step 1: Select Your Dates' : 'Step 1: Select Your Dates'}
                          </h3>
                        </div>
                        <div className="overflow-y-auto max-h-[300px] sm:max-h-[350px] md:max-h-[400px] relative">
                          <div>
                            <DatePickerCalendar
                              selectedDates={selectedDates}
                              onDateSelect={(date) => {
                                if (selectedDates.find(d => d.toDateString() === date.toDateString())) {
                                  // If date is already selected, remove it
                                  handleDateSelect(date);
                                  setDateTypeMenuDate(null);
                                } else {
                                  // If date is NOT selected, just open the modal - DON'T add date yet
                                  setDateTypeMenuDate(date.toDateString());
                                }
                              }}
                              selectedDatesWithType={selectedDatesWithType}
                              availabilityCalendar={guide?.availabilityCalendar}
                              availableDates={guide?.availableDates}
                              onDateTypeChange={handleDateTypeChange}
                              onDateDoubleClick={(date) => {
                                handleDateSelect(date);
                                setDateTypeMenuDate(null);
                              }}
                            />

                            {/* Date Type Menu (Full Day / Half Day) - Smaller Size */}
                            {dateTypeMenuDate && (
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-3 min-w-[200px]">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-xs font-semibold text-black text-center flex-1">
                                    {new Date(dateTypeMenuDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                  </h4>
                                  <button
                                    onClick={() => {
                                      setDateTypeMenuDate(null);
                                      setShowTimeMenu(false);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    aria-label="Close"
                                  >
                                    <X className="h-4 w-4 text-gray-600" />
                                  </button>
                                </div>
                                {!showTimeMenu ? (
                                  <div className="space-y-1.5">
                                    <button
                                      onClick={() => {
                                        // Add the date with 'full-day' type
                                        const date = new Date(dateTypeMenuDate);
                                        handleDateSelect(date, 'full-day');
                                        setDateTypeMenuDate(null);
                                        setShowTimeMenu(false);
                                      }}
                                      className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Full Day
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowTimeMenu(true);
                                      }}
                                      className="w-full px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Half Day
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Cancel - don't add the date
                                        setDateTypeMenuDate(null);
                                        setShowTimeMenu(false);
                                      }}
                                      className="w-full px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <h4 className="text-xs font-semibold text-black mb-1.5 text-center">
                                      Select Time
                                    </h4>
                                    <button
                                      onClick={() => {
                                        // Add the date with 'half-day' type and morning time
                                        const date = new Date(dateTypeMenuDate);
                                        const dateString = date.toDateString();
                                        handleDateSelect(date, 'half-day');
                                        setHalfDayTimes(prev => ({
                                          ...prev,
                                          [dateString]: 'morning'
                                        }));
                                        setDateTypeMenuDate(null);
                                        setShowTimeMenu(false);
                                      }}
                                      className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Morning
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Add the date with 'half-day' type and evening time
                                        const date = new Date(dateTypeMenuDate);
                                        const dateString = date.toDateString();
                                        handleDateSelect(date, 'half-day');
                                        setHalfDayTimes(prev => ({
                                          ...prev,
                                          [dateString]: 'evening'
                                        }));
                                        setDateTypeMenuDate(null);
                                        setShowTimeMenu(false);
                                      }}
                                      className="w-full px-3 py-1.5 bg-yellow-700 hover:bg-yellow-800 text-white rounded text-xs font-medium transition-colors"
                                    >
                                      Evening
                                    </button>
                                    <button
                                      onClick={() => setShowTimeMenu(false)}
                                      className="w-full px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-colors"
                                    >
                                      Back
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Booking Summary */}
                      <div className="space-y-2.5 sm:space-y-3 md:space-y-4 min-h-0">
                        <div className="bg-white border border-gray-300 rounded-lg p-2.5 sm:p-3 md:p-4">
                          <h3 className="font-semibold text-black mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">Booking Summary</h3>

                          {selectedDates.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                              <CalendarIcon className="h-10 w-10 text-gray-300 mb-2" />
                              <p className="text-gray-500 text-xs sm:text-sm">
                                Select dates to see booking details
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 sm:space-y-3">
                              {/* Package Information */}
                              {selectedPackage && (
                                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2 sm:p-2.5 mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="h-4 w-4 text-emerald-600" />
                                    <span className="text-emerald-800 font-semibold text-xs sm:text-sm">Package Booking</span>
                                  </div>
                                  <p className="text-emerald-700 text-xs font-medium">{selectedPackage.title}</p>
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 text-xs sm:text-sm">Selected dates:</span>
                                <span className="font-medium text-black text-xs sm:text-sm">{selectedDates.length} day(s)</span>
                              </div>

                              {/* Show breakdown of dates and their types */}
                              <div className="space-y-1.5 sm:space-y-2 bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-300 max-h-[150px] sm:max-h-[180px] md:max-h-[200px] overflow-y-auto custom-scrollbar">
                                {selectedDates.sort((a, b) => a - b).map((date, index) => {
                                  const dateString = date.toDateString();
                                  const dateType = selectedDatesWithType[dateString] || 'full-day';
                                  const timeOfDay = halfDayTimes[dateString] || '';

                                  // Calculate price based on booking type
                                  const dayPrice = dateType === 'half-day'
                                    ? (selectedPackage ? (selectedPackage.halfDayPrice || 0) : (guide.priceHalfDayStandard || (guide.dailyRate || 0) * 0.6))
                                    : (selectedPackage ? (selectedPackage.fullDayPrice || 0) : (guide.priceFullDayStandard || guide.dailyRate || 0));

                                  return (
                                    <div key={index} className="flex justify-between items-center text-xs">
                                      <span className="text-gray-700 flex-1 min-w-0 pr-2">
                                        {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-semibold ${dateType === 'half-day' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                          {dateType === 'half-day' ? 'Half Day' : 'Full Day'}
                                        </span>
                                        {timeOfDay && (
                                          <span className="ml-1 text-[10px] text-gray-500">
                                            ({timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'})
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-medium text-black shrink-0">
                                        LKR {dayPrice.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="border-t border-gray-300 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm sm:text-base md:text-lg font-semibold text-black">Total:</span>
                                  <span className="text-xl sm:text-2xl text-black font-black">
                                    LKR {calculateTotal().toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => setShowBookingForm(true)}
                                className="w-full bg-black text-white py-3 px-4 rounded-xl font-bold mt-2 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={selectedDates.length === 0}
                              >
                                <span>Continue to Booking Details</span>
                                <CheckCircle className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    <ReviewSection
                      guideId={guideId}
                      currentUser={currentUser}
                      userRole={userRole}
                      onReviewAdded={handleReviewAdded}
                    />
                  </div>
                )}

                {/* Chat Tab - Opens Chat Modal */}
                {activeTab === 'chat' && (
                  <div className="min-h-[300px] lg:h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                    {currentUser ? (
                      <div className="text-center">
                        <MessageCircle size={48} className="sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 text-black" />
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black mb-2">
                          Chat with {guide.guideName || guide.fullName || 'Tour Guide'}
                        </h3>
                        <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-4 sm:mb-6">
                          Click the button below to open the chat window
                        </p>
                        <button
                          onClick={handleOpenChatModal}
                          className="bg-gray-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 mx-auto text-xs sm:text-sm md:text-base"
                        >
                          <MessageCircle size={16} className="sm:w-5 sm:h-5" />
                          Open Chat
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <MessageCircle size={40} className="sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-3 sm:mb-4 text-gray-400" />
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-black mb-2">
                          Login to Message
                        </h3>
                        <p className="text-gray-700 text-xs sm:text-sm mb-4">
                          Please login to start a conversation with {guide.guideName || guide.fullName || 'this guide'}
                        </p>
                        <button
                          onClick={() => {
                            if (onShowAuth) {
                              onShowAuth('login');
                            }
                          }}
                          className="bg-gray-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm"
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
        guide={guide}
        selectedDates={selectedDates}
        selectedDatesWithType={selectedDatesWithType}
        onDateTypeChange={handleDateTypeChange}
        selectedPackage={selectedPackage}
        halfDayTimes={halfDayTimes}
      />
    </div >
  );
};

export default GuideProfile;