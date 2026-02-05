import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Clock,
  Star,
  MapPin,
  DollarSign,
  Eye,
  Trash2,
  TrendingUp,
  Package,
  Camera,
  Tent,
  X,
  ChevronRight,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import {
  getFavorites,
  getRecentlyViewed,
  removeFromFavorites,
  getRecommendations
} from '../services/personalizationService';

const PersonalizedDashboard = () => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recommendations, setRecommendations] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('favorites'); // favorites, recently-viewed, recommendations
  const [message, setMessage] = useState({ type: '', text: '' });
  const [favoritesFilter, setFavoritesFilter] = useState('all'); // all, jeep-driver, tour-guide, renting-shop
  const [recentlyViewedFilter, setRecentlyViewedFilter] = useState('all'); // all, jeep-driver, tour-guide, renting-shop

  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const loadData = async (userId) => {
    try {
      // Fetch from tourists collection (where favorites are actually stored)
      const touristDocRef = doc(db, 'tourists', userId);
      const touristDoc = await getDoc(touristDocRef);

      let favs = [];
      if (touristDoc.exists()) {
        const data = touristDoc.data();
        const jeepDriverIds = data.favoriteJeepDrivers || [];
        const guideIds = data.favoriteGuides || [];

        // Convert to the format expected by enrichItems
        favs = [
          ...jeepDriverIds.map(id => ({ itemId: id, itemType: 'jeep-driver' })),
          ...guideIds.map(id => ({ itemId: id, itemType: 'tour-guide' }))
        ];
      }

      const [recent, recs] = await Promise.all([
        getRecentlyViewed(userId),
        getRecommendations(userId, 'all', 6)
      ]);

      // Enrich favorites with current data
      const enrichedFavorites = await enrichItems(favs);
      const enrichedRecentlyViewed = await enrichItems(recent);

      setFavorites(enrichedFavorites);
      setRecentlyViewed(enrichedRecentlyViewed);
      setRecommendations(recs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading personalized data:', error);
      setLoading(false);
    }
  };

  const enrichItems = async (items) => {
    const enriched = [];

    for (const item of items) {
      let collectionName = '';
      let data = null;

      if (item.itemType === 'jeep-driver' || item.itemType === 'tour-guide' || item.itemType === 'renting-shop') {
        collectionName = 'serviceProviders';
      } else if (item.itemType === 'product') {
        collectionName = 'rentalProducts';
      } else if (item.itemType === 'package') {
        collectionName = 'servicePackages';
      }

      if (collectionName) {
        try {
          const itemRef = doc(db, collectionName, item.itemId);
          const itemDoc = await getDoc(itemRef);

          if (itemDoc.exists()) {
            data = itemDoc.data();
          }
        } catch (error) {
          console.error(`Error fetching ${item.itemType}:`, error);
        }
      }

      enriched.push({
        ...item,
        data
      });
    }

    return enriched.filter(item => item.data); // Only return items that still exist
  };

  const handleRemoveFavorite = async (itemId, itemType) => {
    if (!user) return;

    try {
      const touristDocRef = doc(db, 'tourists', user.uid);
      const fieldName = itemType === 'jeep-driver' ? 'favoriteJeepDrivers' : 'favoriteGuides';

      await updateDoc(touristDocRef, {
        [fieldName]: arrayRemove(itemId)
      });

      setFavorites(prev => prev.filter(item => item.itemId !== itemId));
      setMessage({ type: 'success', text: 'Removed from favorites' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error removing favorite:', error);
      setMessage({ type: 'error', text: 'Failed to remove favorite' });
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleShowAuth = (screen) => {
    // Navigate to login/register if needed, or handle via App context if available
    navigate('/login');
  };

  const handleViewItem = (item) => {
    const routes = {
      'jeep-driver': `/jeep-profile/${item.itemId}`,
      'tour-guide': `/guide-profile/${item.itemId}`,
      'renting-shop': `/renting-profile/${item.itemId}`,
      'product': `/product/${item.itemId}`,
      'package': `/package/${item.itemId}`
    };

    const route = routes[item.itemType];
    if (route) {
      navigate(route);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getItemIcon = (itemType) => {
    const icons = {
      'jeep-driver': Star,
      'tour-guide': Star,
      'product': Package,
      'renting-shop': Package,
      'package': Package
    };
    return icons[itemType] || Package;
  };

  const renderItemCard = (item, showRemove = false) => {
    if (!item.data) return null;

    const Icon = getItemIcon(item.itemType);
    const data = item.data;

    return (
      <div
        key={item.itemId}
        className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer group"
        onClick={() => handleViewItem(item)}
      >
        {/* Image */}
        <div className="relative h-40 bg-gray-900">
          {data.profilePicture || data.images?.[0] ? (
            <img
              src={data.profilePicture || data.images[0]}
              alt={data.fullName || data.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="h-12 w-12 text-gray-700" />
            </div>
          )}

          {/* Remove button for favorites */}
          {showRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFavorite(item.itemId, item.itemType);
              }}
              className="absolute top-3 right-3 p-2 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
          )}

          {/* Item type badge */}
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 bg-gray-900/90 backdrop-blur-sm rounded text-xs font-semibold text-white">
              {item.itemType.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="text-white font-bold mb-1 line-clamp-1">
            {data.fullName || data.title || 'Unknown'}
          </h3>

          {data.location && (
            <p className="text-sm text-gray-400 flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" />
              {data.location}
            </p>
          )}

          {data.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="text-sm text-gray-400">{data.rating.toFixed(1)}</span>
            </div>
          )}

          {(data.pricePerDay || data.fullDayPrice) && (
            <p className="text-emerald-400 font-bold">
              {formatPrice(data.pricePerDay || data.fullDayPrice)}/day
            </p>
          )}

          {item.viewedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Viewed {new Date(item.viewedAt).toLocaleDateString()}
            </p>
          )}

          {item.favoritedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Favorited {new Date(item.favoritedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    const allRecommendations = [
      ...recommendations.jeepDrivers?.map(item => ({ itemId: item.id, itemType: 'jeep-driver', data: item })) || [],
      ...recommendations.tourGuides?.map(item => ({ itemId: item.id, itemType: 'tour-guide', data: item })) || [],
      ...recommendations.products?.map(item => ({ itemId: item.id, itemType: 'product', data: item })) || [],
      ...recommendations.packages?.map(item => ({ itemId: item.id, itemType: 'package', data: item })) || []
    ];

    return allRecommendations;
  };

  // Filter items by service type
  const filterItemsByType = (items, filterType) => {
    if (filterType === 'all') return items;
    return items.filter(item => item.itemType === filterType);
  };

  // Get counts for each service type
  const getServiceTypeCounts = (items) => {
    return {
      jeepDrivers: items.filter(item => item.itemType === 'jeep-driver').length,
      tourGuides: items.filter(item => item.itemType === 'tour-guide').length,
      rentingShops: items.filter(item => item.itemType === 'renting-shop').length
    };
  };

  // Render service provider sections
  const renderServiceProviderSections = (items, showRemove = false) => {
    const jeepDrivers = items.filter(item => item.itemType === 'jeep-driver');
    const tourGuides = items.filter(item => item.itemType === 'tour-guide');
    const rentingShops = items.filter(item => item.itemType === 'renting-shop');

    return (
      <div className="space-y-8">
        {/* Jeep Drivers Section */}
        {jeepDrivers.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-emerald-500" />
              Jeep Drivers ({jeepDrivers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jeepDrivers.map(item => renderItemCard(item, showRemove))}
            </div>
          </div>
        )}

        {/* Tour Guides Section */}
        {tourGuides.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-emerald-500" />
              Tour Guides ({tourGuides.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tourGuides.map(item => renderItemCard(item, showRemove))}
            </div>
          </div>
        )}

        {/* Renting Stores Section */}
        {rentingShops.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-500" />
              Renting Stores ({rentingShops.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rentingShops.map(item => renderItemCard(item, showRemove))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400">Please log in to view your personalized content</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your personalized content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} onLogin={handleShowAuth} onRegister={handleShowAuth} />

      <div className="flex-1 pt-32 pb-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-6 w-6 text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                For You
              </h1>
              <p className="text-gray-400 text-sm">Your favorites and recommendations</p>
            </div>
          </div>



          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
              ? 'bg-emerald-900/20 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/20 border border-red-700 text-red-300'
              }`}>
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'favorites'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              <Heart className="h-5 w-5" />
              Favorites ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab('recently-viewed')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'recently-viewed'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              <Clock className="h-5 w-5" />
              Recently Viewed ({recentlyViewed.length})
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${activeTab === 'recommendations'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              <TrendingUp className="h-5 w-5" />
              Recommended for You
            </button>
          </div>

          {/* Content */}
          {activeTab === 'favorites' && (
            <div>
              <div className="flex flex-wrap items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Favorites</h2>

                {/* Service Type Filters */}
                {favorites.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                    <button
                      onClick={() => setFavoritesFilter('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${favoritesFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      All ({favorites.length})
                    </button>
                    <button
                      onClick={() => setFavoritesFilter('jeep-driver')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${favoritesFilter === 'jeep-driver'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Jeep Drivers ({getServiceTypeCounts(favorites).jeepDrivers})
                    </button>
                    <button
                      onClick={() => setFavoritesFilter('tour-guide')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${favoritesFilter === 'tour-guide'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Tour Guides ({getServiceTypeCounts(favorites).tourGuides})
                    </button>
                    <button
                      onClick={() => setFavoritesFilter('renting-shop')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${favoritesFilter === 'renting-shop'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Renting Stores ({getServiceTypeCounts(favorites).rentingShops})
                    </button>
                  </div>
                )}
              </div>

              {favorites.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
                  <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No favorites yet</p>
                  <p className="text-gray-500 text-sm">
                    Start exploring and save your favorite services and products
                  </p>
                </div>
              ) : favoritesFilter === 'all' ? (
                renderServiceProviderSections(favorites, true)
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterItemsByType(favorites, favoritesFilter).map(item => renderItemCard(item, true))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recently-viewed' && (
            <div>
              <div className="flex flex-wrap items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Recently Viewed</h2>

                {/* Service Type Filters */}
                {recentlyViewed.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                    <button
                      onClick={() => setRecentlyViewedFilter('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${recentlyViewedFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      All ({recentlyViewed.length})
                    </button>
                    <button
                      onClick={() => setRecentlyViewedFilter('jeep-driver')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${recentlyViewedFilter === 'jeep-driver'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Jeep Drivers ({getServiceTypeCounts(recentlyViewed).jeepDrivers})
                    </button>
                    <button
                      onClick={() => setRecentlyViewedFilter('tour-guide')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${recentlyViewedFilter === 'tour-guide'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Tour Guides ({getServiceTypeCounts(recentlyViewed).tourGuides})
                    </button>
                    <button
                      onClick={() => setRecentlyViewedFilter('renting-shop')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${recentlyViewedFilter === 'renting-shop'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      Renting Stores ({getServiceTypeCounts(recentlyViewed).rentingShops})
                    </button>
                  </div>
                )}
              </div>

              {recentlyViewed.length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
                  <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No recently viewed items</p>
                  <p className="text-gray-500 text-sm">
                    Items you view will appear here for quick access
                  </p>
                </div>
              ) : recentlyViewedFilter === 'all' ? (
                renderServiceProviderSections(recentlyViewed, false)
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterItemsByType(recentlyViewed, recentlyViewedFilter).map(item => renderItemCard(item, false))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Recommended for You</h2>
              <p className="text-gray-400 mb-6">
                Based on your bookings, favorites, and browsing history
              </p>

              {renderRecommendations().length === 0 ? (
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
                  <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-2">No recommendations yet</p>
                  <p className="text-gray-500 text-sm">
                    Start booking and browsing to get personalized recommendations
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderRecommendations().map(item => renderItemCard(item, false))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PersonalizedDashboard;
