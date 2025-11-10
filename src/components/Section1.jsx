import React, { useState, useEffect } from "react";

// Import images from src/assets
import back1 from "../assets/back1.jpg";
import back2 from "../assets/back2.avif";
import back3 from "../assets/back3.avif";
import back4 from "../assets/back4.avif";

export default function Section1() {
  // ✅ Use imported images
  const images = [
    back1,
    back2,
    back3,
    back4,
  ];

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000); // Slide every 5 seconds
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* ✅ Background slideshow */}
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-[2000ms] ease-in-out ${
            index === currentImage ? "opacity-100" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        ></div>
      ))}

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
        <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight drop-shadow-lg">
          Welcome to <span className="text-yellow-400">SafariHub</span>
        </h1>

        {/* Description */}
        <p className="text-base md:text-lg max-w-xl text-gray-100">
          Discover breathtaking destinations, thrilling adventures, and
          unforgettable experiences. SafariHub brings you closer to the wild
          beauty of nature one journey at a time.
        </p>
      </div>

      {/* Optional gradient fade at the bottom for elegance */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
    </section>
  );
}