import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, limit, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Star, MapPin, Clock, Users, Shield } from 'lucide-react';

const JeepSection2 = ({ currentUser, selectedDestination, onClearDestination }) => {
  const [jeeps, setJeeps] = useState([]);
  const [filteredJeeps, setFilteredJeeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState(null);
  const [userFavorites, setUserFavorites] = useState([]); // Track user's favorites
  const navigate = useNavigate();
  const auth = getAuth();

  // Scroll to driver card and restore scroll position when returning from profile page
  useEffect(() => {
    const shouldScroll = sessionStorage.getItem('scrollToDriver');
    const driverId = sessionStorage.getItem('lastViewedDriverId');
    
    if (shouldScroll === 'true' && filteredJeeps.length > 0 && driverId) {
      console.log('🔄 Attempting to scroll to driver card:', driverId);
      
      // Function to scroll to the element
      const scrollToElement = () => {
        const element = document.getElementById(`driver-card-${driverId}`);
        if (element) {
          console.log('✅ Found driver card element, scrolling...');
          
          // Use scrollIntoView for reliable scrolling
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Add a slight delay for smooth scroll, then highlight
          setTimeout(() => {
            // Highlight the card briefly
            element.style.transition = 'box-shadow 0.3s ease-in-out';
            element.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.5)';
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 2000);
          }, 500);
          
          // Clear the flag after successful scroll
          sessionStorage.removeItem('scrollToDriver');
          return true;
        }
        console.log('❌ Driver card element not found yet');
        return false;
      };
      
      // Wait for DOM to be fully rendered with multiple retry attempts
      const attemptScroll = (attempt = 0) => {
        const maxAttempts = 8;
        const delays = [200, 300, 500, 700, 1000, 1500, 2000, 2500]; // Increasing delays
        
        if (attempt < maxAttempts) {
          setTimeout(() => {
            if (!scrollToElement() && attempt < maxAttempts - 1) {
              console.log(`🔄 Retry attempt ${attempt + 1}/${maxAttempts}`);
              attemptScroll(attempt + 1);
            } else if (attempt >= maxAttempts - 1) {
              // Clear flag even if element not found after all attempts
              sessionStorage.removeItem('scrollToDriver');
              console.log('⚠️ Could not find driver card after all attempts');
            }
          }, delays[attempt]);
        }
      };
      
      // Start attempting to scroll after initial delay
      setTimeout(() => {
        attemptScroll();
      }, 100);
      
      // Clean up saved scroll position after use
      const savedScrollPosition = sessionStorage.getItem('jeepListingScrollPosition');
      if (savedScrollPosition) {
        sessionStorage.removeItem('jeepListingScrollPosition');
      }
    }
  }, [filteredJeeps]);

  // Filter states
  const [filters, setFilters] = useState({
    rating: '',
    priceRange: '',
    vehicleType: '',
    languages: [],
    specialSkills: [],
    certifications: [],
  });

  // Filter options
  const filterOptions = {
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
            isCurrentUser: currentUser && currentUser.uid === providerId,

            // Certification status
            certificationStatus: providerData.certificationStatus || 'uncertified',
            certifiedAt: providerData.certifiedAt || null,
            certifiedBy: providerData.certifiedBy || null,

          });
        }
      });

      const currentUserJeep = updatedJeeps.find(j => j.isCurrentUser);
      const certifiedCount = updatedJeeps.filter(j => j.certificationStatus === 'certified').length;
      const uncertifiedCount = updatedJeeps.filter(j => j.certificationStatus !== 'certified').length;
      
      console.log(`🚙 Real-time data: ${updatedJeeps.length} jeep drivers (${certifiedCount} certified, ${uncertifiedCount} uncertified)`);
      if (currentUserJeep) {
        console.log(`👤 Current user jeep: ${currentUserJeep.driverName} (Status: ${currentUserJeep.certificationStatus})`);
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

    // Destination filter (from props - selectedDestination)
    if (selectedDestination) {
      filtered = filtered.filter(jeep => 
        jeep.destinations?.some(dest => 
          dest.toLowerCase().includes(selectedDestination.toLowerCase())
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
  }, [filters, jeeps, selectedDestination]);

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
    // Save current scroll position before navigating
    sessionStorage.setItem('jeepListingScrollPosition', window.scrollY.toString());
    
    // Save the driver ID to sessionStorage so we can scroll to it when coming back
    sessionStorage.setItem('lastViewedDriverId', jeep.id);
    sessionStorage.setItem('scrollToDriver', 'true');
    // Save selectedDestination to sessionStorage to preserve it when navigating back
    if (selectedDestination) {
      sessionStorage.setItem('selectedDestination', selectedDestination);
      sessionStorage.setItem('showDestinationSelector', 'false');
    }
    navigate(`/jeep-profile/${jeep.id}`);
  };

  // Load user's favorites on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserFavorites([]);
      return;
    }

    const touristDocRef = doc(db, 'tourists', user.uid);
    const unsubscribe = onSnapshot(touristDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserFavorites(data.favoriteJeepDrivers || []);
      } else {
        setUserFavorites([]);
      }
    }, (error) => {
      console.error('Error loading favorites:', error);
      setUserFavorites([]);
    });

    return () => unsubscribe();
  }, [auth, db]);

  // Toggle favorite (add or remove)
  const handleToggleFavorite = async (jeepId) => {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    try {
      const touristDocRef = doc(db, 'tourists', user.uid);
      const touristDoc = await getDoc(touristDocRef);
      
      const existingFavorites = touristDoc.exists() 
        ? (touristDoc.data().favoriteJeepDrivers || [])
        : [];
      
      const isFavorited = existingFavorites.includes(jeepId);
      
      if (touristDoc.exists()) {
        if (isFavorited) {
          // Remove from favorites
          await updateDoc(touristDocRef, {
            favoriteJeepDrivers: arrayRemove(jeepId),
            updatedAt: serverTimestamp()
          }, { merge: true });
          setFavoriteMessage('Removed from favorites');
        } else {
          // Add to favorites
          await updateDoc(touristDocRef, {
            favoriteJeepDrivers: arrayUnion(jeepId),
            updatedAt: serverTimestamp()
          }, { merge: true });
          setFavoriteMessage('Service provider added to favorite');
        }
      } else {
        // Create document if it doesn't exist
        await updateDoc(touristDocRef, {
          favoriteJeepDrivers: [jeepId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        setFavoriteMessage('Service provider added to favorite');
      }
      
      setTimeout(() => setFavoriteMessage(null), 2000);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setFavoriteMessage('Failed to update favorite');
      setTimeout(() => setFavoriteMessage(null), 3000);
    }
  };

  // Favorite message overlay
  const FavoriteMessage = () => {
    if (!favoriteMessage) return null;
    return (
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
    );
  };

  // Handle chat button click
  const handleChatClick = (jeep, e) => {
    e.stopPropagation();
    // Save the driver ID to sessionStorage so we can scroll to it when coming back
    sessionStorage.setItem('lastViewedDriverId', jeep.id);
    sessionStorage.setItem('scrollToDriver', 'true');
    // Save selectedDestination to sessionStorage to preserve it when navigating back
    if (selectedDestination) {
      sessionStorage.setItem('selectedDestination', selectedDestination);
      sessionStorage.setItem('showDestinationSelector', 'false');
    }
    navigate(`/jeep-profile/${jeep.id}?openChat=true`);
  };

  // Clear filters completely
  const clearFilters = () => {
    setFilters({
      rating: '',
      priceRange: '',
      vehicleType: '',
      languages: [],
      specialSkills: [],
      certifications: [],
    });
    
    // Clear destination filter if callback is provided
    if (onClearDestination) {
      onClearDestination();
    }

    // The useEffect will automatically update filteredJeeps when filters change
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

  // Profile Image Component with proper error handling - Round fit
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
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">🚙</span>
            </div>
            <p className="text-sm font-medium text-gray-600">No Photo</p>
          </div>
        </div>
      );
    }

    // Show image with proper loading states - fit to round
    return (
      <div className="w-full h-full relative">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          </div>
        )}
        <img
          src={jeep.imageUrl}
          alt={jeep.driverName}
          className={`w-full h-full object-cover rounded-full ${imageLoaded ? 'opacity-100' : 'opacity-0'
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
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
              className="w-full bg-emerald-500 text-white py-3 px-6 rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
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
    <div id="jeep-drivers-section" className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <FavoriteMessage />
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-emerald-900 mb-4">Safari Jeep Drivers</h1>
          <p className="text-lg text-emerald-700 max-w-2xl mx-auto">
            Discover experienced safari jeep drivers for your wildlife adventures. Filter by your preferences to find the perfect match.
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-emerald-100 p-6 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-emerald-900">Filter Safari Jeeps</h2>
              <p className="text-emerald-700 text-sm mt-1">
                Refine your search to find the perfect match
              </p>
            </div>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-500/30"
            >
              Clear All Filters
            </button>
          </div>

          {/* Single Row Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ratings Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                Price Range
              </label>
              <select
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                Vehicle Type
              </label>
              <select
                value={filters.vehicleType}
                onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
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
                Languages
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.languages.map(language => (
                  <div key={language} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`lang-${language}`}
                      checked={filters.languages.includes(language)}
                      onChange={() => handleMultiSelectChange('languages', language)}
                      className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
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
                Services
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.specialSkills.map(skill => (
                  <div key={skill} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`skill-${skill}`}
                      checked={filters.specialSkills.includes(skill)}
                      onChange={() => handleMultiSelectChange('specialSkills', skill)}
                      className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
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
                      className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
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
            Found <span className="font-bold text-emerald-600">{filteredJeeps.length}</span> jeep{filteredJeeps.length !== 1 ? 's' : ''} 
            {jeeps.length > 0 && ` out of ${jeeps.length} total`}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Chat available
            </span>
          </div>
        </div>

        {/* Jeep Grid - Divided into Certified and Uncertified */}
        {filteredJeeps.length > 0 ? (
          <div className="space-y-12">
            {/* Certified Drivers Section - Always Show */}
            <div>
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Certified Drivers
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Verified and certified by our admin team
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredJeeps.filter(jeep => jeep.certificationStatus === 'certified').length}
                  </div>
                </div>
              </div>
              {filteredJeeps.filter(jeep => jeep.certificationStatus === 'certified').length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredJeeps
                    .filter(jeep => jeep.certificationStatus === 'certified')
                    .map((jeep, index) => (
                      <div 
                        key={jeep.id}
                        id={`driver-card-${jeep.id}`}
                        className="bg-white rounded-none shadow-lg overflow-hidden border-2 border-green-500 cursor-pointer hover:shadow-2xl transition-shadow"
                        onClick={() => handleProfileClick(jeep)}
                      >
                        {/* Profile Image Section - Big Rounded */}
                        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          {/* Rounded Profile Image Container */}
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl relative">
                            <ProfileImage jeep={jeep} />
                          </div>
                          
                          {/* Certified Badge */}
                          <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10 flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            CERTIFIED
                          </div>

                          {/* Experience Badge */}
                          {jeep.experience > 0 && (
                            <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                              {jeep.experience}+ years
                            </div>
                          )}

                          {/* Current User Badge */}
                          {jeep.isCurrentUser && (
                            <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10">
                              Your Profile
                            </div>
                          )}
                        </div>

                        {/* Driver Details */}
                        <div className="p-5">
                          {/* Name */}
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                            {jeep.driverName}
                          </h3>

                          {/* Location */}
                          <div className="flex items-center gap-2 text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm line-clamp-1">{jeep.location}</p>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-semibold text-gray-700">
                              {jeep.rating || 'New'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({jeep.reviewCount || 0} reviews)
                            </span>
                          </div>

                          {/* Verified Badge */}
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <Shield className="h-3 w-3" />
                              <span>Verified Driver</span>
                            </div>
                          </div>

                          {/* Vehicle Type */}
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Vehicle Type:</p>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {jeep.vehicleType}
                            </p>
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

                          {/* Favorite Button */}
                          {currentUser && !jeep.isCurrentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(jeep.id);
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                userFavorites.includes(jeep.id)
                                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                                  : 'bg-black text-white hover:bg-gray-800'
                              }`}
                            >
                              {userFavorites.includes(jeep.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No certified drivers yet</p>
                  <p className="text-sm text-gray-400 mt-1">Drivers will appear here once certified by admin</p>
                </div>
              )}
            </div>

            {/* Uncertified/Pending Drivers Section - Always Show */}
            <div>
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Other Drivers
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Drivers pending certification review
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredJeeps.filter(jeep => jeep.certificationStatus !== 'certified').length}
                  </div>
                </div>
              </div>
              {filteredJeeps.filter(jeep => jeep.certificationStatus !== 'certified').length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredJeeps
                    .filter(jeep => jeep.certificationStatus !== 'certified')
                    .map((jeep, index) => (
                      <div 
                        key={jeep.id}
                        id={`driver-card-${jeep.id}`}
                        className="bg-white rounded-none shadow-lg overflow-hidden border border-gray-200 cursor-pointer"
                        onClick={() => handleProfileClick(jeep)}
                      >
                        {/* Profile Image Section - Big Rounded */}
                        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          {/* Rounded Profile Image Container */}
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-300 shadow-xl relative">
                            <ProfileImage jeep={jeep} />
                          </div>
                          
                          {/* Experience Badge */}
                          {jeep.experience > 0 && (
                            <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                              {jeep.experience}+ years
                            </div>
                          )}

                          {/* Current User Badge */}
                          {jeep.isCurrentUser && (
                            <div className="absolute bottom-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10">
                              Your Profile
                            </div>
                          )}
                        </div>

                        {/* Driver Details */}
                        <div className="p-5">
                          {/* Name */}
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                            {jeep.driverName}
                          </h3>

                          {/* Location */}
                          <div className="flex items-center gap-2 text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm line-clamp-1">{jeep.location}</p>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-semibold text-gray-700">
                              {jeep.rating || 'New'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({jeep.reviewCount || 0} reviews)
                            </span>
                          </div>

                          {/* Pending Badge */}
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                              <Clock className="h-3 w-3" />
                              <span>Pending Review</span>
                            </div>
                          </div>

                          {/* Vehicle Type */}
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Vehicle Type:</p>
                            <p className="text-sm text-gray-600 line-clamp-1">
                              {jeep.vehicleType}
                            </p>
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

                          {/* Favorite Button */}
                          {currentUser && !jeep.isCurrentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(jeep.id);
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                userFavorites.includes(jeep.id)
                                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                                  : 'bg-black text-white hover:bg-gray-800'
                              }`}
                            >
                              {userFavorites.includes(jeep.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No pending drivers</p>
                  <p className="text-sm text-gray-400 mt-1">All drivers have been certified</p>
                </div>
              )}
            </div>
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
                className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
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
      </div>
    </div>
  );
};

export default JeepSection2;