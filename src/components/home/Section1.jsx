import React from "react";

// Import image from src/assets
import back4ori from "../../assets/back4ori2.avif";

export default function Section1() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Background Image */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(${back4ori})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
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
          bg-black/40
        "
      >
        {/* Title */}
        <div>
          <div className="text-2xl md:text-3xl font-thin mb-2 leading-tight drop-shadow-lg">
            Welcome To
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight drop-shadow-lg">
            SafariHub
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg max-w-2xl text-gray-300 font-light leading-relaxed drop-shadow-md">
            Create Memories That Last a Lifetime
          </p>
        </div>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10"></div>
    </section>
  );
}