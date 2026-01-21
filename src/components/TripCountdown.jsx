import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const TripCountdown = ({ nextBooking }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    if (!nextBooking || !nextBooking.startDate) {
      return;
    }

    const calculateTimeRemaining = () => {
      // Parse the start date
      let bookingDate;
      if (nextBooking.startDate.toDate) {
        // Firestore Timestamp
        bookingDate = nextBooking.startDate.toDate();
      } else if (nextBooking.startDate instanceof Date) {
        bookingDate = nextBooking.startDate;
      } else {
        // String date
        bookingDate = new Date(nextBooking.startDate);
      }

      const now = new Date();
      const difference = bookingDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [nextBooking]);

  if (!nextBooking || !nextBooking.startDate) {
    return null;
  }

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-emerald-500 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-emerald-500" />
        <h3 className="text-emerald-500 font-bold text-sm uppercase tracking-wide">
          Next Trip Countdown
        </h3>
      </div>

      {/* Countdown Display */}
      <div className="grid grid-cols-3 gap-3">
        {/* Days */}
        <div className="flex flex-col items-center">
          <div className="bg-gray-900/80 rounded-lg p-3 w-full">
            <div className="text-3xl font-bold text-emerald-400 text-center">
              {formatNumber(timeRemaining.days)}
            </div>
          </div>
          <span className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Days</span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <div className="bg-gray-900/80 rounded-lg p-3 w-full">
            <div className="text-3xl font-bold text-emerald-400 text-center">
              {formatNumber(timeRemaining.hours)}
            </div>
          </div>
          <span className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Hrs</span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div className="bg-gray-900/80 rounded-lg p-3 w-full">
            <div className="text-3xl font-bold text-emerald-400 text-center">
              {formatNumber(timeRemaining.minutes)}
            </div>
          </div>
          <span className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Min</span>
        </div>
      </div>

      {/* Booking Info */}
      {nextBooking.customerName && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Client: <span className="text-white font-semibold">{nextBooking.customerName}</span>
          </p>
          {nextBooking.destination && (
            <p className="text-sm text-gray-400 mt-1">
              Destination: <span className="text-emerald-400 font-semibold">{nextBooking.destination}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TripCountdown;
