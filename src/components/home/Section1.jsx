import React, { useState, useEffect } from "react";

// Import all hero images from src/assets
import hero1 from "../../assets/hero1.avif";
import hero2 from "../../assets/hero2.avif";
import hero3 from "../../assets/hero3.jpg";
import hero4 from "../../assets/hero4.jpg";
import logo from "../../assets/logo - Copy.png";

export default function Section1({ children }) {
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

      {/* Content Section - Fixed position, no zoom */}
      <div
        className="
          absolute inset-0 z-20 
          flex flex-col justify-center 
          px-8 md:px-20
          text-white
          text-left md:items-start
          items-center text-center md:text-left
        "
        style={{
          transform: 'none', // Ensure content doesn't zoom
          willChange: 'auto', // No animation needed for content
        }}
      >
        {/* Left side black opacity overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent pointer-events-none"></div>

        {/* Title - Slide in from left animation */}
        <div 
          className="relative z-10"
          style={{
            transform: contentVisible ? 'translateX(0)' : 'translateX(-100px)',
            opacity: contentVisible ? 1 : 0,
            transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s ease-in',
            willChange: 'transform, opacity',
          }}
        >
          <div className="text-2xl md:text-3xl font-thin -mb-2 leading-tight drop-shadow-lg">
            Welcome To
          </div>
          {/* Logo - Replaces SafariHub text - Slide in from left */}
          <div className="-mb-2 leading-tight drop-shadow-lg -ml-2 md:-ml-4 lg:-ml-6">
            <img
              src={logo}
              alt="SafariHub Logo"
              className="h-14 md:h-20 lg:h-28 xl:h-36 w-auto drop-shadow-lg"
              style={{ transform: 'none' }} // Ensure logo doesn't zoom
            />
          </div>
        </div>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>

      {/* Booking Panel - Positioned in hero section */}
      {children}
    </section>
  );
}
