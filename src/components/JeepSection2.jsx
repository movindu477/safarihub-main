import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Star, MapPin, Clock, Users, Shield } from 'lucide-react';

const JeepSection2 = ({ currentUser }) => {
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

  // Real-time data listener for service providers
  useEffect(() => {
    console.log('🔔 Setting up real-time data listener for service providers...');
    
    const serviceProvidersRef = collection(db, 'serviceProviders');
    const jeepDriversQuery = query(
      serviceProvidersRef,
      where('serviceType', '==', 'Jeep Driver'),
      limit(50)
    );

    const unsubscribe = onSnapshot(jeepDriversQuery, (snapshot) => {
      console.log('🔄 Real-time service providers data update received');
      
      const updatedJeeps = [];
      
      snapshot.forEach((doc) => {
        const providerData = doc.data();
        const providerId = doc.id;
        
        // Only include Jeep Drivers
        if (providerData.serviceType === 'Jeep Driver') {
          updatedJeeps.push({
            id: providerId,
            // Personal Info
            driverName: providerData.fullName || providerData.driverName || 'Safari Driver',
            imageUrl: providerData.profilePicture || providerData.imageUrl || '',
            location: providerData.location || providerData.baseLocation || 'Sri Lanka',
            
            // Service Info
            rating: typeof providerData.rating === 'number' ? providerData.rating : 
                   typeof providerData.rating === 'string' ? parseFloat(providerData.rating) || 0 : 0,
            totalReviews: providerData.totalReviews || 0,
            pricePerDay: providerData.pricePerDay || providerData.price || providerData.dailyRate || 0,
            vehicleType: providerData.vehicleType || 'Standard Safari Jeep',
            experience: providerData.experienceYears || providerData.experience || 0,
            
            // Arrays with proper fallbacks
            destinations: Array.isArray(providerData.destinations) ? providerData.destinations : 
                         providerData.destinations ? [providerData.destinations] : 
                         ['Multiple National Parks'],
            languages: Array.isArray(providerData.languages) ? providerData.languages :
                      Array.isArray(providerData.languagesSpoken) ? providerData.languagesSpoken :
                      providerData.languagesSpoken ? [providerData.languagesSpoken] :
                      providerData.languages ? [providerData.languages] :
                      ['English', 'Sinhala'],
            specialSkills: Array.isArray(providerData.specialSkills) ? providerData.specialSkills :
                          providerData.specialSkills ? [providerData.specialSkills] : [],
            certifications: Array.isArray(providerData.certifications) ? providerData.certifications :
                           providerData.certifications ? [providerData.certifications] : [],
            
            // Contact Info
            contactPhone: providerData.contactPhone || providerData.phone || providerData.phoneNumber || 'Not provided',
            contactEmail: providerData.contactEmail || providerData.email || '',
            description: providerData.description || providerData.bio || 'Experienced safari jeep driver',
            
            // Mark if this is the current user's profile
            isCurrentUser: currentUser && currentUser.uid === providerId
          });
        }
      });

      const currentUserJeep = updatedJeeps.find(j => j.isCurrentUser);
      
      console.log(`🚙 Real-time data: ${updatedJeeps.length} jeep drivers`);
      if (currentUserJeep) {
        console.log(`👤 Current user jeep: ${currentUserJeep.driverName}`);
      }
      
      setJeeps(updatedJeeps);
      setFilteredJeeps(updatedJeeps);
      
      if (loading) {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Error in real-time data listener:', error);
      setError('Failed to load real-time data. Please refresh the page.');
      setLoading(false);
    });

    return () => {
      console.log('🔕 Cleaning up real-time data listener');
      unsubscribe();
    };
  }, [currentUser, loading]);

  // Filter logic
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

  // Handle profile box click
  const handleProfileClick = (jeep) => {
    navigate(`/jeepprofile?driverId=${jeep.id}`);
  };

  // Handle chat button click
  const handleChatClick = (jeep, e) => {
    e.stopPropagation();
    navigate(`/jeepprofile?driverId=${jeep.id}&openChat=true`);
  };

  // Clear filters completely
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
    
    setFilteredJeeps(jeeps);
    console.log('🧹 All filters cleared, showing all jeeps:', jeeps.length);
  };

  // Format price with commas
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  // Render star rating component
  const renderStars = (rating, showCount = true) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center">
        <div className="flex text-yellow-400 mr-2">
          {'★'.repeat(fullStars)}
          {hasHalfStar && '½'}
          {'☆'.repeat(emptyStars)}
        </div>
        {showCount && (
          <span className="text-sm text-gray-600">
            ({rating > 0 ? rating.toFixed(1) : 'New'})
            {rating > 0 && <span className="text-xs text-gray-500 ml-1">• {jeeps.find(j => j.rating === rating)?.totalReviews || 0} reviews</span>}
          </span>
        )}
      </div>
    );
  };

  // Profile Image Component with proper error handling
  const ProfileImage = ({ jeep }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = () => {
      console.log(`❌ Image failed to load for ${jeep.driverName}: ${jeep.imageUrl}`);
      setImageError(true);
    };

    const handleImageLoad = () => {
      console.log(`✅ Image loaded successfully for ${jeep.driverName}`);
      setImageLoaded(true);
    };

    // If no image URL or image failed to load, show placeholder
    if (!jeep.imageUrl || imageError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-100 to-yellow-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">🚙</span>
            </div>
            <p className="text-sm font-medium text-gray-600">No Photo</p>
          </div>
        </div>
      );
    }

    // Show image with proper loading states
    return (
      <div className="w-full h-full relative">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        )}
        <img
          src={jeep.imageUrl}
          alt={jeep.driverName}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />
      </div>
    );
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

          {/* Current User Status Indicator */}
          {currentUser && (
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Your Profile:</span>{' '}
                {jeeps.find(j => j.isCurrentUser) ? (
                  <span className="text-green-600 font-medium">🟢 Listed - Other users can see your profile</span>
                ) : (
                  <span className="text-gray-500">⚫ Not listed - Register as a service provider</span>
                )}
              </p>
            </div>
          )}
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
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-gray-600 text-lg">
            Found <span className="font-bold text-yellow-600">{filteredJeeps.length}</span> jeep{filteredJeeps.length !== 1 ? 's' : ''} 
            {jeeps.length > 0 && ` out of ${jeeps.length} total`}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              Chat available
            </span>
          </div>
        </div>

        {/* Jeep Grid */}
        {filteredJeeps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredJeeps.slice(0, 12).map((jeep, index) => (
              <div 
                key={jeep.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 cursor-pointer group"
                onClick={() => handleProfileClick(jeep)}
              >
                {/* Profile Image Section */}
                <div className="h-48 relative overflow-hidden">
                  <ProfileImage jeep={jeep} />
                  
                  {/* Experience Badge */}
                  {jeep.experience > 0 && (
                    <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {jeep.experience}+ years
                    </div>
                  )}

                  {/* Current User Badge */}
                  {jeep.isCurrentUser && (
                    <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                      Your Profile
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Name and Location */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1 flex-1">
                        {jeep.driverName}
                        {jeep.isCurrentUser && <span className="ml-1 text-purple-600 text-sm">(You)</span>}
                      </h3>
                      {/* Quick Chat Button - Show for all users except current user */}
                      {!jeep.isCurrentUser && (
                        <button 
                          className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-lg"
                          onClick={(e) => handleChatClick(jeep, e)}
                          title="Start Chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="line-clamp-1">{jeep.location}</span>
                    </div>
                  </div>

                  {/* Rating and Price */}
                  <div className="flex justify-between items-center mb-3">
                    {renderStars(jeep.rating || 0)}
                    <div className="text-lg font-bold text-green-600">
                      {jeep.pricePerDay > 0 ? (
                        <>LKR {formatPrice(jeep.pricePerDay)}<span className="text-sm font-normal text-gray-500">/day</span></>
                      ) : (
                        <span className="text-sm text-gray-500">Contact for price</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{jeep.experience || 0}y</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Users className="h-3 w-3" />
                      <span>6-8 seats</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Shield className="h-3 w-3" />
                      <span>Verified</span>
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

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="flex-1 bg-yellow-500 text-white py-2.5 px-4 rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProfileClick(jeep);
                      }}
                    >
                      {jeep.isCurrentUser ? 'View Your Profile' : 'View Profile'}
                    </button>
                    {!jeep.isCurrentUser && (
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
                    )}
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