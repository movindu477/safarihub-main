import React from "react";

// Import image from src/assets
import heroImage from "../../assets/IMG_4804.jpg";
import logo from "../../assets/logo - Copy.png";

export default function Section1({ children }) {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            animation: "zoomIn 20s ease-in-out infinite alternate",
          }}
        ></div>
      </div>

      {/* Content Section */}
      <div
        className="
          absolute inset-0 z-10 
          flex flex-col justify-center 
          px-8 md:px-20
          text-white
          text-left md:items-start
          items-center text-center md:text-left
        "
      >
        {/* Left side black opacity overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent pointer-events-none"></div>

        {/* Title */}
        <div className="relative z-10">
          <div className="text-2xl md:text-3xl font-thin -mb-2 leading-tight drop-shadow-lg">
            Welcome To
          </div>
          {/* Logo - Replaces SafariHub text */}
          <div className="-mb-2 leading-tight drop-shadow-lg -ml-2 md:-ml-4 lg:-ml-6">
            <img
              src={logo}
              alt="SafariHub Logo"
              className="h-14 md:h-20 lg:h-28 xl:h-36 w-auto drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>

      {/* Booking Panel - Positioned in hero section */}
      {children}
    </section>
  );
}