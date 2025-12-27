import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Save, Upload, Loader2, CheckCircle, AlertCircle, MapPin, Phone, Globe, Calendar, Award, Car, DollarSign, FileText, Languages } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';

const Admin = ({ user, onLogout, onShowAuth }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Form state - will be populated from userData
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    experience: '',
    description: '',
    // Jeep Driver fields
    vehicleType: '',
    pricePerDay: '',
    destinations: '',
    languages: [],
    specialSkills: [],
    certifications: [],
    // Guide fields
    specialQualifications: [],
    areasOfExpertise: [],
    verificationDocuments: [],
    hourlyRate: '',
    dailyRate: '',
    specialPackageRates: '',
    currencyPreference: 'LKR',
  });

  // Options for dropdowns/checkboxes
  const vehicleTypes = [
    "Standard Safari Jeep",
    "Luxury Safari Jeep",
    "Open Roof Jeep",
    "4x4 Modified Jeep"
  ];

  const destinations = [
    "Yala National Park",
    "Wilpattu National Park",
    "Udawalawe National Park",
    "Minneriya National Park",
    "Horton Plains",
    "Sinharaja Forest"
  ];

  const languages = [
    "English", "Sinhala", "Tamil", "Hindi",
    "French", "German", "Chinese", "Japanese"
  ];

  const specialSkills = [
    "Wildlife photography knowledge",
    "Birdwatching expertise",
    "Family-friendly tours",
    "Private tours",
    "Full-day safari",
    "Half-day safari"
  ];

  const certifications = [
    "Wildlife Department Certified",
    "Tourism Board Licensed",
    "First Aid Certified",
    "Eco Tourism Certified"
  ];

  // Guide specific options
  const specialQualifications = [
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
  ];

  const areasOfExpertise = [
    "National Parks",
    "Beaches & Coastal Areas",
    "Forest Reserves",
    "Camping Sites",
    "Wildlife Sanctuaries",
    "Cultural Heritage Sites",
    "Adventure Tourism",
    "Bird Watching Areas",
    "Historical Sites",
    "Mountain Regions"
  ];

  const verificationDocuments = [
    "Government Guide License",
    "First Aid Certificate",
    "Driving License",
    "Police Clearance Certificate"
  ];

  const currencyOptions = [
    "LKR - Sri Lankan Rupee",
    "USD - US Dollar",
    "EUR - Euro",
    "GBP - British Pound"
  ];

  // Check auth and fetch user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setCurrentUser(authUser);
        await fetchUserData(authUser.uid);
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        // Redirect to home if not logged in
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  const fetchUserData = async (uid) => {
    try {
      setLoading(true);
      // Try serviceProviders collection first (for jeep drivers and guides)
      let userDocRef = doc(db, "serviceProviders", uid);
      let userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        // Check if user is a service provider (jeep driver or guide)
        if (data.serviceType === 'Jeep Driver' || data.serviceType === 'Tour Guide') {
          // Populate form with existing data
          setFormData({
            fullName: data.fullName || '',
            email: data.email || data.contactEmail || '',
            phone: data.phone || data.contactPhone || '',
            location: data.location || data.baseLocation || '',
            experience: data.experienceYears || data.experience || '',
            description: data.description || data.bio || '',
            // Jeep Driver fields
            vehicleType: data.vehicleType || '',
            pricePerDay: data.pricePerDay || data.price || data.dailyRate || '',
            destinations: Array.isArray(data.destinations) ? data.destinations[0] || '' : data.destinations || '',
            languages: Array.isArray(data.languages) ? data.languages : (data.languagesSpoken ? [data.languagesSpoken] : []),
            specialSkills: Array.isArray(data.specialSkills) ? data.specialSkills : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            // Guide fields
            specialQualifications: Array.isArray(data.specialQualifications) ? data.specialQualifications : [],
            areasOfExpertise: Array.isArray(data.areasOfExpertise) ? data.areasOfExpertise : [],
            verificationDocuments: Array.isArray(data.verificationDocuments) ? data.verificationDocuments : [],
            hourlyRate: data.hourlyRate || '',
            dailyRate: data.dailyRate || '',
            specialPackageRates: data.specialPackageRates || '',
            currencyPreference: data.currencyPreference || 'LKR',
          });

          if (data.profilePicture) {
            setProfilePreview(data.profilePicture);
          }
        } else {
          // Not a service provider, redirect
          navigate('/');
        }
      } else {
        // User not found in serviceProviders, redirect
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage({ type: 'error', text: 'Failed to load your data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelectChange = (field, value) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const updatedArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return {
        ...prev,
        [field]: updatedArray
      };
    });
  };

  const handleProfileImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 2MB' });
        return;
      }
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !userData) {
      setMessage({ type: 'error', text: 'You must be logged in to update your profile.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const uid = currentUser.uid;
      const serviceType = userData.serviceType;

      // Prepare update data
      let updateData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        experienceYears: formData.experience ? parseInt(formData.experience) : 0,
        description: formData.description.trim(),
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim(),
        updatedAt: serverTimestamp(),
      };

      // Service type specific fields
      if (serviceType === 'Jeep Driver') {
        updateData = {
          ...updateData,
          vehicleType: formData.vehicleType || '',
          pricePerDay: formData.pricePerDay ? parseInt(formData.pricePerDay) : 0,
          destinations: formData.destinations ? [formData.destinations] : [],
          languages: formData.languages || [],
          specialSkills: formData.specialSkills || [],
          certifications: formData.certifications || [],
        };
      } else if (serviceType === 'Tour Guide') {
        updateData = {
          ...updateData,
          specialQualifications: formData.specialQualifications || [],
          areasOfExpertise: formData.areasOfExpertise || [],
          verificationDocuments: formData.verificationDocuments || [],
          hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) : 0,
          dailyRate: formData.dailyRate ? parseInt(formData.dailyRate) : 0,
          specialPackageRates: formData.specialPackageRates || '',
          currencyPreference: formData.currencyPreference || 'LKR',
          languages: formData.languages || [],
        };
      }

      // Handle profile picture upload
      if (profileFile) {
        try {
          const ext = profileFile.name.split('.').pop();
          const storageRef = sRef(storage, `profile-pictures/service-providers/${uid}.${ext}`);
          const snap = await uploadBytes(storageRef, profileFile);
          const photoURL = await getDownloadURL(snap.ref);
          updateData.profilePicture = photoURL;
        } catch (uploadError) {
          console.error('Profile image upload failed:', uploadError);
          setMessage({ type: 'error', text: 'Profile updated but image upload failed. Please try uploading again.' });
        }
      }

      // Update Firestore
      const userDocRef = doc(db, 'serviceProviders', uid);
      await updateDoc(userDocRef, updateData);

      setMessage({ type: 'success', text: 'Your profile has been updated successfully!' });

      // Refresh user data
      await fetchUserData(uid);

      // Clear message after 5 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !userData) {
    return null; // Will redirect
  }

  const isGuide = userData.serviceType === 'Tour Guide';
  const isJeepDriver = userData.serviceType === 'Jeep Driver';

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar user={user} onLogout={onLogout} onShowAuth={onShowAuth} />

      <div className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                <p className="text-gray-400 text-sm mt-1">
                  {isGuide ? 'Manage your Tour Guide profile' : 'Manage your Jeep Driver profile'}
                </p>
              </div>
              {userData.profilePicture && (
                <img
                  src={profilePreview || userData.profilePicture}
                  alt={formData.fullName}
                  className="h-16 w-16 rounded-full object-cover border-4 border-emerald-500"
                />
              )}
            </div>

            {/* Message */}
            {message.text && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mt-4 ${message.type === 'success'
                ? 'bg-green-900/50 text-green-300 border border-green-700'
                : 'bg-red-900/50 text-red-300 border border-red-700'
                }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}
          </div>

          {/* Form - Compact layout */}
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
            {/* Main Two Boxes - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
              {/* Left Box - Basic Information */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Basic Information
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      required
                      className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="+94701234567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location *
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Base location"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Experience *
                      </label>
                      <input
                        type="number"
                        value={formData.experience}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        required
                        min="0"
                        max="50"
                        className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows="2"
                      className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      Profile Picture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageSelect}
                      className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {profilePreview && (
                      <img
                        src={profilePreview}
                        alt="Preview"
                        className="mt-2 h-12 w-12 rounded-full object-cover border-2 border-emerald-500"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Box - Service Specific Details */}
              {isJeepDriver && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-400" />
                    Jeep Driver Details
                  </h2>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Vehicle Type
                        </label>
                        <select
                          value={formData.vehicleType}
                          onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="">Select Type</option>
                          {vehicleTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Price/Day (LKR)
                        </label>
                        <input
                          type="number"
                          value={formData.pricePerDay}
                          onChange={(e) => handleInputChange('pricePerDay', e.target.value)}
                          min="0"
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="12000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        National Park *
                      </label>
                      <select
                        value={formData.destinations}
                        onChange={(e) => handleInputChange('destinations', e.target.value)}
                        required
                        className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select Park</option>
                        {destinations.map(dest => (
                          <option key={dest} value={dest}>{dest}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {isGuide && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-400" />
                    Tour Guide Details
                  </h2>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Hourly Rate
                        </label>
                        <input
                          type="number"
                          value={formData.hourlyRate}
                          onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                          min="0"
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="2000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Daily Rate
                        </label>
                        <input
                          type="number"
                          value={formData.dailyRate}
                          onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                          min="0"
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="15000"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Package Rates
                        </label>
                        <input
                          type="text"
                          value={formData.specialPackageRates}
                          onChange={(e) => handleInputChange('specialPackageRates', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="3-day: 40,000 LKR"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Currency
                        </label>
                        <select
                          value={formData.currencyPreference}
                          onChange={(e) => handleInputChange('currencyPreference', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          {currencyOptions.map(currency => (
                            <option key={currency} value={currency.split(' - ')[0]}>
                              {currency.split(' - ')[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Sections Below - Languages, Skills, etc. in separate boxes */}
            {isJeepDriver && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                {/* Languages Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-emerald-400" />
                    Languages
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-40 overflow-y-auto">
                    {languages.map(language => (
                      <div key={language} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`lang-${language}`}
                          checked={formData.languages.includes(language)}
                          onChange={() => handleMultiSelectChange('languages', language)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`lang-${language}`} className="text-xs text-gray-300">
                          {language}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Skills Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3">Special Skills</label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-40 overflow-y-auto">
                    {specialSkills.map(skill => (
                      <div key={skill} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`skill-${skill}`}
                          checked={formData.specialSkills.includes(skill)}
                          onChange={() => handleMultiSelectChange('specialSkills', skill)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`skill-${skill}`} className="text-xs text-gray-300">
                          {skill}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certifications Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3">Certifications</label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-40 overflow-y-auto">
                    {certifications.map(cert => (
                      <div key={cert} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`cert-${cert}`}
                          checked={formData.certifications.includes(cert)}
                          onChange={() => handleMultiSelectChange('certifications', cert)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`cert-${cert}`} className="text-xs text-gray-300">
                          {cert}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isGuide && (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mt-4">
                {/* Qualifications Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3">Qualifications</label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-48 overflow-y-auto">
                    {specialQualifications.map(qual => (
                      <div key={qual} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`qual-${qual}`}
                          checked={formData.specialQualifications.includes(qual)}
                          onChange={() => handleMultiSelectChange('specialQualifications', qual)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`qual-${qual}`} className="text-xs text-gray-300">
                          {qual}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Areas of Expertise Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3">Areas of Expertise</label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-48 overflow-y-auto">
                    {areasOfExpertise.map(area => (
                      <div key={area} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`area-${area}`}
                          checked={formData.areasOfExpertise.includes(area)}
                          onChange={() => handleMultiSelectChange('areasOfExpertise', area)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`area-${area}`} className="text-xs text-gray-300">
                          {area}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Documents Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-1">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    Verification Docs
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-32 overflow-y-auto">
                    {verificationDocuments.map(doc => (
                      <div key={doc} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`verif-${doc}`}
                          checked={formData.verificationDocuments.includes(doc)}
                          onChange={() => handleMultiSelectChange('verificationDocuments', doc)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`verif-${doc}`} className="text-xs text-gray-300">
                          {doc}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Languages Box */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-1">
                    <Languages className="h-4 w-4 text-emerald-400" />
                    Languages
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 border border-gray-600 rounded-lg p-2 bg-gray-900/50 max-h-32 overflow-y-auto">
                    {languages.map(language => (
                      <div key={language} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`lang-guide-${language}`}
                          checked={formData.languages.includes(language)}
                          onChange={() => handleMultiSelectChange('languages', language)}
                          className="mr-1.5 h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800"
                        />
                        <label htmlFor={`lang-guide-${language}`} className="text-xs text-gray-300">
                          {language}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button - Full Width */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-700 mt-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div >

      <Footer />
    </div >
  );
};

export default Admin;
