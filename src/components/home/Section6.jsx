import React, { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { getFirestore, collection, query, getDocs, getDoc, doc, orderBy, limit } from "firebase/firestore";

export default function Section6() {
  const [itemsPerView, setItemsPerView] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);
  const animationRef = useRef(null);
  const positionRef = useRef(0);

  const db = getFirestore();

  // Fetch reviews from Firestore
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Get all reviews from Firestore
        const reviewsQuery = query(
          collection(db, 'reviews'),
          orderBy('rating', 'desc'),
          limit(50) // Get top 50 highest rated reviews
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = [];

        for (const reviewDoc of reviewsSnapshot.docs) {
          const reviewData = reviewDoc.data();

          // Get user information from tourists collection
          let userName = reviewData.userName || 'Anonymous User';
          let userCountry = 'Unknown';

          if (reviewData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'tourists', reviewData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.fullName || userData.name || userName;
                userCountry = userData.country || userData.location || userCountry;
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }

          // Only include reviews with rating 4 or 5 (highest ratings)
          if (reviewData.rating >= 4) {
            reviewsData.push({
              id: reviewDoc.id,
              name: userName,
              country: userCountry,
              review: reviewData.comment || '',
              rating: Number(reviewData.rating) || 5
            });
          }
        }

        // Sort by rating (highest first) and limit to top 12
        const sortedReviews = reviewsData
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 12);

        setReviews(sortedReviews.length > 0 ? sortedReviews : []);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [db]);

  // Duplicate reviews multiple times for seamless infinite loop
  const duplicatedReviews = [...reviews, ...reviews, ...reviews, ...reviews];

  // Update items per view based on screen size
  useEffect(() => {
    const updateItemsPerView = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerView(3);
      } else if (window.innerWidth >= 768) {
        setItemsPerView(2);
      } else {
        setItemsPerView(1);
      }
    };

    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  // Continuous infinite scroll animation - Very slow movement
  useEffect(() => {
    if (!carouselRef.current) return;

    const speed = 0.060; // Extremely slow speed (percentage per frame - lower = slower)
    const itemWidth = 100 / itemsPerView; // percentage width per item
    const resetPoint = itemWidth * reviews.length; // Reset after one full set

    const animate = () => {
      // Only update position if not paused
      if (!isPaused) {
        positionRef.current += speed;

        // Reset position seamlessly when we've scrolled through one set of reviews
        if (positionRef.current >= resetPoint) {
          positionRef.current = 0;
        }

        if (carouselRef.current) {
          carouselRef.current.style.transform = `translateX(-${positionRef.current}%)`;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [itemsPerView, reviews.length, isPaused]);

  return (
    <section className="w-full bg-gradient-to-b from-gray-50 to-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Title and Description - Centered */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Customer Reviews
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Discover what our satisfied customers have to say about their unforgettable safari experiences with SafariHub.
            Join thousands of happy travelers who have explored the wild beauty of Sri Lanka with us.
          </p>
        </div>

        {/* Reviews Carousel Container */}
        <div className="relative overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-4 text-gray-600">Loading reviews...</p>
            </div>
          ) : duplicatedReviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No reviews available yet.</p>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex"
              style={{
                willChange: 'transform'
              }}
            >
              {duplicatedReviews.map((review, index) => (
                <div
                  key={`${review.id}-${index}`}
                  className="flex-shrink-0 px-3 sm:px-4"
                  style={{
                    width: `${100 / itemsPerView}%`
                  }}
                >
                  <div
                    className="bg-white rounded-[10px] p-6 sm:p-8 shadow-lg border border-gray-200 h-full flex flex-col"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                  >
                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6 flex-grow">
                      "{review.review}"
                    </p>

                    {/* Customer Info */}
                    <div className="border-t border-gray-200 pt-4">
                      <p className="font-semibold text-base sm:text-lg text-gray-900 mb-1">
                        {review.name}
                      </p>
                      <p className="text-sm sm:text-base text-gray-500">
                        {review.country}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
