import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
// Supabase Storage imports (replacing Firebase Storage)
import { uploadProfileImage, uploadDocument, deleteDocument, getDocumentUrl } from '../lib/supabase';
import { User, Save, Upload, CheckCircle, AlertCircle, MapPin, Phone, Globe, Calendar, Award, Car, DollarSign, FileText, Languages, Check, X } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import { updateBookingStatus, GlobalNotificationBell } from '../App';

const Admin = ({ user, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  // Firebase Storage removed - using Supabase Storage instead
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'bookings', 'documents'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [certificationFiles, setCertificationFiles] = useState([]);
  const [uploadingCertifications, setUploadingCertifications] = useState(false);
  const [uploadedCertifications, setUploadedCertifications] = useState([]);
  const [deletingCertId, setDeletingCertId] = useState(null);
  const [newCertificationFiles, setNewCertificationFiles] = useState([]);

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
    destinations: '',
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
    "Kaudulla National Park",
    "Bundala National Park",
    "Kumana National Park",
    "Horton Plains",
    "Sinharaja Forest Reserve",
    "Knuckles Mountain Range",
    "Mirissa Beach",
    "Unawatuna Beach",
    "Lunugamvehera"
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
            destinations: Array.isArray(data.destinations) ? data.destinations[0] || '' : data.destinations || '',
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

  // Fetch bookings for the provider
  useEffect(() => {
    if (!currentUser || !userData) return;

    const isGuide = userData.serviceType === 'Tour Guide';
    const providerIdField = isGuide ? 'guideId' : 'driverId';
    const providerId = currentUser.uid;

    setBookingsLoading(true);

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where(providerIdField, '==', providerId)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          // Sort by date (newest first)
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB - dateA;
        });
        setBookings(bookingsList);
        setBookingsLoading(false);
      },
      (error) => {
        console.error('Error fetching bookings:', error);
        setBookingsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userData, db]);

  // Fetch uploaded certifications
  useEffect(() => {
    if (!currentUser || !userData) {
      setUploadedCertifications([]);
      return;
    }

    try {
      // Determine collection based on service type
      // Jeep Driver and Renting use jeepDriverCertifications
      // Tour Guide uses guideCertifications
      const isJeepDriver = userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting';
      const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
      const userCertDocRef = doc(db, collectionName, currentUser.uid);

      console.log('📄 Setting up documents listener:', {
        userId: currentUser.uid,
        serviceType: userData.serviceType,
        isJeepDriver,
        collectionName
      });

      const unsubscribe = onSnapshot(
        userCertDocRef,
        (snapshot) => {
          console.log('📄 Documents snapshot received:', {
            exists: snapshot.exists(),
            hasData: !!snapshot.data()
          });
          
          if (snapshot.exists()) {
            const data = snapshot.data();
            const documents = data.documents || [];
            
            console.log(`📄 Found ${documents.length} document(s) in Firestore`);
            console.log('📋 Raw documents:', documents.map((d, i) => ({
              index: i,
              certificationName: d.certificationName,
              fileName: d.fileName,
              hasSupabasePath: !!d.supabasePath,
              hasFileUrl: !!d.fileUrl,
              uploadStatus: d.uploadStatus,
              documentId: d.documentId
            })));
            
            const certs = documents.map((docItem, index) => {
              // Determine status: if path exists and no failed status, mark as uploaded
              const hasValidPath = (docItem.supabasePath && docItem.supabasePath.trim()) || (docItem.fileUrl && docItem.fileUrl.trim());
              const status = docItem.uploadStatus === 'failed' 
                ? 'failed' 
                : hasValidPath 
                  ? 'uploaded' 
                  : (docItem.uploadStatus === 'uploaded' ? 'uploaded' : null); // Preserve 'uploaded' status if set
              
              // Handle uploadedAt - can be Date, Timestamp, or null
              let uploadedAt = null;
              if (docItem.uploadedAt) {
                if (docItem.uploadedAt.toDate) {
                  // Firestore Timestamp
                  uploadedAt = docItem.uploadedAt;
                } else if (docItem.uploadedAt instanceof Date) {
                  // JavaScript Date
                  uploadedAt = docItem.uploadedAt;
                } else {
                  // Try to convert if it's a number (timestamp)
                  uploadedAt = new Date(docItem.uploadedAt);
                }
              }
              
              return {
                id: docItem.documentId || `${currentUser.uid}_${index}`,
                certificationName: docItem.certificationName || docItem.fileName || 'Unknown',
                fileName: docItem.fileName || 'Unknown',
                fileUrl: docItem.fileUrl || null,
                supabasePath: docItem.supabasePath || null, // Include supabasePath
                fileSize: docItem.fileSize || 0,
                fileType: docItem.fileType || 'Unknown',
                uploadedAt: uploadedAt,
                documentId: docItem.documentId || `${currentUser.uid}_${index}`,
                providerId: data.providerId || currentUser.uid,
                uploadStatus: status, // ✅ Force correct status based on path existence
                uploadError: docItem.uploadError || null // Include uploadError
              };
            });
            
            console.log(`✅ Processed ${certs.length} certification(s) for display`);
            console.log('📋 Processed documents:', certs.map(c => ({
              name: c.certificationName,
              hasSupabasePath: !!c.supabasePath,
              hasFileUrl: !!c.fileUrl,
              uploadStatus: c.uploadStatus,
              id: c.id
            })));
            
            setUploadedCertifications(certs);
          } else {
            console.log('⚠️ No documents found in Firestore for user:', currentUser.uid);
            setUploadedCertifications([]);
          }
        },
        (error) => {
          console.error('❌ Error fetching certifications:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          setUploadedCertifications([]);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up certifications listener:', error);
      setUploadedCertifications([]);
    }
  }, [currentUser?.uid, userData?.serviceType]);

  // Handle booking status update
  const handleBookingStatusUpdate = async (bookingId, status) => {
    if (!currentUser || !userData) return;

    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      await updateBookingStatus(
        bookingId,
        status,
        currentUser.uid,
        booking.customerId,
        userData.fullName || userData.fullname || 'Provider',
        booking.customerName || 'Customer'
      );

      setMessage({ type: 'success', text: `Booking ${status} successfully!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating booking status:', error);
      setMessage({ type: 'error', text: 'Failed to update booking status. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
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
          destinations: formData.destinations ? [formData.destinations] : [],
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

      // Handle profile picture upload - Using Supabase
      if (profileFile) {
        try {
          const { url: photoURL, error } = await uploadProfileImage(profileFile, uid);
          
          if (error) {
            console.error('Profile image upload failed:', error);
            setMessage({ type: 'error', text: 'Profile updated but image upload failed. Please try uploading again.' });
          } else {
            updateData.profilePicture = photoURL;
          }
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
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Loading...</p>
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
      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : null)}
        onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : null)}
      />

      <div className="pt-24 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Service Provider Dashboard</h1>
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

          {/* Tabs */}
          <div className="flex gap-2 mb-4 bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'bookings'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              My Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'documents'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Documents
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
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
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          National Park / Destination *
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

              {/* Certification Upload Section */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 mt-4">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  {isJeepDriver ? 'Jeep Driver Certifications' : 'Guide Certifications'}
                </h2>
                <p className="text-xs text-gray-400 mb-3">Upload your certification documents (PDF or images)</p>

                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.avif"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCertificationFiles(files);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />

                  {certificationFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-300">Selected files:</p>
                      {certificationFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-900/50 p-2 rounded text-xs text-gray-300">
                          <span>{file.name}</span>
                          <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser || !userData || certificationFiles.length === 0) return;

                      setUploadingCertifications(true);
                      setMessage({ type: '', text: '' });

                      try {
                        const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                        const uploaded = [];

                        for (const file of certificationFiles) {
                          try {
                            // Upload file to Supabase Storage
                            const timestamp = Date.now();
                            const fileName = `${currentUser.uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                            const { url: fileUrl, error: uploadError, path } = await uploadDocument(file, currentUser.uid, fileName);

                            if (uploadError) {
                              console.error(`Error uploading ${file.name}:`, uploadError);
                              continue;
                            }

                            // Save to Firestore (legacy structure - keeping for compatibility)
                            await addDoc(collection(db, collectionName), {
                              providerId: currentUser.uid,
                              certificationName: file.name,
                              fileName: fileName,
                              fileUrl: fileUrl,
                              fileSize: file.size,
                              fileType: file.type,
                              uploadedAt: serverTimestamp(),
                              updatedAt: serverTimestamp(),
                              supabasePath: path
                            });

                            uploaded.push(file.name);
                          } catch (error) {
                            console.error(`Error uploading ${file.name}:`, error);
                          }
                        }

                        if (uploaded.length > 0) {
                          setMessage({ type: 'success', text: `Successfully uploaded ${uploaded.length} certification(s)!` });
                          setCertificationFiles([]);
                          setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                        } else {
                          setMessage({ type: 'error', text: 'Failed to upload certifications. Please try again.' });
                        }
                      } catch (error) {
                        console.error('Error uploading certifications:', error);
                        setMessage({ type: 'error', text: 'Failed to upload certifications. Please try again.' });
                      } finally {
                        setUploadingCertifications(false);
                      }
                    }}
                    disabled={certificationFiles.length === 0 || uploadingCertifications}
                    className="w-full px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploadingCertifications ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Certifications
                      </>
                    )}
                  </button>
                </div>
              </div>

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
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-400" />
                My Bookings
              </h2>

              {bookingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <span className="text-gray-400 text-sm">Loading bookings...</span>
                  </div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const bookingDate = booking.createdAt?.toDate?.() || booking.createdAt || new Date();
                    const formattedDate = bookingDate instanceof Date ? bookingDate.toLocaleDateString() : new Date(bookingDate).toLocaleDateString();
                    const statusColors = {
                      pending: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
                      accepted: 'bg-green-900/50 text-green-300 border-green-700',
                      declined: 'bg-red-900/50 text-red-300 border-red-700',
                      completed: 'bg-blue-900/50 text-blue-300 border-blue-700',
                      cancelled: 'bg-gray-700/50 text-gray-300 border-gray-600'
                    };

                    return (
                      <div
                        key={booking.id}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowBookingDetails(true);
                        }}
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 cursor-pointer transition-colors hover:bg-gray-700"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {booking.customerName || 'Customer'}
                              </h3>
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[booking.status] || statusColors.pending
                                }`}>
                                {booking.status?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-300">
                              <p><span className="font-medium">Email:</span> {booking.customerEmail || 'N/A'}</p>
                              {booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0 ? (
                                <div>
                                  <p className="font-medium mb-1">Dates:</p>
                                  <div className="space-y-1">
                                    {booking.datesWithTypes.map((item, index) => {
                                      const date = item.date ? new Date(item.date) : null;
                                      const type = item.type || 'full-day';
                                      const typeLabel = type === 'half-day' ? 'Half Day' : 'Full Day';
                                      const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';
                                      if (!date) return null;
                                      return (
                                        <div key={index} className="flex items-center justify-between text-xs">
                                          <span className="text-gray-300">{date.toLocaleDateString()}</span>
                                          <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : booking.selectedDates ? (
                                <p><span className="font-medium">Dates:</span> {
                                  Array.isArray(booking.selectedDates)
                                    ? booking.selectedDates.map(d => new Date(d).toLocaleDateString()).join(', ')
                                    : new Date(booking.selectedDates).toLocaleDateString()
                                }</p>
                              ) : booking.datesString ? (
                                <p><span className="font-medium">Dates:</span> {booking.datesString}</p>
                              ) : null}
                              {booking.destination && (
                                <p><span className="font-medium">Destination:</span> {booking.destination}</p>
                              )}
                              {booking.totalPrice && (
                                <p><span className="font-medium">Total Price:</span> LKR {booking.totalPrice.toLocaleString()}</p>
                              )}
                              <p><span className="font-medium">Booked on:</span> {formattedDate}</p>
                            </div>
                          </div>
                          {booking.status === 'pending' && (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleBookingStatusUpdate(booking.id, 'accepted')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                <Check className="h-4 w-4" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleBookingStatusUpdate(booking.id, 'declined')}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                <X className="h-4 w-4" />
                                Decline
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div >

      {/* Global Notification Bell */}
      {currentUser && (
        <GlobalNotificationBell
          user={currentUser}
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          onMarkAsRead={onMarkAsRead}
        />
      )}


      {/* Booking Details Side Box */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div className="bg-gray-800 w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Booking Details</h2>
              <button
                onClick={() => {
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${selectedBooking.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' :
                  selectedBooking.status === 'accepted' ? 'bg-green-900/50 text-green-300 border-green-700' :
                    selectedBooking.status === 'declined' ? 'bg-red-900/50 text-red-300 border-red-700' :
                      selectedBooking.status === 'completed' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                        'bg-gray-700/50 text-gray-300 border-gray-600'
                  }`}>
                  {selectedBooking.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-400" />
                  Customer Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-400 font-medium">Name:</span>
                    <p className="text-white">{selectedBooking.customerName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Email:</span>
                    <p className="text-white">{selectedBooking.customerEmail || 'N/A'}</p>
                  </div>
                  {selectedBooking.customerPhone && (
                    <div>
                      <span className="text-gray-400 font-medium">Phone:</span>
                      <p className="text-white">{selectedBooking.customerPhone}</p>
                    </div>
                  )}
                  {selectedBooking.customerCountry && (
                    <div>
                      <span className="text-gray-400 font-medium">Country:</span>
                      <p className="text-white">{selectedBooking.customerCountry}</p>
                    </div>
                  )}
                  {selectedBooking.emergencyContactName && (
                    <div>
                      <span className="text-gray-400 font-medium">Emergency Contact:</span>
                      <p className="text-white">{selectedBooking.emergencyContactName}</p>
                      {selectedBooking.emergencyContactPhone && (
                        <p className="text-gray-300 text-xs">{selectedBooking.emergencyContactPhone}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  Booking Details
                </h3>
                <div className="space-y-3 text-sm">
                  {selectedBooking.datesWithTypes && Array.isArray(selectedBooking.datesWithTypes) && selectedBooking.datesWithTypes.length > 0 ? (
                    <div>
                      <span className="text-gray-400 font-medium">Dates:</span>
                      <div className="mt-2 space-y-1">
                        {selectedBooking.datesWithTypes.map((item, index) => {
                          const date = item.date ? new Date(item.date) : null;
                          const type = item.type || 'full-day';
                          const typeLabel = type === 'half-day' ? 'Half Day' : 'Full Day';
                          const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';
                          if (!date) return null;
                          return (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-white">{date.toLocaleDateString()}</span>
                              <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : selectedBooking.selectedDates ? (
                    <div>
                      <span className="text-gray-400 font-medium">Dates:</span>
                      <p className="text-white">
                        {Array.isArray(selectedBooking.selectedDates)
                          ? selectedBooking.selectedDates.map(d => new Date(d).toLocaleDateString()).join(', ')
                          : new Date(selectedBooking.selectedDates).toLocaleDateString()}
                      </p>
                    </div>
                  ) : selectedBooking.datesString ? (
                    <div>
                      <span className="text-gray-400 font-medium">Dates:</span>
                      <p className="text-white">{selectedBooking.datesString}</p>
                    </div>
                  ) : null}
                  {selectedBooking.destination && (
                    <div>
                      <span className="text-gray-400 font-medium">Destination:</span>
                      <p className="text-white">{selectedBooking.destination}</p>
                    </div>
                  )}
                  {selectedBooking.nationalPark && (
                    <div>
                      <span className="text-gray-400 font-medium">National Park:</span>
                      <p className="text-white">{selectedBooking.nationalPark}</p>
                    </div>
                  )}
                  {selectedBooking.vehicleType && (
                    <div>
                      <span className="text-gray-400 font-medium">Vehicle Type:</span>
                      <p className="text-white">{selectedBooking.vehicleType}</p>
                    </div>
                  )}
                  {selectedBooking.totalPrice && (
                    <div>
                      <span className="text-gray-400 font-medium">Total Price:</span>
                      <p className="text-white font-semibold">LKR {selectedBooking.totalPrice.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedBooking.createdAt && (
                    <div>
                      <span className="text-gray-400 font-medium">Booked on:</span>
                      <p className="text-white">
                        {selectedBooking.createdAt?.toDate ?
                          selectedBooking.createdAt.toDate().toLocaleDateString() :
                          new Date(selectedBooking.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Details */}
              {(selectedBooking.needsHotelPickup || selectedBooking.pickupLocation || selectedBooking.dropoffLocation || selectedBooking.hotelName || selectedBooking.hotelAddress) && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-emerald-400" />
                    Location Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    {selectedBooking.needsHotelPickup && (
                      <div>
                        <span className="text-gray-400 font-medium">Hotel Pickup:</span>
                        <p className="text-white">Yes</p>
                      </div>
                    )}
                    {selectedBooking.hotelName && (
                      <div>
                        <span className="text-gray-400 font-medium">Hotel Name:</span>
                        <p className="text-white">{selectedBooking.hotelName}</p>
                      </div>
                    )}
                    {selectedBooking.hotelAddress && (
                      <div>
                        <span className="text-gray-400 font-medium">Hotel Address:</span>
                        <p className="text-white">{selectedBooking.hotelAddress}</p>
                      </div>
                    )}
                    {selectedBooking.pickupLocation && (
                      <div>
                        <span className="text-gray-400 font-medium">Pickup Location:</span>
                        <p className="text-white">{selectedBooking.pickupLocation}</p>
                      </div>
                    )}
                    {selectedBooking.dropoffLocation && (
                      <div>
                        <span className="text-gray-400 font-medium">Drop-off Location:</span>
                        <p className="text-white">{selectedBooking.dropoffLocation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedBooking.additionalNotes && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    Additional Notes
                  </h3>
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedBooking.additionalNotes}</p>
                </div>
              )}

              {/* Action Buttons for Pending Bookings */}
              {selectedBooking.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookingStatusUpdate(selectedBooking.id, 'accepted');
                      setShowBookingDetails(false);
                      setSelectedBooking(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <Check className="h-5 w-5" />
                    Accept
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookingStatusUpdate(selectedBooking.id, 'declined');
                      setShowBookingDetails(false);
                      setSelectedBooking(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <X className="h-5 w-5" />
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            {isJeepDriver ? 'Jeep Driver Certifications' : 'Guide Certifications'}
          </h2>

          {/* Upload New Documents Section */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 mb-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              Upload New Documents
            </h3>
            <p className="text-xs text-gray-400 mb-3">Upload certification documents (PDF or images)</p>

            <div className="space-y-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.avif"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setNewCertificationFiles(files);
                }}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />

              {newCertificationFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-300">Selected files:</p>
                  {newCertificationFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-900/50 p-2 rounded text-xs text-gray-300">
                      <span>{file.name}</span>
                      <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (!currentUser || !userData || newCertificationFiles.length === 0) return;

                  setUploadingCertifications(true);
                  setMessage({ type: '', text: '' });

                  try {
                    const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                    const userCertDocRef = doc(db, collectionName, currentUser.uid);
                    const uploaded = [];
                    const newDocuments = [];

                    for (const file of newCertificationFiles) {
                      try {
                        console.log(`📤 Starting upload for: ${file.name}`);

                        // Upload file to Supabase Storage
                        const ext = file.name.split('.').pop();
                        const timestamp = Date.now();
                        const fileName = `${currentUser.uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

                        console.log(`📤 Uploading to Supabase: ${file.name}`);

                        // Upload to Supabase Storage
                        const { url: fileUrl, error: uploadError, path } = await uploadDocument(file, currentUser.uid, fileName);

                        if (uploadError) {
                          console.error(`❌ Error uploading ${file.name}:`, uploadError);
                          console.error('Error details:', {
                            message: uploadError.message,
                            stack: uploadError.stack
                          });

                          // Save document metadata even if upload fails
                          newDocuments.push({
                            certificationName: file.name,
                            fileName: fileName,
                            fileUrl: '', // Empty URL indicates upload failed
                            fileSize: file.size,
                            fileType: file.type || `application/${ext}`,
                            uploadedAt: new Date(),
                            documentId: `${currentUser.uid}_${timestamp}`,
                            uploadStatus: 'failed',
                            uploadError: uploadError.message || 'Upload failed'
                          });
                          continue;
                        }

                        console.log(`✅ File uploaded to Supabase: ${file.name}`);
                        console.log(`✅ Got download URL for: ${file.name}`);

                        // Add to new documents array
                        newDocuments.push({
                          certificationName: file.name,
                          fileName: fileName,
                          fileUrl: fileUrl,
                          fileSize: file.size,
                          fileType: file.type || `application/${ext}`,
                          uploadedAt: new Date(),
                          documentId: `${currentUser.uid}_${timestamp}`,
                          supabasePath: path, // Store Supabase path for deletion
                          uploadStatus: 'uploaded' // ✅ Mark as successfully uploaded
                        });

                        uploaded.push(file.name);
                      } catch (error) {
                        console.error(`❌ Error uploading ${file.name}:`, error);
                        console.error('Error details:', {
                          message: error.message,
                          stack: error.stack
                        });

                        // Save document metadata even if upload fails
                        const timestamp = Date.now();
                        newDocuments.push({
                          certificationName: file.name,
                          fileName: `${currentUser.uid}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
                          fileUrl: '', // Empty URL indicates upload failed
                          fileSize: file.size,
                          fileType: file.type || `application/${file.name.split('.').pop()}`,
                          uploadedAt: new Date(),
                          documentId: `${currentUser.uid}_${timestamp}`,
                          uploadStatus: 'failed',
                          uploadError: error.message || 'Upload failed'
                        });
                      }
                    }

                    // Update Firestore with new documents
                    if (newDocuments.length > 0) {
                      const existingDoc = await getDoc(userCertDocRef);
                      
                      if (existingDoc.exists()) {
                        // Update existing document - merge with existing documents
                        const existingData = existingDoc.data();
                        const existingDocuments = existingData.documents || [];
                        await setDoc(userCertDocRef, {
                          providerId: currentUser.uid,
                          documents: [...existingDocuments, ...newDocuments],
                          updatedAt: serverTimestamp()
                        }, { merge: true });
                      } else {
                        // Create new document
                        await setDoc(userCertDocRef, {
                          providerId: currentUser.uid,
                          documents: newDocuments,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp()
                        });
                      }
                      console.log(`✅ Saved ${newDocuments.length} document(s) to Firestore under user ID: ${currentUser.uid}`);
                    }

                    if (newDocuments.length > 0) {
                      const successCount = uploaded.length;
                      const failedCount = newDocuments.length - successCount;
                      let messageText = '';
                      
                      if (successCount > 0 && failedCount === 0) {
                        messageText = `Successfully uploaded ${successCount} document(s) to Supabase!`;
                      } else if (successCount > 0 && failedCount > 0) {
                        messageText = `Uploaded ${successCount} document(s) to Supabase, ${failedCount} failed (saved metadata to Firestore).`;
                      } else {
                        messageText = `Upload failed for all documents (saved metadata to Firestore). Please check Supabase configuration.`;
                      }
                      
                      setMessage({ 
                        type: successCount > 0 ? 'success' : 'error', 
                        text: messageText 
                      });
                      setNewCertificationFiles([]);
                      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                    } else {
                      setMessage({
                        type: 'error',
                        text: 'No documents to upload. Please select files first.'
                      });
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                    }
                  } catch (error) {
                    console.error('Error uploading documents:', error);
                    setMessage({ type: 'error', text: 'Failed to upload documents. Please try again.' });
                  } finally {
                    setUploadingCertifications(false);
                  }
                }}
                disabled={newCertificationFiles.length === 0 || uploadingCertifications}
                className="w-full px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingCertifications ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Documents
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Existing Documents List */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Uploaded Documents
                {uploadedCertifications.length > 0 && (
                  <span className="text-sm text-gray-400 font-normal">
                    ({uploadedCertifications.length})
                  </span>
                )}
              </h3>
              <button
                onClick={async () => {
                  // Manually refresh documents
                  if (!currentUser || !userData) return;
                  try {
                    const isJeepDriver = userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting';
                    const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                    const userCertDocRef = doc(db, collectionName, currentUser.uid);
                    const docSnapshot = await getDoc(userCertDocRef);
                    
                    if (docSnapshot.exists()) {
                      const data = docSnapshot.data();
                      const documents = data.documents || [];
                      console.log('🔄 Manually refreshed documents:', documents.length);
                      // The real-time listener will update the state automatically
                    } else {
                      console.log('⚠️ No documents found when refreshing');
                    }
                  } catch (error) {
                    console.error('❌ Error refreshing documents:', error);
                  }
                }}
                className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                title="Refresh documents list"
              >
                🔄 Refresh
              </button>
            </div>

            {uploadedCertifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm mb-2">No documents uploaded yet</p>
                <p className="text-gray-500 text-xs">
                  Documents uploaded during registration will appear here automatically
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedCertifications.map((cert) => {
                  // Use status to determine error state
                  // Status can be: 'uploaded' | 'failed' | null (legacy/unknown)
                  // Show error only if status is explicitly 'failed'
                  // If status is 'uploaded' or null but has valid path, show as valid
                  const hasValidPath = (cert.supabasePath && cert.supabasePath.trim()) || (cert.fileUrl && cert.fileUrl.trim());
                  const hasError = cert.uploadStatus === 'failed' || (!hasValidPath && cert.uploadStatus !== 'uploaded');
                  return (
                    <div key={cert.id} className={`bg-gray-900/50 rounded-lg p-3 border ${hasError ? 'border-red-600' : 'border-gray-600'} flex items-center justify-between`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className={`h-4 w-4 ${hasError ? 'text-red-400' : 'text-emerald-400'}`} />
                          <span className="text-white font-medium text-sm">{cert.certificationName || cert.fileName}</span>
                          {hasError && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">Upload Failed</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 space-y-0.5">
                          <p>Size: {(cert.fileSize / 1024).toFixed(1)} KB</p>
                          <p>Type: {cert.fileType || 'Unknown'}</p>
                          {cert.uploadedAt && (
                            <p>Uploaded: {
                              cert.uploadedAt.toDate 
                                ? cert.uploadedAt.toDate().toLocaleDateString() 
                                : cert.uploadedAt instanceof Date
                                  ? cert.uploadedAt.toLocaleDateString()
                                  : typeof cert.uploadedAt === 'number'
                                    ? new Date(cert.uploadedAt).toLocaleDateString()
                                    : 'Unknown'
                            }</p>
                          )}
                          {hasError && cert.uploadError && (
                            <p className="text-red-400">Error: {cert.uploadError}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasError ? (
                          <span className="px-3 py-1.5 bg-gray-600 text-gray-300 rounded text-xs font-medium cursor-not-allowed flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Upload Failed
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                // ✅ ONLY use supabasePath (relative path)
                                // ❌ NEVER use fileUrl (could be full URL)
                                // supabasePath format: users/userId/documents/filename.pdf
                                const documentPath = cert.supabasePath;
                                
                                if (!documentPath) {
                                  alert('Document path not found. Please re-upload the document.');
                                  return;
                                }

                                // Validate it's not a URL (safety check)
                                if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
                                  console.error('❌ Invalid path format (URL detected):', documentPath);
                                  alert('Document path is invalid. Please re-upload the document.');
                                  return;
                                }

                                console.log('📄 Requesting signed URL for path:', documentPath);

                                // Generate signed URL using ONLY the relative path
                                const { signedUrl, error } = await getDocumentUrl(documentPath, 300);
                                
                                if (error || !signedUrl) {
                                  console.error('❌ Error getting signed URL:', error);
                                  alert(`Failed to open document: ${error?.message || 'Unknown error'}`);
                                  return;
                                }

                                console.log('✅ Signed URL generated, opening document');
                                // Open signed URL in new window
                                window.open(signedUrl, '_blank', 'noopener,noreferrer');
                              } catch (error) {
                                console.error('❌ Error viewing document:', error);
                                alert(`Failed to open document: ${error.message || 'Unknown error'}`);
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            View
                          </button>
                        )}
                      <button
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this document?')) return;

                          setDeletingCertId(cert.id);
                          try {
                            const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                            const userCertDocRef = doc(db, collectionName, currentUser.uid);
                            
                            // Get current document
                            const userCertDoc = await getDoc(userCertDocRef);
                            if (!userCertDoc.exists()) {
                              throw new Error('User certification document not found');
                            }

                            const data = userCertDoc.data();
                            const documents = data.documents || [];
                            
                            // Find and remove the document from array
                            const documentToDelete = documents.find(d => 
                              d.documentId === cert.documentId || 
                              d.fileName === cert.fileName ||
                              d.fileUrl === cert.fileUrl
                            );

                            if (!documentToDelete) {
                              throw new Error('Document not found in array');
                            }

                            // Remove from array
                            const updatedDocuments = documents.filter(d => 
                              !(d.documentId === cert.documentId || 
                                d.fileName === cert.fileName ||
                                d.fileUrl === cert.fileUrl)
                            );

                            // Update Firestore
                            await setDoc(userCertDocRef, {
                              providerId: currentUser.uid,
                              documents: updatedDocuments,
                              updatedAt: serverTimestamp()
                            }, { merge: true });

                            // Delete from Supabase Storage
                            // ✅ Prefer supabasePath (relative path) over fileUrl
                            try {
                              const { success, error: deleteError } = await deleteDocument(
                                cert.supabasePath || cert.fileUrl,
                                currentUser.uid
                              );
                              
                              if (deleteError) {
                                console.error('Error deleting file from Supabase:', deleteError);
                              } else {
                                console.log(`✅ Deleted file from Supabase Storage`);
                              }
                              // Continue even if storage delete fails - document already removed from Firestore
                            } catch (storageError) {
                              console.error('Error deleting file from Supabase:', storageError);
                              // Continue even if storage delete fails - document already removed from Firestore
                            }

                            setMessage({ type: 'success', text: 'Document deleted successfully!' });
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                          } catch (error) {
                            console.error('Error deleting document:', error);
                            setMessage({ type: 'error', text: 'Failed to delete document. Please try again.' });
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                          } finally {
                            setDeletingCertId(null);
                          }
                        }}
                        disabled={deletingCertId === cert.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {deletingCertId === cert.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" />
                            Delete
                          </>
                        )}
                      </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div >
  );
};

export default Admin;
