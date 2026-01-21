import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, limit, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Star, MapPin, Clock, Users, Shield, Award, Globe, Calendar } from 'lucide-react';

const GuideSection2 = ({ currentUser, userRole, selectedDestination, onClearDestination }) => {
  const [guides, setGuides] = useState([]);
  const [filteredGuides, setFilteredGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteMessage, setFavoriteMessage] = useState(null);
  const [userFavorites, setUserFavorites] = useState([]); // Track user's favorites
  const navigate = useNavigate();
  const auth = getAuth();

  // Scroll to guide card and restore scroll position when returning from profile page
  useEffect(() => {
    const shouldScroll = sessionStorage.getItem('scrollToGuide');
    const guideId = sessionStorage.getItem('lastViewedGuideId');
    
    if (shouldScroll === 'true' && filteredGuides.length > 0 && guideId) {
      console.log('🔄 Attempting to scroll to guide card:', guideId);
      
      // Function to scroll to the element
      const scrollToElement = () => {
        const element = document.getElementById(`guide-card-${guideId}`);
        if (element) {
          console.log('✅ Found guide card element, scrolling...');
          
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
          sessionStorage.removeItem('scrollToGuide');
          return true;
        }
        console.log('❌ Guide card element not found yet');
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
              sessionStorage.removeItem('scrollToGuide');
              console.log('⚠️ Could not find guide card after all attempts');
            }
          }, delays[attempt]);
        }
      };
      
      // Start attempting to scroll after initial delay
      setTimeout(() => {
        attemptScroll();
      }, 100);
      
      // Clean up saved scroll position after use
      const savedScrollPosition = sessionStorage.getItem('guideListingScrollPosition');
      if (savedScrollPosition) {
        sessionStorage.removeItem('guideListingScrollPosition');
      }
    }
  }, [filteredGuides]);

  // Filter states
  const [filters, setFilters] = useState({
    expertise: '',
    rating: '',
    qualification: '',
    certification: '', // Changed from array to single value
    languages: [],
    sortBy: '',
  });

  // Filter options
  const filterOptions = {
    expertiseAreas: [
      'National Parks',
      'Campsites',
      'Wetlands',
      'Beaches',
      'Forest Reserves',
      'Mountain Regions',
      'Cultural Heritage Sites',
      'Historical Sites',
      'Knowledgeable about animal behavior'
    ],
    ratings: [
      { value: '1', label: '1★ and above' },
      { value: '2', label: '2★ and above' },
      { value: '3', label: '3★ and above' },
      { value: '4', label: '4★ and above' },
      { value: '5', label: '5★ only' }
    ],
    priceRanges: [
      { value: '1000-2000', label: 'LKR 1,000 – 2,000 / hour' },
      { value: '2000-3000', label: 'LKR 2,000 – 3,000 / hour' },
      { value: '3000-5000', label: 'LKR 3,000 – 5,000 / hour' },
      { value: '5000-8000', label: 'LKR 5,000 – 8,000 / hour' },
      { value: '8000-12000', label: 'LKR 8,000 – 12,000 / hour' },
      { value: '12000-20000', label: 'LKR 12,000 – 20,000 / hour' }
    ],
    dailyPriceRanges: [
      { value: '5000-10000', label: 'LKR 5,000 – 10,000 / day' },
      { value: '10000-15000', label: 'LKR 10,000 – 15,000 / day' },
      { value: '15000-20000', label: 'LKR 15,000 – 20,000 / day' },
      { value: '20000-30000', label: 'LKR 20,000 – 30,000 / day' },
      { value: '30000-50000', label: 'LKR 30,000 – 50,000 / day' }
    ],
    qualifications: [
      'SLTDA Licensed Tour Guide',
      'National Tourist Guide (NTG)',
      'Chauffeur / Driver Guide License',
      'Diploma in Tourism & Hospitality',
      'Certificate in Tour Guiding',
      'Wildlife & Safari Guide Certification',
      'Eco-Tourism Guide Certification',
      'First Aid & CPR Certified',
      'English-Speaking Guide',
      'Multilingual Guide'
    ],
    certifications: [
      'Certified',
      'Uncertified'
    ],
    languages: [
      'English', 'Sinhala', 'Tamil', 'Hindi',
      'French', 'German', 'Chinese', 'Japanese',
      'Spanish', 'Korean', 'Russian', 'Arabic'
    ],
    sortBy: [
      { value: 'rating-desc', label: 'Highest Rating' },
      { value: 'rating-asc', label: 'Lowest Rating' },
      { value: 'price-asc', label: 'Price: Low to High' },
      { value: 'price-desc', label: 'Price: High to Low' },
      { value: 'experience-desc', label: 'Most Experience' },
      { value: 'name-asc', label: 'Name: A to Z' }
    ]
  };

  // Real-time data listener for tour guides
  useEffect(() => {
    console.log('🔔 Setting up real-time data listener for tour guides...');

    const serviceProvidersRef = collection(db, 'serviceProviders');
    const tourGuidesQuery = query(
      serviceProvidersRef,
      where('serviceType', '==', 'Tour Guide'),
      limit(50)
    );

    const unsubscribe = onSnapshot(tourGuidesQuery, (snapshot) => {
      console.log('🔄 Real-time tour guides data update received');

      const updatedGuides = [];

      snapshot.forEach((doc) => {
        const providerData = doc.data();
        const providerId = doc.id;

        // Only include Tour Guides
        if (providerData.serviceType === 'Tour Guide') {
          updatedGuides.push({
            id: providerId,
            // Personal Info
            guideName: providerData.fullName || providerData.guideName || 'Tour Guide',
            imageUrl: providerData.profilePicture || providerData.imageUrl || '',
            location: providerData.location || providerData.baseLocation || 'Sri Lanka',

            // Service Info
            rating: typeof providerData.rating === 'number' ? providerData.rating :
              typeof providerData.rating === 'string' ? parseFloat(providerData.rating) || 0 : 0,
            totalReviews: providerData.totalReviews || 0,
            hourlyRate: providerData.hourlyRate || 0,
            dailyRate: providerData.dailyRate || 0,
            specialPackageRates: providerData.specialPackageRates || '',
            currencyPreference: providerData.currencyPreference || 'LKR',
            experience: providerData.experienceYears || providerData.experience || 0,

            // Guide-specific arrays with proper fallbacks
            specialQualifications: Array.isArray(providerData.specialQualifications) ? providerData.specialQualifications :
              providerData.specialQualifications ? [providerData.specialQualifications] : [],
            areasOfExpertise: Array.isArray(providerData.areasOfExpertise) ? providerData.areasOfExpertise :
              providerData.areasOfExpertise ? [providerData.areasOfExpertise] : [],
            verificationDocuments: Array.isArray(providerData.verificationDocuments) ? providerData.verificationDocuments :
              providerData.verificationDocuments ? [providerData.verificationDocuments] : [],
            languages: Array.isArray(providerData.languages) ? providerData.languages :
              Array.isArray(providerData.languagesSpoken) ? providerData.languagesSpoken :
                providerData.languagesSpoken ? [providerData.languagesSpoken] :
                  providerData.languages ? [providerData.languages] :
                    ['English', 'Sinhala'],

            // Contact Info
            contactPhone: providerData.contactPhone || providerData.phone || providerData.phoneNumber || 'Not provided',
            contactEmail: providerData.contactEmail || providerData.email || '',
            description: providerData.description || providerData.bio || 'Experienced tour guide',

            // Additional fields
            featured: providerData.featured || false,
            availability: providerData.availability !== false,
            availableDates: providerData.availableDates || [],

            // Mark if this is the current user's profile
            isCurrentUser: currentUser && currentUser.uid === providerId,

            // Certification status
            certificationStatus: providerData.certificationStatus || 'uncertified',
            certifiedAt: providerData.certifiedAt || null,
            certifiedBy: providerData.certifiedBy || null,

          });
        }
      });

      const currentUserGuide = updatedGuides.find(g => g.isCurrentUser);
      const certifiedCount = updatedGuides.filter(g => g.certificationStatus === 'certified').length;
      const uncertifiedCount = updatedGuides.filter(g => g.certificationStatus !== 'certified').length;

      console.log(`🗺️ Real-time data: ${updatedGuides.length} tour guides (${certifiedCount} certified, ${uncertifiedCount} uncertified)`);
      if (currentUserGuide) {
        console.log(`👤 Current user guide: ${currentUserGuide.guideName} (Status: ${currentUserGuide.certificationStatus})`);
      }

      setGuides(updatedGuides);
      setFilteredGuides(updatedGuides);

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

    let filtered = [...guides];

    // Destination filter (from props - selectedDestination) - filter guides by destinations
    if (selectedDestination) {
      filtered = filtered.filter(guide =>
        guide.destinations?.some(dest =>
          dest.toLowerCase().includes(selectedDestination.toLowerCase())
        )
      );
    }

    // Expertise area filter (from filter dropdown) - only if no destination filter is active
    if (filters.expertise && !selectedDestination) {
      filtered = filtered.filter(guide =>
        guide.areasOfExpertise?.some(expertise =>
          expertise.toLowerCase().includes(filters.expertise.toLowerCase())
        )
      );
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      filtered = filtered.filter(guide =>
        (guide.rating || 0) >= minRating
      );
    }

    // Qualification filter
    if (filters.qualification) {
      filtered = filtered.filter(guide =>
        guide.specialQualifications?.some(qual =>
          qual.toLowerCase().includes(filters.qualification.toLowerCase())
        )
      );
    }

    // Certification filter - based on certification status (single selection)
    if (filters.certification) {
      if (filters.certification === 'Certified') {
        filtered = filtered.filter(guide => guide.certificationStatus === 'certified');
      } else if (filters.certification === 'Uncertified') {
        filtered = filtered.filter(guide => guide.certificationStatus !== 'certified');
      }
    }

    // Languages filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter(guide =>
        filters.languages.every(lang =>
          guide.languages?.some(gLang =>
            gLang.toLowerCase().includes(lang.toLowerCase())
          )
        )
      );
    }

    // Sort results
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'rating-desc':
            return (b.rating || 0) - (a.rating || 0);
          case 'rating-asc':
            return (a.rating || 0) - (b.rating || 0);
          case 'price-asc':
            return (a.hourlyRate || 0) - (b.hourlyRate || 0);
          case 'price-desc':
            return (b.hourlyRate || 0) - (a.hourlyRate || 0);
          case 'experience-desc':
            return (b.experience || 0) - (a.experience || 0);
          case 'name-asc':
            return (a.guideName || '').localeCompare(b.guideName || '');
          default:
            return 0;
        }
      });
    }

    console.log('✅ Filtered results:', filtered.length);
    setFilteredGuides(filtered);
  }, [filters, guides, selectedDestination]);

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

  // Handle profile box click - Navigate to guide profile with guide data
  const handleProfileClick = (guide) => {
    console.log('👤 Navigating to guide profile:', guide.id, guide.guideName);

    // Save current scroll position before navigating
    sessionStorage.setItem('guideListingScrollPosition', window.scrollY.toString());

    // Save current scroll position before navigating
    sessionStorage.setItem('guideListingScrollPosition', window.scrollY.toString());

    // Store the guide data in sessionStorage to pass to the profile page
    sessionStorage.setItem('currentGuideData', JSON.stringify(guide));

    // Save the guide ID to sessionStorage so we can scroll to it when coming back
    sessionStorage.setItem('lastViewedGuideId', guide.id);
    sessionStorage.setItem('scrollToGuide', 'true');
    // Save selectedDestination to sessionStorage to preserve it when navigating back
    if (selectedDestination) {
      sessionStorage.setItem('selectedDestination', selectedDestination);
      sessionStorage.setItem('showDestinationSelector', 'false');
    }

    // Navigate to guide profile - FIXED NAVIGATION
    navigate(`/guide-profile/${guide.id}`);
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
        setUserFavorites(data.favoriteGuides || []);
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
  const handleToggleFavorite = async (guideId) => {
    const user = auth.currentUser;
    if (!user) {
      return;
    }

    try {
      const touristDocRef = doc(db, 'tourists', user.uid);
      const touristDoc = await getDoc(touristDocRef);
      
      const existingFavorites = touristDoc.exists() 
        ? (touristDoc.data().favoriteGuides || [])
        : [];
      
      const isFavorited = existingFavorites.includes(guideId);
      
      if (touristDoc.exists()) {
        if (isFavorited) {
          // Remove from favorites
          await updateDoc(touristDocRef, {
            favoriteGuides: arrayRemove(guideId),
            updatedAt: serverTimestamp()
          }, { merge: true });
          setFavoriteMessage('Removed from favorites');
        } else {
          // Add to favorites
          await updateDoc(touristDocRef, {
            favoriteGuides: arrayUnion(guideId),
            updatedAt: serverTimestamp()
          }, { merge: true });
          setFavoriteMessage('Service provider added to favorite');
        }
      } else {
        // Create document if it doesn't exist
        await updateDoc(touristDocRef, {
          favoriteGuides: [guideId],
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
  const handleChatClick = (guide, e) => {
    e.stopPropagation();
    console.log('💬 Opening chat for guide:', guide.id);

    // Store guide data and navigate with chat parameter
    sessionStorage.setItem('currentGuideData', JSON.stringify(guide));

    // Save the guide ID to sessionStorage so we can scroll to it when coming back
    sessionStorage.setItem('lastViewedGuideId', guide.id);
    sessionStorage.setItem('scrollToGuide', 'true');
    // Save selectedDestination to sessionStorage to preserve it when navigating back
    if (selectedDestination) {
      sessionStorage.setItem('selectedDestination', selectedDestination);
      sessionStorage.setItem('showDestinationSelector', 'false');
    }

    navigate(`/guide-profile/${guide.id}?openChat=true`);
  };

  // Clear filters completely
  const clearFilters = () => {
    setFilters({
      expertise: '',
      rating: '',
      qualification: '',
      certification: '',
      languages: [],
      sortBy: ''
    });

    // Clear destination filter if callback is provided
    if (onClearDestination) {
      onClearDestination();
    }

    // The useEffect will automatically update filteredGuides when filters change
    console.log('🧹 All filters cleared, showing all guides:', guides.length);
  };

  // Format price with commas
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Contact for price';
    return new Intl.NumberFormat('en-LK').format(price);
  };

  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return 'LKR ';
    }
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
            {rating > 0 && <span className="text-xs text-gray-500 ml-1">• {guides.find(g => g.rating === rating)?.totalReviews || 0} reviews</span>}
          </span>
        )}
      </div>
    );
  };

  // Profile Image Component with proper error handling - Round fit
  const ProfileImage = ({ guide }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageError = () => {
      console.log(`❌ Image failed to load for ${guide.guideName}: ${guide.imageUrl}`);
      setImageError(true);
    };

    const handleImageLoad = () => {
      console.log(`✅ Image loaded successfully for ${guide.guideName}`);
      setImageLoaded(true);
    };

    // If no image URL or image failed to load, show placeholder
    if (!guide.imageUrl || imageError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">🧭</span>
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
          src={guide.imageUrl}
          alt={guide.guideName}
          className={`w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
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
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Tour Guides</h3>
          <p className="text-gray-500">Finding the best guides for your adventure...</p>
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
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold"
            >
              Try Again
            </button>
            <button
              onClick={clearFilters}
              className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="guides-section" className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <FavoriteMessage />
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-emerald-900 mb-4">Professional Tour Guides</h1>
          <p className="text-lg text-emerald-700 max-w-2xl mx-auto">
            Discover experienced tour guides for your Sri Lankan adventures. Filter by expertise, languages, and pricing to find your perfect guide.
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-emerald-100 p-6 mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-emerald-900">Filter Tour Guides</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">Default (Certified First)</option>
                {filterOptions.sortBy.map(sort => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Certification Filter - Moved to top row */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Certification
              </label>
              <select
                value={filters.certification}
                onChange={(e) => handleFilterChange('certification', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="" disabled hidden>Select Certification</option>
                {filterOptions.certifications.map(cert => (
                  <option key={cert} value={cert}>
                    {cert}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-select Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
                    <label htmlFor={`lang-${language}`} className="text-sm text-gray-700 cursor-pointer">
                      {language}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Area of Expertise Filter - Renamed to "Services" */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Services
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                {filterOptions.expertiseAreas.map(area => (
                  <div key={area} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`area-${area}`}
                      checked={filters.expertise === area}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('expertise', area);
                        } else {
                          handleFilterChange('expertise', '');
                        }
                      }}
                      className="mr-3 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`area-${area}`} className="text-sm text-gray-700 cursor-pointer">
                      {area}
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
            Found <span className="font-bold text-blue-600">{filteredGuides.length}</span> guide{filteredGuides.length !== 1 ? 's' : ''}
            {guides.length > 0 && ` out of ${guides.length} total`}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              Chat available
            </span>
            <span className="flex items-center gap-1">
              <Award className="h-4 w-4 text-green-500" />
              Certified guides
            </span>
          </div>
        </div>

        {/* Guides Grid - Divided into Certified and Uncertified */}
        {filteredGuides.length > 0 ? (
          <div className="space-y-12">
            {/* Certified Guides Section - Always Show */}
            <div>
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Certified Guides
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Verified and certified by our admin team
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredGuides.filter(guide => guide.certificationStatus === 'certified').length}
                  </div>
                </div>
              </div>
              {filteredGuides.filter(guide => guide.certificationStatus === 'certified').length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGuides
                    .filter(guide => guide.certificationStatus === 'certified')
                    .map((guide, index) => (
                      <div 
                        key={guide.id}
                        id={`guide-card-${guide.id}`}
                        className="bg-white rounded-none shadow-lg overflow-hidden border-2 border-green-500 cursor-pointer hover:shadow-2xl transition-shadow"
                        onClick={() => handleProfileClick(guide)}
                      >
                        {/* Profile Image Section */}
                        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl relative">
                            <ProfileImage guide={guide} />
                          </div>
                          
                          {/* Certified Badge */}
                          <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-10 flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" />
                            CERTIFIED
                          </div>

                          {/* Experience Badge */}
                          {guide.experience > 0 && (
                            <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                              {guide.experience}+ years
                            </div>
                          )}

                          {/* Current User Badge */}
                          {guide.isCurrentUser && (
                            <div className="absolute bottom-3 left-3 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10">
                              Your Profile
                            </div>
                          )}
                        </div>

                        {/* Guide Details */}
                        <div className="p-5">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                            {guide.guideName || guide.fullName}
                          </h3>

                          <div className="flex items-center gap-2 text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm line-clamp-1">{guide.location}</p>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-semibold text-gray-700">
                              {guide.rating || 'New'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({guide.reviewCount || 0} reviews)
                            </span>
                          </div>

                          {/* Verified Badge */}
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              <Shield className="h-3 w-3" />
                              <span>Verified Guide</span>
                            </div>
                          </div>

                          {/* Languages */}
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Languages:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {guide.languages?.slice(0, 3).join(', ')}
                              {guide.languages?.length > 3 && '...'}
                            </p>
                          </div>

                          {/* Specializations */}
                          {guide.specializations && guide.specializations.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-1">Specializations:</p>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {guide.specializations.slice(0, 2).join(', ')}
                                {guide.specializations.length > 2 && '...'}
                              </p>
                            </div>
                          )}

                          {/* Favorite Button */}
                          {currentUser && !guide.isCurrentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(guide.id);
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                userFavorites.includes(guide.id)
                                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                                  : 'bg-black text-white hover:bg-gray-800'
                              }`}
                            >
                              {userFavorites.includes(guide.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No certified guides yet</p>
                  <p className="text-sm text-gray-400 mt-1">Guides will appear here once certified by admin</p>
                </div>
              )}
            </div>

            {/* Uncertified/Pending Guides Section - Always Show */}
            <div>
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Uncertified Guides
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Guides pending certification review
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {filteredGuides.filter(guide => guide.certificationStatus !== 'certified').length}
                  </div>
                </div>
              </div>
              {filteredGuides.filter(guide => guide.certificationStatus !== 'certified').length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGuides
                    .filter(guide => guide.certificationStatus !== 'certified')
                    .map((guide, index) => (
                      <div 
                        key={guide.id}
                        id={`guide-card-${guide.id}`}
                        className="bg-white rounded-none shadow-lg overflow-hidden border border-gray-200 cursor-pointer"
                        onClick={() => handleProfileClick(guide)}
                      >
                        {/* Profile Image Section */}
                        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-green-500 shadow-xl relative">
                            <ProfileImage guide={guide} />
                          </div>
                          
                          {/* Experience Badge */}
                          {guide.experience > 0 && (
                            <div className="absolute top-3 right-3 bg-black text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                              {guide.experience}+ years
                            </div>
                          )}

                          {/* Current User Badge */}
                          {guide.isCurrentUser && (
                            <div className="absolute bottom-3 left-3 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg z-10">
                              Your Profile
                            </div>
                          )}
                        </div>

                        {/* Guide Details */}
                        <div className="p-5">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                            {guide.guideName}
                          </h3>

                          <div className="flex items-center gap-2 text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <p className="text-sm line-clamp-1">{guide.location}</p>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-semibold text-gray-700">
                              {guide.rating || 'New'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({guide.reviewCount || 0} reviews)
                            </span>
                          </div>

                          {/* Pending Badge */}
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                              <Clock className="h-3 w-3" />
                              <span>Pending Review</span>
                            </div>
                          </div>

                          {/* Languages */}
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-1">Languages:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {guide.languages?.slice(0, 3).join(', ')}
                              {guide.languages?.length > 3 && '...'}
                            </p>
                          </div>

                          {/* Specializations */}
                          {guide.specializations && guide.specializations.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-1">Specializations:</p>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {guide.specializations.slice(0, 2).join(', ')}
                                {guide.specializations.length > 2 && '...'}
                              </p>
                            </div>
                          )}

                          {/* Favorite Button */}
                          {currentUser && !guide.isCurrentUser && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(guide.id);
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                                userFavorites.includes(guide.id)
                                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                                  : 'bg-black text-white hover:bg-gray-800'
                              }`}
                            >
                              {userFavorites.includes(guide.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No uncertified guides</p>
                  <p className="text-sm text-gray-400 mt-1">All guides have been certified</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No Results Message */
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No guides found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {guides.length === 0
                ? "No tour guides are currently registered. Check back later or contact support."
                : "We couldn't find any tour guides matching your current filters. Try adjusting your search criteria."
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={clearFilters}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold"
            >
              Clear All Filters
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold"
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

export default GuideSection2;