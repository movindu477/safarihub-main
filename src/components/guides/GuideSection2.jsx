import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Star, MapPin, Clock, Users, Shield, Award, Globe, Calendar } from 'lucide-react';

const GuideSection2 = ({ currentUser, userRole }) => {
  const [guides, setGuides] = useState([]);
  const [filteredGuides, setFilteredGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filter states
  const [filters, setFilters] = useState({
    expertise: '',
    rating: '',
    priceRange: '',
    qualification: '',
    languages: [],
    currency: ''
  });

  // Filter options
  const filterOptions = {
    expertiseAreas: [
      'National Parks',
      'Beaches & Coastal Areas',
      'Forest Reserves',
      'Camping Sites',
      'Wildlife Sanctuaries',
      'Cultural Heritage Sites',
      'Adventure Tourism',
      'Bird Watching Areas',
      'Historical Sites',
      'Mountain Regions'
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
    languages: [
      'English', 'Sinhala', 'Tamil', 'Hindi',
      'French', 'German', 'Chinese', 'Japanese',
      'Spanish', 'Korean', 'Russian', 'Arabic'
    ],
    currencies: [
      'LKR - Sri Lankan Rupee',
      'USD - US Dollar',
      'EUR - Euro',
      'GBP - British Pound'
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
            isCurrentUser: currentUser && currentUser.uid === providerId
          });
        }
      });

      const currentUserGuide = updatedGuides.find(g => g.isCurrentUser);

      console.log(`🗺️ Real-time data: ${updatedGuides.length} tour guides`);
      if (currentUserGuide) {
        console.log(`👤 Current user guide: ${currentUserGuide.guideName}`);
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

    // Expertise area filter
    if (filters.expertise) {
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

    // Price range filter (hourly rate)
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(guide => {
        const price = guide.hourlyRate || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Qualification filter
    if (filters.qualification) {
      filtered = filtered.filter(guide =>
        guide.specialQualifications?.some(qual =>
          qual.toLowerCase().includes(filters.qualification.toLowerCase())
        )
      );
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

    // Currency filter
    if (filters.currency) {
      filtered = filtered.filter(guide =>
        guide.currencyPreference?.toLowerCase().includes(filters.currency.toLowerCase())
      );
    }

    console.log('✅ Filtered results:', filtered.length);
    setFilteredGuides(filtered);
  }, [filters, guides]);

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
  // Handle profile box click - Navigate to guide profile with guide data
  const handleProfileClick = (guide) => {
    console.log('👤 Navigating to guide profile:', guide.id, guide.guideName);

    // Store the guide data in sessionStorage to pass to the profile page
    sessionStorage.setItem('currentGuideData', JSON.stringify(guide));

    // Save the guide ID to sessionStorage so we can scroll to it when coming back
    sessionStorage.setItem('lastViewedGuideId', guide.id);
    sessionStorage.setItem('scrollToGuide', 'true');

    // Navigate to guide profile - FIXED NAVIGATION
    navigate(`/guide-profile/${guide.id}`);
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

    navigate(`/guide-profile/${guide.id}?openChat=true`);
  };

  // Clear filters completely
  const clearFilters = () => {
    setFilters({
      expertise: '',
      rating: '',
      priceRange: '',
      qualification: '',
      languages: [],
      verification: [],
      currency: ''
    });

    setFilteredGuides(guides);
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

  // Profile Image Component with proper error handling
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
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">🧭</span>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        <img
          src={guide.imageUrl}
          alt={guide.guideName}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
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
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
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
    <div id="guides-section" className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-emerald-900 mb-4">Professional Tour Guides</h1>
          <p className="text-lg text-emerald-700 max-w-2xl mx-auto">
            Discover experienced tour guides for your Sri Lankan adventures. Filter by expertise, languages, and pricing to find your perfect guide.
          </p>

          {/* Current User Status Indicator */}
          {currentUser && (
            <div className="mt-4 p-3 bg-white/90 rounded-xl shadow-xl border border-emerald-100 max-w-md mx-auto backdrop-blur">
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">Your Profile:</span>{' '}
                {guides.find(g => g.isCurrentUser) ? (
                  <span className="text-green-600 font-medium">🟢 Listed - Other users can see your profile</span>
                ) : (
                  <span className="text-gray-500">⚫ Not listed - Register as a tour guide</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Filter Tour Guides</h2>
              <p className="text-gray-600 text-sm mt-1">
                Refine your search to find the perfect guide
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
            {/* Expertise Area Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Area of Expertise
              </label>
              <select
                value={filters.expertise}
                onChange={(e) => handleFilterChange('expertise', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Expertise Areas</option>
                {filterOptions.expertiseAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Ratings Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Ratings</option>
                {filterOptions.ratings.map(rating => (
                  <option key={rating.value} value={rating.value}>
                    {rating.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hourly Price Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hourly Rate
              </label>
              <select
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Hourly Rates</option>
                {filterOptions.priceRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Qualification Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Qualification
              </label>
              <select
                value={filters.qualification}
                onChange={(e) => handleFilterChange('qualification', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Qualifications</option>
                {filterOptions.qualifications.map(qual => (
                  <option key={qual} value={qual}>{qual}</option>
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
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`lang-${language}`} className="text-sm text-gray-700 flex-1">
                      {language}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Currency Preference Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Currency Preference
              </label>
              <select
                value={filters.currency}
                onChange={(e) => handleFilterChange('currency', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Currencies</option>
                {filterOptions.currencies.map(currency => (
                  <option key={currency} value={currency.split(' - ')[0]}>
                    {currency}
                  </option>
                ))}
              </select>
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

        {/* Guides Grid */}
        {filteredGuides.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGuides.slice(0, 12).map((guide, index) => (
              <div
                key={guide.id}
                id={`guide-card-${guide.id}`}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 cursor-pointer group"
                onClick={() => handleProfileClick(guide)}
              >
                {/* Profile Image Section */}
                <div className="h-48 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700">
                  <ProfileImage guide={guide} />
                  <div className="absolute inset-0 bg-emerald-900/35 pointer-events-none"></div>

                  {/* Experience Badge */}
                  {guide.experience > 0 && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {guide.experience}+ years
                    </div>
                  )}

                  {/* Featured Badge */}
                  {guide.featured && (
                    <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
                      ⭐ Featured
                    </div>
                  )}

                  {/* Current User Badge */}
                  {guide.isCurrentUser && (
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
                        {guide.guideName}
                        {guide.isCurrentUser && <span className="ml-1 text-purple-600 text-sm">(You)</span>}
                      </h3>
                      {/* Quick Chat Button - Show for all users except current user */}
                      {!guide.isCurrentUser && (
                        <button
                          className="ml-2 p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-lg"
                          onClick={(e) => handleChatClick(guide, e)}
                          title="Start Chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="line-clamp-1">{guide.location}</span>
                    </div>
                  </div>

                  {/* Rating and Pricing */}
                  <div className="flex justify-between items-center mb-3">
                    {renderStars(guide.rating || 0)}
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {guide.hourlyRate > 0 ? (
                          <>{getCurrencySymbol(guide.currencyPreference)}{formatPrice(guide.hourlyRate)}<span className="text-sm font-normal text-gray-500">/hour</span></>
                        ) : (
                          <span className="text-sm text-gray-500">Contact for price</span>
                        )}
                      </div>
                      {guide.dailyRate > 0 && (
                        <div className="text-sm text-gray-600">
                          {getCurrencySymbol(guide.currencyPreference)}{formatPrice(guide.dailyRate)}/day
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{guide.experience || 0}y</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Globe className="h-3 w-3" />
                      <span>{guide.languages?.length || 0} langs</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Shield className="h-3 w-3" />
                      <span>Verified</span>
                    </div>
                  </div>

                  {/* Expertise Areas */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Expertise:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {guide.areasOfExpertise?.slice(0, 3).join(', ')}
                      {guide.areasOfExpertise?.length > 3 && '...'}
                    </p>
                  </div>

                  {/* Qualifications */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Qualifications:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {guide.specialQualifications?.slice(0, 2).join(', ')}
                      {guide.specialQualifications?.length > 2 && '...'}
                    </p>
                  </div>

                  {/* Languages */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Languages:</p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {guide.languages?.slice(0, 3).join(', ')}
                      {guide.languages?.length > 3 && '...'}
                    </p>
                  </div>

                  {/* Action Buttons Removed */}
                </div>
              </div>
            ))}
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
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
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
        {filteredGuides.length > 12 && (
          <div className="text-center mt-8">
            <button className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold cursor-pointer">
              Load More Guides ({filteredGuides.length - 12} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuideSection2;