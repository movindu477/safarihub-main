import React from "react";
import guideImage from "../../assets/guideori.jpg";

export default function GuideHero({ children }) {
  return (
    <section className="relative w-full h-[100dvh] overflow-hidden bg-black">
      {/* Background Image - Desktop */}
      <div
        className="hidden sm:block absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: `url(${guideImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Background Image - Mobile */}
      <div
        className="block sm:hidden absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: `url(${guideImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10"></div>

      {/* DESKTOP CONTENT - Left Aligned Text */}
      <div className="hidden sm:flex relative z-20 h-full w-full px-12 items-center">
        {/* Left Side: Text Content */}
        <div className="flex-1 max-w-3xl relative h-full flex items-center">
          <div className="relative w-full">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full animate-fadeInUp">
              {/* Subtitle Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-sm font-medium text-emerald-100 tracking-wider uppercase">
                  Expert Guides
                </span>
              </div>

              {/* Main Title */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight drop-shadow-lg" style={{ animationDelay: "0.2s" }}>
                Meet Your Local Experts
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-gray-200 font-light max-w-xl leading-relaxed" style={{ animationDelay: "0.4s" }}>
                Connect with passionate local experts who bring destinations to life.
                Discover hidden stories, cultural insights, and personalized experiences
                that transform your journey into an unforgettable adventure.
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

      {/* MOBILE CONTENT - Centered Content */}
      <div className="sm:hidden flex relative z-20 h-full items-center justify-center px-4">
        <div className="max-w-lg text-center relative w-full h-full flex items-center justify-center">
          <div className="absolute left-0 right-0 px-4 animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
              <span className="text-xs font-medium text-emerald-100 tracking-wider uppercase">Expert Guides</span>
            </div>
            <h1 className="text-3xl font-bold mb-3 text-white" style={{ animationDelay: "0.2s" }}>
              Meet Your Local Experts
            </h1>
            <p className="text-sm font-light text-white/90" style={{ animationDelay: "0.4s" }}>
              Connect with passionate local experts who bring destinations to life and transform your journey into an unforgettable adventure.
            </p>
          </div>
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
        }
      `}</style>
    </section>
  );
}