import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

// Availability Calendar Component for Service Providers
const AvailabilityCalendar = ({ availability, onChange, readOnly = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

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
    return dateAvailability[dateKey] || 'available';
  };

  const isPastDate = useCallback((date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const handleDateClick = useCallback((date) => {
    if (readOnly || !date || isPastDate(date)) {
      console.log('📅 Date click blocked:', { readOnly, date: date?.toISOString(), isPast: isPastDate(date) });
      return;
    }

    const dateKey = getDateKey(date);
    
    setDateAvailability(prev => {
      const currentStatus = prev[dateKey] || 'available';

      // Cycle through availability types: available -> busy -> halfday -> unavailable -> available
      const statusCycle = {
        'available': 'busy',
        'busy': 'halfday',
        'halfday': 'unavailable',
        'unavailable': 'available'
      };

      const newStatus = statusCycle[currentStatus] || 'available';
      console.log('📅 Date status changed:', dateKey, currentStatus, '→', newStatus);

      // If cycling back to available, remove from object instead of setting to 'available'
      const newState = { ...prev };
      if (newStatus === 'available') {
        delete newState[dateKey];
      } else {
        newState[dateKey] = newStatus;
      }

      return newState;
    });

    // Set selection for visual feedback
    setSelectedDate(date);
    setTimeout(() => setSelectedDate(null), 200);
  }, [readOnly, isPastDate]);

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

    switch (status) {
      case 'busy':
        return `${baseClasses} bg-red-500 text-white hover:bg-red-600 ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'halfday':
        return `${baseClasses} bg-yellow-500 text-white hover:bg-yellow-600 ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'unavailable':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available':
      default:
        return `${baseClasses} bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];

  // Count availability types
  const availabilityCounts = {
    available: 0,
    busy: 0,
    halfday: 0,
    unavailable: 0
  };

  Object.values(dateAvailability).forEach(status => {
    if (availabilityCounts.hasOwnProperty(status)) {
      availabilityCounts[status]++;
    }
  });

  return (
    <div className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-700/40 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">
          {readOnly ? 'Availability Calendar' : 'Mark Your Availability'}
        </h3>
      </div>

      {!readOnly && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-200 mb-2">
            <strong>Instructions:</strong> Click on a date to cycle through availability types. Click multiple times to change status.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded"></div>
              <span className="text-xs text-gray-300">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-xs text-gray-300">Busy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-xs text-gray-300">Half Day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-600 rounded"></div>
              <span className="text-xs text-gray-300">Unavailable</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateMonth(-1);
          }}
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors cursor-pointer"
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
          className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700 text-white transition-colors cursor-pointer"
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

          return (
            <button
              key={dateKey}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDateClick(date);
              }}
              disabled={readOnly || isPast}
              className={getDateClassName(date)}
              title={isPast ? 'Past date' : (status === 'available' || !status ? 'Available' : status.charAt(0).toUpperCase() + status.slice(1))}
            >
              {date.getDate()}
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
            <div className="text-green-400">Available: {availabilityCounts.available}</div>
            <div className="text-red-400">Busy: {availabilityCounts.busy}</div>
            <div className="text-yellow-400">Half Day: {availabilityCounts.halfday}</div>
            <div className="text-gray-400">Unavailable: {availabilityCounts.unavailable}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
