import React, { useState, useEffect } from "react";

// Import image from src/assets
import cameraImage from "../assets/camera.jpg";

export default function Section5() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const locations = [
    { city: "Colombo", spots: 12 },
    { city: "Kandy", spots: 8 },
    { city: "Galle", spots: 6 },
    { city: "Ella", spots: 4 },
    { city: "Mirissa", spots: 5 },
    { city: "Sigiriya", spots: 3 }
  ];

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with parallax effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed scale-105"
        style={{ backgroundImage: `url(${cameraImage})` }}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-green-900/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-green-500 rounded-full animate-ping"></div>
          <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-green-400 rounded-full opacity-60 animate-bounce"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-20">
        <div className={`transition-all duration-1000 transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full mb-6">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-sm tracking-wider">
                NATIONWIDE COVERAGE
              </span>
            </div>
            
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent">
                Rental
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                Locations
              </span>
            </h2>
            
            <div className="w-24 h-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-8"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Description & Stats */}
            <div className="space-y-8">
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-light">
                Discover premium camera and adventure gear rental locations across Sri Lanka. 
                From professional DSLRs to action cameras, we provide high-quality equipment 
                for capturing every unforgettable moment of your journey.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300">
                  <div className="text-3xl font-bold text-green-500 mb-2">38+</div>
                  <div className="text-gray-300 text-sm">Rental Locations</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300">
                  <div className="text-3xl font-bold text-green-500 mb-2">200+</div>
                  <div className="text-gray-300 text-sm">Equipment Types</div>
                </div>
              </div>

              {/* CTA Button */}
              <button className="group relative bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
                text-white font-semibold text-lg py-4 px-8 rounded-2xl 
                transition-all duration-300 transform hover:scale-105 hover:shadow-2xl 
                flex items-center gap-3 overflow-hidden">
                <span className="relative z-10">Explore Locations</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300 relative z-10" 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Right Column - Locations Grid */}
            <div className="bg-black/40 backdrop-blur-lg border border-white/20 rounded-3xl p-8 hover:border-white/30 transition-all duration-500">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Popular Cities
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {locations.map((location, index) => (
                  <div 
                    key={location.city}
                    className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 
                      transition-all duration-300 transform hover:scale-105 cursor-pointer
                      ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-white">{location.city}</h4>
                      <span className="text-green-500 text-sm font-bold">{location.spots}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${(location.spots / 12) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">rental spots</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total locations nationwide</span>
                  <span className="text-green-500 font-bold">38</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="text-white/60 text-sm flex items-center gap-2">
          Scroll to explore
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}