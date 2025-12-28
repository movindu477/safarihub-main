import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Filter, 
  MapPin, 
  ChevronDown,
  Search,
  X,
  AlertCircle
} from "lucide-react";

// Import background images
import yalaBackground from "../../assets/yala.avif";
import wilpattuBackground from "../../assets/wilpattu.avif";
import mirissaBackground from "../../assets/mirissa.avif";
import unaBackground from "../../assets/una.avif";
import hortBackground from "../../assets/hort.avif";
import knucklesBackground from "../../assets/knuck.avif";
import lunuBackground from "../../assets/lunu.jpg";
import kumanaBackground from "../../assets/kumana.jpg";
import sinBackground from "../../assets/sin.avif";
import knuckfoBackground from "../../assets/knuckfo.jpg";

export default function Destination2() {
  const navigate = useNavigate();

  // Destination ID mapping function
  const getDestinationId = (name) => {
    const idMap = {
      'Yala National Park': 'yala-national-park',
      'Wilpattu National Park': 'wilpattu-national-park',
      'Mirissa Beach': 'mirissa-beach',
      'Unawatuna Beach': 'unawatuna-beach',
      'Horton Plains': 'horton-plains',
      'Knuckles Mountain Range': 'knuckles-mountain-range',
      'Lunugamvehera': 'lunugamvehera',
      'Kumana Wildlife': 'kumana-wildlife',
      'Sinharaja Forest Reserve': 'sinharaja-forest-reserve',
      'Knuckles Forest Reserve': 'knuckles-forest-reserve'
    };
    return idMap[name] || name.toLowerCase().replace(/\s+/g, '-');
  };

  // All destination names for search
  const allDestinations = [
    "Yala National Park",
    "Wilpattu National Park",
    "Mirissa Beach",
    "Unawatuna Beach",
    "Horton Plains",
    "Knuckles Mountain Range",
    "Lunugamvehera",
    "Kumana Wildlife",
    "Sinharaja Forest Reserve",
    "Knuckles Forest Reserve"
  ];

  // Map destination names to their section IDs
  const destinationToSectionMap = {
    "Yala National Park": "national-parks",
    "Wilpattu National Park": "national-parks",
    "Mirissa Beach": "beaches",
    "Unawatuna Beach": "beaches",
    "Horton Plains": "camping-sites",
    "Knuckles Mountain Range": "camping-sites",
    "Lunugamvehera": "sanctuaries",
    "Kumana Wildlife": "sanctuaries",
    "Sinharaja Forest Reserve": "forest-reserves",
    "Knuckles Forest Reserve": "forest-reserves"
  };

  // Category to section ID mapping
  const categoryToSectionMap = {
    "National Parks": "national-parks",
    "Wildlife Sanctuaries": "sanctuaries",
    "Famous Beaches": "beaches",
    "Forest Reserves": "forest-reserves",
    "Camping Sites": "camping-sites"
  };

  const [filters, setFilters] = useState({
    location: ""
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Filter options - only 5 main categories
  const filterOptions = {
    location: [
      "National Parks",
      "Wildlife Sanctuaries",
      "Famous Beaches",
      "Forest Reserves",
      "Camping Sites"
    ]
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));

    // Scroll to the selected section
    if (value && categoryToSectionMap[value]) {
      setTimeout(() => {
        scrollToSection(categoryToSectionMap[value]);
      }, 100);
    }
  };

  const clearFilters = () => {
    setFilters({
      location: ""
    });
    setSearchQuery("");
    setSearchSuggestions([]);
    setSearchError("");
    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Offset for fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchError("");

    if (query.trim() === "") {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Case-insensitive search
    const filtered = allDestinations.filter(dest =>
      dest.toLowerCase().includes(query.toLowerCase())
    );

    setSearchSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // Handle search suggestion click
  const handleSuggestionClick = (destination) => {
    setSearchQuery(destination);
    setShowSuggestions(false);
    setSearchError("");

    const sectionId = destinationToSectionMap[destination];
    if (sectionId) {
      setTimeout(() => {
        scrollToSection(sectionId);
      }, 100);
    }
  };

  // Handle search submit (Enter key or button click)
  const handleSearchSubmit = () => {
    if (searchQuery.trim() === "") {
      return;
    }

    // Find exact match (case-insensitive)
    const matched = allDestinations.find(dest =>
      dest.toLowerCase() === searchQuery.toLowerCase()
    );

    if (matched) {
      handleSuggestionClick(matched);
    } else {
      // Find partial matches
      const partialMatches = allDestinations.filter(dest =>
        dest.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (partialMatches.length > 0) {
        // Use first partial match
        handleSuggestionClick(partialMatches[0]);
      } else {
        // No match found - show error
        setSearchError("Destination not found. Coming soon!");
        setShowSuggestions(false);
      }
    }
  };

  // Handle Enter key in search input
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determine which sections to show based on filter
  const shouldShowSection = (sectionId) => {
    if (!filters.location) {
      return true; // Show all if no filter
    }
    return categoryToSectionMap[filters.location] === sectionId;
  };

  const FilterSection = ({ title, icon: Icon, options, filterKey }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-green-600" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={filterKey}
              checked={filters[filterKey] === option}
              onChange={() => handleFilterChange(filterKey, option)}
              className="text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );

  // Reusable Section Component
  const DestinationSection = ({ title, description, items, sectionId }) => {
    if (!shouldShowSection(sectionId)) {
      return null;
    }

    return (
    <div id={sectionId} className="mb-16 scroll-mt-24">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {items.map((item, index) => (
            <div
              key={index}
              onClick={() => navigate(`/destination/${getDestinationId(item.name)}`)}
              className="relative rounded-2xl overflow-hidden shadow-2xl group cursor-pointer"
            >
            <div 
              className="h-96 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${item.background})` }}
            >
              <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/30"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h3 className="text-3xl md:text-4xl font-black mb-4">{item.name}</h3>
                <p className="text-lg mb-6 opacity-90 max-w-md">
                  {item.description}
                </p>
                <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/destination/${getDestinationId(item.name)}`);
                    }}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                    Explore {item.name.split(' ')[0]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  };

  return (
    <section id="destinations-section" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Main Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Find Your Perfect{" "}
            <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              Safari Adventure
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover amazing wildlife experiences with our comprehensive filtering system. 
            Find exactly what you're looking for in Sri Lanka's most beautiful destinations.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search Input with Suggestions */}
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />

              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-800">{suggestion}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Search Error Message */}
              {searchError && (
                <div className="absolute z-50 w-full mt-1 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{searchError}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Filter className="h-5 w-5" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear Filters */}
            {filters.location && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-3 transition-colors"
              >
                <X className="h-5 w-5" />
                Clear All
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Location / Region Filter - Only 5 categories */}
                <FilterSection 
                  title="Location / Region" 
                  icon={MapPin} 
                  options={filterOptions.location} 
                  filterKey="location" 
                />
              </div>
            </div>
          )}
        </div>

        {/* National Parks Section */}
        <DestinationSection
          sectionId="national-parks"
          title="National Parks"
          description="Explore Sri Lanka's most famous national parks and discover unique wildlife experiences"
          items={[
            {
              name: "Yala National Park",
              description: "Home to the highest density of leopards in the world. Experience thrilling jeep safaris and witness diverse wildlife in their natural habitat.",
              background: yalaBackground
            },
            {
              name: "Wilpattu National Park",
              description: "Sri Lanka's largest national park known for its natural lakes and rich biodiversity. Perfect for spotting leopards, sloth bears, and migratory birds.",
              background: wilpattuBackground
            }
          ]}
        />

        {/* Famous Beaches Section */}
        <DestinationSection
          sectionId="beaches"
          title="Famous Beaches"
          description="Discover Sri Lanka's stunning coastline with pristine beaches and crystal-clear waters"
          items={[
            {
              name: "Mirissa Beach",
              description: "Famous for its golden sands, whale watching opportunities, and vibrant nightlife. Perfect for surfing, swimming, and relaxing by the Indian Ocean.",
              background: mirissaBackground
            },
            {
              name: "Unawatuna Beach",
              description: "A beautiful crescent-shaped bay with calm turquoise waters. Ideal for snorkeling, diving, and enjoying spectacular sunsets in a tropical paradise.",
              background: unaBackground
            }
          ]}
        />

        {/* Camping Sites Section */}
        <DestinationSection
          sectionId="camping-sites"
          title="Camping Sites"
          description="Experience the great outdoors with amazing camping sites amidst nature's beauty"
          items={[
            {
              name: "Horton Plains",
              description: "A beautiful highland plateau offering breathtaking views and unique camping experiences. Perfect for hiking and witnessing World's End viewpoint.",
              background: hortBackground
            },
            {
              name: "Knuckles Mountain Range",
              description: "A UNESCO World Heritage site with diverse ecosystems. Ideal for adventure camping, trekking, and exploring pristine mountain landscapes.",
              background: knucklesBackground
            }
          ]}
        />

        {/* Wildlife Sanctuaries Section */}
        <DestinationSection
          sectionId="sanctuaries"
          title="Wildlife Sanctuaries"
          description="Protecting Sri Lanka's diverse wildlife in their natural habitats"
          items={[
            {
              name: "Lunugamvehera",
              description: "An important elephant corridor connecting Yala and Uda Walawe national parks. Home to elephants, deer, and various bird species in a dry zone habitat.",
              background: lunuBackground
            },
            {
              name: "Kumana Wildlife",
              description: "Famous for its bird sanctuary and mangrove swamps. A paradise for birdwatchers with over 200 species including migratory birds during nesting season.",
              background: kumanaBackground
            }
          ]}
        />

        {/* Forest Reserves Section */}
        <DestinationSection
          sectionId="forest-reserves"
          title="Forest Reserves"
          description="Explore Sri Lanka's rich forest ecosystems and biodiversity hotspots"
          items={[
            {
              name: "Sinharaja Forest Reserve",
              description: "A UNESCO World Heritage site and biodiversity hotspot. Home to numerous endemic species, rare birds, and lush tropical rainforest vegetation.",
              background: sinBackground
            },
            {
              name: "Knuckles Forest Reserve",
              description: "Part of the Knuckles Mountain Range with montane forests, waterfalls, and diverse flora and fauna. Perfect for eco-tourism and nature photography.",
              background: knuckfoBackground
            }
          ]}
        />

        {/* Active Filters Display */}
        {filters.location && (
          <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-800 mb-3">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                {filters.location}
                <button onClick={() => handleFilterChange("location", "")} className="text-green-600 hover:text-green-800 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}