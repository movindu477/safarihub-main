/**
 * Reusable Recommendations Section Component
 * Can be embedded in home page, listing pages, and profile pages
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Star,
  MapPin,
  DollarSign,
  Heart,
  Eye,
  ChevronRight,
  Package,
  Camera,
  Tent
} from 'lucide-react';
import { getRecommendations, addToFavorites, isFavorited } from '../services/personalizationService';

const RecommendationsSection = ({ 
  userId, 
  type = 'all', 
  title = 'Recommended for You',
  subtitle = 'Based on your activity and preferences',
  limit = 6,
  showViewAll = true
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [userId, type, limit]);

  const loadRecommendations = async () => {
    try {
      const recs = await getRecommendations(userId, type, limit);
      
      // Convert recommendations object to array based on type
      let recsArray = [];
      if (type === 'all') {
        recsArray = [
          ...recs.jeepDrivers?.map(item => ({ ...item, itemType: 'jeep-driver' })) || [],
          ...recs.tourGuides?.map(item => ({ ...item, itemType: 'tour-guide' })) || [],
          ...recs.products?.map(item => ({ ...item, itemType: 'product' })) || [],
          ...recs.packages?.map(item => ({ ...item, itemType: 'package' })) || []
        ].slice(0, limit);
      } else if (type === 'jeepDrivers' || type === 'tourGuides' || type === 'products' || type === 'packages' || type === 'rentingShops') {
        recsArray = recs.map(item => ({
          ...item,
          itemType: type === 'jeepDrivers' ? 'jeep-driver' :
                    type === 'tourGuides' ? 'tour-guide' :
                    type === 'rentingShops' ? 'renting-shop' :
                    type
        }));
      }
      
      setRecommendations(recsArray);
      
      // Check which items are favorited
      const favStatus = {};
      for (const rec of recsArray) {
        favStatus[rec.id] = await isFavorited(userId, rec.id);
      }
      setFavorites(favStatus);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e, itemId, itemType, item) => {
    e.stopPropagation();
    
    if (!userId) return;
    
    const result = await addToFavorites(userId, itemId, itemType, {
      title: item.fullName || item.title,
      pricePerDay: item.pricePerDay || item.fullDayPrice,
      location: item.location
    });
    
    if (result.success) {
      setFavorites(prev => ({ ...prev, [itemId]: true }));
    }
  };

  const handleViewItem = (item) => {
    const routes = {
      'jeep-driver': `/jeep-profile/${item.id}`,
      'tour-guide': `/guide-profile/${item.id}`,
      'renting-shop': `/renting-profile/${item.id}`,
      'product': `/product/${item.id}`,
      'package': `/package/${item.id}`
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
      'package': Package,
      'renting-shop': Package
    };
    return icons[itemType] || Package;
  };

  if (!userId) {
    return null; // Don't show recommendations if not logged in
  }

  if (loading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-2 text-gray-400 text-sm">Loading recommendations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="py-12 bg-gray-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-emerald-500" />
              {title}
            </h2>
            <p className="mt-2 text-gray-400">{subtitle}</p>
          </div>
          {showViewAll && (
            <button
              onClick={() => navigate('/personalized-dashboard')}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
            >
              View All
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((item) => {
            const Icon = getItemIcon(item.itemType);
            const isFav = favorites[item.id];
            
            return (
              <div
                key={item.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all hover:scale-105 cursor-pointer group relative"
                onClick={() => handleViewItem(item)}
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-900">
                  {item.profilePicture || item.images?.[0] ? (
                    <img
                      src={item.profilePicture || item.images[0]}
                      alt={item.fullName || item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-12 w-12 text-gray-700" />
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => handleToggleFavorite(e, item.id, item.itemType, item)}
                    className="absolute top-3 right-3 p-2 bg-gray-900/80 hover:bg-gray-900 rounded-full transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        isFav ? 'fill-red-500 text-red-500' : 'text-white'
                      }`}
                    />
                  </button>
                  
                  {/* Type Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 bg-emerald-600/90 backdrop-blur-sm rounded text-xs font-semibold text-white">
                      {item.itemType.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                    {item.fullName || item.title}
                  </h3>
                  
                  {item.location && (
                    <p className="text-sm text-gray-400 flex items-center gap-1 mb-3">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </p>
                  )}
                  
                  {item.rating > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-gray-400">{item.rating.toFixed(1)}</span>
                      {item.totalReviews > 0 && (
                        <span className="text-sm text-gray-500">({item.totalReviews})</span>
                      )}
                    </div>
                  )}
                  
                  {(item.pricePerDay || item.fullDayPrice || item.priceFullDayStandard) && (
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <p className="text-lg font-bold text-emerald-400">
                        {formatPrice(item.pricePerDay || item.fullDayPrice || item.priceFullDayStandard)}
                        <span className="text-sm text-gray-500">/day</span>
                      </p>
                    </div>
                  )}
                  
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                      {item.description}
                    </p>
                  )}
                  
                  {/* View Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewItem(item);
                    }}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile View All Button */}
        {showViewAll && (
          <div className="mt-8 text-center md:hidden">
            <button
              onClick={() => navigate('/personalized-dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
            >
              View All Recommendations
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsSection;
