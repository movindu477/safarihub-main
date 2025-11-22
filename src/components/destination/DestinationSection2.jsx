import React, { useState } from "react";
import { 
  Filter, 
  MapPin, 
  Camera, 
  Clock, 
  DollarSign, 
  Star, 
  Users, 
  Car,
  Calendar,
  ChevronDown,
  Search,
  X
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
  const [filters, setFilters] = useState({
    location: "",
    safariType: "",
    wildlife: "",
    duration: "",
    priceRange: "",
    season: "",
    difficulty: "",
    vehicleType: "",
    groupSize: "",
    rating: "",
    services: []
  });

  const [showFilters, setShowFilters] = useState(false);

  // Filter options data
  const filterOptions = {
    location: [
      "Yala National Park",
      "Udawalawe National Park", 
      "Wilpattu National Park",
      "Minneriya National Park",
      "Kumana National Park",
      "Horton Plains",
      "Sinharaja Forest",
      "Bundala National Park"
    ],
    safariType: [
      "Jeep Safari",
      "Night Safari",
      "Bird Watching Safari", 
      "Photography Safari",
      "Private / Luxury Safari",
      "Walking Safari"
    ],
    wildlife: [
      "Leopard Spotting",
      "Elephants",
      "Birds",
      "Crocodiles", 
      "Bears",
      "Rare Species",
      "Deer",
      "Wild Boar"
    ],
    duration: [
      "2-3 hours",
      "Half day (4-5 hours)",
      "Full day (8+ hours)", 
      "Multi-day packages"
    ],
    priceRange: [
      "Budget (Under $50)",
      "Standard ($50 - $100)",
      "Premium ($100 - $200)",
      "Luxury ($200+)"
    ],
    season: [
      "Morning Safari",
      "Evening Safari", 
      "Dry Season (Best)",
      "Wet Season",
      "Year Round"
    ],
    difficulty: [
      "Easy / Beginner",
      "Medium",
      "Hard terrain",
      "Wheelchair friendly"
    ],
    vehicleType: [
      "Standard Jeep",
      "Luxury Jeep", 
      "Open-roof Jeep",
      "Private Jeep",
      "4x4 Modified Jeep"
    ],
    groupSize: [
      "Solo",
      "Couple", 
      "Family (2-4)",
      "Large Group (5+)"
    ],
    rating: [
      "5 stars",
      "4 stars & above", 
      "3 stars & above",
      "Most popular",
      "Newly added"
    ]
  };

  const additionalServices = [
    "Hotel pickup & drop",
    "Food included",
    "Guide included",
    "Photography guide", 
    "Camping included",
    "Insurance",
    "Park fees included"
  ];

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleServiceToggle = (service) => {
    setFilters(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      safariType: "",
      wildlife: "",
      duration: "",
      priceRange: "",
      season: "",
      difficulty: "",
      vehicleType: "",
      groupSize: "",
      rating: "",
      services: []
    });
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
  const DestinationSection = ({ title, description, items }) => (
    <div className="mb-16">
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
          <div key={index} className="relative rounded-2xl overflow-hidden shadow-2xl group">
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
                <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105">
                  Explore All
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-gray-50">
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
            Find exactly what you're looking for in Sri Lanka's most beautiful national parks.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search destinations, wildlife, or experiences..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
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
            {(filters.location || filters.safariType || filters.services.length > 0) && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Main Filters */}
                <FilterSection 
                  title="Location / Region" 
                  icon={MapPin} 
                  options={filterOptions.location} 
                  filterKey="location" 
                />
                
                <FilterSection 
                  title="Safari Type" 
                  icon={Camera} 
                  options={filterOptions.safariType} 
                  filterKey="safariType" 
                />
                
                <FilterSection 
                  title="Wildlife Category" 
                  icon={Star} 
                  options={filterOptions.wildlife} 
                  filterKey="wildlife" 
                />
                
                <FilterSection 
                  title="Duration" 
                  icon={Clock} 
                  options={filterOptions.duration} 
                  filterKey="duration" 
                />

                <FilterSection 
                  title="Price Range" 
                  icon={DollarSign} 
                  options={filterOptions.priceRange} 
                  filterKey="priceRange" 
                />
                
                <FilterSection 
                  title="Best Time / Season" 
                  icon={Calendar} 
                  options={filterOptions.season} 
                  filterKey="season" 
                />
                
                <FilterSection 
                  title="Difficulty" 
                  icon={Users} 
                  options={filterOptions.difficulty} 
                  filterKey="difficulty" 
                />
                
                <FilterSection 
                  title="Vehicle Type" 
                  icon={Car} 
                  options={filterOptions.vehicleType} 
                  filterKey="vehicleType" 
                />

                {/* Group Size */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">Group Size</h3>
                  </div>
                  <div className="space-y-2">
                    {filterOptions.groupSize.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="groupSize"
                          checked={filters.groupSize === option}
                          onChange={() => handleFilterChange("groupSize", option)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Ratings */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">Ratings & Reviews</h3>
                  </div>
                  <div className="space-y-2">
                    {filterOptions.rating.map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          checked={filters.rating === option}
                          onChange={() => handleFilterChange("rating", option)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Services */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-800">Additional Services</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {additionalServices.map((service) => (
                      <label key={service} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.services.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="text-green-600 focus:ring-green-500 rounded"
                        />
                        <span className="text-sm text-gray-700">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* National Parks Section */}
        <DestinationSection
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
        {(filters.location || filters.safariType || filters.services.length > 0) && (
          <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border">
            <h4 className="font-semibold text-gray-800 mb-3">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (key === 'services' && Array.isArray(value)) {
                  return value.map(service => (
                    <span key={service} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      {service}
                      <button onClick={() => handleServiceToggle(service)} className="text-green-600 hover:text-green-800">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ));
                }
                if (value && key !== 'services') {
                  return (
                    <span key={key} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      {value}
                      <button onClick={() => handleFilterChange(key, "")} className="text-green-600 hover:text-green-800">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}