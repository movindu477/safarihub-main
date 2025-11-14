import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const JeepSection2 = () => {
  const [jeeps, setJeeps] = useState([]);
  const [filteredJeeps, setFilteredJeeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filter states
  const [filters, setFilters] = useState({
    destination: '',
    rating: '',
    priceRange: '',
    vehicleType: '',
    languages: [],
    specialSkills: [],
    certifications: []
  });

  // Filter options
  const filterOptions = {
    destinations: [
      'Yala National Park',
      'Wilpattu National Park',
      'Udawalawe National Park',
      'Minneriya National Park',
      'Horton Plains',
      'Sinharaja Forest'
    ],
    ratings: [
      { value: '1', label: '1★ and above' },
      { value: '2', label: '2★ and above' },
      { value: '3', label: '3★ and above' },
      { value: '4', label: '4★ and above' },
      { value: '5', label: '5★ only' }
    ],
    priceRanges: [
      { value: '5000-10000', label: 'LKR 5,000 – 10,000' },
      { value: '10000-15000', label: 'LKR 10,000 – 15,000' },
      { value: '15000-20000', label: 'LKR 15,000 – 20,000' },
      { value: '20000-30000', label: 'LKR 20,000 – 30,000' },
      { value: '30000-50000', label: 'LKR 30,000 – 50,000' },
      { value: '50000-100000', label: 'LKR 50,000 – 100,000' }
    ],
    vehicleTypes: [
      'Standard Safari Jeep',
      'Luxury Safari Jeep',
      'Open Roof Jeep',
      '4x4 Modified Jeep'
    ],
    languages: [
      'English', 'Sinhala', 'Tamil', 'Hindi', 
      'French', 'German', 'Chinese', 'Japanese'
    ],
    specialSkills: [
      'Wildlife photography knowledge',
      'Birdwatching expertise',
      'Family-friendly tours',
      'Private tours',
      'Full-day safari',
      'Half-day safari',
      'Off-road adventures',
      'Night safari tours'
    ],
    certifications: [
      'Wildlife Department Certified',
      'Tourism Board Licensed',
      'First Aid Certified',
      'Eco Tourism Certified',
      'Defensive Driving Certified'
    ]
  };

  // Fetch ONLY Jeep Driver service providers from Firebase
  useEffect(() => {
    const fetchJeeps = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching Jeep Driver service providers...');
        
        // Get ALL service providers first
        const querySnapshot = await getDocs(collection(db, 'serviceProviders'));
        const allProviders = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          allProviders.push({ 
            id: doc.id, 
            ...data
          });
        });

        console.log('📊 Total service providers found:', allProviders.length);
        
        // ✅ UPDATED: Filter ONLY for Jeep Drivers with exact serviceType match
        const jeepDrivers = allProviders.filter(provider => {
          const isJeepDriver = provider.serviceType === 'Jeep Driver';
          console.log(`Provider: ${provider.fullName}, Service Type: ${provider.serviceType}, Is Jeep Driver: ${isJeepDriver}`);
          return isJeepDriver;
        });

        console.log('🚙 Jeep Drivers filtered:', jeepDrivers.length);
        
        // Enhanced data mapping with better defaults
        const enhancedJeepData = jeepDrivers.map(provider => ({
          id: provider.id,
          // Personal Info
          driverName: provider.fullName || provider.driverName || 'Safari Driver',
          imageUrl: provider.profilePicture || provider.imageUrl || '',
          location: provider.location || provider.baseLocation || 'Sri Lanka',
          
          // Service Info
          rating: typeof provider.rating === 'number' ? provider.rating : 
                 typeof provider.rating === 'string' ? parseFloat(provider.rating) || 0 : 0,
          pricePerDay: provider.pricePerDay || provider.price || provider.dailyRate || 0,
          vehicleType: provider.vehicleType || 'Standard Safari Jeep',
          experience: provider.experienceYears || provider.experience || 0,
          
          // Arrays with proper fallbacks
          destinations: Array.isArray(provider.destinations) ? provider.destinations : 
                       provider.destinations ? [provider.destinations] : 
                       ['Multiple National Parks'],
          languages: Array.isArray(provider.languages) ? provider.languages :
                    Array.isArray(provider.languagesSpoken) ? provider.languagesSpoken :
                    provider.languagesSpoken ? [provider.languagesSpoken] :
                    provider.languages ? [provider.languages] :
                    ['English', 'Sinhala'],
          specialSkills: Array.isArray(provider.specialSkills) ? provider.specialSkills :
                        provider.specialSkills ? [provider.specialSkills] : [],
          certifications: Array.isArray(provider.certifications) ? provider.certifications :
                         provider.certifications ? [provider.certifications] : [],
          
          // Contact Info
          contactPhone: provider.contactPhone || provider.phone || provider.phoneNumber || 'Not provided',
          contactEmail: provider.contactEmail || provider.email || '',
          description: provider.description || provider.bio || 'Experienced safari jeep driver',
          
          // Original data for debugging
          originalData: provider
        }));

        console.log('🎯 Enhanced jeep data:', enhancedJeepData);
        console.log('📝 Sample provider:', enhancedJeepData[0]);
        
        setJeeps(enhancedJeepData);
        setFilteredJeeps(enhancedJeepData);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ Error fetching service providers:', error);
        setError('Failed to load safari jeeps. Please check your connection and try again.');
        setLoading(false);
      }
    };

    fetchJeeps();
  }, []);

  // ✅ UPDATED: Enhanced filter logic with exact matches
  useEffect(() => {
    console.log('🔄 Applying filters...', filters);
    
    let filtered = [...jeeps];

    // Destination filter
    if (filters.destination) {
      filtered = filtered.filter(jeep => 
        jeep.destinations?.some(dest => 
          dest.toLowerCase().includes(filters.destination.toLowerCase())
        )
      );
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(jeep => 
        (jeep.rating || 0) >= minRating
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(jeep => {
        const price = jeep.pricePerDay || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Vehicle type filter
    if (filters.vehicleType) {
      filtered = filtered.filter(jeep => 
        jeep.vehicleType?.toLowerCase() === filters.vehicleType.toLowerCase()
      );
    }

    // Languages filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter(jeep =>
        filters.languages.every(lang => 
          jeep.languages?.some(jLang => 
            jLang.toLowerCase().includes(lang.toLowerCase())
          )
        )
      );
    }

    // Special skills filter
    if (filters.specialSkills.length > 0) {
      filtered = filtered.filter(jeep =>
        filters.specialSkills.every(skill => 
          jeep.specialSkills?.some(jSkill => 
            jSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Certifications filter
    if (filters.certifications.length > 0) {
      filtered = filtered.filter(jeep =>
        filters.certifications.every(cert => 
          jeep.certifications?.some(jCert => 
            jCert.toLowerCase().includes(cert.toLowerCase())
          )
        )
      );
    }

    console.log('✅ Filtered results:', filtered.length);
    setFilteredJeeps(filtered);
  }, [filters, jeeps]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleMultiSelectChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value]
    }));
  };

  // ✅ NEW: Handle profile box click
  const handleProfileClick = (jeep) => {
    navigate('/jeepprofile', { state: { jeep } });
  };

  // ✅ UPDATED: Clear filters completely
  const clearFilters = () => {
    setFilters({
      destination: '',
      rating: '',
      priceRange: '',
      vehicleType: '',
      languages: [],
      specialSkills: [],
      certifications: []
    });
    
    // Reset to show all jeeps
    setFilteredJeeps(jeeps);
    
    console.log('🧹 All filters cleared, showing all jeeps:', jeeps.length);
  };

  // Format price with commas
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Safari Jeeps</h3>
          <p className="text-gray-500">Finding the best drivers for your adventure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">😔</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Something went wrong</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
            >
              Try Again
            </button>
            <button 
              onClick={clearFilters}
              className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Safari Jeep Drivers</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover experienced safari jeep drivers for your wildlife adventures. Filter by your preferences to find the perfect match.
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Filter Safari Jeeps</h2>
              <p className="text-gray-600 text-sm mt-1">
                Refine your search to find the perfect match
              </p>
            </div>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-300"
            >
              Clear All Filters
            </button>
          </div>

          {/* Single Row Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Destination Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🗺️ Destination
              </label>
              <select
                value={filters.destination}
                onChange={(e) => handleFilterChange('destination', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              >
                <option value="">All Destinations</option>
                {filterOptions.destinations.map(dest => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>
            </div>

            {/* Ratings Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ⭐ Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              >
                <option value="">All Ratings</option>
                {filterOptions.ratings.map(rating => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💰 Price Range
              </label>
              <select
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              >
                <option value="">All Prices</option>
                {filterOptions.priceRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🚙 Vehicle Type
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
              >
                <option value="">All Types</option>
                {filterOptions.vehicleTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-select Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Languages Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🌐 Languages
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.languages.map(language => (
                  <div key={language} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`lang-${language}`}
                      checked={filters.languages.includes(language)}
                      onChange={() => handleMultiSelectChange('languages', language)}
                      className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`lang-${language}`} className="text-sm text-gray-700 flex-1">
                      {language}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Skills Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 Services
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.specialSkills.map(skill => (
                  <div key={skill} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={filters.specialSkills.includes(skill)}
                      onChange={() => handleMultiSelectChange('specialSkills', skill)}
                      className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`skill-${skill}`} className="text-sm text-gray-700 flex-1">
                      {skill}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Certifications Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📜 Certifications
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.certifications.map(cert => (
                  <div key={cert} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`cert-${cert}`}
                      checked={filters.certifications.includes(cert)}
                      onChange={() => handleMultiSelectChange('certifications', cert)}
                      className="mr-3 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`cert-${cert}`} className="text-sm text-gray-700 flex-1">
                      {cert}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600 text-lg">
            Found <span className="font-bold text-yellow-600">{filteredJeeps.length}</span> jeep{filteredJeeps.length !== 1 ? 's' : ''} 
            {jeeps.length > 0 && ` out of ${jeeps.length} total`}
          </p>
          {filteredJeeps.length > 12 && (
            <div className="text-sm text-gray-500">
              Showing first 12 of {filteredJeeps.length}
            </div>
          )}
        </div>

        {/* Jeep Grid */}
        {filteredJeeps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredJeeps.slice(0, 12).map((jeep, index) => (
              <div 
                key={jeep.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 cursor-pointer"
                onClick={() => handleProfileClick(jeep)}
              >
                {/* Profile Image */}
                <div className="h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 relative overflow-hidden">
                  {jeep.imageUrl ? (
                    <img
                      src={jeep.imageUrl}
                      alt={jeep.driverName}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center text-gray-500 ${jeep.imageUrl ? 'hidden' : 'flex'}`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <span className="text-2xl">🚙</span>
                      </div>
                      <p className="text-sm font-medium text-gray-600">No Photo</p>
                    </div>
                  </div>
                  
                  {/* Experience Badge */}
                  {jeep.experience > 0 && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {jeep.experience}+ years
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Name and Location */}
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                      {jeep.driverName}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="mr-1">📍</span>
                      <span className="line-clamp-1">{jeep.location}</span>
                    </div>
                  </div>

                  {/* Rating and Price */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <div className="flex text-yellow-400 mr-2">
                        {'★'.repeat(Math.floor(jeep.rating || 0))}
                        {'☆'.repeat(5 - Math.floor(jeep.rating || 0))}
                      </div>
                      <span className="text-sm text-gray-600">
                        ({jeep.rating > 0 ? jeep.rating.toFixed(1) : 'New'})
                      </span>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {jeep.pricePerDay > 0 ? (
                        <>LKR {formatPrice(jeep.pricePerDay)}<span className="text-sm font-normal text-gray-500">/day</span></>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for price</span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Type */}
                  <div className="mb-3">
                    <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                      {jeep.vehicleType}
                    </div>
                  </div>

                  {/* Destinations */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Destinations:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {jeep.destinations?.join(', ')}
                    </p>
                  </div>

                  {/* Languages */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Languages:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {jeep.languages?.slice(0, 3).join(', ')}
                      {jeep.languages?.length > 3 && '...'}
                    </p>
                  </div>

                  {/* Special Skills */}
                  {jeep.specialSkills && jeep.specialSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Services:</p>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {jeep.specialSkills.slice(0, 2).join(', ')}
                        {jeep.specialSkills.length > 2 && '...'}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="flex-1 bg-yellow-500 text-white py-2.5 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(jeep);
                      }}
                    >
                      View Profile
                    </button>
                    <button 
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (jeep.contactPhone && jeep.contactPhone !== 'Not provided') {
                          const phoneNumber = jeep.contactPhone.replace(/\D/g, '');
                          const whatsappUrl = `https://wa.me/${phoneNumber}`;
                          window.open(whatsappUrl, '_blank');
                        }
                      }}
                    >
                      📞 Call
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* No Results Message */
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No jeeps found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {jeeps.length === 0 
                ? "No jeep drivers are currently registered. Check back later or contact support."
                : "We couldn't find any safari jeeps matching your current filters. Try adjusting your search criteria."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={clearFilters}
                className="px-8 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
              >
                Clear All Filters
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}

        {/* Load More Button (if many results) */}
        {filteredJeeps.length > 12 && (
          <div className="text-center mt-8">
            <button className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold">
              Load More Jeeps ({filteredJeeps.length - 12} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JeepSection2;