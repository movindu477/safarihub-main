import React from "react";

// Import map image from src/assets
import mapImage from "../../assets/map-desktop-v2.png";

export default function Section3() {
  // Wildlife locations with manual positioning (top, left, right, bottom in %)
  const locations = [
    { name: "Mannar", top: "24%", left: "23%" },
    { name: "Pigeon Island", top: "32%", right: "31%" },
    { name: "Bar Reef", top: "41%", left: "16%" },
    { name: "Wilpattu NP", top: "40%", left: "32%" },
    { name: "Kaudulla NP", top: "43%", left: "48%" },
    { name: "Minneriya NP", top: "49%", left: "48%" },
    { name: "Wasgamuwa NP", top: "48%", right: "38%" },
    { name: "Anawilunawa Bird Sanctuary", top: "51%", left: "27%" },
    { name: "Kalawewa NP", top: "48%", left: "35%" },
    { name: "Knuckles Forest Reserve", top: "54%", left: "54%" },
    { name: "Galoya", top: "63%", right: "25%" },
    { name: "Kitulgala Forest Reserve", top: "68%", left: "40%" },
    { name: "Kumana NP", top: "71%", right: "18%" },
    { name: "Talangama Wetland", top: "70%", left: "26%" },
    { name: "Sinharaja", top: "73%", left: "45%" },
    { name: "Horton Plains", top: "73%", left: "58%" },
    { name: "Lunugamvehera NP", top: "75%", right: "29%" },
    { name: "Udawalawe NP", top: "80%", left: "54%" },
    // { name: "Yala NP", top: "80%", right: "12%" },
    { name: "Kanneliya Reserve", top: "83%", left: "40%" },
    { name: "Bundala NP", top: "83%", right: "32%" },
    { name: "Kalametiya Bird Sanctuary", top: "90%", left: "56%" },
  ];

  return (
    <section className="w-full bg-white text-black py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12 xl:px-16">
      {/* Title Section - Centered at the top */}
      <div className="text-center mb-8 sm:mb-12 lg:mb-16">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
          Sri Lanka Asia's Premier Wildlife Destination
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

          {/* Right Column - Map Image with Location Markers */}
          <div className="w-full lg:w-1/2 flex justify-center items-center">
            <div className="relative w-full max-w-full">
              {/* Map Image */}
              <img
                src={mapImage}
                alt="Sri Lanka Wildlife and Biodiversity Map"
                className="w-full h-auto object-contain rounded-lg shadow-lg"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />

              {/* Location Markers Overlay */}
              <div className="absolute inset-0">
                {locations.map((location, index) => {
                  // Calculate if location is near edges to adjust label position
                  const topValue = parseFloat(location.top);
                  const leftValue = location.left ? parseFloat(location.left) : null;
                  const rightValue = location.right ? parseFloat(location.right) : null;

                  // Determine label position based on location (Auto logic)
                  const isNearTop = topValue < 15;
                  const isNearBottom = topValue > 85;
                  const isNearLeft = leftValue !== null && leftValue < 15;
                  const isNearRight = rightValue !== null && rightValue < 15;

                  // Custom label positioning style
                  const labelStyle = {};

                  // Vertical position
                  if (location.labelTop) labelStyle.top = location.labelTop;
                  else if (location.labelBottom) labelStyle.bottom = location.labelBottom;
                  else if (isNearBottom) labelStyle.bottom = '1rem'; // Default above if near bottom
                  else labelStyle.top = '1rem'; // Default below

                  // Horizontal position
                  if (location.labelLeft) labelStyle.left = location.labelLeft;
                  else if (location.labelRight) labelStyle.right = location.labelRight;
                  else if (isNearLeft) labelStyle.left = '0';
                  else if (isNearRight) labelStyle.right = '0';
                  else {
                    labelStyle.left = '50%';
                    labelStyle.transform = 'translateX(-50%)';
                  }

                  return (
                    <div
                      key={index}
                      className="absolute group cursor-pointer z-10 hover:z-50"
                      style={{
                        top: location.top,
                        left: location.left,
                        right: location.right,
                        bottom: location.bottom,
                      }}
                    >
                      {/* Location Pin/Dot with Pulse Effect */}
                      <div className="relative flex items-center justify-center w-2 h-2 sm:w-3 sm:h-3">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                        <span className="relative inline-flex rounded-full h-full w-full bg-emerald-600 border border-white shadow-sm group-hover:scale-125 transition-transform duration-200"></span>
                      </div>

                      {/* Location Name Label */}
                      <div
                        className="absolute whitespace-nowrap"
                        style={labelStyle}
                      >
                        <span className="bg-white/90 backdrop-blur-md px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[6px] sm:text-[8px] font-bold text-gray-900 shadow-md border border-gray-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all duration-200 transform group-hover:scale-105">
                          {location.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
