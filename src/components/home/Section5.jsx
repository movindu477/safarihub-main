import React from "react";
import { useNavigate } from "react-router-dom";

// Import image from src/assets
import cameraImage from "../../assets/camera.jpg";

export default function Section5() {
  const navigate = useNavigate();

  return (
    <section className="w-full min-h-screen flex items-center bg-[#F5F5F5] py-8 sm:py-12 md:py-16">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          {/* Content Area - Left on Desktop, First on Mobile */}
          <div className="flex flex-col space-y-4 sm:space-y-6 order-1 lg:order-1 text-center lg:text-left lg:mr-20">
            {/* Title - One Line */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold lg:font-semibold text-black leading-tight">
              Rental Locations
            </h1>

            {/* Paragraph Text */}
            <p className="text-sm sm:text-base md:text-lg text-black leading-relaxed max-w-lg mx-auto lg:mx-0 lg:text-justify">
              Discover premium camera and adventure gear rental locations across Sri Lanka. From professional DSLRs to action cameras, we provide high-quality equipment for capturing every unforgettable moment of your journey.
            </p>

            {/* Explore Locations Button */}
            <div className="pt-2 flex justify-center lg:justify-start">
              <button
                onClick={() => navigate('/about')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 sm:py-3 sm:px-8 rounded-lg transition-colors duration-300 cursor-pointer text-sm sm:text-base"
              >
                Explore Locations
              </button>
            </div>
          </div>

          {/* Image Area - Right on Desktop, Second on Mobile */}
          <div className="w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center order-2 lg:order-2">
            <div className="relative w-full h-full">
              <img
                src={cameraImage}
                alt="Camera rental locations"
                className="w-full h-full object-cover object-center rounded-[20px] lg:rounded-tr-[20px] lg:rounded-tl-0 lg:rounded-br-[20px] lg:rounded-bl-[20px]"
                style={{
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
