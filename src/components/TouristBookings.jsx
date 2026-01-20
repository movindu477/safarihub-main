import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Star, CheckCircle, AlertCircle, X as CloseIcon, ChevronLeft } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import { createNotification } from '../App';

// Helper function to format dates with month as text
const formatDate = (date) => {
  if (!date) return 'N/A';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export default function TouristBookings({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'pending', 'accepted', 'completed', 'declined', 'reviewed'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch user's bookings
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Real-time listener for bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort: Pending first, then by newest (createdAt)
      bookingsData.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db, navigate]);

  // Handle review submission
  const handleReviewSubmit = async () => {
    if (!selectedBooking || !user) return;
    
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      alert('Please select a rating between 1 and 5 stars');
      return;
    }

    setSubmittingReview(true);

    try {
      // Add review to reviews collection
      await addDoc(collection(db, 'reviews'), {
        providerId: selectedBooking.providerId,
        customerId: user.uid,
        customerName: selectedBooking.customerName || 'Anonymous',
        bookingId: selectedBooking.id,
        rating: reviewData.rating,
        comment: reviewData.comment.trim(),
        createdAt: serverTimestamp()
      });

      // Update booking status to 'reviewed'
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        status: 'reviewed',
        reviewedAt: serverTimestamp()
      });

      // Send notification to provider
      await createNotification(
        selectedBooking.providerId,
        'review',
        `${selectedBooking.customerName || 'A customer'} left a ${reviewData.rating}-star review for your service`,
        `/admin?tab=profile`
      );

      // Close modal and reset
      setShowReviewModal(false);
      setReviewData({ rating: 5, comment: '' });
      setSelectedBooking(null);
      setShowBookingDetails(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
    accepted: 'bg-green-900/50 text-green-300 border-green-700',
    declined: 'bg-red-900/50 text-red-300 border-red-700',
    completed: 'bg-blue-900/50 text-blue-300 border-blue-700',
    reviewed: 'bg-purple-900/50 text-purple-300 border-purple-700',
    cancelled: 'bg-gray-700/50 text-gray-300 border-gray-600'
  };

  // Filter bookings based on selected filter
  const filteredBookings = bookingFilter === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === bookingFilter);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />
      
      <div className="flex-1 pt-20 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-6 w-6 text-gray-300" />
            </button>
            <h1 className="text-3xl font-bold text-white">My Bookings</h1>
          </div>

          {/* Filter Buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setBookingFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setBookingFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Pending ({bookings.filter(b => b.status === 'pending').length})
            </button>
            <button
              onClick={() => setBookingFilter('accepted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'accepted'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Accepted ({bookings.filter(b => b.status === 'accepted').length})
            </button>
            <button
              onClick={() => setBookingFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Completed ({bookings.filter(b => b.status === 'completed').length})
            </button>
            <button
              onClick={() => setBookingFilter('reviewed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'reviewed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Reviewed ({bookings.filter(b => b.status === 'reviewed').length})
            </button>
            <button
              onClick={() => setBookingFilter('declined')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                bookingFilter === 'declined'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Declined ({bookings.filter(b => b.status === 'declined').length})
            </button>
          </div>

          {/* Bookings List */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No bookings yet</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  Start Exploring
                </button>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found</p>
                {bookingFilter !== 'all' && (
                  <button
                    onClick={() => setBookingFilter('all')}
                    className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                  >
                    View All Bookings
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const bookingDate = booking.createdAt?.toDate?.() || booking.createdAt || new Date();
                  const formattedDate = formatDate(bookingDate);

                  // Check if booking date has passed (for review button)
                  const getLatestBookingDate = () => {
                    if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
                      const dates = booking.datesWithTypes.map(d => new Date(d.date));
                      return new Date(Math.max(...dates));
                    } else if (booking.selectedDates) {
                      const dates = Array.isArray(booking.selectedDates) 
                        ? booking.selectedDates.map(d => new Date(d))
                        : [new Date(booking.selectedDates)];
                      return new Date(Math.max(...dates));
                    }
                    return null;
                  };

                  const latestDate = getLatestBookingDate();
                  let hasBookingPassed = false;
                  
                  if (latestDate) {
                    const latestDateMidnight = new Date(latestDate);
                    latestDateMidnight.setHours(0, 0, 0, 0);
                    
                    const nowMidnight = new Date();
                    nowMidnight.setHours(0, 0, 0, 0);
                    
                    hasBookingPassed = nowMidnight > latestDateMidnight;
                  }

                  return (
                    <div
                      key={booking.id}
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowBookingDetails(true);
                      }}
                      className="rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-700 bg-gray-700/50 border-gray-600"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-white">
                              {booking.providerName || booking.serviceType || 'Service Provider'}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              statusColors[booking.status] || statusColors.pending
                            }`}>
                              {booking.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-gray-300">
                            <p><span className="font-medium">Service Type:</span> {booking.serviceType || 'N/A'}</p>
                            {booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0 ? (
                              <div>
                                <p className="font-medium mb-1">Dates:</p>
                                <div className="space-y-1">
                                  {booking.datesWithTypes.map((item, index) => {
                                    const date = item.date ? new Date(item.date) : null;
                                    const type = item.type || 'full-day';
                                    const typeLabel = type === 'half-day' ? 'Half Day' : 'Full Day';
                                    const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';
                                    const isFullDay = type === 'full' || type === 'full-day';
                                    const dayPrice = isFullDay 
                                      ? booking.priceFullDay || booking.pricePerDay 
                                      : booking.priceHalfDay || (booking.pricePerDay * 0.6);
                                    if (!date) return null;
                                    return (
                                      <div key={index} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-300">{formatDate(date)}</span>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                                          {dayPrice && (
                                            <span className="text-gray-300 font-medium">LKR {dayPrice.toLocaleString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : booking.selectedDates ? (
                              <p><span className="font-medium">Dates:</span> {
                                Array.isArray(booking.selectedDates)
                                  ? booking.selectedDates.map(d => formatDate(new Date(d))).join(', ')
                                  : formatDate(new Date(booking.selectedDates))
                              }</p>
                            ) : booking.datesString ? (
                              <p><span className="font-medium">Dates:</span> {booking.datesString}</p>
                            ) : null}
                            {booking.destination && (
                              <p><span className="font-medium">Destination:</span> {booking.destination}</p>
                            )}
                            {booking.totalPrice && (
                              <p className="border-t border-gray-700 pt-2 mt-2">
                                <span className="font-medium">Total Price:</span>{' '}
                                <span className="font-bold text-base">LKR {booking.totalPrice.toLocaleString()}</span>
                              </p>
                            )}
                            <p><span className="font-medium">Booked on:</span> {formattedDate}</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        {booking.status === 'completed' && hasBookingPassed && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowReviewModal(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                              <Star className="h-4 w-4" />
                              Leave a Review
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Leave a Review</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewData({ rating: 5, comment: '' });
                }}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
              >
                <CloseIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-2">
                Service Provider: <span className="font-semibold text-white">{selectedBooking.providerName || 'Service Provider'}</span>
              </p>
              <p className="text-gray-400 text-xs">
                {selectedBooking.serviceType} • {selectedBooking.destination}
              </p>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Rating *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Review (Optional)
              </label>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                placeholder="Share your experience with this service provider..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewData({ rating: 5, comment: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit Review
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
