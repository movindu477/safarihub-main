// reviewService.js
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore();

// Enhanced Firebase review functions with better error handling
export const addReview = async (reviewData) => {
  try {
    // Support both driverId and guideId
    const providerId = reviewData.driverId || reviewData.guideId;
    const providerType = reviewData.providerType || (reviewData.driverId ? 'driver' : 'guide');
    
    console.log('🚀 Starting review submission with data:', {
      providerId,
      providerType,
      userId: reviewData.userId,
      rating: reviewData.rating,
      commentLength: reviewData.comment?.length
    });

    // Validate review data before submission
    if (!providerId) {
      throw new Error('Missing provider ID (driverId or guideId)');
    }
    
    if (!reviewData.userId) {
      throw new Error('Missing user ID');
    }
    
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    if (!reviewData.comment || reviewData.comment.trim().length < 10) {
      throw new Error('Review comment must be at least 10 characters long');
    }

    console.log('✅ Data validation passed');

    // Check for existing reviews to prevent duplicates
    console.log('🔍 Checking for existing reviews...');
    const existingReviewQuery = query(
      collection(db, 'reviews'),
      where(providerType === 'driver' ? 'driverId' : 'guideId', '==', providerId),
      where('userId', '==', reviewData.userId)
    );
    
    const existingSnapshot = await getDocs(existingReviewQuery);
    console.log('📊 Existing reviews found:', existingSnapshot.size);
    
    if (!existingSnapshot.empty) {
      // Update existing review instead of creating new one
      const existingDoc = existingSnapshot.docs[0];
      console.log('🔄 Updating existing review:', existingDoc.id);
      
      await updateDoc(doc(db, 'reviews', existingDoc.id), {
        ...reviewData,
        [providerType === 'driver' ? 'driverId' : 'guideId']: providerId,
        providerType,
        lastUpdated: serverTimestamp()
      });
      console.log('✅ Successfully updated existing review');
      return existingDoc.id;
    }

    // Create new review with validated data
    console.log('➕ Creating new review...');
    const reviewDataWithTimestamp = {
      [providerType === 'driver' ? 'driverId' : 'guideId']: providerId,
      providerType,
      userId: reviewData.userId,
      userName: reviewData.userName || 'Anonymous User',
      userPhoto: reviewData.userPhoto || '',
      rating: Number(reviewData.rating),
      comment: reviewData.comment.trim(),
      userEmail: reviewData.userEmail || '',
      timestamp: serverTimestamp(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      lastUpdated: serverTimestamp()
    };
    
    console.log('📤 Final review data to submit:', reviewDataWithTimestamp);
    
    const docRef = await addDoc(collection(db, 'reviews'), reviewDataWithTimestamp);
    console.log('✅ Successfully created new review with unique ID:', docRef.id);
    console.log('📋 Review data saved:', {
      id: docRef.id,
      providerId,
      providerType,
      userId: reviewDataWithTimestamp.userId,
      rating: reviewDataWithTimestamp.rating,
      commentLength: reviewDataWithTimestamp.comment.length
    });
    return docRef.id;

  } catch (error) {
    console.error('❌ Error in addReview function:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const updateDriverRating = async (driverId) => {
  return updateProviderRating(driverId, 'driver');
};

export const updateProviderRating = async (providerId, providerType = 'driver') => {
  try {
    if (!providerId) {
      console.error('❌ No provider ID provided for rating update');
      return;
    }

    console.log(`⭐ Updating ${providerType} rating for:`, providerId);
    
    const fieldName = providerType === 'driver' ? 'driverId' : 'guideId';
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where(fieldName, '==', providerId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    const allReviews = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      rating: Number(doc.data().rating) || 0
    }));
    
    console.log(`📊 Found ${allReviews.length} reviews for rating calculation`);
    
    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / allReviews.length;
      const roundedRating = Math.round(averageRating * 10) / 10;
      
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        rating: roundedRating,
        totalReviews: allReviews.length,
        lastRatingUpdate: serverTimestamp()
      });
      
      console.log(`✅ Updated ${providerType} rating:`, roundedRating);
    } else {
      // Reset rating if no reviews
      await updateDoc(doc(db, 'serviceProviders', providerId), {
        rating: 0,
        totalReviews: 0,
        lastRatingUpdate: serverTimestamp()
      });
      console.log(`✅ Reset ${providerType} rating to 0 (no reviews)`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${providerType} rating:`, error);
  }
};

export const updateReview = async (reviewId, reviewData) => {
  try {
    console.log('🔄 Updating review:', reviewId);
    
    // Validate data before update
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    if (!reviewData.comment || reviewData.comment.trim().length < 10) {
      throw new Error('Review comment must be at least 10 characters long');
    }

    await updateDoc(doc(db, 'reviews', reviewId), {
      ...reviewData,
      lastUpdated: serverTimestamp()
    });
    console.log('✅ Successfully updated review:', reviewId);
  } catch (error) {
    console.error('❌ Error in updateReview function:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId, providerId, providerType = 'driver') => {
  try {
    console.log('🗑️ Deleting review:', reviewId);
    await deleteDoc(doc(db, 'reviews', reviewId));
    console.log('✅ Successfully deleted review:', reviewId);
    
    // Update provider rating after deletion
    if (providerId) {
      await updateProviderRating(providerId, providerType);
    }
  } catch (error) {
    console.error('❌ Error in deleteReview function:', error);
    throw error;
  }
};

export const getDriverReviews = (driverId, callback) => {
  return getProviderReviews(driverId, callback, 'driver');
};

export const getProviderReviews = (providerId, callback, providerType = 'driver') => {
  if (!providerId) {
    console.error('❌ No provider ID provided for reviews query');
    callback([]);
    return () => {};
  }

  console.log(`🔍 Setting up reviews listener for ${providerType}:`, providerId);

  const fieldName = providerType === 'driver' ? 'driverId' : 'guideId';
  // Keep Firestore query simple (no composite index needed) and sort on the client
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where(fieldName, '==', providerId)
  );

  const unsubscribe = onSnapshot(reviewsQuery, 
    (snapshot) => {
      console.log('🔄 Firestore snapshot received:', snapshot.docs.length, 'reviews');
      
      const reviews = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert Firestore timestamp to JavaScript Date if needed
        let timestamp = data.timestamp;
        if (timestamp && typeof timestamp.toDate === 'function') {
          timestamp = timestamp.toDate();
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp: timestamp,
          // Ensure all required fields exist with proper defaults
          userName: data.userName || 'Anonymous User',
          rating: Number(data.rating) || 0,
          comment: data.comment || '',
          likes: data.likes || 0,
          dislikes: data.dislikes || 0,
          likedBy: data.likedBy || [],
          dislikedBy: data.dislikedBy || [],
          userPhoto: data.userPhoto || '',
          userEmail: data.userEmail || ''
        };
      });

      // Sort newest first by timestamp (client-side)
      reviews.sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });
      console.log(`📊 Processed ${reviews.length} reviews for ${providerType} ${providerId}`);
      callback(reviews);
    }, 
    (error) => {
      console.error('❌ Error in reviews listener:', error);
      console.error('Error details:', error.message);
      callback([]);
    }
  );

  return unsubscribe;
};

export const getUserReviewForDriver = async (driverId, userId) => {
  return getUserReviewForProvider(driverId, userId, 'driver');
};

export const getUserReviewForProvider = async (providerId, userId, providerType = 'driver') => {
  try {
    if (!providerId || !userId) {
      console.error('❌ Missing provider ID or userId for review query');
      return null;
    }

    console.log(`🔍 Checking user review for ${providerType}:`, providerId, 'user:', userId);
    
    const fieldName = providerType === 'driver' ? 'driverId' : 'guideId';
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where(fieldName, '==', providerId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    console.log('📊 User review query result:', querySnapshot.size, 'reviews found');
    
    if (!querySnapshot.empty) {
      const reviewDoc = querySnapshot.docs[0];
      const reviewData = reviewDoc.data();
      console.log('✅ Found existing user review');
      return {
        id: reviewDoc.id,
        ...reviewData,
        rating: Number(reviewData.rating) || 0
      };
    }
    console.log('❌ No user review found');
    return null;
  } catch (error) {
    console.error('❌ Error getting user review:', error);
    return null;
  }
};

export const likeReview = async (reviewId, userId) => {
  try {
    if (!reviewId || !userId) {
      throw new Error('Missing reviewId or userId');
    }

    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);
    
    if (!reviewDoc.exists()) {
      throw new Error('Review not found');
    }
    
    const reviewData = reviewDoc.data();
    
    if (reviewData.likedBy?.includes(userId)) {
      // Unlike
      await updateDoc(reviewRef, {
        likes: Math.max(0, (reviewData.likes || 0) - 1),
        likedBy: arrayRemove(userId)
      });
      console.log('✅ Review unliked');
    } else {
      // Like
      const updates = {
        likes: (reviewData.likes || 0) + 1,
        likedBy: arrayUnion(userId)
      };
      
      // Remove from dislikes if user previously disliked
      if (reviewData.dislikedBy?.includes(userId)) {
        updates.dislikes = Math.max(0, (reviewData.dislikes || 0) - 1);
        updates.dislikedBy = arrayRemove(userId);
      }
      
      await updateDoc(reviewRef, updates);
      console.log('✅ Review liked');
    }
  } catch (error) {
    console.error('❌ Error liking review:', error);
    throw error;
  }
};

export const dislikeReview = async (reviewId, userId) => {
  try {
    if (!reviewId || !userId) {
      throw new Error('Missing reviewId or userId');
    }

    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);
    
    if (!reviewDoc.exists()) {
      throw new Error('Review not found');
    }
    
    const reviewData = reviewDoc.data();
    
    if (reviewData.dislikedBy?.includes(userId)) {
      // Remove dislike
      await updateDoc(reviewRef, {
        dislikes: Math.max(0, (reviewData.dislikes || 0) - 1),
        dislikedBy: arrayRemove(userId)
      });
      console.log('✅ Review undisliked');
    } else {
      // Dislike
      const updates = {
        dislikes: (reviewData.dislikes || 0) + 1,
        dislikedBy: arrayUnion(userId)
      };
      
      // Remove from likes if user previously liked
      if (reviewData.likedBy?.includes(userId)) {
        updates.likes = Math.max(0, (reviewData.likes || 0) - 1);
        updates.likedBy = arrayRemove(userId);
      }
      
      await updateDoc(reviewRef, updates);
      console.log('✅ Review disliked');
    }
  } catch (error) {
    console.error('❌ Error disliking review:', error);
    throw error;
  }
};

export const reportReview = async (reviewId, reporterId, reason) => {
  try {
    if (!reviewId || !reporterId || !reason || reason.trim().length < 5) {
      throw new Error('Invalid report data');
    }

    await addDoc(collection(db, 'reportedReviews'), {
      reviewId,
      reporterId,
      reason: reason.trim(),
      reportedAt: serverTimestamp(),
      status: 'pending'
    });
    console.log('✅ Review reported successfully');
  } catch (error) {
    console.error('❌ Error reporting review:', error);
    throw error;
  }
};

export const getDriverReviewStats = async (driverId) => {
  return getProviderReviewStats(driverId, 'driver');
};

export const getProviderReviewStats = async (providerId, providerType = 'driver') => {
  try {
    if (!providerId) {
      console.error('❌ No provider ID provided for stats');
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const fieldName = providerType === 'driver' ? 'driverId' : 'guideId';
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where(fieldName, '==', providerId)
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    const reviews = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      rating: Number(doc.data().rating) || 0
    }));
    
    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    console.log(`📈 Review stats for ${providerType}: ${reviews.length} reviews, avg ${averageRating.toFixed(1)}`);
    
    return {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    };
  } catch (error) {
    console.error('❌ Error getting review stats:', error);
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
};