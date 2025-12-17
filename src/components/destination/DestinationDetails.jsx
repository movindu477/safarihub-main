import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Camera, 
  Clock, 
  Users, 
  Star,
  Hotel,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplet,
  Thermometer,
  Lightbulb,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from '../home/Navbar';
import Footer from '../home/Footer';
import { GlobalNotificationBell, ScrollToTopButton } from '../../App';

// ✅ Centralized imports - single source of truth
import { destinationNameMap, getDestinationById } from '../../data/destinations';

// Map each destination ID to a guide expertise category from registration form
const guideExpertiseByDestinationId = {
  'yala-national-park': 'National Parks',
  'wilpattu-national-park': 'National Parks',
  'horton-plains': 'Camping Sites',
  'knuckles-mountain-range': 'Mountain Regions',
  'knuckles-forest-reserve': 'Mountain Regions',
  'lunugamvehera': 'National Parks',
  'kumana-wildlife': 'Wildlife Sanctuaries',
  'sinharaja-forest-reserve': 'Forest Reserves',
  'mirissa-beach': 'Beaches & Coastal Areas',
  'unawatuna-beach': 'Beaches & Coastal Areas'
};

// Simple animated counter for population numbers
function AnimatedCounter({ value, duration = 1500 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value == null || isNaN(value)) return;

    let frameId;
    const startTime = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(progress * value);
      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export default function DestinationDetails({ user, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) {
  const { destinationId } = useParams();
  const navigate = useNavigate();
  
  // All hooks must be called before any conditional returns
  const [selectedAnimal, setSelectedAnimal] = useState(0);
  const [mapZoom, setMapZoom] = useState(12);
  const [jeepDrivers, setJeepDrivers] = useState([]);
  const [tourGuides, setTourGuides] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState(null);
  
  // Early return if no destinationId (AFTER all hooks)
  if (!destinationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Destination</h2>
          <button
            onClick={() => navigate('/destination')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Destinations
          </button>
        </div>
      </div>
    );
  }

  // ✅ Get destination from centralized store
  const destination = getDestinationById(destinationId);
  const firestoreDestinationName = destinationNameMap[destinationId] || destination?.name || '';
  const guideExpertise = guideExpertiseByDestinationId[destinationId] || '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (destination) {
      setMapZoom(destination.mapZoom || 12);
    }
  }, [destinationId, destination]);

  // Load related jeep drivers & guides for this destination
  useEffect(() => {
    if (!destinationId || !firestoreDestinationName) return;

    let isCancelled = false;

    const loadProviders = async () => {
      try {
        setProvidersLoading(true);
        setProvidersError(null);

        const serviceProvidersRef = collection(db, 'serviceProviders');

        const [jeepSnapshot, guideSnapshot] = await Promise.all([
          getDocs(
            query(
              serviceProvidersRef,
              where('serviceType', '==', 'Jeep Driver'),
              limit(50)
            )
          ),
          getDocs(
            query(
              serviceProvidersRef,
              where('serviceType', '==', 'Tour Guide'),
              limit(50)
            )
          )
        ]);

        if (isCancelled) return;

        const normalizedDestinationName = firestoreDestinationName.toLowerCase();

        // Transform and filter jeep drivers
        const allJeeps = jeepSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const destinations = Array.isArray(data.destinations)
            ? data.destinations
            : data.destinations
            ? [data.destinations]
            : [];

          return {
            id: docSnap.id,
            driverName: data.fullName || data.driverName || 'Safari Driver',
            imageUrl: data.profilePicture || data.imageUrl || '',
            location: data.location || data.baseLocation || 'Sri Lanka',
            rating:
              typeof data.rating === 'number'
                ? data.rating
                : typeof data.rating === 'string'
                ? parseFloat(data.rating) || 0
                : 0,
            totalReviews: data.totalReviews || 0,
            pricePerDay: data.pricePerDay || data.price || data.dailyRate || 0,
            vehicleType: data.vehicleType || 'Standard Safari Jeep',
            experience: data.experienceYears || data.experience || 0,
            destinations
          };
        });

        const filteredJeeps = allJeeps
          .filter((jeep) =>
            jeep.destinations.some(
              (dest) =>
                typeof dest === 'string' &&
                dest.toLowerCase().includes(normalizedDestinationName)
            )
          )
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 4);

        // Transform and filter tour guides
        const allGuides = guideSnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const areasOfExpertise = Array.isArray(data.areasOfExpertise)
            ? data.areasOfExpertise
            : data.areasOfExpertise
            ? [data.areasOfExpertise]
            : [];

          return {
            id: docSnap.id,
            guideName: data.fullName || data.guideName || 'Tour Guide',
            imageUrl: data.profilePicture || data.imageUrl || '',
            location: data.location || data.baseLocation || 'Sri Lanka',
            rating:
              typeof data.rating === 'number'
                ? data.rating
                : typeof data.rating === 'string'
                ? parseFloat(data.rating) || 0
                : 0,
            totalReviews: data.totalReviews || 0,
            hourlyRate: data.hourlyRate || 0,
            dailyRate: data.dailyRate || 0,
            currencyPreference: data.currencyPreference || 'LKR',
            areasOfExpertise
          };
        });

        const normalizedExpertise = guideExpertise.toLowerCase();

        const filteredGuides = allGuides
          .filter((guide) =>
            !normalizedExpertise
              ? true
              : guide.areasOfExpertise.some(
                  (area) =>
                    typeof area === 'string' &&
                    area.toLowerCase().includes(normalizedExpertise)
                )
          )
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 4);

        setJeepDrivers(filteredJeeps);
        setTourGuides(filteredGuides);
      } catch (error) {
        console.error('Error loading related providers:', error);
        if (!isCancelled) {
          setProvidersError('Failed to load related jeep drivers and guides.');
        }
      } finally {
        if (!isCancelled) {
          setProvidersLoading(false);
        }
      }
    };

    loadProviders();

    return () => {
      isCancelled = true;
    };
  }, [destinationId, firestoreDestinationName, guideExpertise]);

  if (!destination) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Destination Not Found</h2>
          <button
            onClick={() => navigate('/destination')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Destinations
          </button>
        </div>
      </div>
    );
  }

  const handlePreviousAnimal = () => {
    setSelectedAnimal((prev) => (prev === 0 ? destination.animals.length - 1 : prev - 1));
  };

  const handleNextAnimal = () => {
    setSelectedAnimal((prev) => (prev === destination.animals.length - 1 ? 0 : prev + 1));
  };

  const handleZoomIn = () => {
    setMapZoom((prev) => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setMapZoom((prev) => Math.max(prev - 1, 8));
  };

  const getWeatherIcon = (weatherMain) => {
    switch (weatherMain) {
      case 'Clear':
        return <Sun className="h-6 w-6 text-amber-500" />;
      case 'Clouds':
        return <Cloud className="h-6 w-6 text-gray-400" />;
      case 'Rain':
        return <CloudRain className="h-6 w-6 text-gray-500" />;
      default:
        return <Cloud className="h-6 w-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar user={user} onLogout={onLogout} onShowAuth={onShowAuth} />
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={onNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />

      <ScrollToTopButton />

      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[75vh] flex items-end overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${destination.backgroundImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
          <button
            onClick={() => navigate('/destination')}
            className="mb-8 inline-flex items-center text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="mr-2" size={18} />
            Back to Destinations
          </button>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight">
            {destination.name}
          </h1>
          <p className="text-base md:text-lg lg:text-xl max-w-2xl text-white/90 leading-relaxed">
            {destination.description}
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 tracking-tight">
                About {destination.name}
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {destination.fullDescription}
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sticky top-24">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Facts</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{destination.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Best Time to Visit</p>
                      <p className="font-medium text-gray-900">{destination.bestTimeToVisit}</p>
                    </div>
                  </div>
                  {destination.area && (
                    <div className="flex items-start">
                      <Navigation className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Area</p>
                        <p className="font-medium text-gray-900">{destination.area}</p>
                      </div>
                    </div>
                  )}
                  {destination.established && (
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Established</p>
                        <p className="font-medium text-gray-900">{destination.established}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* External official / park site link for Yala */}
                {destination.id === 'yala-national-park' && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <a
                      href="https://yalasrilanka.lk/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Visit Yala National Park Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animal Gallery Section */}
      {destination.animals && destination.animals.length > 0 && (
        <section className="py-20 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Wildlife & Animals
              </h2>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Discover the amazing wildlife that calls this destination home
              </p>
            </div>

            <div className="space-y-8">
              {/* Main Animal Display */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-900" style={{ height: '500px' }}>
                <img
                  src={destination.animals[selectedAnimal].image}
                  alt={destination.animals[selectedAnimal].name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                
                {/* Navigation Buttons */}
                <button
                  onClick={handlePreviousAnimal}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 p-2.5 rounded-full border border-gray-200 shadow-sm transition-all"
                  aria-label="Previous animal"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNextAnimal}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white text-gray-900 p-2.5 rounded-full border border-gray-200 shadow-sm transition-all"
                  aria-label="Next animal"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Animal Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-2">
                    {destination.animals[selectedAnimal].name}
                  </h3>
                  <p className="text-sm md:text-base text-white/90 max-w-2xl">
                    {destination.animals[selectedAnimal].description}
                  </p>

                  {/* Animated population counter when we have a numeric estimate */}
                  {destination.animals[selectedAnimal].populationEstimate && (
                    <div className="mt-3 flex items-baseline gap-2">
                      <p className="text-xs uppercase tracking-wide text-emerald-200">
                        Estimated population
                      </p>
                      <p className="text-2xl md:text-3xl font-semibold text-white">
                        <AnimatedCounter value={destination.animals[selectedAnimal].populationEstimate} />
                      </p>
                    </div>
                  )}

                  {/* Qualitative abundance / notes */}
                  {destination.animals[selectedAnimal].abundance && (
                    <p className="mt-2 text-xs md:text-sm text-emerald-200 max-w-2xl">
                      {destination.animals[selectedAnimal].abundance}
                    </p>
                  )}
                </div>

                {/* Indicator Dots */}
                <div className="absolute bottom-6 right-6 flex gap-2">
                  {destination.animals.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnimal(index)}
                      className={`rounded-full transition-all ${
                        index === selectedAnimal 
                          ? 'bg-white h-2 w-8' 
                          : 'bg-white/50 hover:bg-white/75 h-2 w-2'
                      }`}
                      aria-label={`Go to ${destination.animals[index].name}`}
                    />
                  ))}
                </div>
              </div>

              {/* Animal Thumbnails */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {destination.animals.map((animal, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnimal(index)}
                    className={`relative h-24 md:h-32 rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedAnimal 
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={animal.image}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 transition-colors ${
                      index === selectedAnimal ? 'bg-black/20' : 'bg-black/30 hover:bg-black/20'
                    }`}></div>
                    <p className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-xs font-medium text-center bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5">
                      {animal.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Map Section */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Location Map
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              Explore the location and surrounding areas
            </p>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200" style={{ height: '500px' }}>
            {/* Map Container */}
            <div className="absolute inset-0">
              {destination.mapEmbedUrl ? (
                <iframe
                  title={`${destination.name} Location Map`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={destination.mapEmbedUrl}
                ></iframe>
              ) : (
                <iframe
                  title={`${destination.name} Location Map`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6d_s6X4pbYwH1hc&center=${destination.coordinates.lat},${destination.coordinates.lng}&zoom=${mapZoom}&maptype=roadmap`}
                ></iframe>
              )}
            </div>

            {/* Map Controls - Only show if using dynamic map */}
            {!destination.mapEmbedUrl && (
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-md border border-gray-200 transition-colors"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="bg-white hover:bg-gray-50 text-gray-700 p-2 rounded-lg shadow-md border border-gray-200 transition-colors"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={20} />
                </button>
              </div>
            )}

            {/* Location Info Card */}
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">{destination.name}</p>
                  <p className="text-sm text-gray-600">{destination.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Accommodations Section */}
      {destination.accommodations && destination.accommodations.length > 0 && (
        <section className="py-20 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Nearby Accommodations
              </h2>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Find the perfect place to stay during your visit
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {destination.accommodations.map((accommodation, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={accommodation.image}
                      alt={accommodation.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-current" />
                      <span className="text-sm font-semibold text-gray-900">{accommodation.rating}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{accommodation.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{accommodation.distance}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{accommodation.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {accommodation.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-lg font-semibold text-gray-900">{accommodation.price}</span>
                      <button className="text-green-600 hover:text-green-700 font-medium text-sm">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Jeep Drivers & Tour Guides */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Local Jeep Drivers & Tour Guides
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              Connect with trusted local experts who operate in and around {destination.name}.
            </p>
          </div>

          {providersError && (
            <div className="mb-6 text-center text-sm text-red-600">
              {providersError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Jeep Drivers Column */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Jeep Drivers
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/driver')}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  View all drivers
                </button>
              </div>

              {providersLoading && jeepDrivers.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Loading jeep drivers...
                </div>
              ) : jeepDrivers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No jeep drivers have registered for this destination yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {jeepDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => navigate(`/jeepprofile?driverId=${driver.id}`)}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-4 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {driver.imageUrl ? (
                          <img
                            src={driver.imageUrl}
                            alt={driver.driverName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                            JD
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {driver.driverName}
                          </p>
                          {driver.rating > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Star className="h-4 w-4 fill-current" />
                              <span>{driver.rating.toFixed(1)}</span>
                              <span className="text-gray-400">
                                ({driver.totalReviews || 0})
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{driver.location}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{driver.experience || 0} years experience</span>
                        </p>
                      </div>
                      {driver.pricePerDay > 0 && (
                        <div className="text-right text-sm font-semibold text-gray-900">
                          LKR {driver.pricePerDay.toLocaleString()}
                          <span className="block text-xs text-gray-500">per day</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tour Guides Column */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Tour Guides
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/guide')}
                  className="text-sm font-medium text-green-600 hover:text-green-700"
                >
                  View all guides
                </button>
              </div>

              {providersLoading && tourGuides.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  Loading tour guides...
                </div>
              ) : tourGuides.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tour guides specializing in this destination type have registered yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {tourGuides.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => navigate(`/guide-profile/${guide.id}`)}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center gap-4 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {guide.imageUrl ? (
                          <img
                            src={guide.imageUrl}
                            alt={guide.guideName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                            TG
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {guide.guideName}
                          </p>
                          {guide.rating > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Star className="h-4 w-4 fill-current" />
                              <span>{guide.rating.toFixed(1)}</span>
                              <span className="text-gray-400">
                                ({guide.totalReviews || 0})
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{guide.location}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{guide.experience || 0} years experience</span>
                        </p>
                      </div>
                      {(guide.dailyRate || guide.hourlyRate) > 0 && (
                        <div className="text-right text-sm font-semibold text-gray-900">
                          {guide.currencyPreference || 'LKR'}{' '}
                          {(guide.dailyRate || guide.hourlyRate || 0).toLocaleString()}
                          <span className="block text-xs text-gray-500">
                            {guide.dailyRate ? 'per day' : 'per hour'}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Weather Section */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-3">
              Weather Information
            </h2>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              Seasonal information and weather patterns for {destination.name}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Current Weather Display */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Conditions</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Sun className="h-16 w-16 text-amber-500" />
                    <div>
                      <p className="text-4xl font-bold text-gray-900">28°C</p>
                      <p className="text-gray-600 capitalize">Clear Sky</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Humidity</p>
                      <p className="font-semibold text-gray-900">75%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Wind Speed</p>
                      <p className="font-semibold text-gray-900">3.5 m/s</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Time to Visit */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Best Time to Visit</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{destination.bestTimeToVisit}</p>
                      <p className="text-sm text-gray-600">Ideal weather conditions during this period</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Check seasonal weather patterns and plan your visit accordingly for the best experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Day Forecast Placeholder */}
            <div className="mt-8 pt-8 border-t border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">5-Day Forecast</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((day) => (
                  <div key={day} className="bg-white rounded-lg border-2 border-gray-200 p-5 text-center">
                    <p className="font-semibold text-gray-900 text-sm mb-1">Day {day}</p>
                    <div className="flex justify-center mb-4">
                      <Sun className="h-8 w-8 text-amber-500" />
                    </div>
                    <p className="text-2xl font-semibold text-gray-900 mb-1">28°C</p>
                    <p className="text-xs text-gray-500">Clear</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      {destination.tips && destination.tips.length > 0 && (
        <section className="py-20 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                Travel Tips
              </h2>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                Essential tips to make the most of your visit
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {destination.tips.map((tip, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="bg-green-100 rounded-full p-2 flex-shrink-0">
                    <Lightbulb className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-gray-700 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

