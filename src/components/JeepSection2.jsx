import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff, MessageCircle, Star, MapPin, Clock, Users, Shield, RefreshCw, Database } from 'lucide-react';

// Import test functions from components folder
import { testFirebaseConnection, addSampleJeepDrivers } from './TestFirebase';

const JeepSection2 = () => {
  const [jeeps, setJeeps] = useState([]);
  const [filteredJeeps, setFilteredJeeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineStatusMap, setOnlineStatusMap] = useState({});
  const [connectionError, setConnectionError] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const [showDebug, setShowDebug] = useState(false);
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

  // ✅ TEST FIREBASE CONNECTION ON COMPONENT MOUNT
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🧪 Initializing Firebase connection...');
      setDebugInfo('Testing Firebase connection...');
      
      const connectionSuccess = await testFirebaseConnection();
      
      if (!connectionSuccess) {
        setError('Failed to connect to Firebase. Please check your internet connection and Firebase configuration.');
        setConnectionError(true);
        setLoading(false);
        return;
      }

      // Check if serviceProviders collection exists and has data
      try {
        const serviceProvidersRef = collection(db, 'serviceProviders');
        const snapshot = await getDocs(serviceProvidersRef);
        
        const jeepDrivers = snapshot.docs.filter(doc => 
          doc.data().serviceType === 'Jeep Driver'
        );
        
        setDebugInfo(`Found ${jeepDrivers.length} Jeep Drivers out of ${snapshot.size} total service providers`);
        console.log(`📊 Found ${jeepDrivers.length} Jeep Drivers`);
        
        if (jeepDrivers.length === 0) {
          setDebugInfo('No Jeep Drivers found. Database might be empty.');
          console.log('⚠️ No Jeep Drivers found in database');
        }
      } catch (error) {
        console.error('❌ Error checking serviceProviders:', error);
        setDebugInfo(`Error: ${error.message}`);
        setError('Cannot access database. Please check Firestore rules.');
        setConnectionError(true);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // ✅ SIMPLIFIED: Get ALL service providers first (remove the Jeep Driver filter initially)
  useEffect(() => {
    console.log('🔍 Setting up service providers listener...');
    setDebugInfo('Listening for service providers...');
    
    const serviceProvidersRef = collection(db, 'serviceProviders');
    
    // Remove the where filter temporarily to see ALL data
    const allProvidersQuery = query(serviceProvidersRef);
    
    const unsubscribe = onSnapshot(allProvidersQuery, 
      (snapshot) => {
        console.log('📡 Real-time data received:', snapshot.size, 'documents');
        setConnectionError(false);
        
        const allProviders = [];
        let jeepDriversCount = 0;
        
        snapshot.forEach((doc) => {
          const providerData = doc.data();
          const providerId = doc.id;
          
          // Count Jeep Drivers
          if (providerData.serviceType === 'Jeep Driver') {
            jeepDriversCount++;
          }
          
          console.log(`👤 Provider ${providerId}:`, {
            name: providerData.fullName || providerData.driverName,
            serviceType: providerData.serviceType,
            location: providerData.location
          });
          
          // Include ALL service providers but mark Jeep Drivers
          const isJeepDriver = providerData.serviceType === 'Jeep Driver';
          
          allProviders.push({
            id: providerId,
            // Personal Info
            driverName: providerData.fullName || providerData.driverName || providerData.name || 'Safari Driver',
            imageUrl: providerData.profilePicture || providerData.imageUrl || '',
            location: providerData.location || providerData.baseLocation || providerData.city || 'Sri Lanka',
            
            // Service Info
            rating: typeof providerData.rating === 'number' ? providerData.rating : 
                   typeof providerData.rating === 'string' ? parseFloat(providerData.rating) || 0 : 0,
            pricePerDay: providerData.pricePerDay || providerData.price || providerData.dailyRate || providerData.rate || 0,
            vehicleType: providerData.vehicleType || providerData.serviceType || 'Standard Safari Jeep',
            experience: providerData.experienceYears || providerData.experience || providerData.yearsExperience || 0,
            
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
                          providerData.specialSkills ? [providerData.specialSkills] : 
                          providerData.services ? (Array.isArray(providerData.services) ? providerData.services : [providerData.services]) : [],
            certifications: Array.isArray(providerData.certifications) ? providerData.certifications :
                           providerData.certifications ? [providerData.certifications] : [],
            
            // Contact Info
            contactPhone: providerData.contactPhone || providerData.phone || providerData.phoneNumber || providerData.mobile || 'Not provided',
            contactEmail: providerData.contactEmail || providerData.email || '',
            description: providerData.description || providerData.bio || providerData.about || 'Experienced safari jeep driver',
            
            // Online status
            isOnline: providerData.online || providerData.isOnline || false,
            lastSeen: providerData.lastSeen || null,
            
            // Service type for filtering
            serviceType: providerData.serviceType || 'Unknown',
            isJeepDriver: isJeepDriver
          });
        });

        console.log(`🚙 Total providers: ${allProviders.length}, Jeep Drivers: ${jeepDriversCount}`);
        setDebugInfo(`Loaded ${allProviders.length} providers (${jeepDriversCount} Jeep Drivers)`);
        
        // Filter to show only Jeep Drivers
        const jeepDriversOnly = allProviders.filter(provider => provider.isJeepDriver);
        
        setJeeps(jeepDriversOnly);
        setFilteredJeeps(jeepDriversOnly);
        
        if (loading) {
          setLoading(false);
        }
      }, 
      (error) => {
        console.error('❌ Error in service providers listener:', error);
        setError(`Database error: ${error.message}`);
        setDebugInfo(`Error: ${error.message}`);
        setConnectionError(true);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔕 Cleaning up service providers listener');
      unsubscribe();
    };
  }, [loading]);

  // ✅ SIMPLIFIED FILTERS
  useEffect(() => {
    if (jeeps.length === 0) return;
    
    let filtered = [...jeeps];

    // Basic filter implementation
    if (filters.destination) {
      filtered = filtered.filter(jeep => 
        jeep.destinations?.some(dest => 
          dest.toLowerCase().includes(filters.destination.toLowerCase())
        )
      );
    }

    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(jeep => (jeep.rating || 0) >= minRating);
    }

    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(jeep => {
        const price = jeep.pricePerDay || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    if (filters.vehicleType) {
      filtered = filtered.filter(jeep => 
        jeep.vehicleType?.toLowerCase().includes(filters.vehicleType.toLowerCase())
      );
    }

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

  const handleProfileClick = (jeep) => {
    navigate(`/jeepprofile?driverId=${jeep.id}`);
  };

  const handleChatClick = (jeep, e) => {
    e.stopPropagation();
    navigate(`/jeepprofile?driverId=${jeep.id}&openChat=true`);
  };

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
  };

  const handleRetryConnection = async () => {
    console.log('🔄 Retrying connection...');
    setConnectionError(false);
    setLoading(true);
    setError(null);
    setDebugInfo('Retrying connection...');
    
    // Test connection again
    await testFirebaseConnection();
    
    // Reload the component
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleAddSampleData = async () => {
    setDebugInfo('Adding sample data...');
    const success = await addSampleJeepDrivers();
    if (success) {
      setDebugInfo('Sample data added successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setDebugInfo('Failed to add sample data');
    }
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  const OnlineStatusIndicator = ({ jeep }) => {
    const isOnline = jeep.isOnline;
    
    if (isOnline) {
      return (
        <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Wifi className="h-3 w-3" />
          <span>Online Now</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium border border-gray-200">
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  };

  // Enhanced loading component
  if (loading && !connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Loading Safari Jeeps</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            {debugInfo}
          </p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Connection error component
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Database Connection Issue</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-3 rounded-lg">
            <strong>Debug Info:</strong> {debugInfo}
          </p>
          <div className="space-y-3">
            <button 
              onClick={handleRetryConnection}
              className="w-full bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Test & Retry Connection
            </button>
            {/* <button 
              onClick={handleAddSampleData}
              className="w-full bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Database className="h-4 w-4" />
              Add Sample Jeep Drivers
            </button> */}
            <button 
              onClick={clearFilters}
              className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-all duration-300 font-medium"
            >
              Clear Filters
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            If the problem persists, check your Firestore database and rules
          </p>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-blue-500 mt-2"
          >
            {showDebug ? 'Hide' : 'Show'} Technical Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Debug Info Bar */}

        {showDebug && (
          <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
            <h4 className="font-bold mb-2">Debug Information:</h4>
            <p>Total Jeep Drivers: {jeeps.length}</p>
            <p>Filtered Results: {filteredJeeps.length}</p>
            <p>Online Drivers: {jeeps.filter(j => j.isOnline).length}</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
            Safari Jeep Drivers
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover experienced safari jeep drivers for your wildlife adventures. 
            {jeeps.length === 0 && ' No drivers found. Try adding sample data.'}
          </p>
          
          {/* Enhanced Online Status Legend */}
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mt-6 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Online Now</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="font-medium">Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Chat Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">{jeeps.filter(j => j.isOnline).length} Drivers Online</span>
            </div>
          </div>
        </div>

        {/* Add Sample Data Button if no jeeps */}
        {jeeps.length === 0 && (
          <div className="text-center mb-8">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 max-w-2xl mx-auto">
              <h3 className="text-xl font-bold text-orange-800 mb-2">No Jeep Drivers Found</h3>
              <p className="text-orange-700 mb-4">
                Your database doesn't have any jeep drivers yet. Click the button below to add sample data for testing.
              </p>
              <button 
                onClick={handleAddSampleData}
                className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
              >
                <Database className="h-5 w-5" />
                Add Sample Jeep Drivers
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Filter Section */}
        {jeeps.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Filter Safari Jeeps</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Refine your search to find the perfect match • {jeeps.length} drivers available
                  </p>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-300 font-medium border border-gray-300 shadow-sm hover:shadow-md"
                >
                  🧹 Clear All
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
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-all duration-300 shadow-sm"
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
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-all duration-300 shadow-sm"
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
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-all duration-300 shadow-sm"
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
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white transition-all duration-300 shadow-sm"
                  >
                    <option value="">All Types</option>
                    {filterOptions.vehicleTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Enhanced Results Count */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200">
              <div>
                <p className="text-gray-600 text-lg">
                  Found <span className="font-bold text-yellow-600">{filteredJeeps.length}</span> jeep{filteredJeeps.length !== 1 ? 's' : ''} 
                  {jeeps.length > 0 && ` out of ${jeeps.length} total`}
                </p>
                {filters.destination && (
                  <p className="text-sm text-gray-500 mt-1">
                    Filtering for: {filters.destination}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {filteredJeeps.filter(j => j.isOnline).length} online now
                </span>
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  Chat available
                </span>
              </div>
            </div>

            {/* Enhanced Jeep Grid */}
            {filteredJeeps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredJeeps.map((jeep, index) => (
                  <div 
                    key={jeep.id} 
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200 cursor-pointer group"
                    onClick={() => handleProfileClick(jeep)}
                  >
                    {/* Profile Image */}
                    <div className="h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 relative overflow-hidden">
                      {jeep.imageUrl ? (
                        <img
                          src={jeep.imageUrl}
                          alt={jeep.driverName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center text-gray-500 ${jeep.imageUrl ? 'hidden' : 'flex'}`}>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                            <span className="text-2xl">🚙</span>
                          </div>
                          <p className="text-sm font-medium text-gray-600">No Photo</p>
                        </div>
                      </div>
                      
                      {/* Online Status Badge */}
                      <div className="absolute top-3 left-3">
                        <OnlineStatusIndicator jeep={jeep} />
                      </div>
                      
                      {/* Experience Badge */}
                      {jeep.experience > 0 && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          {jeep.experience}+ years
                        </div>
                      )}

                      {/* Online Pulse Effect */}
                      {jeep.isOnline && (
                        <div className="absolute inset-0 border-2 border-green-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Name and Location */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-xl font-bold text-gray-900 line-clamp-1 flex-1 group-hover:text-yellow-600 transition-colors">
                            {jeep.driverName}
                          </h3>
                          {/* Quick Chat Button */}
                          <button 
                            className="ml-2 p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
                            onClick={(e) => handleChatClick(jeep, e)}
                            title="Start Chat"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="line-clamp-1">{jeep.location}</span>
                        </div>
                      </div>

                      {/* Rating and Price */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <div className="flex text-yellow-400 mr-2">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={i < Math.floor(jeep.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                              />
                            ))}
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
                        <div className="inline-block bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
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

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <button 
                          className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2.5 px-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfileClick(jeep);
                          }}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Enhanced No Results Message */
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No jeeps found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                  We couldn't find any safari jeeps matching your current filters. Try adjusting your search criteria or clearing some filters to see more results.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearFilters}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                  >
                    🧹 Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JeepSection2;