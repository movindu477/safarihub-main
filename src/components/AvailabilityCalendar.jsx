import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";

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
  // IMPORTANT: Multiple half-day bookings can exist on the same date (AM + PM).
  // We must MERGE them so the calendar correctly blocks fully booked days.
  const getAcceptedBookingDates = useCallback(() => {
    const datesMap = new Map();

    const ensureEntry = (dateKey) => {
      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, {
          isFullDay: false,
          bookedMorning: false,
          bookedEvening: false,
          bookingIds: new Set()
        });
      }
      return datesMap.get(dateKey);
    };

    const normalizeSlot = (time) => (String(time || '').toLowerCase().includes('evening') ? 'evening' : 'morning');

    acceptedBookings.forEach(booking => {
      const defaultTime = booking.safariType?.toLowerCase().includes('evening') ? 'evening' : 'morning';

      // Priority 1: datesWithTypes (contains specific half/full day info)
      if (booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0) {
        booking.datesWithTypes.forEach(item => {
          let date;
          if (item.date && item.date.toDate) date = item.date.toDate();
          else if (item.date instanceof Date) date = item.date;
          else if (item.date) date = new Date(item.date);

          if (!date || isNaN(date.getTime())) return;

          const dateKey = date.toISOString().split('T')[0];
          const entry = ensureEntry(dateKey);
          entry.bookingIds.add(booking.id);

          const type = String(item.type || 'full-day').toLowerCase();
          if (type.includes('half')) {
            const slot = normalizeSlot(item.time || (booking.halfDayTimes && booking.halfDayTimes[dateKey]) || defaultTime);
            if (slot === 'evening') entry.bookedEvening = true;
            else entry.bookedMorning = true;
          } else {
            entry.isFullDay = true;
          }
        });
      }
      // Priority 2: selectedDates (legacy array of dates) -> treat as full day
      else if (booking.selectedDates && Array.isArray(booking.selectedDates)) {
        booking.selectedDates.forEach(d => {
          let date;
          if (d && d.toDate) date = d.toDate();
          else if (d instanceof Date) date = d;
          else if (d) date = new Date(d);

          if (!date || isNaN(date.getTime())) return;
          const dateKey = date.toISOString().split('T')[0];
          const entry = ensureEntry(dateKey);
          entry.isFullDay = true;
          entry.bookingIds.add(booking.id);
        });
      }
      // Priority 3: dates (older legacy) -> treat as full day
      else if (booking.dates && Array.isArray(booking.dates)) {
        booking.dates.forEach(d => {
          let date;
          if (d && d.toDate) date = d.toDate();
          else if (d instanceof Date) date = d;
          else if (d) date = new Date(d);

          if (!date || isNaN(date.getTime())) return;
          const dateKey = date.toISOString().split('T')[0];
          const entry = ensureEntry(dateKey);
          entry.isFullDay = true;
          entry.bookingIds.add(booking.id);
        });
      }
      // Priority 4: startDate (single date legacy) -> treat as full day
      else if (booking.startDate) {
        let date;
        if (booking.startDate.toDate) date = booking.startDate.toDate();
        else date = new Date(booking.startDate);

        if (!date || isNaN(date.getTime())) return;
        const dateKey = date.toISOString().split('T')[0];
        const entry = ensureEntry(dateKey);
        entry.isFullDay = true;
        entry.bookingIds.add(booking.id);
      }
    });

    // Convert Set to Array + add legacy fields used by the existing popup menus
    // (menus expect: isHalfDay + time)
    for (const [k, v] of datesMap.entries()) {
      const bookingIds = Array.from(v.bookingIds);

      // A date is "full day booked" if:
      // - any booking explicitly marked it full day, OR
      // - both half-day slots are booked (AM + PM) via two half-day bookings
      const isFullDay = !!v.isFullDay || (v.bookedMorning && v.bookedEvening);
      const isHalfDay = !isFullDay && (v.bookedMorning || v.bookedEvening);
      const time = isHalfDay ? (v.bookedEvening ? 'evening' : 'morning') : undefined;

      datesMap.set(k, {
        ...v,
        bookingIds,
        bookingId: bookingIds[0], // keep a simple primary id for existing UI
        isFullDay,
        isHalfDay,
        time,
        type: isHalfDay ? 'half-day' : 'full-day'
      });
    }

    return datesMap;
  }, [acceptedBookings]);

  const acceptedDatesMap = getAcceptedBookingDates();

  // Check if a date has an accepted booking - returns the info object or undefined
  const getAcceptedBookingInfo = useCallback((date) => {
    if (!date) return undefined;
    const dateKey = date.toISOString().split('T')[0];
    return acceptedDatesMap.get(dateKey);
  }, [acceptedDatesMap]);

  // Helper to determine if a date should be blocked from interaction
  // - Block full-day bookings
  // - Block dates where BOTH halves are booked (AM + PM from two half-day bookings)
  // - Allow interaction for single half-day booking so provider can edit the OTHER half
  const isBlockedDate = useCallback((date) => {
    const info = getAcceptedBookingInfo(date);
    if (!info) return false;
    return !!info.isFullDay || (info.bookedMorning && info.bookedEvening);
  }, [getAcceptedBookingInfo]);

  // Backward compatibility alias if needed, though we use isBlockedDate in handleDateClick
  const isAcceptedBookingDate = useCallback((date) => {
    return !!getAcceptedBookingInfo(date);
  }, [getAcceptedBookingInfo]);

  // ... (getDaysInMonth, navigateMonth, getDateKey, getAvailabilityStatus... match existing)

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const navigateMonth = useCallback((direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
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
    return (availability || {})[dateKey] || null;
  };

  const isPastDate = useCallback((date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const handleDateClick = useCallback((date, event) => {
    // Check if blocked (Full Day Accepted Booking)
    if (readOnly || !date || isPastDate(date) || isBlockedDate(date)) {
      return;
    }
    // ... rest of handleDateClick popup logic ...
    const rect = event.target.getBoundingClientRect();
    const container = event.target.closest('.bg-gray-900\\/50') || event.target.parentElement; // robust fallback
    const containerRect = container ? container.getBoundingClientRect() : rect;
    const viewportWidth = window.innerWidth;
    const popupWidth = viewportWidth < 640 ? 200 : 250;
    const popupHeight = viewportWidth < 640 ? 240 : 280;
    let left = rect.left - containerRect.left + rect.width + 10;
    let top = rect.top - containerRect.top;

    if (viewportWidth < 640) left = (containerRect.width - popupWidth) / 2;
    else {
      if (left + popupWidth > containerRect.width - 10) left = rect.left - containerRect.left - popupWidth - 10;
      if (left < 10) left = 10;
    }
    if (top + popupHeight > containerRect.height - 10) top = Math.max(10, containerRect.height - popupHeight - 10);
    if (top < 10) top = 10;

    setPopupPosition({ top, left });
    setPopupDate(date);
    setShowPopup(true);
    setMenuLevel('main');
  }, [readOnly, isPastDate, isBlockedDate]);

  const handleStatusSelect = useCallback((status) => {
    // ... same implementation as before ...
    if (!popupDate || !onChange) return;
    const dateKey = getDateKey(popupDate);
    const newState = { ...(availability || {}) };
    if (!status || status === 'available') {
      delete newState[dateKey];
    } else {
      newState[dateKey] = status;
    }
    onChange(newState);
    setShowPopup(false);
    setMenuLevel('main');
    setPopupDate(null);
  }, [popupDate, availability, onChange]);

  const handleMenuNavigation = (level) => setMenuLevel(level);
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
    const acceptedInfo = getAcceptedBookingInfo(date);
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime();

    const baseClasses = 'relative w-full h-12 sm:h-16 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium flex items-center justify-center';

    if (isPast) {
      return `${baseClasses} bg-gray-800/50 text-gray-600 cursor-not-allowed`;
    }

    if (acceptedInfo) {
      const isFullyBookedByBookings = !!acceptedInfo.isFullDay || (acceptedInfo.bookedMorning && acceptedInfo.bookedEvening);
      if (!isFullyBookedByBookings && (acceptedInfo.bookedMorning || acceptedInfo.bookedEvening)) {
        const bookedTime = acceptedInfo.bookedEvening ? 'evening' : 'morning';
        const otherHalf = bookedTime === 'morning' ? 'evening' : 'morning';

        const isManuallyUnavailable =
          (otherHalf === 'evening' && status === 'unavailable-halfday-evening') ||
          (otherHalf === 'morning' && status === 'unavailable-halfday-morning');

        if (isManuallyUnavailable) {
          // Fully occupied (Half Booked / Half Manual) -> Orange (Mixed)
          return `${baseClasses} bg-orange-600 text-white cursor-pointer border-2 border-blue-400 font-bold shadow-sm hover:bg-orange-700`;
        }

        // Partially booked -> Orange
        return `${baseClasses} bg-orange-500 text-white cursor-pointer border-2 border-blue-400 font-bold shadow-sm hover:bg-orange-600`;
      } else {
        // Red for Fully Booked
        return `${baseClasses} bg-red-600 text-white cursor-not-allowed border-2 border-blue-400 font-bold shadow-sm`;
      }
    }

    switch (status) {
      case 'unavailable-fullday':
      case 'unavailable':
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'unavailable-halfday-morning':
      case 'unavailable-halfday-evening':
        return `${baseClasses} bg-orange-500 text-white hover:bg-orange-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available-fullday':
      case 'available':
        return `${baseClasses} bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      case 'available-halfday-morning':
      case 'available-halfday-evening':
        return `${baseClasses} bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
      default:
        return `${baseClasses} bg-transparent text-gray-400 border border-gray-600/30 hover:bg-gray-700/20 hover:border-gray-500/40 cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
    }
  };

  const getDateLabel = (dateOrStatus) => {
    // Determine input type (status string or date object) because structure changed
    let status = typeof dateOrStatus === 'string' ? dateOrStatus : null;
    let acceptedInfo = null;
    let manualStatus = null;

    if (typeof dateOrStatus === 'object' && dateOrStatus !== null) {
      manualStatus = getAvailabilityStatus(dateOrStatus);
      acceptedInfo = getAcceptedBookingInfo(dateOrStatus);
    } else {
      // Fallback for legend calls or simple status checking
      status = dateOrStatus;
    }

    if (acceptedInfo) {
      const isFullyBookedByBookings = !!acceptedInfo.isFullDay || (acceptedInfo.bookedMorning && acceptedInfo.bookedEvening);
      if (!isFullyBookedByBookings && (acceptedInfo.bookedMorning || acceptedInfo.bookedEvening)) {
        const bookedTime = acceptedInfo.bookedEvening ? 'evening' : 'morning';
        const isAmBooked = bookedTime === 'morning';

        // Context aware label for mixed state
        if ((isAmBooked && manualStatus === 'unavailable-halfday-evening') ||
          (!isAmBooked && manualStatus === 'unavailable-halfday-morning')) {
          return isAmBooked ? 'AM Booked / PM Unavailable' : 'PM Booked / AM Unavailable';
        }
        return isAmBooked ? 'AM Booked' : 'PM Booked';
      } else {
        return 'Full Day Booked';
      }
    }

    // Standard labels
    const s = manualStatus || status;
    switch (s) {
      case 'unavailable-fullday':
        return 'Unavailable Full';
      case 'unavailable-halfday-morning':
        return 'Unavailable AM';
      case 'unavailable-halfday-evening':
        return 'Unavailable PM';
      case 'available-fullday':
        return 'Avail Full';
      case 'available-halfday-morning':
        return 'Avail AM';
      case 'available-halfday-evening':
        return 'Avail PM';
      // Legacy
      case 'busy':
      case 'halfday':
        return 'Full Day Booked';
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
              return <div key={`empty-${index}`} className="h-12 sm:h-16"></div>;
            }

            const dateKey = getDateKey(date);
            const status = getAvailabilityStatus(date);
            const isPast = isPastDate(date);
            const isAcceptedBooking = isAcceptedBookingDate(date);
            const hasStatus = status && status !== 'available';
            // pass date object to get label context
            const label = getDateLabel(date);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Check blocked via function call now
                  if (!readOnly && !isPast && !isBlockedDate(date)) {
                    handleDateClick(date, e);
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle touch events for mobile devices
                  if (!readOnly && !isPast && !isBlockedDate(date)) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateClick(date, e);
                  }
                }}
                disabled={readOnly || isPast || isBlockedDate(date)}
                className={getDateClassName(date)}
                style={{ touchAction: (readOnly || isPast || isBlockedDate(date)) ? 'auto' : 'manipulation' }}
                title={
                  isPast ? 'Past date' :
                    isBlockedDate(date) ? 'Accepted booking - cannot edit' :
                      readOnly ? 'Click "Edit Calendar" to make changes' :
                        (label || 'Click to set availability')
                }
              >
                <div className="flex flex-col items-center justify-center">
                  <span>{date.getDate()}</span>
                  {label && !isAcceptedBooking && (
                    <span className="text-[8px] sm:text-[9px] mt-0.5 font-normal opacity-90">
                      {label}
                    </span>
                  )}
                  {/* Show label for Half Day Accepted Bookings too if they have text */}
                  {isAcceptedBooking && label && (
                    <span className="text-[7px] sm:text-[8px] mt-0.5 font-bold opacity-100 leading-tight px-1">
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

        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/40">
          <p className="text-xs text-gray-300 mb-2 font-semibold">Legend:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 border border-blue-400 rounded"></div>
              <span className="text-gray-300">Booked (Full Day)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600 border border-blue-400 rounded"></div>
              <span className="text-gray-300">Mixed Occupied (Booked/Manual)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-300">Partial (Booked or Manual)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600 rounded"></div>
              <span className="text-gray-300">Unavailable (Manual Full Day)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-blue-400 rounded"></div>
              <span className="text-gray-300">Has Accepted Booking</span>
            </div>
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
              className="absolute z-50 bg-gray-800 border-2 border-gray-600 rounded-xl shadow-2xl p-3 sm:p-4 w-[200px] sm:w-[250px] animate-fadeIn pointer-events-auto"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 font-medium text-center border-b border-gray-600 pb-2">
                {popupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {getAcceptedBookingInfo(popupDate)?.isHalfDay && (
                  <div className="text-yellow-500 text-xs mt-1">
                    {getAcceptedBookingInfo(popupDate).time === 'evening' ? 'Evening is Booked' : 'Morning is Booked'}
                  </div>
                )}
              </div>

              {/* Main Menu */}
              {menuLevel === 'main' && (
                <div className="space-y-2">
                  {/* If there's NO booking or a different kind, show standard options */}
                  {!getAcceptedBookingInfo(popupDate) && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStatusSelect(getAvailabilityStatus(popupDate) === 'unavailable-fullday' ? 'available' : 'unavailable-fullday');
                        }}
                        className={`w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getAvailabilityStatus(popupDate) === 'unavailable-fullday'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                      >
                        {getAvailabilityStatus(popupDate) === 'unavailable-fullday' ? 'Mark as Available' : 'Unavailable (Full Day)'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMenuNavigation('unavailable-halfday');
                        }}
                        className="w-full px-3 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-between"
                      >
                        <span>Unavailable (Half Day)</span>
                        <span className="text-xs">→</span>
                      </button>
                    </>
                  )}

                  {/* If there IS a half-day booking, show complementary option only */}
                  {getAcceptedBookingInfo(popupDate)?.isHalfDay && (
                    <>
                      {getAcceptedBookingInfo(popupDate).time !== 'morning' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStatusSelect(getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning' ? 'available' : 'unavailable-halfday-morning');
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                        >
                          {getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning' ? 'Mark Morning Available' : 'Mark Morning Unavailable'}
                        </button>
                      )}
                      {getAcceptedBookingInfo(popupDate).time !== 'evening' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStatusSelect(getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening' ? 'available' : 'unavailable-halfday-evening');
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                        >
                          {getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening' ? 'Mark Evening Available' : 'Mark Evening Unavailable'}
                        </button>
                      )}


                    </>
                  )}
                </div>
              )}


              {/* Unavailable Half Day Sub-Menu */}
              {menuLevel === 'unavailable-halfday' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMenuNavigation('main');
                    }}
                    className="w-full px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStatusSelect(getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning' ? 'available' : 'unavailable-halfday-morning');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                  >
                    {getAvailabilityStatus(popupDate) === 'unavailable-halfday-morning' ? 'Mark Morning Available' : 'Unavailable Morning (AM)'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStatusSelect(getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening' ? 'available' : 'unavailable-halfday-evening');
                    }}
                    className={`w-full px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                      }`}
                  >
                    {getAvailabilityStatus(popupDate) === 'unavailable-halfday-evening' ? 'Mark Evening Available' : 'Unavailable Evening (PM)'}
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
