import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Import images from src/assets
import parkImage from "../../assets/national.avif";
import sanImage from "../../assets/hero3.jpg";
import beachImage from "../../assets/beach.avif";
import forestImage from "../../assets/forest.avif";
import campImage from "../../assets/camp.avif";
import jeepImage from "../../assets/peke.jpg";

export default function Section4() {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null);

  const handleBoxClick = (sectionId) => {
    // Navigate to destination page with hash fragment
    navigate(`/destination#${sectionId}`);

    // Wait for navigation and page render, then scroll to section
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 500);
  };

  const adventures = [
    {
      src: parkImage,
      title: "National Parks",
      sectionId: "national-parks",
      description: "Discover Sri Lanka's magnificent national parks, home to diverse wildlife including elephants, leopards, and hundreds of bird species."
    },
    {
      src: sanImage,
      title: "Sanctuaries",
      sectionId: "sanctuaries",
      description: "Explore peaceful wildlife sanctuaries that provide safe havens for endangered species in their natural habitats."
    },
    {
      src: beachImage,
      title: "Beaches",
      sectionId: "beaches",
      description: "Relax on pristine beaches with golden sands and crystal-clear waters. From popular destinations to hidden gems."
    },
    {
      src: forestImage,
      title: "Forest Reserves",
      sectionId: "forest-reserves",
      description: "Immerse yourself in lush forest reserves teeming with biodiversity. Discover rare flora and fauna in verdant landscapes."
    },
    {
      src: campImage,
      title: "Camp Sites",
      sectionId: "camping-sites",
      description: "Experience the great outdoors at carefully selected camping sites. Sleep under the stars and create unforgettable memories."
    },
    {
      src: jeepImage,
      title: "Pekoe Trail",
      sectionId: "Pekoe Trail.",
      description: "Embark on an epic journey along the Pekoe Trail through tea country and breathtaking mountain landscapes."
    },
  ];

  return (
    <section className="relative w-full bg-gradient-to-b from-gray-50 to-white py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-block">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Explore Our Adventures
            </h2>
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-green-600 to-green-400 rounded-full"></div>
          </div>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Discover extraordinary destinations and create memories that last a lifetime
          </p>
        </div>

        {/* Adventures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {adventures.map((item, index) => (
            <div
              key={index}
              className={`group relative h-[380px] sm:h-[420px] rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-500 ${activeCard === index ? 'ring-2 ring-emerald-500' : ''}`}
              onMouseEnter={() => setActiveCard(index)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => setActiveCard(index === activeCard ? null : index)}
            >
              {/* Full Background Image */}
              <div className="absolute inset-0">
                <img
                  src={item.src}
                  alt={item.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${activeCard === index ? 'scale-110' : 'group-hover:scale-110'}`}
                  loading="lazy"
                />
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${activeCard === index ? 'opacity-90' : 'opacity-80 group-hover:opacity-90'}`}></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full shadow-lg z-10">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Featured</span>
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 z-10">
                <div className={`transform transition-all duration-500 ${activeCard === index ? 'translate-y-0' : 'translate-y-8 group-hover:translate-y-0'}`}>
                  {/* Title */}
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-lg">
                    {item.title}
                  </h3>

                  {/* Hidden Content - Reveals on Hover or Click */}
                  <div className={`space-y-4 transition-all duration-500 delay-100 overflow-hidden ${activeCard === index ? 'opacity-100 max-h-60' : 'opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-60'}`}>
                    <p className="text-gray-200 text-sm sm:text-base leading-relaxed line-clamp-3">
                      {item.description}
                    </p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBoxClick(item.sectionId);
                      }}
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-5 rounded-xl transition-colors duration-300 shadow-lg text-sm"
                    >
                      <span>Explore Now</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-green-200/30 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl -z-10"></div>
    </section>
  );
}