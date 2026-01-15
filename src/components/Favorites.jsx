import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Heart, MapPin, Star, Car, Compass, Loader2, ChevronLeft } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import userImage from '../assets/user.png';

export default function Favorites({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [favoriteJeepDrivers, setFavoriteJeepDrivers] = useState([]);
  const [favoriteGuides, setFavoriteGuides] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    let isMounted = true;

    const fetchFavorites = async () => {
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
        if (touristDoc.exists()) {
          const data = touristDoc.data();
          const jeepDriverIds = data.favoriteJeepDrivers || [];
          const guideIds = data.favoriteGuides || [];

          // Fetch jeep driver details
          const jeepDriverPromises = jeepDriverIds.map(async (id) => {
            try {
              const jeepDoc = await getDoc(doc(db, 'serviceProviders', id));
              if (jeepDoc.exists()) {
                const jeepData = jeepDoc.data();
                return {
                  id,
                  driverName: jeepData.fullName || jeepData.driverName || 'Unknown',
                  imageUrl: jeepData.profilePicture || null,
                  location: jeepData.location || 'Not specified',
                  experience: jeepData.experience || jeepData.experienceYears || 0,
                  rating: jeepData.rating || 0,
                  serviceType: 'Jeep Driver'
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching jeep driver ${id}:`, error);
              return null;
            }
          });

          // Fetch guide details
          const guidePromises = guideIds.map(async (id) => {
            try {
              const guideDoc = await getDoc(doc(db, 'serviceProviders', id));
              if (guideDoc.exists()) {
                const guideData = guideDoc.data();
                return {
                  id,
                  guideName: guideData.fullName || guideData.guideName || 'Unknown',
                  imageUrl: guideData.profilePicture || null,
                  location: guideData.location || 'Not specified',
                  experience: guideData.experience || guideData.experienceYears || 0,
                  rating: guideData.rating || 0,
                  serviceType: 'Tour Guide'
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching guide ${id}:`, error);
              return null;
            }
          });

          const [jeepDrivers, guides] = await Promise.all([
            Promise.all(jeepDriverPromises),
            Promise.all(guidePromises)
          ]);

          if (isMounted) {
            setFavoriteJeepDrivers(jeepDrivers.filter(Boolean));
            setFavoriteGuides(guides.filter(Boolean));
          }
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        if (isMounted) {
          setMessage({ type: 'error', text: 'Failed to load favorites' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFavorites();

    // Set up real-time listener
    const unsubscribe = onSnapshot(doc(db, 'tourists', user.uid), (snapshot) => {
      if (snapshot.exists() && isMounted) {
        // Re-fetch favorites when data changes
        fetchFavorites();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user, db, navigate]);

  const handleRemoveFavorite = async (id, type) => {
    if (!user) return;

    try {
      const touristDocRef = doc(db, 'tourists', user.uid);
      const fieldName = type === 'Jeep Driver' ? 'favoriteJeepDrivers' : 'favoriteGuides';

      await updateDoc(touristDocRef, {
        [fieldName]: arrayRemove(id),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ type: 'success', text: `${type} removed from favorites` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error removing favorite:', error);
      setMessage({ type: 'error', text: 'Failed to remove favorite' });
    }
  };

  const handleProfileClick = (item) => {
    if (item.serviceType === 'Jeep Driver') {
      navigate(`/driver/${item.id}`);
    } else {
      navigate(`/guide/${item.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Favorites</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {/* Message */}
        {message.text && (
          <div className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg ${message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {message.text}
          </div>
        )}

        {/* Two Column Layout: Jeep Drivers | Guides */}
        <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Jeep Driver Favorites Section */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Favorite Jeep Drivers</h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                {favoriteJeepDrivers.length}
              </span>
            </div>

            {favoriteJeepDrivers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                <Car className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-base sm:text-lg font-medium">No favorite jeep drivers yet</p>
                <p className="text-gray-400 text-sm mt-2">Start exploring and add jeep drivers to your favorites!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {favoriteJeepDrivers.map((jeep) => (
                  <div
                    key={jeep.id}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                    onClick={() => handleProfileClick(jeep)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Profile Image Section - Full Size */}
                      <div className="w-full sm:w-64 h-64 sm:h-auto relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-green-300 shadow-xl relative group-hover:border-green-400 group-hover:shadow-2xl transition-all duration-300">
                          {jeep.imageUrl ? (
                            <img
                              src={jeep.imageUrl}
                              alt={jeep.driverName}
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${jeep.imageUrl ? 'hidden' : ''}`}>
                            <Car className="h-16 w-16 text-gray-400" />
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(jeep.id, jeep.serviceType);
                          }}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors z-10"
                          title="Remove from favorites"
                        >
                          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{jeep.driverName}</h3>
                          <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            <span className="font-medium">{jeep.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-base sm:text-lg font-bold text-gray-900">{jeep.rating.toFixed(1)}</span>
                            <span className="text-sm text-gray-500">rating</span>
                          </div>
                          {jeep.experience > 0 && (
                            <div className="px-3 py-1 bg-gray-100 rounded-full">
                              <span className="text-sm font-semibold text-gray-700">{jeep.experience}+ years</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guide Favorites Section */}
          <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Compass className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Favorite Guides</h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                {favoriteGuides.length}
              </span>
            </div>

            {favoriteGuides.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center min-h-[300px] flex flex-col items-center justify-center">
                <Compass className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-base sm:text-lg font-medium">No favorite guides yet</p>
                <p className="text-gray-400 text-sm mt-2">Start exploring and add guides to your favorites!</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {favoriteGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                    onClick={() => handleProfileClick(guide)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Profile Image Section - Full Size */}
                      <div className="w-full sm:w-64 h-64 sm:h-auto relative overflow-hidden bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-green-300 shadow-xl relative group-hover:border-green-400 group-hover:shadow-2xl transition-all duration-300">
                          {guide.imageUrl ? (
                            <img
                              src={guide.imageUrl}
                              alt={guide.guideName}
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${guide.imageUrl ? 'hidden' : ''}`}>
                            <Compass className="h-16 w-16 text-gray-400" />
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(guide.id, guide.serviceType);
                          }}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors z-10"
                          title="Remove from favorites"
                        >
                          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{guide.guideName}</h3>
                          <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 mb-3">
                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            <span className="font-medium">{guide.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-base sm:text-lg font-bold text-gray-900">{guide.rating.toFixed(1)}</span>
                            <span className="text-sm text-gray-500">rating</span>
                          </div>
                          {guide.experience > 0 && (
                            <div className="px-3 py-1 bg-gray-100 rounded-full">
                              <span className="text-sm font-semibold text-gray-700">{guide.experience}+ years</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
