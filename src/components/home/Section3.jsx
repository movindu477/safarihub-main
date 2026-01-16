import React from "react";

// Import map image from src/assets
import mapImage from "../../assets/map-desktop-v2.png";

export default function Section3() {
  return (
    <section className="w-full bg-white text-black py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 xl:px-16">
      {/* Title Section - Centered at the top */}
      <div className="text-center mb-8 sm:mb-12 lg:mb-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
          Sri Lanka – Asia's Premier Wildlife Destination
        </h2>
      </div>

      {/* Two-Column Layout: Text on Left, Map on Right */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 xl:gap-16 items-center lg:items-start">
          {/* Left Column - Text Content */}
          <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8">
            <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
              Sri Lanka stands proudly as one of the world's ten recognized biodiversity hotspots, making it a true treasure for nature lovers. Often described as Asia's premier wildlife destination, the island offers an extraordinary combination of landscapes and species diversity—ranking just behind Africa in terms of variety and spectacle. What makes the Wildlife and Bio Diversity of Sri Lanka so special is the incredible concentration of ecosystems packed into such a small island. Within a few hours' drive, travelers can move from misty cloud forests to lush rainforests, arid dry-zone savannahs, vast wetlands, and even vibrant coral-rich marine habitats.
            </p>
            
            <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
              The Wildlife and Bio Diversity of Sri Lanka are showcased through the island's iconic species. Majestic Asian elephants roam freely in herds across national parks, while leopards stealthily patrol the jungles of Yala and Wilpattu. Offshore, the surrounding waters host giants of the ocean such as blue whales and sperm whales, alongside playful pods of dolphins. Bird enthusiasts will also be amazed by the wealth of resident and migratory species, many of which are endemic to the island, making Sri Lanka a paradise for ornithologists and nature photographers alike.
            </p>
          </div>

          {/* Right Column - Map Image */}
          <div className="w-full lg:w-1/2 flex justify-center items-center">
            <div className="relative w-full max-w-full">
              <img
                src={mapImage}
                alt="Sri Lanka Wildlife and Biodiversity Map"
                className="w-full h-auto object-contain rounded-lg shadow-lg"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
