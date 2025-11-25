import React from "react";

// Import image from src/assets
import back1 from "../../assets/back1.jpg";

export default function Section1() {

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* ✅ Background Image */}
      <div
        className="absolute top-0 left-0 w-full h-full"
        style={{
          backgroundImage: `url(${back1})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>

      {/* ✅ Content Section */}
      <div
        className="
          absolute inset-0 z-10 
          flex flex-col justify-center 
          px-8 md:px-20
          text-white
          text-left md:items-start
          items-center text-center md:text-left
          bg-black/40  /* Slight overlay for better readability */
        "
      >
        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
          Welcome to
          <br />
          <span className="text-green-500">SafariHub</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl max-w-2xl text-gray-100 font-light leading-relaxed drop-shadow-md">
          Discover breathtaking destinations, thrilling adventures, and unforgettable experiences. 
          SafariHub brings you closer to the wild beauty of nature one journey at a time.
        </p>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
    </section>
  );
}