import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import {
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  User,
  Mail,
  Phone,
  FileText,
  Eye,
  Shield,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { getDocumentUrl } from '../lib/supabase';

const ManageRentals = () => {
  const [user, setUser] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedTab, setSelectedTab] = useState('pending'); // pending, active, completed, declined
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [alternativeShops, setAlternativeShops] = useState([]);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Fetch rentals
  useEffect(() => {
    if (!user) return;

    const rentalsRef = collection(db, 'rentals');
    const q = query(
      rentalsRef,
      where('providerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rentalsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRentals(rentalsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching rentals:', error);
      setMessage({ type: 'error', text: 'Failed to load rentals' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const handleUpdateStatus = async (rentalId, newStatus, rental) => {
    try {
      const rentalRef = doc(db, 'rentals', rentalId);

      if (newStatus === 'accepted') {
        // Calculate total cost based on rental days
        const startDate = new Date(rental.startDate);
        const endDate = new Date(rental.endDate);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const totalCost = (rental.pricePerDay * days) + (rental.securityDeposit || 0);

        await updateDoc(rentalRef, {
          status: newStatus,
          totalCost,
          rentalDays: days,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setMessage({ type: 'success', text: 'Rental request accepted. Customer will be notified to complete payment.' });
      } else if (newStatus === 'declined') {
        // Find alternative shops with same product
        await findAlternativeShops(rental);

        await updateDoc(rentalRef, {
          status: newStatus,
          declinedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        setMessage({ type: 'success', text: 'Rental request declined. Alternative shops will be suggested to the customer.' });
      } else {
        await updateDoc(rentalRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        setMessage({ type: 'success', text: `Rental status updated to ${newStatus}` });
      }

      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating rental status:', error);
      setMessage({ type: 'error', text: 'Failed to update rental status' });
    }
  };

  const findAlternativeShops = async (rental) => {
    try {
      // Find other shops with the same product available
      const productsRef = collection(db, 'rentalProducts');
      const q = query(
        productsRef,
        where('category', '==', rental.productCategory),
        where('available', '==', true),
        where('providerId', '!=', rental.providerId)
      );

      const productsSnapshot = await getDocs(q);
      const alternatives = [];

      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();

        // Get provider details
        const providerDoc = await getDoc(doc(db, 'serviceProviders', productData.providerId));
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          alternatives.push({
            productId: productDoc.id,
            ...productData,
            provider: {
              id: productData.providerId,
              name: providerData.fullName,
              rating: providerData.rating || 0,
              location: providerData.location
            }
          });
        }
      }

      // Sort by rating
      alternatives.sort((a, b) => (b.provider.rating || 0) - (a.provider.rating || 0));

      // Store alternatives in the rental document
      const rentalRef = doc(db, 'rentals', rental.id);
      await updateDoc(rentalRef, {
        alternativeShops: alternatives.slice(0, 5).map(alt => ({
          productId: alt.productId,
          productTitle: alt.title,
          providerId: alt.provider.id,
          providerName: alt.provider.name,
          providerRating: alt.provider.rating,
          pricePerDay: alt.pricePerDay
        }))
      });

      setAlternativeShops(alternatives.slice(0, 5));
    } catch (error) {
      console.error('Error finding alternative shops:', error);
    }
  };

  const viewDocument = async (documentPath) => {
    try {
      const signedUrl = await getDocumentUrl(documentPath);
      if (!signedUrl) {
        setMessage({ type: 'error', text: 'Failed to load document' });
        return;
      }
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error viewing document:', error);
      setMessage({ type: 'error', text: 'Failed to open document' });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-900/20 text-yellow-400 border-yellow-700', icon: Clock },
      accepted: { color: 'bg-blue-900/20 text-blue-400 border-blue-700', icon: CheckCircle },
      declined: { color: 'bg-red-900/20 text-red-400 border-red-700', icon: XCircle },
      paid: { color: 'bg-emerald-900/20 text-emerald-400 border-emerald-700', icon: DollarSign },
      active: { color: 'bg-green-900/20 text-green-400 border-green-700', icon: TrendingUp },
      completed: { color: 'bg-gray-900/20 text-gray-400 border-gray-700', icon: CheckCircle }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredRentals = rentals.filter(rental => {
    if (selectedTab === 'pending') return rental.status === 'pending';
    if (selectedTab === 'active') return ['accepted', 'paid', 'active'].includes(rental.status);
    if (selectedTab === 'completed') return rental.status === 'completed';
    if (selectedTab === 'declined') return rental.status === 'declined';
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400">Please log in to manage rentals</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading rentals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-emerald-500" />
            Manage Rental Requests
          </h1>
          <p className="mt-2 text-gray-400">Review and manage customer rental requests</p>
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
              <XCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'pending', label: 'Pending', count: rentals.filter(r => r.status === 'pending').length },
            { id: 'active', label: 'Active', count: rentals.filter(r => ['accepted', 'paid', 'active'].includes(r.status)).length },
            { id: 'completed', label: 'Completed', count: rentals.filter(r => r.status === 'completed').length },
            { id: 'declined', label: 'Declined', count: rentals.filter(r => r.status === 'declined').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${selectedTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Rentals List */}
        {filteredRentals.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No {selectedTab} rentals</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRentals.map((rental) => (
              <div
                key={rental.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {rental.productTitle}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Request ID: {rental.id.substring(0, 8)}
                      </p>
                    </div>
                    {getStatusBadge(rental.status)}
                  </div>

                  {/* Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Customer Information */}
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer Details
                      </h4>
                      <div className="space-y-2">
                        <p className="text-white font-medium">{rental.customerName}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {rental.customerEmail}
                        </p>
                        {rental.customerPhone && (
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {rental.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rental Details */}
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Rental Period
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Start Date</p>
                          <p className="text-white font-medium">{formatDate(rental.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">End Date</p>
                          <p className="text-white font-medium">{formatDate(rental.endDate)}</p>
                        </div>
                        {rental.rentalDays && (
                          <p className="text-sm text-emerald-400">
                            {rental.rentalDays} day{rental.rentalDays > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Pricing
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Price/Day</p>
                          <p className="text-white font-medium">{formatPrice(rental.pricePerDay)}</p>
                        </div>
                        {rental.securityDeposit > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Security Deposit</p>
                            <p className="text-white font-medium">{formatPrice(rental.securityDeposit)}</p>
                          </div>
                        )}
                        {rental.totalCost && (
                          <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-500">Total Cost</p>
                            <p className="text-xl font-bold text-emerald-400">{formatPrice(rental.totalCost)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification Documents */}
                  {rental.verificationDocuments && (
                    <div className="mt-6 bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Verification Documents
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {rental.verificationDocuments.passportPhoto && (
                          <button
                            onClick={() => viewDocument(rental.verificationDocuments.passportPhoto)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View Passport Photo
                          </button>
                        )}
                        {rental.verificationDocuments.selfieWithPassport && (
                          <button
                            onClick={() => viewDocument(rental.verificationDocuments.selfieWithPassport)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View Selfie with Passport
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {rental.status === 'pending' && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleUpdateStatus(rental.id, 'accepted', rental)}
                        className="flex-1 min-w-[200px] px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(rental.id, 'declined', rental)}
                        className="flex-1 min-w-[200px] px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="h-5 w-5" />
                        Decline Request
                      </button>
                    </div>
                  )}

                  {rental.status === 'active' && (
                    <div className="mt-6">
                      <button
                        onClick={() => handleUpdateStatus(rental.id, 'completed', rental)}
                        className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="h-5 w-5" />
                        Mark as Completed (Returned)
                      </button>
                    </div>
                  )}

                  {/* Request Timestamp */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      Requested on {rental.createdAt && formatDate(rental.createdAt.toDate?.() || rental.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRentals;
