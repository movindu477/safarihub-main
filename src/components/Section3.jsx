import React, { useState, useEffect } from "react";

// Import image from src/assets
import lankamap from "../assets/lankamap.png";

const LocationDot = ({ type, position, label, isHovered, onHover }) => {
  const dotColors = {
    red: "bg-red-500 shadow-red-500/50",
    green: "bg-green-500 shadow-green-500/50",
    blue: "bg-blue-500 shadow-blue-500/50",
    yellow: "bg-yellow-400 shadow-yellow-400/50",
    purple: "bg-purple-500 shadow-purple-500/50",
  };

  const pulseAnimation = isHovered ? "animate-pulse" : "";

  return (
    <div
      className={`absolute w-4 h-4 rounded-full ${dotColors[type]} shadow-lg 
        transition-all duration-300 transform hover:scale-125 cursor-pointer
        ${pulseAnimation}`}
      style={{
        left: position.left,
        top: position.top,
      }}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>
      
      <span
        className={`absolute -top-8 left-1/2 -translate-x-1/2 
          text-xs font-semibold text-white whitespace-nowrap
          bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg
          border border-white/20 pointer-events-none transition-all duration-300
          ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        {label}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 
          w-2 h-2 bg-gray-900/90 rotate-45"></div>
      </span>
    </div>
  );
};

const LegendItem = ({ color, label, count, isActive, onClick }) => (
  <div 
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300
      ${isActive ? 'bg-white shadow-lg border border-gray-200' : 'hover:bg-gray-50'}`}
    onClick={onClick}
  >
    <div className={`w-4 h-4 rounded-full ${color} shadow-md ${isActive ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}></div>
    <div className="flex-1">
      <span className="text-gray-800 font-semibold">{label}</span>
      <span className="text-gray-500 text-sm ml-2">({count})</span>
    </div>
  </div>
);

export default function Section3() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [hoveredLocation, setHoveredLocation] = useState(null);

  const locations = {
    nationalParks: [
      { label: "YALA", position: { left: "68%", top: "85%" } },
      { label: "Wilpattu", position: { left: "35%", top: "35%" } },
      { label: "Udawalawe", position: { left: "53%", top: "85%" } },
      { label: "Minneriya", position: { left: "52%", top: "45%" } },
      { label: "Horton Plains", position: { left: "52%", top: "81%" } },
    ],
    beaches: [
      { label: "Arugam Bay", position: { left: "48%", top: "25%" } },
      { label: "Mirissa", position: { left: "75%", top: "50%" } },
      { label: "Unawatuna", position: { left: "40%", top: "60%" } },
      { label: "Bentota", position: { left: "60%", top: "75%" } },
      { label: "Nilaveli", position: { left: "33%", top: "35%" } },
    ],
    wildlifeSanctuaries: [
      { label: "Kumana", position: { left: "72%", top: "78%" } },
      { label: "Bundala", position: { left: "65%", top: "88%" } },
    ],
    forestReserves: [
      { label: "Sinharaja", position: { left: "58%", top: "75%" } },
      { label: "Knuckles", position: { left: "45%", top: "50%" } },
    ],
    campingSites: [
      { label: "Ella Rock", position: { left: "55%", top: "70%" } },
      { label: "Adam's Peak", position: { left: "50%", top: "65%" } },
    ]
  };

  const legendItems = [
    { color: "bg-red-500", label: "National Parks", key: "nationalParks", count: locations.nationalParks.length },
    { color: "bg-purple-500", label: "Wildlife Sanctuaries", key: "wildlifeSanctuaries", count: locations.wildlifeSanctuaries.length },
    { color: "bg-blue-500", label: "Famous Beaches", key: "beaches", count: locations.beaches.length },
    { color: "bg-yellow-400", label: "Forest Reserves", key: "forestReserves", count: locations.forestReserves.length },
    { color: "bg-green-500", label: "Camping Sites", key: "campingSites", count: locations.campingSites.length },
  ];

  const getFilteredLocations = () => {
    if (activeFilter === "all") {
      return Object.entries(locations).flatMap(([type, items]) =>
        items.map(loc => ({ ...loc, type }))
      );
    }
    return locations[activeFilter]?.map(loc => ({ ...loc, type: activeFilter })) || [];
  };

  return (
    <section
      className="w-full bg-gradient-to-br from-white to-gray-50 text-black 
      flex flex-col lg:flex-row items-center justify-center 
      py-20 px-6 lg:px-20 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
      
      {/* Left Side - Map */}
      <div className="relative w-full lg:w-1/2 flex justify-center mb-12 lg:mb-0 select-none">
        <div className="relative w-full max-w-2xl flex justify-center">
          {/* Map Container with modern border */}
          <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-gray-200">
            <img
              src={lankamap}
              alt="Sri Lanka Adventure Destinations Map"
              className="w-full max-w-md mx-auto object-contain transform hover:scale-105 transition-transform duration-500"
            />

            {/* Animated Dots */}
            <div className="absolute inset-0">
              {getFilteredLocations().map((loc, i) => (
                <LocationDot
                  key={`${loc.type}-${i}`}
                  type={
                    loc.type === "nationalParks" ? "red" :
                    loc.type === "campingSites" ? "green" :
                    loc.type === "beaches" ? "blue" :
                    loc.type === "forestReserves" ? "yellow" : "purple"
                  }
                  position={loc.position}
                  label={loc.label}
                  isHovered={hoveredLocation === loc.label}
                  onHover={setHoveredLocation}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="w-full lg:w-1/2 text-center lg:text-left lg:pl-16 space-y-8 max-w-2xl">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Explore Sri Lanka
          </div>
          
          <h2 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
            Discover Your Next
            <span className="text-green-600 block">Adventure</span>
          </h2>
          
          <div className="w-24 h-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto lg:mx-0"></div>
        </div>

        <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
          Journey through Sri Lanka's diverse landscapes — from pristine national parks 
          and tranquil wildlife sanctuaries to breathtaking beaches and lush forest reserves. 
          Your perfect adventure awaits.
        </p>

        {/* Interactive Legend */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Destination Types
            </h3>
            <button 
              onClick={() => setActiveFilter("all")}
              className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                activeFilter === "all" 
                  ? "bg-green-500 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Show All
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {legendItems.map((item, index) => (
              <LegendItem 
                key={index} 
                color={item.color} 
                label={item.label}
                count={item.count}
                isActive={activeFilter === item.key}
                onClick={() => setActiveFilter(activeFilter === item.key ? "all" : item.key)}
              />
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
            text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 
            transform hover:scale-105 hover:shadow-2xl shadow-lg flex items-center justify-center gap-3"
          >
            <span>Explore All Destinations</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          
          <button
            className="group border-2 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700
            font-semibold py-4 px-8 rounded-xl transition-all duration-300 
            transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <span>Download Map</span>
            <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}