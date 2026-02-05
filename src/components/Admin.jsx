import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
// Supabase Storage imports (replacing Firebase Storage)
import { uploadProfileImage, uploadDocument, deleteDocument, getDocumentUrl, uploadDocumentClientSide, deleteDocumentClientSide, uploadProviderDocumentClientSide } from '../lib/supabase';
import { User, Save, Upload, CheckCircle, AlertCircle, MapPin, Phone, Globe, Calendar, Award, Car, DollarSign, FileText, Languages, Check, X, Bell, Package, TrendingUp, TrendingDown, Wallet, CreditCard, ChevronDown } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
    province: '', // New field for Jeep Drivers
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

  const provinces = [
    "Western Province",
    "Central Province",
    "Southern Province",
    "Northern Province",
    "Eastern Province",
    "North Western Province",
    "North Central Province",
    "Uva Province",
    "Sabaragamuwa Province"
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
        if (data.serviceType === 'Jeep Driver' || data.serviceType === 'Tour Guide' || data.serviceType === 'Renting' || data.serviceType === 'Renting Store') {
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
            province: data.province || (data.serviceType === 'Renting' || data.serviceType === 'Renting Store' ? data.destinations : ''),
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
      const isJeepDriver = userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting' || userData.serviceType === 'Renting Store';
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
        province: formData.province || '',
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
      } else if (serviceType === 'Renting' || serviceType === 'Renting Store') {
        updateData = {
          ...updateData,
          storeName: formData.storeName || formData.fullName,
          website: formData.website || '',
          rentingPolicies: formData.rentingPolicies || '',
          destinations: formData.destinations || '', // Saving Province as a string
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
  const isRenting = userData.serviceType === 'Renting' || userData.serviceType === 'Renting Store';

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-[#050505] text-gray-100 font-sans selection:bg-emerald-500/30">
      <Navbar
        user={user}
        onLogout={onLogout}
        onLogin={(screen) => (onShowAuth ? onShowAuth(screen || 'login') : null)}
        onRegister={(screen) => (onShowAuth ? onShowAuth(screen || 'register') : null)}
      />

      <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">

        {/* Modern Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-900/40 backdrop-blur-xl border border-white/5 shadow-2xl p-8 sm:p-10">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="bg-linear-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
                  {formData.fullName || 'Service Provider'}
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl">
                {isGuide ? 'Manage your Tour Guide profile and bookings' : isRenting ? 'Manage your Renting Shop and products' : 'Manage your Jeep Driver profile and trips'}
              </p>
            </div>
            {userData.profilePicture && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-emerald-500 to-cyan-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                <img
                  src={profilePreview || userData.profilePicture}
                  alt={formData.fullName}
                  className="relative h-20 w-20 rounded-full object-cover border-2 border-gray-800 shadow-xl"
                />
              </div>
            )}
          </div>

          {/* Alert Message */}
          {message.text && (
            <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 shadow-lg backdrop-blur-md animate-fade-in-up ${message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-300 border border-red-500/20'
              }`}>
              <div className={`p-2 rounded-full ${message.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <span className="font-medium text-sm md:text-base">{message.text}</span>
            </div>
          )}
        </div>

        {/* Modern Navigation Tabs */}
        <div className="flex flex-wrap p-1.5 bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'profile', label: 'My Profile', icon: User },
            ...(!isRenting ? [{ id: 'bookings', label: 'My Bookings', icon: Calendar }] : []),
            ...((isJeepDriver || isGuide || isRenting) ? [{ id: 'packages', label: isRenting ? 'My Products' : 'My Packages', icon: Package }] : []),
            ...(!isRenting ? [{ id: 'availability', label: 'Availability', icon: Calendar }] : [])
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${isActive
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-linear-to-r from-emerald-600 to-teal-600 rounded-xl"></div>
                )}
                <span className="relative z-10 flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dashboard Stats Overview - Only on Profile Tab */}
        {activeTab === 'profile' && !isRenting && (
          <div className="animate-fade-in space-y-6">
            {/* Trip Countdown */}
            {nextBooking && <TripCountdown nextBooking={nextBooking} />}

            {/* Stats Grid */}
            <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-xl">
              <h3 className="text-gray-100 font-bold text-lg uppercase tracking-wider mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                </div>
                Booking Overview
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {[
                  { label: 'Pending', count: bookings.filter(b => b.status === 'pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                  { label: 'Confirmed', count: bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Completed', count: bookings.filter(b => b.status === 'completed').length, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Total', count: bookings.length, color: 'text-gray-200', bg: 'bg-gray-800/50', border: 'border-gray-700/50' },
                ].map((stat, idx) => (
                  <div key={idx} className={`relative overflow-hidden rounded-2xl p-6 border ${stat.border} ${stat.bg} group hover:scale-[1.02] transition-transform duration-300`}>
                    <div className={`text-4xl font-black ${stat.color} mb-2 tracking-tight`}>
                      {stat.count}
                    </div>
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in-up">
            <form onSubmit={handleSubmit} className="bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/5 relative overflow-hidden">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-full h-full bg-linear-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>

              {/* Header with Edit/Save Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-700/50 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    Profile Information
                    {userData && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 inset-0 ${userData.certificationStatus === 'certified' && userData.certificationApproved === true
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : userData.certificationStatus === 'certified' && userData.certificationApproved !== true
                          ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                          : userData.certificationStatus === 'uncertified' || userData.certificationRejected
                            ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                            : 'bg-gray-700/50 text-gray-400 ring-gray-600/30'
                        }`}>
                        {userData.certificationStatus === 'certified' && userData.certificationApproved === true ? (
                          'Certified'
                        ) : userData.certificationStatus === 'certified' && userData.certificationApproved !== true ? (
                          'Pending Approval'
                        ) : userData.certificationStatus === 'uncertified' || userData.certificationRejected ? (
                          'Not Certified'
                        ) : (
                          'Non-Certified'
                        )}
                      </span>
                    )}
                  </h2>
                  <p className="text-gray-400 text-sm">Update your personal details and service information.</p>
                </div>

                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
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
                              storeName: userData.storeName || userData.fullName || '',
                              website: userData.website || '',
                              rentingPolicies: userData.rentingPolicies || '',
                            });
                            setProfileFile(null);
                            setProfilePreview(null);
                          }
                        }}
                        className="px-5 py-2.5 text-sm font-medium border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 text-sm font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-5 py-2.5 text-sm font-bold bg-white/10 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white rounded-xl transition-all shadow-lg backdrop-blur-sm"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Main Two Boxes - Side by Side */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8 relative z-10">
                {/* Left Box - Basic Information */}
                <div className="bg-black/20 rounded-2xl p-6 md:p-8 border border-white/5">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <User className="h-5 w-5 text-emerald-400" />
                    </div>
                    Basic Information
                  </h3>

                  <div className="space-y-6">
                    {/* Profile Picture and Full Name Row */}
                    <div className="flex gap-6 items-start">
                      {/* Profile Picture - Left */}
                      <div className="shrink-0 group relative">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
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
                              className="cursor-pointer block relative group"
                            >
                              {profilePreview || userData?.profilePicture ? (
                                <>
                                  <img
                                    src={profilePreview || userData.profilePicture}
                                    alt="Profile"
                                    className="h-28 w-28 rounded-2xl object-cover border-2 border-emerald-500/50 group-hover:border-emerald-400 transition-all shadow-xl"
                                  />
                                  <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="h-28 w-28 rounded-2xl bg-gray-800/50 border-2 border-gray-600/50 border-dashed hover:border-emerald-500 hover:bg-gray-800 transition-all flex items-center justify-center group-hover:scale-105">
                                  <Upload className="h-8 w-8 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                                </div>
                              )}
                            </label>
                          </div>
                        ) : (
                          <div className="relative">
                            {(userData?.profilePicture || profilePreview) ? (
                              <img
                                src={profilePreview || userData.profilePicture}
                                alt="Profile"
                                className="h-28 w-28 rounded-2xl object-cover border-2 border-white/10 shadow-2xl"
                              />
                            ) : (
                              <div className="h-28 w-28 rounded-2xl bg-gray-800 border-2 border-white/10 flex items-center justify-center">
                                <User className="h-12 w-12 text-gray-600" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Full Name - Right */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                          Full Name <span className="text-emerald-500">*</span>
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            required
                            className="w-full px-4 py-3 text-base bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                            placeholder="Your Full Name"
                          />
                        ) : (
                          <div className="w-full px-4 py-3 text-lg font-medium text-white border-b border-white/10">
                            {formData.fullName || 'Not provided'}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Email and Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="group">
                        <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          Email <span className="text-emerald-500">*</span>
                        </label>
                        <div className={`w-full px-4 py-3 text-sm rounded-xl transition-all flex items-center gap-3 ${isEditing ? 'bg-white/5 border border-white/10 opacity-70 cursor-not-allowed' : 'bg-transparent border-b border-white/10'}`}>
                          <div className="p-1.5 rounded-lg bg-white/5">
                            <span className="text-gray-400">@</span>
                          </div>
                          <span className="text-gray-300 truncate">{formData.email || 'Not provided'}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          Phone <span className="text-emerald-500">*</span>
                        </label>
                        {isEditing ? (
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              required
                              className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none theme-input"
                              placeholder="+94 70 123 4567"
                            />
                          </div>
                        ) : (
                          <div className="w-full px-4 py-3 text-sm text-gray-300 border-b border-white/10 flex items-center gap-3">
                            <Phone className="h-4 w-4 text-emerald-500/70" />
                            {formData.phone || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address and Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          Address <span className="text-emerald-500">*</span>
                        </label>
                        {isEditing ? (
                          <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              required
                              className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                              placeholder="Full address"
                            />
                          </div>
                        ) : (
                          <div className="w-full px-4 py-3 text-sm text-gray-300 border-b border-white/10 flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-emerald-500/70" />
                            {formData.address || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                          {isJeepDriver ? 'Province' : 'Experience'} <span className="text-emerald-500">*</span>
                        </label>
                        {isEditing ? (
                          isJeepDriver ? (
                            <div className="relative">
                              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                              <select
                                value={formData.province}
                                onChange={(e) => handleInputChange('province', e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:ring-2 focus:ring-emerald-500/50 outline-none"
                              >
                                <option value="" className="bg-gray-900">Select Province</option>
                                {provinces.map(p => (
                                  <option key={p} value={p} className="bg-gray-900 text-white">{p}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 flex items-center justify-center font-serif italic">Y</div>
                              <input
                                type="number"
                                value={formData.experience}
                                onChange={(e) => handleInputChange('experience', e.target.value)}
                                required
                                min="0"
                                max="50"
                                className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                              />
                            </div>
                          )
                        ) : (
                          <div className="w-full px-4 py-3 text-sm text-gray-300 border-b border-white/10 flex items-center gap-3">
                            {isJeepDriver ? <MapPin className="h-4 w-4 text-emerald-500/70" /> : <Award className="h-4 w-4 text-emerald-500/70" />}
                            {isJeepDriver
                              ? (formData.province || 'Not provided')
                              : (formData.experience ? `${formData.experience} Years` : 'Not provided')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Certification Status - Block - Hidden for Renting */}
                    {!isRenting && (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 mt-2">
                        <label className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                          <Award className="h-4 w-4 text-yellow-500" />
                          Certification Status
                        </label>
                        {formData.certificationStatus === 'certified' ? (
                          <div className="space-y-3">
                            {userData?.certificationApproved ? (
                              <div className="w-full px-4 py-3 text-sm rounded-lg font-bold bg-linear-to-r from-emerald-900/50 to-emerald-900/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 shadow-lg">
                                <div className="p-1 rounded-full bg-emerald-500 text-black"><Check className="h-3 w-3" /></div>
                                Certified Provider (Approved)
                              </div>
                            ) : userData?.certificationRejected ? (
                              <div className="w-full px-4 py-3 text-sm rounded-lg font-bold bg-linear-to-r from-red-900/50 to-red-900/20 border border-red-500/30 text-red-300 flex items-center gap-3">
                                <div className="p-1 rounded-full bg-red-500 text-black"><X className="h-3 w-3" /></div>
                                Certification Rejected
                              </div>
                            ) : (
                              <div className="w-full px-4 py-3 text-sm rounded-lg font-bold bg-linear-to-r from-amber-900/50 to-amber-900/20 border border-amber-500/30 text-amber-300 flex items-center gap-3">
                                <div className="p-1 rounded-full bg-amber-500 text-black animate-pulse"><AlertCircle className="h-3 w-3" /></div>
                                Pending Admin Approval
                              </div>
                            )}
                            <p className="text-xs text-gray-400 pl-1 leading-relaxed">
                              {userData?.certificationApproved
                                ? `Approved by ${userData.certificationApprovedByName || 'Admin'} on ${userData.certificationApprovedAt?.toDate?.().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}`
                                : userData?.certificationRejected
                                  ? `Reason: ${userData.certificationRejectionReason || 'Please contact admin for details'}`
                                  : 'Your certification request is being reviewed. You will be notified once approved.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-full px-4 py-3 text-sm rounded-lg font-bold bg-white/5 border border-white/10 text-gray-400 flex items-center gap-3">
                              <div className="p-1 rounded-full bg-gray-600 text-black"><User className="h-3 w-3" /></div>
                              Non-Certified Provider
                            </div>
                            <p className="text-xs text-gray-500 pl-1">
                              You are registered as a non-certified service provider. Standard rates apply.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Bio */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                        Bio / Description
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          rows="4"
                          className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none resize-none leading-relaxed"
                          placeholder={isRenting ? "Tell us about your rental shop..." : "Tell us about yourself, your experience, and what makes your service unique..."}
                        />
                      ) : (
                        <div className="w-full px-5 py-4 text-sm bg-white/5 rounded-xl text-gray-300 whitespace-pre-wrap leading-relaxed border border-white/5 italic">
                          {formData.description || 'No description provided.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Box - Service Specific Details */}
                {(isJeepDriver || isRenting || isGuide) && (
                  <div className="space-y-6">
                    {/* Jeep Driver Details */}
                    {isJeepDriver && (
                      <div className="bg-black/20 rounded-2xl p-6 md:p-8 border border-white/5 h-full">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Car className="h-5 w-5 text-emerald-400" />
                          </div>
                          Service Rates & Vehicles
                        </h3>

                        <div className="space-y-6">
                          {/* Vehicle Type(s) */}
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">
                              Vehicle Type(s) {isEditing && <span className="text-emerald-500 normal-case ml-1">(Select all that apply)</span>}
                            </label>
                            {isEditing ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {vehicleTypes.map(type => {
                                  const isSelected = formData.vehicleTypes?.includes(type);
                                  return (
                                    <label
                                      key={type}
                                      className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected || false}
                                        onChange={() => handleMultiSelectChange('vehicleTypes', type)}
                                        className="h-5 w-5 text-emerald-500 rounded border-gray-500 focus:ring-emerald-500 bg-gray-900 border-2"
                                      />
                                      <span className={`ml-3 text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                        {type}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {formData.vehicleTypes && formData.vehicleTypes.length > 0 ? (
                                  formData.vehicleTypes.map(type => (
                                    <span key={type} className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium">
                                      <Car className="h-3.5 w-3.5 mr-2" />
                                      {type}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-sm">Not specified</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Pricing based on selected vehicle types */}
                          {(formData.vehicleTypes && formData.vehicleTypes.length > 0) && (
                            <div className="space-y-5">
                              <h4 className="text-white font-bold text-sm uppercase tracking-wider border-b border-white/10 pb-2">Pricing Information</h4>

                              {/* Standard Safari Jeep Prices */}
                              {formData.vehicleTypes.includes("Standard Safari Jeep") && (
                                <div className="bg-linear-to-br from-emerald-900/10 to-emerald-900/5 rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Car className="h-16 w-16 text-emerald-500" />
                                  </div>
                                  <div className="relative z-10">
                                    <p className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
                                      Standard Safari Jeep
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Tier 1</span>
                                    </p>
                                    {isEditing ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-emerald-200/70 mb-1.5">Full Day (LKR)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rs.</span>
                                            <input
                                              type="text"
                                              value={formData.priceFullDayStandard}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val !== '0' && (!val.startsWith('0') || val.includes(','))) handleInputChange('priceFullDayStandard', val);
                                              }}
                                              className="w-full pl-8 pr-3 py-2 bg-black/20 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                                              placeholder="20,000"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-emerald-200/70 mb-1.5">Half Day (LKR)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rs.</span>
                                            <input
                                              type="text"
                                              value={formData.priceHalfDayStandard}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val !== '0' && (!val.startsWith('0') || val.includes(','))) handleInputChange('priceHalfDayStandard', val);
                                              }}
                                              className="w-full pl-8 pr-3 py-2 bg-black/20 border border-emerald-500/30 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                                              placeholder="10,000"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-6">
                                        <div>
                                          <span className="block text-xs text-emerald-200/60 mb-0.5">Full Day</span>
                                          <span className="text-lg font-bold text-white font-mono">{formData.priceFullDayStandard ? `Rs. ${parseInt(formData.priceFullDayStandard).toLocaleString()}` : '-'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs text-emerald-200/60 mb-0.5">Half Day</span>
                                          <span className="text-lg font-bold text-white font-mono">{formData.priceHalfDayStandard ? `Rs. ${parseInt(formData.priceHalfDayStandard).toLocaleString()}` : '-'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Luxury Safari Jeep Prices */}
                              {formData.vehicleTypes.includes("Luxury Safari Jeep") && (
                                <div className="bg-linear-to-br from-amber-900/10 to-amber-900/5 rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Award className="h-16 w-16 text-amber-500" />
                                  </div>
                                  <div className="relative z-10">
                                    <p className="text-amber-400 font-bold text-sm mb-4 flex items-center gap-2">
                                      Luxury Safari Jeep
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">Premium</span>
                                    </p>
                                    {isEditing ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-amber-200/70 mb-1.5">Full Day (LKR)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rs.</span>
                                            <input
                                              type="text"
                                              value={formData.priceFullDayLuxury}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val !== '0' && (!val.startsWith('0') || val.includes(','))) handleInputChange('priceFullDayLuxury', val);
                                              }}
                                              className="w-full pl-8 pr-3 py-2 bg-black/20 border border-amber-500/30 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                                              placeholder="30,000"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-amber-200/70 mb-1.5">Half Day (LKR)</label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rs.</span>
                                            <input
                                              type="text"
                                              value={formData.priceHalfDayLuxury}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val !== '0' && (!val.startsWith('0') || val.includes(','))) handleInputChange('priceHalfDayLuxury', val);
                                              }}
                                              className="w-full pl-8 pr-3 py-2 bg-black/20 border border-amber-500/30 rounded-lg text-white text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                                              placeholder="15,000"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-6">
                                        <div>
                                          <span className="block text-xs text-amber-200/60 mb-0.5">Full Day</span>
                                          <span className="text-lg font-bold text-white font-mono">{formData.priceFullDayLuxury ? `Rs. ${parseInt(formData.priceFullDayLuxury).toLocaleString()}` : '-'}</span>
                                        </div>
                                        <div>
                                          <span className="block text-xs text-amber-200/60 mb-0.5">Half Day</span>
                                          <span className="text-lg font-bold text-white font-mono">{formData.priceHalfDayLuxury ? `Rs. ${parseInt(formData.priceHalfDayLuxury).toLocaleString()}` : '-'}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* National Park */}
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                              Operating National Park
                            </label>
                            {isEditing ? (
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <select
                                  value={formData.destinations}
                                  onChange={(e) => handleInputChange('destinations', e.target.value)}
                                  required
                                  className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
                                >
                                  <option value="">Select Park</option>
                                  {destinations.map(dest => (
                                    <option key={dest} value={dest} className="bg-gray-900 text-white">{dest}</option>
                                  ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-gray-200 font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-emerald-500" />
                                {formData.destinations || 'Not specified'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Renting Section - Same Modern Style */}
                    {isRenting && (
                      <div className="bg-black/20 rounded-2xl p-6 md:p-8 border border-white/5 h-full">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Globe className="h-5 w-5 text-emerald-400" />
                          </div>
                          Shop Details
                        </h3>
                        <div className="space-y-6">
                          {/* Store Name & Website & Province */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Store Name</label>
                              {isEditing ? (
                                <input type="text" value={formData.storeName} onChange={(e) => handleInputChange('storeName', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Store Name" />
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium">{formData.storeName || formData.fullName || 'Not specified'}</div>
                              )}
                            </div>

                            {/* Province Selection for Renting */}
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Province</label>
                              {isEditing ? (
                                <div className="relative">
                                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                  <select
                                    value={formData.destinations}
                                    onChange={(e) => handleInputChange('destinations', e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl text-white appearance-none focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                  >
                                    <option value="" className="bg-gray-900">Select Province</option>
                                    {provinces.map(p => (
                                      <option key={p} value={p} className="bg-gray-900">{p}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-emerald-500" />
                                  {formData.destinations || 'Not specified'}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Website</label>
                              {isEditing ? (
                                <input type="url" value={formData.website} onChange={(e) => handleInputChange('website', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="https://example.com" />
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-emerald-400 font-medium truncate">{formData.website ? <a href={formData.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{formData.website}</a> : 'Not specified'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Policies</label>
                              {isEditing ? (
                                <textarea value={formData.rentingPolicies} onChange={(e) => handleInputChange('rentingPolicies', e.target.value)} rows="4" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="Renting policies..." />
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm whitespace-pre-wrap">{formData.rentingPolicies || 'No policies'}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Guide Section */}
                    {isGuide && (
                      <div className="bg-black/20 rounded-2xl p-6 md:p-8 border border-white/5 h-full">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Award className="h-5 w-5 text-emerald-400" />
                          </div>
                          Tour Guide Details
                        </h3>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">National Park</label>
                            {isEditing ? (
                              <select value={formData.destinations} onChange={(e) => handleInputChange('destinations', e.target.value)} required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none">
                                <option value="">Select Park</option>
                                {destinations.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                              </select>
                            ) : (
                              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-medium">{formData.destinations || 'Not specified'}</div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Hourly Rate</label>
                              {isEditing ? (
                                <input type="number" value={formData.hourlyRate} onChange={(e) => handleInputChange('hourlyRate', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="2000" />
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono">{formData.hourlyRate ? `Rs. ${formData.hourlyRate}` : '-'}</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Daily Rate</label>
                              {isEditing ? (
                                <input type="number" value={formData.dailyRate} onChange={(e) => handleInputChange('dailyRate', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="15000" />
                              ) : (
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono">{formData.dailyRate ? `Rs. ${formData.dailyRate}` : '-'}</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Package Rates</label>
                            {isEditing ? (
                              <input type="text" value={formData.specialPackageRates} onChange={(e) => handleInputChange('specialPackageRates', e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none" placeholder="3-Day: 40k" />
                            ) : (
                              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">{formData.specialPackageRates || 'Not set'}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Sections Below - Languages, Skills, etc. in separate boxes */}
              {/* Additional Info Grid - Full Width */}
              {
                (isJeepDriver || isGuide || isRenting) && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">

                    {/* Languages - For Jeep Drivers and Guides (Hidden for Renting) */}
                    {(isJeepDriver || isGuide) && (
                      <div className="bg-black/20 rounded-2xl p-6 border border-white/5 h-full hover:border-emerald-500/30 transition-colors group">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                            {/* Icon placeholder if needed, using text for now or imports if available */}
                            <span className="text-emerald-400">🗣️</span>
                          </div>
                          Languages Spoken
                        </h3>

                        <div className="bg-gray-900/40 rounded-xl p-3 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                          {isEditing ? (
                            <div className="space-y-2">
                              {languages.map(lang => {
                                const isSelected = formData.languages.includes(lang);
                                return (
                                  <label key={lang} className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleMultiSelectChange('languages', lang)}
                                      className="h-4 w-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 bg-gray-800"
                                    />
                                    <span className={`ml-3 text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>{lang}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {formData.languages && formData.languages.length > 0 ? (
                                formData.languages.map(lang => (
                                  <span key={lang} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                                    {lang}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm italic">No languages specified</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Special Skills (Jeep) or Areas of Expertise (Guide) - Hidden for Renting */}
                    {(isJeepDriver || isGuide) && (
                      <div className="bg-black/20 rounded-2xl p-6 border border-white/5 h-full hover:border-emerald-500/30 transition-colors group">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                            <span className="text-emerald-400">⚡</span>
                          </div>
                          {isJeepDriver ? 'Special Skills' : 'Areas of Expertise'}
                        </h3>

                        <div className="bg-gray-900/40 rounded-xl p-3 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                          {isEditing ? (
                            <div className="space-y-2">
                              {((isJeepDriver) ? specialSkills : areasOfExpertise).map(item => {
                                const field = (isJeepDriver) ? 'specialSkills' : 'areasOfExpertise';
                                const isSelected = formData[field]?.includes(item);
                                return (
                                  <label key={item} className="flex items-center p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleMultiSelectChange(field, item)}
                                      className="h-4 w-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 bg-gray-800"
                                    />
                                    <span className={`ml-3 text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-400'}`}>{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(formData[isJeepDriver ? 'specialSkills' : 'areasOfExpertise'] || []).length > 0 ? (
                                (formData[isJeepDriver ? 'specialSkills' : 'areasOfExpertise']).map(item => (
                                  <span key={item} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-sm italic">None specified</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Documents / Certifications - Only for Certified Providers */}
                    {userData.certificationStatus === 'certified' && (
                      <div className="bg-black/20 rounded-2xl p-6 border border-white/5 h-full hover:border-emerald-500/30 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                              <span className="text-emerald-400">📄</span>
                            </div>
                            Documents
                          </h3>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                // Try to find either input
                                const input = document.getElementById('certification-upload-input') || document.getElementById('guide-certification-upload-input');
                                if (input) input.click();
                                else alert("Document upload not available in quick view. Please refresh.");
                              }}
                              className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                              title="Add Document"
                            >
                              <span className="text-xs font-bold">+</span>
                            </button>
                          )}
                          {/* Hidden inputs are expected to be present elsewhere or valid here. 
                             Actually, we need to preserve the Inputs in the original code or re-add them here to make upload work.
                             The Inputs were: 'certification-upload-input' and 'guide-certification-upload-input'.
                             We'll add a generic one that handles the logic based on serviceType dynamically if needed, 
                             but reusing the existing IDs is safer if we knew they existed. 
                             Since we are REPLACING the block that contained them, we MUST re-add them.
                         */}
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
                                const { url, path, error } = await uploadProviderDocumentClientSide(file, currentUser.uid, file.name);
                                if (error) throw new Error(error);

                                const newDocument = {
                                  certificationName: file.name.replace(/\.[^/.]+$/, ''),
                                  fileName: file.name,
                                  fileUrl: url,
                                  supabasePath: path,
                                  fileSize: file.size,
                                  fileType: file.type,
                                  uploadedAt: new Date(),
                                  documentId: `${currentUser.uid}_${Date.now()}`,
                                  uploadStatus: 'uploaded'
                                };

                                const collectionName = (userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting' || userData.serviceType === 'Renting Store') ? 'jeepDriverCertifications' : 'guideCertifications';
                                const userCertDocRef = doc(db, collectionName, currentUser.uid);
                                const existingDoc = await getDoc(userCertDocRef);
                                const existingDocuments = existingDoc.exists() ? (existingDoc.data().documents || []) : [];
                                await setDoc(userCertDocRef, {
                                  providerId: currentUser.uid,
                                  documents: [...existingDocuments, newDocument],
                                  updatedAt: serverTimestamp()
                                }, { merge: true });

                                setMessage({ type: 'success', text: 'Document uploaded!' });
                                setSaving(false);
                                e.target.value = '';
                              } catch (error) {
                                console.error('Upload error:', error);
                                setMessage({ type: 'error', text: 'Upload failed.' });
                                setSaving(false);
                              }
                            }}
                            className="hidden"
                          />
                          {/* Duplicate input ID for safety if guide logic looks for this specific ID */}
                          <input id="guide-certification-upload-input" type="file" className="hidden" onChange={(e) => document.getElementById('certification-upload-input').dispatchEvent(new Event('change', { bubbles: true }))} />
                        </div>

                        <div className="bg-gray-900/40 rounded-xl p-3 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                          {uploadedCertifications.length > 0 ? (
                            uploadedCertifications.map((cert, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 group-doc">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <span className="text-emerald-500/70">📄</span>
                                  <div className="truncate">
                                    <div className="text-xs text-white truncate max-w-[120px]">{cert.fileName || cert.name || cert.certificationName}</div>
                                    <div className="text-[10px] text-gray-500">{(cert.fileSize ? (cert.fileSize / 1024).toFixed(0) + 'KB' : cert.size) || 'Doc'}</div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const path = cert.supabasePath || cert.fileUrl;
                                      if (!path) return;
                                      const { signedUrl } = await getDocumentUrl(path);
                                      if (signedUrl) window.open(signedUrl, '_blank');
                                    }}
                                    className="p-1 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-gray-500 transition-colors"
                                  >
                                    <span className="text-xs">👁️</span>
                                  </button>
                                  {isEditing && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!confirm("Delete this document?")) return;
                                        setSaving(true);
                                        // Simplified delete logic
                                        try {
                                          if (cert.supabasePath) await deleteDocumentClientSide(cert.supabasePath);
                                          const collectionName = (userData.serviceType === 'Jeep Driver' || userData.serviceType === 'Renting' || userData.serviceType === 'Renting Store') ? 'jeepDriverCertifications' : 'guideCertifications';
                                          const userCertDocRef = doc(db, collectionName, currentUser.uid);
                                          const existingDoc = await getDoc(userCertDocRef);
                                          if (existingDoc.exists()) {
                                            const newDocs = existingDoc.data().documents.filter(d => d.documentId !== cert.documentId);
                                            await setDoc(userCertDocRef, { documents: newDocs }, { merge: true });
                                          }
                                          setMessage({ type: 'success', text: 'Deleted' });
                                        } catch (e) { console.error(e); }
                                        setSaving(false);
                                      }}
                                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-500 transition-colors"
                                    >
                                      <span className="text-xs">❌</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No documents found.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            </form >
          </div >
        )}

        {/* Bookings Tab */}
        {
          activeTab === 'bookings' && (
            <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl animate-fade-in-up">
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
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    All ({bookings.length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'pending'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    Pending ({bookings.filter(b => b.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('accepted')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'accepted'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    Accepted ({bookings.filter(b => b.status === 'accepted' && b.paymentStatus !== 'paid').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('confirmed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'confirmed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    Paid ({bookings.filter(b => (b.status === 'accepted' || b.status === 'confirmed') && b.paymentStatus === 'paid').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    Completed ({bookings.filter(b => b.status === 'completed').length})
                  </button>
                  <button
                    onClick={() => setBookingFilter('declined')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingFilter === 'declined'
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
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
          )
        }

        {/* My Packages Tab - For all service providers */}
        {
          activeTab === 'packages' && (
            <div>
              {isRenting ? <ManageProducts /> : <MyPackages />}
            </div>
          )
        }

        {/* Availability Tab */}
        {
          activeTab === 'availability' && (
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
          )
        }
      </div >

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
                  {(() => {
                    let statusClasses = 'bg-gray-700/50 text-gray-300 border-gray-600';
                    let statusText = selectedBooking.status?.toUpperCase() || 'PENDING';

                    if (selectedBooking.paymentStatus === 'paid') {
                      statusClasses = 'bg-emerald-900/50 text-emerald-300 border-emerald-700';
                      statusText = 'CONFIRMED';
                    } else if (selectedBooking.status === 'pending') {
                      statusClasses = 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
                    } else if (selectedBooking.status === 'accepted') {
                      statusClasses = 'bg-green-900/50 text-green-300 border-green-700';
                    } else if (selectedBooking.status === 'declined') {
                      statusClasses = 'bg-red-900/50 text-red-300 border-red-700';
                    } else if (selectedBooking.status === 'completed') {
                      statusClasses = 'bg-blue-900/50 text-blue-300 border-blue-700';
                    }

                    return (
                      <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${statusClasses}`}>
                        {statusText}
                      </span>
                    );
                  })()}
                </div>

                {/* Customer Information */}
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/20 transition-all shadow-lg">
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
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/20 transition-all shadow-lg">
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
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/20 transition-all shadow-lg">
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
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5 hover:border-emerald-500/20 transition-all shadow-lg">
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
