import React, { useState, useEffect } from 'react';
import { 
  addReview, 
  updateReview, 
  deleteReview, 
  getDriverReviews, 
  getUserReviewForDriver,
  likeReview,
  dislikeReview,
  reportReview,
  getDriverReviewStats
} from '../firebase';
import { Star, ThumbsUp, ThumbsDown, Flag, Edit, Trash2, User } from 'lucide-react';

const ReviewSection = ({ driverId, currentUser, userRole }) => {
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [reviewStats, setReviewStats] = useState(null);

  // Load reviews and user's existing review
  useEffect(() => {
    if (!driverId) return;

    // Load review statistics
    const loadReviewStats = async () => {
      const stats = await getDriverReviewStats(driverId);
      setReviewStats(stats);
    };

    loadReviewStats();

    // Real-time reviews listener
    const unsubscribe = getDriverReviews(driverId, (reviewsData) => {
      setReviews(reviewsData);
      
      // Find current user's review
      if (currentUser) {
        const userRev = reviewsData.find(review => review.userId === currentUser.uid);
        setUserReview(userRev || null);
        
        if (userRev) {
          setRating(userRev.rating);
          setReviewText(userRev.comment);
        }
      }
    });

    return unsubscribe;
  }, [driverId, currentUser]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!rating || !reviewText.trim() || !currentUser || !driverId || submitting) return;

    setSubmitting(true);
    
    try {
      const reviewData = {
        driverId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        userPhoto: currentUser.photoURL || '',
        rating,
        comment: reviewText.trim(),
        userEmail: currentUser.email || ''
      };

      if (userReview) {
        // Update existing review
        await updateReview(userReview.id, reviewData);
      } else {
        // Add new review
        await addReview(reviewData);
      }

      // Reset form
      setReviewText('');
      setRating(0);
      
      // Switch to reviews tab and show success
      setActiveTab('reviews');
      
      // Show success message
      setTimeout(() => {
        const newReviewElement = document.getElementById(`review-${userReview?.id || 'new'}`);
        if (newReviewElement) {
          newReviewElement.scrollIntoView({ behavior: 'smooth' });
          newReviewElement.classList.add('bg-yellow-50', 'border-yellow-200');
          setTimeout(() => {
            newReviewElement.classList.remove('bg-yellow-50', 'border-yellow-200');
          }, 3000);
        }
      }, 500);

    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        await deleteReview(userReview.id);
        setUserReview(null);
        setRating(0);
        setReviewText('');
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
      await likeReview(reviewId, currentUser.uid);
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
      await dislikeReview(reviewId, currentUser.uid);
    } catch (error) {
      console.error('Error disliking review:', error);
    }
  };

  const handleReportReview = async (reviewId) => {
    if (!currentUser) {
      alert('Please login to report reviews');
      return;
    }

    const reason = prompt('Please specify the reason for reporting this review:');
    if (reason && reason.trim()) {
      try {
        await reportReview(reviewId, currentUser.uid, reason.trim());
        alert('Review reported successfully. Our team will review it shortly.');
      } catch (error) {
        console.error('Error reporting review:', error);
        alert('Failed to report review. Please try again.');
      }
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

  return (
    <div className="space-y-6">
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
          
          {currentUser && userRole === 'tourist' && (
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

      {/* Write Review Tab */}
      {activeTab === 'write' && currentUser && userRole === 'tourist' && (
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
              />
              <p className="text-sm text-gray-500 mt-1">
                Minimum 10 characters. Your review will be visible to all users.
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
                onClick={() => setActiveTab('reviews')}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
              <p className="text-gray-500 mb-4">
                Be the first to share your experience with this driver!
              </p>
              {currentUser && userRole === 'tourist' && (
                <button
                  onClick={() => setActiveTab('write')}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Write First Review
                </button>
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
                        onClick={() => handleReportReview(review.id)}
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