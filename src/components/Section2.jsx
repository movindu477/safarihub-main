import React, { useState } from "react";

// Import image from src/assets
import aboutImage from "../assets/about.avif";

export default function Section2() {
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { number: "50+", label: "Adventures" },
    { number: "10K+", label: "Explorers" },
    { number: "5★", label: "Rating" },
    { number: "100%", label: "Satisfaction" }
  ];

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={aboutImage}
          alt="SafariHub background"
          className="w-full h-full object-cover scale-105"
          style={{ filter: "brightness(0.7)" }}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-green-900/30"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/80"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6">
        <div className={`transition-all duration-1000 transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          
          {/* Centered Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-sm tracking-wider">
                OUR JOURNEY BEGINS
              </span>
            </div>
            
            {/* Centered Title - Smaller Size */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent">
                Our Story
              </span>
            </h1>
            
            <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-8"></div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Column - Clean Content */}
            <div className="space-y-6">
              {/* Clean Paragraph */}
              <p className="text-lg md:text-xl text-white leading-relaxed font-light">
                At <span className="text-green-400 font-semibold">SafariHub</span>, our journey began with a simple passion connecting
                people to the wonders of nature. From breathtaking landscapes to
                thrilling adventures, we strive to create unforgettable memories for
                every explorer. Our story is one of discovery, dedication, and
                bringing the wild closer to you, one experience at a time.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
                  text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 
                  transform hover:scale-105 hover:shadow-2xl shadow-lg flex items-center justify-center gap-3"
                >
                  <span>About Us</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Column - Clean Stats & Features */}
            <div className="space-y-6">
              {/* Stats Grid - Clean */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <div 
                    key={stat.label}
                    className={`text-center transition-all duration-300 transform hover:scale-105 cursor-pointer
                      ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="text-2xl font-bold text-green-500 mb-1">{stat.number}</div>
                    <div className="text-gray-300 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Features List - Clean */}
              <div className="pt-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Why Choose SafariHub?
                </h3>
                <ul className="space-y-2">
                  {[
                    "Expert local guides",
                    "Sustainable tourism practices",
                    "Premium equipment rental",
                    "24/7 customer support",
                    "Custom adventure packages"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-200 text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="text-white/60 text-sm flex items-center gap-2">
          <span>Scroll to continue</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
}