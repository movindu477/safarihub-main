import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
// Supabase Storage imports (replacing Firebase Storage)
import { uploadProfileImage, uploadDocument, deleteDocument, getDocumentUrl, uploadDocumentClientSide, deleteDocumentClientSide } from '../lib/supabase';
import { User, Save, Upload, CheckCircle, AlertCircle, MapPin, Phone, Globe, Calendar, Award, Car, DollarSign, FileText, Languages, Check, X, Bell, Package } from 'lucide-react';
import Navbar from './home/Navbar';
import Footer from './home/Footer';
import { updateBookingStatus, GlobalNotificationBell } from '../App';
import AvailabilityCalendar from './AvailabilityCalendar';
import TripCountdown from './TripCountdown';
import ManageProducts from './ManageProducts';
import MyPackages from './MyPackages';

// Helper function to format dates with month as text
const formatDate = (date) => {
  if (!date) return 'N/A';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const Admin = ({ user, onLogout, onShowAuth, notifications = [], onNotificationClick, onMarkAsRead }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'bookings', 'packages', 'availability'
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [uploadedCertifications, setUploadedCertifications] = useState([]);
  const [availabilityCalendar, setAvailabilityCalendar] = useState({}); // Legacy/General
  const [availabilityStandard, setAvailabilityStandard] = useState({}); // Standard Jeep
  const [availabilityLuxury, setAvailabilityLuxury] = useState({}); // Luxury Jeep

  const [isEditing, setIsEditing] = useState(false); // For profile edit mode
  const [isEditingCalendar, setIsEditingCalendar] = useState(false); // For calendar edit mode
  const [isSavingCalendar, setIsSavingCalendar] = useState(false); // Loading state for calendar save

  // Independent editing states
  const [isEditingStandard, setIsEditingStandard] = useState(false);
  const [isEditingLuxury, setIsEditingLuxury] = useState(false);

  // Temp states for editing
  const [tempAvailabilityStandard, setTempAvailabilityStandard] = useState({});
  const [tempAvailabilityLuxury, setTempAvailabilityLuxury] = useState({});

  const [lastSaveAttempt, setLastSaveAttempt] = useState(null); // Debug: Track last save payload
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'pending', 'accepted', 'completed', 'declined'
  const [nextBooking, setNextBooking] = useState(null); // Next upcoming booking for countdown

  // Form state - will be populated from userData
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    experience: '',
    description: '',
    // Jeep Driver fields
    vehicleType: '', // Legacy single vehicle type
    vehicleTypes: [], // New: Array for multiple vehicle types
    pricePerDay: '',
    priceFullDay: '', // Legacy
    priceHalfDay: '', // Legacy
    // Separate prices for each vehicle type
    priceFullDayStandard: '',
    priceHalfDayStandard: '',
    priceFullDayLuxury: '',
    priceHalfDayLuxury: '',
    destinations: '',
    languages: [],
    specialSkills: [],
    certifications: [],
    // Guide fields
    areasOfExpertise: [],
    hourlyRate: '',
    dailyRate: '',
    specialPackageRates: '',
    currencyPreference: 'LKR',
    storeName: '',
    website: '',
    rentingPolicies: '',
  });

  // Options for dropdowns/checkboxes
  const vehicleTypes = [
    "Standard Safari Jeep",
    "Luxury Safari Jeep"
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
    "Bird identification knowledge",
    "Tusker identification knowledge",
    "Leopard identification knowledge",
    "Reptile identification knowledge",
    "Flora identification knowledge",
    "First aid knowledge"
  ];

  const certifications = [
    "Wildlife Department of Sri Lanka certification",
    "Tourist Board of Sri Lanka certification"
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

  // Check auth and set up real-time listener for user data
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setCurrentUser(authUser);
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
        // Redirect to home if not logged in
        navigate('/');
      }
    });

    return () => authUnsubscribe();
  }, [auth, navigate]);

  // Set up real-time listener for user data and availability
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, "serviceProviders", currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserData(data);

        // Load availability calendar - REAL-TIME UPDATE
        let loadedStandard = {};
        let loadedLuxury = {};

        if (data.availabilityStandard && typeof data.availabilityStandard === 'object') {
          loadedStandard = data.availabilityStandard;
        }
        if (data.availabilityLuxury && typeof data.availabilityLuxury === 'object') {
          loadedLuxury = data.availabilityLuxury;
        }

        // Legacy Support
        if (data.availability && typeof data.availability === 'object' && !Array.isArray(data.availability) && Object.keys(loadedStandard).length === 0) {
          loadedStandard = { ...data.availability };
        }

        setAvailabilityStandard(loadedStandard);
        setAvailabilityLuxury(loadedLuxury);
        setAvailabilityCalendar(data.availability || {});


        // Check if user is a service provider (jeep driver, guide, or renting)
        if (data.serviceType === 'Jeep Driver' || data.serviceType === 'Tour Guide' || data.serviceType === 'Renting') {
          // Populate form with existing data
          setFormData({
            fullName: data.fullName || data.storeName || '',
            email: data.email || data.contactEmail || '',
            phone: data.phone || data.contactPhone || '',
            address: data.address || data.location || data.baseLocation || '',
            experience: data.experienceYears || data.experience || '',
            certificationStatus: data.certificationStatus || 'non-certified',
            description: data.description || data.bio || '',
            // Jeep Driver fields
            vehicleType: data.vehicleType || '', // Legacy single vehicle
            vehicleTypes: Array.isArray(data.vehicleTypes) ? data.vehicleTypes : (data.vehicleType ? [data.vehicleType] : []), // New: Multiple vehicle types
            pricePerDay: data.pricePerDay || data.price || data.dailyRate || '',
            priceFullDay: data.priceFullDay || '', // Legacy
            priceHalfDay: data.priceHalfDay || '', // Legacy
            // Separate prices for each vehicle type
            priceFullDayStandard: data.priceFullDayStandard || '',
            priceHalfDayStandard: data.priceHalfDayStandard || '',
            priceFullDayLuxury: data.priceFullDayLuxury || '',
            priceHalfDayLuxury: data.priceHalfDayLuxury || '',
            destinations: Array.isArray(data.destinations) ? data.destinations[0] || '' : data.destinations || '',
            languages: Array.isArray(data.languages) ? data.languages : (data.languagesSpoken ? [data.languagesSpoken] : []),
            specialSkills: Array.isArray(data.specialSkills) ? data.specialSkills : [],
            certifications: Array.isArray(data.certifications) ? data.certifications : [],
            // Guide fields
            areasOfExpertise: Array.isArray(data.areasOfExpertise) ? data.areasOfExpertise : [],
            hourlyRate: data.hourlyRate || '',
            dailyRate: data.dailyRate || '',
            specialPackageRates: data.specialPackageRates || '',
            currencyPreference: data.currencyPreference || 'LKR',
            // Renting fields
            storeName: data.storeName || data.fullName || '',
            website: data.website || '',
            rentingPolicies: data.rentingPolicies || '',
          });

          if (data.profilePicture) {
            setProfilePreview(data.profilePicture);
          }
        } else {
          // Not a service provider, redirect
          navigate('/');
        }
        setLoading(false);
      } else {
        // User not found in serviceProviders, redirect
        navigate('/');
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to user data:', error);
      setMessage({ type: 'error', text: 'Failed to load your data. Please try again.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, db, navigate]);

  // Handle URL tab parameter (e.g., /admin?tab=bookings)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'bookings', 'packages', 'availability'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Note: fetchUserData removed - now using real-time listener above

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
          // Prioritize pending bookings first
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;

          // Then sort by date (newest first)
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB - dateA;
        });
        setBookings(bookingsList);

        // Find next upcoming booking for countdown
        const now = new Date();
        const upcomingBookings = bookingsList
          .filter(booking => {
            if (booking.status !== 'accepted' && booking.status !== 'confirmed') {
              return false;
            }

            let bookingDate;
            if (booking.startDate?.toDate) {
              bookingDate = booking.startDate.toDate();
            } else if (booking.startDate) {
              bookingDate = new Date(booking.startDate);
            } else if (booking.dates && booking.dates.length > 0) {
              const firstDate = booking.dates[0];
              bookingDate = firstDate.toDate ? firstDate.toDate() : new Date(firstDate);
            } else {
              return false;
            }

            return bookingDate > now;
          })
          .sort((a, b) => {
            const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate || a.dates[0]);
            const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate || b.dates[0]);
            return dateA - dateB;
          });

        if (upcomingBookings.length > 0) {
          const nextTrip = upcomingBookings[0];
          setNextBooking({
            ...nextTrip,
            customerName: nextTrip.customerName || nextTrip.fullName || 'Customer',
            destination: nextTrip.nationalPark || nextTrip.destination || nextTrip.location || ''
          });
        } else {
          setNextBooking(null);
        }

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

      // Update booking status
      await updateBookingStatus(
        bookingId,
        status,
        currentUser.uid,
        booking.customerId,
        userData.fullName || userData.fullname || 'Provider',
        booking.customerName || 'Customer'
      );

      // If booking is accepted, update availability calendar
      if (status === 'accepted' || status === 'confirmed') {
        await updateAvailabilityForAcceptedBooking(booking);
      }

      setMessage({ type: 'success', text: `Booking ${status} successfully!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating booking status:', error);
      setMessage({ type: 'error', text: 'Failed to update booking status. Please try again.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  // Update availability calendar when booking is accepted
  const updateAvailabilityForAcceptedBooking = async (booking) => {
    if (!currentUser) return;

    try {
      console.log('📅 Updating availability for accepted booking:', booking);

      // Get the service provider document from serviceProviders collection
      const providerDocRef = doc(db, 'serviceProviders', currentUser.uid);

      // Get current availability calendar
      const providerDoc = await getDoc(providerDocRef);
      if (!providerDoc.exists()) return;

      const providerData = providerDoc.data();
      const serviceType = providerData.serviceType;

      // Determine which field to update
      let targetField = 'availability'; // Default for guides
      if (serviceType === 'Jeep Driver') {
        const vehicleType = booking.selectedVehicleType || '';
        if (vehicleType.includes('Luxury')) {
          targetField = 'availabilityLuxury';
        } else {
          targetField = 'availabilityStandard';
        }
      }

      const currentAvailability = providerData[targetField] || {};
      const updatedAvailability = { ...currentAvailability };
      let datesProcessed = false;

      // Process datesWithTypes
      if (booking.datesWithTypes && Array.isArray(booking.datesWithTypes) && booking.datesWithTypes.length > 0) {
        booking.datesWithTypes.forEach(item => {
          try {
            const date = item.date?.toDate ? item.date.toDate() : new Date(item.date);
            const dateKey = date.toISOString().split('T')[0];
            const type = (item.type || 'full-day').toLowerCase().trim();

            const isFullDay = type === 'full-day' || type === 'full' || type === 'fullday';
            const isHalfDay = type === 'half-day' || type === 'half' || type === 'halfday' || type === 'half day';

            if (isFullDay) {
              updatedAvailability[dateKey] = 'busy';
              datesProcessed = true;
            } else if (isHalfDay) {
              const currentStatus = updatedAvailability[dateKey];
              if (currentStatus === 'halfday' || currentStatus === 'halfday-morning' || currentStatus === 'halfday-evening') {
                updatedAvailability[dateKey] = 'busy';
              } else {
                updatedAvailability[dateKey] = 'halfday';
              }
              datesProcessed = true;
            }
          } catch (error) {
            console.error('Error processing date:', error);
          }
        });
      }

      // Fallback to legacy dates array if datesWithTypes didn't work
      if (!datesProcessed && booking.selectedDates && Array.isArray(booking.selectedDates)) {
        booking.selectedDates.forEach(d => {
          try {
            const date = new Date(d);
            const dateKey = date.toISOString().split('T')[0];
            updatedAvailability[dateKey] = 'busy';
            datesProcessed = true;
          } catch (e) { }
        });
      }

      if (datesProcessed) {
        // Save updated availability to Firestore
        const updatePayload = {
          [targetField]: updatedAvailability,
          updatedAt: serverTimestamp()
        };

        // Also sync standard 'availability' for compatibility
        if (targetField !== 'availability') {
          updatePayload.availability = updatedAvailability;
        }

        await updateDoc(providerDocRef, updatePayload);

        // Update local state
        if (targetField === 'availabilityStandard' || (targetField === 'availability' && serviceType !== 'Jeep Driver')) {
          setAvailabilityStandard(updatedAvailability);
        }
        if (targetField === 'availabilityLuxury') {
          setAvailabilityLuxury(updatedAvailability);
        }
        setAvailabilityCalendar(updatedAvailability);

        console.log(`✅ ${targetField} updated successfully`);
      }
    } catch (error) {
      console.error('❌ Error updating availability calendar:', error);
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
        address: formData.address.trim(),
        experienceYears: formData.experience ? parseInt(formData.experience) : 0,
        description: formData.description.trim(),
        contactEmail: formData.email.trim(),
        contactPhone: formData.phone.trim(),
        updatedAt: serverTimestamp(),
      };

      // Service type specific fields
      if (serviceType === 'Jeep Driver') {
        // Parse prices (handle comma-separated strings)
        const parsePrice = (priceStr) => {
          if (!priceStr) return 0;
          return parseInt(priceStr.toString().replace(/,/g, '')) || 0;
        };

        updateData = {
          ...updateData,
          vehicleType: formData.vehicleType || '', // Legacy single vehicle
          vehicleTypes: formData.vehicleTypes || [], // New: Multiple vehicle types array
          pricePerDay: formData.pricePerDay ? parseInt(formData.pricePerDay) : 0,
          priceFullDay: formData.priceFullDay ? parseInt(formData.priceFullDay) : 0,
          priceHalfDay: formData.priceHalfDay ? parseInt(formData.priceHalfDay) : 0,
          // Separate prices for each vehicle type
          priceFullDayStandard: parsePrice(formData.priceFullDayStandard),
          priceHalfDayStandard: parsePrice(formData.priceHalfDayStandard),
          priceFullDayLuxury: parsePrice(formData.priceFullDayLuxury),
          priceHalfDayLuxury: parsePrice(formData.priceHalfDayLuxury),
          destinations: formData.destinations ? [formData.destinations] : [],
          languages: formData.languages || [],
          specialSkills: formData.specialSkills || [],
          certifications: formData.certifications || [],
        };
      } else if (serviceType === 'Tour Guide') {
        // Parse prices
        const parsePrice = (priceStr) => {
          if (!priceStr) return 0;
          return parseInt(priceStr.toString().replace(/,/g, '')) || 0;
        };

        updateData = {
          ...updateData,
          destinations: formData.destinations ? [formData.destinations] : [],
          areasOfExpertise: formData.areasOfExpertise || [],
          hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) : 0,
          dailyRate: formData.dailyRate ? parseInt(formData.dailyRate) : 0,
          priceFullDayStandard: parsePrice(formData.priceFullDayStandard),
          priceHalfDayStandard: parsePrice(formData.priceHalfDayStandard),
          specialPackageRates: formData.specialPackageRates || '',
          currencyPreference: formData.currencyPreference || 'LKR',
          languages: formData.languages || [],
        };
      } else if (serviceType === 'Renting') {
        updateData = {
          ...updateData,
          storeName: formData.storeName || formData.fullName,
          website: formData.website || '',
          rentingPolicies: formData.rentingPolicies || '',
        };
      }

      // ✅ VALIDATION: Full day price must be greater than half day price
      if (serviceType === 'Jeep Driver') {
        const fullStd = updateData.priceFullDayStandard || 0;
        const halfStd = updateData.priceHalfDayStandard || 0;
        const fullLux = updateData.priceFullDayLuxury || 0;
        const halfLux = updateData.priceHalfDayLuxury || 0;

        // Check Standard Jeep prices
        if (fullStd > 0 && halfStd > 0 && fullStd <= halfStd) {
          setSaving(false);
          setMessage({ type: 'error', text: '❌ Full Day Standard price must be greater than Half Day Standard price' });
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
          return;
        }

        // Check Luxury Jeep prices
        if (fullLux > 0 && halfLux > 0 && fullLux <= halfLux) {
          setSaving(false);
          setMessage({ type: 'error', text: '❌ Full Day Luxury price must be greater than Half Day Luxury price' });
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
          return;
        }
      } else if (serviceType === 'Tour Guide') {
        const fullDay = updateData.priceFullDayStandard || 0;
        const halfDay = updateData.priceHalfDayStandard || 0;

        if (fullDay > 0 && halfDay > 0 && fullDay <= halfDay) {
          setSaving(false);
          setMessage({ type: 'error', text: '❌ Full Day price must be greater than Half Day price' });
          setTimeout(() => setMessage({ type: '', text: '' }), 5000);
          return;
        }
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
      setIsEditing(false); // Exit edit mode after successful save

      // Note: No need to manually refresh - real-time listener will update automatically

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
  const isRenting = userData.serviceType === 'Renting';

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
                  {isGuide ? 'Manage your Tour Guide profile' : isRenting ? 'Manage your Renting Shop profile' : 'Manage your Jeep Driver profile'}
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

            {/* My Packages Tab - For Jeep/Guide */}
            {(isJeepDriver || isGuide) && (
              <button
                type="button"
                onClick={() => setActiveTab('packages')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'packages'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
              >
                My Packages
              </button>
            )}

            {/* My Products Tab - Only for Renting */}
            {isRenting && (
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'products'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
              >
                My Products
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'availability'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              Availability
            </button>
          </div>

          {/* Dashboard Widgets - Only show on profile tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4 mb-4">
              {/* Trip Countdown Widget */}
              {nextBooking && <TripCountdown nextBooking={nextBooking} />}

              {/* Orders Widget - Full Width */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-xl">
                <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  Orders
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-400">
                      {bookings.filter(b => b.status === 'pending').length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-400">
                      {bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Confirmed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-400">
                      {bookings.filter(b => b.status === 'completed').length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-400">
                      {bookings.length}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Total</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700">
              {/* Header with Edit/Save Buttons */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                  {/* Certification Status Badge */}
                  {userData && (
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${userData.certificationStatus === 'certified' && userData.certificationApproved === true
                      ? 'bg-green-900/50 text-green-300 border border-green-500/30'
                      : userData.certificationStatus === 'certified' && userData.certificationApproved !== true
                        ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
                        : userData.certificationStatus === 'uncertified' || userData.certificationRejected
                          ? 'bg-red-900/50 text-red-300 border border-red-500/30'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600/30'
                      }`}>
                      {userData.certificationStatus === 'certified' && userData.certificationApproved === true ? (
                        <>✓ Certified</>
                      ) : userData.certificationStatus === 'certified' && userData.certificationApproved !== true ? (
                        <>⏳ Pending Approval</>
                      ) : userData.certificationStatus === 'uncertified' || userData.certificationRejected ? (
                        <>✗ Not Certified</>
                      ) : (
                        <>○ Non-Certified Service</>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          // Reload user data to discard changes
                          if (userData) {
                            setFormData({
                              fullName: userData.fullName || '',
                              email: userData.email || '',
                              phone: userData.phone || '',
                              location: userData.location || '',
                              experience: userData.experience || '',
                              description: userData.description || '',
                              vehicleType: userData.vehicleType || '',
                              vehicleTypes: Array.isArray(userData.vehicleTypes) ? userData.vehicleTypes : (userData.vehicleType ? [userData.vehicleType] : []),
                              pricePerDay: userData.pricePerDay || '',
                              priceFullDay: userData.priceFullDay || '',
                              priceHalfDay: userData.priceHalfDay || '',
                              priceFullDayStandard: userData.priceFullDayStandard || '',
                              priceHalfDayStandard: userData.priceHalfDayStandard || '',
                              priceFullDayLuxury: userData.priceFullDayLuxury || '',
                              priceHalfDayLuxury: userData.priceHalfDayLuxury || '',
                              destinations: userData.destinations || '',
                              languages: userData.languages || [],
                              specialSkills: userData.specialSkills || [],
                              certifications: userData.certifications || [],
                              areasOfExpertise: userData.areasOfExpertise || [],
                              hourlyRate: userData.hourlyRate || '',
                              dailyRate: userData.dailyRate || '',
                              specialPackageRates: userData.specialPackageRates || '',
                              currencyPreference: userData.currencyPreference || 'LKR',
                            });
                            setProfileFile(null);
                            setProfilePreview(null);
                          }
                        }}
                        className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Main Two Boxes - Side by Side */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                {/* Left Box - Basic Information */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-400" />
                    Basic Information
                  </h2>

                  <div className="space-y-3">
                    {/* Profile Picture and Full Name Row */}
                    <div className="flex gap-4 items-start">
                      {/* Profile Picture - Left */}
                      <div className="shrink-0">
                        <label className="block text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                          <Upload className="h-3 w-3" />
                          Profile Picture
                        </label>
                        {isEditing ? (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfileImageSelect}
                              className="hidden"
                              id="profile-picture-upload"
                            />
                            <label
                              htmlFor="profile-picture-upload"
                              className="cursor-pointer block"
                            >
                              {profilePreview || userData?.profilePicture ? (
                                <img
                                  src={profilePreview || userData.profilePicture}
                                  alt="Profile"
                                  className="h-24 w-24 rounded-full object-cover border-2 border-emerald-500 hover:border-emerald-400 transition-colors"
                                />
                              ) : (
                                <div className="h-24 w-24 rounded-full bg-gray-900/50 border-2 border-gray-600 hover:border-emerald-500 transition-colors flex items-center justify-center">
                                  <User className="h-12 w-12 text-gray-500" />
                                </div>
                              )}
                            </label>
                            <p className="text-xs text-gray-500 mt-1 text-center">Click to change</p>
                          </div>
                        ) : (
                          <div>
                            {(userData?.profilePicture || profilePreview) ? (
                              <img
                                src={profilePreview || userData.profilePicture}
                                alt="Profile"
                                className="h-24 w-24 rounded-full object-cover border-2 border-emerald-500 shadow-lg"
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-gray-900/50 border-2 border-gray-600 flex items-center justify-center">
                                <User className="h-12 w-12 text-gray-500" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Full Name - Right */}
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Full Name *
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            required
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.fullName || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email and Phone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Email *
                        </label>
                        <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-400">
                          {formData.email || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone *
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="+94701234567"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.phone || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address and Experience */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Address *
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            required
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Full address"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.address || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Experience *
                        </label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={formData.experience}
                            onChange={(e) => handleInputChange('experience', e.target.value)}
                            required
                            min="0"
                            max="50"
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.experience ? `${formData.experience} years` : 'Not provided'}
                          </div>
                        )}
                      </div>

                      {/* Certification Status - READ ONLY (Based on Registration) */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Certification Status
                        </label>
                        {/* Always View-Only - Status from registration/database */}
                        <div>
                          {formData.certificationStatus === 'certified' ? (
                            <div className="space-y-2">
                              {userData?.certificationApproved ? (
                                <div className="w-full px-4 py-3 text-sm rounded-lg font-semibold bg-green-500/20 border-2 border-green-500 text-green-300 flex items-center gap-2">
                                  <CheckCircle className="h-5 w-5" />
                                  ✓ Certified Provider (Approved)
                                </div>
                              ) : userData?.certificationRejected ? (
                                <div className="w-full px-4 py-3 text-sm rounded-lg font-semibold bg-red-500/20 border-2 border-red-500 text-red-300 flex items-center gap-2">
                                  <X className="h-5 w-5" />
                                  Certification Rejected
                                </div>
                              ) : (
                                <div className="w-full px-4 py-3 text-sm rounded-lg font-semibold bg-yellow-500/20 border-2 border-yellow-500 text-yellow-300 flex items-center gap-2 animate-pulse">
                                  <AlertCircle className="h-5 w-5" />
                                  ⏳ Pending Admin Approval
                                </div>
                              )}
                              <p className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                                {userData?.certificationApproved
                                  ? `✓ Approved by ${userData.certificationApprovedByName || 'Admin'} on ${userData.certificationApprovedAt?.toDate?.().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}`
                                  : userData?.certificationRejected
                                    ? `✗ Reason: ${userData.certificationRejectionReason || 'Please contact admin for details'}`
                                    : 'ℹ️ Your certification request is being reviewed. You will be notified once approved.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-full px-4 py-3 text-sm rounded-lg font-semibold bg-gray-600/20 border-2 border-gray-500 text-gray-300 flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                Non-Certified Provider
                              </div>
                              <p className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                                ℹ️ You are registered as a non-certified service provider. Standard rates apply.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service Provider Bio */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Service Provider Bio
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          rows="2"
                          className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                          placeholder={isRenting ? "Tell us about your rental shop..." : "Tell us about yourself..."}
                        />
                      ) : (
                        <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200 whitespace-pre-wrap">
                          {formData.description || 'No description provided'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Box - Service Specific Details */}
                {isJeepDriver && (
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4 text-emerald-400" />
                      Service Rates
                    </h2>

                    <div className="space-y-3">

                      {/* Vehicle Type(s) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Vehicle Type(s) {isEditing && <span className="text-gray-400 text-xs">(Select all that apply)</span>}
                        </label>
                        {isEditing ? (
                          <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50 space-y-2">
                            {vehicleTypes.map(type => (
                              <div key={type} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`vehicle-edit-${type}`}
                                  checked={formData.vehicleTypes?.includes(type) || false}
                                  onChange={() => handleMultiSelectChange('vehicleTypes', type)}
                                  className="mr-2 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded bg-gray-800 cursor-pointer"
                                />
                                <label htmlFor={`vehicle-edit-${type}`} className="text-sm text-gray-300 cursor-pointer">
                                  {type}
                                </label>
                              </div>
                            ))}
                            {formData.vehicleTypes && formData.vehicleTypes.length > 0 && (
                              <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                                Selected: {formData.vehicleTypes.join(', ')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.vehicleTypes && formData.vehicleTypes.length > 0
                              ? formData.vehicleTypes.join(', ')
                              : (formData.vehicleType || 'Not specified')
                            }
                          </div>
                        )}
                      </div>

                      {/* Pricing based on selected vehicle types */}
                      {isEditing && formData.vehicleTypes && formData.vehicleTypes.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-white font-semibold text-sm">Pricing Information</h4>

                          {/* Standard Safari Jeep Prices */}
                          {formData.vehicleTypes.includes("Standard Safari Jeep") && (
                            <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5">
                              <p className="text-green-400 font-medium text-xs mb-2">Standard Safari Jeep Pricing</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Full Day Price (LKR) *
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.priceFullDayStandard}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Prevent starting with 0
                                      if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                        return;
                                      }
                                      handleInputChange('priceFullDayStandard', value);
                                    }}
                                    required
                                    className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Enter full day price (e.g., 20,000)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Half Day Price (LKR) *
                                    )
                                    ) : (
                                    <span className="text-emerald-400 ml-1">(Max: 12,000)</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.priceHalfDayStandard}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Prevent starting with 0
                                      if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                        return;
                                      }
                                      handleInputChange('priceHalfDayStandard', value);
                                    }}
                                    required
                                    className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Enter half day price (e.g., 10,000)"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Luxury Safari Jeep Prices */}
                          {formData.vehicleTypes.includes("Luxury Safari Jeep") && (
                            <div className="border border-yellow-500/30 rounded-lg p-3 bg-yellow-500/5">
                              <p className="text-yellow-400 font-medium text-xs mb-2">Luxury Safari Jeep Pricing</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Full Day Price (LKR) *
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.priceFullDayLuxury}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Prevent starting with 0
                                      if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                        return;
                                      }
                                      handleInputChange('priceFullDayLuxury', value);
                                    }}
                                    required
                                    className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Enter full day price (e.g., 30,000)"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Half Day Price (LKR) *
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.priceHalfDayLuxury}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // Prevent starting with 0
                                      if (value === '0' || (value.startsWith('0') && !value.includes(','))) {
                                        return;
                                      }
                                      handleInputChange('priceHalfDayLuxury', value);
                                    }}
                                    required
                                    className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Enter half day price (e.g., 15,000)"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View Mode Prices */}
                      {!isEditing && (
                        <div className="space-y-2">
                          {/* Standard Prices */}
                          {(formData.priceFullDayStandard || formData.priceHalfDayStandard) && (
                            <div className="border border-green-500/30 rounded-lg p-2 bg-green-500/5">
                              <p className="text-green-400 font-medium text-xs mb-1">Standard Safari Jeep</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {formData.priceFullDayStandard && (
                                  <div>
                                    <span className="text-gray-400">Full Day:</span>{' '}
                                    <span className="text-gray-200">LKR {parseInt(formData.priceFullDayStandard).toLocaleString()}</span>
                                  </div>
                                )}
                                {formData.priceHalfDayStandard && (
                                  <div>
                                    <span className="text-gray-400">Half Day:</span>{' '}
                                    <span className="text-gray-200">LKR {parseInt(formData.priceHalfDayStandard).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Luxury Prices */}
                          {(formData.priceFullDayLuxury || formData.priceHalfDayLuxury) && (
                            <div className="border border-yellow-500/30 rounded-lg p-2 bg-yellow-500/5">
                              <p className="text-yellow-400 font-medium text-xs mb-1">Luxury Safari Jeep</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {formData.priceFullDayLuxury && (
                                  <div>
                                    <span className="text-gray-400">Full Day:</span>{' '}
                                    <span className="text-gray-200">LKR {parseInt(formData.priceFullDayLuxury).toLocaleString()}</span>
                                  </div>
                                )}
                                {formData.priceHalfDayLuxury && (
                                  <div>
                                    <span className="text-gray-400">Half Day:</span>{' '}
                                    <span className="text-gray-200">LKR {parseInt(formData.priceHalfDayLuxury).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Legacy prices fallback */}
                          {!formData.priceFullDayStandard && !formData.priceHalfDayStandard && !formData.priceFullDayLuxury && !formData.priceHalfDayLuxury && (formData.priceFullDay || formData.priceHalfDay) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Full Day Price (LKR)</label>
                                <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                                  {formData.priceFullDay ? `LKR ${parseInt(formData.priceFullDay).toLocaleString()}` : 'Not set'}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1">Half Day Price (LKR)</label>
                                <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                                  {formData.priceHalfDay ? `LKR ${parseInt(formData.priceHalfDay).toLocaleString()}` : 'Not set'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* National Park */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          National Park *
                        </label>
                        {isEditing ? (
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
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.destinations || 'Not specified'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isRenting && (
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-400" />
                      Shop Details
                    </h2>

                    <div className="space-y-3">
                      {/* Store Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">
                          Store Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.storeName}
                            onChange={(e) => handleInputChange('storeName', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Store Name"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.storeName || formData.fullName || 'Not specified'}
                          </div>
                        )}
                      </div>

                      {/* Website */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Website
                        </label>
                        {isEditing ? (
                          <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="https://example.com"
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.website ? (
                              <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                                {formData.website}
                              </a>
                            ) : 'Not specified'}
                          </div>
                        )}
                      </div>

                      {/* Renting Policies */}
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Renting Policies
                        </label>
                        {isEditing ? (
                          <textarea
                            value={formData.rentingPolicies}
                            onChange={(e) => handleInputChange('rentingPolicies', e.target.value)}
                            rows="4"
                            className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                            placeholder="Enter your renting policies, terms, and conditions..."
                          />
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200 whitespace-pre-wrap">
                            {formData.rentingPolicies || 'No policies specified'}
                          </div>
                        )}
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
                        {isEditing ? (
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
                        ) : (
                          <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                            {formData.destinations || 'Not specified'}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Hourly Rate
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.hourlyRate}
                              onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                              min="0"
                              className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="2000"
                            />
                          ) : (
                            <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                              {formData.hourlyRate ? `LKR ${parseInt(formData.hourlyRate).toLocaleString()}` : 'Not set'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Daily Rate
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.dailyRate}
                              onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                              min="0"
                              className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="15000"
                            />
                          ) : (
                            <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                              {formData.dailyRate ? `LKR ${parseInt(formData.dailyRate).toLocaleString()}` : 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Package Rates
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.specialPackageRates}
                              onChange={(e) => handleInputChange('specialPackageRates', e.target.value)}
                              className="w-full px-3 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              placeholder="3-day: 40,000 LKR"
                            />
                          ) : (
                            <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                              {formData.specialPackageRates || 'Not set'}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">
                            Currency
                          </label>
                          {isEditing ? (
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
                          ) : (
                            <div className="w-full px-3 py-1.5 text-sm bg-gray-900/50 rounded-lg text-gray-200">
                              {formData.currencyPreference || 'LKR'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Sections Below - Languages, Skills, etc. in separate boxes */}
              {(isJeepDriver || isRenting) && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
                  {/* Languages Box */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Languages className="h-4 w-4 text-emerald-400" />
                      Languages
                    </label>
                    <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50 max-h-40 overflow-y-auto">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-1.5">
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
                      ) : (
                        <div className="space-y-1.5">
                          {formData.languages && formData.languages.length > 0 ? (
                            formData.languages.map((language, index) => (
                              <div key={index} className="text-sm text-gray-300">
                                • {language}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 italic">No languages selected</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Special Skills Box */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <label className="block text-sm font-semibold text-white mb-3">Special Skills</label>
                    <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50 max-h-40 overflow-y-auto">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-1.5">
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
                      ) : (
                        <div className="space-y-1.5">
                          {formData.specialSkills && formData.specialSkills.length > 0 ? (
                            formData.specialSkills.map((skill, index) => (
                              <div key={index} className="text-sm text-gray-300">
                                • {skill}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 italic">No special skills selected</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Jeep Driver Certifications - Only show if certified */}
                  {userData.certificationStatus === 'certified' && (
                    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-semibold text-white flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-400" />
                          Jeep Driver Certifications
                        </label>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              // Trigger file input click
                              document.getElementById('certification-upload-input')?.click();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Add Document
                          </button>
                        )}
                        <input
                          id="certification-upload-input"
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            try {
                              setMessage({ type: 'info', text: 'Uploading document...' });
                              setSaving(true);

                              console.log('📤 Uploading document:', file.name);

                              // Upload to Supabase using client-side method
                              const { url, path, error } = await uploadDocumentClientSide(file, currentUser.uid, file.name);

                              if (error) {
                                console.error('Upload failed:', error);
                                setMessage({ type: 'error', text: `Upload failed: ${error}` });
                                setSaving(false);
                                return;
                              }

                              console.log('✅ Upload successful:', { url, path });

                              // Create document metadata
                              const newDocument = {
                                certificationName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                                fileName: file.name,
                                fileUrl: url,
                                supabasePath: path,
                                fileSize: file.size,
                                fileType: file.type,
                                uploadedAt: new Date(),
                                documentId: `${currentUser.uid}_${Date.now()}`,
                                uploadStatus: 'uploaded'
                              };

                              // Determine collection based on service type
                              const isJeepDriver = userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting';
                              const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                              const userCertDocRef = doc(db, collectionName, currentUser.uid);

                              // Get existing documents
                              const existingDoc = await getDoc(userCertDocRef);
                              const existingDocuments = existingDoc.exists() ? (existingDoc.data().documents || []) : [];

                              // Add new document to array
                              const updatedDocuments = [...existingDocuments, newDocument];

                              // Save to Firestore
                              await setDoc(userCertDocRef, {
                                providerId: currentUser.uid,
                                documents: updatedDocuments,
                                updatedAt: serverTimestamp()
                              }, { merge: true });

                              console.log('✅ Document saved to Firestore');
                              setMessage({ type: 'success', text: 'Document uploaded successfully!' });
                              setSaving(false);

                              // Reset file input
                              e.target.value = '';
                            } catch (error) {
                              console.error('❌ Upload error:', error);
                              setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
                              setSaving(false);
                            }
                          }}
                          className="hidden"
                        />
                      </div>

                      {/* View Mode - Display Documents from Registration */}
                      {!isEditing && (
                        <>
                          {/* Documents from Registration Info */}
                          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-xs font-semibold text-blue-300 mb-1">Documents from Registration</h4>
                                <p className="text-xs text-blue-200">
                                  The documents shown below were uploaded during your registration.
                                  Click "Edit Profile" to add or modify documents.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Uploaded Documents List */}
                          <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-white flex items-center gap-1">
                                <FileText className="h-3 w-3 text-emerald-400" />
                                Uploaded Documents
                                {uploadedCertifications.length > 0 && (
                                  <span className="text-xs text-gray-400 font-normal">
                                    ({uploadedCertifications.length})
                                  </span>
                                )}
                              </h4>
                            </div>

                            {uploadedCertifications.length === 0 ? (
                              <div className="text-center py-6">
                                <p className="text-gray-400 text-xs mb-1">No documents uploaded yet</p>
                                <p className="text-gray-500 text-xs">
                                  Documents uploaded during registration will appear here automatically
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {uploadedCertifications.map((cert) => {
                                  // Improved path resolution
                                  const getPathObj = (c) => {
                                    const p = c.supabasePath || c.path; // Check both keys
                                    const u = c.fileUrl || c.url;
                                    return {
                                      path: typeof p === 'string' && p.trim() ? p.trim() : null,
                                      url: typeof u === 'string' && u.trim() ? u.trim() : null
                                    };
                                  };
                                  const { path: docPath, url: docUrl } = getPathObj(cert);
                                  const hasValidPath = !!docPath || !!docUrl;
                                  const hasError = cert.uploadStatus === 'failed' || (!hasValidPath && cert.uploadStatus !== 'uploaded');

                                  return (
                                    <div key={cert.id} className={`bg-gray-900/50 rounded-lg p-2 border ${hasError ? 'border-red-600' : 'border-gray-600'} flex items-center justify-between`}>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <FileText className="h-4 w-4 text-emerald-400" />
                                          <span className="text-sm text-white font-medium">{cert.certificationName || cert.fileName || 'Document'}</span>
                                        </div>
                                        {(cert.fileSize || cert.size) && (
                                          <p className="text-xs text-gray-400 ml-6">
                                            {cert.fileSize
                                              ? `${(cert.fileSize / 1024).toFixed(2)} KB`
                                              : cert.size}
                                          </p>
                                        )}
                                        {cert.uploadedAt && (
                                          <p className="text-xs text-gray-500 ml-6">
                                            Uploaded: {cert.uploadedAt.toDate
                                              ? cert.uploadedAt.toDate().toLocaleDateString()
                                              : new Date(cert.uploadedAt).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!hasValidPath) {
                                            console.error('No document path available:', cert);
                                            setMessage({ type: 'error', text: 'Document path not found.' });
                                            return;
                                          }
                                          try {
                                            // Prefer path, then URL
                                            let targetPath = docPath || docUrl;

                                            // If we only have URL and it's from Supabase, try to extract path for better signing
                                            if (!docPath && docUrl && docUrl.includes('/documents/')) {
                                              const match = docUrl.match(/\/documents\/(.+)$/);
                                              if (match) targetPath = match[1];
                                            }

                                            const { signedUrl, error } = await getDocumentUrl(targetPath);

                                            if (error) {
                                              console.error('Error getting document URL:', error);
                                              // Fallback: if getDocumentUrl failed but we have a raw URL, try opening it directly
                                              if (docUrl) {
                                                window.open(docUrl, '_blank', 'noopener,noreferrer');
                                                return;
                                              }
                                              setMessage({ type: 'error', text: 'Failed to open document.' });
                                              return;
                                            }
                                            window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                          } catch (error) {
                                            console.error('Error opening document:', error);
                                            setMessage({ type: 'error', text: 'Failed to open document.' });
                                          }
                                        }}
                                        disabled={!hasValidPath}
                                        className={`px-3 py-1.5 text-xs rounded transition-colors ${hasValidPath
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm font-medium'
                                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                          }`}
                                        title={hasValidPath ? 'View document' : 'Document path not available'}
                                      >
                                        View
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Edit Mode - Add/Manage Documents */}
                      {isEditing && (
                        <>
                          {uploadedCertifications.length === 0 ? (
                            <div className="text-center py-8">
                              <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                              <p className="text-gray-400 text-sm">No documents uploaded yet</p>
                              <p className="text-gray-500 text-xs mt-1">Click "Add Document" to upload your certifications</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {uploadedCertifications.map((cert, index) => {
                                const hasValidPath = (cert.supabasePath && cert.supabasePath.trim()) || (cert.fileUrl && cert.fileUrl.trim());
                                return (
                                  <div key={cert.id || index} className="bg-gray-900/50 rounded-lg p-3 border border-gray-600 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <FileText className="h-5 w-5 text-emerald-400" />
                                      <div>
                                        <p className="text-white font-medium text-sm">{cert.name || cert.certificationName || 'Document'}</p>
                                        {cert.size && (
                                          <p className="text-gray-400 text-xs">{cert.size}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!hasValidPath) {
                                            console.error('No document path available:', cert);
                                            setMessage({ type: 'error', text: 'Document path not found. Please re-upload the document.' });
                                            return;
                                          }
                                          try {
                                            const { signedUrl, error } = await getDocumentUrl(cert.supabasePath || cert.fileUrl);
                                            if (error) {
                                              console.error('Error getting document URL:', error);
                                              setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                              return;
                                            }
                                            window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                          } catch (error) {
                                            console.error('Error opening document:', error);
                                            setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                          }
                                        }}
                                        disabled={!hasValidPath}
                                        className={`px-3 py-1.5 text-xs rounded transition-colors ${hasValidPath
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                          }`}
                                        title={hasValidPath ? 'View document' : 'Document path not available'}
                                      >
                                        View
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!confirm(`Are you sure you want to delete "${cert.certificationName || cert.fileName}"?`)) {
                                            return;
                                          }

                                          try {
                                            setSaving(true);
                                            setMessage({ type: 'info', text: 'Deleting document...' });

                                            console.log('🗑️ Deleting document:', cert);

                                            // Delete from Supabase Storage if path exists
                                            if (cert.supabasePath || cert.fileUrl) {
                                              const { success, error } = await deleteDocumentClientSide(cert.supabasePath || cert.fileUrl);
                                              if (error) {
                                                console.warn('⚠️ Supabase delete warning:', error);
                                                // Continue with Firestore deletion even if Storage delete fails
                                              }
                                            }

                                            // Remove from Firestore
                                            const isJeepDriver = userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting';
                                            const collectionName = isJeepDriver ? 'jeepDriverCertifications' : 'guideCertifications';
                                            const userCertDocRef = doc(db, collectionName, currentUser.uid);

                                            const existingDoc = await getDoc(userCertDocRef);
                                            if (existingDoc.exists()) {
                                              const existingDocuments = existingDoc.data().documents || [];
                                              const updatedDocuments = existingDocuments.filter(d => d.documentId !== cert.documentId);

                                              await setDoc(userCertDocRef, {
                                                providerId: currentUser.uid,
                                                documents: updatedDocuments,
                                                updatedAt: serverTimestamp()
                                              }, { merge: true });
                                            }

                                            console.log('✅ Document deleted');
                                            setMessage({ type: 'success', text: 'Document deleted successfully!' });
                                            setSaving(false);
                                          } catch (error) {
                                            console.error('❌ Delete error:', error);
                                            setMessage({ type: 'error', text: `Delete failed: ${error.message}` });
                                            setSaving(false);
                                          }
                                        }}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1.5"
                                        title="Delete document"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isGuide && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                  {/* Areas of Expertise Box */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <label className="block text-sm font-semibold text-white mb-3">Areas of Expertise</label>
                    <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50 max-h-48 overflow-y-auto">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-1.5">
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
                      ) : (
                        <div className="space-y-1.5">
                          {formData.areasOfExpertise && formData.areasOfExpertise.length > 0 ? (
                            formData.areasOfExpertise.map((area, index) => (
                              <div key={index} className="text-sm text-gray-300">
                                • {area}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 italic">No areas selected</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Languages Box */}
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-1">
                      <Languages className="h-4 w-4 text-emerald-400" />
                      Languages
                    </label>
                    <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50 max-h-32 overflow-y-auto">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-1.5">
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
                      ) : (
                        <div className="space-y-1.5">
                          {formData.languages && formData.languages.length > 0 ? (
                            formData.languages.map((language, index) => (
                              <div key={index} className="text-sm text-gray-300">
                                • {language}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 italic">No languages selected</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tour Guide Certifications - Same as Jeep Driver - Only show if certified */}
              {isGuide && userData.certificationStatus === 'certified' && (
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      Tour Guide Certifications
                    </label>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          // Trigger file input click
                          document.getElementById('guide-certification-upload-input')?.click();
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Add Document
                      </button>
                    )}
                    <input
                      id="guide-certification-upload-input"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        try {
                          setMessage({ type: 'info', text: 'Uploading document...' });
                          setSaving(true);

                          console.log('📤 Uploading document:', file.name);

                          // Upload to Supabase using client-side method
                          const { url, path, error } = await uploadDocumentClientSide(file, currentUser.uid, file.name);

                          if (error) {
                            console.error('Upload failed:', error);
                            setMessage({ type: 'error', text: `Upload failed: ${error}` });
                            setSaving(false);
                            return;
                          }

                          console.log('✅ Upload successful:', { url, path });

                          // Create document metadata
                          const newDocument = {
                            certificationName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                            fileName: file.name,
                            fileUrl: url,
                            supabasePath: path,
                            fileSize: file.size,
                            fileType: file.type,
                            uploadedAt: new Date(),
                            documentId: `${currentUser.uid}_${Date.now()}`,
                            uploadStatus: 'uploaded'
                          };

                          // Save to guideCertifications collection
                          const userCertDocRef = doc(db, 'guideCertifications', currentUser.uid);

                          // Get existing documents
                          const existingDoc = await getDoc(userCertDocRef);
                          const existingDocuments = existingDoc.exists() ? (existingDoc.data().documents || []) : [];

                          // Add new document to array
                          const updatedDocuments = [...existingDocuments, newDocument];

                          // Save to Firestore
                          await setDoc(userCertDocRef, {
                            providerId: currentUser.uid,
                            documents: updatedDocuments,
                            updatedAt: serverTimestamp()
                          }, { merge: true });

                          console.log('✅ Document saved to Firestore');
                          setMessage({ type: 'success', text: 'Document uploaded successfully!' });
                          setSaving(false);

                          // Reset file input
                          e.target.value = '';
                        } catch (error) {
                          console.error('❌ Upload error:', error);
                          setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
                          setSaving(false);
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* View Mode - Display Documents */}
                  {!isEditing && (
                    <>
                      {/* Documents Info Banner */}
                      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-semibold text-blue-300 mb-1">Documents from Registration</h4>
                            <p className="text-xs text-blue-200">
                              The documents shown below were uploaded during your registration.
                              Click "Edit Profile" to add or modify documents.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Uploaded Documents List */}
                      <div className="border border-gray-600 rounded-lg p-3 bg-gray-900/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-white flex items-center gap-1">
                            <FileText className="h-3 w-3 text-emerald-400" />
                            Uploaded Documents
                            {uploadedCertifications.length > 0 && (
                              <span className="text-xs text-gray-400 font-normal">
                                ({uploadedCertifications.length})
                              </span>
                            )}
                          </h4>
                        </div>

                        {uploadedCertifications.length === 0 ? (
                          <div className="text-center py-6">
                            <p className="text-gray-400 text-xs mb-1">No documents uploaded yet</p>
                            <p className="text-gray-500 text-xs">
                              Documents uploaded during registration will appear here automatically
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {uploadedCertifications.map((cert) => {
                              const hasValidPath = (cert.supabasePath && cert.supabasePath.trim()) || (cert.fileUrl && cert.fileUrl.trim());
                              const hasError = cert.uploadStatus === 'failed' || (!hasValidPath && cert.uploadStatus !== 'uploaded');
                              return (
                                <div key={cert.id} className={`bg-gray-900/50 rounded-lg p-2 border ${hasError ? 'border-red-600' : 'border-gray-600'} flex items-center justify-between`}>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <FileText className="h-4 w-4 text-emerald-400" />
                                      <span className="text-sm text-white font-medium">{cert.certificationName || cert.fileName || 'Document'}</span>
                                    </div>
                                    {(cert.fileSize || cert.size) && (
                                      <p className="text-xs text-gray-400 ml-6">
                                        {cert.fileSize
                                          ? `${(cert.fileSize / 1024).toFixed(2)} KB`
                                          : cert.size}
                                      </p>
                                    )}
                                    {cert.uploadedAt && (
                                      <p className="text-xs text-gray-500 ml-6">
                                        Uploaded: {cert.uploadedAt.toDate
                                          ? cert.uploadedAt.toDate().toLocaleDateString()
                                          : new Date(cert.uploadedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={async () => {
                                      if (!hasValidPath) {
                                        console.error('No document path available:', cert);
                                        setMessage({ type: 'error', text: 'Document path not found. Please re-upload the document.' });
                                        return;
                                      }
                                      try {
                                        const { signedUrl, error } = await getDocumentUrl(cert.supabasePath || cert.fileUrl);
                                        if (error) {
                                          console.error('Error getting document URL:', error);
                                          setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                          return;
                                        }
                                        window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                      } catch (error) {
                                        console.error('Error opening document:', error);
                                        setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                      }
                                    }}
                                    disabled={!hasValidPath}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${hasValidPath
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      }`}
                                    title={hasValidPath ? 'View document' : 'Document path not available'}
                                  >
                                    View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Edit Mode - Add/Manage Documents */}
                  {isEditing && (
                    <>
                      {uploadedCertifications.length === 0 ? (
                        <div className="text-center py-8">
                          <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No documents uploaded yet</p>
                          <p className="text-gray-500 text-xs mt-1">Click "Add Document" to upload your certifications</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {uploadedCertifications.map((cert, index) => {
                            const hasValidPath = (cert.supabasePath && cert.supabasePath.trim()) || (cert.fileUrl && cert.fileUrl.trim());
                            return (
                              <div key={cert.id || index} className="bg-gray-900/50 rounded-lg p-3 border border-gray-600 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <FileText className="h-5 w-5 text-emerald-400" />
                                  <div>
                                    <p className="text-white font-medium text-sm">{cert.name || cert.certificationName || 'Document'}</p>
                                    {cert.size && (
                                      <p className="text-gray-400 text-xs">{cert.size}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!hasValidPath) {
                                        console.error('No document path available:', cert);
                                        setMessage({ type: 'error', text: 'Document path not found. Please re-upload the document.' });
                                        return;
                                      }
                                      try {
                                        const { signedUrl, error } = await getDocumentUrl(cert.supabasePath || cert.fileUrl);
                                        if (error) {
                                          console.error('Error getting document URL:', error);
                                          setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                          return;
                                        }
                                        window.open(signedUrl, '_blank', 'noopener,noreferrer');
                                      } catch (error) {
                                        console.error('Error opening document:', error);
                                        setMessage({ type: 'error', text: 'Failed to open document. Please try again.' });
                                      }
                                    }}
                                    disabled={!hasValidPath}
                                    className={`px-3 py-1.5 text-xs rounded transition-colors ${hasValidPath
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                      }`}
                                    title={hasValidPath ? 'View document' : 'Document path not available'}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!confirm(`Are you sure you want to delete "${cert.certificationName || cert.fileName}"?`)) {
                                        return;
                                      }

                                      try {
                                        setSaving(true);
                                        setMessage({ type: 'info', text: 'Deleting document...' });

                                        console.log('🗑️ Deleting document:', cert);

                                        // Delete from Supabase Storage if path exists
                                        if (cert.supabasePath || cert.fileUrl) {
                                          const { success, error } = await deleteDocumentClientSide(cert.supabasePath || cert.fileUrl);
                                          if (error) {
                                            console.warn('⚠️ Supabase delete warning:', error);
                                            // Continue with Firestore deletion even if Storage delete fails
                                          }
                                        }

                                        // Remove from Firestore guideCertifications collection
                                        const userCertDocRef = doc(db, 'guideCertifications', currentUser.uid);

                                        const existingDoc = await getDoc(userCertDocRef);
                                        if (existingDoc.exists()) {
                                          const existingDocuments = existingDoc.data().documents || [];
                                          const updatedDocuments = existingDocuments.filter(d => d.documentId !== cert.documentId);

                                          await setDoc(userCertDocRef, {
                                            providerId: currentUser.uid,
                                            documents: updatedDocuments,
                                            updatedAt: serverTimestamp()
                                          }, { merge: true });
                                        }

                                        console.log('✅ Document deleted');
                                        setMessage({ type: 'success', text: 'Document deleted successfully!' });
                                        setSaving(false);
                                      } catch (error) {
                                        console.error('❌ Delete error:', error);
                                        setMessage({ type: 'error', text: `Delete failed: ${error.message}` });
                                        setSaving(false);
                                      }
                                    }}
                                    className="text-red-400 hover:text-red-300 transition-colors p-1.5"
                                    title="Delete document"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  My Bookings
                </h2>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setBookingFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    Pending ({bookings.filter(b => b.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('accepted')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'accepted'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    Accepted ({bookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'paid').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('confirmed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'confirmed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    Paid ({bookings.filter(b => (b.status === 'accepted' || b.status === 'confirmed') && b.paymentStatus === 'paid').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    Completed ({bookings.filter(b => b.status === 'completed').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('declined')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'declined'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    Declined ({bookings.filter(b => b.status === 'declined').length})
                  </button>
                </div>
              </div>

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
              ) : (() => {
                const filteredBookings = bookings.filter(booking => {
                  if (bookingFilter === 'all') return true;
                  if (bookingFilter === 'accepted') {
                    return booking.status === 'accepted' && booking.paymentStatus !== 'paid';
                  }
                  if (bookingFilter === 'confirmed') {
                    return (booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus === 'paid';
                  }
                  return booking.status === bookingFilter;
                });

                if (filteredBookings.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found</p>
                      {bookingFilter !== 'all' && (
                        <button
                          onClick={() => setBookingFilter('all')}
                          className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                        >
                          View All Bookings
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                      const bookingDate = booking.createdAt?.toDate?.() || booking.createdAt || new Date();
                      const formattedDate = formatDate(bookingDate);

                      // Calculate hours pending
                      const now = new Date();
                      const createdAt = booking.createdAt?.toDate?.() || new Date(booking.createdAt);
                      const hoursPending = Math.floor((now - createdAt) / (1000 * 60 * 60));
                      const isPendingOver16Hours = booking.status === 'pending' && hoursPending >= 16;
                      const isPendingOver24Hours = booking.status === 'pending' && hoursPending >= 24;

                      const statusColors = {
                        pending: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
                        accepted: 'bg-green-900/50 text-green-300 border-green-700',
                        confirmed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
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
                          className={`rounded-lg p-4 border cursor-pointer transition-colors hover:bg-gray-700 ${isPendingOver24Hours
                            ? 'bg-red-900/30 border-red-500/50 ring-2 ring-red-500/50'
                            : isPendingOver16Hours
                              ? 'bg-orange-900/30 border-orange-500/50 ring-2 ring-orange-500/50'
                              : 'bg-gray-700/50 border-gray-600'
                            }`}
                        >
                          {/* Urgent Alert Banner */}
                          {isPendingOver16Hours && (
                            <div className={`mb-3 px-3 py-2 rounded-lg border-2 ${isPendingOver24Hours
                              ? 'bg-red-900/50 border-red-500 text-red-200'
                              : 'bg-orange-900/50 border-orange-500 text-orange-200'
                              }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-bold text-sm">
                                  {isPendingOver24Hours ? '⚠️ URGENT: 24+ Hours No Response' : '⏰ WARNING: 16+ Hours Pending'}
                                </span>
                              </div>
                              <p className="text-xs">
                                {isPendingOver24Hours
                                  ? `This booking has been pending for ${hoursPending} hours. Customer is waiting!`
                                  : `This booking has been pending for ${hoursPending} hours. Please respond soon.`}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-white">
                                  {booking.customerName || 'Customer'}
                                </h3>
                                <span className={`px-2 py-1 rounded text-xs font-medium border ${booking.paymentStatus === 'paid'
                                  ? statusColors.confirmed
                                  : statusColors[booking.status] || statusColors.pending
                                  }`}>
                                  {booking.paymentStatus === 'paid' ? 'PAID' : (booking.status?.toUpperCase() || 'PENDING')}
                                </span>
                                {booking.status === 'pending' && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                                    {hoursPending}h pending
                                  </span>
                                )}
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
                                        const time = item.time || (booking.safariType?.toLowerCase().includes('evening') ? 'evening' : 'morning');
                                        const typeLabel = type === 'half-day'
                                          ? `Half Day (${time.charAt(0).toUpperCase() + time.slice(1)})`
                                          : 'Full Day';
                                        const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';

                                        // Calculate price per date
                                        const isFullDay = type === 'full-day' || type === 'full' || type === 'fullday';
                                        let datePrice = null;

                                        if (booking.datesWithTypes.length > 0 && booking.totalPrice) {
                                          // Try to calculate per-date price from total
                                          datePrice = booking.totalPrice / booking.datesWithTypes.length;
                                        } else if (item.price) {
                                          // Use item-specific price if available
                                          datePrice = item.price;
                                        }

                                        if (!date) return null;
                                        return (
                                          <div key={index} className="flex items-center justify-between text-xs">
                                            <span className="text-gray-300">{formatDate(date)}</span>
                                            <div className="flex items-center gap-2">
                                              <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                                              {datePrice && (
                                                <span className="text-gray-300 font-medium">LKR {Math.round(datePrice).toLocaleString()}</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : booking.selectedDates ? (
                                  <p><span className="font-medium">Dates:</span> {
                                    Array.isArray(booking.selectedDates)
                                      ? booking.selectedDates.map(d => formatDate(new Date(d))).join(', ')
                                      : formatDate(new Date(booking.selectedDates))
                                  }</p>
                                ) : booking.datesString ? (
                                  <p><span className="font-medium">Dates:</span> {booking.datesString}</p>
                                ) : null}
                                {booking.destination && (
                                  <p><span className="font-medium">Destination:</span> {booking.destination}</p>
                                )}
                                {booking.totalPrice && (
                                  <p className="border-t border-gray-700 pt-2 mt-2">
                                    <span className="font-medium">Total Price:</span>{' '}
                                    <span className="font-bold text-base">LKR {booking.totalPrice.toLocaleString()}</span>
                                  </p>
                                )}
                                <p><span className="font-medium">Booked on:</span> {formattedDate}</p>
                              </div>
                            </div>
                            {(() => {
                              // Check if booking date has passed (for completed button)
                              const getLatestBookingDate = () => {
                                if (booking.datesWithTypes && booking.datesWithTypes.length > 0) {
                                  const dates = booking.datesWithTypes.map(d => new Date(d.date));
                                  return new Date(Math.max(...dates));
                                } else if (booking.selectedDates) {
                                  const dates = Array.isArray(booking.selectedDates)
                                    ? booking.selectedDates.map(d => new Date(d))
                                    : [new Date(booking.selectedDates)];
                                  return new Date(Math.max(...dates));
                                }
                                return null;
                              };

                              const latestDate = getLatestBookingDate();
                              let hasBookingPassed = false;

                              if (latestDate) {
                                // Normalize both dates to midnight (start of day) for proper date-only comparison
                                const latestDateMidnight = new Date(latestDate);
                                latestDateMidnight.setHours(0, 0, 0, 0);

                                const nowMidnight = new Date();
                                nowMidnight.setHours(0, 0, 0, 0);

                                // Booking is considered "passed" if today is after the latest booking date
                                hasBookingPassed = nowMidnight > latestDateMidnight;
                              }

                              // Show different buttons based on status
                              if (booking.status === 'pending') {
                                return (
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
                                );
                              } else if (booking.status === 'accepted' && hasBookingPassed) {
                                return (
                                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleBookingStatusUpdate(booking.id, 'completed')}
                                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Mark as Completed
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* My Packages Tab - For all service providers */}
          {activeTab === 'packages' && (
            <div>
              {isRenting ? <ManageProducts /> : <MyPackages />}
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 relative overflow-visible">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-xl font-semibold text-white">Manage Your Availability</h2>
                </div>
                {/* Edit / Save Calendar Buttons */}
                <div className="flex gap-2">
                  {isEditingCalendar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          // Revert to original availability
                          setTempAvailabilityStandard({});
                          setTempAvailabilityLuxury({});
                          setIsEditingCalendar(false);
                        }}
                        className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsSavingCalendar(true);
                            console.log('📅 Saving calendar...');

                            // Save to database
                            if (currentUser) {
                              // Determine primary availability for legacy sync
                              const types = formData.vehicleTypes || [];
                              const hasStandard = types.includes('Standard Safari Jeep') || formData.vehicleType === 'Standard Safari Jeep' || (!types.length && !formData.vehicleType);

                              const savePayload = {
                                availabilityStandard: tempAvailabilityStandard,
                                availabilityLuxury: tempAvailabilityLuxury,
                                // Sync legacy field: prioritize Standard, fallback to Luxury if Standard not present
                                availability: hasStandard ? tempAvailabilityStandard : tempAvailabilityLuxury,
                                updatedAt: serverTimestamp()
                              };

                              const userDocRef = doc(db, 'serviceProviders', currentUser.uid);

                              console.log(`📅 Saving to user ${currentUser.uid}:`, savePayload);
                              setLastSaveAttempt({ ...savePayload, _status: 'Attempting...' });

                              await setDoc(userDocRef, savePayload, { merge: true });

                              setLastSaveAttempt({ ...savePayload, _status: 'Success' });
                              console.log('✅ Calendar saved to Firestore');

                              // Optimistic update
                              setAvailabilityStandard(tempAvailabilityStandard);
                              setAvailabilityLuxury(tempAvailabilityLuxury);

                              setIsEditingCalendar(false);
                              setMessage({ type: 'success', text: 'Availability calendar updated successfully!' });

                              // Clear message after 3 seconds
                              setTimeout(() => {
                                setMessage({ type: '', text: '' });
                              }, 3000);
                            } else {
                              console.error('❌ No current user found when saving calendar');
                              setMessage({ type: 'error', text: 'User session invalid. Please reload.' });
                            }
                          } catch (error) {
                            console.error('❌ Error updating availability:', error);
                            setMessage({ type: 'error', text: 'Failed to update calendar. Please try again.' });
                          } finally {
                            setIsSavingCalendar(false);
                          }
                        }}
                        disabled={isSavingCalendar}
                        className={`px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 ${isSavingCalendar ? 'opacity-75 cursor-wait' : ''}`}
                      >
                        {isSavingCalendar ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Calendar
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempAvailabilityStandard({ ...availabilityStandard });
                        setTempAvailabilityLuxury({ ...availabilityLuxury });
                        setIsEditingCalendar(true);
                      }}
                      className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                    >
                      Edit Calendar
                    </button>
                  )}
                </div>
              </div>
              {isEditingCalendar ? (
                <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-3 mb-6">
                  <p className="text-emerald-300 text-sm font-medium">
                    Editing Mode: Click on dates to set availability. All dates are unselected by default until you mark them.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                    <p className="text-blue-300 text-sm font-medium">
                      📅 View Mode: Busy dates from accepted bookings are shown in <span className="font-bold text-red-400">RED</span> and <span className="font-bold text-blue-400">BLUE</span>. Click "Edit Calendar" to manually set availability.
                    </p>
                  </div>
                  {(() => {
                    const acceptedCount = bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length;
                    const busyDatesCount = [
                      ...Object.values(availabilityStandard || {}),
                      ...Object.values(availabilityLuxury || {})
                    ].filter(status => [
                      'busy',
                      'halfday',
                      'halfday-morning',
                      'halfday-evening',
                      'unavailable',
                      'unavailable-fullday',
                      'unavailable-halfday-morning',
                      'unavailable-halfday-evening'
                    ].includes(status)).length;

                    if (acceptedCount > 0 && busyDatesCount === 0) {
                      return (
                        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-3 flex flex-col gap-2">
                          <p className="text-orange-300 text-sm font-medium">
                            ⚠️ {acceptedCount} accepted booking(s) but 0 busy dates marked.
                          </p>
                          <p className="text-orange-200 text-xs">
                            This may happen if bookings were accepted before the auto-sync feature was active. Please manually mark the dates as busy in the calendar below to prevent double bookings.
                          </p>
                        </div>
                      );
                    } else if (acceptedCount === 0 && busyDatesCount === 0) {
                      return (
                        <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">
                            ℹ️ No busy dates yet. Accept bookings from "My Bookings" tab to automatically mark dates as busy, or use "Edit Calendar" to manually set availability.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-3">
                          <p className="text-emerald-300 text-sm font-medium">
                            ✅ {acceptedCount} accepted booking(s) • {busyDatesCount} busy date(s) marked
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}


              {/* Conditional Calendar Rendering */}
              {(() => {
                // Determine which calendars to show
                const types = formData.vehicleTypes || [];
                const legacyType = formData.vehicleType;

                const showStandard = types.includes('Standard Safari Jeep') || legacyType === 'Standard Safari Jeep' || (!types.length && !legacyType);
                const showLuxury = types.includes('Luxury Safari Jeep') || legacyType === 'Luxury Safari Jeep';

                // If user has NO types selected but is a Jeep Driver, maybe default to Standard? handled above.

                return (
                  <div className="space-y-8">
                    {showStandard && (
                      <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-emerald-400 mb-4">🚙 Standard Jeep - Calendar</h3>
                        <AvailabilityCalendar
                          availability={isEditingCalendar ? tempAvailabilityStandard : availabilityStandard}
                          onChange={(newAvail) => setTempAvailabilityStandard(newAvail)}
                          readOnly={!isEditingCalendar}
                          acceptedBookings={bookings.filter(b => {
                            if (b.status !== 'accepted' && b.status !== 'confirmed') return false;
                            const type = b.vehicleType || b.selectedVehicleType;
                            return !type || type.includes('Standard');
                          })}
                        />
                      </div>
                    )}

                    {showLuxury && (
                      <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-semibold text-purple-400 mb-4">🚙 Luxury Jeep - Calendar</h3>
                        <AvailabilityCalendar
                          availability={isEditingCalendar ? tempAvailabilityLuxury : availabilityLuxury}
                          onChange={(newAvail) => setTempAvailabilityLuxury(newAvail)}
                          readOnly={!isEditingCalendar}
                          acceptedBookings={bookings.filter(b => {
                            if (b.status !== 'accepted' && b.status !== 'confirmed') return false;
                            const type = b.vehicleType || b.selectedVehicleType;
                            return type && type.includes('Luxury');
                          })}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* Global Notification Bell */}
      {
        currentUser && (
          <GlobalNotificationBell
            user={currentUser}
            notifications={notifications}
            onNotificationClick={onNotificationClick}
            onMarkAsRead={onMarkAsRead}
          />
        )
      }


      {/* Booking Details Side Box */}
      {
        showBookingDetails && selectedBooking && (
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
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${selectedBooking.paymentStatus === 'paid' ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700' :
                    selectedBooking.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' :
                      selectedBooking.status === 'accepted' ? 'bg-green-900/50 text-green-300 border-green-700' :
                        selectedBooking.status === 'declined' ? 'bg-red-900/50 text-red-300 border-red-700' :
                          selectedBooking.status === 'completed' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                            'bg-gray-700/50 text-gray-300 border-gray-600'
                    }`}>
                    {selectedBooking.paymentStatus === 'paid' ? 'CONFIRMED' : (selectedBooking.status?.toUpperCase() || 'PENDING')}
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
                            const time = item.time || (selectedBooking.safariType?.toLowerCase().includes('evening') ? 'evening' : 'morning');
                            const typeLabel = type === 'half-day'
                              ? `Half Day (${time.charAt(0).toUpperCase() + time.slice(1)})`
                              : 'Full Day';
                            const typeColor = type === 'half-day' ? 'text-yellow-400' : 'text-green-400';
                            // Calculate price for this day
                            const isFullDay = type === 'full' || type === 'full-day';
                            const dayPrice = isFullDay
                              ? selectedBooking.priceFullDay || selectedBooking.pricePerDay
                              : selectedBooking.priceHalfDay || (selectedBooking.pricePerDay * 0.6);
                            if (!date) return null;
                            return (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-white">{formatDate(date)}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${typeColor}`}>{typeLabel}</span>
                                  {dayPrice && (
                                    <span className="text-white font-medium">LKR {dayPrice.toLocaleString()}</span>
                                  )}
                                </div>
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
                            ? selectedBooking.selectedDates.map(d => formatDate(new Date(d))).join(', ')
                            : formatDate(new Date(selectedBooking.selectedDates))}
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
                          {formatDate(selectedBooking.createdAt?.toDate?.() || selectedBooking.createdAt)}
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
        )
      }

      <Footer />
    </div >
  );
};

export default Admin;
