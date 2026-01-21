import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  LayoutDashboard,
  Users,
  Award,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Ban,
  RotateCcw,
  FileText,
  LogOut,
  Menu,
  X as XIcon
} from 'lucide-react';
import {
  getDelayedBookings,
  sendAdminReminder,
  enableUserCancellation,
  suspendAccount,
  restoreAccount,
  getAdminAuditLogs,
  checkDelayedBookings
} from '../services/bookingMonitoringService';
import { getDocumentUrl } from '../lib/supabase';

const EnhancedAdminDashboard = ({ adminUser }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Dashboard Data
  const [stats, setStats] = useState({
    totalProviders: 0,
    certifiedProviders: 0,
    pendingCertifications: 0,
    totalBookings: 0,
    pendingBookings: 0,
    delayedBookings: 0,
    totalUsers: 0
  });

  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [delayedBookings, setDelayedBookings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    loadDelayedBookings();
    loadAuditLogs();
    
    // Set up interval to check for delayed bookings every hour
    const intervalId = setInterval(async () => {
      await checkDelayedBookings();
      loadDelayedBookings();
    }, 60 * 60 * 1000); // Every hour
    
    return () => clearInterval(intervalId);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get all service providers
      const providersSnapshot = await getDocs(collection(db, 'serviceProviders'));
      const providersData = providersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProviders(providersData);

      // Get all bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'tourists'));
      const usersCount = usersSnapshot.size;

      // Calculate stats
      setStats({
        totalProviders: providersData.length,
        certifiedProviders: providersData.filter(p => p.certificationApproved).length,
        pendingCertifications: providersData.filter(p => 
          p.certificationStatus === 'certified' && !p.certificationApproved && !p.certificationRejected
        ).length,
        totalBookings: bookingsData.length,
        pendingBookings: bookingsData.filter(b => b.status === 'pending').length,
        delayedBookings: bookingsData.filter(b => b.flaggedAsDelayed).length,
        totalUsers: usersCount
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const loadDelayedBookings = async () => {
    const delayed = await getDelayedBookings();
    setDelayedBookings(delayed);
  };

  const loadAuditLogs = async () => {
    const logs = await getAdminAuditLogs(50);
    setAuditLogs(logs);
  };

  const handleSendReminder = async (booking) => {
    if (!adminUser) return;
    
    const result = await sendAdminReminder(
      booking.id,
      booking.driverId || booking.guideId,
      adminUser.uid,
      adminUser.displayName || adminUser.email
    );
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Reminder sent to service provider' });
      loadDelayedBookings();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleEnableCancellation = async (booking) => {
    if (!confirm('Enable user to cancel this booking and show alternatives?')) return;
    
    const result = await enableUserCancellation(booking.id);
    
    if (result.success) {
      setMessage({ 
        type: 'success', 
        text: `Cancellation enabled. ${result.alternatives.length} alternatives suggested.` 
      });
      loadDelayedBookings();
      loadDashboardData();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSuspendAccount = async (userId, userName) => {
    const reason = prompt(`Enter reason for suspending ${userName}:`);
    if (!reason) return;
    
    const permanent = confirm('Permanently remove this account? (Cancel for temporary suspension)');
    
    const result = await suspendAccount(
      userId,
      reason,
      adminUser.uid,
      adminUser.displayName || adminUser.email,
      permanent
    );
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      loadDashboardData();
      loadAuditLogs();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleRestoreAccount = async (userId, userName) => {
    if (!confirm(`Restore access for ${userName}?`)) return;
    
    const result = await restoreAccount(
      userId,
      adminUser.uid,
      adminUser.displayName || adminUser.email
    );
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      loadDashboardData();
      loadAuditLogs();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-700',
      accepted: 'bg-blue-900/20 text-blue-400 border-blue-700',
      completed: 'bg-green-900/20 text-green-400 border-green-700',
      declined: 'bg-red-900/20 text-red-400 border-red-700'
    };
    return badges[status] || badges.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
              >
                {sidebarOpen ? (
                  <XIcon className="h-6 w-6 text-white" />
                ) : (
                  <Menu className="h-6 w-6 text-white" />
                )}
              </button>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-emerald-500" />
                Admin Dashboard
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-900/20 border border-emerald-700 text-emerald-300' 
              : 'bg-red-900/20 border border-red-700 text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-900/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.totalProviders}</span>
            </div>
            <p className="text-gray-400 text-sm">Total Providers</p>
            <p className="text-xs text-emerald-400 mt-1">{stats.certifiedProviders} Certified</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-900/20 rounded-lg">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.pendingCertifications}</span>
            </div>
            <p className="text-gray-400 text-sm">Pending Certifications</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.pendingBookings}</span>
            </div>
            <p className="text-gray-400 text-sm">Pending Bookings</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.delayedBookings}</span>
            </div>
            <p className="text-gray-400 text-sm">Delayed Responses</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'delayed-bookings', label: 'Delayed Bookings', icon: AlertTriangle, badge: stats.delayedBookings },
            { id: 'certifications', label: 'Certifications', icon: Award, badge: stats.pendingCertifications },
            { id: 'providers', label: 'Providers', icon: Users },
            { id: 'audit-logs', label: 'Audit Logs', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Based on Active Tab */}
        {activeTab === 'delayed-bookings' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Delayed Booking Responses (15+ Hours)
            </h2>

            {delayedBookings.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No delayed bookings</p>
            ) : (
              <div className="space-y-4">
                {delayedBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="bg-gray-900/50 border border-red-700/30 rounded-xl p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-white font-bold mb-1">
                          Booking #{booking.id.substring(0, 8)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Service Type: {booking.serviceType}
                        </p>
                        <p className="text-sm text-gray-400">
                          Created: {formatDate(booking.createdAt)}
                        </p>
                        <p className="text-sm text-red-400">
                          Delayed for {booking.delayDurationHours || '15+'} hours
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!booking.adminReminderSent && (
                        <button
                          onClick={() => handleSendReminder(booking)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Send className="h-4 w-4" />
                          Send Reminder to Provider
                        </button>
                      )}
                      {booking.adminReminderSent && (
                        <span className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Reminder Sent
                        </span>
                      )}
                      {!booking.cancellationEnabled && (
                        <button
                          onClick={() => handleEnableCancellation(booking)}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Enable User Cancellation
                        </button>
                      )}
                      {booking.cancellationEnabled && (
                        <span className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Cancellation Enabled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-500" />
              Service Provider Management
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Certified</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {providers.map(provider => (
                    <tr key={provider.id} className="hover:bg-gray-900/30">
                      <td className="px-4 py-4 text-sm text-white">{provider.fullName}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">{provider.serviceType}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          provider.suspended 
                            ? 'bg-red-900/20 text-red-400' 
                            : 'bg-green-900/20 text-green-400'
                        }`}>
                          {provider.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          provider.certificationApproved 
                            ? 'bg-emerald-900/20 text-emerald-400' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {provider.certificationApproved ? 'Certified' : 'Uncertified'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {provider.suspended ? (
                            <button
                              onClick={() => handleRestoreAccount(provider.id, provider.fullName)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspendAccount(provider.id, provider.fullName)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Ban className="h-3 w-3" />
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit-logs' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="h-6 w-6 text-emerald-500" />
              Admin Audit Trail
            </h2>

            <div className="space-y-3">
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-medium">{log.action?.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-400 mt-1">{log.details}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        By: {log.adminName} • {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;
