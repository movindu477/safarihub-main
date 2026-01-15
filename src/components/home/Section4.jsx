import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Import images from src/assets
import parkImage from "../../assets/296811179_1216698719063054_6756487280100765789_n.jpg";
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

  const videos = [
    {
      src: parkImage,
      title: "National Parks",
      sectionId: "national-parks",
      description: "Discover Sri Lanka's magnificent national parks, home to diverse wildlife including elephants, leopards, and hundreds of bird species. Experience the raw beauty of nature in protected wilderness areas."
    },
    {
      src: sanImage,
      title: "Sanctuaries",
      sectionId: "sanctuaries",
      description: "Explore peaceful wildlife sanctuaries that provide safe havens for endangered species. These protected areas offer unique opportunities to observe wildlife in their natural habitats."
    },
    {
      src: beachImage,
      title: "Beaches",
      sectionId: "beaches",
      description: "Relax on pristine beaches with golden sands and crystal-clear waters. From popular coastal destinations to hidden gems, discover the perfect spot for your beach getaway."
    },
    {
      src: forestImage,
      title: "Forest Reserves",
      sectionId: "forest-reserves",
      description: "Immerse yourself in lush forest reserves teeming with biodiversity. Walk through ancient forests, discover rare flora and fauna, and connect with nature in these verdant landscapes."
    },
    {
      src: campImage,
      title: "Camp Sites",
      sectionId: "camping-sites",
      description: "Experience the great outdoors at carefully selected camping sites. Sleep under the stars, wake up to nature's sounds, and create unforgettable memories in the wilderness."
    },
    {
      src: jeepImage,
      title: "Pekoe Trail",
      sectionId: "Pekoe Trail.",
      description: "Embark on an epic journey along the Pekoe Trail, a scenic route through tea country and mountain landscapes. Experience the rich culture and breathtaking views of Sri Lanka's hill country."
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
            className="w-full max-w-[400px] sm:max-w-[450px] lg:max-w-[500px]"
          >
            {/* Title Above Image */}
            <h3 className="text-xl sm:text-2xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">
              {item.title}
            </h3>

            {/* Image Card */}
            <div
              onClick={(e) => {
                // On mobile, toggle active state when clicking the card background
                const isMobile = window.innerWidth < 768;
                if (isMobile && (e.target === e.currentTarget || e.target.tagName === 'IMG' || e.target.classList.contains('card-overlay'))) {
                  setActiveCard(activeCard === index ? null : index);
                } else if (!isMobile) {
                  // On desktop, navigate on click
                  handleBoxClick(item.sectionId);
                }
              }}
              className="group relative w-full h-[250px] sm:h-[280px] lg:h-[300px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl lg:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 cursor-pointer touch-manipulation"
            >
              {/* Image Background */}
              <img
                src={item.src}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                loading="lazy"
              />

              {/* Dark Overlay - Appears on hover (desktop) or tap (mobile) */}
              <div className={`absolute inset-0 transition-all duration-500 card-overlay ${
                activeCard === index 
                  ? 'bg-black/60' 
                  : 'bg-black/0 group-hover:bg-black/60'
              }`}></div>

              {/* Hover Content - Description and Button */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center transform transition-all duration-500 ease-in-out px-4 sm:px-6 pointer-events-none ${
                activeCard === index 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-6 sm:translate-y-8 group-hover:opacity-100 group-hover:translate-y-0'
              }`}>
                {/* Description Paragraph */}
                <p className="text-white text-sm sm:text-base lg:text-lg text-center mb-4 sm:mb-6 leading-relaxed">
                  {item.description}
                </p>
                {/* Explore Now Button */}
                <button
                  className="bg-green-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 transform hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg text-sm sm:text-base cursor-pointer touch-manipulation pointer-events-auto z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBoxClick(item.sectionId);
                    setActiveCard(null); // Close after navigation
                  }}
                >
                  Explore Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}