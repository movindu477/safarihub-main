import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Filter,
  MapPin,
  ChevronDown,
  Search,
  X,
  AlertCircle,
  Compass
} from "lucide-react";

// Import background images
import yalaBackground from "../../assets/yalaback.jpg";
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
  const location = useLocation();

  // Handle scroll to section if returning from details page
  useEffect(() => {
    if (location.state && location.state.scrollTo) {
      const elementId = location.state.scrollTo;
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          const offset = 100; // Offset for header/sticky elements
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 500); // Slight delay to ensure rendering
    }
  }, [location.state]);

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

  // Map destinations to their provinces
  const destinationToProvinceMap = {
    "Yala National Park": "Southern Province",
    "Wilpattu National Park": "North Western Province",
    "Mirissa Beach": "Southern Province",
    "Unawatuna Beach": "Southern Province",
    "Horton Plains": "Central Province",
    "Knuckles Mountain Range": "Central Province",
    "Lunugamvehera": "Southern Province",
    "Kumana Wildlife": "Eastern Province",
    "Sinharaja Forest Reserve": "Sabaragamuwa Province",
    "Knuckles Forest Reserve": "Central Province"
  };

  // Category to section ID mapping
  const categoryToSectionMap = {
    "National Parks": "national-parks",
    "Wildlife Sanctuaries": "sanctuaries",
    "Famous Beaches": "beaches",
    "Forest Reserves": "forest-reserves",
    "Camping Sites": "camping-sites",
    "Wetlands": "wetlands"
  };

  const [filters, setFilters] = useState({
    location: "",
    province: ""
  });

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Filter options - categories and provinces
  const filterOptions = {
    location: [
      "National Parks",
      "Wildlife Sanctuaries",
      "Famous Beaches",
      "Forest Reserves",
      "Camping Sites",
      "Wetlands"
    ],
    province: [
      "Central Province",
      "Eastern Province",
      "North Central Province",
      "Northern Province",
      "North Western Province",
      "Sabaragamuwa Province",
      "Southern Province",
      "Uva Province",
      "Western Province"
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
      location: "",
      province: ""
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
    // If no filters are active, show all
    if (!filters.location && !filters.province) {
      return true;
    }

    // Check category filter
    if (filters.location && categoryToSectionMap[filters.location] !== sectionId) {
      return false;
    }

    // Check province filter - get all destinations in this section
    if (filters.province) {
      const sectionDestinations = Object.keys(destinationToSectionMap).filter(
        dest => destinationToSectionMap[dest] === sectionId
      );

      // Check if any destination in this section matches the selected province
      const hasMatchingProvince = sectionDestinations.some(
        dest => destinationToProvinceMap[dest] === filters.province
      );

      if (!hasMatchingProvince) {
        return false;
      }
    }

    return true;
  };

  // Determine if a specific destination should be shown
  const shouldShowDestination = (destinationName) => {
    // If no filters are active, show all
    if (!filters.location && !filters.province) {
      return true;
    }

    // Check category filter
    if (filters.location) {
      const sectionId = destinationToSectionMap[destinationName];
      if (categoryToSectionMap[filters.location] !== sectionId) {
        return false;
      }
    }

    // Check province filter
    if (filters.province) {
      if (destinationToProvinceMap[destinationName] !== filters.province) {
        return false;
      }
    }

    return true;
  };

  const FilterSection = ({ title, icon: Icon, options, filterKey }) => (
    <div className="bg-white/50 backdrop-blur-md rounded-xl p-5 border border-white/20 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-emerald-700">
        <Icon className="h-5 w-5" />
        <h3 className="font-bold text-gray-800 tracking-wide">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="cursor-pointer group relative">
            <input
              type="radio"
              name={filterKey}
              checked={filters[filterKey] === option}
              onChange={() => handleFilterChange(filterKey, option)}
              className="peer sr-only"
            />
            <span className="inline-block px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border border-transparent 
              bg-white text-gray-600 shadow-sm
              peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-emerald-500/20
              group-hover:bg-emerald-50">
              {option}
            </span>
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
      <div id={sectionId} className="mb-24 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">
            {title}
          </h2>
          <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full mb-6"></div>
          <p className="text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 md:gap-12">
          {items.filter(item => shouldShowDestination(item.name)).map((item, index) => (
            <div
              key={index}
              id={getDestinationId(item.name)}
              onClick={() => navigate(`/destination/${getDestinationId(item.name)}`)}
              className="group relative h-[400px] md:h-[450px] rounded-3xl overflow-hidden cursor-pointer shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-900/10"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                style={{ backgroundImage: `url(${item.background})` }}
              >
                {/* Overlay with gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90"></div>
              </div>

              {/* Content Card */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 transform translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <span className="text-xs font-semibold text-white tracking-wider uppercase">
                      {destinationToProvinceMap[item.name]}
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-md">
                  {item.name}
                </h3>

                <p className="text-gray-200 text-sm md:text-base mb-6 line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  {item.description}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/destination/${getDestinationId(item.name)}`);
                    }}
                    className="flex-1 bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-300 hover:bg-emerald-50 active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    Explore Now
                    <Compass className="w-4 h-4 ml-1" />
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
    <section id="destinations-section" className="py-20 bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements blur */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-300 rounded-full blur-[120px]"></div>
        <div className="absolute top-[30%] -right-[10%] w-[30%] h-[30%] bg-blue-300 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-teal-200 rounded-full blur-[100px]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Main Title Section */}
        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-emerald-100/50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4">
            Destinations
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Find Your Perfect{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Escape
            </span>
          </h2>
          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-light">
            Discover amazing wildlife experiences with our comprehensive filtering system.
            Find exactly what you're looking for in Sri Lanka's most beautiful destinations.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="sticky top-24 z-40 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 md:p-6 mb-16 transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search Input with Suggestions */}
            <div className="flex-1 relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search destinations (e.g. Yala, Mirissa...)"
                className="block w-full pl-11 pr-4 py-4 bg-slate-100/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-white transition-all duration-300 text-base shadow-inner"
              />

              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2"
                >
                  <div className="p-2">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 transition-colors group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-full text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-700 group-hover:text-emerald-900">{suggestion}</span>
                        </div>
                        <span className="text-xs text-slate-400 group-hover:text-emerald-600 font-medium">Jump to section</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Error Message */}
              {searchError && (
                <div className="absolute z-50 w-full mt-2 bg-red-50 border border-red-100 rounded-xl shadow-lg p-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>{searchError}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all duration-300 w-full lg:w-auto justify-center shadow-lg shadow-emerald-900/5 active:scale-95 ${showFilters
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-emerald-200'
                }`}
            >
              <Filter className={`h-5 w-5 ${showFilters ? 'animate-pulse' : ''}`} />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear Filters */}
            {(filters.location || filters.province || searchQuery) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-rose-500 hover:text-rose-700 px-4 py-3 text-sm font-bold transition-colors w-full lg:w-auto justify-center"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          <div className={`grid transition-all duration-500 ease-in-out overflow-hidden ${showFilters ? 'grid-rows-[1fr] opacity-100 mt-6 pt-6 border-t border-slate-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location Filter */}
                <FilterSection
                  title="By Category"
                  icon={Compass}
                  options={filterOptions.location}
                  filterKey="location"
                />
                {/* Province Filter */}
                <FilterSection
                  title="By Province"
                  icon={MapPin}
                  options={filterOptions.province}
                  filterKey="province"
                />
              </div>
            </div>
          </div>
        </div>

        {/* National Parks Section */}
        <DestinationSection
          sectionId="national-parks"
          title="National Parks"
          description="Explore Sri Lanka's most famous national parks, where leopards roam freely and elephants gather."
          items={[
            {
              name: "Yala National Park",
              description: "Home to the highest density of leopards in the world. Experience thrilling jeep safaris near the ocean.",
              background: yalaBackground
            },
            {
              name: "Wilpattu National Park",
              description: "Sri Lanka's largest national park, famous for its natural lakes (villus) and serene, uncrowded wilderness.",
              background: wilpattuBackground
            }
          ]}
        />

        {/* Famous Beaches Section */}
        <DestinationSection
          sectionId="beaches"
          title="Tropical Beaches"
          description="Golden sands, surfing waves, and whale watching in the deep blue Indian Ocean."
          items={[
            {
              name: "Mirissa Beach",
              description: "The whale watching capital. Vibrant nightlife, palm-fringed bays, and perfect surfing waves await.",
              background: mirissaBackground
            },
            {
              name: "Unawatuna Beach",
              description: "A family-friendly bay with calm turquoise waters, coral reefs, and legendary sunsets.",
              background: unaBackground
            }
          ]}
        />

        {/* Camping Sites Section */}
        <DestinationSection
          sectionId="camping-sites"
          title="Camping & Trekking"
          description="Experience the cool highlands and misty mountains for an unforgettable outdoor adventure."
          items={[
            {
              name: "Horton Plains",
              description: "Trek to World's End, a sheer cliff with a 4,000ft drop, through misty grasslands and cloud forests.",
              background: hortBackground
            },
            {
              name: "Knuckles Mountain Range",
              description: "A UNESCO World Heritage site offering rugged peaks, hidden waterfalls, and pure isolation.",
              background: knucklesBackground
            }
          ]}
        />

        {/* Wildlife Sanctuaries Section */}
        <DestinationSection
          sectionId="sanctuaries"
          title="Wildlife Sanctuaries"
          description="Protected havens where nature thrives, connecting major parks and ecosystems."
          items={[
            {
              name: "Lunugamvehera",
              description: " Vital elephant corridor linking Yala and Udawalawe. A birdwatcher's paradise in the dry zone.",
              background: lunuBackground
            },
            {
              name: "Kumana Wildlife",
              description: "Known as Yala East, famous for its 200-hectare mangrove swamp and nesting migratory birds.",
              background: kumanaBackground
            }
          ]}
        />

        {/* Forest Reserves Section */}
        <DestinationSection
          sectionId="forest-reserves"
          title="Rainforest Reserves"
          description="Step into the lush, green heart of the island, teeming with endemic species."
          items={[
            {
              name: "Sinharaja Forest Reserve",
              description: "A primary tropical rainforest and biodiversity hotspot. The lungs of Sri Lanka.",
              background: sinBackground
            },
            {
              name: "Knuckles Forest Reserve",
              description: "Misty cloud forests and pygmy forests unique to this isolated mountain range.",
              background: knuckfoBackground
            }
          ]}
        />

        {/* Active Filters Display Chips */}
        {(filters.location || filters.province) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-emerald-100 z-50 animate-in slide-in-from-bottom-5 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">Filtered by:</span>
            <div className="flex gap-2">
              {filters.location && (
                <button
                  onClick={() => handleFilterChange("location", "")}
                  className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 transition-colors"
                >
                  {filters.location} <X className="h-3 w-3" />
                </button>
              )}
              {filters.province && (
                <button
                  onClick={() => handleFilterChange("province", "")}
                  className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 transition-colors"
                >
                  {filters.province} <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button onClick={clearFilters} className="text-xs font-bold text-rose-500 hover:text-rose-700">Clear All</button>
          </div>
        )}
      </div>
    </section>
  );
}