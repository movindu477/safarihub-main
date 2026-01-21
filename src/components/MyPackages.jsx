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

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fullDayPrice: '',
    halfDayPrice: '',
    rules: '',
    benefits: '',
    facilities: ''
  });

  // Fetch packages
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

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
    if (!formData.fullDayPrice || parseFloat(formData.fullDayPrice) <= 0) {
      setMessage({ type: 'error', text: 'Valid full-day price is required' });
      return;
    }
    if (!formData.halfDayPrice || parseFloat(formData.halfDayPrice) <= 0) {
      setMessage({ type: 'error', text: 'Valid half-day price is required' });
      return;
    }

    // ✅ VALIDATION: Full day price must be greater than half day price
    const fullDay = parseFloat(formData.fullDayPrice);
    const halfDay = parseFloat(formData.halfDayPrice);
    if (fullDay <= halfDay) {
      setMessage({ type: 'error', text: '❌ Full day price must be greater than half day price' });
      return;
    }

    setSaving(true);
    setMessage({ type: 'info', text: editingPackage ? 'Updating package...' : 'Creating package...' });

    try {
      // Get provider data to determine service type
      const providerDoc = await getDoc(doc(db, 'serviceProviders', currentUser.uid));
      const providerData = providerDoc.data();
      const serviceType = providerData?.serviceType || 'Unknown';

      const packageData = {
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
      fullDayPrice: pkg.fullDayPrice.toString(),
      halfDayPrice: pkg.halfDayPrice.toString(),
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
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' ? 'bg-emerald-900/20 border-emerald-700 text-emerald-300' :
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

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Day Price (LKR) *
                  </label>
                  <input
                    type="number"
                    name="fullDayPrice"
                    value={formData.fullDayPrice}
                    onChange={handleInputChange}
                    placeholder="e.g., 25000"
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
                    placeholder="e.g., 15000"
                    min="1"
                    step="1"
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

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
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-emerald-500/50 transition-all"
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
                        <p className="text-gray-400 text-sm leading-relaxed">{pkg.description}</p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center gap-6 mb-4">
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

                    {/* Benefits, Facilities, Rules (if provided) */}
                    <div className="space-y-2">
                      {pkg.benefits && (
                        <div className="text-sm">
                          <span className="text-gray-500 font-medium">Benefits: </span>
                          <span className="text-gray-400">{pkg.benefits}</span>
                        </div>
                      )}
                      {pkg.facilities && (
                        <div className="text-sm">
                          <span className="text-gray-500 font-medium">Facilities: </span>
                          <span className="text-gray-400">{pkg.facilities}</span>
                        </div>
                      )}
                      {pkg.rules && (
                        <div className="text-sm">
                          <span className="text-gray-500 font-medium">Rules: </span>
                          <span className="text-gray-400">{pkg.rules}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPackages;
