import React, { useState, useEffect } from "react";

// Import images from src/assets
import back1 from "../../assets/back1.jpg";
import back2ori from "../../assets/back2ori.jpg";
import back3ori from "../../assets/back3ori.jpg";
import back4ori from "../../assets/back4ori2.avif";

export default function Section1() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const slides = [
    {
      image: back1,
      title: "Welcome to SafariHub",
      subtitle: "Your Gateway to Wild Adventures"
    },
    {
      image: back2ori,
      title: "Discover Amazing Wildlife",
      subtitle: "Experience Nature's Most Spectacular Moments"
    },
    {
      image: back3ori,
      title: "Explore Breathtaking Landscapes",
      subtitle: "Journey Through Untamed Wilderness"
    },
    {
      image: back4ori,
      title: "Unforgettable Safari Experiences",
      subtitle: "Create Memories That Last a Lifetime"
    }
  ];

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === slides.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  const goToSlide = (index) => {
    setCurrentImageIndex(index);
  };

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* ✅ Background Images with sliding effect */}
      <div className="absolute top-0 left-0 w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          ></div>
        ))}
      </div>

      {/* ✅ Content Section */}
      <div
        className="
          absolute inset-0 z-10 
          flex flex-col justify-center 
          px-8 md:px-20
          text-white
          text-left md:items-start
          items-center text-center md:text-left
          bg-black/40
        "
      >
        {/* Title with dynamic content */}
        <div className="transition-all duration-1000 ease-in-out">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
            {slides[currentImageIndex].title.split(' ').slice(0, -1).join(' ')}
            <br />
            <span className="text-white">
              {slides[currentImageIndex].title.split(' ').slice(-1)[0]}
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl max-w-2xl text-gray-100 font-light leading-relaxed drop-shadow-md">
            {slides[currentImageIndex].subtitle}
          </p>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${index === currentImageIndex
                ? 'w-12 h-2 bg-green-500'
                : 'w-2 h-2 bg-white/50 hover:bg-white/75'
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>
    </section>
  );
}