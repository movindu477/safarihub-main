import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, where, query, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getDocumentUrl } from '../lib/supabase';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createNotification } from '../App';
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
  ShoppingBag,
  Wallet,
  CreditCard,
  TrendingDown,
  Search,
  Filter,
  MoreHorizontal,
  Bell,
  Package
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
    totalRentingStores: 0,
    activeToday: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalAmountOfCredit: 0,
    monthlyData: [
      { name: 'Jan', profit: 0, loss: 0 },
      { name: 'Feb', profit: 0, loss: 0 },
      { name: 'Mar', profit: 0, loss: 0 },
      { name: 'Apr', profit: 0, loss: 0 },
      { name: 'May', profit: 0, loss: 0 },
      { name: 'Jun', profit: 0, loss: 0 },
      { name: 'Jul', profit: 0, loss: 0 },
      { name: 'Aug', profit: 0, loss: 0 },
    ]
  });

  const [bookings, setBookings] = useState([]);

  // User Data
  const [jeepDrivers, setJeepDrivers] = useState([]);
  const [tourGuides, setTourGuides] = useState([]);
  const [tourists, setTourists] = useState([]);
  const [rentingStores, setRentingStores] = useState([]);
  const [allFavorites, setAllFavorites] = useState({});

  // ... (Jeep Driver & Guide Effects remain the same, I will assume they are outside this edit block if not targeting them)

  // Fetch real-time data for Jeep Drivers (Keeping existing logic)
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const q = query(collection(db, 'serviceProviders'), where('serviceType', '==', 'Jeep Driver'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJeepDrivers(drivers);
      setStats(prev => ({ ...prev, totalJeepDrivers: drivers.length }));
    });
    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch real-time data for Tour Guides (Keeping existing logic)
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const q = query(collection(db, 'serviceProviders'), where('serviceType', '==', 'Tour Guide'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTourGuides(guides);
      setStats(prev => ({ ...prev, totalGuides: guides.length }));
    });
    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch real-time data for Tourists (Keeping existing logic)
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const unsubscribe = onSnapshot(collection(db, 'tourists'), (snapshot) => {
      const touristsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTourists(touristsList);
      setStats(prev => ({ ...prev, totalTourists: touristsList.length }));
    });
    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch real-time data for Renting Stores
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const q = query(collection(db, 'serviceProviders'), where('serviceType', 'in', ['Renting', 'Renting Store']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRentingStores(stores);
      setStats(prev => ({ ...prev, totalRentingStores: stores.length }));
    });
    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch all favorites to show counts for tourists
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    const unsubscribe = onSnapshot(collection(db, 'favorites'), (snapshot) => {
      const favsMap = {};
      snapshot.docs.forEach(doc => {
        favsMap[doc.id] = doc.data().items?.length || 0;
      });
      setAllFavorites(favsMap);
    });
    return () => unsubscribe();
  }, [isAdmin, db]);

  // Fetch bookings for stats & Update Bookings State
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookingsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Include ID
      const totalBookings = bookingsList.length;

      let totalRevenue = 0;
      let totalAmountOfCredit = 0; // Refunds or declined amounts
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map(m => ({ name: m, profit: 0, loss: 0 }));

      bookingsList.forEach(booking => {
        const amount = Number(booking.totalPrice) || 0;

        if (booking.status === 'completed' || booking.status === 'confirmed' || booking.status === 'accepted') {
          totalRevenue += amount;

          // Group for chart
          const date = booking.createdAt?.toDate ? booking.createdAt.toDate() :
            (booking.createdAt ? new Date(booking.createdAt) : null);

          if (date && !isNaN(date)) {
            const monthIdx = date.getMonth();
            monthlyData[monthIdx].profit += amount;
          }
        } else if (booking.status === 'refunded' || booking.status === 'declined' || booking.status === 'cancelled') {
          totalAmountOfCredit += amount;

          const date = booking.createdAt?.toDate ? booking.createdAt.toDate() :
            (booking.createdAt ? new Date(booking.createdAt) : null);

          if (date && !isNaN(date)) {
            const monthIdx = date.getMonth();
            monthlyData[monthIdx].loss += amount;
          }
        }
      });

      setBookings(bookingsList); // Save full list
      setStats(prev => ({
        ...prev,
        totalBookings,
        totalRevenue,
        totalAmountOfCredit,
        monthlyData
      }));
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

  const handleViewDetails = async (user, userType) => {
    setSelectedUser({ ...user, userType });
    setShowDetailModal(true);
    setLoadingDetails(true);
    setUserDocuments([]);
    setDeleteConfirm(null);

    try {
      // Fetch documents/details logic
      if (userType === 'jeepDriver' || userType === 'tourGuide') {
        let documents = [];
        const collectionName = userType === 'jeepDriver' ? 'jeepDriverCertifications' :
          userType === 'tourGuide' ? 'guideCertifications' : null;

        if (collectionName) {
          try {
            const docRef = doc(db, collectionName, user.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) documents = docSnap.data().documents || [];
          } catch (err) { console.warn(err); }
        }

        if (documents.length === 0) {
          try {
            const pRef = doc(db, 'serviceProviders', user.id);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const d = pSnap.data();
              // Check for documents array formats
              documents = d.documents || d.certificationDocuments || d.uploadedDocuments || [];

              // If still empty but certificationUrls exists (object format), convert to expected format
              if (documents.length === 0 && d.certificationUrls) {
                documents = Object.entries(d.certificationUrls).map(([type, url]) => ({
                  certificationType: type.replace(/_/g, ' ').toUpperCase(),
                  fileName: 'Document File',
                  fileUrl: url,
                  uploadedAt: d.createdAt || null
                }));
              }
            }
          } catch (err) { console.error(err); }
        }
        setUserDocuments(documents);
      }
    } catch (error) {
      console.error('Error details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedUser(null);
    setUserDocuments([]);
    setDocumentError(null);
    setCertificationSuccess(null);
    setDeleteConfirm(null);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !deleteConfirm) return;

    // Check for upcoming/active bookings before deletion
    const upcomingBookingsCount = bookings.filter(b => {
      const isRelated = b.customerId === selectedUser.id ||
        b.userId === selectedUser.id ||
        b.driverId === selectedUser.id ||
        b.guideId === selectedUser.id ||
        b.providerId === selectedUser.id;

      // Statuses that prevent deletion
      const isActive = ['pending', 'accepted', 'confirmed'].includes(b.status);

      return isRelated && isActive;
    }).length;

    if (upcomingBookingsCount > 0) {
      alert(`CRITICAL: This ${selectedUser.userType} has ${upcomingBookingsCount} active or upcoming booking(s). You cannot delete this account until all pending and confirmed bookings are either completed, cancelled, or declined.`);
      setDeleteConfirm(null);
      return;
    }

    try {
      setDeleting(true);
      const { id, userType } = selectedUser;
      if (userType === 'tourist') deleteDoc(doc(db, 'tourists', id));
      else deleteDoc(doc(db, 'serviceProviders', id));
      closeDetailModal();
      // Optimistic updates
      if (userType === 'jeepDriver') setJeepDrivers(prev => prev.filter(d => d.id !== id));
      if (userType === 'tourGuide') setTourGuides(prev => prev.filter(g => g.id !== id));
      if (userType === 'tourist') setTourists(prev => prev.filter(t => t.id !== id));
      if (userType === 'rentingStore') setRentingStores(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      setDocumentError('Failed to delete.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleSendReminder = async (booking) => {
    try {
      const isPendingAcceptance = booking.status === 'pending';
      const isPendingPayment = (booking.status === 'accepted' || booking.status === 'confirmed') && booking.paymentStatus !== 'paid';

      if (isPendingAcceptance) {
        // Remind provider (Jeep Driver or Tour Guide)
        await createNotification({
          recipientId: booking.driverId || booking.providerId,
          type: 'booking',
          title: 'Action Required: Pending Booking',
          message: `Administrative Reminder: You have an unaccepted booking request from ${booking.customerName}. Please log in to accept or decline this request to prevent cancellation.`,
          link: '/admin?tab=profile',
          bookingId: booking.id
        });
        alert('Reminder sent to service provider.');
      } else if (isPendingPayment) {
        // Remind tourist/user
        await createNotification({
          recipientId: booking.customerId || booking.userId,
          type: 'payment',
          title: 'Action Required: Pending Payment',
          message: `Administrative Reminder: Your booking with ${booking.providerName} is ready! Please complete your payment to secure this booking and receive your confirmation receipt.`,
          link: `/payment/${booking.id}`,
          bookingId: booking.id
        });
        alert('Reminder sent to tourist.');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder.');
    }
  };

  const handleCertificationUpdate = async (action) => {
    try {
      setCertificationAction(action);
      if (!selectedUser?.id) return;
      const ref = doc(db, 'serviceProviders', selectedUser.id);
      const updates = action === 'approve'
        ? { certificationStatus: 'certified', certificationApproved: true, certifiedAt: serverTimestamp() }
        : { certificationStatus: 'uncertified', certificationApproved: false, certificationRejected: true };
      await updateDoc(ref, updates);
      setCertificationSuccess(action === 'approve' ? 'Approved' : 'Rejected');
    } catch (error) {
      setDocumentError('Update failed.');
    } finally {
      setCertificationAction(null);
    }
  };

  const handleViewDocument = async (document) => {
    try {
      setViewingDocument(document.type || 'doc');
      let viewUrl = document.url || document.fileUrl || document.downloadURL;
      if (!viewUrl && document.path) {
        const { signedUrl } = await getDocumentUrl(document.path, 3600);
        viewUrl = signedUrl;
      }
      if (viewUrl) window.open(viewUrl, '_blank');
    } catch (error) {
      console.error(error);
    } finally {
      setViewingDocument(null);
    }
  };

  // ... (Logout and other handlers can remain, but for replace_content I need to bridge to the JSX part)

  // (Assuming handlers handleLogout, handleViewDetails, etc. are preserved if I don't overwrite them. 
  //  To be safe, I will target the specific block range from imports to the end of the Dashboard JSX.)


  // ... [Handlers omitted for brevity in instruction, will be preserved in actual file by target range]

  // Helper for formatting date
  const formatDate = (dateObj) => {
    if (!dateObj) return 'N/A';
    // Handle Firestore Timestamp
    if (dateObj.toDate) return dateObj.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    // Handle JS Date
    if (dateObj instanceof Date) return dateObj.toLocaleDateString();
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] font-sans text-gray-900 flex relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modernized */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-64' : 'w-0 lg:w-64'}
        bg-white border-r border-gray-200 
        transition-all duration-300 overflow-hidden flex-shrink-0 shadow-xl lg:shadow-none
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">

            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SafariHub <span className="text-emerald-600">Admin</span></h1>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'dashboard'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span>Dashboard</span>
            </button>

            <div className="pt-6 pb-2">
              <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</span>
            </div>

            <button
              onClick={() => setActiveSection('jeep-drivers')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'jeep-drivers'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Car className="h-5 w-5" />
              <span>Jeep Drivers</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeSection === 'jeep-drivers' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {stats.totalJeepDrivers}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('tour-guides')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'tour-guides'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <MapPin className="h-5 w-5" />
              <span>Tour Guides</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeSection === 'tour-guides' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {stats.totalGuides}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('tourists')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'tourists'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Users className="h-5 w-5" />
              <span>Tourists</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeSection === 'tourists' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {stats.totalTourists}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('renting-stores')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'renting-stores'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Store className="h-5 w-5" />
              <span>Renting Stores</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeSection === 'renting-stores' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {stats.totalRentingStores}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('upcoming-bookings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeSection === 'upcoming-bookings'
                ? 'bg-black text-white shadow-lg shadow-gray-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Calendar className="h-5 w-5" />
              <span>Upcoming</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${activeSection === 'upcoming-bookings' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {bookings.filter(b =>
                  ['Jeep Driver', 'Tour Guide', 'Guide'].includes(b.serviceType) &&
                  (b.status === 'pending' || (b.status === 'accepted' && b.paymentStatus !== 'paid') || b.paymentStatus === 'paid' || b.status === 'confirmed')
                ).length}
              </span>
            </button>

            <div className="pt-6 border-t border-gray-100 mt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        {/* Header - Modernized */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeSection === 'dashboard' && 'Welcome to Admin'}
                {activeSection === 'jeep-drivers' && 'Jeep Driver Management'}
                {activeSection === 'tour-guides' && 'Tour Guide Management'}
                {activeSection === 'tourists' && 'Tourist Management'}
                {activeSection === 'renting-stores' && 'Renting Store Management'}
                {activeSection === 'upcoming-bookings' && 'Upcoming'}
              </h2>
              <p className="text-sm text-gray-400 hidden sm:block">Manage your application efficiently</p>
            </div>
          </div>

          <div className="flex items-center gap-6">


            <div className="flex items-center gap-3">
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Dashboard View */}
          {activeSection === 'dashboard' && (
            <div className="space-y-8">

              {/* Top Row: Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Total Earnings Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-medium text-sm">Total Earnings</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${(stats.totalRevenue * 0.05).toFixed(2)}</h3>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-full transition-colors">
                      <Wallet className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +7%
                    </span>
                    <span className="text-gray-400 text-xs">This month</span>
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ v: 10 }, { v: 20 }, { v: 15 }, { v: 30 }, { v: 25 }, { v: 40 }, { v: 35 }]}>
                        <defs>
                          <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#10b981" fill="url(#colorEarnings)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>



                {/* Total Bookings Card (Real Data) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-medium text-sm">Total Bookings</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalBookings}</h3>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-full transition-colors">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +12%
                    </span>
                    <span className="text-gray-400 text-xs">This month</span>
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ v: 5 }, { v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 18 }, { v: 25 }]}>
                        <Bar dataKey="v" fill="#3b82f6" radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Total Revenue Card (Real Data) */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-medium text-sm">Total Revenue</span>
                      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-full transition-colors">
                      <DollarSign className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +4%
                    </span>
                    <span className="text-gray-400 text-xs">This month</span>
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[{ v: 10 }, { v: 15 }, { v: 12 }, { v: 20 }, { v: 25 }, { v: 30 }, { v: 45 }]}>
                        <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Middle Row: Big Chart + Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Revenue Chart */}
                <div className="lg:col-span-3 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">Total Income</h3>
                      <p className="text-sm text-gray-400 mt-1">Sum of all successful transactions across the system</p>
                    </div>
                    <div className="flex gap-2 text-sm font-medium">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Profit
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-lime-300"></span> Loss
                      </div>
                    </div>
                  </div>

                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthlyData.slice(0, 8)} barGap={12}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k`} />
                        <Tooltip
                          cursor={{ fill: '#f9fafb' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Bar dataKey="profit" fill="#10b981" radius={[100, 100, 100, 100]} barSize={16} stackId="a" />
                        <Bar dataKey="loss" fill="#bef264" radius={[100, 100, 100, 100]} barSize={16} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>



              </div>

              {/* Activity Table */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                  <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium transition-colors">
                      <Filter className="h-4 w-4" /> Filters
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                        <th className="pb-4 pl-4 font-semibold">Order ID</th>
                        <th className="pb-4 font-semibold">Activity</th>
                        <th className="pb-4 font-semibold">Price</th>
                        <th className="pb-4 font-semibold">Status</th>
                        <th className="pb-4 font-semibold">Date</th>
                        <th className="pb-4 pr-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.slice(0, 5).map((booking, i) => (
                        <tr key={booking.id || i} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pl-4 text-sm text-gray-500">
                            #{booking.id ? booking.id.substring(0, 8).toUpperCase() : `INV_0000${i + 1}`}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${i % 4 === 0 ? 'bg-blue-100 text-blue-600' :
                                i % 4 === 1 ? 'bg-orange-100 text-orange-600' :
                                  i % 4 === 2 ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
                                {i % 4 === 0 ? <Package className="h-4 w-4" /> :
                                  i % 4 === 1 ? <Store className="h-4 w-4" /> :
                                    i % 4 === 2 ? <Car className="h-4 w-4" /> :
                                      <MapPin className="h-4 w-4" />
                                }
                              </div>
                              <span className="font-bold text-gray-900 text-sm">{booking.safariType || booking.serviceName || 'Mobile App Purchase'}</span>
                            </div>
                          </td>
                          <td className="py-4 font-bold text-gray-900 text-sm">
                            {booking.totalPrice ? `$${booking.totalPrice.toLocaleString()}` : '$25,500'}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${booking.status === 'completed' || booking.status === 'confirmed' ? 'bg-emerald-500' :
                                booking.status === 'pending' ? 'bg-amber-500' :
                                  'bg-gray-400'
                                }`}></span>
                              <span className={`text-sm font-medium ${booking.status === 'completed' || booking.status === 'confirmed' ? 'text-emerald-700' :
                                booking.status === 'pending' ? 'text-amber-700' :
                                  'text-gray-600'
                                }`}>
                                {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Completed'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-500 text-sm">
                            {booking.createdAt?.toDate ? formatDate(booking.createdAt.toDate()) : '17 Apr, 26 03:45PM'}
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                              <MoreHorizontal className="h-4 w-4 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pl-4 text-sm text-gray-500">#{`INV_0000${75 - i}`}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600`}>
                                <Package className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-gray-900 text-sm">Demo Activity Item</span>
                            </div>
                          </td>
                          <td className="py-4 font-bold text-gray-900 text-sm">$12,000</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                              <span className="text-sm font-medium text-emerald-700">Completed</span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-500 text-sm">12 Feb, 26 10:00AM</td>
                          <td className="py-4 pr-4 text-right"><MoreHorizontal className="h-4 w-4 text-gray-400" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          Experience
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Certification
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
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-400" />
                              <span className="text-white text-sm">{driver.experienceYears || 0} years</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            {driver.certificationStatus === 'certified' ? (
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${driver.certificationApproved ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-amber-900/50 text-amber-300 border border-amber-500/30'}`}>
                                {driver.certificationApproved ? 'Certified' : 'Pending Approval'}
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-700/50 text-gray-400 border border-gray-600/30">
                                Uncertified
                              </span>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${driver.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                              }`}>
                              {driver.availability ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(driver, 'jeepDriver')}
                              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              View
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
                          Experience
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Certification
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
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-yellow-400" />
                              <span className="text-white text-sm">{guide.experienceYears || 0} years</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            {guide.certificationStatus === 'certified' ? (
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${guide.certificationApproved ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-amber-900/50 text-amber-300 border border-amber-500/30'}`}>
                                {guide.certificationApproved ? 'Certified' : 'Pending Approval'}
                              </span>
                            ) : (guide.certificationRejected ? (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-900/50 text-red-300 border border-red-500/30">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-700/50 text-gray-400 border border-gray-600/30">
                                Uncertified
                              </span>
                            ))}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${guide.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                              }`}>
                              {guide.availability ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(guide, 'tourGuide')}
                              className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              View
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
                                Bookings: {bookings.filter(b =>
                                  (b.customerId === tourist.id || b.touristId === tourist.id) &&
                                  (['completed', 'confirmed', 'accepted', 'paid'].includes(b.status?.toLowerCase()) || b.paymentStatus === 'paid')
                                ).length}
                              </p>
                              <p className="text-gray-400 text-xs">
                                Favorites: {allFavorites[tourist.id] || tourist.favorites?.length || 0}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(tourist, 'tourist')}
                              className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              View
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

          {/* Renting Stores View */}
          {activeSection === 'renting-stores' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-[#2d3748] rounded-xl sm:rounded-2xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-black/30">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Store Info
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Rates
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Location
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
                      {rentingStores.map((store) => (
                        <tr key={store.id} className="hover:bg-black/20 transition-colors">
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {store.profilePicture ? (
                                <img
                                  src={store.profilePicture}
                                  alt={store.fullName}
                                  className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-gray-600 flex-shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <Store className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-medium text-sm sm:text-base truncate">{store.fullName}</p>
                                <p className="text-gray-400 text-xs sm:text-sm truncate">{store.serviceType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">{store.email || store.contactEmail}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm">
                                <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span>{store.phone || store.contactPhone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <p className="text-white text-sm">Base: LKR {store.baseRate?.toLocaleString() || 0}/hr</p>
                            <p className="text-gray-400 text-xs">Security: LKR {store.securityDeposit?.toLocaleString() || 0}</p>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-emerald-400" />
                              <span className="text-white text-sm truncate">{store.location || 'Not specified'}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${store.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                              }`}>
                              {store.availability ? 'Available' : 'Closed'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <button
                              onClick={() => handleViewDetails(store, 'rentingStore')}
                              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              View
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

          {/* Upcoming View */}
          {activeSection === 'upcoming-bookings' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                {bookings
                  .filter(b => ['Jeep Driver', 'Tour Guide', 'Guide'].includes(b.serviceType))
                  .sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : new Date(0));
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : new Date(0));
                    return dateB - dateA;
                  })
                  .map(booking => {
                    const isPaid = booking.paymentStatus === 'paid' || booking.status === 'confirmed' || booking.status === 'completed';
                    const status = isPaid
                      ? 'Paid'
                      : (booking.status === 'accepted' ? 'Accepted - Payment Pending' : 'Acceptance Pending');

                    const statusColor = status === 'Paid'
                      ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30'
                      : (status === 'Accepted - Payment Pending'
                        ? 'bg-blue-900/50 text-blue-300 border-blue-500/30'
                        : 'bg-amber-900/50 text-amber-300 border-amber-500/30');

                    return (
                      <div key={booking.id} className="bg-[#2d3748] rounded-2xl border border-gray-700 p-6 hover:border-gray-600 transition-all group">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          {/* Booking Main Info */}
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                                {status}
                              </span>
                              <span className="text-gray-500 text-xs">
                                ID: {booking.id.substring(0, 8).toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {/* Left side: Tourists/ServiceProvider details */}
                              <div className="space-y-4">
                                <div>
                                  <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Tourist Details</p>
                                  <div className="min-w-0">
                                    <p className="text-white font-medium truncate">{booking.customerName}</p>
                                    <p className="text-gray-400 text-xs truncate">{booking.customerEmail}</p>
                                    <p className="text-gray-400 text-xs">{booking.customerPhone || 'No phone provided'}</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Service Provider</p>
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{booking.driverName || booking.providerName}</p>
                                  <p className="text-emerald-400 text-xs font-semibold">{booking.serviceType}</p>
                                  <p className="text-gray-400 text-xs truncate">{booking.driverEmail || booking.providerEmail}</p>
                                </div>
                              </div>
                            </div>

                            {/* Right side: Booking summary */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-gray-400 text-xs uppercase font-semibold mb-2">Booking Summary</p>
                                <div className="bg-black/20 rounded-xl p-4 space-y-2 border border-white/5">
                                  <div className="flex justify-between text-sm gap-4">
                                    <span className="text-gray-400">Dates:</span>
                                    <span className="text-white font-medium text-right">{booking.datesString || 'Selected Dates'}</span>
                                  </div>
                                  {booking.nationalPark && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Location:</span>
                                      <span className="text-white">{booking.nationalPark}</span>
                                    </div>
                                  )}
                                  {booking.safariType && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-400">Type:</span>
                                      <span className="text-white">{booking.safariType}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-sm pt-2 border-t border-white/5 mt-2">
                                    <span className="text-emerald-400 font-bold">Total Price:</span>
                                    <span className="text-white font-bold">LKR {booking.totalPrice?.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="lg:border-l lg:border-gray-700 lg:pl-8 flex flex-col gap-3 min-w-[200px]">
                            {!isPaid && (
                              <button
                                onClick={() => handleSendReminder(booking)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-emerald-900/20 active:scale-95 text-sm"
                              >
                                <Bell className="h-4 w-4" />
                                Send Reminder
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    );

                  })}
                {bookings.filter(b => ['Jeep Driver', 'Tour Guide', 'Guide'].includes(b.serviceType)).length === 0 && (
                  <div className="bg-[#2d3748] rounded-2xl border border-dashed border-gray-700 p-12 text-center">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No bookings found for Jeep Drivers or Tour Guides.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div >

      {/* Detail View Modal */}
      {
        showDetailModal && selectedUser && (
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
                        <span className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${selectedUser.availability ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
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

                {/* Service Provider Additional Details */}
                {(selectedUser.userType === 'jeepDriver' || selectedUser.userType === 'tourGuide') && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Personal & ID Information */}
                    <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                      <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                        Personal Verification
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-gray-500">NIC / Passport</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.nic || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Date of Birth</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.dob || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gender</p>
                          <p className="text-white font-medium text-sm sm:text-base capitalized">{selectedUser.gender || 'N/A'}</p>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <p className="text-xs text-gray-500">Full Address</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.address || selectedUser.location || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Professional Details (Vehicle/Pricing) */}
                    <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                      <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        {selectedUser.userType === 'jeepDriver' ? <Car className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" /> : <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />}
                        {selectedUser.userType === 'jeepDriver' ? 'Vehicle & Service Info' : 'Pricing & Service Info'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {selectedUser.userType === 'jeepDriver' ? (
                          <>
                            <div className="col-span-1 sm:col-span-2">
                              <p className="text-xs text-gray-500">Vehicle Types</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedUser.vehicleTypes && selectedUser.vehicleTypes.length > 0 ? (
                                  selectedUser.vehicleTypes.map((type, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-700/50 rounded text-xs text-green-100 border border-green-500/20">
                                      {type}
                                    </span>
                                  ))
                                ) : (
                                  <p className="text-white font-medium text-sm sm:text-base">{selectedUser.vehicleType || 'Not specified'}</p>
                                )}
                              </div>
                            </div>

                            {/* Price Breakdown */}
                            {selectedUser.priceFullDayStandard > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Standard Jeep (Full Day)</p>
                                <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.priceFullDayStandard.toLocaleString()}</p>
                              </div>
                            )}
                            {selectedUser.priceHalfDayStandard > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Standard Jeep (Half Day)</p>
                                <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.priceHalfDayStandard.toLocaleString()}</p>
                              </div>
                            )}
                            {selectedUser.priceFullDayLuxury > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Luxury Jeep (Full Day)</p>
                                <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.priceFullDayLuxury.toLocaleString()}</p>
                              </div>
                            )}
                            {selectedUser.priceHalfDayLuxury > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Luxury Jeep (Half Day)</p>
                                <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.priceHalfDayLuxury.toLocaleString()}</p>
                              </div>
                            )}

                            {/* Fallback if no specific prices */}
                            {!selectedUser.priceFullDayStandard && !selectedUser.priceFullDayLuxury && (
                              <div>
                                <p className="text-xs text-gray-500">Base Price Per Day</p>
                                <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.pricePerDay?.toLocaleString() || 0}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs text-gray-500">Hourly Rate</p>
                              <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.hourlyRate?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Daily Rate</p>
                              <p className="text-white font-medium text-sm sm:text-base">LKR {selectedUser.dailyRate?.toLocaleString() || 0}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <p className="text-xs text-gray-500">Destinations</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {selectedUser.destinations && selectedUser.destinations.length > 0 ? (
                                  selectedUser.destinations.map((dest, i) => (
                                    <span key={i} className="px-2 py-1 bg-purple-900/30 rounded text-xs text-purple-200 border border-purple-500/20">
                                      {dest}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-white text-sm">None specified</span>
                                )}
                              </div>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <p className="text-xs text-gray-500">Special Qualifications</p>
                              <p className="text-white font-medium text-sm sm:text-base">{selectedUser.specialQualifications?.join(', ') || 'None'}</p>
                            </div>
                          </>
                        )}

                        <div className="col-span-1 sm:col-span-2 mt-2">
                          <p className="text-xs text-gray-500 mb-1">Bio / Description</p>
                          <p className="text-white text-sm sm:text-base leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
                            {selectedUser.description || selectedUser.bio || 'No description provided'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-black/30 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                      <h4 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                        Banking Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Bank Name</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.bankName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Branch</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.branch || selectedUser.bankBranch || 'N/A'}</p>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <p className="text-xs text-gray-500">Account Number</p>
                          <p className="text-white font-medium text-sm sm:text-base tracking-wider">{selectedUser.accountNumber || 'N/A'}</p>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <p className="text-xs text-gray-500">Account Holder</p>
                          <p className="text-white font-medium text-sm sm:text-base">{selectedUser.accountHolderName || 'N/A'}</p>
                        </div>
                      </div>
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
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${selectedUser.certificationStatus === 'certified' && selectedUser.certificationApproved === true
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
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${selectedUser.certificationApproved === true
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
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${selectedUser.certificationRejected === true
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
                                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs font-medium whitespace-nowrap w-full sm:w-auto justify-center ${viewingDocument === doc.certificationType
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
                            selectedUser.userType === 'tourGuide' ? 'tour guide' :
                              selectedUser.userType === 'rentingStore' ? 'renting store' : 'tourist'}?
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
        )
      }
    </div >
  );
};

export default AdminPanel;
