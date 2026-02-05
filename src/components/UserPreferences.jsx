import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import {
  Settings,
  Bell,
  Shield,
  Trash2,
  Save,
  CheckCircle,
  X,
  MapPin,
  Tag,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import {
  getUserPreferences,
  updateUserPreferences,
  clearPersonalizationData
} from '../services/personalizationService';

// All 25 districts of Sri Lanka
const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya'
];

const UserPreferences = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Location dropdown state
  const [locationInput, setLocationInput] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredDistricts, setFilteredDistricts] = useState(SRI_LANKA_DISTRICTS);
  const locationDropdownRef = React.useRef(null);

  const auth = getAuth();
  const saveTimeoutRef = React.useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadPreferences(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const loadPreferences = async (userId) => {
    try {
      const prefs = await getUserPreferences(userId);
      setPreferences(prefs);
      setLocationInput(prefs.preferredLocation || '');
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  };

  // Auto-save function with debounce
  const autoSave = async (updatedPreferences) => {
    if (!user) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setHasUnsavedChanges(true);

    // Set new timeout for auto-save (1 second after last change)
    saveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true);
      const success = await updateUserPreferences(user.uid, updatedPreferences);

      setAutoSaving(false);
      setHasUnsavedChanges(false);

      if (success) {
        setMessage({ type: 'success', text: 'Auto-saved ✓' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      }
    }, 1000);
  };

  const handleChange = (key, value) => {
    const updatedPreferences = {
      ...preferences,
      [key]: value
    };
    setPreferences(updatedPreferences);
    autoSave(updatedPreferences);
  };

  const handleNestedChange = (parent, key, value) => {
    const updatedPreferences = {
      ...preferences,
      [parent]: {
        ...preferences[parent],
        [key]: value
      }
    };
    setPreferences(updatedPreferences);
    autoSave(updatedPreferences);
  };

  const handleArrayToggle = (key, value) => {
    const array = preferences[key] || [];
    const newArray = array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];

    const updatedPreferences = {
      ...preferences,
      [key]: newArray
    };
    setPreferences(updatedPreferences);
    autoSave(updatedPreferences);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const success = await updateUserPreferences(user.uid, preferences);

    if (success) {
      setMessage({ type: 'success', text: 'Preferences saved successfully' });
    } else {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    }

    setSaving(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
    navigate('/login');
  };

  const handleClearData = async () => {
    if (!user) return;

    if (!window.confirm('Are you sure you want to clear all your personalization data? This will remove your favorites, browsing history, and preferences. This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    const success = await clearPersonalizationData(user.uid);

    if (success) {
      setMessage({ type: 'success', text: 'All personalization data cleared' });
      loadPreferences(user.uid);
    } else {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    }

    setSaving(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Handle location input change with filtering
  const handleLocationInputChange = (value) => {
    setLocationInput(value);

    // Filter districts based on input
    const filtered = SRI_LANKA_DISTRICTS.filter(district =>
      district.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredDistricts(filtered);
    setShowLocationDropdown(true);

    // Update preferences if input is empty or matches a district
    if (value === '' || SRI_LANKA_DISTRICTS.includes(value)) {
      handleChange('preferredLocation', value);
    }
  };

  // Handle district selection from dropdown
  const handleDistrictSelect = (district) => {
    setLocationInput(district);
    setShowLocationDropdown(false);
    handleChange('preferredLocation', district);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400">Please log in to manage your preferences</p>
        </div>
      </div>
    );
  }

  if (loading || !preferences) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} onLogin={handleShowAuth} onRegister={handleShowAuth} />

      <div className="flex-1 pt-32 pb-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-6 w-6 text-gray-300" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-1">
                  <Settings className="h-8 w-8 text-emerald-500" />
                  User Preferences
                </h1>
                <p className="text-gray-400 text-sm">Customize your experience and manage your data</p>
              </div>
            </div>

            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 mb-2">
              {autoSaving && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                  <span>Saving...</span>
                </div>
              )}
              {hasUnsavedChanges && !autoSaving && (
                <span className="text-yellow-400 text-sm">Unsaved changes</span>
              )}
              {!hasUnsavedChanges && !autoSaving && message.type === 'success' && (
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
            </div>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
              ? 'bg-emerald-900/20 border border-emerald-700 text-emerald-300'
              : 'bg-red-900/20 border border-red-700 text-red-300'
              }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Default Preferences */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Tag className="h-6 w-6 text-emerald-500" />
                Default Preferences
              </h2>

              <div className="space-y-6">
                {/* Preferred Location - Autocomplete Dropdown */}
                <div className="relative" ref={locationDropdownRef}>
                  <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Preferred District
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      onFocus={() => setShowLocationDropdown(true)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="Type to search districts... (e.g., Colombo, Kandy, Galle)"
                    />

                    {/* Dropdown list */}
                    {showLocationDropdown && filteredDistricts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {filteredDistricts.map((district) => (
                          <button
                            key={district}
                            onClick={() => handleDistrictSelect(district)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-emerald-600/20 hover:text-emerald-400 transition-colors flex items-center gap-2 border-b border-gray-700 last:border-b-0"
                          >
                            <MapPin className="h-4 w-4 text-emerald-500" />
                            <span>{district}</span>
                            {preferences.preferredLocation === district && (
                              <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results message */}
                    {showLocationDropdown && locationInput && filteredDistricts.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 text-center text-gray-400">
                        No districts found matching "{locationInput}"
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select your preferred district from all 25 districts in Sri Lanka
                  </p>
                </div>

                {/* Preferred Service Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Preferred Service Types
                  </label>
                  <div className="space-y-2">
                    {['Jeep Driver', 'Tour Guide', 'Renting'].map(serviceType => (
                      <label key={serviceType} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={preferences.preferredServiceTypes?.includes(serviceType) || false}
                          onChange={() => handleArrayToggle('preferredServiceTypes', serviceType)}
                          className="w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                        />
                        <span className="text-white">{serviceType}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Equipment Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Preferred Equipment Categories
                  </label>
                  <div className="space-y-2">
                    {['Camera', 'Camping'].map(category => (
                      <label key={category} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors">
                        <input
                          type="checkbox"
                          checked={preferences.preferredCategories?.includes(category) || false}
                          onChange={() => handleArrayToggle('preferredCategories', category)}
                          className="w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                        />
                        <span className="text-white">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Booking Type */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Preferred Booking Type
                  </label>
                  <select
                    value={preferences.preferredBookingType || ''}
                    onChange={(e) => handleChange('preferredBookingType', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">No preference</option>
                    <option value="full-day">Full Day</option>
                    <option value="half-day">Half Day</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    We'll pre-select this option when you make bookings
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Bell className="h-6 w-6 text-emerald-500" />
                Notification Preferences
              </h2>

              <div className="space-y-3">
                {[
                  { key: 'bookingUpdates', label: 'Booking Status Updates', description: 'Get notified when your booking status changes' },
                  { key: 'priceDrops', label: 'Price Drop Alerts', description: 'Notify me when prices drop on favorited items' },
                  { key: 'availabilityAlerts', label: 'Availability Alerts', description: 'Get notified when favorited items become available' },
                  { key: 'newPackages', label: 'New Packages & Products', description: 'Notify me about new packages matching my preferences' }
                ].map(notif => (
                  <label
                    key={notif.key}
                    className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.notifications?.[notif.key] !== false}
                      onChange={(e) => handleNestedChange('notifications', notif.key, e.target.checked)}
                      className="mt-1 w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{notif.label}</p>
                      <p className="text-sm text-gray-500 mt-1">{notif.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Privacy & Data */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-emerald-500" />
                Privacy & Data Control
              </h2>

              <div className="space-y-4">
                {/* Enable Personalization */}
                <label className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferences.enablePersonalization !== false}
                    onChange={(e) => handleChange('enablePersonalization', e.target.checked)}
                    className="mt-1 w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">Enable Personalization</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Show personalized recommendations and content based on your activity
                    </p>
                  </div>
                </label>

                {/* Track Behavior */}
                <label className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferences.trackBehavior !== false}
                    onChange={(e) => handleChange('trackBehavior', e.target.checked)}
                    className="mt-1 w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">Track Browsing Activity</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Remember items you've viewed and searched for to improve recommendations
                    </p>
                  </div>
                </label>

                {/* Auto-fill Booking Info */}
                <label className="flex items-start gap-3 p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={preferences.autoFillBookingInfo !== false}
                    onChange={(e) => handleChange('autoFillBookingInfo', e.target.checked)}
                    className="mt-1 w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">Auto-fill Booking Forms</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically fill booking forms with your saved information
                    </p>
                  </div>
                </label>

                {/* Clear All Data */}
                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={handleClearData}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                    Clear All Personalization Data
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    This will remove all your favorites, browsing history, and reset preferences
                  </p>
                </div>
              </div>
            </div>

            {/* Save Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center gap-3 text-gray-400">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-white">Auto-save Enabled</p>
                  <p className="text-sm">Your preferences are automatically saved as you make changes</p>
                </div>
              </div>
            </div>

            {/* Manual Save Button (Backup) */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving || autoSaving}
                className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Now (Manual)'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UserPreferences;
