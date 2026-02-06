import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
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
  Plus,
  Minus,
  Navigation,
  Package,
  UserCircle,
  Globe,
  FileText
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
// Use auth from App.jsx instead of creating new instance

// Import Supabase helper for document URLs
import { getDocumentUrl } from '../../lib/supabase';

// Import the fixed ReviewSection component
import ReviewSection from "../ReviewSection";


// Import Chat component
import Chat from "../Chat";



// Import rating update function
import { updateDriverRating } from "../../reviewservice";

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
  GlobalNotificationBell,
} from "../../App";

// Calendar Component for Date Selection with Availability Display
const DatePickerCalendar = ({ selectedDates, onDateSelect, selectedDatesWithType, onDateTypeChange, availabilityCalendar, acceptedBookings, availableDates, onDateDoubleClick }) => {
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

  const getDateKey = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAvailabilityStatus = (date) => {
    if (!date) return null;
    const key = getDateKey(date);

    // Initial check for manual settings and bookings
    let manualUnavailableMorning = false;
    let manualUnavailableEvening = false;
    let manualUnavailableFull = false;

    if (availabilityCalendar && typeof availabilityCalendar === 'object' && !Array.isArray(availabilityCalendar)) {
      const savedStatus = availabilityCalendar[key];
      if (savedStatus === 'busy' || savedStatus === 'unavailable' || savedStatus === 'unavailable-fullday') {
        manualUnavailableFull = true;
      } else if (savedStatus === 'unavailable-halfday-morning' || savedStatus === 'halfday-morning') {
        manualUnavailableMorning = true;
      } else if (savedStatus === 'unavailable-halfday-evening' || savedStatus === 'halfday-evening') {
        manualUnavailableEvening = true;
      }
    }

    if (manualUnavailableFull) return 'unavailable';

    let bookedMorning = false;
    let bookedEvening = false;
    let bookedFullDay = false;

    if (acceptedBookings && Array.isArray(acceptedBookings)) {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const checkTime = checkDate.getTime();

      for (const booking of acceptedBookings) {
        if (booking.datesWithTypes && Array.isArray(booking.datesWithTypes)) {
          const match = booking.datesWithTypes.find(dt => {
            const d = new Date(dt.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });

          if (match) {
            if (match.type === 'half-day') {
              const safariTypeLower = (match.safariType || '').toLowerCase();
              const isEvening = safariTypeLower.includes('evening') || safariTypeLower.includes('pm') || match.time === 'evening';
              if (isEvening) bookedEvening = true;
              else bookedMorning = true;
            } else {
              bookedFullDay = true;
            }
          }
        } else if (booking.selectedDates && Array.isArray(booking.selectedDates)) {
          const match = booking.selectedDates.some(sd => {
            const d = new Date(sd);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });
          if (match) bookedFullDay = true;
        } else if (booking.dates && Array.isArray(booking.dates)) {
          const match = booking.dates.some(sd => {
            let d;
            if (sd && sd.toDate) d = sd.toDate();
            else d = new Date(sd);
            if (isNaN(d.getTime())) return false;
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });
          if (match) bookedFullDay = true;
        }
      }
    }

    if (bookedFullDay) return 'busy';

    const morningOccupied = bookedMorning || manualUnavailableMorning;
    const eveningOccupied = bookedEvening || manualUnavailableEvening;

    if (morningOccupied && eveningOccupied) {
      if (bookedMorning && bookedEvening) return 'busy';
      if (bookedMorning && manualUnavailableEvening) return 'halfbooked-halfunavailable-morning';
      if (bookedEvening && manualUnavailableMorning) return 'halfbooked-halfunavailable-evening';
      return 'unavailable';
    }

    if (bookedMorning) return 'halfday-morning';
    if (bookedEvening) return 'halfday-evening';
    if (manualUnavailableMorning) return 'unavailable-halfday-morning';
    if (manualUnavailableEvening) return 'unavailable-halfday-evening';

    if (availableDates && Array.isArray(availableDates) && availableDates.length > 0) {
      const isInArray = availableDates.some(availableDate => {
        const d = new Date(availableDate);
        return getDateKey(d) === key;
      });
      return isInArray ? null : 'unavailable';
    }

    return null;
  };

  const isDateAvailable = (date) => {
    const status = getAvailabilityStatus(date);
    // Available if:
    // - No status (null/undefined)
    // - Explicitly marked as 'available'
    // - Only ONE half-day slot is occupied (allowing booking of the other slot)
    // NOT available if:
    // - 'unavailable' (both slots occupied)
    // - 'busy' (full day booked)
    // Block fully unavailable days
    if (
      status === 'unavailable' ||
      status === 'unavailable-fullday' ||
      status === 'busy' ||
      status === 'halfbooked-halfunavailable-morning' ||
      status === 'halfbooked-halfunavailable-evening'
    ) return false;

    // Default (no status) = available
    if (!status) return true;

    // Allow partial availability (one slot free) or explicitly available
    return (
      status === 'available' ||
      status === 'halfday-morning' ||
      status === 'halfday-evening' ||
      status === 'unavailable-halfday-morning' ||
      status === 'unavailable-halfday-evening'
    );
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    return selectedDates.some(selectedDate =>
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDatePast = (date) => {
    if (!date) return false;

    // Create date objects for comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Get current time in Sri Lanka (UTC+5:30)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const slTime = new Date(utc + (3600000 * 5.5));

    // Create 'today' based on SL time
    const slToday = new Date(slTime);
    slToday.setHours(0, 0, 0, 0);

    // Strict past check
    if (checkDate < slToday) return true;

    // "Today" check with deadline
    if (checkDate.getTime() === slToday.getTime()) {
      // If currently past 12:00 PM in SL, then today is "past" for booking
      // This prevents bookings for the current day after 12 PM
      if (slTime.getHours() >= 12) {
        return true;
      }
    }

    return false;
  };

  const [lastClickTime, setLastClickTime] = useState({});

  const handleDateClick = (date) => {
    if (!date || isDatePast(date)) return;
    if (!isDateAvailable(date)) return; // Don't allow selection of unavailable dates

    // Handle double-click to unselect
    const dateKey = date.toDateString();
    const now = Date.now();
    const lastClick = lastClickTime[dateKey] || 0;

    if (now - lastClick < 300) { // Double click within 300ms
      // Double-clicked - unselect if already selected
      const isSelected = selectedDates.some(d => d.toDateString() === dateKey);
      if (isSelected && onDateDoubleClick) {
        onDateDoubleClick(date);
        return;
      }
    }

    setLastClickTime(prev => ({ ...prev, [dateKey]: now }));
    onDateSelect(date);
  };

  const getDateClassName = (date) => {
    if (!date) return '';
    const status = getAvailabilityStatus(date);
    const selected = isDateSelected(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const isPast = isDatePast(date);

    const baseClasses = 'relative w-full h-8 sm:h-10 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium flex items-center justify-center cursor-pointer';

    if (isPast) {
      return `${baseClasses} bg-gray-800/50 text-gray-600 cursor-not-allowed`;
    }

    if (selected) {
      const dateString = date.toDateString();
      const dateType = selectedDatesWithType[dateString] || 'full-day';
      // Highlight selected dates in red (full day) or yellow (half day) without outline
      if (dateType === 'half-day') {
        return `${baseClasses} bg-yellow-500 text-white shadow-lg`;
      } else {
        return `${baseClasses} bg-red-600 text-white shadow-lg`;
      }
    }

    // Handle availability statuses
    // End-user view simplified to 2 colors for occupied states:
    // 1. Unavailable (Gray) - Covers Booked, Manual Unavailable, and Past dates
    // 2. Partial (Orange) - Covers half-day booked/unavailable

    if (status === 'busy' || status === 'unavailable' || status === 'unavailable-fullday' ||
      status === 'halfbooked-halfunavailable-morning' || status === 'halfbooked-halfunavailable-evening') {
      return `${baseClasses} bg-gray-600 text-white cursor-not-allowed shadow-sm`;
    } else if (status === 'halfday-morning' || status === 'halfday-evening' ||
      status === 'unavailable-halfday-morning' || status === 'unavailable-halfday-evening') {
      return `${baseClasses} bg-orange-500 text-white hover:bg-orange-600 shadow-sm`;
    } else if (status === 'available') {
      // Explicitly marked available -> Green/Light
      return `${baseClasses} ${isToday ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'}`;
    } else {
      // No status = AVAILABLE by default -> Green/Light
      return `${baseClasses} ${isToday ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'}`;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/40 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-white">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 rotate-180" />
        </button>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-2 bg-gray-800/30 rounded-lg border border-gray-700/40">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-green-500/20 border border-green-500/30 rounded"></div>
          <span className="text-gray-300">Available</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-gray-600 rounded"></div>
          <span className="text-gray-300">Unavailable</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span className="text-gray-300">Partial</span>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="h-8 sm:h-10"></div>;
          }

          const dateKey = getDateKey(day);
          const status = getAvailabilityStatus(day);
          const isPast = isDatePast(day);
          const isAvailable = isDateAvailable(day);

          return (
            <button
              key={dateKey || `day-${index}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isPast && isAvailable) {
                  handleDateClick(day);
                }
              }}
              disabled={!isAvailable || isPast}
              className={getDateClassName(day)}
              title={(() => {
                if (isPast) return 'Past date';
                if (status === 'busy') return 'Full day booked - Not available';
                if (status === 'halfbooked-halfunavailable-morning') return 'AM booked / PM unavailable - Not available';
                if (status === 'halfbooked-halfunavailable-evening') return 'PM booked / AM unavailable - Not available';
                if (status === 'halfday-morning' || status === 'unavailable-halfday-morning') return 'Morning booked/unavailable - Evening available';
                if (status === 'halfday-evening' || status === 'unavailable-halfday-evening') return 'Evening booked/unavailable - Morning available';
                if (status === 'unavailable' || status === 'unavailable-fullday') return 'Unavailable';
                return 'Available - Click to select';
              })()}
            >
              <span className="z-10 relative">{day.getDate()}</span>
              {(status && status.includes('half') && !status.includes('halfbooked')) && (
                <span className="absolute bottom-1 text-[9px] leading-none font-bold text-white uppercase tracking-wider">
                  {status.includes('morning') ? 'PM' : 'AM'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Simple Alert Modal Component
const SimpleAlertModal = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-fadeIn transition-all transform scale-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Attention Needed</h3>
          <p className="text-gray-600 mb-6 whitespace-pre-line text-sm">{message}</p>
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Okay, got it
          </button>
        </div>
      </div>
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
  onDateTypeChange,
  selectedPackage,
  selectedVehicleType,
  halfDayTimes
}) => {
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });

  const showAlert = (message) => {
    setAlertInfo({ show: true, message });
  };
  // Filter out step 4 (Additional Requests) if booking a package
  // Emergency Contact step removed - form submits from Additional Requests (normal) or Pickup & Drop-off (package)
  const allSteps = [
    { number: 1, title: 'Personal', shortTitle: 'Personal', icon: User },
    { number: 2, title: 'Safari Details', shortTitle: 'Safari', icon: Calendar },
    { number: 3, title: 'Pickup & Drop-off', shortTitle: 'Pickup', icon: Navigation },
    { number: 4, title: 'Additional Requests', shortTitle: 'Add-ons', icon: Package }
  ];

  const steps = selectedPackage
    ? allSteps.filter(step => step.number !== 4).map((step, index) => ({
      ...step,
      number: index + 1 // Re-number steps
    }))
    : allSteps;

  console.log('📊 Modal State - currentStep:', currentStep, '| stepsLength:', steps.length, '| hasPackage:', !!selectedPackage);

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
      if (!formData.numberOfPassengers || formData.numberOfPassengers < 1 || formData.numberOfPassengers > 6) {
        errors.numberOfPassengers = 'Number of passengers must be between 1 and 6';
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
    } else if (currentStep === 4 && !selectedPackage) {
      // Step 4: Additional Requests (only for non-package bookings) - Final step for normal bookings
      // Check if snack quantities has at least one item with count > 0
      const hasSnacks = formData.snackQuantities && Object.values(formData.snackQuantities).some(val => val > 0);

      if (formData.needsSnacks && !hasSnacks) {
        errors.selectedSnacks = 'Please select at least one snack/meal';
      }
    }

    setFormErrors(errors);

    // If there are errors, show an alert with details and scroll to first error
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const errorMessages = Object.entries(errors).map(([field, msg]) => {
        return `${msg}`;
      }).join('\n');

      showAlert(`Please address the following:\n\n${errorMessages}`);

      // Scroll to and focus the first error field
      setTimeout(() => {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }, 200);

      return false; // Prevent form submission
    }

    return true; // Allow form submission
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-4xl w-full my-2 sm:my-8 max-h-[98vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-black to-gray-900 rounded-t-lg sm:rounded-t-2xl p-3 sm:p-6 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold truncate">Booking Details</h1>
                <p className="text-gray-300 text-xs sm:text-sm hidden sm:block">Complete your booking information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg cursor-pointer shrink-0 ml-2"
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
                <div key={step.number} className="flex items-start shrink-0" style={{ width: 'calc(16.666% - 8px)' }}>
                  <div className="flex flex-col items-center w-full">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 ${isActive ? 'bg-black border-black text-white' :
                      isCompleted ? 'bg-gray-100 border-black text-black' :
                        'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </div>
                    <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${isActive ? 'text-black' : 'text-gray-500'
                      }`}>
                      <span className="hidden sm:inline">{step.title}</span>
                      <span className="sm:hidden">{step.shortTitle}</span>
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block h-0.5 w-full mx-1 sm:mx-2 -mt-4 sm:-mt-6 ${isCompleted ? 'bg-black' : 'bg-gray-200'
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
                <User className="h-5 w-5 text-black" />
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
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                      let value = e.target.value.replace(/[^0-9+]/g, '');

                      // Format: +94 XX XXX XXXX
                      if (value.startsWith('+94')) {
                        // Remove +94 prefix for processing
                        const digits = value.slice(3);
                        // Limit to 9 digits after +94
                        const limitedDigits = digits.slice(0, 9);
                        // Format with spaces: +94 XX XXX XXXX
                        let formatted = '+94';
                        if (limitedDigits.length > 0) {
                          formatted += ' ' + limitedDigits.slice(0, 2);
                        }
                        if (limitedDigits.length > 2) {
                          formatted += ' ' + limitedDigits.slice(2, 5);
                        }
                        if (limitedDigits.length > 5) {
                          formatted += ' ' + limitedDigits.slice(5, 9);
                        }
                        value = formatted;
                      } else if (value.startsWith('0')) {
                        // If starts with 0, convert to +94
                        const digits = value.slice(1);
                        const limitedDigits = digits.slice(0, 9);
                        let formatted = '+94';
                        if (limitedDigits.length > 0) {
                          formatted += ' ' + limitedDigits.slice(0, 2);
                        }
                        if (limitedDigits.length > 2) {
                          formatted += ' ' + limitedDigits.slice(2, 5);
                        }
                        if (limitedDigits.length > 5) {
                          formatted += ' ' + limitedDigits.slice(5, 9);
                        }
                        value = formatted;
                      }

                      updateFormData('phone', value);
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.country ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.numberOfPassengers ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                      }`}
                  />
                  {formErrors.numberOfPassengers && <p className="text-red-500 text-xs mt-1">{formErrors.numberOfPassengers}</p>}
                </div>
              </div>
            </div>

          )}

          {/* Step 2: Safari Booking Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-black" />
                Safari Booking Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National Park <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="nationalPark"
                    id="nationalPark"
                    value={formData.nationalPark}
                    onChange={(e) => updateFormData('nationalPark', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-gray-50 appearance-none pr-10 ${formErrors.nationalPark ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                      }`}
                    disabled={!!(driver?.destinations && driver.destinations.length > 0)}
                  >
                    <option value={formData.nationalPark}>{formData.nationalPark || 'Select National Park'}</option>
                  </select>
                  {formErrors.nationalPark && <p className="text-red-500 text-xs mt-1">{formErrors.nationalPark}</p>}
                  {formData.nationalPark && (
                    <p className="text-xs text-gray-600 mt-1">
                      Park Ticket: LKR {getParkTicketPrice(formData.nationalPark).toLocaleString()} per person
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Dates Summary */}
              {selectedDates.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    Booking Summary
                  </h3>

                  {/* Package Information (if booking a package) */}
                  {selectedPackage && (
                    <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-900">Package Booking</span>
                      </div>
                      <p className="text-sm font-medium text-emerald-800 mb-1">{selectedPackage.title}</p>
                      <div className="flex gap-3 text-xs text-emerald-700">
                        {selectedVehicleType ? (
                          <>
                            <span>Full Day: LKR {
                              (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep
                                ? (selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice)
                                : (selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice)
                              )?.toLocaleString()
                            }</span>
                            <span>Half Day: LKR {
                              (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep
                                ? (selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice)
                                : (selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice)
                              )?.toLocaleString()
                            }</span>
                          </>
                        ) : (
                          <>
                            <span>Full Day: LKR {selectedPackage.fullDayPrice?.toLocaleString()}</span>
                            <span>Half Day: LKR {selectedPackage.halfDayPrice?.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-emerald-600 mt-2">📦 All package amenities included • {selectedVehicleType || 'Select jeep type'}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      You have selected <strong>{selectedDates.length}</strong> date{selectedDates.length > 1 ? 's' : ''}.
                    </p>
                    {selectedDates.map((date, index) => {
                      const dateString = date.toDateString();
                      const dateType = selectedDatesWithType[dateString] || 'full-day';
                      const safariType = formData.dateSafariTypes?.[dateString] || formData.safariType || 'Morning Safari';
                      const timeOfDay = halfDayTimes[dateString];
                      return (
                        <div key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black shrink-0"></span>
                          <div>
                            <p className="font-medium">{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-gray-600">
                              {dateType === 'half-day' ? 'Half Day' : 'Full Day'}
                              {timeOfDay ? ` (${timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'})` : ''}
                              - {timeOfDay ? (timeOfDay === 'morning' ? 'Morning Safari' : 'Evening Safari') : safariType}
                              {selectedPackage && <span className="text-emerald-600 ml-1">📦</span>}
                            </p>
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
                <Navigation className="h-5 w-5 text-black" />
                Pickup & Drop-off Information
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.needsHotelPickup}
                    onChange={(e) => updateFormData('needsHotelPickup', e.target.checked)}
                    className="w-5 h-5 text-black rounded focus:ring-black"
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
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.hotelAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.pickupLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
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
                        className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.dropoffLocation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black'
                          }`}
                      />
                      {formErrors.dropoffLocation && <p className="text-red-500 text-xs mt-1">{formErrors.dropoffLocation}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Additional Requests - Abbreviated (Hidden for package bookings) */}
          {currentStep === 4 && !selectedPackage && (
            <>
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-black" />
                  Additional Requests / Add-Ons
                </h2>
                {(() => {
                  const addOns = [
                    { key: 'needsBinoculars', countKey: 'binocularsCount', label: 'Binoculars', price: 500, icon: '🔭' },
                    { key: 'needsChildSeat', countKey: 'childSeatCount', label: 'Child Seat', price: 1000, icon: '👶' },
                    { key: 'needsWater', countKey: 'waterBottleCount', label: 'Water Bottles', price: 300, icon: '💧' }
                  ];

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {addOns.map(({ key, countKey, label, price, icon }) => {
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newCount = Math.max(0, count - 1);
                                    updateFormData(countKey, newCount);
                                    // Update the boolean flag as well
                                    updateFormData(key, newCount > 0);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-bold text-gray-900">{count}</span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">Qty</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const newCount = (count || 0) + 1;
                                    updateFormData(countKey, newCount);
                                    // Update the boolean flag as well
                                    updateFormData(key, true);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Snacks / Meals Toggle Section */}
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
                    </>
                  );
                })()}
              </div>

              {formData.needsSnacks && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
                    Available Snacks & Meals:
                    <span className="text-xs text-emerald-600 font-medium">* Use +/- to add items</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: 'Biscuits', price: 200 },
                      { name: 'Chips', price: 250 },
                      { name: 'Fruits', price: 400 },
                      { name: 'Sandwiches', price: 500 },
                      { name: 'Rice & Curry', price: 800 },
                      { name: 'Fried Rice', price: 700 },
                      { name: 'Noodles', price: 600 },
                      { name: 'Soft Drinks', price: 150 }
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
                                  <Minus className="w-3.5 h-3.5" />
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
                                  <Plus className="w-3.5 h-3.5" />
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
            </>
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
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-black text-white rounded-lg font-medium flex-1 sm:flex-none hover:bg-gray-800 transition-colors"
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
                    showAlert('An error occurred. Please try again.');
                  }
                } else {
                  console.warn('⚠️ Step validation failed');
                }
              }}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-black text-white rounded-none font-medium flex-1 sm:flex-none cursor-pointer hover:bg-gray-800 transition-colors"
            >
              Confirm Booking
            </button>
          )}
        </div>
      </div>

      <SimpleAlertModal
        isOpen={alertInfo.show}
        message={alertInfo.message}
        onClose={() => setAlertInfo({ ...alertInfo, show: false })}
      />
    </div >
  );
};

// Old ChatModal component removed - using Chat component instead

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

const JeepProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { jeepId } = useParams(); // Get jeepId from URL parameter
  // const messagesEndRef = useRef(null); // Removed - using Chat component instead

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [expandedPackage, setExpandedPackage] = useState(null); // For expand/collapse functionality
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
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [dateTypeMenuDate, setDateTypeMenuDate] = useState(null);
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [halfDayTimes, setHalfDayTimes] = useState({}); // {dateString: 'morning' | 'evening'}
  const [acceptedBookings, setAcceptedBookings] = useState([]); // Store accepted bookings

  // Reset showTimeMenu when dateTypeMenuDate changes
  useEffect(() => {
    if (!dateTypeMenuDate) {
      setShowTimeMenu(false);
    }
  }, [dateTypeMenuDate]);
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
    // Additional Requests
    needsBinoculars: false,
    needsChildSeat: false,
    needsWater: false,
    needsSnacks: false,
    // Add-on Counts
    binocularsCount: 0,
    childSeatCount: 0,
    waterBottleCount: 0,
    // Snack Quantities
    selectedSnacks: [], // Keep for backward compatibility or simple check
    snackQuantities: {}, // { 'Biscuits': 2, ... }
    dateSafariTypes: {}
  });

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);
  const [hasAcceptedBooking, setHasAcceptedBooking] = useState(false);
  const [hasPaidBooking, setHasPaidBooking] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const driverId = jeepId || searchParams.get('driverId'); // Use jeepId from URL params, fallback to query params
  const openChat = searchParams.get('openChat');

  // Fetch accepted bookings for this driver
  useEffect(() => {
    if (!driverId) return;

    const fetchAcceptedBookings = async () => {
      const db = getFirestore();
      try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
          bookingsRef,
          where('driverId', '==', driverId)
        );
        const querySnapshot = await getDocs(q);
        const bookings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Include both accepted and confirmed bookings
          if (data.status === 'accepted' || data.status === 'confirmed') {
            bookings.push({ id: doc.id, ...data });
          }
        });
        console.log("Fetched Bookings for Calendar:", bookings);
        setAcceptedBookings(bookings);
      } catch (error) {
        console.error("Error fetching accepted bookings:", error);
      }
    };

    fetchAcceptedBookings();
  }, [driverId]);

  // Check for paid booking for this specific provider to show contact info
  useEffect(() => {
    const checkPaidBooking = async () => {
      if (!currentUser || !driverId) {
        setHasPaidBooking(false);
        setHasAcceptedBooking(false);
        return;
      }

      try {
        const bookingsRef = collection(db, 'bookings');

        // Use a single query to get all bookings between this user and driver
        const q = query(
          bookingsRef,
          where('driverId', '==', driverId)
        );

        const querySnapshot = await getDocs(q);
        let hasPaid = false;
        let hasAccepted = false;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const isUserBooking = data.customerId === currentUser.uid ||
            data.touristId === currentUser.uid ||
            data.userId === currentUser.uid;

          if (isUserBooking) {
            if (data.paymentStatus === 'paid' || data.status === 'confirmed' || data.status === 'completed') {
              hasPaid = true;
            }
            if (data.status === 'accepted' || data.status === 'confirmed' || data.status === 'completed') {
              hasAccepted = true;
            }
          }
        });

        // Try alternative field name providerId if nothing found
        if (!hasPaid && !hasAccepted) {
          const q2 = query(
            bookingsRef,
            where('providerId', '==', driverId)
          );
          const querySnapshot2 = await getDocs(q2);
          querySnapshot2.forEach((doc) => {
            const data = doc.data();
            const isUserBooking = data.customerId === currentUser.uid ||
              data.touristId === currentUser.uid ||
              data.userId === currentUser.uid;

            if (isUserBooking) {
              if (data.paymentStatus === 'paid' || data.status === 'confirmed' || data.status === 'completed') {
                hasPaid = true;
              }
              if (data.status === 'accepted' || data.status === 'confirmed' || data.status === 'completed') {
                hasAccepted = true;
              }
            }
          });
        }

        setHasPaidBooking(hasPaid);
        setHasAcceptedBooking(hasAccepted);
      } catch (error) {
        console.error('Error checking paid booking:', error);
      }
    };

    checkPaidBooking();
  }, [currentUser, driverId]);

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

  // Track recently viewed when profile is loaded
  useEffect(() => {
    if (driverId && currentUser && driver) {
      trackActivity(currentUser.uid, 'view', driverId, 'jeep-driver', {
        fullName: driver.fullName || '',
        location: driver.location || '',
        rating: driver.rating || 0,
        pricePerDay: driver.pricePerDay || 0
      });
    }
  }, [driverId, currentUser, driver]);

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

        // Otherwise (regular click or same type), toggle OFF
        const newTypes = { ...selectedDatesWithType };
        delete newTypes[dateString];
        setSelectedDatesWithType(newTypes);

        // Also clear half day time
        setHalfDayTimes(prevTimes => {
          const newTimes = { ...prevTimes };
          delete newTimes[dateString];
          return newTimes;
        });

        // Also clear safari type if specific
        setBookingFormData(prev => {
          const newSafariTypes = { ...prev.dateSafariTypes };
          delete newSafariTypes[dateString];
          return { ...prev, dateSafariTypes: newSafariTypes };
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

  const getAvailabilityStatus = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    let availabilitySource = {};
    if (selectedVehicleType === 'Luxury Safari Jeep') {
      availabilitySource = driver?.availabilityLuxury || driver?.availability || {};
    } else {
      availabilitySource = driver?.availabilityStandard || driver?.availability || {};
    }

    if (Object.keys(availabilitySource).length === 0 && driver?.availabilityCalendar && !Array.isArray(driver.availabilityCalendar)) {
      availabilitySource = driver.availabilityCalendar;
    }

    let manualUnavailableMorning = false;
    let manualUnavailableEvening = false;
    let manualUnavailableFull = false;

    if (availabilitySource && typeof availabilitySource === 'object' && !Array.isArray(availabilitySource)) {
      const savedStatus = availabilitySource[dateKey];
      if (savedStatus === 'busy' || savedStatus === 'unavailable' || savedStatus === 'unavailable-fullday') {
        manualUnavailableFull = true;
      } else if (savedStatus === 'unavailable-halfday-morning' || savedStatus === 'halfday-morning') {
        manualUnavailableMorning = true;
      } else if (savedStatus === 'unavailable-halfday-evening' || savedStatus === 'halfday-evening') {
        manualUnavailableEvening = true;
      }
    }

    if (manualUnavailableFull) return 'unavailable';

    let bookedMorning = false;
    let bookedEvening = false;
    let bookedFullDay = false;

    if (acceptedBookings && Array.isArray(acceptedBookings)) {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      const checkTime = checkDate.getTime();

      for (const booking of acceptedBookings) {
        const bookingVehicleType = booking.vehicleType || booking.selectedVehicleType;
        const isMatchingVehicleType = !bookingVehicleType ||
          (selectedVehicleType && bookingVehicleType.includes(selectedVehicleType.includes('Luxury') ? 'Luxury' : 'Standard'));

        if (!isMatchingVehicleType) continue;

        if (booking.datesWithTypes && Array.isArray(booking.datesWithTypes)) {
          const match = booking.datesWithTypes.find(dt => {
            const d = new Date(dt.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });

          if (match) {
            if (match.type === 'half-day') {
              const safariTypeLower = (match.safariType || '').toLowerCase();
              const isEvening = safariTypeLower.includes('evening') || safariTypeLower.includes('pm') || match.time === 'evening';
              if (isEvening) bookedEvening = true;
              else bookedMorning = true;
            } else {
              bookedFullDay = true;
            }
          }
        } else if (booking.selectedDates && Array.isArray(booking.selectedDates)) {
          const match = booking.selectedDates.some(sd => {
            const d = new Date(sd);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });
          if (match) bookedFullDay = true;
        } else if (booking.dates && Array.isArray(booking.dates)) {
          const match = booking.dates.some(sd => {
            let d;
            if (sd && sd.toDate) d = sd.toDate();
            else d = new Date(sd);
            if (isNaN(d.getTime())) return false;
            d.setHours(0, 0, 0, 0);
            return d.getTime() === checkTime;
          });
          if (match) bookedFullDay = true;
        }
      }
    }

    if (bookedFullDay) return 'busy';

    // Combine booking and manual availability logic
    const morningOccupied = bookedMorning || manualUnavailableMorning;
    const eveningOccupied = bookedEvening || manualUnavailableEvening;

    if (morningOccupied && eveningOccupied) {
      if (bookedMorning && bookedEvening) return 'busy';
      if (bookedMorning && manualUnavailableEvening) return 'halfbooked-halfunavailable-morning';
      if (bookedEvening && manualUnavailableMorning) return 'halfbooked-halfunavailable-evening';
      return 'unavailable';
    }

    if (bookedMorning) return 'halfday-morning';
    if (bookedEvening) return 'halfday-evening';
    if (manualUnavailableMorning) return 'unavailable-halfday-morning';
    if (manualUnavailableEvening) return 'unavailable-halfday-evening';

    if (driver?.availableDates && Array.isArray(driver.availableDates) && driver.availableDates.length > 0) {
      const isInArray = driver.availableDates.some(availableDate => {
        const d = new Date(availableDate);
        return getDateKey(d) === dateKey;
      });
      return isInArray ? null : 'unavailable';
    }

    return null;
  };

  // Calculate total price based on selected dates and their types (half-day vs full-day) + add-ons
  const calculateTotalPrice = () => {
    if (!driver || selectedDates.length === 0) return 0;

    let total = 0;

    // If package is selected, use package prices based on vehicle type
    if (selectedPackage) {
      selectedDates.forEach(date => {
        const dateString = date.toDateString();
        const dateType = selectedDatesWithType[dateString] || 'full-day';

        // Use vehicle-specific pricing
        let fullDayPrice, halfDayPrice;
        if (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep) {
          fullDayPrice = selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice;
          halfDayPrice = selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice;
        } else {
          // Default to Standard or legacy prices
          fullDayPrice = selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice;
          halfDayPrice = selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice;
        }

        total += dateType === 'half-day' ? halfDayPrice : fullDayPrice;
      });
      // No add-ons for package bookings
      return total;
    }

    // Regular booking - use vehicle-specific prices if available
    selectedDates.forEach(date => {
      const dateString = date.toDateString();
      const dateType = selectedDatesWithType[dateString] || 'full-day';

      // Determine price based on vehicle type
      let dayPrice = 0;
      if (selectedVehicleType === 'Standard Safari Jeep') {
        dayPrice = dateType === 'half-day'
          ? (driver.priceHalfDayStandard || driver.pricePerDay * 0.6 || 0)
          : (driver.priceFullDayStandard || driver.pricePerDay || 0);
      } else if (selectedVehicleType === 'Luxury Safari Jeep') {
        dayPrice = dateType === 'half-day'
          ? (driver.priceHalfDayLuxury || driver.pricePerDay * 0.8 || 0)
          : (driver.priceFullDayLuxury || driver.pricePerDay * 1.5 || 0);
      } else {
        // Fallback to legacy pricing
        dayPrice = dateType === 'half-day' ? (driver.pricePerDay * 0.6 || 0) : (driver.pricePerDay || 0);
      }

      total += dayPrice;
    });

    // Add add-ons prices (only for regular bookings)
    // Add add-ons prices (only for regular bookings)
    if (bookingFormData.needsBinoculars || bookingFormData.binocularsCount > 0) {
      total += (bookingFormData.binocularsCount || 1) * 500;
    }
    if (bookingFormData.needsChildSeat || bookingFormData.childSeatCount > 0) {
      total += (bookingFormData.childSeatCount || 1) * 1000;
    }
    if (bookingFormData.needsWater || bookingFormData.waterBottleCount > 0) {
      total += (bookingFormData.waterBottleCount || 1) * 300;
    }

    // Add snacks prices
    if (bookingFormData.needsSnacks) {
      const snackPrices = {
        'Biscuits': 200,
        'Chips': 250,
        'Fruits': 400,
        'Sandwiches': 500,
        'Rice & Curry': 800,
        'Fried Rice': 700,
        'Noodles': 600,
        'Soft Drinks': 150
      };

      // Calculate based on quantities if available
      if (bookingFormData.snackQuantities && Object.keys(bookingFormData.snackQuantities).length > 0) {
        Object.entries(bookingFormData.snackQuantities).forEach(([snack, count]) => {
          if (count > 0) {
            total += (snackPrices[snack] || 0) * count;
          }
        });
      } else if (bookingFormData.selectedSnacks) {
        // Fallback to legacy checkbox logic (count=1)
        bookingFormData.selectedSnacks.forEach(snack => {
          total += snackPrices[snack] || 0;
        });
      }
    }

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
    if (!bookingFormData.numberOfPassengers || bookingFormData.numberOfPassengers < 1 || bookingFormData.numberOfPassengers > 6) {
      errors.numberOfPassengers = 'Number of passengers must be between 1 and 6';
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

    setFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Map field names to their step numbers
  const getStepForField = (fieldName) => {
    const stepMap = {
      fullName: 1, email: 1, phone: 1, country: 1, numberOfPassengers: 1,
      nationalPark: 2, safariType: 2,
      hotelName: 3, hotelAddress: 3, pickupLocation: 3, dropoffLocation: 3
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

      // Calculate total price - use the same logic as calculateTotalPrice() function
      let totalPrice = 0;

      // If package booking, use package prices based on vehicle type
      if (selectedPackage) {
        selectedDates.forEach(date => {
          const dateString = date.toDateString();
          const dateType = selectedDatesWithType[dateString] || 'full-day';

          // Use vehicle-specific pricing
          let fullDayPrice, halfDayPrice;
          if (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep) {
            fullDayPrice = selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice;
            halfDayPrice = selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice;
          } else {
            // Default to Standard or legacy prices
            fullDayPrice = selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice;
            halfDayPrice = selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice;
          }

          totalPrice += dateType === 'half-day' ? halfDayPrice : fullDayPrice;
        });
      } else {
        // Regular booking - use vehicle-specific prices (matches calculateTotalPrice())
        selectedDates.forEach(date => {
          const dateString = date.toDateString();
          const dateType = selectedDatesWithType[dateString] || 'full-day';

          // Determine price based on vehicle type (same logic as calculateTotalPrice)
          let dayPrice = 0;
          if (selectedVehicleType === 'Standard Safari Jeep') {
            dayPrice = dateType === 'half-day'
              ? (driver.priceHalfDayStandard || driver.pricePerDay * 0.6 || 0)
              : (driver.priceFullDayStandard || driver.pricePerDay || 0);
          } else if (selectedVehicleType === 'Luxury Safari Jeep') {
            dayPrice = dateType === 'half-day'
              ? (driver.priceHalfDayLuxury || driver.pricePerDay * 0.8 || 0)
              : (driver.priceFullDayLuxury || driver.pricePerDay * 1.5 || 0);
          } else {
            // Fallback to legacy pricing
            dayPrice = dateType === 'half-day' ? (driver.pricePerDay * 0.6 || 0) : (driver.pricePerDay || 0);
          }

          totalPrice += dayPrice;
        });

        // Add add-ons prices (only for regular bookings)
        if (bookingFormData.needsBinoculars || bookingFormData.binocularsCount > 0) {
          totalPrice += (bookingFormData.binocularsCount || 1) * 500;
        }
        if (bookingFormData.needsChildSeat || bookingFormData.childSeatCount > 0) {
          totalPrice += (bookingFormData.childSeatCount || 1) * 1000;
        }
        if (bookingFormData.needsWater || bookingFormData.waterBottleCount > 0) {
          totalPrice += (bookingFormData.waterBottleCount || 1) * 300;
        }

        // Add snacks prices
        if (bookingFormData.needsSnacks) {
          const snackPrices = {
            'Biscuits': 200,
            'Chips': 250,
            'Fruits': 400,
            'Sandwiches': 500,
            'Rice & Curry': 800,
            'Fried Rice': 700,
            'Noodles': 600,
            'Soft Drinks': 150
          };

          if (bookingFormData.snackQuantities && Object.keys(bookingFormData.snackQuantities).length > 0) {
            Object.entries(bookingFormData.snackQuantities).forEach(([snack, count]) => {
              if (count > 0) {
                totalPrice += (snackPrices[snack] || 0) * count;
              }
            });
          } else if (bookingFormData.selectedSnacks) {
            bookingFormData.selectedSnacks.forEach(snack => {
              totalPrice += snackPrices[snack] || 0;
            });
          }
        }
      }

      const datesString = selectedDates.map(d => {
        const dateType = selectedDatesWithType[d.toDateString()] || 'full-day';
        const timeSelection = halfDayTimes[d.toDateString()];
        let typeLabel = dateType === 'half-day' ? 'Half Day' : 'Full Day';
        if (dateType === 'half-day' && timeSelection) {
          typeLabel += ` (${timeSelection.charAt(0).toUpperCase() + timeSelection.slice(1)})`;
        }
        return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${typeLabel})`;
      }).join(', ');

      const datesWithTypes = selectedDates.map(d => {
        const dateString = d.toDateString();
        const dateType = selectedDatesWithType[dateString] || 'full-day';
        const timeSelection = halfDayTimes[dateString];

        // If it's a half-day, safariType should reflect the morning/evening selection
        let safariType = bookingFormData.dateSafariTypes?.[dateString] || bookingFormData.safariType || 'Morning Safari';
        if (dateType === 'half-day' && timeSelection) {
          safariType = timeSelection === 'morning' ? 'Morning Safari' : 'Evening Safari';
        }

        return {
          date: d.toISOString(),
          type: dateType,
          time: timeSelection || (dateType === 'full-day' ? 'full' : 'morning'),
          safariType: safariType
        };
      });

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
        // Store breakdown prices for Payment Summary
        priceFullDay: Number((() => {
          if (selectedPackage) {
            return (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep)
              ? (selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice)
              : (selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice);
          }
          if (selectedVehicleType === 'Standard Safari Jeep') return driver.priceFullDayStandard || driver.pricePerDay || 0;
          if (selectedVehicleType === 'Luxury Safari Jeep') return driver.priceFullDayLuxury || (driver.pricePerDay * 1.5) || 0;
          return driver.pricePerDay || 0;
        })()),
        priceHalfDay: Number((() => {
          if (selectedPackage) {
            return (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep)
              ? (selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice)
              : (selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice);
          }
          if (selectedVehicleType === 'Standard Safari Jeep') return driver.priceHalfDayStandard || (driver.pricePerDay * 0.6) || 0;
          if (selectedVehicleType === 'Luxury Safari Jeep') return driver.priceHalfDayLuxury || (driver.pricePerDay * 0.8) || 0;
          return (driver.pricePerDay * 0.6) || 0;
        })()),
        numberOfDays: Number(selectedDates.length),
        serviceType: driver.serviceType || 'Jeep Driver',
        status: 'pending',
        // Vehicle type information (if applicable)
        selectedVehicleType: selectedVehicleType || null,
        vehicleType: selectedVehicleType || null, // Double up for compatibility with Admin/Receipts
        halfDayTimes: halfDayTimes || {},
        // Package booking information (if applicable)
        isPackageBooking: !!selectedPackage,
        packageId: selectedPackage?.id || null,
        packageTitle: selectedPackage?.title || null,
        packagePriceFullDay: selectedPackage?.fullDayPrice || null,
        packagePriceHalfDay: selectedPackage?.halfDayPrice || null,
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

📝 Special Requests: ${bookingFormData.specialAssistance || 'None'}`;

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

      const datesWithTypesAndSafari = selectedDates.map(d => {
        const dateString = d.toDateString();
        const dateType = selectedDatesWithType[dateString] || 'full-day';
        const timeSelection = halfDayTimes[dateString];

        // If it's a half-day, safariType should reflect the morning/evening selection
        let safariType = bookingFormData.dateSafariTypes?.[dateString] || bookingFormData.safariType || 'Morning Safari';
        if (dateType === 'half-day' && timeSelection) {
          safariType = timeSelection === 'morning' ? 'Morning Safari' : 'Evening Safari';
        }

        // Calculate specific price for this day
        let dayPrice = 0;
        if (selectedVehicleType === 'Standard Safari Jeep') {
          dayPrice = dateType === 'half-day'
            ? (driver.priceHalfDayStandard || driver.pricePerDay * 0.6 || 0)
            : (driver.priceFullDayStandard || driver.pricePerDay || 0);
        } else if (selectedVehicleType === 'Luxury Safari Jeep') {
          dayPrice = dateType === 'half-day'
            ? (driver.priceHalfDayLuxury || driver.pricePerDay * 0.8 || 0)
            : (driver.priceFullDayLuxury || driver.pricePerDay * 1.5 || 0);
        } else {
          dayPrice = dateType === 'half-day' ? (driver.pricePerDay * 0.6 || 0) : (driver.pricePerDay || 0);
        }

        return {
          date: d.toISOString(),
          type: dateType,
          time: timeSelection || (dateType === 'full-day' ? 'full' : 'morning'),
          safariType: safariType,
          price: dayPrice
        };
      });

      setSuccessMessageData({
        driverName: driver.fullName,
        dates: datesString,
        datesWithTypes: datesWithTypesAndSafari,
        totalPrice: totalPrice,
        numberOfDays: selectedDates.length,
        numberOfPassengers: bookingFormData.numberOfPassengers,
        nationalPark: bookingFormData.nationalPark,
        bookingId: bookingId,
        selectedVehicleType: selectedVehicleType,
        // Add-ons for summary display
        binocularsCount: bookingFormData.binocularsCount,
        childSeatCount: bookingFormData.childSeatCount,
        waterBottleCount: bookingFormData.waterBottleCount,
        snackQuantities: bookingFormData.snackQuantities,
        selectedSnacks: bookingFormData.selectedSnacks
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
      setHalfDayTimes({});
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
        needsBinoculars: false,
        needsChildSeat: false,
        needsWater: false,
        needsSnacks: false,
        selectedSnacks: [],
        dateSafariTypes: {}
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
        // Vehicle type is auto-filled from driver's vehicle type (display only, not editable)
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
          const driverInfo = {
            id: driverDoc.id,
            ...driverData,
            // Ensure availability is an object, not array
            availabilityCalendar: (driverData.availability && typeof driverData.availability === 'object' && !Array.isArray(driverData.availability))
              ? driverData.availability
              : {}, // Object mapping dates to status
            // Explicitly include dual calendars
            availabilityStandard: driverData.availabilityStandard || {},
            availabilityLuxury: driverData.availabilityLuxury || {},
            availableDates: driverData.availableDates || [] // Keep for backward compatibility
          };

          // Fetch certification documents if driver is certified
          if (driverData.certificationStatus === 'certified') {
            try {
              const certDocRef = doc(db, 'jeepDriverCertifications', driverId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                console.log('✅ Certification documents found:', certData);

                if (certData.documents && Array.isArray(certData.documents)) {
                  // Resolve URLs if needed
                  const documentsWithUrls = await Promise.all(certData.documents.map(async (doc) => {
                    if (doc.fileUrl) return doc; // URL already exists
                    if (doc.supabasePath) {
                      const signedUrl = await getDocumentUrl(doc.supabasePath);
                      return { ...doc, fileUrl: signedUrl };
                    }
                    return doc;
                  }));
                  driverInfo.certificationDocuments = documentsWithUrls;
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents:', err);
            }
          }

          setDriver(driverInfo);

          // Fetch document URLs if verification documents exist
          if (driverData.verificationDocuments && Array.isArray(driverData.verificationDocuments)) {
            const urls = {};
            // Use Promise.all to fetch all URLs in parallel
            try {
              await Promise.all(driverData.verificationDocuments.map(async (docPath) => {
                const url = await getDocumentUrl(docPath);
                if (url) {
                  urls[docPath] = url;
                }
              }));
              setDocumentUrls(urls);
              console.log("📄 Loaded document URLs:", Object.keys(urls).length);
            } catch (err) {
              console.error("Error loading document URLs:", err);
            }
          }
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

  // Fetch packages when packages tab is active
  useEffect(() => {
    const fetchPackages = async () => {
      if (activeTab === 'packages' && driverId) {
        setLoadingPackages(true);
        try {
          const q = query(
            collection(db, 'servicePackages'),
            where('providerId', '==', driverId)
          );
          const querySnapshot = await getDocs(q);
          const packagesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setPackages(packagesData);
        } catch (error) {
          console.error('Error fetching packages:', error);
        } finally {
          setLoadingPackages(false);
        }
      }
    };

    fetchPackages();
  }, [activeTab, driverId]);

  // Load selected package from sessionStorage when booking tab is active
  useEffect(() => {
    if (activeTab === 'booking') {
      const packageData = sessionStorage.getItem('selectedPackage');
      if (packageData) {
        try {
          const pkg = JSON.parse(packageData);
          setSelectedPackage(pkg);
          console.log('📦 Package booking mode:', pkg.title);
        } catch (error) {
          console.error('Error parsing package data:', error);
          setSelectedPackage(null);
        }
      } else {
        setSelectedPackage(null);
      }
    }
  }, [activeTab]);

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
    // Update driver rating in database
    if (driverId) {
      try {
        await updateDriverRating(driverId);
        // Refresh driver data to update rating display
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          const driverInfo = {
            id: driverDoc.id,
            ...driverData
          };

          // Fetch certification documents if driver is certified
          if (driverData.certificationStatus === 'certified') {
            try {
              const certDocRef = doc(db, 'jeepDriverCertifications', driverId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                if (certData.documents && Array.isArray(certData.documents)) {
                  driverInfo.certificationDocuments = certData.documents;
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents (refresh):', err);
            }
          }

          setDriver(driverInfo);
        }
      } catch (error) {
        console.error('Error updating driver rating:', error);
        // Still refresh driver data even if rating update fails
        const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          const driverInfo = {
            id: driverDoc.id,
            ...driverData
          };

          // Fetch certification documents if driver is certified
          if (driverData.certificationStatus === 'certified') {
            try {
              const certDocRef = doc(db, 'jeepDriverCertifications', driverId);
              const certDocSnap = await getDoc(certDocRef);

              if (certDocSnap.exists()) {
                const certData = certDocSnap.data();
                if (certData.documents && Array.isArray(certData.documents)) {
                  driverInfo.certificationDocuments = certData.documents;
                }
              }
            } catch (err) {
              console.error('Error fetching certification documents (refresh error):', err);
            }
          }

          setDriver(driverInfo);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-linear-to-r from-black to-gray-800 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:from-gray-800 hover:to-gray-700 transition-colors"
          >
            Go Back
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

              {/* Enhanced Summary View */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3 pb-3 border-b border-gray-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Driver:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.driverName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Vehicle Type:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.selectedVehicleType}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Destination:</span>
                    <span className="text-gray-900 font-bold">{successMessageData.nationalPark}</span>
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

                {/* Individual Dates Table */}
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

                {/* Add-ons Breakdown */}
                {(successMessageData.binocularsCount > 0 ||
                  successMessageData.childSeatCount > 0 ||
                  successMessageData.waterBottleCount > 0 ||
                  (successMessageData.snackQuantities && Object.keys(successMessageData.snackQuantities).length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
                      <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Add-ons & Extras</h4>

                      {successMessageData.binocularsCount > 0 && (
                        <div className="flex justify-between items-center text-xs px-1">
                          <span className="text-gray-600">Binoculars (×{successMessageData.binocularsCount})</span>
                          <span className="text-gray-900 font-bold">LKR {(successMessageData.binocularsCount * 500).toLocaleString()}</span>
                        </div>
                      )}

                      {successMessageData.childSeatCount > 0 && (
                        <div className="flex justify-between items-center text-xs px-1">
                          <span className="text-gray-600">Child Seat (×{successMessageData.childSeatCount})</span>
                          <span className="text-gray-900 font-bold">LKR {(successMessageData.childSeatCount * 1000).toLocaleString()}</span>
                        </div>
                      )}

                      {successMessageData.waterBottleCount > 0 && (
                        <div className="flex justify-between items-center text-xs px-1">
                          <span className="text-gray-600">Water Bottles (×{successMessageData.waterBottleCount})</span>
                          <span className="text-gray-900 font-bold">LKR {(successMessageData.waterBottleCount * 300).toLocaleString()}</span>
                        </div>
                      )}

                      {successMessageData.snackQuantities && Object.entries(successMessageData.snackQuantities).map(([snack, count]) => {
                        if (count <= 0) return null;
                        const snackPrices = {
                          'Biscuits': 200, 'Chips': 250, 'Fruits': 400, 'Sandwiches': 500,
                          'Rice & Curry': 800, 'Fried Rice': 700, 'Noodles': 600, 'Soft Drinks': 150
                        };
                        return (
                          <div key={snack} className="flex justify-between items-center text-xs px-1">
                            <span className="text-gray-600">{snack} (×{count})</span>
                            <span className="text-gray-900 font-bold">LKR {(count * (snackPrices[snack] || 0)).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                <div className="flex justify-between items-center bg-gray-900 text-white p-3 rounded-xl mt-4 shadow-lg">
                  <span className="text-sm font-bold">Grand Total:</span>
                  <div className="text-right">
                    <span className="text-lg font-black block leading-none">LKR {successMessageData.totalPrice.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400">Includes all taxes & fees</span>
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
                // Ensure we're on the correct route
                if (driverId) {
                  navigate(`/jeepprofile?driverId=${driverId}`, { replace: true });
                } else if (driver?.id) {
                  navigate(`/jeepprofile?driverId=${driver.id}`, { replace: true });
                } else {
                  navigate('/driver', { replace: true });
                }
              }}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:bg-gray-800 transition-colors"
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
      )
      }

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
        selectedPackage={selectedPackage}
        selectedVehicleType={selectedVehicleType}
        halfDayTimes={halfDayTimes}
      />

      <GlobalNotificationBell
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />


      <div className="bg-linear-to-r from-black via-gray-900 to-black border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
            <div className="flex items-center">
              <button
                onClick={() => {
                  // Navigate back to jeep listing page
                  navigate('/driver');
                  // The scroll will be handled by JeepSection2 component
                }}
                className="flex items-center text-white mr-3 sm:mr-4 md:mr-6 font-medium hover:text-gray-300 transition-colors touch-manipulation"
              >
                <ArrowLeft size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
                <span className="text-sm sm:text-base md:text-lg">Back</span>
              </button>
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-white">Jeep Driver Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 lg:overflow-hidden flex flex-col">
        <div className="w-full lg:flex-1 lg:overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col min-h-0">
            <div className="bg-linear-to-b from-white to-gray-50 border-2 border-gray-300 rounded-lg p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col lg:h-full shadow-xl lg:overflow-y-auto">
              {/* Profile Header */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <img
                  src={driver.profilePicture || "/api/placeholder/120/120"}
                  alt={driver.fullName}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-black shadow-2xl mx-auto mb-2 sm:mb-2.5 md:mb-3"
                />
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-black mb-1">{driver.fullName}</h2>
                <p className="text-gray-700 font-medium mb-2 sm:mb-2.5 md:mb-3 text-xs sm:text-sm md:text-base">{driver.serviceType}</p>

                {/* Rating */}
                <div className="flex items-center justify-center mt-2 sm:mt-2.5 bg-gray-100 rounded-lg p-2 sm:p-2.5 md:p-3 border border-gray-300">
                  <div className="flex items-center flex-wrap justify-center gap-1.5 sm:gap-2">
                    {renderStars(driver.rating || 0)}
                    <span className="text-xs sm:text-sm font-semibold text-black">
                      {driver.rating?.toFixed(1) || '0.0'}/5
                    </span>
                    {driver.totalReviews > 0 && (
                      <span className="text-xs text-gray-600">
                        • {driver.totalReviews} reviews
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-2 sm:mb-3 md:mb-4 flex-1">
                {driver.contactPhone && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <Phone size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    {hasPaidBooking ? (
                      <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{driver.contactPhone}</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-semibold text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-0.5 italic">Phone Number</span>
                        <div className="flex items-center gap-1.5 text-black">
                          <Shield size={12} className="text-emerald-600" />
                          <span className="text-xs sm:text-sm font-medium italic text-gray-400">Hidden until payment</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {driver.contactEmail && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <Mail size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    {hasPaidBooking ? (
                      <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{driver.contactEmail}</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-semibold text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-0.5 italic">Email Address</span>
                        <div className="flex items-center gap-1.5 text-black">
                          <Shield size={12} className="text-emerald-600" />
                          <span className="text-xs sm:text-sm font-medium italic text-gray-400">Hidden until payment</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {driver.location && (
                  <div className="flex items-center text-black p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                      <MapPin size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs sm:text-sm md:text-base text-black wrap-break-word">{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-2.5">
                {!currentUser && (
                  <button
                    onClick={() => {
                      if (onShowAuth) {
                        onShowAuth('login');
                      }
                    }}
                    className="w-full bg-linear-to-r from-black to-gray-800 text-white py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 rounded-lg font-semibold text-xs sm:text-sm md:text-base shadow-lg hover:from-gray-800 hover:to-gray-700 transition-all touch-manipulation min-h-[40px]"
                  >
                    Login to Book or Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="bg-linear-to-b from-white to-gray-50 rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden flex flex-col lg:flex-1 min-h-0 w-full">
              <div className="border-b border-gray-300 bg-linear-to-r from-gray-100 to-white">
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
                    onClick={() => setActiveTab('packages')}
                    className={`py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 lg:px-6 text-center border-b-2 font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap relative touch-manipulation min-h-[40px] flex items-center justify-center ${activeTab === 'packages'
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
                    {driver.totalReviews > 0 && ` (${driver.totalReviews})`}
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
                        if (currentUser && driver) {
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
                    {/* About - Service Provider Bio */}
                    {driver.description && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">About</h3>
                        <p className="text-gray-700 leading-relaxed text-xs sm:text-sm line-clamp-2">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Experience */}
                    <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                      <div className="p-1.5 sm:p-2 md:p-2.5 bg-black rounded-lg mr-2 sm:mr-2.5 md:mr-3 shrink-0">
                        <Clock className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-black mb-1 text-xs sm:text-sm md:text-base">Experience</h3>
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Vehicle Type(s) */}
                    {((driver.vehicleTypes && driver.vehicleTypes.length > 0) || driver.vehicleType) && (
                      <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <h3 className="font-bold text-black mb-1 flex items-center text-xs sm:text-sm md:text-base">
                          <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                            <Car className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                          </div>
                          Vehicle Type{driver.vehicleTypes && driver.vehicleTypes.length > 1 ? 's' : ''}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                          {driver.vehicleTypes && driver.vehicleTypes.length > 0 ? (
                            driver.vehicleTypes.map((type, index) => (
                              <span
                                key={index}
                                className="bg-emerald-100 text-emerald-800 px-2 sm:px-2.5 py-1 rounded-md text-xs sm:text-sm border border-emerald-300 font-semibold"
                              >
                                {type}
                              </span>
                            ))
                          ) : (
                            <p className="text-gray-700 text-sm sm:text-base md:text-lg font-bold">{driver.vehicleType}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pricing - Dynamic based on Vehicle Types and Certification */}
                    {(driver.priceFullDayStandard > 0 || driver.priceHalfDayStandard > 0 ||
                      driver.priceFullDayLuxury > 0 || driver.priceHalfDayLuxury > 0 ||
                      driver.pricePerDay > 0) && (
                        <div className="p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                          <h3 className="font-bold text-black mb-2 sm:mb-2.5 flex items-center text-xs sm:text-sm md:text-base">
                            <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                              <DollarSign className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                            </div>
                            Rates
                            {driver.certificationStatus === 'certified' && driver.certificationApproved && (
                              <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium border border-yellow-300">
                                Certified Rates
                              </span>
                            )}
                          </h3>
                          <div className="space-y-1.5 sm:space-y-2">
                            {/* Standard Safari Jeep Rates */}
                            {driver.vehicleTypes && driver.vehicleTypes.includes('Standard Safari Jeep') && (
                              <>
                                {/* Standard Full Day */}
                                {driver.priceFullDayStandard > 0 && (
                                  <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Standard Full Day:</span>
                                      <p className="text-xs text-emerald-600 mt-0.5">Full day safari (Standard Jeep)</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                        LKR {driver.priceFullDayStandard.toLocaleString()}
                                      </span>
                                      <span className="text-xs font-semibold text-emerald-600 block">/day</span>
                                    </div>
                                  </div>
                                )}
                                {/* Standard Half Day */}
                                {driver.priceHalfDayStandard > 0 && (
                                  <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <span className="text-emerald-800 font-bold text-xs sm:text-sm block">Standard Half Day:</span>
                                      <p className="text-xs text-emerald-600 mt-0.5">Half day safari (Standard Jeep)</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-sm sm:text-base md:text-lg font-black text-emerald-700">
                                        LKR {driver.priceHalfDayStandard.toLocaleString()}
                                      </span>
                                      <span className="text-xs font-semibold text-emerald-600 block">/half day</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Luxury Safari Jeep Rates */}
                            {driver.vehicleTypes && driver.vehicleTypes.includes('Luxury Safari Jeep') && (
                              <>
                                {/* Luxury Full Day */}
                                {driver.priceFullDayLuxury > 0 && (
                                  <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <span className="text-yellow-800 font-bold text-xs sm:text-sm block">Luxury Full Day:</span>
                                      <p className="text-xs text-yellow-600 mt-0.5">Full day safari (Luxury Jeep)</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-sm sm:text-base md:text-lg font-black text-yellow-700">
                                        LKR {driver.priceFullDayLuxury.toLocaleString()}
                                      </span>
                                      <span className="text-xs font-semibold text-yellow-600 block">/day</span>
                                    </div>
                                  </div>
                                )}
                                {/* Luxury Half Day */}
                                {driver.priceHalfDayLuxury > 0 && (
                                  <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex-1 min-w-0 pr-2">
                                      <span className="text-yellow-800 font-bold text-xs sm:text-sm block">Luxury Half Day:</span>
                                      <p className="text-xs text-yellow-600 mt-0.5">Half day safari (Luxury Jeep)</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="text-sm sm:text-base md:text-lg font-black text-yellow-700">
                                        LKR {driver.priceHalfDayLuxury.toLocaleString()}
                                      </span>
                                      <span className="text-xs font-semibold text-yellow-600 block">/half day</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Legacy Pricing (Fallback for old data) */}
                            {driver.pricePerDay > 0 && !driver.priceFullDayStandard && !driver.priceHalfDayStandard && (
                              <>
                                <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-300">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <span className="text-black font-bold text-xs sm:text-sm block">Full Day Safari:</span>
                                    <p className="text-xs text-gray-600 mt-0.5">Full day safari tours</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-sm sm:text-base md:text-lg font-black text-black">
                                      LKR {driver.pricePerDay.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-600 block">/day</span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border border-gray-300">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <span className="text-black font-bold text-xs sm:text-sm block">Half Day Safari:</span>
                                    <p className="text-xs text-gray-600 mt-0.5">Half day safari tours</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-sm sm:text-base md:text-lg font-black text-black">
                                      LKR {Math.round(driver.pricePerDay * 0.6).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-600 block">/half day</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Languages className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Languages</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {driver.languages.map((lang, index) => (
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

                    {/* Destinations */}
                    {driver.destinations && driver.destinations.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <MapPin className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Destination Covered</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
                              >
                                {destination}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Certifications - Only for certified drivers */}
                    {driver.certificationStatus === 'certified' && driver.certificationDocuments && driver.certificationDocuments.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Award className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Certifications</h3>
                          <div className="space-y-1.5">
                            {driver.certificationDocuments.map((doc, index) => (
                              <div
                                key={index}
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
                                    className="shrink-0 bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors shadow-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Special Skills */}
                    {driver.specialSkills && driver.specialSkills.length > 0 && (
                      <div className="flex items-start p-2 sm:p-2.5 md:p-3 rounded-lg bg-white border border-gray-300">
                        <div className="p-1.5 sm:p-2 bg-black rounded-lg mr-2 sm:mr-2.5 shrink-0">
                          <Shield className="text-white" size={14} style={{ width: '14px', height: '14px' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-black mb-1.5 text-xs sm:text-sm md:text-base">Special Skills</h3>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-black px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm border border-gray-300 font-semibold"
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

                {/* Service Packages Tab */}
                {activeTab === 'packages' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    {loadingPackages ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600">Loading packages...</div>
                      </div>
                    ) : packages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                          No Packages Available
                        </h3>
                        <p className="text-gray-500">
                          This service provider hasn't created any packages yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-black mb-4">Available Service Packages</h2>
                        {packages.map((pkg) => {
                          const isExpanded = expandedPackage === pkg.id;
                          return (
                            <div
                              key={pkg.id}
                              className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
                              onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                            >
                              {/* Package Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-black mb-1">{pkg.title}</h3>
                                  <p className={`text-gray-600 text-sm ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                    {pkg.description}
                                  </p>
                                </div>
                                <div className="shrink-0 ml-4 space-y-2">
                                  {/* Standard Safari Jeep Prices */}
                                  {pkg.hasStandardJeep && (
                                    <div className="space-y-2">
                                      <div className="bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-emerald-700 font-medium">🚙 Standard Full Day</p>
                                        <p className="text-lg font-bold text-emerald-800">
                                          LKR {pkg.fullDayPriceStandard?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                      <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-emerald-700 font-medium">🚙 Standard Half Day</p>
                                        <p className="text-base font-bold text-emerald-800">
                                          LKR {pkg.halfDayPriceStandard?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Luxury Safari Jeep Prices */}
                                  {pkg.hasLuxuryJeep && (
                                    <div className="space-y-2">
                                      <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-yellow-700 font-medium">✨ Luxury Full Day</p>
                                        <p className="text-lg font-bold text-yellow-800">
                                          LKR {pkg.fullDayPriceLuxury?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                      <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-yellow-700 font-medium">✨ Luxury Half Day</p>
                                        <p className="text-base font-bold text-yellow-800">
                                          LKR {pkg.halfDayPriceLuxury?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Legacy packages (backward compatibility) */}
                                  {!pkg.hasStandardJeep && !pkg.hasLuxuryJeep && (
                                    <>
                                      <div className="bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-emerald-700 font-medium">Full Day</p>
                                        <p className="text-lg font-bold text-emerald-800">
                                          LKR {pkg.fullDayPrice?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                      <div className="bg-blue-100 border border-blue-300 rounded-lg px-3 py-2 text-right">
                                        <p className="text-xs text-blue-700 font-medium">Half Day</p>
                                        <p className="text-lg font-bold text-blue-800">
                                          LKR {pkg.halfDayPrice?.toLocaleString() || 0}
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Content */}
                              {isExpanded && (
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

                              {/* Book Package Button - Only for logged-in tourists */}
                              {currentUser && userRole === 'tourist' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    // Clear all existing booking selections to start fresh
                                    setSelectedDates([]);
                                    setSelectedDatesWithType({});
                                    setSelectedVehicleType('');
                                    setHalfDayTimes({});
                                    setDateTypeMenuDate(null);
                                    setShowTimeMenu(false);

                                    // Store selected package in session storage with all vehicle-specific fields
                                    sessionStorage.setItem('selectedPackage', JSON.stringify({
                                      id: pkg.id,
                                      title: pkg.title,
                                      // Legacy fields for backward compatibility
                                      fullDayPrice: pkg.fullDayPrice,
                                      halfDayPrice: pkg.halfDayPrice,
                                      // Vehicle-specific fields
                                      hasStandardJeep: pkg.hasStandardJeep || false,
                                      hasLuxuryJeep: pkg.hasLuxuryJeep || false,
                                      fullDayPriceStandard: pkg.fullDayPriceStandard,
                                      halfDayPriceStandard: pkg.halfDayPriceStandard,
                                      fullDayPriceLuxury: pkg.fullDayPriceLuxury,
                                      halfDayPriceLuxury: pkg.halfDayPriceLuxury,
                                      providerId: driverId
                                    }));

                                    // Switch to booking tab
                                    setActiveTab('booking');
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                                >
                                  <CalendarIcon className="h-5 w-5" />
                                  Book This Package
                                </button>
                              )}

                              {/* Expand/Collapse Indicator */}
                              <div className="mt-3 text-center">
                                <span className="text-xs text-gray-500">
                                  {isExpanded ? 'Click to collapse' : 'Click to see more details'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="lg:h-full lg:overflow-y-auto">
                    <ReviewSection
                      driverId={driverId}
                      currentUser={currentUser}
                      userRole={userRole}
                      onReviewAdded={handleReviewAdded}
                    />
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
                            sessionStorage.removeItem('selectedPackage');
                            // Reset selections to start fresh
                            setSelectedDates([]);
                            setSelectedDatesWithType({});
                            setSelectedVehicleType('');
                            setHalfDayTimes({});
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

                        {/* Show vehicle-specific prices if vehicle type is selected */}
                        {selectedVehicleType ? (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-emerald-800">
                              {selectedVehicleType} Pricing:
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1 text-emerald-700">
                                <span className="font-semibold">Full Day:</span>
                                <span>LKR {
                                  (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep
                                    ? (selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice)
                                    : (selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice)
                                  )?.toLocaleString()
                                }</span>
                              </div>
                              <div className="flex items-center gap-1 text-emerald-700">
                                <span className="font-semibold">Half Day:</span>
                                <span>LKR {
                                  (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep
                                    ? (selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice)
                                    : (selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice)
                                  )?.toLocaleString()
                                }</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Show all available vehicle types before selection */
                          <div className="space-y-2">
                            {selectedPackage.hasStandardJeep && (
                              <div className="text-xs text-emerald-700">
                                <span className="font-semibold">🚙 Standard:</span> Full Day: LKR {selectedPackage.fullDayPriceStandard?.toLocaleString()} | Half Day: LKR {selectedPackage.halfDayPriceStandard?.toLocaleString()}
                              </div>
                            )}
                            {selectedPackage.hasLuxuryJeep && (
                              <div className="text-xs text-emerald-700">
                                <span className="font-semibold">✨ Luxury:</span> Full Day: LKR {selectedPackage.fullDayPriceLuxury?.toLocaleString()} | Half Day: LKR {selectedPackage.halfDayPriceLuxury?.toLocaleString()}
                              </div>
                            )}
                            {/* Legacy packages */}
                            {!selectedPackage.hasStandardJeep && !selectedPackage.hasLuxuryJeep && (
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
                            )}
                          </div>
                        )}

                        <p className="text-xs text-emerald-600 mt-2 italic">
                          📦 Package booking mode active - Click X to return to regular booking
                        </p>
                      </div>
                    )}

                    {/* Vehicle Type Selection - ALWAYS VISIBLE AT TOP */}
                    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Car className="h-5 w-5 text-emerald-600" />
                        <label className="block text-base font-bold text-emerald-900">
                          {selectedPackage ? 'Select Jeep Type for Your Package *' : 'Step 1: Select Vehicle Type *'}
                        </label>
                      </div>
                      <select
                        value={selectedVehicleType}
                        onChange={(e) => setSelectedVehicleType(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-emerald-400 rounded-lg text-black font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                      >
                        <option value="" disabled hidden>Choose a vehicle type</option>
                        {/* For package bookings, only show vehicle types available in package */}
                        {selectedPackage ? (
                          <>
                            {(selectedPackage.hasStandardJeep || (!selectedPackage.hasStandardJeep && !selectedPackage.hasLuxuryJeep)) && (
                              <option value="Standard Safari Jeep">Standard Safari Jeep</option>
                            )}
                            {selectedPackage.hasLuxuryJeep && (
                              <option value="Luxury Safari Jeep">Luxury Safari Jeep</option>
                            )}
                          </>
                        ) : (
                          /* For regular bookings, show all types */
                          <>
                            <option value="Standard Safari Jeep">Standard Safari Jeep</option>
                            <option value="Luxury Safari Jeep">Luxury Safari Jeep</option>
                          </>
                        )}
                      </select>
                      {selectedVehicleType && (
                        <div className="mt-2 flex items-center gap-2 text-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                          <p className="text-sm font-medium">
                            ✓ Selected: {selectedVehicleType}
                          </p>
                        </div>
                      )}
                      {!selectedVehicleType && (
                        <p className="mt-2 text-xs text-emerald-700 font-medium">
                          ⚠️ {selectedPackage ? 'Select jeep type to continue' : 'Please select a vehicle type before choosing dates'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                      {/* Calendar */}
                      <div className="min-h-0">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3 md:mb-4">
                          <CalendarIcon className="h-5 w-5 text-gray-700" />
                          <h3 className="font-semibold text-black text-xs sm:text-sm md:text-base">
                            {selectedPackage ? 'Step 2: Select Your Dates' : 'Step 2: Select Your Dates'}
                          </h3>
                        </div>
                        <div className="overflow-y-auto max-h-[300px] sm:max-h-[350px] md:max-h-[400px] relative">
                          <div className={`${!selectedVehicleType ? 'opacity-40 pointer-events-none' : ''}`}>
                            <DatePickerCalendar
                              selectedDates={selectedDates}
                              onDateSelect={(date) => {
                                if (!selectedVehicleType) {
                                  // This shouldn't happen because calendar is disabled
                                  alert('⚠️ Please select a vehicle type first!');
                                  return;
                                }
                                setDateTypeMenuDate(date);
                              }}
                              selectedDatesWithType={selectedDatesWithType}
                              availabilityCalendar={
                                selectedVehicleType === 'Luxury Safari Jeep'
                                  ? (driver?.availabilityLuxury || driver?.availabilityCalendar || {})
                                  : (driver?.availabilityStandard || driver?.availabilityCalendar || {})
                              }
                              acceptedBookings={acceptedBookings}
                              availableDates={driver?.availableDates}
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
                                    {dateTypeMenuDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
                                    {/* Only show Full Day if the day is not partially booked */}
                                    {dateTypeMenuDate && !(
                                      ['halfday-morning', 'halfday-evening', 'unavailable-halfday-morning', 'unavailable-halfday-evening'].includes(getAvailabilityStatus(dateTypeMenuDate))
                                    ) && (
                                        <button
                                          onClick={() => {
                                            try {
                                              handleDateSelect(dateTypeMenuDate);
                                              handleDateTypeChange(dateTypeMenuDate.toDateString(), 'full-day');
                                              setDateTypeMenuDate(null);
                                              setShowTimeMenu(false);
                                            } catch (error) {
                                              console.error('Error selecting full day:', error);
                                              setDateTypeMenuDate(null);
                                              setShowTimeMenu(false);
                                            }
                                          }}
                                          className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                                        >
                                          Full Day
                                        </button>
                                      )}
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
                                    {/* Only show Morning if not already booked as halfday-morning */}
                                    {dateTypeMenuDate && !['halfday-morning', 'unavailable-halfday-morning'].includes(getAvailabilityStatus(dateTypeMenuDate)) && (
                                      <button
                                        onClick={() => {
                                          try {
                                            handleDateSelect(dateTypeMenuDate, 'half-day');
                                            handleDateTypeChange(dateTypeMenuDate.toDateString(), 'half-day');
                                            const dateStr = dateTypeMenuDate.toDateString();
                                            setHalfDayTimes(prev => ({
                                              ...prev,
                                              [dateStr]: 'morning'
                                            }));
                                            setBookingFormData(prev => ({
                                              ...prev,
                                              dateSafariTypes: {
                                                ...prev.dateSafariTypes,
                                                [dateStr]: 'Morning Safari'
                                              }
                                            }));
                                            setDateTypeMenuDate(null);
                                            setShowTimeMenu(false);
                                          } catch (error) {
                                            console.error('Error selecting morning:', error);
                                            setDateTypeMenuDate(null);
                                            setShowTimeMenu(false);
                                          }
                                        }}
                                        className="w-full px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium transition-colors"
                                      >
                                        Morning
                                      </button>
                                    )}
                                    {/* Only show Evening if not already booked as halfday-evening */}
                                    {dateTypeMenuDate && !['halfday-evening', 'unavailable-halfday-evening'].includes(getAvailabilityStatus(dateTypeMenuDate)) && (
                                      <button
                                        onClick={() => {
                                          try {
                                            handleDateSelect(dateTypeMenuDate, 'half-day');
                                            handleDateTypeChange(dateTypeMenuDate.toDateString(), 'half-day');
                                            const dateStr = dateTypeMenuDate.toDateString();
                                            setHalfDayTimes(prev => ({
                                              ...prev,
                                              [dateStr]: 'evening'
                                            }));
                                            setBookingFormData(prev => ({
                                              ...prev,
                                              dateSafariTypes: {
                                                ...prev.dateSafariTypes,
                                                [dateStr]: 'Evening Safari'
                                              }
                                            }));
                                            setDateTypeMenuDate(null);
                                            setShowTimeMenu(false);
                                          } catch (error) {
                                            console.error('Error selecting evening:', error);
                                            setDateTypeMenuDate(null);
                                            setShowTimeMenu(false);
                                          }
                                        }}
                                        className="w-full px-3 py-1.5 bg-yellow-700 hover:bg-yellow-800 text-white rounded text-xs font-medium transition-colors"
                                      >
                                        Evening
                                      </button>
                                    )}
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
                          {/* Show message if vehicle type not selected */}
                          {!selectedVehicleType && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm rounded-lg">
                              <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                                <Car className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-gray-800">
                                  {selectedPackage ? 'Select jeep type above to continue' : 'Please select a vehicle type above'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Booking Summary */}
                      <div className="space-y-2.5 sm:space-y-3 md:space-y-4 min-h-0">
                        <div className="bg-white border border-gray-300 rounded-lg p-2.5 sm:p-3 md:p-4">
                          <h3 className="font-semibold text-black mb-2 sm:mb-3 text-xs sm:text-sm md:text-base">Booking Summary</h3>

                          {selectedDates.length === 0 ? (
                            <p className="text-gray-600 text-center py-3 sm:py-4 text-xs sm:text-sm">
                              Select dates to see booking details
                            </p>
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
                                  <div className="flex items-center gap-2 mt-2">
                                    <Car className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 text-xs font-medium">{selectedVehicleType || 'Select jeep type'}</span>
                                  </div>
                                </div>
                              )}

                              {/* Vehicle Type Information (for non-package bookings) */}
                              {selectedVehicleType && !selectedPackage && (
                                <div className="bg-blue-50 border border-blue-300 rounded-lg p-2 sm:p-2.5 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-blue-600" />
                                    <span className="text-blue-800 font-semibold text-xs sm:text-sm">{selectedVehicleType}</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 text-xs sm:text-sm">Selected dates:</span>
                                <span className="font-medium text-black text-xs sm:text-sm">{selectedDates.length} day(s)</span>
                              </div>

                              {/* Show breakdown of dates and their types */}
                              <div className="space-y-1.5 sm:space-y-2 bg-gray-50 p-2 sm:p-2.5 rounded-lg border border-gray-300 max-h-[150px] sm:max-h-[180px] md:max-h-[200px] overflow-y-auto">
                                {selectedDates.map((date, index) => {
                                  const dateString = date.toDateString();
                                  const dateType = selectedDatesWithType[dateString] || 'full-day';
                                  const timeOfDay = halfDayTimes[dateString] || '';

                                  // Calculate price based on booking type
                                  let dayPrice;
                                  if (selectedPackage) {
                                    // Use vehicle-specific pricing for packages
                                    let fullDayPrice, halfDayPrice;
                                    if (selectedVehicleType === 'Luxury Safari Jeep' && selectedPackage.hasLuxuryJeep) {
                                      fullDayPrice = selectedPackage.fullDayPriceLuxury || selectedPackage.fullDayPrice;
                                      halfDayPrice = selectedPackage.halfDayPriceLuxury || selectedPackage.halfDayPrice;
                                    } else {
                                      fullDayPrice = selectedPackage.fullDayPriceStandard || selectedPackage.fullDayPrice;
                                      halfDayPrice = selectedPackage.halfDayPriceStandard || selectedPackage.halfDayPrice;
                                    }
                                    dayPrice = dateType === 'half-day' ? halfDayPrice : fullDayPrice;
                                  } else if (selectedVehicleType === 'Standard Safari Jeep') {
                                    dayPrice = dateType === 'half-day'
                                      ? (driver.priceHalfDayStandard || driver.pricePerDay * 0.6 || 0)
                                      : (driver.priceFullDayStandard || driver.pricePerDay || 0);
                                  } else if (selectedVehicleType === 'Luxury Safari Jeep') {
                                    dayPrice = dateType === 'half-day'
                                      ? (driver.priceHalfDayLuxury || driver.pricePerDay * 0.8 || 0)
                                      : (driver.priceFullDayLuxury || driver.pricePerDay * 1.5 || 0);
                                  } else {
                                    dayPrice = dateType === 'half-day' ? (driver.pricePerDay || 0) * 0.6 : (driver.pricePerDay || 0);
                                  }

                                  return (
                                    <div key={index} className="flex justify-between items-center text-xs">
                                      <span className="text-gray-700 flex-1 min-w-0 pr-2">
                                        {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-semibold ${dateType === 'half-day' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                          }`}>
                                          {dateType === 'half-day' ? 'Half Day' : 'Full Day'}
                                        </span>
                                        {timeOfDay && (
                                          <span className="ml-1 text-[10px] text-gray-500">
                                            ({timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'})
                                          </span>
                                        )}
                                        {selectedPackage && <span className="text-emerald-600 ml-1">📦</span>}
                                      </span>
                                      <span className="font-medium text-black shrink-0">
                                        LKR {dayPrice.toLocaleString()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-gray-700 text-xs sm:text-sm">Price per day:</span>
                                <span className="font-medium text-black text-xs sm:text-sm">LKR {driver.pricePerDay?.toLocaleString() || '0'}</span>
                              </div>

                              <div className="border-t border-gray-300 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm sm:text-base md:text-lg font-semibold text-black">Total:</span>
                                  <span className="text-lg sm:text-xl md:text-2xl font-bold text-black">
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
                                className="w-full bg-black text-white py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 rounded-lg font-medium mt-2 sm:mt-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm md:text-base hover:bg-gray-800 transition-colors"
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


                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Tab - Opens Chat Modal */}
                {activeTab === 'chat' && (
                  <div className="min-h-[300px] lg:h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                    {currentUser ? (
                      <div className="text-center">
                        <MessageCircle size={48} className="sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 text-black" />
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black mb-2">
                          Chat with {driver.fullName}
                        </h3>
                        <p className="text-gray-700 text-xs sm:text-sm md:text-base mb-4 sm:mb-6">
                          Click the button below to open the chat window
                        </p>
                        <button
                          onClick={handleOpenChatModal}
                          className="bg-black text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 mx-auto text-xs sm:text-sm md:text-base hover:bg-gray-800 transition-colors"
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
                          Please login to start a conversation with {driver.fullName}
                        </p>
                        <button
                          onClick={() => {
                            if (onShowAuth) {
                              onShowAuth('login');
                            }
                          }}
                          className="bg-black text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm hover:bg-gray-800 transition-colors"
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
    </div >
  );
};

export default JeepProfile;