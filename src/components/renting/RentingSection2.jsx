import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, limit, getDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock, Package, Shield, Users } from 'lucide-react';

// Profile Image Component with proper error handling
const ProfileImage = ({ provider, className }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  if (!provider.imageUrl || imageError) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${className || 'w-full h-full'}`}>
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-3xl">🏬</span>
          </div>
          <p className="text-sm font-medium text-gray-600">No Photo</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className || 'w-full h-full'}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
        </div>
      )}
      <img
        src={provider.imageUrl}
        alt={provider.providerName}
        className={`${className || 'w-full h-full object-cover'} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

const RentingSection2 = ({ currentUser }) => {
  const [rentalProviders, setRentalProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState(null);
  const [userFavorites, setUserFavorites] = useState([]);
  const navigate = useNavigate();

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
      where('serviceType', 'in', ['Renting', 'Renting Store']),
      limit(50)
    );

    const unsubscribe = onSnapshot(rentingQuery, (snapshot) => {
      console.log('🔄 Real-time rental providers data update received');

      const updatedProviders = [];

      snapshot.forEach((doc) => {
        const providerData = doc.data();
        const providerId = doc.id;

        // Only include Renting service providers
        if (providerData.serviceType === 'Renting' || providerData.serviceType === 'Renting Store') {
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
            certificationStatus: providerData.certificationStatus || 'uncertified',
            certifiedAt: providerData.certifiedAt || null,
            certifiedBy: providerData.certifiedBy || null,
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
      <div id="renting-section" className="min-h-screen bg-linear-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
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
      <div id="renting-section" className="min-h-screen bg-linear-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="renting-section" className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Professional <span className="text-green-600">Rental Stores</span></h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover premium camera, camping, and adventure gear rental locations across Sri Lanka.
          </p>
        </div>

        {/* Favorite Message Overlay */}
        {favoriteMessage && (
          <>
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fadeIn">
                <p className="font-medium">{favoriteMessage}</p>
              </div>
            </div>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
              }
            `}</style>
          </>
        )}

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-gray-100 p-6 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Filter Gear</h2>
              <p className="text-gray-500 text-sm mt-1">Find the perfect equipment for your journey</p>
            </div>
            <button
              onClick={() => setFilters({ rating: '', priceRange: '', equipmentType: '', location: '' })}
              className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-500/30"
            >
              Clear All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">All Ratings</option>
                {filterOptions.ratings.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Price Range</label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">All Prices</option>
                {filterOptions.priceRanges.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Equipment Type</label>
              <select
                value={filters.equipmentType}
                onChange={(e) => setFilters({ ...filters, equipmentType: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">All Equipment</option>
                {filterOptions.equipmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              >
                <option value="">All Locations</option>
                {filterOptions.locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-500 font-medium">
            Showing {filteredProviders.length} providers
          </p>
        </div>

        {/* Rental Providers Grid Sections */}
        {filteredProviders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                id={`rental-card-${provider.id}`}
                className="group relative h-[420px] bg-white rounded-[32px] shadow-xl shadow-gray-100/50 overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500"
                onClick={() => handleProviderClick(provider.id)}
              >
                {/* Background Image */}
                <div className="absolute inset-0 h-full w-full">
                  <ProfileImage provider={provider} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                </div>

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                  {provider.certificationStatus === 'certified' ? (
                    <div className="bg-white/90 backdrop-blur-md text-green-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      CERTIFIED
                    </div>
                  ) : (
                    <div className="bg-white/90 backdrop-blur-md text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      PENDING
                    </div>
                  )}
                  {provider.experience > 0 && (
                    <div className="bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                      {provider.experience}+ Years
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl p-6 rounded-t-[48px] transform transition-transform duration-500 translate-y-[88px] group-hover:translate-y-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-gray-900 truncate pr-2">
                        {provider.providerName}
                      </h3>
                      {provider.certificationStatus === 'certified' && (
                        <Shield className="h-5 w-5 text-green-500 fill-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-medium">{provider.equipmentType || 'Rental Store'}</p>
                  </div>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400 font-bold" />
                      <span className="text-sm font-bold text-gray-900">{provider.totalReviews || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-gray-900">{(provider.rating || 0) === 0 ? 'New' : provider.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Hidden Hover Details */}
                  <div className="space-y-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                    <div className="space-y-2 py-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate font-medium">{provider.location}</span>
                      </div>
                    </div>
                    {currentUser && !provider.isCurrentUser && (
                      <button
                        onClick={(e) => handleFavoriteToggle(provider.id, e)}
                        className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${userFavorites.includes(provider.id)
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-gray-900 text-white hover:bg-black'
                          }`}
                      >
                        {userFavorites.includes(provider.id) ? 'Saved' : 'Add to Favorites'}
                        <span className="text-lg leading-none">{userFavorites.includes(provider.id) ? '♥' : '+'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-[32px] shadow-lg border border-gray-100">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2 font-bold">No rental stores found</p>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentingSection2;
