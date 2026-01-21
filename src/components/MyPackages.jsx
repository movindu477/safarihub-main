import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Package, Plus, Edit, Trash2, Eye, DollarSign, FileText, CheckCircle, X, Save } from 'lucide-react';

/**
 * MyPackages Component
 * Allows Jeep Drivers and Tour Guides to create, view, edit, and delete their service packages
 * Follows the same UI/UX structure as BookingSection
 */
const MyPackages = () => {
  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;

  // State management
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);
  const [expandedPackage, setExpandedPackage] = useState(null); // For expand/collapse functionality
  const [serviceType, setServiceType] = useState(null); // User's service type

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    // Vehicle types
    hasStandardJeep: false,
    hasLuxuryJeep: false,
    // Standard Safari Jeep prices
    fullDayPriceStandard: '',
    halfDayPriceStandard: '',
    // Luxury Safari Jeep prices
    fullDayPriceLuxury: '',
    halfDayPriceLuxury: '',
    // Legacy fields (for backwards compatibility)
    fullDayPrice: '',
    halfDayPrice: '',
    rules: '',
    benefits: '',
    facilities: ''
  });

  // Fetch user service type and packages
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Fetch service type
    const fetchServiceType = async () => {
      try {
        const providerDoc = await getDoc(doc(db, 'serviceProviders', currentUser.uid));
        if (providerDoc.exists()) {
          const providerData = providerDoc.data();
          setServiceType(providerData?.serviceType || 'Jeep Driver');
        }
      } catch (error) {
        console.error('Error fetching service type:', error);
      }
    };
    fetchServiceType();

    const packagesQuery = query(
      collection(db, 'servicePackages'),
      where('providerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      packagesQuery,
      (snapshot) => {
        const packagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by creation date (newest first)
        packagesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });

        setPackages(packagesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching packages:', error);
        setMessage({ type: 'error', text: 'Failed to load packages' });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, db]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      hasStandardJeep: false,
      hasLuxuryJeep: false,
      fullDayPriceStandard: '',
      halfDayPriceStandard: '',
      fullDayPriceLuxury: '',
      halfDayPriceLuxury: '',
      fullDayPrice: '',
      halfDayPrice: '',
      rules: '',
      benefits: '',
      facilities: ''
    });
    setEditingPackage(null);
    setShowForm(false);
  };

  // Handle create/edit package
  const handleSavePackage = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Package title is required' });
      return;
    }
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'Description is required' });
      return;
    }

    // Vehicle type validation (only for Jeep Drivers)
    const isTourGuide = serviceType === 'Tour Guide';
    if (!isTourGuide && !formData.hasStandardJeep && !formData.hasLuxuryJeep) {
      setMessage({ type: 'error', text: '❌ Please select at least one vehicle type' });
      return;
    }

    // Tour Guide: Simple validation (just Full Day and Half Day)
    if (isTourGuide) {
      if (!formData.fullDayPrice || parseFloat(formData.fullDayPrice) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid full-day price is required' });
        return;
      }
      if (!formData.halfDayPrice || parseFloat(formData.halfDayPrice) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid half-day price is required' });
        return;
      }
      const fullDay = parseFloat(formData.fullDayPrice);
      const halfDay = parseFloat(formData.halfDayPrice);
      if (fullDay <= halfDay) {
        setMessage({ type: 'error', text: '❌ Full day price must be greater than half day price' });
        return;
      }
    }

    // Jeep Driver: Standard Safari Jeep validation
    if (!isTourGuide && formData.hasStandardJeep) {
      if (!formData.fullDayPriceStandard || parseFloat(formData.fullDayPriceStandard) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid Standard full-day price is required' });
        return;
      }
      if (!formData.halfDayPriceStandard || parseFloat(formData.halfDayPriceStandard) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid Standard half-day price is required' });
        return;
      }
      const fullDayStd = parseFloat(formData.fullDayPriceStandard);
      const halfDayStd = parseFloat(formData.halfDayPriceStandard);
      if (fullDayStd <= halfDayStd) {
        setMessage({ type: 'error', text: '❌ Standard full day price must be greater than half day price' });
        return;
      }
    }

    // Jeep Driver: Luxury Safari Jeep validation
    if (!isTourGuide && formData.hasLuxuryJeep) {
      if (!formData.fullDayPriceLuxury || parseFloat(formData.fullDayPriceLuxury) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid Luxury full-day price is required' });
        return;
      }
      if (!formData.halfDayPriceLuxury || parseFloat(formData.halfDayPriceLuxury) <= 0) {
        setMessage({ type: 'error', text: '❌ Valid Luxury half-day price is required' });
        return;
      }
      const fullDayLux = parseFloat(formData.fullDayPriceLuxury);
      const halfDayLux = parseFloat(formData.halfDayPriceLuxury);
      if (fullDayLux <= halfDayLux) {
        setMessage({ type: 'error', text: '❌ Luxury full day price must be greater than half day price' });
        return;
      }
    }

    setSaving(true);
    setMessage({ type: 'info', text: editingPackage ? 'Updating package...' : 'Creating package...' });

    try {
      // Get provider data to determine service type
      const providerDoc = await getDoc(doc(db, 'serviceProviders', currentUser.uid));
      const providerData = providerDoc.data();
      const serviceType = providerData?.serviceType || 'Unknown';

      const packageData = isTourGuide ? {
        // Tour Guide package data - simplified
        title: formData.title.trim(),
        description: formData.description.trim(),
        fullDayPrice: parseFloat(formData.fullDayPrice),
        halfDayPrice: parseFloat(formData.halfDayPrice),
        rules: formData.rules.trim(),
        benefits: formData.benefits.trim(),
        facilities: formData.facilities.trim(),
        providerId: currentUser.uid,
        providerName: providerData?.fullName || 'Unknown',
        serviceType: serviceType,
        updatedAt: serverTimestamp()
      } : {
        // Jeep Driver package data - with vehicle types
        title: formData.title.trim(),
        description: formData.description.trim(),
        // Vehicle types
        hasStandardJeep: formData.hasStandardJeep,
        hasLuxuryJeep: formData.hasLuxuryJeep,
        // Standard Safari Jeep prices
        fullDayPriceStandard: formData.hasStandardJeep ? parseFloat(formData.fullDayPriceStandard) : null,
        halfDayPriceStandard: formData.hasStandardJeep ? parseFloat(formData.halfDayPriceStandard) : null,
        // Luxury Safari Jeep prices
        fullDayPriceLuxury: formData.hasLuxuryJeep ? parseFloat(formData.fullDayPriceLuxury) : null,
        halfDayPriceLuxury: formData.hasLuxuryJeep ? parseFloat(formData.halfDayPriceLuxury) : null,
        // Legacy fields (for backwards compatibility) - use Standard prices if available, otherwise Luxury
        fullDayPrice: formData.hasStandardJeep ? parseFloat(formData.fullDayPriceStandard) : parseFloat(formData.fullDayPriceLuxury),
        halfDayPrice: formData.hasStandardJeep ? parseFloat(formData.halfDayPriceStandard) : parseFloat(formData.halfDayPriceLuxury),
        rules: formData.rules.trim(),
        benefits: formData.benefits.trim(),
        facilities: formData.facilities.trim(),
        providerId: currentUser.uid,
        providerName: providerData?.fullName || 'Unknown',
        serviceType: serviceType,
        updatedAt: serverTimestamp()
      };

      if (editingPackage) {
        // Update existing package
        await updateDoc(doc(db, 'servicePackages', editingPackage.id), packageData);
        setMessage({ type: 'success', text: 'Package updated successfully!' });
      } else {
        // Create new package
        const newPackageRef = doc(collection(db, 'servicePackages'));
        await setDoc(newPackageRef, {
          ...packageData,
          createdAt: serverTimestamp(),
          active: true
        });
        setMessage({ type: 'success', text: 'Package created successfully!' });
      }

      resetForm();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Error saving package:', error);
      setMessage({ type: 'error', text: 'Failed to save package. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle edit package
  const handleEditPackage = (pkg) => {
    setFormData({
      title: pkg.title,
      description: pkg.description,
      // Check if new format exists, otherwise use legacy
      hasStandardJeep: pkg.hasStandardJeep !== undefined ? pkg.hasStandardJeep : true,
      hasLuxuryJeep: pkg.hasLuxuryJeep !== undefined ? pkg.hasLuxuryJeep : false,
      fullDayPriceStandard: pkg.fullDayPriceStandard ? pkg.fullDayPriceStandard.toString() : (pkg.fullDayPrice ? pkg.fullDayPrice.toString() : ''),
      halfDayPriceStandard: pkg.halfDayPriceStandard ? pkg.halfDayPriceStandard.toString() : (pkg.halfDayPrice ? pkg.halfDayPrice.toString() : ''),
      fullDayPriceLuxury: pkg.fullDayPriceLuxury ? pkg.fullDayPriceLuxury.toString() : '',
      halfDayPriceLuxury: pkg.halfDayPriceLuxury ? pkg.halfDayPriceLuxury.toString() : '',
      fullDayPrice: pkg.fullDayPrice ? pkg.fullDayPrice.toString() : '',
      halfDayPrice: pkg.halfDayPrice ? pkg.halfDayPrice.toString() : '',
      rules: pkg.rules || '',
      benefits: pkg.benefits || '',
      facilities: pkg.facilities || ''
    });
    setEditingPackage(pkg);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete package
  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Are you sure you want to delete "${pkg.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'servicePackages', pkg.id));
      setMessage({ type: 'success', text: 'Package deleted successfully!' });

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Error deleting package:', error);
      setMessage({ type: 'error', text: 'Failed to delete package. Please try again.' });
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Package className="h-8 w-8 text-emerald-500" />
                My Service Packages
              </h1>
              <p className="text-gray-400 mt-2">
                Create and manage your service packages for customers to book
              </p>
            </div>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add New Package
              </button>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-900/20 border-emerald-700 text-emerald-300' :
              message.type === 'error' ? 'bg-red-900/20 border-red-700 text-red-300' :
                'bg-blue-900/20 border-blue-700 text-blue-300'
            }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {message.type === 'error' && <X className="h-5 w-5" />}
              <p>{message.text}</p>
            </div>
          </div>
        )}

        {/* Package Form */}
        {showForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingPackage ? 'Edit Package' : 'Create New Package'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={saving}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-6">
              {/* Package Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Package Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Yala National Park Full Safari Experience"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  required
                  disabled={saving}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your package in detail..."
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  required
                  disabled={saving}
                />
              </div>

              {/* Vehicle Type Selection - Only for Jeep Drivers */}
              {serviceType !== 'Tour Guide' && (
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-900/30">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select Vehicle Types for This Package *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasStandardJeep}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasStandardJeep: e.target.checked }))}
                        className="w-5 h-5 text-emerald-600 bg-gray-900 border-gray-600 rounded focus:ring-emerald-500 focus:ring-offset-gray-900"
                        disabled={saving}
                      />
                      <span className="text-gray-200 font-medium">Standard Safari Jeep</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasLuxuryJeep}
                        onChange={(e) => setFormData(prev => ({ ...prev, hasLuxuryJeep: e.target.checked }))}
                        className="w-5 h-5 text-emerald-600 bg-gray-900 border-gray-600 rounded focus:ring-emerald-500 focus:ring-offset-gray-900"
                        disabled={saving}
                      />
                      <span className="text-gray-200 font-medium">Luxury Safari Jeep</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tour Guide Simple Pricing */}
              {serviceType === 'Tour Guide' && (
                <div className="border border-emerald-500/50 rounded-lg p-4 bg-emerald-900/10">
                  <h3 className="text-lg font-semibold text-emerald-300 mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Package Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="fullDayPrice"
                        value={formData.fullDayPrice}
                        onChange={handleInputChange}
                        placeholder="e.g., 20000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Half Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="halfDayPrice"
                        value={formData.halfDayPrice}
                        onChange={handleInputChange}
                        placeholder="e.g., 12000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        required
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Must be less than full day price
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Jeep Driver: Standard Safari Jeep Pricing */}
              {serviceType !== 'Tour Guide' && formData.hasStandardJeep && (
                <div className="border border-blue-500/50 rounded-lg p-4 bg-blue-900/10">
                  <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Standard Safari Jeep Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="fullDayPriceStandard"
                        value={formData.fullDayPriceStandard}
                        onChange={handleInputChange}
                        placeholder="e.g., 20000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        required={formData.hasStandardJeep}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Half Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="halfDayPriceStandard"
                        value={formData.halfDayPriceStandard}
                        onChange={handleInputChange}
                        placeholder="e.g., 12000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        required={formData.hasStandardJeep}
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Must be less than full day price
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Jeep Driver: Luxury Safari Jeep Pricing */}
              {serviceType !== 'Tour Guide' && formData.hasLuxuryJeep && (
                <div className="border border-amber-500/50 rounded-lg p-4 bg-amber-900/10">
                  <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Luxury Safari Jeep Pricing
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="fullDayPriceLuxury"
                        value={formData.fullDayPriceLuxury}
                        onChange={handleInputChange}
                        placeholder="e.g., 35000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        required={formData.hasLuxuryJeep}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Half Day Price (LKR) *
                      </label>
                      <input
                        type="number"
                        name="halfDayPriceLuxury"
                        value={formData.halfDayPriceLuxury}
                        onChange={handleInputChange}
                        placeholder="e.g., 22000"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                        required={formData.hasLuxuryJeep}
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Must be less than full day price
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Benefits Included
                </label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleInputChange}
                  placeholder="List the benefits included (e.g., Experienced guide, Wildlife spotting, Photography support)"
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  disabled={saving}
                />
              </div>

              {/* Facilities */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Facilities Provided
                </label>
                <textarea
                  name="facilities"
                  value={formData.facilities}
                  onChange={handleInputChange}
                  placeholder="List the facilities provided (e.g., Air-conditioned vehicle, Water bottles, Binoculars)"
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  disabled={saving}
                />
              </div>

              {/* Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rules and Regulations
                </label>
                <textarea
                  name="rules"
                  value={formData.rules}
                  onChange={handleInputChange}
                  placeholder="List any rules or regulations (e.g., No smoking, Maintain silence near animals)"
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                  disabled={saving}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : (editingPackage ? 'Update Package' : 'Create Package')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Packages List */}
        {packages.length === 0 && !showForm ? (
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-12 text-center">
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Packages Yet</h3>
            <p className="text-gray-500 mb-6">Create your first service package to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Package
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => {
              const isExpanded = expandedPackage === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer"
                  onClick={() => setExpandedPackage(isExpanded ? null : pkg.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Package Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2">{pkg.title}</h3>
                          <p className={`text-gray-400 text-sm leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                            {pkg.description}
                          </p>
                        </div>
                      </div>

                      {/* Vehicle Types & Pricing */}
                      <div className="space-y-3 mb-4">
                        {/* Standard Safari Jeep */}
                        {pkg.hasStandardJeep && (
                          <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-blue-300">🚙 Standard Safari Jeep</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs text-gray-400">Full Day:</span>
                                <span className="text-emerald-400 font-semibold">{formatPrice(pkg.fullDayPriceStandard)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-yellow-400" />
                                <span className="text-xs text-gray-400">Half Day:</span>
                                <span className="text-yellow-400 font-semibold">{formatPrice(pkg.halfDayPriceStandard)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Luxury Safari Jeep */}
                        {pkg.hasLuxuryJeep && (
                          <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-semibold text-amber-300">✨ Luxury Safari Jeep</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs text-gray-400">Full Day:</span>
                                <span className="text-emerald-400 font-semibold">{formatPrice(pkg.fullDayPriceLuxury)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-yellow-400" />
                                <span className="text-xs text-gray-400">Half Day:</span>
                                <span className="text-yellow-400 font-semibold">{formatPrice(pkg.halfDayPriceLuxury)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Legacy packages (without vehicle type selection) */}
                        {!pkg.hasStandardJeep && !pkg.hasLuxuryJeep && pkg.fullDayPrice && (
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-400" />
                              <span className="text-sm text-gray-400">Full Day:</span>
                              <span className="text-emerald-400 font-semibold">{formatPrice(pkg.fullDayPrice)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-yellow-400" />
                              <span className="text-sm text-gray-400">Half Day:</span>
                              <span className="text-yellow-400 font-semibold">{formatPrice(pkg.halfDayPrice)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Content - Benefits, Facilities, Rules */}
                      {isExpanded && (
                        <div className="space-y-3 border-t border-gray-700 pt-4 mt-4">
                          {pkg.benefits && pkg.benefits.trim() && (
                            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                <span className="text-emerald-300 font-semibold text-sm">Benefits</span>
                              </div>
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{pkg.benefits}</p>
                            </div>
                          )}
                          {pkg.facilities && pkg.facilities.trim() && (
                            <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-4 w-4 text-purple-400" />
                                <span className="text-purple-300 font-semibold text-sm">Facilities</span>
                              </div>
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{pkg.facilities}</p>
                            </div>
                          )}
                          {pkg.rules && pkg.rules.trim() && (
                            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-300 font-semibold text-sm">Rules & Regulations</span>
                              </div>
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{pkg.rules}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit Package"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete Package"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expand/Collapse Indicator */}
                  <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500">
                      {isExpanded ? 'Click to collapse' : 'Click to see more details'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPackages;
