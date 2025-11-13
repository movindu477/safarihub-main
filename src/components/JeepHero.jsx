import React from "react";

export default function DriverHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="/jeep.avif" // Make sure to add jeep.avif to your assets folder
          alt="Jeep Safari Adventure"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        {/* Gradient overlay for visual appeal */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-tight">
            Premium{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Jeep Safaris
            </span>
          </h1>
          
          {/* Description */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 max-w-3xl mx-auto leading-relaxed font-light">
            Experience the wild like never before with our expert jeep drivers. 
            Explore hidden trails and witness nature's majesty in comfort and safety.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-4 sm:pt-6">
            <button className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-green-900 font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
              Book Your Safari Now
            </button>
            <button className="w-full sm:w-auto border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-green-900 font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-lg sm:rounded-xl text-base sm:text-lg transition-all duration-300 transform hover:scale-105">
              View Available Jeeps
            </button>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="text-yellow-300 text-sm flex flex-col items-center gap-2">
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
          .text-4xl {
            font-size: 2.5rem;
            line-height: 1.2;
          }
          .text-lg {
            font-size: 1.125rem;
            line-height: 1.6;
          }
        }
        
        @media (max-width: 480px) {
          .text-4xl {
            font-size: 2rem;
            line-height: 1.2;
          }
          .text-lg {
            font-size: 1rem;
            line-height: 1.5;
          }
        }
        
        @media (max-width: 380px) {
          .text-4xl {
            font-size: 1.75rem;
            line-height: 1.2;
          }
          .text-lg {
            font-size: 0.9rem;
            line-height: 1.4;
          }
        }
      `}</style>
    </section>
  );
}