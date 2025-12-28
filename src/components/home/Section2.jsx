import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Import image from src/assets
import aboutImage from "../../assets/about.jpg";

export default function Section2() {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* Background Image - Properly Fitted */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={aboutImage}
          alt="SafariHub background"
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.95) contrast(1.05)" }}
        />
      </div>

      {/* Subtle gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>

      {/* Main Content Container - Centered */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>

          {/* Header Section - Centered */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-xs md:text-sm tracking-wider uppercase">
                OUR JOURNEY BEGINS
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-tight">
              <span className="bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent">
                Our Story
              </span>
            </h1>

            <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-8"></div>
          </div>

          {/* Centered Content */}
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            {/* Paragraph - Centered, with subtle background */}
            <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 max-w-3xl border border-white/10">
              <p className="text-base md:text-lg lg:text-xl text-white leading-relaxed font-light">
                At <span className="text-green-400 font-semibold">SafariHub</span>, our journey began with a simple passion: connecting
                people to the wonders of nature. From breathtaking landscapes to
                thrilling adventures, we strive to create unforgettable memories for
                every explorer. Our story is one of discovery, dedication, and
                bringing the wild closer to you, one experience at a time.
              </p>
            </div>

            {/* CTA Button - Centered */}
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/about')}
                className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
                text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 
                transform hover:scale-105 hover:shadow-2xl shadow-lg flex items-center justify-center gap-3
                border border-green-500/30 cursor-pointer"
              >
                <span>Learn More</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - Better Positioned */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
        <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
          <div className="text-white/80 text-xs md:text-sm flex items-center gap-2">
            <span>Scroll to continue</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}