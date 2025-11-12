import React, { useState, useEffect } from "react";

// Import image from src/assets
import lankamap from "../assets/lankamapori.png";

const LocationDot = ({ type, position, label, isHovered, onHover, onClick }) => {
  const dotColors = {
    darkGreen: "bg-green-700 shadow-green-700/50",
    brown: "bg-amber-800 shadow-amber-800/50",
    lightGreen: "bg-green-400 shadow-green-400/50",
    lightBrown: "bg-amber-500 shadow-amber-500/50",
    blue: "bg-blue-500 shadow-blue-500/50",
  };

  const pulseAnimation = isHovered ? "animate-pulse" : "";

  return (
    <div
      className={`absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full ${dotColors[type]} shadow-lg 
        transition-all duration-300 transform hover:scale-125 cursor-pointer
        ${pulseAnimation}`}
      style={{
        left: position.left,
        top: position.top,
      }}
      onMouseEnter={() => onHover(label)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(label, position);
      }}
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

const LocationPopup = ({ location, position, onClose }) => {
  if (!location) return null;

  const locationDescriptions = {
    "YALA": "Famous for leopards and diverse wildlife in Sri Lanka's most visited national park.",
    "WILPATTU": "Largest national park known for natural lakes and leopard sightings.",
    "Arugam Bay": "World-class surfing destination with pristine beaches and laid-back vibe.",
    "Mirissa": "Beautiful beach famous for whale watching and stunning sunsets.",
    "Kumana": "Bird watcher's paradise with numerous migratory bird species.",
    "Bundala": "Ramsar wetland site hosting flocks of migratory birds.",
    "Sinharaja": "UNESCO World Heritage Site with endemic rainforest biodiversity.",
    "Knuckles": "Mountain range offering challenging hikes and misty landscapes.",
    "Ella Rock": "Popular hiking destination with panoramic views of hill country.",
    "Adam's Peak": "Sacred mountain with iconic sunrise pilgrimage experience."
  };

  // Calculate optimal popup position relative to the dot
  const getPopupPosition = () => {
    if (!position) return { left: "50%", top: "50%", placement: "bottom" };
    
    const leftPos = parseFloat(position.left);
    const topPos = parseFloat(position.top);
    
    // Determine best placement based on dot position
    let placement = "bottom";
    let adjustedLeft = leftPos;
    let adjustedTop = topPos;
    
    if (topPos < 25) {
      // If dot is near top, show popup below
      placement = "bottom";
      adjustedTop = topPos + 4;
    } else if (topPos > 75) {
      // If dot is near bottom, show popup above
      placement = "top";
      adjustedTop = topPos - 4;
    } else if (leftPos > 70) {
      // If dot is on right side, show popup to the left
      placement = "left";
      adjustedLeft = leftPos - 12;
    } else if (leftPos < 30) {
      // If dot is on left side, show popup to the right
      placement = "right";
      adjustedLeft = leftPos + 12;
    } else {
      // Default: show above the dot
      placement = "top";
      adjustedTop = topPos - 4;
    }
    
    return {
      left: `${adjustedLeft}%`,
      top: `${adjustedTop}%`,
      placement
    };
  };

  const { left, top, placement } = getPopupPosition();

  // Calculate transform based on placement
  const getTransform = () => {
    switch (placement) {
      case "top":
        return "-translate-x-1/2 -translate-y-full";
      case "bottom":
        return "-translate-x-1/2 translate-y-4";
      case "left":
        return "-translate-x-full -translate-y-1/2";
      case "right":
        return "translate-x-4 -translate-y-1/2";
      default:
        return "-translate-x-1/2 -translate-y-full";
    }
  };

  // Calculate arrow position based on placement
  const getArrowPosition = () => {
    switch (placement) {
      case "top":
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 rotate-45";
      case "bottom":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 rotate-45";
      case "left":
        return "right-0 top-1/2 -translate-y-1/2 translate-x-1.5 rotate-45";
      case "right":
        return "left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 rotate-45";
      default:
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5 rotate-45";
    }
  };

  return (
    <div 
      className="absolute z-40 animate-scaleIn"
      style={{ left, top }}
    >
      <div 
        className={`bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl p-4 w-48
          shadow-2xl border border-green-400 relative ${getTransform()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full 
            flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors
            shadow-lg z-10"
        >
          ×
        </button>
        
        <div className="mb-2">
          <h3 className="text-sm font-bold">{location}</h3>
        </div>
        
        <p className="text-white/90 text-xs mb-3 leading-relaxed">
          {locationDescriptions[location] || "Discover this amazing destination in Sri Lanka."}
        </p>
        
        <button className="w-full bg-white text-green-700 font-semibold py-1.5 px-3 rounded-xl 
          hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 
          flex items-center justify-center gap-1 text-xs">
          <span>Explore</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
        
        {/* Arrow pointing to dot */}
        <div className={`absolute w-3 h-3 bg-green-600 ${getArrowPosition()}`}></div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label, count, isActive, onClick }) => (
  <div 
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300
      ${isActive ? 'bg-white shadow-lg border border-gray-200' : 'hover:bg-gray-50'}`}
    onClick={onClick}
  >
    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${color} shadow-md ${isActive ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}></div>
    <div className="flex-1">
      <span className="text-gray-800 font-semibold text-sm sm:text-base">{label}</span>
      <span className="text-gray-500 text-xs sm:text-sm ml-2">({count})</span>
    </div>
  </div>
);

export default function Section3() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const locations = {
    nationalParks: [
      { label: "YALA", position: { left: "71%", top: "84%" } },
      { label: "WILPATTU", position: { left: "25%", top: "38%" } }
    ],
    beaches: [
      { label: "Arugam Bay", position: { left: "48%", top: "25%" } },
      { label: "Mirissa", position: { left: "75%", top: "50%" } }
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
    { color: "bg-green-700", label: "National Parks", key: "nationalParks", count: locations.nationalParks.length },
    { color: "bg-amber-800", label: "Wildlife Sanctuaries", key: "wildlifeSanctuaries", count: locations.wildlifeSanctuaries.length },
    { color: "bg-blue-500", label: "Famous Beaches", key: "beaches", count: locations.beaches.length },
    { color: "bg-green-400", label: "Forest Reserves", key: "forestReserves", count: locations.forestReserves.length },
    { color: "bg-amber-500", label: "Camping Sites", key: "campingSites", count: locations.campingSites.length },
  ];

  const getFilteredLocations = () => {
    if (activeFilter === "all") {
      return Object.entries(locations).flatMap(([type, items]) =>
        items.map(loc => ({ ...loc, type }))
      );
    }
    return locations[activeFilter]?.map(loc => ({ ...loc, type: activeFilter })) || [];
  };

  const getDotType = (locationType) => {
    switch (locationType) {
      case "nationalParks":
        return "darkGreen";
      case "wildlifeSanctuaries":
        return "brown";
      case "forestReserves":
        return "lightGreen";
      case "campingSites":
        return "lightBrown";
      case "beaches":
        return "blue";
      default:
        return "blue";
    }
  };

  const handleDotClick = (locationLabel, position) => {
    setSelectedLocation(locationLabel);
    setSelectedPosition(position);
  };

  const handleClosePopup = () => {
    setSelectedLocation(null);
    setSelectedPosition(null);
  };

  // Close popup when clicking escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClosePopup();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Close popup when clicking anywhere on the map container
  const handleMapClick = () => {
    handleClosePopup();
  };

  return (
    <section
      className="w-full bg-gradient-to-br from-white to-gray-50 text-black 
      flex flex-col lg:flex-row items-center justify-center 
      py-12 sm:py-20 px-4 sm:px-6 lg:px-20 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
      
      {/* Left Side - Map */}
      <div className="relative w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0 select-none">
        <div className="relative w-full max-w-2xl flex justify-center">
          {/* Map Container with modern border */}
          <div 
            className="relative bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl sm:shadow-2xl border border-gray-200 w-full"
            onClick={handleMapClick}
          >
            {/* Map Container with fixed aspect ratio to maintain dot positions */}
            <div className="relative w-full" style={{ paddingBottom: '125%' }}> {/* 4:5 aspect ratio */}
              <img
                src={lankamap}
                alt="Sri Lanka Adventure Destinations Map"
                className="absolute inset-0 w-full h-full object-contain transform hover:scale-105 transition-transform duration-500"
              />

              {/* Animated Dots - Positions remain exactly the same across all devices */}
              <div className="absolute inset-0">
                {getFilteredLocations().map((loc, i) => (
                  <LocationDot
                    key={`${loc.type}-${i}`}
                    type={getDotType(loc.type)}
                    position={loc.position}
                    label={loc.label}
                    isHovered={hoveredLocation === loc.label}
                    onHover={setHoveredLocation}
                    onClick={handleDotClick}
                  />
                ))}
              </div>

              {/* Location Popup - Inside the map container */}
              <LocationPopup 
                location={selectedLocation} 
                position={selectedPosition}
                onClose={handleClosePopup}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="w-full lg:w-1/2 text-center lg:text-left lg:pl-8 xl:pl-16 space-y-6 sm:space-y-8 max-w-2xl">
        <div className="space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></span>
            Explore Sri Lanka
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
            Discover Your Next
            <span className="text-green-600 block">Adventure</span>
          </h2>
          
          <div className="w-20 sm:w-24 h-1 sm:h-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto lg:mx-0"></div>
        </div>

        <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
          Journey through Sri Lanka's diverse landscapes — from pristine national parks 
          and tranquil wildlife sanctuaries to breathtaking beaches and lush forest reserves. 
          Your perfect adventure awaits.
        </p>

        {/* Interactive Legend */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
              Destination Types
            </h3>
            <button 
              onClick={() => setActiveFilter("all")}
              className={`text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all ${
                activeFilter === "all" 
                  ? "bg-green-500 text-white" 
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Show All
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
          <button
            className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
            text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all duration-300 
            transform hover:scale-105 hover:shadow-xl sm:hover:shadow-2xl shadow-lg flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
          >
            <span>Explore All Destinations</span>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          
          <button
            className="group border-2 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700
            font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-xl transition-all duration-300 
            transform hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
          >
            <span>Download Map</span>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out forwards;
        }
      `}</style>
    </section>
  );
}