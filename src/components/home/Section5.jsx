import React from "react";
import { useNavigate } from "react-router-dom";

// Import background image from src/assets
import rentalBackground from "../../assets/back6.jpg";

export default function Section5() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: `url(${rentalBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

      {/* Content Section - Centered */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center px-4 sm:px-6 md:px-8 text-white text-center">
        <div className="relative z-10 flex flex-col items-center space-y-6 sm:space-y-8 max-w-4xl">
          {/* Title */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-lg">
            Find a place to rent
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 leading-relaxed max-w-2xl px-4 drop-shadow-md">
            Discover premium camera and adventure gear rental locations across Sri Lanka. From professional DSLRs to action cameras, we provide high-quality equipment for capturing every unforgettable moment of your journey.
          </p>

          {/* Rent Now Button */}
          <button
            onClick={() => navigate('/about')}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold 
              py-3 px-8 sm:py-3.5 sm:px-10 rounded-lg transition-all duration-300 
              transform hover:scale-105 shadow-lg cursor-pointer text-sm sm:text-base touch-manipulation mt-2"
          >
            Rent Now
          </button>
        </div>
      </div>

      {/* Optional gradient fade at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>
    </section>
  );
}
