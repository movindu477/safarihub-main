import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc,
  serverTimestamp,
  setDoc,
  getDocs,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  Flag
} from "lucide-react";

// Initialize Firebase
const db = getFirestore();
const auth = getAuth();

// Import Firebase functions from App
import { 
  createOrGetConversation, 
  sendMessage, 
  getMessages, 
  markMessagesAsRead, 
  createNotification,
  getUserNotifications,
  getConversationById,
  getOtherParticipant,
  markNotificationAsRead,
  GlobalNotificationBell
} from "../App";

// Enhanced Review Component
const RatingReview = ({ driverId, currentUser, userRole, onReviewAdded }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeTab, setActiveTab] = useState("reviews");
  const [reviewStats, setReviewStats] = useState(null);

  // Check if user has already reviewed and load all reviews
  useEffect(() => {
    if (!driverId) return;

    const checkUserReview = async () => {
      if (!currentUser) return;

      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('driverId', '==', driverId),
          where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(reviewsQuery);
        if (!querySnapshot.empty) {
          const userReviewDoc = querySnapshot.docs[0];
          setUserReview({
            id: userReviewDoc.id,
            ...userReviewDoc.data()
          });
          setRating(userReviewDoc.data().rating);
          setReview(userReviewDoc.data().comment);
        }
      } catch (error) {
        console.error('Error checking user review:', error);
      }
    };

    checkUserReview();
  }, [currentUser, driverId]);

  // Load all reviews with real-time updates
  useEffect(() => {
    if (!driverId) return;

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('driverId', '==', driverId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
      calculateReviewStats(reviewsData);
    });

    return () => unsubscribe();
  }, [driverId]);

  // Calculate review statistics
  const calculateReviewStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setReviewStats({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      return;
    }

    const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviewsData.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    setReviewStats({
      totalReviews: reviewsData.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating || !review.trim() || !currentUser || !driverId || submitting) return;

    setSubmitting(true);
    
    try {
      const reviewData = {
        driverId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userPhoto: currentUser.photoURL || '',
        rating,
        comment: review.trim(),
        timestamp: serverTimestamp(),
        userEmail: currentUser.email || '',
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: []
      };

      let reviewId;
      if (userReview) {
        // Update existing review
        await updateDoc(doc(db, 'reviews', userReview.id), reviewData);
        reviewId = userReview.id;
      } else {
        // Add new review
        const docRef = await addDoc(collection(db, 'reviews'), reviewData);
        reviewId = docRef.id;
      }

      // Update driver's average rating
      await updateDriverRating();

      // Clear form
      if (!userReview) {
        setReview("");
        setRating(0);
      }
      
      // Switch to reviews tab to show the new review
      setActiveTab("reviews");
      
      // Scroll to the new review
      setTimeout(() => {
        const reviewElement = document.getElementById(`review-${reviewId}`);
        if (reviewElement) {
          reviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          reviewElement.classList.add('bg-yellow-50', 'border-yellow-200');
          setTimeout(() => {
            reviewElement.classList.remove('bg-yellow-50', 'border-yellow-200');
          }, 2000);
        }
      }, 500);

      onReviewAdded?.();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateDriverRating = async () => {
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('driverId', '==', driverId)
      );
      
      const querySnapshot = await getDocs(reviewsQuery);
      const allReviews = querySnapshot.docs.map(doc => doc.data());
      
      if (allReviews.length > 0) {
        const averageRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
        const roundedRating = Math.round(averageRating * 10) / 10;
        
        await updateDoc(doc(db, 'serviceProviders', driverId), {
          rating: roundedRating,
          totalReviews: allReviews.length,
          lastRatingUpdate: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating driver rating:', error);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteDoc(doc(db, 'reviews', userReview.id));
        setUserReview(null);
        setRating(0);
        setReview("");
        await updateDriverRating();
      } catch (error) {
        console.error('Error deleting review:', error);
        alert('Failed to delete review. Please try again.');
      }
    }
  };

  const handleLikeReview = async (reviewId) => {
    if (!currentUser) {
      alert('Please login to like reviews');
      return;
    }
    
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) return;
      
      const reviewData = reviewDoc.data();
      
      // Check if user already liked
      if (reviewData.likedBy?.includes(currentUser.uid)) {
        // Unlike
        await updateDoc(reviewRef, {
          likes: (reviewData.likes || 0) - 1,
          likedBy: arrayRemove(currentUser.uid)
        });
      } else {
        // Like
        const updates = {
          likes: (reviewData.likes || 0) + 1,
          likedBy: arrayUnion(currentUser.uid)
        };
        
        // Remove from dislikes if user previously disliked
        if (reviewData.dislikedBy?.includes(currentUser.uid)) {
          updates.dislikes = Math.max(0, (reviewData.dislikes || 0) - 1);
          updates.dislikedBy = arrayRemove(currentUser.uid);
        }
        
        await updateDoc(reviewRef, updates);
      }
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleDislikeReview = async (reviewId) => {
    if (!currentUser) {
      alert('Please login to dislike reviews');
      return;
    }
    
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) return;
      
      const reviewData = reviewDoc.data();
      
      // Check if user already disliked
      if (reviewData.dislikedBy?.includes(currentUser.uid)) {
        // Remove dislike
        await updateDoc(reviewRef, {
          dislikes: Math.max(0, (reviewData.dislikes || 0) - 1),
          dislikedBy: arrayRemove(currentUser.uid)
        });
      } else {
        // Dislike
        const updates = {
          dislikes: (reviewData.dislikes || 0) + 1,
          dislikedBy: arrayUnion(currentUser.uid)
        };
        
        // Remove from likes if user previously liked
        if (reviewData.likedBy?.includes(currentUser.uid)) {
          updates.likes = Math.max(0, (reviewData.likes || 0) - 1);
          updates.likedBy = arrayRemove(currentUser.uid);
        }
        
        await updateDoc(reviewRef, updates);
      }
    } catch (error) {
      console.error('Error disliking review:', error);
    }
  };

  const renderStars = (rating, size = 16) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Recently';
    }
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Review Header with Stats */}
      {reviewStats && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
              <p className="text-gray-600 mt-1">
                Read what other travelers say about this driver
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{reviewStats.averageRating}</div>
                <div className="flex items-center justify-center mt-1">
                  {renderStars(reviewStats.averageRating, 16)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="hidden sm:block">
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map(star => (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-gray-600">{star}★</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ 
                            width: `${reviewStats.totalReviews > 0 ? (reviewStats.ratingDistribution[star] / reviewStats.totalReviews) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="w-8 text-gray-500 text-right">
                        {reviewStats.ratingDistribution[star]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab("write")}
            className={`py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
              activeTab === "write"
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Write Review
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
              activeTab === "reviews"
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
        </nav>
      </div>

      {/* Write Review Tab */}
      {activeTab === "write" && currentUser && userRole === 'tourist' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {userReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={32}
                      className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {rating === 0 && "Select a rating"}
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience with this driver... What did you like? What could be improved?"
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                required
                minLength="10"
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 10 characters. Your review will be visible to all users.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!rating || !review.trim() || review.trim().length < 10 || submitting}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {userReview ? 'Updating...' : 'Submitting...'}
                  </>
                ) : userReview ? (
                  'Update Review'
                ) : (
                  'Submit Review'
                )}
              </button>
              
              {userReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Reviews List Tab */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Customer Reviews ({reviews.length})
            </h3>
            
            {reviews.length > 3 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                {showAllReviews ? 'Show Less' : `Show All (${reviews.length})`}
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
              <p className="text-gray-500 mb-4">Be the first to share your experience with this driver!</p>
              {currentUser && userRole === 'tourist' && (
                <button
                  onClick={() => setActiveTab("write")}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Write First Review
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {displayedReviews.map((reviewItem) => (
                <div 
                  key={reviewItem.id} 
                  id={`review-${reviewItem.id}`}
                  className="border border-gray-200 rounded-lg p-4 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        {reviewItem.userPhoto ? (
                          <img 
                            src={reviewItem.userPhoto} 
                            alt={reviewItem.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{reviewItem.userName}</h4>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(reviewItem.rating, 14)}
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDate(reviewItem.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {currentUser?.uid === reviewItem.userId && (
                      <button
                        onClick={() => {
                          setActiveTab("write");
                          setRating(reviewItem.rating);
                          setReview(reviewItem.comment);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit your review"
                      >
                        <Edit size={16} />
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed mb-4">{reviewItem.comment}</p>
                  
                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLikeReview(reviewItem.id)}
                        disabled={!currentUser}
                        className={`flex items-center space-x-1 text-sm ${
                          reviewItem.likedBy?.includes(currentUser?.uid) 
                            ? 'text-green-600 font-medium' 
                            : 'text-gray-500 hover:text-green-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <ThumbsUp size={14} />
                        <span>Helpful ({reviewItem.likes || 0})</span>
                      </button>
                      
                      <button
                        onClick={() => handleDislikeReview(reviewItem.id)}
                        disabled={!currentUser}
                        className={`flex items-center space-x-1 text-sm ${
                          reviewItem.dislikedBy?.includes(currentUser?.uid) 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-500 hover:text-red-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <ThumbsDown size={14} />
                        <span>Not Helpful ({reviewItem.dislikes || 0})</span>
                      </button>
                    </div>
                    
                    {currentUser && currentUser.uid !== reviewItem.userId && (
                      <button
                        onClick={() => {
                          const reason = prompt('Please specify the reason for reporting this review:');
                          if (reason && reason.trim()) {
                            // Implement report functionality here
                            alert('Review reported. Our team will review it shortly.');
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors flex items-center text-sm"
                        title="Report this review"
                      >
                        <Flag size={14} className="mr-1" />
                        Report
                      </button>
                    )}
                    
                    {currentUser?.uid === reviewItem.userId && (
                      <div className="text-xs text-green-600 font-medium">
                        Your review
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Show write review prompt for non-reviewers */}
      {activeTab === "reviews" && currentUser && userRole === 'tourist' && !userReview && reviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h4 className="font-medium text-blue-900 mb-2">Share your experience!</h4>
          <p className="text-blue-700 text-sm mb-3">
            Help other travelers by sharing your experience with this driver.
          </p>
          <button
            onClick={() => setActiveTab("write")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Write a Review
          </button>
        </div>
      )}
    </div>
  );
};

// Calendar Component for Date Selection
const DatePickerCalendar = ({ selectedDates, onDateSelect, availableDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
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

  const isDateAvailable = (date) => {
    if (!availableDates || availableDates.length === 0) return true;
    
    const dateString = date.toISOString().split('T')[0];
    return availableDates.some(availableDate => {
      const availableDateString = new Date(availableDate).toISOString().split('T')[0];
      return availableDateString === dateString;
    });
  };

  const isDateSelected = (date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const handleDateClick = (date) => {
    if (!isDateAvailable(date)) return;
    onDateSelect(date);
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigateMonth(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="font-semibold text-gray-900">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button 
          onClick={() => navigateMonth(1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
        {days.map(day => {
          const available = isDateAvailable(day);
          const selected = isDateSelected(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              disabled={!available}
              className={`
                h-8 text-sm rounded-lg transition-all
                ${selected 
                  ? 'bg-green-600 text-white font-medium' 
                  : available
                    ? isToday
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      
      {selectedDates.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-2">Selected Dates:</h4>
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date, index) => (
              <span 
                key={index}
                className="bg-green-600 text-white px-2 py-1 rounded text-xs"
              >
                {date.toLocaleDateString()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Chat Modal Component
const ChatModal = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  otherUser, 
  currentUser 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!conversationId || !isOpen) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      if (currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, isOpen, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending || !currentUser || !otherUser) return;

    try {
      setSending(true);
      
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: otherUser.id,
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);

      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a user'}: "${message.trim()}"`,
        recipientId: otherUser.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        conversationId: conversationId,
        relatedId: conversationId
      });

      setMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{otherUser?.name || 'User'}</h3>
              <p className="text-green-100 text-sm">
                {otherUser?.role === 'tourist' ? 'Tourist' : 'Service Provider'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start a conversation with {otherUser?.name || 'this user'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.senderId === currentUser?.uid
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className={`flex items-center space-x-2 mt-1 text-xs ${
                      msg.senderId === currentUser?.uid ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                      {msg.senderId === currentUser?.uid && (
                        <span className="flex items-center space-x-1">
                          {msg.read ? (
                            <CheckCheck size={12} className="text-blue-300" title="Read" />
                          ) : msg.delivered ? (
                            <CheckCheck size={12} className="text-gray-300" title="Delivered" />
                          ) : (
                            <Check size={12} className="text-gray-300" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const JeepProfile = ({ user, onLogout, onShowAuth, notifications, onNotificationClick, onMarkAsRead }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOtherUser, setChatOtherUser] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const driverId = searchParams.get('driverId');
  const openChat = searchParams.get('openChat');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (openChat === 'true' && driverId && currentUser) {
      setActiveTab('chat');
      initializeConversation();
    }
  }, [openChat, driverId, currentUser]);

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
          if (touristDoc.exists()) {
            setUserRole('tourist');
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
    const fetchDriverData = async () => {
      if (!driverId) {
        setError("No driver ID provided");
        setLoading(false);
        return;
      }

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

    fetchDriverData();
  }, [driverId]);

  const initializeConversation = async () => {
    if (!currentUser || !driverId || !driver) return;

    try {
      const conversationId = await createOrGetConversation(
        currentUser.uid,
        driverId,
        currentUser.displayName || 'User',
        driver.fullName || 'Driver'
      );
      
      setConversationId(conversationId);
      await markMessagesAsRead(conversationId, currentUser.uid);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  useEffect(() => {
    initializeConversation();
  }, [currentUser, driverId, driver]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = getMessages(conversationId, (messagesData) => {
      setMessages(messagesData);
      
      const unreadMessages = messagesData.filter(msg => 
        msg.senderId !== currentUser?.uid && !msg.read
      );
      
      if (unreadMessages.length > 0 && currentUser) {
        markMessagesAsRead(conversationId, currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser]);

  const handleDateSelect = (date) => {
    setSelectedDates(prev => {
      const isSelected = prev.some(selectedDate => 
        selectedDate.toDateString() === date.toDateString()
      );
      
      if (isSelected) {
        return prev.filter(selectedDate => 
          selectedDate.toDateString() !== date.toDateString()
        );
      } else {
        return [...prev, date];
      }
    });
  };

  const handleBooking = () => {
    if (selectedDates.length === 0) {
      alert('Please select at least one date for your booking.');
      return;
    }
    
    const totalPrice = selectedDates.length * (driver.pricePerDay || 0);
    alert(`Booking confirmed for ${selectedDates.length} day(s)! Total: LKR ${totalPrice.toLocaleString()}`);
    
    console.log('Booking details:', {
      driverId: driver.id,
      driverName: driver.fullName,
      selectedDates: selectedDates.map(d => d.toISOString()),
      totalPrice,
      customerId: currentUser?.uid
    });
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.read) {
      await onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'message' && notification.conversationId) {
      const conversation = await getConversationById(notification.conversationId);
      if (conversation && currentUser) {
        const otherUser = getOtherParticipant(conversation, currentUser.uid);
        
        if (otherUser.id === driverId) {
          setChatConversationId(notification.conversationId);
          setChatOtherUser(otherUser);
          setIsChatModalOpen(true);
        }
      }
    }
  };

  const handleOpenChatModal = () => {
    if (driver && currentUser) {
      setChatConversationId(conversationId);
      setChatOtherUser({
        id: driver.id,
        name: driver.fullName || 'Driver',
        role: 'provider'
      });
      setIsChatModalOpen(true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !currentUser || !driverId || !conversationId || sending) return;

    setSending(true);
    
    try {
      const messageData = {
        content: message.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        receiverId: driverId,
        timestamp: new Date()
      };

      await sendMessage(conversationId, messageData);

      await createNotification({
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${currentUser.displayName || 'a tourist'}`,
        recipientId: driverId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        relatedId: conversationId,
        conversationId: conversationId
      });

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < Math.round(rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const handleReviewAdded = async () => {
    // Refresh driver data to update rating
    const fetchDriverData = async () => {
      const driverDoc = await getDoc(doc(db, 'serviceProviders', driverId));
      if (driverDoc.exists()) {
        setDriver({
          id: driverDoc.id,
          ...driverDoc.data()
        });
      }
    };
    fetchDriverData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading driver profile...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Driver Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The driver you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100">
      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        conversationId={chatConversationId}
        otherUser={chatOtherUser}
        currentUser={currentUser}
      />
      
      <GlobalNotificationBell 
        user={currentUser}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />
      
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4 transition-colors"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={driver.profilePicture || "/api/placeholder/120/120"}
                    alt={driver.fullName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-500 mx-auto mb-4 shadow-md"
                  />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{driver.fullName}</h2>
                <p className="text-gray-600">{driver.serviceType}</p>
                
                {/* Rating */}
                <div className="flex items-center justify-center mt-2">
                  <div className="flex items-center">
                    {renderStars(driver.rating || 0)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({driver.rating?.toFixed(1) || '0.0'}/5) • {driver.totalReviews || 0} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4 mb-6">
                {driver.contactPhone && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <Phone size={18} className="mr-3 text-green-600" />
                    <span className="font-medium">{driver.contactPhone}</span>
                  </div>
                )}
                
                {driver.contactEmail && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <Mail size={18} className="mr-3 text-green-600" />
                    <span className="font-medium">{driver.contactEmail}</span>
                  </div>
                )}
                
                {driver.location && (
                  <div className="flex items-center text-gray-600 p-2 rounded-lg bg-gray-50">
                    <MapPin size={18} className="mr-3 text-green-600" />
                    <span className="font-medium">{driver.location}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {currentUser && userRole === 'tourist' && (
                  <>
                    <button
                      onClick={handleOpenChatModal}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium shadow-md"
                    >
                      <MessageCircle size={18} className="mr-2" />
                      Send Message
                    </button>
                    
                    {selectedDates.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-green-800 font-medium">Total:</span>
                          <span className="text-green-800 font-bold text-lg">
                            LKR {(selectedDates.length * (driver.pricePerDay || 0)).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={handleBooking}
                          className="w-full bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-800 transition-colors font-medium"
                        >
                          Book Now ({selectedDates.length} days)
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                {!currentUser && (
                  <button
                    onClick={onShowAuth}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
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
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-6 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'services'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Services & Rates
                  </button>
                  {currentUser && userRole === 'tourist' && (
                    <button
                      onClick={() => setActiveTab('booking')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                        activeTab === 'booking'
                          ? 'border-green-600 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CalendarIcon size={16} className="inline mr-2" />
                      Book Now
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === 'reviews'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Reviews ({driver.totalReviews || 0})
                  </button>
                  {currentUser && (
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors whitespace-nowrap relative ${
                        activeTab === 'chat'
                          ? 'border-green-600 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages
                      {messages.filter(msg => 
                        msg.senderId === driverId && !msg.read
                      ).length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {messages.filter(msg => 
                            msg.senderId === driverId && !msg.read
                          ).length}
                        </span>
                      )}
                    </button>
                  )}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Experience */}
                    <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <Clock className="text-green-600 mt-1 mr-4 flex-shrink-0" size={20} />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Experience</h3>
                        <p className="text-gray-600">
                          {driver.experienceYears || 0} years of experience as a {driver.serviceType}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {driver.description && (
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {driver.description}
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    {driver.languages && driver.languages.length > 0 && (
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Languages className="text-green-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.languages.map((lang, index) => (
                              <span
                                key={index}
                                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
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
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <MapPin className="text-green-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Destinations Covered</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.destinations.map((destination, index) => (
                              <span
                                key={index}
                                className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200 font-medium"
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
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Award className="text-green-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Certifications</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200 font-medium"
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
                      <div className="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <Shield className="text-green-600 mt-1 mr-4 flex-shrink-0" size={20} />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Special Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {driver.specialSkills.map((skill, index) => (
                              <span
                                key={index}
                                className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm border border-purple-200 font-medium"
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
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <Car className="text-green-600 mr-2" size={20} />
                          Vehicle Type
                        </h3>
                        <p className="text-gray-600 text-lg font-medium">{driver.vehicleType}</p>
                      </div>
                    )}

                    {/* Pricing */}
                    {driver.pricePerDay && (
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <DollarSign className="text-green-600 mr-2" size={20} />
                          Rates
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium">Price per day:</span>
                            <span className="text-2xl font-bold text-green-600">
                              LKR {driver.pricePerDay.toLocaleString()}
                            </span>
                          </div>
                          {driver.pricePerHour && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700 font-medium">Price per hour:</span>
                              <span className="text-xl font-bold text-green-600">
                                LKR {driver.pricePerHour.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <CalendarIcon className="text-green-600 mr-2" size={20} />
                        Availability
                      </h3>
                      {driver.availableDates && driver.availableDates.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-600">
                            Available on {driver.availableDates.length} dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {driver.availableDates.slice(0, 6).map((date, index) => (
                              <span
                                key={index}
                                className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm border border-green-200 font-medium"
                              >
                                {new Date(date).toLocaleDateString()}
                              </span>
                            ))}
                            {driver.availableDates.length > 6 && (
                              <span className="text-gray-500 text-sm font-medium">
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
                      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
                        <p className="text-gray-600 leading-relaxed">{driver.description}</p>
                      </div>
                    )}
                  </div>
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
                          availableDates={driver.availableDates}
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
                                <span className="font-medium text-green-700">{selectedDates.length} days</span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600">Price per day:</span>
                                <span className="font-medium">LKR {driver.pricePerDay?.toLocaleString() || '0'}</span>
                              </div>
                              
                              <div className="border-t border-gray-200 pt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                                  <span className="text-2xl font-bold text-green-600">
                                    LKR {(selectedDates.length * (driver.pricePerDay || 0)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                onClick={handleBooking}
                                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium mt-4 shadow-md"
                              >
                                Confirm Booking
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

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <RatingReview 
                    driverId={driverId}
                    currentUser={currentUser}
                    userRole={userRole}
                    onReviewAdded={handleReviewAdded}
                  />
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="h-96 flex flex-col">
                    {currentUser ? (
                      <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2">
                          {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                              <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                              <p>No messages yet. Start a conversation!</p>
                            </div>
                          ) : (
                            messages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    msg.senderId === currentUser.uid
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    msg.senderId === currentUser.uid 
                                      ? 'text-green-100' 
                                      : 'text-gray-500'
                                  }`}>
                                    {formatTime(msg.timestamp)}
                                    {msg.senderId === currentUser.uid && (
                                      <span className="ml-1">
                                        {msg.read ? <CheckCheck size={12} /> : <Check size={12} />}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form onSubmit={handleSendMessage} className="flex space-x-2">
                          <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {sending ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        </form>
                      </>
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
                          onClick={onShowAuth}
                          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
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