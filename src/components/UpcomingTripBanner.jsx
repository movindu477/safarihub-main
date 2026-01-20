import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, Clock, MapPin, User as UserIcon } from 'lucide-react';

const UpcomingTripBanner = ({ user }) => {
  const navigate = useNavigate();
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch upcoming trip
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    // Determine if user is a service provider or customer
    const isServiceProvider = user.serviceType === 'Jeep Driver' || user.serviceType === 'Tour Guide' || user.serviceType === 'Renting';
    
    let bookingQuery;
    if (isServiceProvider) {
      // For service providers: query by driverId or guideId
      const isGuide = user.serviceType === 'Tour Guide';
      const providerField = isGuide ? 'guideId' : 'driverId';
      bookingQuery = query(
        collection(db, 'bookings'),
        where(providerField, '==', user.uid),
        where('status', '==', 'accepted')
      );
    } else {
      // For customers: query by customerId
      bookingQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', '==', 'accepted')
      );
    }

    const unsubscribe = onSnapshot(bookingQuery, (snapshot) => {
      const now = new Date();
      let nearestTrip = null;
      let nearestDate = null;

      snapshot.docs.forEach(doc => {
        const booking = { id: doc.id, ...doc.data() };
        
        // Get earliest booking date
        let earliestDate = null;
        if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
          const dates = booking.datesWithTypes.map(d => new Date(d.date));
          earliestDate = new Date(Math.min(...dates));
        } else if (booking.selectedDates) {
          const dates = Array.isArray(booking.selectedDates) 
            ? booking.selectedDates.map(d => new Date(d))
            : [new Date(booking.selectedDates)];
          earliestDate = new Date(Math.min(...dates));
        }

        // Only consider future trips
        if (earliestDate && earliestDate > now) {
          if (!nearestDate || earliestDate < nearestDate) {
            nearestDate = earliestDate;
            nearestTrip = { ...booking, tripDate: earliestDate };
          }
        }
      });

      setUpcomingTrip(nearestTrip);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Update countdown every second
  useEffect(() => {
    if (!upcomingTrip || !upcomingTrip.tripDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const difference = upcomingTrip.tripDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [upcomingTrip]);

  if (loading || !upcomingTrip) return null;

  const isServiceProvider = user.serviceType === 'Jeep Driver' || user.serviceType === 'Tour Guide' || user.serviceType === 'Renting';
  const otherPersonName = isServiceProvider ? upcomingTrip.customerName : (upcomingTrip.driverName || upcomingTrip.guideName);

  return (
    <div className="relative z-30 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div 
          onClick={() => navigate(isServiceProvider ? '/admin' : '/my-trips')}
          className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl shadow-2xl p-4 sm:p-6 cursor-pointer hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] border-2 border-emerald-400/30"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Left Section - Title and Details */}
            <div className="flex-1 text-white text-center lg:text-left">
              <h3 className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center lg:justify-start gap-2">
                <Calendar className="h-6 w-6" />
                My Upcoming Trip
              </h3>
              <div className="space-y-1 text-sm sm:text-base">
                {upcomingTrip.destination && (
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{upcomingTrip.destination}</span>
                  </div>
                )}
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span>
                    {isServiceProvider ? 'Client' : 'Service Provider'}: <span className="font-semibold">{otherPersonName}</span>
                  </span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date: <span className="font-semibold">{upcomingTrip.tripDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></span>
                </div>
              </div>
            </div>

            {/* Center Section - Countdown */}
            <div className="flex-1 flex justify-center">
              <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
                {[
                  { label: 'Days', value: countdown.days },
                  { label: 'Hours', value: countdown.hours },
                  { label: 'Mins', value: countdown.minutes },
                  { label: 'Secs', value: countdown.seconds }
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-[60px] sm:min-w-[70px] border border-white/30">
                      <div className="text-2xl sm:text-4xl font-bold text-white">
                        {String(item.value).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-white/90 mt-1 font-medium">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section - CTA */}
            <div className="flex-shrink-0">
              <button className="bg-white text-emerald-700 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition-colors shadow-lg flex items-center gap-2 text-sm sm:text-base">
                <Clock className="h-5 w-5" />
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpcomingTripBanner;
