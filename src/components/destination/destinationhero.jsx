import React, { useState, useEffect } from "react";

// Import images from assets
import desti1 from "../../assets/desti.avif";
import desti2 from "../../assets/desti2.avif";
import desti3 from "../../assets/desti3.avif";
import desti4 from "../../assets/desti4.avif";

export default function DestinationHero({ children }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slides data
  const desktopSlides = [
    {
      image: desti1,
      title: "Unveil the Beauty of Sri Lanka",
      subtitle: "Isle of Paradise",
      description: "From golden beaches to misty mountains, discover an island where nature's artistry knows no bounds.",
    },
    {
      image: desti2,
      title: "Bask in Tropical Serenity",
      subtitle: "Undiscovered Shores",
      description: "Relax on pristine white sands where crystal clear waters meet the endless blue horizon.",
    },
    {
      image: desti3,
      title: "Experience Coastal Bliss",
      subtitle: "Sun, Sand & Surf",
      description: "Dive into the turquoise waves, surf the perfect breaks, or simply watch the golden sunset over the Indian Ocean.",
    },
    {
      image: desti4,
      title: "Serenity in the Hills",
      subtitle: "Hill Country Magic",
      description: "Breathe in the fresh mountain air as you explore lush tea plantations and breathtaking cascading waterfalls.",
    },
  ];

  // Mobile background images (using same as desktop)
  const mobileImages = [desti1, desti2, desti3, desti4];

  // Auto-advance slideshow every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % desktopSlides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [desktopSlides.length]);

  return (
    <section className="relative w-full h-[100dvh] overflow-hidden bg-black">
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

      {/* MOBILE CONTENT - Centered Dynamic Content */}
      <div className="sm:hidden flex relative z-20 h-full items-center justify-center px-4">
        <div className="max-w-lg text-center relative w-full h-full flex items-center justify-center">
          {desktopSlides.map((slide, index) => (
            <div
              key={`mobile-content-${index}`}
              className={`absolute left-0 right-0 px-4 transition-all duration-500 ${index === currentSlide ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 animate-fadeInUp">
                <span className="text-xs font-medium text-emerald-100 tracking-wider uppercase">{slide.subtitle}</span>
              </div>
              <h1 className="text-3xl font-bold mb-3 text-white animate-fadeInUp" style={{ animationDelay: "0.2s" }}>{slide.title}</h1>
              <p className="text-sm font-light text-white/90 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>{slide.description}</p>
            </div>
          ))}
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