import React from "react";
import { useNavigate } from "react-router-dom";

// Import background image
import backgroundImage from "../../assets/about2.avif";

export default function Section2() {
  const navigate = useNavigate();

  return (
    <section className="w-full min-h-screen flex items-center bg-[#F5F5F5] py-8 sm:py-12 md:py-16">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          {/* Image Area - Left on Desktop, First on Mobile */}
          <div className="w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center order-1 lg:order-1">
            <div className="relative w-full h-full">
              <img
                src={backgroundImage}
                alt="SafariHub background"
                className="w-full h-full object-cover object-center rounded-[20px] lg:rounded-tl-[20px] lg:rounded-tr-0 lg:rounded-bl-[20px] lg:rounded-br-[20px]"
                style={{
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>
          </div>

          {/* Content Area - Right on Desktop, Second on Mobile */}
          <div className="flex flex-col space-y-4 sm:space-y-6 order-2 lg:order-2 text-center lg:text-left lg:ml-20">
            {/* Title - One Line */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold lg:font-semibold text-black leading-tight">
              Our Story
            </h1>

            {/* Paragraph Text */}
            <p className="text-sm sm:text-base md:text-lg text-black leading-relaxed max-w-lg mx-auto lg:mx-0 lg:text-justify">
              At SafariHub, our journey began with a simple passion: connecting people to the wonders of nature. From breathtaking landscapes to thrilling adventures, we strive to create unforgettable memories for every explorer. Our story is one of discovery, dedication, and bringing the wild closer to you, one experience at a time.
            </p>

            {/* Learn More Button */}
            <div className="pt-2 flex justify-center lg:justify-start">
              <button
                onClick={() => navigate('/about')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 sm:py-3 sm:px-8 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
