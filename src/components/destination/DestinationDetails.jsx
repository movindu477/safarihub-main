import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Calendar,
  TruckIcon,
  UserCircle
} from 'lucide-react';
import Navbar from '../home/Navbar';
import Footer from '../home/Footer';
import ChatList from '../ChatList';
import { GlobalNotificationBell } from '../../App';
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';

// ✅ Centralized imports - single source of truth
import { destinationNameMap, getDestinationById } from '../../data/destinations';
import { getCurrentWeather, getForecastWeather } from '../../data/weatherService';

// Initialize Firestore
const db = getFirestore();

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

// Helper function to get weather icon based on weather condition
const getWeatherIcon = (weatherMain, size = 16) => {
  const iconProps = { className: `h-${size} w-${size}` };

  switch (weatherMain?.toLowerCase()) {
    case 'clear':
      return <Sun {...iconProps} className={`h-${size} w-${size} text-amber-500`} />;
    case 'clouds':
      return <Cloud {...iconProps} className={`h-${size} w-${size} text-gray-500`} />;
    case 'rain':
    case 'drizzle':
      return <CloudRain {...iconProps} className={`h-${size} w-${size} text-blue-500`} />;
    case 'thunderstorm':
      return <CloudRain {...iconProps} className={`h-${size} w-${size} text-purple-500`} />;
    case 'snow':
      return <Cloud {...iconProps} className={`h-${size} w-${size} text-blue-300`} />;
    case 'mist':
    case 'fog':
    case 'haze':
      return <Cloud {...iconProps} className={`h-${size} w-${size} text-gray-400`} />;
    default:
      return <Sun {...iconProps} className={`h-${size} w-${size} text-amber-500`} />;
  }
};

// Helper function to format date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

