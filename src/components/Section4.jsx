import React from "react";

// Import videos from src/assets
import parksVideo from "../assets/parks.mp4";
import sancVideo from "../assets/sanc.mp4";
import beachVideo from "../assets/beach.mp4";
import forestVideo from "../assets/forest.mp4";
import campVideo from "../assets/camp.mp4";

export default function Section4() {
  const videos = [
    { 
      src: parksVideo, 
      title: "National Parks",
      link: "/national-parks"
    },
    { 
      src: sancVideo, 
      title: "Sanctuaries",
      link: "/sanctuaries"
    },
    { 
      src: beachVideo, 
      title: "Beaches",
      link: "/beaches"
    },
    { 
      src: forestVideo, 
      title: "Forest Reserves",
      link: "/forest-reserves"
    },
    { 
      src: campVideo, 
      title: "Camp Sites",
      link: "/camp-sites"
    },
  ];

  return (
    <section className="w-full bg-white text-black py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-20">
      {/* Title Section */}
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold relative inline-block">
          Explore Our Adventures
          <span className="block w-20 sm:w-24 h-1 bg-green-600 mx-auto mt-3 sm:mt-4 animate-pulse rounded-full"></span>
        </h2>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
        {videos.map((item, index) => (
          <div
            key={index}
            className="group relative w-full max-w-[400px] sm:max-w-[450px] lg:max-w-[500px] h-[250px] sm:h-[280px] lg:h-[300px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl transform hover:scale-[1.02] transition-all duration-500 cursor-pointer"
          >
            {/* Video Background */}
            <video
              src={item.src}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            ></video>

            {/* Black Overlay - Responsive slides up on hover */}
            <div className="absolute bottom-0 left-0 w-full h-0 bg-black bg-opacity-80 group-hover:h-full transition-all duration-500 ease-in-out origin-bottom"></div>

            {/* Title Container */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Default Title - Responsive sizing */}
              <div className="text-white text-xl sm:text-2xl lg:text-2xl font-semibold text-center transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-3 sm:group-hover:translate-y-4 group-hover:scale-95 px-4">
                {item.title}
              </div>
              
              {/* Hover Content - Responsive slides up */}
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transform translate-y-6 sm:translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-in-out delay-75 px-4 sm:px-6">
                {/* Hover Title - Responsive sizing */}
                <h3 className="text-white text-2xl sm:text-3xl lg:text-3xl font-bold text-center mb-4 sm:mb-6 transition-all duration-400 group-hover:delay-100 px-2">
                  {item.title}
                </h3>
                {/* Explore Now Button - Responsive sizing */}
                <a
                  href={item.link}
                  className="bg-green-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transform hover:scale-105 transition-all duration-300 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-400 group-hover:delay-150 text-sm sm:text-base"
                >
                  Explore Now
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}