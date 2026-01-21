import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, where, query, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getDocumentUrl } from '../lib/supabase';
import { 
  Users, 
  Car, 
  MapPin, 
  TrendingUp, 
  Activity, 
  DollarSign,
  UserCheck,
  Calendar,
  LogOut,
  Menu,
  X,
  Eye,
  Mail,
  Phone,
  Award,
  Clock,
  FileText,
  Download,
  Shield,
  ExternalLink,
  CheckCircle,
  XCircle,
  Trash2,
  Store,
  ShoppingBag
} from 'lucide-react';

const AdminPanel = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const { user: currentUser, isAdmin } = useAuth();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentError, setDocumentError] = useState(null);
  const [certificationAction, setCertificationAction] = useState(null);
  const [certificationSuccess, setCertificationSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Dashboard Stats
  const [stats, setStats] = useState({
    totalJeepDrivers: 0,
    totalGuides: 0,
    totalTourists: 0,
    activeToday: 0,
    totalBookings: 0,
    totalRevenue: 0
  });
  
  // User Data
  const [jeepDrivers, setJeepDrivers] = useState([]);
  const [tourGuides, setTourGuides] = useState([]);
  const [tourists, setTourists] = useState([]);

  // Admin authentication is now handled by AuthContext and ProtectedRoute
  // No need for manual checks here

  // Fetch real-time data for Jeep Drivers
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const q = query(
      collection(db, 'serviceProviders'),
      where('serviceType', '==', 'Jeep Driver')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJeepDrivers(drivers);
      setStats(prev => ({ ...prev, totalJeepDrivers: drivers.length }));
    });

    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch real-time data for Tour Guides
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const q = query(
      collection(db, 'serviceProviders'),
      where('serviceType', '==', 'Tour Guide')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTourGuides(guides);
      setStats(prev => ({ ...prev, totalGuides: guides.length }));
    });

    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch real-time data for Tourists
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'tourists'), (snapshot) => {
      const touristsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTourists(touristsList);
      setStats(prev => ({ ...prev, totalTourists: touristsList.length }));
    });

    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch bookings for stats
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookings = snapshot.docs.map(doc => doc.data());
      const totalBookings = bookings.length;
      const totalRevenue = bookings.reduce((sum, booking) => {
        return sum + (booking.totalPrice || 0);
      }, 0);
      
      setStats(prev => ({ ...prev, totalBookings, totalRevenue }));
    });

    return () => unsubscribe();
  }, [isAdmin, db]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // View full details of a user (jeep driver, guide, renting store, or tourist)
  const handleViewDetails = async (user, userType) => {
    setSelectedUser({ ...user, userType });
    setShowDetailModal(true);
    setLoadingDetails(true);
    setUserDocuments([]);
    setDeleteConfirm(null);

    try {
      // Fetch documents for service providers only
      if (userType === 'jeepDriver' || userType === 'tourGuide') {
        let documents = [];
        
        // Try to get documents from the certification collections first
        const collectionName = userType === 'jeepDriver' ? 'jeepDriverCertifications' : 
                              userType === 'tourGuide' ? 'guideCertifications' : null;
        
        if (collectionName) {
          try {
            const docRef = doc(db, collectionName, user.id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              documents = data.documents || [];
            }
          } catch (err) {
            console.warn('Could not fetch from certification collection:', err);
          }
        }
        
        // If no documents found, check the serviceProviders document itself
        if (documents.length === 0) {
          try {
            const providerRef = doc(db, 'serviceProviders', user.id);
            const providerSnap = await getDoc(providerRef);
            
            if (providerSnap.exists()) {
              const providerData = providerSnap.data();
              // Check for documents in various possible fields
              documents = providerData.documents || 
                         providerData.certificationDocuments || 
                         providerData.uploadedDocuments || 
                         [];
              
              console.log('📄 Documents found in serviceProviders:', documents.length);
            }
          } catch (err) {
            console.error('Error fetching from serviceProviders:', err);
          }
        }
        
        setUserDocuments(documents);
      }
    } catch (error) {
      console.error('Error fetching user documents:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUser(null);
    setUserDocuments([]);
    setDocumentError(null);
    setCertificationSuccess(null);
    setDeleteConfirm(null);
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!selectedUser || !deleteConfirm) return;
    
    try {
      setDeleting(true);
      setDocumentError(null);
      
      const { id, userType } = selectedUser;
      
      // Determine the collection to delete from
      if (userType === 'tourist') {
        await deleteDoc(doc(db, 'tourists', id));
      } else {
        await deleteDoc(doc(db, 'serviceProviders', id));
        
        // Also try to delete from certification collections (if exists)
        try {
          if (userType === 'jeepDriver') {
            await deleteDoc(doc(db, 'jeepDriverCertifications', id));
          } else if (userType === 'tourGuide') {
            await deleteDoc(doc(db, 'guideCertifications', id));
          }
        } catch (err) {
          console.warn('Certification docs not found or already deleted:', err);
        }
      }
      
      console.log(`✅ Successfully deleted ${userType} with ID: ${id}`);
      
      // Close modal and show success
      closeDetailModal();
      
      // Update local state
      if (userType === 'jeepDriver') {
        setJeepDrivers(prev => prev.filter(d => d.id !== id));
      } else if (userType === 'tourGuide') {
        setTourGuides(prev => prev.filter(g => g.id !== id));
      } else if (userType === 'tourist') {
        setTourists(prev => prev.filter(t => t.id !== id));
      }
      
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      setDocumentError(error.message || 'Failed to delete user. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // Handle certification approval/rejection
  const handleCertificationUpdate = async (action) => {
    try {
      setCertificationAction(action);
      setCertificationSuccess(null);
      setDocumentError(null);

      if (!selectedUser || !selectedUser.id) {
        throw new Error('No user selected');
      }

      // Only allow approval/rejection for providers who registered as certified
      if (selectedUser.certificationStatus !== 'certified') {
        throw new Error('This provider did not register as a certified service provider');
      }

      const providerRef = doc(db, 'serviceProviders', selectedUser.id);
      
      if (action === 'approve') {
        // Approve certification
        await updateDoc(providerRef, {
          certificationStatus: 'certified',
          certificationApproved: true,
          certificationRejected: false,
          certifiedAt: serverTimestamp(),
          certifiedBy: currentUser.uid,
          lastUpdated: serverTimestamp()
        });

        setCertificationSuccess(`✅ Certification approved! The ${selectedUser.userType === 'jeepDriver' ? 'driver' : 'guide'} is now a certified service provider.`);
        
        // Update local state
        setSelectedUser(prev => ({
          ...prev,
          certificationApproved: true,
          certificationRejected: false,
          certifiedAt: new Date(),
          certifiedBy: currentUser.uid
        }));

        // Update the lists
        if (selectedUser.userType === 'jeepDriver') {
          setJeepDrivers(prev => prev.map(driver => 
            driver.id === selectedUser.id 
              ? { ...driver, certificationApproved: true, certificationRejected: false }
              : driver
          ));
        } else if (selectedUser.userType === 'tourGuide') {
          setTourGuides(prev => prev.map(guide => 
            guide.id === selectedUser.id 
              ? { ...guide, certificationApproved: true, certificationRejected: false }
              : guide
          ));
        }

      } else if (action === 'reject') {
        // Reject certification
        await updateDoc(providerRef, {
          certificationStatus: 'uncertified',
          certificationApproved: false,
          certificationRejected: true,
          rejectedAt: serverTimestamp(),
          rejectedBy: currentUser.uid,
          certifiedAt: null,
          certifiedBy: null,
          lastUpdated: serverTimestamp()
        });

        setCertificationSuccess(`❌ Certification rejected. The provider has been marked as uncertified.`);
        
        // Update local state
        setSelectedUser(prev => ({
          ...prev,
          certificationStatus: 'uncertified',
          certificationApproved: false,
          certificationRejected: true,
          rejectedAt: new Date(),
          rejectedBy: currentUser.uid
        }));

        // Update the lists
        if (selectedUser.userType === 'jeepDriver') {
          setJeepDrivers(prev => prev.map(driver => 
            driver.id === selectedUser.id 
              ? { ...driver, certificationStatus: 'uncertified', certificationApproved: false, certificationRejected: true }
              : driver
          ));
        } else if (selectedUser.userType === 'tourGuide') {
          setTourGuides(prev => prev.map(guide => 
            guide.id === selectedUser.id 
              ? { ...guide, certificationStatus: 'uncertified', certificationApproved: false, certificationRejected: true }
              : guide
          ));
        }
      }

      console.log(`✅ Successfully ${action}ed certification for ${selectedUser.userType}`);

    } catch (error) {
      console.error('❌ Error updating certification:', error);
      setDocumentError(error.message || 'Failed to update certification. Please try again.');
    } finally {
      setCertificationAction(null);
    }
  };

  // Handle document viewing
  const handleViewDocument = async (document) => {
    try {
      setViewingDocument(document.certificationType);
      setDocumentError(null);

      // Debug: Log the entire document structure
      console.log('📋 Document object:', JSON.stringify(document, null, 2));
      console.log('📋 Available fields:', Object.keys(document));

      let viewUrl = null;

      // Try multiple possible URL field names
      const possibleUrlFields = ['url', 'URL', 'fileUrl', 'fileURL', 'downloadURL', 'downloadUrl', 'publicUrl'];
      const possiblePathFields = ['path', 'filePath', 'storagePath', 'documentPath'];

      // 1. Check for direct URL in various field names
      for (const field of possibleUrlFields) {
        if (document[field] && typeof document[field] === 'string') {
          if (document[field].startsWith('http://') || document[field].startsWith('https://')) {
            console.log(`✅ Found public URL in field "${field}":`, document[field]);
            viewUrl = document[field];
            break;
          }
        }
      }

      // 2. If no direct URL found, try to generate signed URL from path
      if (!viewUrl) {
        for (const field of possiblePathFields) {
          if (document[field] && typeof document[field] === 'string') {
            console.log(`🔐 Found path in field "${field}", generating signed URL:`, document[field]);
            const { signedUrl, error } = await getDocumentUrl(document[field], 3600); // 1 hour expiration
            
            if (error) {
              console.warn(`⚠️ Failed to generate URL from ${field}:`, error);
              continue; // Try next field
            }
            
            viewUrl = signedUrl;
            break;
          }
        }
      }

      // 3. Last resort: try any field that looks like a URL or path
      if (!viewUrl) {
        console.log('🔍 Attempting fallback URL detection...');
        for (const [key, value] of Object.entries(document)) {
          if (typeof value === 'string' && value.length > 10) {
            // If it's a full URL
            if (value.startsWith('http://') || value.startsWith('https://')) {
              console.log(`✅ Found URL-like value in field "${key}":`, value);
              viewUrl = value;
              break;
            }
            // If it looks like a file path
            if (value.includes('/') && (value.includes('.pdf') || value.includes('.jpg') || value.includes('.png') || value.includes('.jpeg') || value.includes('.doc'))) {
              console.log(`🔐 Found path-like value in field "${key}", attempting to generate signed URL:`, value);
              try {
                const { signedUrl, error } = await getDocumentUrl(value, 3600);
                if (!error && signedUrl) {
                  viewUrl = signedUrl;
                  break;
                }
              } catch (err) {
                console.warn(`⚠️ Failed to generate URL from ${key}:`, err);
              }
            }
          }
        }
      }

      // 4. If still no URL found, show detailed error
      if (!viewUrl) {
        const availableFields = Object.keys(document).join(', ');
        throw new Error(`No valid URL or path found. Available fields: ${availableFields}. Please ensure documents are uploaded with a valid URL or storage path.`);
      }

      // Open document in new tab
      console.log('📄 Opening document:', viewUrl);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');

    } catch (error) {
      console.error('❌ Error viewing document:', error);
      console.error('❌ Document data:', document);
      setDocumentError(error.message || 'Failed to open document. Please try again.');
    } finally {
      setViewingDocument(null);
    }
  };

  // ProtectedRoute component handles loading and admin check
  // This component only renders when user is authenticated and is admin

  // Dashboard Stats Cards
  const statsCards = [
    {
      title: 'Total Users',
      value: stats.totalJeepDrivers + stats.totalGuides + stats.totalTourists,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
      subtitle: 'All registered users'
    },
    {
      title: 'Jeep Drivers',
      value: stats.totalJeepDrivers,
      icon: Car,
      color: 'from-green-500 to-green-600',
      change: '+8%',
      subtitle: 'Active drivers'
    },
    {
      title: 'Tour Guides',
      value: stats.totalGuides,
      icon: MapPin,
      color: 'from-purple-500 to-purple-600',
      change: '+5%',
      subtitle: 'Registered guides'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'from-orange-500 to-orange-600',
      change: '+23%',
      subtitle: 'All time bookings'
    },
    {
      title: 'Revenue',
      value: `LKR ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      change: '+15%',
      subtitle: 'Total earnings'
    },
    {
      title: 'Tourists',
      value: stats.totalTourists,
      icon: UserCheck,
      color: 'from-pink-500 to-pink-600',
      change: '+18%',
      subtitle: 'Registered tourists'
    }
  ];

  return (
    <div className="min-h-screen bg-black flex relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'w-0 lg:w-64'}
        bg-[#1a1a1a] border-r border-gray-800 
        transition-all duration-300 overflow-hidden flex-shrink-0
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="h-8 w-8 text-green-500" />
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'dashboard'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveSection('jeep-drivers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'jeep-drivers'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Car className="h-5 w-5" />
              <span>Jeep Drivers</span>
              <span className="ml-auto bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                {stats.totalJeepDrivers}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('tour-guides')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'tour-guides'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MapPin className="h-5 w-5" />
              <span>Tour Guides</span>
              <span className="ml-auto bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                {stats.totalGuides}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('tourists')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'tourists'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Tourists</span>
              <span className="ml-auto bg-gray-700 text-white text-xs px-2 py-1 rounded-full">
                {stats.totalTourists}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors mt-8"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 p-3 sm:p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
              </button>
              <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">
                {activeSection === 'dashboard' && 'Dashboard'}
                {activeSection === 'jeep-drivers' && 'Jeep Drivers'}
                {activeSection === 'tour-guides' && 'Tour Guides'}
                {activeSection === 'tourists' && 'Tourists'}
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400">Admin User</p>
                <p className="text-sm text-white font-medium truncate max-w-[150px]">{currentUser?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-4 lg:p-6">
          {/* Dashboard View */}
          {activeSection === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Cards - Modern Design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {statsCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={index}
                      className="bg-[#2d3748] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10"
                    >
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className={`p-2 sm:p-3 bg-gradient-to-br ${card.color} rounded-lg sm:rounded-xl shadow-lg`}>
                          <Icon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 text-xs sm:text-sm font-bold">{card.change}</span>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-4">
                        <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{card.title}</h3>
                        <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">{card.value}</p>
                        <p className="text-gray-500 text-xs mt-1">{card.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Overview */}
              <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Quick Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Car className="h-5 w-5 text-green-400" />
                      <h4 className="text-white font-medium">Jeep Drivers</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalJeepDrivers}</p>
                    <p className="text-gray-400 text-sm mt-1">Active service providers</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="h-5 w-5 text-purple-400" />
                      <h4 className="text-white font-medium">Tour Guides</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalGuides}</p>
                    <p className="text-gray-400 text-sm mt-1">Professional guides</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <UserCheck className="h-5 w-5 text-pink-400" />
                      <h4 className="text-white font-medium">Tourists</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalTourists}</p>
                    <p className="text-gray-400 text-sm mt-1">Registered users</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Jeep Drivers View */}
          {activeSection === 'jeep-drivers' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Driver Info
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Vehicle
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Experience
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {jeepDrivers.map((driver) => (
                        <tr key={driver.id} className="hover:bg-black/20 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {driver.profilePicture ? (
                                <img
                                  src={driver.profilePicture}
                                  alt={driver.fullName}
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-gray-600 flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium text-sm sm:text-base truncate">{driver.fullName}</p>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">{driver.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{driver.email || driver.contactEmail}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{driver.phone || driver.contactPhone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <p className="text-white text-sm">{driver.vehicleType || 'Not specified'}</p>
                            <p className="text-gray-400 text-xs">LKR {driver.pricePerDay?.toLocaleString() || 0}/day</p>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-400" />
                              <span className="text-white text-sm">{driver.experienceYears || 0} years</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              driver.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}>
                              {driver.availability ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(driver, 'jeepDriver')}
                              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tour Guides View */}
          {activeSection === 'tour-guides' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Guide Info
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Rates
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Experience
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {tourGuides.map((guide) => (
                        <tr key={guide.id} className="hover:bg-black/20 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {guide.profilePicture ? (
                                <img
                                  src={guide.profilePicture}
                                  alt={guide.fullName}
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-gray-600 flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium text-sm sm:text-base truncate">{guide.fullName}</p>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">{guide.location}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{guide.email || guide.contactEmail}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{guide.phone || guide.contactPhone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <p className="text-white text-sm">Hourly: LKR {guide.hourlyRate?.toLocaleString() || 0}</p>
                            <p className="text-gray-400 text-xs">Daily: LKR {guide.dailyRate?.toLocaleString() || 0}</p>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-400" />
                              <span className="text-white text-sm">{guide.experienceYears || 0} years</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              guide.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}>
                              {guide.availability ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(guide, 'tourGuide')}
                              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tourists View */}
          {activeSection === 'tourists' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Tourist Info
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Country
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Joined Date
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Activity
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {tourists.map((tourist) => (
                        <tr key={tourist.id} className="hover:bg-black/20 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {tourist.profilePicture ? (
                                <img
                                  src={tourist.profilePicture}
                                  alt={tourist.fullName}
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-gray-600 flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium text-sm sm:text-base truncate">{tourist.fullName}</p>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">{tourist.preferredLanguage || 'Not specified'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{tourist.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{tourist.phone || 'Not provided'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <p className="text-white text-sm">{tourist.country || 'Not specified'}</p>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-400" />
                              <span className="text-white text-sm">
                                {tourist.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <p className="text-white text-xs sm:text-sm">
                                Bookings: {tourist.bookings?.length || 0}
                              </p>
                              <p className="text-gray-400 text-xs">
                                Favorites: {tourist.favorites?.length || 0}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(tourist, 'tourist')}
                              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Detail View Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-700 p-3 sm:p-4 lg:p-6 flex items-center justify-between z-10">
              <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                {selectedUser.userType === 'jeepDriver' && <Car className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />}
                {selectedUser.userType === 'tourGuide' && <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />}
                {selectedUser.userType === 'tourist' && <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />}
                <span className="truncate">
                  {selectedUser.userType === 'jeepDriver' ? 'Jeep Driver' : 
                   selectedUser.userType === 'tourGuide' ? 'Tour Guide' : 'Tourist'}
                  <span className="hidden sm:inline"> Details</span>
                </span>
              </h2>
              <button
                onClick={closeDetailModal}
                className="p-1.5 sm:p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
              {/* Profile Section */}
              <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {selectedUser.profilePicture ? (
                    <img
                      src={selectedUser.profilePicture}
                      alt={selectedUser.fullName}
                      className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-gray-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedUser.fullName}</h3>
                    <p className="text-gray-400 text-xs sm:text-sm mb-2">{selectedUser.location || 'Location not specified'}</p>
                    {selectedUser.availability !== undefined && (
                      <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                        selectedUser.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                      }`}>
                        {selectedUser.availability ? 'Available' : 'Unavailable'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-white text-sm sm:text-base truncate">{selectedUser.email || selectedUser.contactEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-white text-sm sm:text-base">{selectedUser.phone || selectedUser.contactPhone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedUser.userType !== 'tourist' && (
                    <div className="space-y-2 sm:space-y-3">
                      {selectedUser.experienceYears !== undefined && (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Experience</p>
                            <p className="text-white text-sm sm:text-base">{selectedUser.experienceYears} years</p>
                          </div>
                        </div>
                      )}
                      {selectedUser.languages && (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">Languages</p>
                            <p className="text-white text-sm sm:text-base">{selectedUser.languages.join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedUser.userType === 'tourist' && (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Country</p>
                          <p className="text-white text-sm sm:text-base">{selectedUser.country || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Joined Date</p>
                          <p className="text-white text-sm sm:text-base">
                            {selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Provider Details */}
              {selectedUser.userType === 'jeepDriver' && (
                <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <Car className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Type</p>
                      <p className="text-white font-medium text-sm sm:text-base">{selectedUser.vehicleType || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Price Per Day</p>
                      <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.pricePerDay?.toLocaleString() || 0}</p>
                    </div>
                    {selectedUser.bio && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Bio</p>
                        <p className="text-white text-sm sm:text-base">{selectedUser.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedUser.userType === 'tourGuide' && (
                <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                    Pricing Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Hourly Rate</p>
                      <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.hourlyRate?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Daily Rate</p>
                      <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.dailyRate?.toLocaleString() || 0}</p>
                    </div>
                    {selectedUser.bio && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Bio</p>
                        <p className="text-white text-sm sm:text-base">{selectedUser.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tourist Activity */}
              {selectedUser.userType === 'tourist' && (
                <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                    Activity Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    <div className="bg-blue-900/20 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-400 mb-1">Total Bookings</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{selectedUser.bookings?.length || 0}</p>
                    </div>
                    <div className="bg-purple-900/20 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-gray-400 mb-1">Favorites</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">{selectedUser.favorites?.length || 0}</p>
                    </div>
                    <div className="bg-green-900/20 rounded-lg p-3 sm:p-4 col-span-2 md:col-span-1">
                      <p className="text-xs text-gray-400 mb-1">Language</p>
                      <p className="text-base sm:text-lg font-bold text-white truncate">{selectedUser.preferredLanguage || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Section (for service providers only) */}
              {(selectedUser.userType === 'jeepDriver' || selectedUser.userType === 'tourGuide') && (
                <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                    <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                      Certification Documents
                    </h4>
                    
                    {/* Certification Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                        selectedUser.certificationStatus === 'certified' && selectedUser.certificationApproved === true
                          ? 'bg-green-900/50 text-green-300 border border-green-500/30' 
                          : selectedUser.certificationStatus === 'certified' && selectedUser.certificationApproved !== true
                          ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
                          : selectedUser.certificationRejected || selectedUser.certificationStatus === 'uncertified'
                          ? 'bg-red-900/50 text-red-300 border border-red-500/30'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600/30'
                      }`}>
                        {selectedUser.certificationStatus === 'certified' && selectedUser.certificationApproved === true ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Certified & Approved
                          </>
                        ) : selectedUser.certificationStatus === 'certified' && selectedUser.certificationApproved !== true ? (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            Pending Approval
                          </>
                        ) : selectedUser.certificationRejected || selectedUser.certificationStatus === 'uncertified' ? (
                          <>
                            <XCircle className="h-3.5 w-3.5" />
                            Rejected / Uncertified
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5" />
                            Non-Certified Service
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Success Message */}
                  {certificationSuccess && (
                    <div className="mb-3 sm:mb-4 bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                      <p className="text-green-300 text-xs sm:text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        {certificationSuccess}
                      </p>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {documentError && (
                    <div className="mb-3 sm:mb-4 bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-300 text-xs sm:text-sm flex items-center gap-2">
                        <X className="h-4 w-4 flex-shrink-0" />
                        {documentError}
                      </p>
                    </div>
                  )}

                  {/* Certification Action Buttons - Only show if provider registered as certified */}
                  {selectedUser.certificationStatus === 'certified' && (
                    <div className="mb-4 sm:mb-6">
                      <p className="text-gray-400 text-xs mb-3">
                        Review the certification documents above and approve or reject this provider's certification:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={() => handleCertificationUpdate('approve')}
                          disabled={certificationAction !== null || selectedUser.certificationApproved === true}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                            selectedUser.certificationApproved === true
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : certificationAction === 'approve'
                              ? 'bg-green-700 text-white cursor-wait'
                              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/20'
                          }`}
                        >
                          {certificationAction === 'approve' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              {selectedUser.certificationApproved === true ? 'Already Approved' : 'Approve Certification'}
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCertificationUpdate('reject')}
                          disabled={certificationAction !== null || selectedUser.certificationRejected === true}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                            selectedUser.certificationRejected === true
                              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              : certificationAction === 'reject'
                              ? 'bg-red-700 text-white cursor-wait'
                              : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/20'
                          }`}
                        >
                          {certificationAction === 'reject' ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Rejecting...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              {selectedUser.certificationRejected === true ? 'Already Rejected' : 'Reject Certification'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message for non-certified providers */}
                  {selectedUser.certificationStatus !== 'certified' && (
                    <div className="mb-4 sm:mb-6 bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">
                        ℹ️ This service provider registered as a non-certified provider. Certification approval is not required.
                      </p>
                    </div>
                  )}
                  
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : userDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {userDocuments.map((doc, index) => (
                        <div key={index} className="bg-gray-700/30 rounded-lg p-3 sm:p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-start gap-2 mb-1">
                                <FileText className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm sm:text-base truncate">{doc.certificationType}</p>
                                  <p className="text-gray-400 text-xs sm:text-sm mb-1 truncate">{doc.fileName}</p>
                                  <p className="text-xs text-gray-500">
                                    Uploaded: {doc.uploadedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewDocument(doc)}
                              disabled={viewingDocument === doc.certificationType}
                              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs font-medium whitespace-nowrap w-full sm:w-auto justify-center ${
                                viewingDocument === doc.certificationType
                                  ? 'bg-gray-600 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                              } text-white`}
                            >
                              {viewingDocument === doc.certificationType ? (
                                <>
                                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Opening...</span>
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span>View Document</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-2 sm:mb-3" />
                      <p className="text-gray-400 text-sm sm:text-base">No documents uploaded</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-gray-700 p-3 sm:p-4 lg:p-6">
              {/* Delete Confirmation */}
              {deleteConfirm && (
                <div className="mb-4 bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-red-600 rounded-lg flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold mb-1">⚠️ Confirm Deletion</p>
                      <p className="text-red-300 text-sm">
                        Are you absolutely sure you want to delete this {selectedUser.userType === 'jeepDriver' ? 'jeep driver' : 
                        selectedUser.userType === 'tourGuide' ? 'tour guide' : 'tourist'}?
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteUser}
                      disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Yes, Delete Permanently
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={closeDetailModal}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm sm:text-base"
                >
                  Close
                </button>
                {!deleteConfirm && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete User</span>
                    <span className="sm:hidden">Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
