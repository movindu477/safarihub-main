import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  X, 
  Save, 
  Camera, 
  Tent, 
  Shield, 
  Box 
} from 'lucide-react';
import { uploadDocumentClientSide, deleteDocumentClientSide } from '../lib/supabase';

const ManageProducts = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Camera',
    subCategory: '',
    brand: '',
    model: '',
    pricePerDay: '',
    securityDeposit: '',
    quantity: '',
    condition: 'Excellent',
    available: true,
    images: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Category options
  const categories = {
    'Camera': ['DSLR Camera', 'Mirrorless Camera', 'Action Camera', 'Drone', 'Lens', 'Tripod', 'Lighting', 'Accessories'],
    'Camping': ['Tent', 'Sleeping Bag', 'Backpack', 'Camping Stove', 'Cooler', 'Headlamp', 'Camping Chair', 'Accessories']
  };

  const conditions = ['Excellent', 'Good', 'Fair', 'Like New'];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Fetch products
  useEffect(() => {
    if (!user) return;

    const productsRef = collection(db, 'rentalProducts');
    const q = query(productsRef, where('providerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setMessage({ type: 'error', text: 'Failed to load products' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, db]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formData.images.length + files.length > 5) {
      setMessage({ type: 'error', text: 'Maximum 5 images allowed per product' });
      return;
    }

    setUploadingImages(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { url, error } = await uploadDocumentClientSide(file, user.uid, `product-${Date.now()}-${file.name}`);
        if (error) throw new Error(error);
        uploadedUrls.push(url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      setMessage({ type: 'success', text: `${files.length} image(s) uploaded successfully` });
    } catch (error) {
      console.error('Image upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload images' });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (imageUrl, index) => {
    try {
      // Extract file path from URL for deletion
      const pathMatch = imageUrl.match(/documents\/(.+)$/);
      if (pathMatch) {
        await deleteDocumentClientSide(pathMatch[1]);
      }
      
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
      setMessage({ type: 'success', text: 'Image removed' });
    } catch (error) {
      console.error('Error removing image:', error);
      setMessage({ type: 'error', text: 'Failed to remove image' });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Camera',
      subCategory: '',
      brand: '',
      model: '',
      pricePerDay: '',
      securityDeposit: '',
      quantity: '',
      condition: 'Excellent',
      available: true,
      images: []
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Product title is required' });
      return;
    }
    if (!formData.pricePerDay || parseFloat(formData.pricePerDay) <= 0) {
      setMessage({ type: 'error', text: 'Valid price per day is required' });
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setMessage({ type: 'error', text: 'Valid quantity is required' });
      return;
    }
    if (formData.images.length === 0) {
      setMessage({ type: 'error', text: 'At least one product image is required' });
      return;
    }

    try {
      const productData = {
        ...formData,
        providerId: user.uid,
        pricePerDay: parseFloat(formData.pricePerDay),
        securityDeposit: parseFloat(formData.securityDeposit) || 0,
        quantity: parseInt(formData.quantity),
        availableQuantity: editingProduct 
          ? editingProduct.availableQuantity 
          : parseInt(formData.quantity),
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'rentalProducts', editingProduct.id), productData);
        setMessage({ type: 'success', text: 'Product updated successfully' });
      } else {
        // Create new product
        const newProductRef = doc(collection(db, 'rentalProducts'));
        await setDoc(newProductRef, {
          ...productData,
          createdAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Product added successfully' });
      }

      resetForm();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage({ type: 'error', text: 'Failed to save product' });
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      category: product.category,
      subCategory: product.subCategory || '',
      brand: product.brand || '',
      model: product.model || '',
      pricePerDay: product.pricePerDay.toString(),
      securityDeposit: product.securityDeposit?.toString() || '',
      quantity: product.quantity.toString(),
      condition: product.condition || 'Excellent',
      available: product.available !== false,
      images: product.images || []
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (productId, productImages) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete product images
      for (const imageUrl of productImages || []) {
        const pathMatch = imageUrl.match(/documents\/(.+)$/);
        if (pathMatch) {
          await deleteDocumentClientSide(pathMatch[1]).catch(err => 
            console.warn('Failed to delete image:', err)
          );
        }
      }

      // Delete product document
      await deleteDoc(doc(db, 'rentalProducts', productId));
      setMessage({ type: 'success', text: 'Product deleted successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage({ type: 'error', text: 'Failed to delete product' });
    }
  };

  const toggleAvailability = async (productId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'rentalProducts', productId), {
        available: !currentStatus,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: `Product ${!currentStatus ? 'activated' : 'deactivated'}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      console.error('Error toggling availability:', error);
      setMessage({ type: 'error', text: 'Failed to update availability' });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-400">Please log in to manage products</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="h-8 w-8 text-emerald-500" />
              Manage Products
            </h1>
            <p className="mt-2 text-gray-400">Add, edit, and manage your rental inventory</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add New Product
            </button>
          )}
        </div>

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
              <X className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Product Form */}
        {showForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {editingProduct ? (
                  <>
                    <Edit className="h-6 w-6 text-blue-500" />
                    Edit Product
                  </>
                ) : (
                  <>
                    <Plus className="h-6 w-6 text-emerald-500" />
                    Add New Product
                  </>
                )}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Canon EOS R5 Camera Body"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="Provide detailed information about the product..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={(e) => {
                        handleInputChange(e);
                        setFormData(prev => ({ ...prev, subCategory: '' }));
                      }}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      required
                    >
                      <option value="Camera">Camera</option>
                      <option value="Camping">Camping</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sub-Category
                    </label>
                    <select
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select sub-category</option>
                      {categories[formData.category].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Canon"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., EOS R5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Condition *
                    </label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      required
                    >
                      {conditions.map(cond => (
                        <option key={cond} value={cond}>{cond}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Pricing & Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price Per Day (LKR) *
                    </label>
                    <input
                      type="number"
                      name="pricePerDay"
                      value={formData.pricePerDay}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., 5000"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Security Deposit (LKR)
                    </label>
                    <input
                      type="number"
                      name="securityDeposit"
                      value={formData.securityDeposit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., 20000"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., 3"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Product Images */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-500" />
                  Product Images * (Max 5)
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  {formData.images.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imageUrl, index)}
                        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>

                {formData.images.length < 5 && (
                  <div>
                    <label className="block">
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors">
                        <Camera className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">
                          {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {formData.images.length}/5 images uploaded
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImages}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  name="available"
                  checked={formData.available}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-emerald-600 border-gray-700 rounded focus:ring-emerald-500"
                />
                <label htmlFor="available" className="text-gray-300 font-medium">
                  Product is available for rent
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="h-5 w-5" />
                  {editingProduct ? 'Update Product' : 'Save Product'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products List */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            Your Products ({products.length})
          </h2>

          {products.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
              <Box className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No products yet</p>
              <p className="text-gray-500 text-sm mb-6">
                Start adding rental products to your inventory
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Add Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-gray-800/50 backdrop-blur-sm border ${
                    product.available ? 'border-gray-700' : 'border-red-900/50'
                  } rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors`}
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-900">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-700" />
                      </div>
                    )}
                    
                    {/* Availability Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.available
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {product.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-gray-900/80 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-300 flex items-center gap-1">
                        {product.category === 'Camera' ? (
                          <Camera className="h-3 w-3" />
                        ) : (
                          <Tent className="h-3 w-3" />
                        )}
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {product.title}
                    </h3>

                    {product.brand && (
                      <p className="text-sm text-gray-400 mb-3">
                        {product.brand} {product.model && `• ${product.model}`}
                      </p>
                    )}

                    {product.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Price/Day</p>
                        <p className="text-lg font-bold text-emerald-400">
                          {formatPrice(product.pricePerDay)}
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Stock</p>
                        <p className="text-lg font-bold text-white">
                          {product.availableQuantity || 0}/{product.quantity}
                        </p>
                      </div>
                    </div>

                    {product.securityDeposit > 0 && (
                      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-2 mb-4">
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Deposit: {formatPrice(product.securityDeposit)}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleAvailability(product.id, product.available)}
                        className={`px-3 py-2 ${
                          product.available
                            ? 'bg-gray-600 hover:bg-gray-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        } text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors`}
                      >
                        {product.available ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Show
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.images)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
