import React from "react";
import jeepImage from "../../assets/jeepori.jpg"; // Import from assets

export default function DriverHero() {

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={jeepImage}
          alt="Jeep Safari Adventure"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          
          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-tight">
            Premium{" "}
            <span className="bg-gradient-to-r from-green-400 to-cyan-600 bg-clip-text text-transparent">
              Jeep Safaris
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light">
            Experience the wild like never before with our expert jeep drivers.
            Explore hidden trails and witness nature's majesty in comfort and safety.
          </p>

          {/* Buttons removed */}

        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="text-green-300 text-sm flex flex-col items-center gap-2">
          <span className="text-xs sm:text-sm">Scroll to explore</span>
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>

      {/* Mobile Optimization Styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          .text-2xl {
            font-size: 1.8rem;
            line-height: 1.2;
          }
        }

        @media (max-width: 480px) {
          .text-2xl {
            font-size: 1.6rem;
            line-height: 1.2;
          }
        }

        @media (max-width: 380px) {
          .text-2xl {
            font-size: 1.4rem;
            line-height: 1.2;
          }
        }
      `}</style>
    </section>
  );
}
