import React, { useState, useEffect } from "react";
import jeep1 from "../../assets/jeepori3.avif";
import jeep2 from "../../assets/jeep.avif";
import jeep3 from "../../assets/jeepori2.jpg";

export default function JeepHero({ children }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slideshow data with jeep-specific content
  const desktopSlides = [
    {
      image: jeep1,
      title: "Premium Jeep Safaris",
      subtitle: "Experience The",
      description: "Navigate through nature's toughest terrains with our expert drivers.",
    },
    {
      image: jeep2,
      title: "Luxury Safari Jeeps",
      subtitle: "Travel In",
      description: "Premium vehicles equipped for maximum comfort and visibility.",
    },
    {
      image: jeep3,
      title: "Unforgettable Journeys",
      subtitle: "Create",
      description: "Witness breathtaking wildlife moments from the best vantage points.",
    },
  ];

  // Mobile background images (using same images for simplicity)
  const mobileImages = [jeep1, jeep2, jeep3];

  // Auto-advance slideshow every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % desktopSlides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [desktopSlides.length]);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Images - Desktop with Smooth Transitions */}
      {desktopSlides.map((slide, index) => (
        <div
          key={`desktop-${index}`}
          className={`hidden sm:block absolute top-0 left-0 w-full h-full transition-opacity duration-1500 ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          style={{
            backgroundImage: `url(${slide.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ))}

      {/* Background Images - Mobile with Smooth Transitions */}
      {mobileImages.map((image, index) => (
        <div
          key={`mobile-${index}`}
          className={`block sm:hidden absolute top-0 left-0 w-full h-full transition-opacity duration-1500 ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ))}

      {/* Gradient Overlay - Optimized for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>

      {/* DESKTOP CONTENT - Left Aligned Text */}
      <div className="hidden sm:flex relative z-20 h-full w-full px-12 items-center">
        {/* Left Side: Text Content */}
        <div className="flex-1 max-w-3xl relative h-full flex items-center">
          <div className="relative w-full">
            {desktopSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute top-1/2 -translate-y-1/2 left-0 w-full transition-all duration-1000 ease-in-out ${index === currentSlide
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8 pointer-events-none"
                  }`}
              >
                {/* Subtitle Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 animate-fadeInUp">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-sm font-medium text-emerald-100 tracking-wider uppercase">
                    {slide.subtitle}
                  </span>
                </div>

                {/* Main Title */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight drop-shadow-lg animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
                  {slide.title}
                </h1>

                {/* Description */}
                <p className="text-lg md:text-xl text-gray-200 font-light max-w-xl leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
                  {slide.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Panel Container - Absolute Positioned */}
      <div className="hidden sm:block absolute z-30 top-0 right-0 w-full h-full pointer-events-none">
        <div className="w-full h-full relative">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      </div>

      {/* MOBILE CONTENT - Static "Jeep Drivers" */}
      <div className="sm:hidden flex relative z-20 h-full items-center justify-center px-4">
        <div className="max-w-lg text-center">
          {/* Subtitle Text */}
          <h2 className="text-xl font-light mb-2 text-white animate-fadeInUp">
            Welcome To
          </h2>

          {/* Main Title */}
          <h1 className="text-3xl font-bold mb-3 text-white animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            Jeep Safaris
          </h1>

          {/* Description */}
          <p className="text-sm font-light text-white/90 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Experience the wild with our expert drivers
          </p>
        </div>
      </div>

      {/* Slide Indicators - Desktop Only */}
      <div className="hidden sm:flex absolute bottom-12 left-1/2 transform -translate-x-1/2 z-30 gap-3">
        {desktopSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-500 ${index === currentSlide
              ? "w-12 bg-white"
              : "w-2 bg-white/50 hover:bg-white/75"
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
