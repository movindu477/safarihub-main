import React, { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";

export default function Section6() {
  const [itemsPerView, setItemsPerView] = useState(3);
  const carouselRef = useRef(null);
  const animationRef = useRef(null);

  // Dummy customer reviews data
  const reviews = [
    {
      id: 1,
      name: "Sarah Johnson",
      country: "United States",
      review: "Amazing safari experience! The guides were knowledgeable and the wildlife sightings were incredible. Highly recommend SafariHub for anyone visiting Sri Lanka.",
      rating: 5
    },
    {
      id: 2,
      name: "Michael Chen",
      country: "Australia",
      review: "Best wildlife tour I've ever been on. The jeep driver was professional and we saw elephants, leopards, and so much more. Worth every penny!",
      rating: 5
    },
    {
      id: 3,
      name: "Emma Williams",
      country: "United Kingdom",
      review: "Outstanding service from start to finish. The booking process was smooth and the safari exceeded all expectations. Will definitely book again!",
      rating: 5
    },
    {
      id: 4,
      name: "David Martinez",
      country: "Spain",
      review: "Incredible experience with SafariHub! The tour guide was excellent and we learned so much about Sri Lankan wildlife. A must-do experience!",
      rating: 5
    },
    {
      id: 5,
      name: "Sophie Anderson",
      country: "Canada",
      review: "Perfect safari adventure! The team was professional, friendly, and made our trip unforgettable. We saw amazing wildlife and had the best time!",
      rating: 5
    },
    {
      id: 6,
      name: "James Taylor",
      country: "New Zealand",
      review: "Fantastic service and incredible wildlife sightings. The guides knew exactly where to find the animals. Highly recommend SafariHub to everyone!",
      rating: 5
    }
  ];

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

    let position = 0;
    const speed = 0.060; // Extremely slow speed (percentage per frame - lower = slower)
    const itemWidth = 100 / itemsPerView; // percentage width per item
    const resetPoint = itemWidth * reviews.length; // Reset after one full set

    const animate = () => {
      position += speed;

      // Reset position seamlessly when we've scrolled through one set of reviews
      if (position >= resetPoint) {
        position = 0;
      }

      if (carouselRef.current) {
        carouselRef.current.style.transform = `translateX(-${position}%)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [itemsPerView, reviews.length]);

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
                <div className="bg-white rounded-[10px] p-6 sm:p-8 shadow-lg border border-gray-200 h-full flex flex-col">
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
        </div>
      </div>
    </section>
  );
}
