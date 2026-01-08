import React from "react";
import { useNavigate } from "react-router-dom";

// Import background image
import backgroundImage from "../../assets/about2.avif";

export default function Section2() {
  const navigate = useNavigate();

  return (
    <section className="relative w-full min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[800px] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={backgroundImage}
          alt="SafariHub wildlife background"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay on right side for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/40 to-transparent"></div>
      </div>

      {/* Content Overlay - Right Side */}
      <div className="relative z-10 w-full flex justify-end items-center min-h-[500px] sm:min-h-[600px] md:min-h-[700px] lg:min-h-[800px] pl-4 sm:pl-6 lg:pl-8 lg:pl-12 xl:pl-16 pr-4 sm:pr-6 md:pr-8 lg:pr-10 xl:pr-12 2xl:pr-16">
        <div className="max-w-sm lg:max-w-md xl:max-w-lg w-full">
          {/* Title - Two Lines */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-6 sm:mb-8">
            <span className="block">Our</span>
            <span className="block">Story</span>
          </h1>

          {/* Paragraph Text */}
          <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed mb-6 sm:mb-8 max-w-xl">
            At SafariHub, our journey began with a simple passion: connecting people to the wonders of nature. From breathtaking landscapes to thrilling adventures, we strive to create unforgettable memories for every explorer. Our story is one of discovery, dedication, and bringing the wild closer to you, one experience at a time.
          </p>

          {/* Learn More Button */}
          <div className="flex justify-start">
            <button
              onClick={() => navigate('/about')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 sm:py-3.5 sm:px-10 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
