import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Flag, Edit, Trash2, User, AlertCircle, CheckCircle } from 'lucide-react';

// Import all Firebase functions from the service file
import {
  addReview,
  updateDriverRating,
  updateReview,
  deleteReview,
  getDriverReviews,
  getUserReviewForDriver,
  likeReview,
  dislikeReview,
  reportReview,
  getDriverReviewStats
} from '../reviewservice';

const ReviewSection = ({ driverId, currentUser, userRole, onReviewAdded }) => {
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviewStats, setReviewStats] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Load reviews and user's existing review
  useEffect(() => {
    if (!driverId) {
      console.error('❌ No driverId provided to ReviewSection');
      setError('No driver ID provided');
      setLoading(false);
      return;
    }

    console.log('📝 Setting up review section for driver:', driverId);
    console.log('👤 Current user:', currentUser?.uid);
    setError('');
    setSuccess('');

    // Load user's specific review
    const loadUserReview = async () => {
      if (currentUser) {
        try {
          console.log('🔍 Loading user review for:', currentUser.uid);
          const userRev = await getUserReviewForDriver(driverId, currentUser.uid);
          console.log('📋 User review found:', userRev ? 'Yes' : 'No');
          setUserReview(userRev);
          
          if (userRev) {
            setRating(userRev.rating);
            setReviewText(userRev.comment);
          }
        } catch (err) {
          console.error('Error loading user review:', err);
        }
      }
    };

    // Load review statistics
    const loadReviewStats = async () => {
      try {
        console.log('📈 Loading review stats for driver:', driverId);
        const stats = await getDriverReviewStats(driverId);
        setReviewStats(stats);
        console.log('✅ Review stats loaded:', stats);
      } catch (err) {
        console.error('Error loading review stats:', err);
      }
    };

    loadUserReview();
    loadReviewStats();

    // Real-time reviews listener
    console.log('🎯 Setting up real-time reviews listener');
    const unsubscribe = getDriverReviews(driverId, (reviewsData) => {
      console.log(`🔄 Received ${reviewsData.length} reviews from server`);
      
      setReviews(reviewsData);
      setLoading(false);
      
      // Update user review from server data
      if (currentUser) {
        const userRev = reviewsData.find(review => review.userId === currentUser.uid);
        console.log('🔍 User review found in server data:', userRev ? 'Yes' : 'No');
        if (userRev && (!userReview || userReview.id !== userRev.id)) {
          setUserReview(userRev);
          setRating(userRev.rating);
          setReviewText(userRev.comment);
        } else if (!userRev) {
          setUserReview(null);
        }
      }

      // Update review stats based on actual server data
      calculateReviewStats(reviewsData);
    });

    return () => {
      console.log('🔕 Cleaning up review section');
      unsubscribe();
    };
  }, [driverId, currentUser]);

  // Calculate review statistics from current reviews
  const calculateReviewStats = (reviewsData) => {
    if (!reviewsData || reviewsData.length === 0) {
      setReviewStats({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
      return;
    }

    const totalRating = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / reviewsData.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach(review => {
      const rating = Math.floor(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    setReviewStats({
      totalReviews: reviewsData.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    console.log('🎯 Submit review button clicked');
    console.log('📊 Form data:', { 
      rating, 
      reviewTextLength: reviewText.length,
      currentUser: !!currentUser,
      currentUserId: currentUser?.uid,
      driverId 
    });

    // Validation
    if (!rating) {
      const errorMsg = 'Please select a rating';
      console.error('❌ Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      const errorMsg = 'Review must be at least 10 characters long';
      console.error('❌ Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }
    
    if (!currentUser) {
      const errorMsg = 'Please login to submit a review';
      console.error('❌ Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    if (!driverId) {
      const errorMsg = 'No driver selected';
      console.error('❌ Validation failed:', errorMsg);
      setError(errorMsg);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const reviewData = {
        driverId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        userPhoto: currentUser.photoURL || '',
        rating: Number(rating),
        comment: reviewText.trim(),
        userEmail: currentUser.email || ''
      };

      console.log('📤 Submitting review data:', reviewData);

      if (userReview) {
        // Update existing review
        console.log('🔄 Updating existing review:', userReview.id);
        await updateReview(userReview.id, reviewData);
        setSuccess('Review updated successfully!');
      } else {
        // Add new review
        console.log('➕ Adding new review for user:', currentUser.uid);
        await addReview(reviewData);
        setSuccess('Review submitted successfully!');
      }

      // Update driver rating
      await updateDriverRating(driverId);
      
      // Reset form only for new reviews
      if (!userReview) {
        setReviewText('');
        setRating(0);
      }
      
      // Switch to reviews tab and show success
      setActiveTab('reviews');
      
      // Call parent callback if provided
      if (onReviewAdded) {
        onReviewAdded();
      }
      
      console.log('✅ Review submitted successfully!');

    } catch (error) {
      console.error('❌ Error submitting review:', error);
      console.error('Full error object:', error);
      
      let errorMessage = 'Failed to submit review. Please try again.';
      
      // Provide more specific error messages based on Firebase error codes
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check if you are logged in and have the right permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        console.log('🗑️ Deleting review:', userReview.id);
        await deleteReview(userReview.id, driverId);
        setUserReview(null);
        setRating(0);
        setReviewText('');
        setError('');
        setSuccess('Review deleted successfully!');
        
        // Call parent callback if provided
        if (onReviewAdded) {
          onReviewAdded();
        }
      } catch (error) {
        console.error('Error deleting review:', error);
        setError('Failed to delete review. Please try again.');
      }
    }
  };

  const handleLikeReview = async (reviewId) => {
    if (!currentUser) {
      setError('Please login to like reviews');
      return;
    }
    
    try {
      await likeReview(reviewId, currentUser.uid);
      setError('');
    } catch (error) {
      console.error('Error liking review:', error);
      setError('Failed to like review. Please try again.');
    }
  };

  const handleDislikeReview = async (reviewId) => {
    if (!currentUser) {
      setError('Please login to dislike reviews');
      return;
    }
    
    try {
      await dislikeReview(reviewId, currentUser.uid);
      setError('');
    } catch (error) {
      console.error('Error disliking review:', error);
      setError('Failed to dislike review. Please try again.');
    }
  };

  const handleReportReview = async (reviewId, userName) => {
    if (!currentUser) {
      setError('Please login to report reviews');
      return;
    }

    const reason = prompt(`Please specify the reason for reporting ${userName}'s review (minimum 5 characters):`);
    if (reason && reason.trim()) {
      if (reason.trim().length < 5) {
        setError('Report reason must be at least 5 characters long');
        return;
      }
      
      try {
        await reportReview(reviewId, currentUser.uid, reason.trim());
        alert('Review reported successfully. Our team will review it shortly.');
        setError('');
      } catch (error) {
        console.error('Error reporting review:', error);
        setError('Failed to report review. Please try again.');
      }
    }
  };

  const renderStars = (rating, size = 16) => {
    const numericRating = Number(rating) || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={i < Math.floor(numericRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
      />
    ));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Recently';
    }
  };

  // Check if user can write a review
  const canWriteReview = currentUser && (userRole === 'tourist' || !userRole);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <p className="text-red-700 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Review Header with Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <p className="text-gray-600 mt-1">
              Read what other travelers say about this driver
            </p>
          </div>
          
          {reviewStats && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{reviewStats.averageRating.toFixed(1)}</div>
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
          )}
        </div>
      </div>

      {/* Review Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reviews'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
          
          {canWriteReview && (
            <button
              onClick={() => setActiveTab('write')}
              className={`py-3 px-4 text-center border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'write'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {userReview ? 'Edit Your Review' : 'Write a Review'}
            </button>
          )}
        </nav>
      </div>

      {/* Write Review Form */}
      {activeTab === 'write' && canWriteReview && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {userReview ? 'Edit Your Review' : 'Share Your Experience'}
          </h3>
          
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating *
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
                {rating === 1 && "Poor - Very disappointed"}
                {rating === 2 && "Fair - Some issues"}
                {rating === 3 && "Good - Met expectations"}
                {rating === 4 && "Very Good - Exceeded expectations"}
                {rating === 5 && "Excellent - Above and beyond"}
              </p>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Review *
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this driver... What did you like? What could be improved? Be specific about the service, vehicle condition, knowledge, and overall experience."
                rows="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                required
                minLength="10"
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 10 characters. Your review will be visible to all users.
                {reviewText.length > 0 && ` (${reviewText.length}/10)`}
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!rating || !reviewText.trim() || reviewText.trim().length < 10 || submitting}
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
              
              <button
                type="button"
                onClick={() => {
                  setActiveTab('reviews');
                  setError('');
                  setSuccess('');
                }}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-500 mb-4">
                Be the first to share your experience with this driver!
              </p>
              {canWriteReview && (
                <button
                  onClick={() => setActiveTab('write')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Write First Review
                </button>
              )}
              {!currentUser && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 text-sm">
                    Please login to write a review and share your experience.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div 
                  key={review.id}
                  id={`review-${review.id}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        {review.userPhoto ? (
                          <img 
                            src={review.userPhoto} 
                            alt={review.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{review.userName}</h4>
                        <div className="flex items-center space-x-1 mt-1">
                          {renderStars(review.rating, 14)}
                          <span className="text-xs text-gray-500 ml-2">
                            {formatDate(review.timestamp)}
                            {review.lastUpdated && review.timestamp?.toDate?.()?.getTime() !== review.lastUpdated?.toDate?.()?.getTime() && (
                              <span className="text-gray-400"> • Edited</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {currentUser?.uid === review.userId && (
                      <button
                        onClick={() => {
                          setActiveTab('write');
                          setRating(review.rating);
                          setReviewText(review.comment);
                          setError('');
                          setSuccess('');
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                        title="Edit your review"
                      >
                        <Edit size={16} className="mr-1" />
                        <span className="text-sm">Edit</span>
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed mb-4">{review.comment}</p>
                  
                  {/* Review Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLikeReview(review.id)}
                        disabled={!currentUser}
                        className={`flex items-center space-x-1 text-sm ${
                          review.likedBy?.includes(currentUser?.uid) 
                            ? 'text-green-600 font-medium' 
                            : 'text-gray-500 hover:text-green-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <ThumbsUp size={14} />
                        <span>Helpful ({review.likes || 0})</span>
                      </button>
                      
                      <button
                        onClick={() => handleDislikeReview(review.id)}
                        disabled={!currentUser}
                        className={`flex items-center space-x-1 text-sm ${
                          review.dislikedBy?.includes(currentUser?.uid) 
                            ? 'text-red-600 font-medium' 
                            : 'text-gray-500 hover:text-red-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                      >
                        <ThumbsDown size={14} />
                        <span>Not Helpful ({review.dislikes || 0})</span>
                      </button>
                    </div>
                    
                    {currentUser && currentUser.uid !== review.userId && (
                      <button
                        onClick={() => handleReportReview(review.id, review.userName)}
                        className="text-gray-400 hover:text-red-600 transition-colors flex items-center text-sm"
                        title="Report this review"
                      >
                        <Flag size={14} className="mr-1" />
                        Report
                      </button>
                    )}
                    
                    {currentUser?.uid === review.userId && (
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

      {/* Login Prompt for Non-Users */}
      {!currentUser && activeTab === 'reviews' && reviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <h4 className="font-medium text-blue-900 mb-2">Share your experience!</h4>
          <p className="text-blue-700 text-sm">
            Login to write a review and help other travelers make better decisions.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;