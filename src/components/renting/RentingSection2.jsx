import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Star, MapPin, Clock, Camera, ShoppingBag, Package, CheckCircle } from 'lucide-react';

const RentingSection2 = ({ currentUser }) => {
  const [rentalProviders, setRentalProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState(null);
  const [userFavorites, setUserFavorites] = useState([]);
  const navigate = useNavigate();
  const auth = getAuth();

  // Filter states
  const [filters, setFilters] = useState({
    rating: '',
    priceRange: '',
    equipmentType: '',
    location: ''
  });

  // Filter options for rental equipment
  const filterOptions = {
    ratings: [
      { value: '1', label: '1★ and above' },
      { value: '2', label: '2★ and above' },
      { value: '3', label: '3★ and above' },
      { value: '4', label: '4★ and above' },
      { value: '5', label: '5★ only' }
    ],
    priceRanges: [
      { value: '500-1500', label: 'LKR 500 – 1,500/day' },
      { value: '1500-3000', label: 'LKR 1,500 – 3,000/day' },
      { value: '3000-5000', label: 'LKR 3,000 – 5,000/day' },
      { value: '5000-10000', label: 'LKR 5,000 – 10,000/day' },
      { value: '10000-20000', label: 'LKR 10,000 – 20,000/day' }
    ],
    equipmentTypes: [
      'DSLR Camera',
      'Mirrorless Camera',
      'Action Camera',
      'Drone',
      'Telephoto Lens',
      'Wide Angle Lens',
      'Tripod',
      'Binoculars',
      'Camping Gear',
      'Adventure Equipment'
    ],
    locations: [
      'Colombo',
      'Kandy',
      'Negombo',
      'Galle',
      'Yala',
      'Sigiriya',
      'Nuwara Eliya',
      'Ella',
      'Anuradhapura',
      'Polonnaruwa'
    ]
  };

  // Real-time data listener for rental providers
  useEffect(() => {
    console.log('🔔 Setting up real-time data listener for rental providers...');
    
    const serviceProvidersRef = collection(db, 'serviceProviders');
    const rentingQuery = query(
      serviceProvidersRef,
      where('serviceType', '==', 'Renting'),
      limit(50)
    );

    const unsubscribe = onSnapshot(rentingQuery, (snapshot) => {
      console.log('🔄 Real-time rental providers data update received');
      
      const updatedProviders = [];
      
      snapshot.forEach((doc) => {
        const providerData = doc.data();
        const providerId = doc.id;
        
        // Only include Renting service providers
        if (providerData.serviceType === 'Renting') {
          updatedProviders.push({
            id: providerId,
            providerName: providerData.fullName || providerData.providerName || 'Equipment Rental',
            imageUrl: providerData.profilePicture || providerData.imageUrl || '',
            location: providerData.location || providerData.baseLocation || 'Sri Lanka',
            
            rating: typeof providerData.rating === 'number' ? providerData.rating : 
                   typeof providerData.rating === 'string' ? parseFloat(providerData.rating) || 0 : 0,
            totalReviews: providerData.totalReviews || 0,
            pricePerDay: providerData.pricePerDay || providerData.price || providerData.dailyRate || 0,
            experience: providerData.experienceYears || providerData.experience || 0,
            
            equipmentType: providerData.equipmentType || providerData.vehicleType || 'Camera Equipment',
            equipmentCategories: Array.isArray(providerData.equipmentCategories) ? providerData.equipmentCategories :
                               providerData.equipmentType ? [providerData.equipmentType] : 
                               ['Camera Equipment'],
            availableEquipment: Array.isArray(providerData.availableEquipment) ? providerData.availableEquipment : [],
            
            destinations: Array.isArray(providerData.destinations) ? providerData.destinations : 
                         providerData.destinations ? [providerData.destinations] : 
                         ['Multiple Locations'],
            
            contactPhone: providerData.contactPhone || providerData.phone || providerData.phoneNumber || 'Not provided',
            contactEmail: providerData.contactEmail || providerData.email || '',
            description: providerData.description || providerData.bio || 'Premium camera and adventure gear rental',
            
            isCurrentUser: currentUser && currentUser.uid === providerId,
            availability: providerData.availability !== false,
            online: providerData.online || false,
            featured: providerData.featured || false,
          });
        }
      });

      console.log(`📷 Real-time data: ${updatedProviders.length} rental providers`);
      
      setRentalProviders(updatedProviders);
      setFilteredProviders(updatedProviders);
      
      if (loading) {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Error in real-time data listener:', error);
      setError('Failed to load rental providers. Please refresh the page.');
      setLoading(false);
    });

    return () => {
      console.log('🔕 Cleaning up real-time data listener');
      unsubscribe();
    };
  }, [currentUser, loading]);

  // Load user favorites
  useEffect(() => {
    if (!currentUser) {
      setUserFavorites([]);
      return;
    }

    const fetchUserFavorites = async () => {
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const touristDoc = await getDoc(doc(db, 'tourists', currentUser.uid));
        
        if (touristDoc.exists()) {
          const touristData = touristDoc.data();
          const favorites = touristData.favorites || [];
          const rentalFavorites = favorites.filter(fav => fav.type === 'renting' || fav.serviceType === 'Renting');
          setUserFavorites(rentalFavorites.map(fav => fav.id || fav.providerId));
        }
      } catch (error) {
        console.error('Error fetching user favorites:', error);
      }
    };

    fetchUserFavorites();
  }, [currentUser]);

  // Filter logic
  useEffect(() => {
    console.log('🔄 Applying filters...', filters);
    
    let filtered = [...rentalProviders];

    // Rating filter
    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(provider => 
        (provider.rating || 0) >= minRating
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(provider => {
        const price = provider.pricePerDay || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Equipment type filter
    if (filters.equipmentType) {
      filtered = filtered.filter(provider => 
        provider.equipmentCategories?.some(cat => 
          cat.toLowerCase().includes(filters.equipmentType.toLowerCase())
        ) || 
        provider.equipmentType?.toLowerCase().includes(filters.equipmentType.toLowerCase())
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(provider => 
        provider.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        provider.destinations?.some(dest => 
          dest.toLowerCase().includes(filters.location.toLowerCase())
        )
      );
    }

    // Sort by featured first, then by rating
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    console.log(`✅ Filtered to ${filtered.length} providers`);
    setFilteredProviders(filtered);
  }, [rentalProviders, filters]);

  const handleProviderClick = (providerId) => {
    // Save scroll position before navigating
    sessionStorage.setItem('rentalListingScrollPosition', window.scrollY.toString());
    navigate(`/renting-profile/${providerId}`);
  };

  const handleFavoriteToggle = async (providerId, e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please login to add favorites');
      return;
    }

    try {
      const { getDoc, doc, updateDoc, arrayUnion, arrayRemove } = await import('firebase/firestore');
      const touristDocRef = doc(db, 'tourists', currentUser.uid);
      const touristDoc = await getDoc(touristDocRef);

      if (touristDoc.exists()) {
        const touristData = touristDoc.data();
        const favorites = touristData.favorites || [];
        const isFavorite = favorites.some(fav => (fav.id || fav.providerId) === providerId);

        if (isFavorite) {
          await updateDoc(touristDocRef, {
            favorites: favorites.filter(fav => (fav.id || fav.providerId) !== providerId)
          });
          setUserFavorites(prev => prev.filter(id => id !== providerId));
          setFavoriteMessage('Removed from favorites');
        } else {
          const provider = rentalProviders.find(p => p.id === providerId);
          await updateDoc(touristDocRef, {
            favorites: arrayUnion({
              id: providerId,
              providerId: providerId,
              name: provider?.providerName || 'Rental Provider',
              type: 'renting',
              serviceType: 'Renting',
              imageUrl: provider?.imageUrl || '',
              addedAt: Date.now()
            })
          });
          setUserFavorites(prev => [...prev, providerId]);
          setFavoriteMessage('Added to favorites');
        }

        setTimeout(() => setFavoriteMessage(null), 2000);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  if (loading) {
    return (
      <div id="renting-section" className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading rental providers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="renting-section" className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="renting-section" className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Equipment <span className="text-green-600">Rental Providers</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse premium camera and adventure gear rental locations across Sri Lanka
          </p>
        </div>

        {/* Favorite Message */}
        {favoriteMessage && (
          <div className="fixed top-24 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn">
            {favoriteMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Filter Equipment
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Ratings</option>
                {filterOptions.ratings.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Prices</option>
                {filterOptions.priceRanges.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Equipment Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type</label>
              <select
                value={filters.equipmentType}
                onChange={(e) => setFilters({ ...filters, equipmentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Equipment</option>
                {filterOptions.equipmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Locations</option>
                {filterOptions.locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.rating || filters.priceRange || filters.equipmentType || filters.location) && (
            <div className="mt-4">
              <button
                onClick={() => setFilters({ rating: '', priceRange: '', equipmentType: '', location: '' })}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredProviders.length} {filteredProviders.length === 1 ? 'provider' : 'providers'} available
            {filteredProviders.length !== rentalProviders.length && ` (filtered from ${rentalProviders.length})`}
          </p>
        </div>

        {/* Rental Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No rental providers found</p>
            <p className="text-gray-500">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => {
              const isFavorite = userFavorites.includes(provider.id);
              
              return (
                <div
                  key={provider.id}
                  id={`rental-card-${provider.id}`}
                  onClick={() => handleProviderClick(provider.id)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 cursor-pointer transform hover:scale-105 group"
                >
                  {/* Provider Image */}
                  <div className="relative h-48 bg-gradient-to-br from-green-400 to-green-600 overflow-hidden">
                    {provider.imageUrl ? (
                      <img
                        src={provider.imageUrl}
                        alt={provider.providerName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-20 w-20 text-white opacity-50" />
                      </div>
                    )}
                    
                    {/* Featured Badge */}
                    {provider.featured && (
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </div>
                    )}

                    {/* Favorite Button */}
                    {currentUser && (
                      <button
                        onClick={(e) => handleFavoriteToggle(provider.id, e)}
                        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                          isFavorite 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white/80 text-gray-600 hover:bg-red-500 hover:text-white'
                        }`}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </button>
                    )}

                    {/* Online Status */}
                    {provider.online && (
                      <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Online
                      </div>
                    )}
                  </div>

                  {/* Provider Info */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                      {provider.providerName}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.round(provider.rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {provider.rating.toFixed(1)} ({provider.totalReviews} reviews)
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{provider.location}</span>
                    </div>

                    {/* Equipment Type */}
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Camera className="h-4 w-4" />
                      <span className="text-sm">{provider.equipmentType || 'Camera Equipment'}</span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {provider.description}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <span className="text-2xl font-bold text-green-600">
                          LKR {provider.pricePerDay?.toLocaleString() || 'N/A'}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/day</span>
                      </div>
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default RentingSection2;
