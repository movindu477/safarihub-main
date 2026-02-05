import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { uploadProfileImage, uploadProviderDocumentClientSide, deleteProviderDocumentClientSide } from '../lib/supabase';
import {
  ChevronLeft, User, Mail, Phone, MapPin, Globe, Camera, Save, Loader2,
  ChevronDown, Edit2, Shield, Calendar, Award, Pencil, Eye, FileText, PlusCircle
} from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';

const DOCUMENT_TYPES = [
  'Driving License',
  'Tourism Board License',
  'Vehicle Insurance',
  'Vehicle Registration',
  'Police Clearance',
  'Identity Card (NIC/Passport)',
  'Service Agreement',
  'Other'
];

export default function ProfileDashboard({ user, onLogout, onShowAuth }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' }); // success, error

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+94',
    location: '',
    preferredLanguage: ''
  });

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Document Management State
  const [addDocName, setAddDocName] = useState('');
  const [docTypeSelection, setDocTypeSelection] = useState('');
  const [addDocFile, setAddDocFile] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { name, url }

  // Country codes (simplified list matching App.jsx logic approximately)
  const countryCodes = [
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', maxLength: 9, pattern: /^[7-9]\d{8}$/ },
    { code: '+1', country: 'United States', flag: '🇺🇸', maxLength: 10, pattern: /^\d{10}$/ },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧', maxLength: 10, pattern: /^\d{10,11}$/ },
    { code: '+91', country: 'India', flag: '🇮🇳', maxLength: 10, pattern: /^\d{10}$/ },
    { code: '+61', country: 'Australia', flag: '🇦🇺', maxLength: 9, pattern: /^\d{9}$/ },
    { code: '+86', country: 'China', flag: '🇨🇳', maxLength: 11, pattern: /^\d{11}$/ },
    { code: '+81', country: 'Japan', flag: '🇯🇵', maxLength: 10, pattern: /^\d{10}$/ },
    { code: '+971', country: 'UAE', flag: '🇦🇪', maxLength: 9, pattern: /^\d{9}$/ },
  ];

  const getSelectedCountry = () => {
    return countryCodes.find(c => c.code === formData.phoneCountryCode) || countryCodes[0];
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserData = async () => {
      try {
        // Try getting user from tourists collection first
        let userDocRef = doc(db, 'tourists', user.uid);
        let userSnap = await getDoc(userDocRef);

        // If not found, try serviceProviders (though this dashboard is mainly for tourists)
        if (!userSnap.exists()) {
          userDocRef = doc(db, 'serviceProviders', user.uid);
          userSnap = await getDoc(userDocRef);
        }

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserData(data);

          // Set profile image from Firestore or Auth
          if (data.profilePicture) {
            setProfileImageUrl(data.profilePicture);
          } else if (user.photoURL) {
            setProfileImageUrl(user.photoURL);
          }

          // Parse phone number if possible
          let phone = data.phone || '';
          let countryCode = '+94'; // Default

          // Simple parser logic
          const matchedCountry = countryCodes.find(c => phone.startsWith(c.code));
          if (matchedCountry) {
            countryCode = matchedCountry.code;
            phone = phone.replace(countryCode, '').trim();
          }

          setFormData({
            fullName: data.fullName || user.displayName || '',
            email: user.email || '',
            phone: phone,
            phoneCountryCode: countryCode,
            location: data.address || data.location || '', // Handle varied field names
            preferredLanguage: data.preferredLanguage || data.language || ''
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setMessage({ text: 'Failed to load profile data', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, db, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Allow only numbers
      if (!/^\d*$/.test(value)) return;

      const selectedInfo = getSelectedCountry();
      if (value.length > selectedInfo.maxLength) return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryCodeChange = (code) => {
    setFormData(prev => ({ ...prev, phoneCountryCode: code }));
    setShowCountryDropdown(false);
  };

  const cleanPhoneNumber = (phone) => {
    if (!phone) return "";
    return phone.replace(/^0+/, ''); // Remove leading zeros
  };

  // Profile Image Upload Wrapper
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage({ text: 'Image size must be less than 5MB', type: 'error' });
      return;
    }

    try {
      setImageUploading(true);
      // Optimistic preview
      const reader = new FileReader();
      reader.onload = (e) => setProfileImageUrl(e.target.result);
      reader.readAsDataURL(file);

      const { url, error } = await uploadProfileImage(file, user.uid);

      if (error) throw error;

      if (url) {
        setProfileImageUrl(url);
        // Update in Firestore immediately
        const collectionName = userData?.role === 'provider' ? 'serviceProviders' : 'tourists';
        const userRef = doc(db, collectionName, user.uid);
        await updateDoc(userRef, {
          profilePicture: url,
          updatedAt: serverTimestamp()
        });

        setMessage({ text: 'Profile picture updated successfully!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ text: 'Failed to upload image', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  // Document Management Handlers
  const handleDocTypeChange = (e) => {
    const value = e.target.value;
    setDocTypeSelection(value);
    if (value !== 'Other') {
      setAddDocName(value);
    } else {
      setAddDocName('');
    }
  };

  const handleDocumentUpload = async () => {
    if (!addDocName || !addDocFile || !user?.uid) {
      setMessage({ text: 'Please provide both name and file', type: 'error' });
      return;
    }

    setIsUploadingDoc(true);
    try {
      // 1. Upload to Supabase
      const { url, error } = await uploadProviderDocumentClientSide(addDocFile, user.uid, addDocName);
      if (error) throw new Error(error);

      // 2. Update Firestore
      if (url) {
        const collectionName = userData?.role === 'provider' ? 'serviceProviders' : 'tourists';
        const userRef = doc(db, collectionName, user.uid);

        const keyName = addDocName.trim().replace(/\s+/g, '_');

        const updatedUrls = {
          ...(userData.certificationUrls || {}),
          [keyName]: url
        };

        await updateDoc(userRef, {
          certificationUrls: updatedUrls,
          updatedAt: serverTimestamp()
        });

        // Update local state
        setUserData(prev => ({
          ...prev,
          certificationUrls: updatedUrls
        }));

        setMessage({ text: 'Document uploaded successfully!', type: 'success' });
        setAddDocName('');
        setDocTypeSelection('');
        setAddDocFile(null);
        // Reset file input if ref exists (optional, handled by state mostly)
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Upload failed: ' + err.message, type: 'error' });
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteRequest = (name, url) => {
    setDeleteConfirm({ name, url });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setIsUploadingDoc(true); // Busy state

    try {
      // 1. Delete from Supabase
      const { success, error } = await deleteProviderDocumentClientSide(deleteConfirm.url);
      // Even if file delete fails (e.g. 404), we should probably remove the broken link? 
      // But let's strict check for now.
      if (!success) console.warn("File delete warning:", error);

      // 2. Update Firestore
      const newUrls = { ...userData.certificationUrls };
      delete newUrls[deleteConfirm.name];

      const collectionName = userData?.role === 'provider' ? 'serviceProviders' : 'tourists';
      const userRef = doc(db, collectionName, user.uid);

      await updateDoc(userRef, {
        certificationUrls: newUrls,
        updatedAt: serverTimestamp()
      });

      setUserData(prev => ({
        ...prev,
        certificationUrls: newUrls
      }));

      setMessage({ text: 'Document deleted successfully', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Delete failed: ' + err.message, type: 'error' });
    } finally {
      setIsUploadingDoc(false);
      setDeleteConfirm(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const collectionName = userData?.role === 'provider' ? 'serviceProviders' : 'tourists';
      const userRef = doc(db, collectionName, user.uid);

      // Format phone
      const formattedPhone = formData.phone ? `${formData.phoneCountryCode}${cleanPhoneNumber(formData.phone)}` : '';

      await updateDoc(userRef, {
        fullName: formData.fullName,
        phone: formattedPhone,
        address: formData.location, // Mapping location to address field
        location: formData.location, // Keeping both for compatibility
        preferredLanguage: formData.preferredLanguage,
        updatedAt: serverTimestamp()
      });

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditing(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ text: 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Logic to reset form data could go here if we tracked initial state separately
  };

  const isValidPhone = (phone, countryCode) => {
    if (!phone) return false;
    const country = countryCodes.find(c => c.code === countryCode);
    if (!country) return true; // Skip validation if code not found
    return phone.length === country.maxLength; // Simple length check
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar user={user} onLogout={onLogout} onLogin={onShowAuth} onRegister={onShowAuth} />

      {/* Modern Header Section with Gradient */}
      <div className="relative bg-black pt-32 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[40px] overflow-visible shadow-2xl mb-20">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-900 via-teal-900 to-black opacity-95 rounded-b-[40px]"></div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 translate-y-8">
          {/* Profile Image with Pencil Edit Icon */}
          <div className="relative group">
            <div className={`w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gray-800 transition-transform duration-300 ${isEditing ? 'group-hover:scale-105' : ''}`}>
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-emerald-800 to-teal-900 text-white">
                  <User className="h-16 w-16 opacity-50" />
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Pencil Icon for Upload - Only visible in Edit Mode */}
            {isEditing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="absolute bottom-2 right-2 p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-110 z-30"
                  title="Change Profile Picture"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={imageUploading}
                />
              </>
            )}
          </div>

          {/* User Info Header */}
          <div className="flex-1 text-center md:text-left mb-4 md:mb-6">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-md tracking-tight">
              {formData.fullName || 'Welcome, Traveler'}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-emerald-100/90 text-sm md:text-base font-medium">
              <span className="flex items-center gap-1.5 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <Mail className="h-4 w-4" />
                {formData.email}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <Shield className="h-4 w-4" />
                Member since {userData?.createdAt ? new Date(userData.createdAt.seconds * 1000).getFullYear() : new Date().getFullYear()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving || imageUploading}
                  className="px-6 py-2.5 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all font-medium backdrop-blur-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || imageUploading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:scale-105 transition-all font-bold flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-xl bg-white text-emerald-900 shadow-xl hover:bg-emerald-50 hover:scale-105 transition-all font-bold flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl transition-all duration-300 animate-fade-in-down ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <p className="font-bold text-sm flex items-center gap-2">
            {message.type === 'success' ? <Shield className="h-4 w-4" /> : <Loader2 className="h-4 w-4" />}
            {message.text}
          </p>
        </div>
      )}

      {/* Main Content Info Cards */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Card 1: Personal Details */}
          <div className="md:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                Personal Information
              </h3>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Full Name */}
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-gray-800"
                      placeholder="Your Full Name"
                    />
                  ) : (
                    <p className="text-gray-800 font-bold text-lg border-b border-gray-100 pb-2">{formData.fullName || 'Not provided'}</p>
                  )}
                </div>

                {/* Email (Read Only) */}
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">Email Address</label>
                  <p className="text-gray-800 font-medium text-lg border-b border-gray-100 pb-2 flex items-center gap-2 opacity-80 bg-gray-50/50 rounded-lg px-2 -mx-2">
                    <Mail className="h-4 w-4 text-emerald-500" />
                    {formData.email}
                  </p>
                </div>

                {/* Phone */}
                <div className="group md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">Phone Number</label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors min-w-[120px]"
                        >
                          <span className="text-lg">{getSelectedCountry().flag}</span>
                          <span className="text-sm font-bold text-gray-700">{getSelectedCountry().code}</span>
                          <ChevronDown className="h-3 w-3 text-gray-400 ml-auto" />
                        </button>
                        {showCountryDropdown && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowCountryDropdown(false)} />
                            <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto w-72 animate-fade-in-up">
                              {countryCodes.map((country) => (
                                <button
                                  key={country.code}
                                  type="button"
                                  onClick={() => handleCountryCodeChange(country.code)}
                                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-emerald-50 transition-colors ${formData.phoneCountryCode === country.code ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-700'
                                    }`}
                                >
                                  <span className="text-xl">{country.flag}</span>
                                  <span className="flex-1 text-left font-medium">{country.country}</span>
                                  <span className="text-gray-400 text-xs font-mono">{country.code}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="flex-1 px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-gray-800"
                        placeholder="Only numbers"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-800 font-medium text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      {formData.phone ? `${formData.phoneCountryCode} ${formData.phone}` : 'Not provided'}
                    </p>
                  )}
                  {isEditing && formData.phone && (
                    <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${isValidPhone(formData.phone, formData.phoneCountryCode) ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isValidPhone(formData.phone, formData.phoneCountryCode) ? <Shield className="h-3 w-3" /> : null}
                      {isValidPhone(formData.phone, formData.phoneCountryCode) ? 'Valid Number' : `Invalid ${getSelectedCountry().country} number format`}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-gray-800"
                      placeholder="City, Country"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {formData.location || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div className="group">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">Preferred Language</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="preferredLanguage"
                      value={formData.preferredLanguage}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-medium text-gray-800"
                      placeholder="e.g. English, French"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium text-lg border-b border-gray-100 pb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-500" />
                      {formData.preferredLanguage || 'Not specified'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Certifications & Documents (Service Providers) */}
          {(userData?.role === 'provider' || userData?.userType === 'jeepDriver' || userData?.userType === 'tourGuide') && (
            <div className="md:col-span-2 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-500" />
                  Certifications & Documents
                </h3>
              </div>
              <div className="p-8 space-y-6">

                {/* List Documents */}
                <div className="grid grid-cols-1 gap-4">
                  {userData?.certificationUrls && Object.entries(userData.certificationUrls).length > 0 ? (
                    Object.entries(userData.certificationUrls).map(([name, url]) => (
                      <div key={name} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm md:text-base capitalize">
                              {name.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Uploaded
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleDeleteRequest(name, url)}
                            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-center py-4">No documents uploaded yet.</p>
                  )}
                </div>

                {/* Add New Document Section */}
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Add New Document
                  </h4>
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full relative">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Document Type</label>
                      <div className="flex flex-col gap-2">
                        <select
                          value={docTypeSelection}
                          onChange={handleDocTypeChange}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700"
                        >
                          <option value="" disabled>Select Document Type</option>
                          {DOCUMENT_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        {docTypeSelection === 'Other' && (
                          <input
                            type="text"
                            value={addDocName}
                            onChange={(e) => setAddDocName(e.target.value)}
                            placeholder="Enter Custom Document Name"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">File</label>
                      <input
                        type="file"
                        onChange={(e) => setAddDocFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleDocumentUpload}
                      disabled={isUploadingDoc || !addDocName || !addDocFile}
                      className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-lg shadow-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center transition-all"
                    >
                      {isUploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Account Stats / Status */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6 text-lg">
                <Shield className="h-5 w-5 text-emerald-500" />
                Account Status
              </h3>
              <div className="space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-emerald-900 font-bold text-lg">Standard Tourist</p>
                    <p className="text-emerald-700/70 text-xs font-medium">Full Access active</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Hint Box (Premium Gradient) */}
            <div className="bg-linear-to-br from-gray-900 to-black rounded-3xl shadow-xl p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

              <h4 className="font-bold text-xl mb-3 relative z-10">Plan your next trip?</h4>
              <p className="text-gray-400 text-sm mb-6 relative z-10 leading-relaxed">
                Explore new top-rated destinations and book reliable drivers instantly with SafariHub.
              </p>
              <button
                onClick={() => navigate('/destination')}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all font-bold text-sm relative z-10 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
              >
                <Globe className="h-4 w-4" />
                Explore Destinations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-scale-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Document?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name.replace(/_/g, ' ')}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                disabled={isUploadingDoc}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2"
                disabled={isUploadingDoc}
              >
                {isUploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
