import React from "react";
import cameraImage from "../../assets/camera.avif";

export default function RentingHero({ children }) {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Image - Static */}
      <div
        className="absolute top-0 left-0 w-full h-full transition-opacity duration-1500 ease-in-out opacity-100"
        style={{
          backgroundImage: `url(${cameraImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Gradient Overlay - Optimized for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>

      {/* DESKTOP CONTENT - Left Aligned Text */}
      <div className="hidden sm:flex relative z-20 h-full w-full px-12 items-center">
        {/* Left Side: Text Content */}
        <div className="flex-1 max-w-3xl relative h-full flex items-center">
          <div className="relative w-full">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full opacity-100 translate-x-0">
              {/* Subtitle Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 animate-fadeInUp">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm font-medium text-emerald-100 tracking-wider uppercase">
                  Capture The
                </span>
              </div>

              {/* Main Title */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight drop-shadow-lg animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
                Premium Gear Rental
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-gray-200 font-light max-w-xl leading-relaxed animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
                High-quality cameras and equipment for your perfect shot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Panel Container - Absolute Positioned */}
      <div className="hidden sm:block absolute z-30 top-0 right-0 w-full h-full pointer-events-none">
        <div className="w-full h-full relative">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      </div>

      {/* MOBILE CONTENT - Static "Gear Rental" */}
      <div className="sm:hidden flex relative z-20 h-full items-center justify-center px-4">
        <div className="max-w-lg text-center">
          {/* Subtitle Text */}
          <h2 className="text-xl font-light mb-2 text-white animate-fadeInUp">
            Welcome To
          </h2>

          {/* Main Title */}
          <h1 className="text-3xl font-bold mb-3 text-white animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            Gear Rental
          </h1>

          {/* Description */}
          <p className="text-sm font-light text-white/90 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
            Premium equipment for your adventure
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
