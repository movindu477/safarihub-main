import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
  ChevronRight
} from 'lucide-react';
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
      const [favs, recent, recs] = await Promise.all([
        getFavorites(userId),
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

  const handleRemoveFavorite = async (itemId) => {
    if (!user) return;
    
    const result = await removeFromFavorites(user.uid, itemId);
    if (result.success) {
      setFavorites(prev => prev.filter(item => item.itemId !== itemId));
      setMessage({ type: 'success', text: 'Removed from favorites' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: 'Failed to remove favorite' });
    }
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
                handleRemoveFavorite(item.itemId);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400">Please log in to view your personalized content</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your personalized content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-emerald-500" />
            Your Personalized Dashboard
          </h1>
          <p className="text-gray-400">Your favorites, recently viewed items, and recommendations</p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
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
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Heart className="h-5 w-5" />
            Favorites ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('recently-viewed')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'recently-viewed'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Clock className="h-5 w-5" />
            Recently Viewed ({recentlyViewed.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'recommendations'
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
            <h2 className="text-2xl font-bold text-white mb-6">Your Favorites</h2>
            {favorites.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
                <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No favorites yet</p>
                <p className="text-gray-500 text-sm">
                  Start exploring and save your favorite services and products
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map(item => renderItemCard(item, true))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recently-viewed' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Recently Viewed</h2>
            {recentlyViewed.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No recently viewed items</p>
                <p className="text-gray-500 text-sm">
                  Items you view will appear here for quick access
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentlyViewed.map(item => renderItemCard(item, false))}
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
  );
};

export default PersonalizedDashboard;
