import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Tent, 
  Star, 
  MapPin, 
  DollarSign, 
  Shield, 
  Eye,
  Filter,
  X,
  Package as PackageIcon,
  Search
} from 'lucide-react';

const BrowseProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const [filters, setFilters] = useState({
    category: '',
    subCategory: '',
    brand: '',
    priceRange: '',
    location: '',
    searchQuery: ''
  });

  const categories = {
    'Camera': ['DSLR Camera', 'Mirrorless Camera', 'Action Camera', 'Drone', 'Lens', 'Tripod', 'Lighting', 'Accessories'],
    'Camping': ['Tent', 'Sleeping Bag', 'Backpack', 'Camping Stove', 'Cooler', 'Headlamp', 'Camping Chair', 'Accessories']
  };

  const priceRanges = [
    { value: '0-2000', label: 'Under LKR 2,000/day' },
    { value: '2000-5000', label: 'LKR 2,000 - 5,000/day' },
    { value: '5000-10000', label: 'LKR 5,000 - 10,000/day' },
    { value: '10000-20000', label: 'LKR 10,000 - 20,000/day' },
    { value: '20000-999999', label: 'Over LKR 20,000/day' }
  ];

  const locations = [
    'Colombo', 'Kandy', 'Negombo', 'Galle', 'Yala', 
    'Sigiriya', 'Nuwara Eliya', 'Ella', 'Anuradhapura', 'Polonnaruwa'
  ];

  // Fetch products and providers
  useEffect(() => {
    const productsRef = collection(db, 'rentalProducts');
    const q = query(productsRef, where('available', '==', true));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const productsList = [];
      const providerIds = new Set();

      snapshot.forEach((doc) => {
        const productData = { id: doc.id, ...doc.data() };
        productsList.push(productData);
        providerIds.add(productData.providerId);
      });

      // Fetch provider details
      const providersData = {};
      for (const providerId of providerIds) {
        const providerDoc = await getDoc(doc(db, 'serviceProviders', providerId));
        if (providerDoc.exists()) {
          providersData[providerId] = providerDoc.data();
        }
      }

      setProviders(providersData);
      setProducts(productsList);
      setFilteredProducts(productsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    // Sub-category filter
    if (filters.subCategory) {
      filtered = filtered.filter(p => p.subCategory === filters.subCategory);
    }

    // Brand filter
    if (filters.brand) {
      filtered = filtered.filter(p => 
        p.brand?.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(p => 
        p.pricePerDay >= min && p.pricePerDay <= max
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(p => {
        const provider = providers[p.providerId];
        return provider?.location?.includes(filters.location);
      });
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.model?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [filters, products, providers]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset sub-category if category changes
      ...(key === 'category' ? { subCategory: '' } : {})
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      subCategory: '',
      brand: '',
      priceRange: '',
      location: '',
      searchQuery: ''
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleViewProduct = (productId) => {
    navigate(`/product/${productId}`);
  };

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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center gap-3">
            <PackageIcon className="h-8 w-8 md:h-10 md:w-10 text-emerald-500" />
            Browse Rental Equipment
          </h1>
          <p className="text-gray-400 text-lg">
            Find the perfect camera or camping gear for your adventure
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by product name, brand, or model..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filters Toggle */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Filter className="h-5 w-5" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {Object.values(filters).filter(v => v).length > 0 && (
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Filters</h3>
              {Object.values(filters).filter(v => v).length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Categories</option>
                  <option value="Camera">Camera Equipment</option>
                  <option value="Camping">Camping Gear</option>
                </select>
              </div>

              {/* Sub-Category */}
              {filters.category && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sub-Category
                  </label>
                  <select
                    value={filters.subCategory}
                    onChange={(e) => handleFilterChange('subCategory', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">All Sub-Categories</option>
                    {categories[filters.category].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  placeholder="e.g., Canon, Sony"
                  value={filters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price Range
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Prices</option>
                  {priceRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Shop Location
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-400">
            Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
            <PackageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No products found</p>
            <p className="text-gray-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const provider = providers[product.providerId];
              return (
                <div
                  key={product.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all hover:scale-105 cursor-pointer"
                  onClick={() => handleViewProduct(product.id)}
                >
                  {/* Product Image */}
                  <div className="relative h-56 bg-gray-900">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PackageIcon className="h-16 w-16 text-gray-700" />
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-gray-900/90 backdrop-blur-sm rounded-full text-xs font-semibold text-white flex items-center gap-1">
                        {product.category === 'Camera' ? (
                          <Camera className="h-3 w-3" />
                        ) : (
                          <Tent className="h-3 w-3" />
                        )}
                        {product.category}
                      </span>
                    </div>

                    {/* Condition Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                        {product.condition}
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

                    {/* Provider Info */}
                    {provider && (
                      <div className="mb-4 pb-4 border-b border-gray-700">
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {provider.fullName} • {provider.location}
                        </p>
                        {provider.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm text-gray-400">
                              {provider.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Price per day</p>
                      <p className="text-2xl font-bold text-emerald-400">
                        {formatPrice(product.pricePerDay)}
                      </p>
                      {product.securityDeposit > 0 && (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                          <Shield className="h-3 w-3" />
                          Deposit: {formatPrice(product.securityDeposit)}
                        </p>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500">
                        In Stock: <span className="text-white font-semibold">{product.availableQuantity || 0}</span>
                      </p>
                    </div>

                    {/* View Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProduct(product.id);
                      }}
                      className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye className="h-5 w-5" />
                      View Details
                    </button>
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

export default BrowseProducts;
