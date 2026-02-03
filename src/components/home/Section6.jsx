import React, { useState, useEffect, useRef } from "react";
import { Star, Quote } from "lucide-react";
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
        const reviewsQuery = query(
          collection(db, 'reviews'),
          orderBy('rating', 'desc'),
          limit(50)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = [];

        for (const reviewDoc of reviewsSnapshot.docs) {
          const reviewData = reviewDoc.data();

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

  const duplicatedReviews = [...reviews, ...reviews, ...reviews, ...reviews];

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

  useEffect(() => {
    if (!carouselRef.current) return;

    const speed = 0.060;
    const itemWidth = 100 / itemsPerView;
    const resetPoint = itemWidth * reviews.length;

    const animate = () => {
      if (!isPaused) {
        positionRef.current += speed;

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
    <section className="relative w-full bg-gradient-to-b from-white via-gray-50 to-white py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-green-200/20 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            What Our Customers Say
          </h2>

          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Discover what our satisfied customers have to say about their unforgettable safari experiences with SafariHub.
          </p>
        </div>

        {/* Reviews Carousel */}
        <div className="relative overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading reviews...</p>
            </div>
          ) : duplicatedReviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Quote className="w-8 h-8 text-gray-400" />
              </div>
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
                    className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl border border-gray-100 h-full flex flex-col transition-all duration-300 hover:-translate-y-1"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                  >
                    {/* Quote Icon */}
                    <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Quote className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
                    </div>

                    {/* Rating Stars */}
                    <div className="flex items-center gap-1 mb-4 relative z-10">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-6 flex-grow relative z-10 italic">
                      "{review.review}"
                    </p>

                    {/* Customer Info */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200 relative z-10">
                      {/* Avatar */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                        {review.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name and Country */}
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-base sm:text-lg text-gray-900 truncate">
                          {review.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {review.country}
                        </p>
                      </div>
                    </div>

                    {/* Decorative Corner */}
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-green-500/10 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Showing top-rated reviews from our satisfied customers
          </p>
        </div>
      </div>
    </section>
  );
}
