import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X, Lock } from "lucide-react";

// Availability Calendar Component for Service Providers
const AvailabilityCalendar = ({ availability = {}, onChange, readOnly = false, acceptedBookings = [] }) => {
  // Debug log to verify props
  console.log('📅 AvailabilityCalendar Rendered. Availability entries:', Object.keys(availability || {}).length);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [menuLevel, setMenuLevel] = useState('main'); // 'main', 'available-sub', 'unavailable-sub', 'available-halfday', 'unavailable-halfday'
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupDate, setPopupDate] = useState(null);



  // Get dates from accepted bookings
  const getAcceptedBookingDates = useCallback(() => {
    const dates = new Set();

    acceptedBookings.forEach(booking => {
      let bookingDates = [];

      if (booking.dates && Array.isArray(booking.dates)) {
        // Multiple dates booking
        bookingDates = booking.dates.map(date => {
          if (date.toDate) {
            return date.toDate();
          } else if (date instanceof Date) {
            return date;
          } else {
            return new Date(date);
          }
        });
      } else if (booking.startDate) {
        // Single date booking
        const date = booking.startDate.toDate
          ? booking.startDate.toDate()
          : new Date(booking.startDate);
        bookingDates = [date];
      }

      bookingDates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        dates.add(dateKey);
      });
    });

    return dates;
  }, [acceptedBookings]);

  const acceptedDates = getAcceptedBookingDates();

  // Check if a date has an accepted booking
  const isAcceptedBookingDate = useCallback((date) => {
    if (!date) return false;
    const dateKey = date.toISOString().split('T')[0];
    return acceptedDates.has(dateKey);
  }, [acceptedDates]);

  // Update parent when availability changes - REMOVED internal state sync

  // Initialize from props only on mount or when availability prop actually changes - REMOVED internal state sync

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const navigateMonth = useCallback((direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      console.log('📅 Month navigation:', direction, 'to', newMonth.toLocaleString('default', { month: 'long', year: 'numeric' }));
      return newMonth;
    });
  }, []);

  const getDateKey = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getAvailabilityStatus = (date) => {
    if (!date) return null;
    const dateKey = getDateKey(date);
    // Use prop directly, fallback to empty object if undefined
    return (availability || {})[dateKey] || null;
  };

  const isPastDate = useCallback((date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const handleDateClick = useCallback((date, event) => {
    // Block editing if: readonly, no date, past date, or accepted booking date
    if (readOnly || !date || isPastDate(date) || isAcceptedBookingDate(date)) {
      console.log('📅 Date click blocked:', {
        readOnly,
        date: date?.toISOString(),
        isPast: isPastDate(date),
        isAcceptedBooking: isAcceptedBookingDate(date)
      });
      return;
    }

    // Get the click position relative to the calendar container
    const rect = event.target.getBoundingClientRect();
    const container = event.target.closest('.bg-gray-900\\/50');
    const containerRect = container ? container.getBoundingClientRect() : rect;

    const viewportWidth = window.innerWidth;

    // Popup dimensions (approximate)
    const popupWidth = viewportWidth < 640 ? 200 : 250;
    const popupHeight = viewportWidth < 640 ? 240 : 280;

    // Calculate position relative to the container (for absolute positioning)
    let left = rect.left - containerRect.left + rect.width + 10; // 10px offset from date
    let top = rect.top - containerRect.top;

    // For mobile, center the popup horizontally
    if (viewportWidth < 640) {
      left = (containerRect.width - popupWidth) / 2;
    } else {
      // Desktop: position next to the clicked date
      // Adjust if popup would go off container edge horizontally
      if (left + popupWidth > containerRect.width - 10) {
        left = rect.left - containerRect.left - popupWidth - 10; // Position on left side
      }
      // Ensure left doesn't go negative
      if (left < 10) {
        left = 10;
      }
    }

    // Ensure popup stays within container bounds vertically
    if (top + popupHeight > containerRect.height - 10) {
      top = Math.max(10, containerRect.height - popupHeight - 10);
    }
    // Ensure top doesn't go negative
    if (top < 10) {
      top = 10;
    }

    setPopupPosition({ top, left });
    setPopupDate(date);
    setShowPopup(true);
    setMenuLevel('main');
  }, [readOnly, isPastDate, isAcceptedBookingDate]);

  const handleStatusSelect = useCallback((status) => {
    if (!popupDate || !onChange) return;

    const dateKey = getDateKey(popupDate);

    // Create new state based on PROPS
    const newState = { ...(availability || {}) };

    if (!status || status === 'available') {
      delete newState[dateKey];
    } else {
      newState[dateKey] = status;
    }

    console.log('📅 Date status update via prop:', dateKey, '→', status);
    onChange(newState);

    // Close popup
    setShowPopup(false);
    setMenuLevel('main');
    setPopupDate(null);
  }, [popupDate, availability, onChange]);

  const handleMenuNavigation = (level) => {
    setMenuLevel(level);
  };

  const clearDate = (dateKey, e) => {
    e?.stopPropagation();
    if (!onChange) return;

    const newState = { ...(availability || {}) };
    delete newState[dateKey];
    onChange(newState);
  };

  const getDateClassName = (date) => {
    if (!date) return '';
    const status = getAvailabilityStatus(date);
    const isPast = isPastDate(date);
    const isAcceptedBooking = isAcceptedBookingDate(date);
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

    const baseClasses = 'relative w-full h-8 sm:h-10 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium flex items-center justify-center';

    if (isPast) {
      return `${baseClasses} bg-gray-800/50 text-gray-600 cursor-not-allowed`;
    }

    if (isAcceptedBooking) {
      return `${baseClasses} bg-blue-600/80 text-white cursor-not-allowed border-2 border-blue-400`;
    }

    // Handle different statuses
    switch (status) {
      case 'unavailable-fullday':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'unavailable-halfday-morning':
        return `${baseClasses} bg-gray-500 text-white hover:bg-gray-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'unavailable-halfday-evening':
        return `${baseClasses} bg-gray-500 text-white hover:bg-gray-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available-fullday':
        return `${baseClasses} bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available-halfday-morning':
        return `${baseClasses} bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available-halfday-evening':
        return `${baseClasses} bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      // Legacy support
      case 'busy':
      case 'halfday':
      case 'unavailable':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case null:
      case 'available':
      default:
        // Unselected state
        return `${baseClasses} bg-transparent text-gray-400 border border-gray-600/30 hover:bg-gray-700/20 hover:border-gray-500/40 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
    }
  };

  const getDateLabel = (status) => {
    switch (status) {
      case 'unavailable-fullday':
        return 'Unavail Full';
      case 'unavailable-halfday-morning':
        return 'Unavail AM';
      case 'unavailable-halfday-evening':
        return 'Unavail PM';
      case 'available-fullday':
        return 'Avail Full';
      case 'available-halfday-morning':
        return 'Avail AM';
      case 'available-halfday-evening':
        return 'Avail PM';
      // Legacy
      case 'busy':
      case 'halfday':
        return 'Booked';
      case 'unavailable':
        return 'Unavailable';
      default:
        return null;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="w-full relative">
      {/* Calendar Container - scroll on mobile only */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/40 rounded-xl p-4 sm:p-6 relative max-h-[80vh] overflow-y-auto sm:max-h-none sm:overflow-visible">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateMonth(-1);
            }}
            disabled={readOnly}
            className={`p-2 rounded-lg bg-gray-800/50 text-white transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'
              }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h4 className="text-base sm:text-lg font-semibold text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h4>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigateMonth(1);
            }}
            disabled={readOnly}
            className={`p-2 rounded-lg bg-gray-800/50 text-white transition-colors ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700 cursor-pointer'
              }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
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
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="h-8 sm:h-10"></div>;
            }

            const dateKey = getDateKey(date);
            const status = getAvailabilityStatus(date);
            const isPast = isPastDate(date);
            const isAcceptedBooking = isAcceptedBookingDate(date);
            const hasStatus = status && status !== 'available';
            const label = getDateLabel(status);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!readOnly && !isPast && !isAcceptedBooking) {
                    handleDateClick(date, e);
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle touch events for mobile devices
                  if (!readOnly && !isPast && !isAcceptedBooking) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateClick(date, e);
                  }
                }}
                disabled={readOnly || isPast || isAcceptedBooking}
                className={getDateClassName(date)}
                style={{ touchAction: (readOnly || isPast || isAcceptedBooking) ? 'auto' : 'manipulation' }}
                title={
                  isPast ? 'Past date' :
                    isAcceptedBooking ? 'Accepted booking - cannot edit' :
                      readOnly ? 'Click "Edit Calendar" to make changes' :
                        (label || 'Click to set availability')
                }
              >
                <div className="flex flex-col items-center justify-center">
                  <span>{date.getDate()}</span>
                  {isAcceptedBooking && (
                    <Lock className="w-2 h-2 mt-0.5" />
                  )}
                  {label && !isAcceptedBooking && (
                    <span className="text-[8px] sm:text-[9px] mt-0.5 font-normal opacity-90">
                      {label}
                    </span>
                  )}
                </div>
                {hasStatus && !readOnly && !isAcceptedBooking && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearDate(dateKey, e);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10"
                    title="Clear"
                  >
                    <X className="w-2 h-2 text-white" />
                  </button>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend - Show in both view and edit modes */}
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/40">
          <p className="text-xs text-gray-300 mb-2 font-semibold">Legend:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">Busy (Booked)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">Half Day Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 border-2 border-blue-400 rounded"></div>
              <span className="text-gray-300">Accepted Booking</span>
            </div>
            {!readOnly && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-600 rounded"></div>
                  <span className="text-gray-300">Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-800/50 rounded"></div>
                  <span className="text-gray-300">Past Date</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Selection Popup */}
      {
        showPopup && popupDate && !readOnly && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setShowPopup(false);
                setMenuLevel('main');
                setPopupDate(null);
              }}
            />
            {/* Popup Box */}
            <div
              className="absolute z-50 bg-gray-800 border-2 border-gray-600 rounded-xl shadow-2xl p-3 sm:p-4 w-[200px] sm:w-[250px] animate-fadeIn"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`
              }}
            >
              <div className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 font-medium text-center border-b border-gray-600 pb-2">
                {popupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>

              {/* Main Menu - Simplified: Only Unavailable options */}
              {menuLevel === 'main' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleStatusSelect('unavailable-fullday')}
                    className="w-full px-3 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Unavailable (Full Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMenuNavigation('unavailable-halfday')}
                    className="w-full px-3 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-between"
                  >
                    <span>Unavailable (Half Day)</span>
                    <span className="text-xs">→</span>
                  </button>
                </div>
              )}

              {/* Unavailable Half Day Sub-Menu */}
              {menuLevel === 'unavailable-halfday' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleMenuNavigation('main')}
                    className="w-full px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusSelect('unavailable-halfday-morning')}
                    className="w-full px-3 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Unavailable Morning (AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusSelect('unavailable-halfday-evening')}
                    className="w-full px-3 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Unavailable Evening (PM)
                  </button>
                </div>
              )}
            </div>
          </>
        )
      }
    </div >
  );
};

export default AvailabilityCalendar;
