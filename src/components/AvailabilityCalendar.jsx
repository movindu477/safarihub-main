import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

// Availability Calendar Component for Service Providers
const AvailabilityCalendar = ({ availability, onChange, readOnly = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showHalfDayMenu, setShowHalfDayMenu] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupDate, setPopupDate] = useState(null);

  // Initialize availability state if not provided
  const [dateAvailability, setDateAvailability] = useState(() => {
    if (availability && typeof availability === 'object' && !Array.isArray(availability)) {
      return { ...availability };
    }
    return {};
  });

  // Update parent when availability changes
  useEffect(() => {
    if (onChange && typeof onChange === 'function') {
      try {
        onChange(dateAvailability);
      } catch (error) {
        console.error('Error calling onChange in AvailabilityCalendar:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateAvailability]);

  // Initialize from props only on mount or when availability prop actually changes
  useEffect(() => {
    if (availability && typeof availability === 'object' && !Array.isArray(availability)) {
      setDateAvailability(prev => {
        // Only update if it's actually different
        const availStr = JSON.stringify(availability);
        const prevStr = JSON.stringify(prev);
        if (availStr !== prevStr) {
          return { ...availability };
        }
        return prev;
      });
    }
  }, [availability]);

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
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  const getAvailabilityStatus = (date) => {
    if (!date) return null;
    const dateKey = getDateKey(date);
    return dateAvailability[dateKey] || null;
  };

  const isPastDate = useCallback((date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const handleDateClick = useCallback((date, event) => {
    if (readOnly || !date || isPastDate(date)) {
      console.log('📅 Date click blocked:', { readOnly, date: date?.toISOString(), isPast: isPastDate(date) });
      return;
    }

    // Get the click position relative to the calendar container
    const rect = event.target.getBoundingClientRect();
    const container = event.target.closest('.bg-gray-900\\/50');
    const containerRect = container ? container.getBoundingClientRect() : rect;

    const viewportWidth = window.innerWidth;

    // Popup dimensions (approximate)
    const popupWidth = viewportWidth < 640 ? 170 : 200;
    const popupHeight = viewportWidth < 640 ? 180 : 200;

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
    setShowHalfDayMenu(false);
  }, [readOnly, isPastDate]);

  const handleStatusSelect = useCallback((status) => {
    if (!popupDate) return;

    // If "Half Day" is clicked, show sub-menu instead of setting status
    if (status === 'halfday') {
      setShowHalfDayMenu(true);
      return;
    }

    const dateKey = getDateKey(popupDate);

    setDateAvailability(prev => {
      const newState = { ...prev };
      if (!status || status === 'available') {
        delete newState[dateKey]; // Remove if available/null (unselected)
      } else {
        newState[dateKey] = status;
      }
      console.log('📅 Date status set:', dateKey, '→', status);
      return newState;
    });

    // Close popup
    setShowPopup(false);
    setShowHalfDayMenu(false);
    setPopupDate(null);
  }, [popupDate]);

  const handleBackToMainMenu = () => {
    setShowHalfDayMenu(false);
  };

  const clearDate = (dateKey, e) => {
    e?.stopPropagation();
    setDateAvailability(prev => {
      const newState = { ...prev };
      delete newState[dateKey];
      return newState;
    });
  };

  const getDateClassName = (date) => {
    if (!date) return '';
    const status = getAvailabilityStatus(date);
    const isPast = isPastDate(date);
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

    const baseClasses = 'relative w-full h-8 sm:h-10 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium flex items-center justify-center';

    if (isPast) {
      return `${baseClasses} bg-gray-800/50 text-gray-600 cursor-not-allowed`;
    }

    // Handle different statuses
    switch (status) {
      case 'fullday':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'halfday-morning':
        return `${baseClasses} bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'halfday-evening':
        return `${baseClasses} bg-yellow-600 text-white hover:bg-yellow-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'halfday': // Legacy support
        return `${baseClasses} bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'unavailable':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'busy': // Legacy support
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case null:
      case 'available':
      default:
        // Unselected state - no green, just transparent/gray
        return `${baseClasses} bg-transparent text-gray-400 border border-gray-600/30 hover:bg-gray-700/20 hover:border-gray-500/40 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
    }
  };

  const getDateLabel = (status) => {
    switch (status) {
      case 'fullday':
      case 'busy': // Legacy
        return 'Full Day';
      case 'halfday-morning':
        return 'Morning';
      case 'halfday-evening':
        return 'Evening';
      case 'halfday': // Legacy
        return 'Half Day';
      case 'unavailable':
        return 'Unavailable';
      default:
        return null;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Count availability types
  const availabilityCounts = {
    available: 0,
    fullday: 0,
    'halfday-morning': 0,
    'halfday-evening': 0,
    unavailable: 0
  };

  Object.values(dateAvailability).forEach(status => {
    // Map legacy statuses
    if (status === 'busy') {
      availabilityCounts.fullday++;
    } else if (status === 'halfday') {
      availabilityCounts['halfday-morning']++; // Count legacy halfday as morning
    } else if (availabilityCounts.hasOwnProperty(status)) {
      availabilityCounts[status]++;
    }
  });

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
            const hasStatus = status && status !== 'available';
            const label = getDateLabel(status);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDateClick(date, e);
                }}
                disabled={readOnly || isPast}
                className={getDateClassName(date)}
                title={isPast ? 'Past date' : (label || 'Click to set availability')}
              >
                <div className="flex flex-col items-center justify-center">
                  <span>{date.getDate()}</span>
                  {label && (
                    <span className="text-[8px] sm:text-[9px] mt-0.5 font-normal opacity-90">
                      {label}
                    </span>
                  )}
                </div>
                {hasStatus && !readOnly && (
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

        {/* Summary */}
        {!readOnly && Object.keys(dateAvailability).length > 0 && (
          <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/40">
            <p className="text-xs text-gray-300 mb-2">Availability Summary:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="text-red-400">Full Day: {availabilityCounts.fullday}</div>
              <div className="text-yellow-400">Morning Half: {availabilityCounts['halfday-morning']}</div>
              <div className="text-yellow-500">Evening Half: {availabilityCounts['halfday-evening']}</div>
              <div className="text-gray-400">Unavailable: {availabilityCounts.unavailable}</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Selection Popup */}
      {showPopup && popupDate && !readOnly && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowPopup(false);
              setShowHalfDayMenu(false);
              setPopupDate(null);
            }}
          />
          {/* Popup Box - uses absolute positioning to scroll with content */}
          <div
            className="absolute z-50 bg-gray-800 border-2 border-gray-600 rounded-xl shadow-2xl p-3 sm:p-4 w-[170px] sm:w-[200px] animate-fadeIn"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`
            }}
          >
            <div className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 font-medium text-center border-b border-gray-600 pb-2">
              {popupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <button
                type="button"
                onClick={() => handleStatusSelect(null)}
                className="w-full px-2 sm:px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2 touch-manipulation"
              >
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border border-white rounded shrink-0"></div>
                <span>Available</span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusSelect('unavailable')}
                className="w-full px-2 sm:px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2 touch-manipulation"
              >
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gray-700 rounded shrink-0"></div>
                <span>Unavailable</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
