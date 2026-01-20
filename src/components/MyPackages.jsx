import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Package, Plus, Edit2, Trash2, Save, X, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const MyPackages = ({ user }) => {
  const navigate = useNavigate();
  const db = getFirestore();
  
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    includes: [],
    rulesAndRegulations: '',
    priceFullDay: '',
    priceHalfDay: ''
  });

  // Default includes options
  const defaultIncludes = [
    'Breakfast',
    'Lunch',
    'Binoculars',
    'Animal Field Guide Books',
    'Cool Box',
    'Snacks',
    'Water Bottles',
    'First Aid Kit'
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchPackages();
  }, [user]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'servicePackages'),
        where('providerId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const packagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setIsEditing(true);
    setSelectedPackage(null);
    setFormData({
      title: '',
      description: '',
      includes: [],
      rulesAndRegulations: '',
      priceFullDay: '',
      priceHalfDay: ''
    });
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setIsAddingNew(false);
    setIsEditing(false);
    setFormData({
      title: pkg.title || '',
      description: pkg.description || '',
      includes: pkg.includes || [],
      rulesAndRegulations: pkg.rulesAndRegulations || '',
      priceFullDay: pkg.priceFullDay || '',
      priceHalfDay: pkg.priceHalfDay || ''
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    if (selectedPackage) {
      setFormData({
        title: selectedPackage.title || '',
        description: selectedPackage.description || '',
        includes: selectedPackage.includes || [],
        rulesAndRegulations: selectedPackage.rulesAndRegulations || '',
        priceFullDay: selectedPackage.priceFullDay || '',
        priceHalfDay: selectedPackage.priceHalfDay || ''
      });
    } else {
      setSelectedPackage(null);
    }
  };

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.title.trim()) {
        alert('Please enter a package title');
        return;
      }
      if (!formData.description.trim()) {
        alert('Please enter a package description');
        return;
      }
      if (formData.includes.length === 0) {
        alert('Please select at least one item to include in the package');
        return;
      }
      if (!formData.priceFullDay || parseFloat(formData.priceFullDay) < 1) {
        alert('Please enter a valid full day price');
        return;
      }
      if (!formData.priceHalfDay || parseFloat(formData.priceHalfDay) < 1) {
        alert('Please enter a valid half day price');
        return;
      }

      const packageData = {
        ...formData,
        priceFullDay: parseFloat(formData.priceFullDay),
        priceHalfDay: parseFloat(formData.priceHalfDay),
        providerId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (isAddingNew) {
        // Add new package
        const docRef = await addDoc(collection(db, 'servicePackages'), {
          ...packageData,
          createdAt: serverTimestamp()
        });
        alert('Package created successfully!');
        setSelectedPackage({ id: docRef.id, ...packageData });
      } else {
        // Update existing package
        await updateDoc(doc(db, 'servicePackages', selectedPackage.id), packageData);
        alert('Package updated successfully!');
        setSelectedPackage({ ...selectedPackage, ...packageData });
      }

      setIsEditing(false);
      setIsAddingNew(false);
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package. Please try again.');
    }
  };

  const handleDelete = async (packageId) => {
    if (!window.confirm('Are you sure you want to delete this package?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'servicePackages', packageId));
      alert('Package deleted successfully!');
      setSelectedPackage(null);
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Error deleting package. Please try again.');
    }
  };

  const toggleInclude = (item) => {
    setFormData(prev => ({
      ...prev,
      includes: prev.includes.includes(item)
        ? prev.includes.filter(i => i !== item)
        : [...prev.includes, item]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Service Packages</h1>
          <p className="text-gray-400">Create and manage your service packages for customers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Packages List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              {/* Add New Package Button */}
              <button
                onClick={handleAddNew}
                className="w-full mb-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add New Package
              </button>

              {/* Packages List */}
              <div className="space-y-2">
                {packages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No packages yet</p>
                    <p className="text-sm">Create your first package</p>
                  </div>
                ) : (
                  packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPackage?.id === pkg.id
                          ? 'bg-emerald-600/20 border-emerald-500'
                          : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">
                            {pkg.title}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {pkg.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-emerald-400 font-semibold">
                              LKR {pkg.priceFullDay?.toLocaleString()}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">
                              {pkg.includes?.length || 0} items
                            </span>
                          </div>
                        </div>
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Package Details/Editor */}
          <div className="lg:col-span-2">
            {!selectedPackage && !isAddingNew ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Select a package to view details
                </h3>
                <p className="text-gray-400">
                  Or create a new package to get started
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                {/* Header with Actions */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {isAddingNew ? 'New Package' : 'Package Details'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={handleEdit}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        {selectedPackage && (
                          <button
                            onClick={() => handleDelete(selectedPackage.id)}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Package Form/Details */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Package Title *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Premium Safari Package"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className="text-white text-lg font-semibold">{formData.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe your package..."
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className="text-gray-300">{formData.description}</p>
                    )}
                  </div>

                  {/* Includes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Package Includes *
                    </label>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        {defaultIncludes.map((item) => (
                          <label
                            key={item}
                            className="flex items-center gap-2 p-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.includes.includes(item)}
                              onChange={() => toggleInclude(item)}
                              className="w-4 h-4 text-emerald-600 bg-gray-800 border-gray-600 rounded focus:ring-emerald-500"
                            />
                            <span className="text-white text-sm">{item}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {formData.includes.map((item, index) => (
                          <span
                            key={index}
                            className="flex items-center gap-1 bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-full text-sm border border-emerald-500/30"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rules and Regulations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rules & Regulations
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.rulesAndRegulations}
                        onChange={(e) => setFormData({ ...formData, rulesAndRegulations: e.target.value })}
                        placeholder="Enter your terms and conditions..."
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                      />
                    ) : (
                      <p className="text-gray-300 whitespace-pre-wrap">
                        {formData.rulesAndRegulations || 'No rules specified'}
                      </p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Day Price (LKR) *
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.priceFullDay}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '0' || (value.startsWith('0') && !value.includes('.'))) {
                              return;
                            }
                            setFormData({ ...formData, priceFullDay: value });
                          }}
                          placeholder="25000"
                          min="1"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-emerald-400" />
                          <span className="text-white text-xl font-bold">
                            LKR {parseFloat(formData.priceFullDay || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Half Day Price (LKR) *
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.priceHalfDay}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '0' || (value.startsWith('0') && !value.includes('.'))) {
                              return;
                            }
                            setFormData({ ...formData, priceHalfDay: value });
                          }}
                          placeholder="15000"
                          min="1"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-emerald-400" />
                          <span className="text-white text-xl font-bold">
                            LKR {parseFloat(formData.priceHalfDay || 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPackages;
