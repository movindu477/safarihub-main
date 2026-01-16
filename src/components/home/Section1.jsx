import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Import all hero images from src/assets
import hero1 from "../../assets/hero1.avif";
import hero2 from "../../assets/hero2.avif";
import hero3 from "../../assets/hero3.jpg";
import hero4 from "../../assets/hero4.jpg";
import logo from "../../assets/logo - Copy.png";

export default function Section1({ children }) {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  const heroImages = [hero1, hero2, hero3, hero4];

  // Animate content slide-in on mount
  useEffect(() => {
    setContentVisible(true);
  }, []);

  useEffect(() => {
    // Reset transition state when image changes
    setIsTransitioning(false);

    // Total cycle time: 8 seconds (6s display + 2s slide transition)
    const displayDuration = 6000; // 6 seconds display
    const transitionDuration = 2000; // 2 seconds for slide transition

    const displayTimer = setTimeout(() => {
      // Start transition (slide)
      setIsTransitioning(true);
      
      // After transition completes, switch to next image
      const transitionTimer = setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
      }, transitionDuration);

      return () => clearTimeout(transitionTimer);
    }, displayDuration);

    return () => clearTimeout(displayTimer);
  }, [currentImageIndex, heroImages.length]);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Images with Smooth Slide Animation (No Zoom) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        {heroImages.map((image, index) => {
          const isActive = index === currentImageIndex;
          const isNext = index === (currentImageIndex + 1) % heroImages.length;
          
          // Determine position and opacity for sliding effect (no zoom)
          let translateX = 0;
          let opacity = 0;
          let zIndex = 0;
          
          if (isActive && !isTransitioning) {
            // Active image: visible, no zoom
            translateX = 0;
            opacity = 1;
            zIndex = 10;
          } else if (isActive && isTransitioning) {
            // Active image: sliding out to left
            translateX = -100;
            opacity = 0;
            zIndex = 10;
          } else if (isNext && !isTransitioning) {
            // Next image: waiting off-screen to the right
            translateX = 100;
            opacity = 0;
            zIndex = 5;
          } else if (isNext && isTransitioning) {
            // Next image: sliding in from right
            translateX = 0;
            opacity = 1;
            zIndex = 20;
          } else {
            // Other images: hidden
            translateX = index < currentImageIndex ? -100 : 100;
            opacity = 0;
            zIndex = 0;
          }
          
          // Determine transition timing (smooth sliding only, no zoom)
          let transition = 'none';
          if (isActive && isTransitioning) {
            // Slide out left
            transition = 'transform 2s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease-out';
          } else if (isNext && isTransitioning) {
            // Slide in from right
            transition = 'transform 2s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease-in';
          }
          
          return (
            <div
              key={index}
              className="absolute top-0 left-0 w-full h-full"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity: opacity,
                zIndex: zIndex,
                transform: `translateX(${translateX}%)`,
                transition: transition,
                willChange: 'transform, opacity',
              }}
            ></div>
          );
        })}
      </div>

      {/* Content Section - Centered */}
      <div
        className="
          absolute inset-0 z-20 
          flex flex-col justify-center items-center
          px-4 sm:px-6 md:px-8
          text-white text-center
        "
        style={{
          transform: 'none',
          willChange: 'auto',
        }}
      >
        {/* Center dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

        {/* Content Container - Fade in animation */}
        <div 
          className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-6 max-w-4xl"
          style={{
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 1s ease-in',
            willChange: 'opacity',
          }}
        >
          {/* Welcome To Text */}
          <div className="text-xl sm:text-2xl md:text-3xl font-thin leading-tight drop-shadow-lg">
            Welcome To
          </div>
          
          {/* SafariHub Logo */}
          <div className="leading-tight drop-shadow-lg">
            <img
              src={logo}
              alt="SafariHub Logo"
              className="h-16 sm:h-20 md:h-24 lg:h-32 xl:h-40 w-auto drop-shadow-lg mx-auto"
              style={{ transform: 'none' }}
            />
          </div>

          {/* Tagline */}
          <div className="text-base sm:text-lg md:text-xl font-light drop-shadow-lg -mt-2">
            Your All in One Gateway to Adventure.
          </div>

          {/* Description Paragraph */}
          <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed max-w-2xl px-4 drop-shadow-md">
            Embark on unforgettable journeys through Sri Lanka's breathtaking landscapes. From majestic wildlife to pristine beaches, discover your next adventure.
          </p>

          {/* Explore Destinations Button */}
          <button
            onClick={() => navigate('/destination')}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold 
              py-3 px-8 sm:py-3.5 sm:px-10 rounded-lg transition-all duration-300 
              transform hover:scale-105 shadow-lg cursor-pointer text-sm sm:text-base touch-manipulation mt-2"
          >
            Explore Destinations
          </button>
        </div>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>

      {/* Booking Panel - Positioned in hero section */}
      {children}
    </section>
  );
}