export default function DestinationDetails({ user, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) {
  const { destinationId } = useParams();
  const navigate = useNavigate();
  
  // All hooks must be called before any conditional returns
  const [selectedAnimal, setSelectedAnimal] = useState(0);
  const [mapZoom, setMapZoom] = useState(12);
  const [jeepDrivers, setJeepDrivers] = useState([]);
  const [tourGuides, setTourGuides] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Weather state
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);
  
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (destination) {
      setMapZoom(destination.mapZoom || 12);
    }
  }, [destinationId, destination]);

  // Fetch jeep drivers and tour guides for this destination
  useEffect(() => {
    const fetchServiceProviders = async () => {
      if (!destination) return;

      setLoadingProviders(true);
      try {
        const destinationName = destination.name;
        const providersRef = collection(db, 'serviceProviders');

        // Fetch Jeep Drivers
        const jeepDriversQuery = query(
          providersRef,
          where('serviceType', '==', 'Jeep Driver'),
          where('destinations', 'array-contains', destinationName),
          limit(6)
        );
        const jeepDriversSnapshot = await getDocs(jeepDriversQuery);
        const jeepDriversData = jeepDriversSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJeepDrivers(jeepDriversData);

        // Fetch Tour Guides
        const tourGuidesQuery = query(
          providersRef,
          where('serviceType', '==', 'Tour Guide'),
          where('areasOfExpertise', 'array-contains', destinationName),
          limit(6)
        );
        const tourGuidesSnapshot = await getDocs(tourGuidesQuery);
        const tourGuidesData = tourGuidesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTourGuides(tourGuidesData);

      } catch (error) {
        console.error('Error fetching service providers:', error);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchServiceProviders();
  }, [destination]);

  // Fetch weather data when destination changes
  useEffect(() => {
    if (!destination?.coordinates) return;

    const loadWeather = async () => {
      try {
        setLoadingWeather(true);
        setWeatherError(null);

        const { lat, lng } = destination.coordinates;

        const current = await getCurrentWeather(lat, lng);
        const forecastData = await getForecastWeather(lat, lng);

        setWeather(current);
        setForecast(forecastData);
      } catch (error) {
        console.error('Error fetching weather:', error);
        setWeatherError('Unable to load weather data. Please try again later.');
      } finally {
        setLoadingWeather(false);
      }
    };

    loadWeather();
  }, [destinationId]);

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

  const [showChatList, setShowChatList] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : null)}
        onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : null)}
        onOpenChatList={() => setShowChatList(true)}
      />

      {/* Chat List Modal */}
      {showChatList && user && (
        <ChatList
          user={user}
          onClose={() => setShowChatList(false)}
        />
      )}
      <GlobalNotificationBell 
        user={user}
        notifications={notifications}
        onNotificationClick={onNotificationClick}
        onMarkAsRead={onMarkAsRead}
      />


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
                      href="https://www.yalasrilanka.lk/"
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

                  {/* Population estimate display */}
                  {destination.animals[selectedAnimal].populationEstimate && (
                    <div className="mt-3 flex items-baseline gap-2">
                      <p className="text-xs uppercase tracking-wide text-emerald-200">
                        Estimated population
                      </p>
                      <p className="text-2xl md:text-3xl font-semibold text-white">
                        {destination.animals[selectedAnimal].populationEstimate}
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
                      className={`rounded-full transition-all ${index === selectedAnimal
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
                    className={`relative h-24 md:h-32 rounded-lg overflow-hidden border-2 transition-all ${index === selectedAnimal
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={animal.image}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 transition-colors ${index === selectedAnimal ? 'bg-black/20' : 'bg-black/30 hover:bg-black/20'
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

      {/* Available Service Providers Section */}
      <section className="py-20 md:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Available Service Providers
              </h2>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
              Professional jeep drivers and tour guides ready to assist your visit
              </p>
            </div>

          {loadingProviders ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading service providers...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Jeep Drivers */}
              {jeepDrivers.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <TruckIcon className="h-6 w-6 mr-2 text-green-600" />
                    Jeep Drivers
                  </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jeepDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/jeep-profile/${driver.id}`)}
                      >
                        <div className="relative h-48 overflow-hidden">
                    <img
                            src={driver.profilePicture || driver.imageUrl || '/api/placeholder/400/300'}
                            alt={driver.fullName || 'Jeep Driver'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg">
                      <Star className="h-4 w-4 text-amber-500 fill-current" />
                            <span className="text-sm font-semibold text-gray-900">
                              {driver.rating ? driver.rating.toFixed(1) : '0.0'}
                            </span>
                    </div>
                  </div>
                  <div className="p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                            {driver.fullName || 'Jeep Driver'}
                          </h4>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{driver.location || driver.baseLocation || 'Sri Lanka'}</span>
                    </div>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {driver.description || driver.bio || 'Experienced jeep driver'}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <span className="text-lg font-bold text-green-600">
                              {driver.currencyPreference === 'USD' ? '$' : 'LKR '}
                              {driver.dailyRate || driver.hourlyRate || 'Contact'}
                              {driver.dailyRate ? '/day' : driver.hourlyRate ? '/hr' : ''}
                        </span>
                            <button
                              className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/jeep-profile/${driver.id}`);
                              }}
                            >
                              View Profile →
                            </button>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  <div className="text-center mt-8">
                    <button
                      onClick={() => {
                        navigate('/jeep');
                        // Scroll to jeep drivers section after navigation
                        setTimeout(() => {
                          const section = document.getElementById('jeep-drivers-section');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      View All Jeep Drivers
                      <ArrowLeft className="ml-2 rotate-180" size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Tour Guides */}
              {tourGuides.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <UserCircle className="h-6 w-6 mr-2 text-green-600" />
                    Tour Guides
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tourGuides.map((guide) => (
                      <div
                        key={guide.id}
                        className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/guide-profile/${guide.id}`)}
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={guide.profilePicture || guide.imageUrl || '/api/placeholder/400/300'}
                            alt={guide.fullName || guide.guideName || 'Tour Guide'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg">
                            <Star className="h-4 w-4 text-amber-500 fill-current" />
                            <span className="text-sm font-semibold text-gray-900">
                              {guide.rating ? guide.rating.toFixed(1) : '0.0'}
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <h4 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                            {guide.fullName || guide.guideName || 'Tour Guide'}
                          </h4>
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{guide.location || guide.baseLocation || 'Sri Lanka'}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {guide.description || guide.bio || 'Experienced tour guide'}
                          </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <span className="text-lg font-bold text-green-600">
                              {guide.currencyPreference === 'USD' ? '$' : 'LKR '}
                              {guide.dailyRate || guide.hourlyRate || 'Contact'}
                              {guide.dailyRate ? '/day' : guide.hourlyRate ? '/hr' : ''}
                            </span>
                            <button
                              className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/guide-profile/${guide.id}`);
                              }}
                            >
                              View Profile →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
                  <div className="text-center mt-8">
                    <button
                      onClick={() => {
                        navigate('/guide');
                        // Scroll to guides section after navigation
                        setTimeout(() => {
                          const section = document.getElementById('guides-section');
                          if (section) {
                            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                      className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      View All Tour Guides
                      <ArrowLeft className="ml-2 rotate-180" size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* No providers found message */}
              {jeepDrivers.length === 0 && tourGuides.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Service Providers Available
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Currently, there are no registered jeep drivers or tour guides for this destination.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => navigate('/jeep')}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Browse All Jeep Drivers
                    </button>
                    <button
                      onClick={() => navigate('/guide')}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Browse All Tour Guides
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
              Live weather data and forecast for {destination.name}
            </p>
          </div>

          {loadingWeather ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 md:p-12">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Loading weather data...</p>
              </div>
            </div>
          ) : weatherError ? (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-8 md:p-12">
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mr-4" />
                <div>
                  <p className="text-red-700 font-semibold">{weatherError}</p>
                  <p className="text-red-600 text-sm mt-1">Please check your internet connection</p>
                </div>
              </div>
            </div>
          ) : weather && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Current Weather Display */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Conditions</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                      {getWeatherIcon(weather.weather?.[0]?.main, 16)}
                    <div>
                        <p className="text-4xl font-bold text-gray-900">
                          {Math.round(weather.main?.temp || 0)}°C
                        </p>
                        <p className="text-gray-600 capitalize">
                          {weather.weather?.[0]?.description || 'N/A'}
                        </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Humidity</p>
                        <p className="font-semibold text-gray-900">{weather.main?.humidity || 0}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Wind Speed</p>
                        <p className="font-semibold text-gray-900">
                          {weather.wind?.speed ? `${weather.wind.speed.toFixed(1)} m/s` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-xs text-gray-500">Feels Like</p>
                        <p className="font-semibold text-gray-900">
                          {Math.round(weather.main?.feels_like || 0)}°C
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Cloudiness</p>
                        <p className="font-semibold text-gray-900">{weather.clouds?.all || 0}%</p>
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

              {/* 5-Day Forecast */}
              {forecast && forecast.list && (
            <div className="mt-8 pt-8 border-t border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">5-Day Forecast</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {forecast.list
                      .filter((item, index) => index % 8 === 0) // Get one forecast per day (every 8th item = 24 hours)
                      .slice(0, 5) // Limit to 5 days
                      .map((day, index) => (
                        <div key={index} className="bg-white rounded-lg border-2 border-gray-200 p-5 text-center hover:border-blue-300 transition-colors">
                          <p className="font-semibold text-gray-900 text-sm mb-1">
                            {index === 0 ? 'Today' : formatDate(day.dt_txt)}
                          </p>
                    <div className="flex justify-center mb-4">
                            {getWeatherIcon(day.weather?.[0]?.main, 8)}
                    </div>
                          <p className="text-2xl font-semibold text-gray-900 mb-1">
                            {Math.round(day.main?.temp || 0)}°C
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {day.weather?.[0]?.description || 'N/A'}
                          </p>
                  </div>
                ))}
              </div>
            </div>
              )}
          </div>
          )}
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

