import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadProfileImage } from '../lib/supabase';
import { ChevronLeft, User, Mail, Phone, MapPin, Globe, Camera, Save, Loader2, ChevronDown, Edit } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import userImage from '../assets/user.png';

// Country codes with phone number formats
const countryCodes = [
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', maxLength: 10, pattern: /^0\d{9}$/ },
  { code: '+1', country: 'United States', flag: '🇺🇸', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', maxLength: 10, pattern: /^\d{10,11}$/ },
  { code: '+91', country: 'India', flag: '🇮🇳', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+61', country: 'Australia', flag: '🇦🇺', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+86', country: 'China', flag: '🇨🇳', maxLength: 11, pattern: /^\d{11}$/ },
  { code: '+81', country: 'Japan', flag: '🇯🇵', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', maxLength: 8, pattern: /^\d{8}$/ },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', maxLength: 10, pattern: /^\d{9,10}$/ },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+971', country: 'UAE', flag: '🇦🇪', maxLength: 9, pattern: /^\d{9}$/ },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', maxLength: 10, pattern: /^\d{10}$/ },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', maxLength: 9, pattern: /^\d{9}$/ },
];

export default function ProfileDashboard({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+94', // Default to Sri Lanka
    location: '',
    preferredLanguage: ''
  });
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserData = async () => {
      // Check if user is a service provider - redirect to admin
      try {
        const providerDoc = await getDoc(doc(db, 'serviceProviders', user.uid));
        if (providerDoc.exists()) {
          navigate('/admin');
          return;
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
      try {
        const touristDoc = await getDoc(doc(db, 'tourists', user.uid));
        if (touristDoc.exists()) {
          const data = touristDoc.data();
          setUserData(data);
          // Parse phone number - extract country code and number
          let phoneNumber = data.phone || '';
          let countryCode = '+94'; // Default
          let phone = '';
          
          if (phoneNumber) {
            // Try to find matching country code
            const matchedCountry = countryCodes.find(c => phoneNumber.startsWith(c.code));
            if (matchedCountry) {
              countryCode = matchedCountry.code;
              phone = phoneNumber.substring(matchedCountry.code.length).trim();
            } else if (phoneNumber.startsWith('+')) {
              // Extract first part as country code (up to 4 digits)
              const match = phoneNumber.match(/^(\+\d{1,4})\s*(.+)$/);
              if (match) {
                countryCode = match[1];
                phone = match[2];
              }
            } else {
              phone = phoneNumber;
            }
          }
          
          setFormData({
            fullName: data.fullName || '',
            email: user.email || '',
            phone: phone,
            phoneCountryCode: countryCode,
            location: data.location || data.country || '',
            preferredLanguage: data.preferredLanguage || data.language || ''
          });
          setProfileImageUrl(data.profilePicture || user.photoURL || null);
        } else {
          // If not in tourists collection, create basic data
          setFormData({
            fullName: user.displayName || '',
            email: user.email || '',
            phone: '',
            location: '',
            preferredLanguage: ''
          });
          setProfileImageUrl(user.photoURL || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, db, navigate]);

  // Get selected country info
  const getSelectedCountry = () => {
    return countryCodes.find(c => c.code === formData.phoneCountryCode) || countryCodes[0];
  };

  // Validate phone number based on selected country
  const isValidPhone = (phone, countryCode) => {
    if (!phone) return false;
    const country = countryCodes.find(c => c.code === countryCode);
    if (!country) return false;
    
    // Remove any non-digit characters
    const digits = phone.replace(/\D/g, '');
    return country.pattern.test(digits);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone number
    if (name === 'phone') {
      const selectedCountry = getSelectedCountry();
      // Only allow digits, limit to maxLength
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > selectedCountry.maxLength) {
        cleaned = cleaned.substring(0, selectedCountry.maxLength);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: cleaned
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCountryCodeChange = (countryCode) => {
    setFormData(prev => ({
      ...prev,
      phoneCountryCode: countryCode,
      phone: '' // Clear phone when country changes
    }));
    setShowCountryDropdown(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let finalProfileImageUrl = profileImageUrl;

      // Upload new profile image if selected
      if (profileImage) {
        setImageUploading(true);
        try {
          const { url, error } = await uploadProfileImage(profileImage, user.uid);
          if (error) {
            throw new Error(error.message || 'Failed to upload image');
          }
          if (url) {
            finalProfileImageUrl = url;
            setProfileImageUrl(url);
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          setMessage({ type: 'error', text: 'Failed to upload profile image' });
          setImageUploading(false);
          setSaving(false);
          return;
        } finally {
          setImageUploading(false);
        }
      }

      // Validate phone number before saving
      if (formData.phone && !isValidPhone(formData.phone, formData.phoneCountryCode)) {
        const selectedCountry = getSelectedCountry();
        setMessage({ type: 'error', text: `Please enter a valid ${selectedCountry.country} phone number` });
        setSaving(false);
        return;
      }

      // Format phone number for storage: countryCode + phone (e.g., +9407432090367)
      const formattedPhone = formData.phone 
        ? `${formData.phoneCountryCode}${formData.phone}` 
        : '';

      // Update Firestore
      const touristDocRef = doc(db, 'tourists', user.uid);
      await updateDoc(touristDocRef, {
        fullName: formData.fullName.trim(),
        phone: formattedPhone,
        phoneCountryCode: formData.phoneCountryCode, // Store country code separately
        location: formData.location.trim(),
        preferredLanguage: formData.preferredLanguage.trim(),
        profilePicture: finalProfileImageUrl || null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original userData
    if (userData) {
      let phoneNumber = userData.phone || '';
      let countryCode = '+94';
      let phone = '';
      
      if (phoneNumber) {
        const matchedCountry = countryCodes.find(c => phoneNumber.startsWith(c.code));
        if (matchedCountry) {
          countryCode = matchedCountry.code;
          phone = phoneNumber.substring(matchedCountry.code.length).trim();
        } else if (phoneNumber.startsWith('+')) {
          const match = phoneNumber.match(/^(\+\d{1,4})\s*(.+)$/);
          if (match) {
            countryCode = match[1];
            phone = match[2];
          }
        } else {
          phone = phoneNumber;
        }
      }
      
      setFormData({
        fullName: userData.fullName || '',
        email: user.email || '',
        phone: phone,
        phoneCountryCode: countryCode,
        location: userData.location || userData.country || '',
        preferredLanguage: userData.preferredLanguage || userData.language || ''
      });
      setProfileImageUrl(userData.profilePicture || user.photoURL || null);
      setProfileImage(null);
    }
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />
      
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 mt-16 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to home"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">My Profile Dashboard</h1>
            </div>
            {/* Action Buttons in Header */}
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving || imageUploading}
                    className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || imageUploading}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`flex-shrink-0 px-4 sm:px-6 lg:px-8 py-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border-b border-green-200' 
            : 'bg-red-50 text-red-800 border-b border-red-200'
        }`}>
          <p className="text-sm font-medium max-w-7xl mx-auto">{message.text}</p>
        </div>
      )}

      {/* Dashboard Content - Grid Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Left Column - Profile Image */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Profile Picture</h2>
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="relative mb-3">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    {imageUploading && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors text-sm">
                        <Camera className="h-3.5 w-3.5 text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={imageUploading}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2 text-center">Max 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Personal Information */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      <User className="inline h-3.5 w-3.5 mr-1.5" />
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                        {formData.fullName || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      <Mail className="inline h-3.5 w-3.5 mr-1.5" />
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      <Phone className="inline h-3.5 w-3.5 mr-1.5" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        {/* Country Code Dropdown */}
                        <div className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[100px]"
                          >
                            <span className="text-base">{getSelectedCountry().flag}</span>
                            <span className="text-xs font-medium">{getSelectedCountry().code}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          {showCountryDropdown && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowCountryDropdown(false)}
                              />
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto min-w-[200px]">
                                {countryCodes.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleCountryCodeChange(country.code)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                      formData.phoneCountryCode === country.code ? 'bg-green-50' : ''
                                    }`}
                                  >
                                    <span className="text-base">{country.flag}</span>
                                    <span className="flex-1 text-left">{country.country}</span>
                                    <span className="text-gray-600 font-medium">{country.code}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        {/* Phone Number Input */}
                        <div className="flex-1">
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              formData.phone && isValidPhone(formData.phone, formData.phoneCountryCode)
                                ? 'border-green-500 bg-green-50'
                                : formData.phone
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300'
                            }`}
                            placeholder={getSelectedCountry().code === '+94' ? '0743090367' : 'Enter phone number'}
                            maxLength={getSelectedCountry().maxLength}
                          />
                          {formData.phone && (
                            <p className={`text-xs mt-1 ${
                              isValidPhone(formData.phone, formData.phoneCountryCode)
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {isValidPhone(formData.phone, formData.phoneCountryCode)
                                ? `✓ Valid ${getSelectedCountry().country} phone number`
                                : `Invalid format for ${getSelectedCountry().country}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                        {formData.phone 
                          ? `${formData.phoneCountryCode} ${formData.phone}` 
                          : 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      <MapPin className="inline h-3.5 w-3.5 mr-1.5" />
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter location"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                        {formData.location || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Preferred Language */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      <Globe className="inline h-3.5 w-3.5 mr-1.5" />
                      Preferred Language
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="preferredLanguage"
                        value={formData.preferredLanguage}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter preferred language"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-900 border border-gray-200">
                        {formData.preferredLanguage || 'Not provided'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
