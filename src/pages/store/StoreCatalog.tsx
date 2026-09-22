import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, Filter, SlidersHorizontal, ArrowUpDown, 
  Grid, List, Check, Plus, ShoppingBag, X, ChevronRight,
  ShieldCheck, AlertCircle, RotateCcw
} from 'lucide-react';
import { useStore } from './StoreContext';
import { getEffectiveOnlinePrice, getCompareAtPrice, getEffectiveOnlineStock } from '../../lib/storeManager';
import { Medicine } from '../../types';

export const StoreCatalog: React.FC = () => {
  const { publishedMedicines, categories, addToCart } = useStore();
  const location = useLocation();

  // URL query params
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'name_asc' | 'newest'>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  // Sync with URL query on navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    const q = params.get('q');
    if (cat) setSelectedCategory(cat);
    if (q) setSearchQuery(q);
  }, [location.search]);

  const handleAddToCart = (e: React.MouseEvent, med: Medicine) => {
    e.preventDefault();
    e.stopPropagation();
    const res = addToCart(med, 1);
    if (res.success) {
      setAddedItemMap(prev => ({ ...prev, [med.id]: true }));
      setTimeout(() => {
        setAddedItemMap(prev => ({ ...prev, [med.id]: false }));
      }, 1500);
    }
  };

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    return publishedMedicines.filter((med) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const itemCat = med.onlineCategory || med.category;
        if (itemCat !== selectedCategory) return false;
      }

      // In stock filter
      if (inStockOnly) {
        const stock = getEffectiveOnlineStock(med);
        if (stock <= 0) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = med.name.toLowerCase().includes(q) || (med.onlineName && med.onlineName.toLowerCase().includes(q));
        const matchGeneric = med.genericName && med.genericName.toLowerCase().includes(q);
        const matchCat = med.category && med.category.toLowerCase().includes(q);
        const matchMfg = med.manufacturer && med.manufacturer.toLowerCase().includes(q);
        const matchKw = med.searchKeywords && med.searchKeywords.some(kw => kw.toLowerCase().includes(q));
        if (!matchName && !matchGeneric && !matchCat && !matchMfg && !matchKw) return false;
      }

      return true;
    }).sort((a, b) => {
      const priceA = getEffectiveOnlinePrice(a);
      const priceB = getEffectiveOnlinePrice(b);

      if (sortBy === 'price_low') return priceA - priceB;
      if (sortBy === 'price_high') return priceB - priceA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      
      // Default: featured first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return 0;
    });
  }, [publishedMedicines, selectedCategory, inStockOnly, searchQuery, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setInStockOnly(false);
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to="/store" className="hover:text-emerald-700 transition">Store</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Catalog</span>
        {selectedCategory !== 'All' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 font-bold">{selectedCategory}</span>
          </>
        )}
      </nav>

      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {selectedCategory === 'All' ? 'Pharmacy & Surgical Products' : selectedCategory}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing <strong className="text-slate-800">{filteredProducts.length}</strong> available items
          </p>
        </div>

        {/* Search Bar inside catalog */}
        <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search products in catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 text-xs font-bold"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* ================= LEFT FILTERS SIDEBAR (Desktop) ================= */}
        <div className="hidden lg:block bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filters</span>
            </div>
            {(selectedCategory !== 'All' || inStockOnly || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Availability Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Availability
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
              />
              <span className="font-semibold">In Stock Items Only</span>
            </label>
          </div>

          {/* Department / Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Categories
            </label>
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                  selectedCategory === 'All' 
                    ? 'bg-emerald-600 text-white font-bold' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>All Products</span>
                <span className="text-[10px] opacity-75 font-mono">{publishedMedicines.length}</span>
              </button>

              {categories.map((cat) => {
                const count = publishedMedicines.filter(m => (m.onlineCategory || m.category) === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                      selectedCategory === cat 
                        ? 'bg-emerald-600 text-white font-bold' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    <span className="text-[10px] opacity-75 font-mono ml-2">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DRAP Advisory Card */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pharmacy Guarantee</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Every item in this store is sourced from licensed manufacturers with verified batch & expiry dates.
            </p>
          </div>

        </div>

        {/* ================= RIGHT MAIN CATALOG AREA ================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Active Filters Pill */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  <span>{selectedCategory}</span>
                  <button onClick={() => setSelectedCategory('All')} className="hover:text-emerald-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  <span>In Stock Only</span>
                  <button onClick={() => setInStockOnly(false)} className="hover:text-emerald-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                  <span>"{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-slate-950">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            {/* Sorting & Layout View Toggle */}
            <div className="flex items-center gap-3 ml-auto">
              
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-bold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="featured">Featured / Popular</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="name_asc">Product Name (A-Z)</option>
                  <option value="newest">Newest Stock</option>
                </select>
              </div>

              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'list' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* Product Items List / Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No matching online products found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search terms, changing the category, or clearing the active filters.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {filteredProducts.map((med) => {
                const price = getEffectiveOnlinePrice(med);
                const comparePrice = getCompareAtPrice(med);
                const stock = getEffectiveOnlineStock(med);
                const isAdded = addedItemMap[med.id];

                return (
                  <div
                    key={med.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg transition duration-200 overflow-hidden flex flex-col group"
                  >
                    <Link
                      to={`/store/product/${med.id}`}
                      className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100"
                    >
                      {med.onlineImages && med.onlineImages[0] ? (
                        <img 
                          src={med.onlineImages[0]} 
                          alt={med.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}

                      {/* Top Left Badges: Discount or Custom Promo Badge */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        {comparePrice && comparePrice > price && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                            SAVE {Math.round(((comparePrice - price) / comparePrice) * 100)}%
                          </span>
                        )}
                        {med.onlineBadge && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                            {med.onlineBadge}
                          </span>
                        )}
                      </div>

                      {/* Top Right Badges: Stock & Rx */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
                        {stock > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9.5px] font-bold shadow-2xs">
                            In Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9.5px] font-bold shadow-2xs">
                            Out of Stock
                          </span>
                        )}
                        {med.requiresPrescription && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            Rx
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span>{med.onlineCategory || med.category}</span>
                          {med.packSize && (
                            <span className="text-slate-500 font-medium normal-case">{med.packSize}</span>
                          )}
                        </div>
                        <Link
                          to={`/store/product/${med.id}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-2 mt-0.5"
                        >
                          {med.onlineName || med.name}
                        </Link>
                        {med.genericName && (
                          <p className="text-[10.5px] text-slate-500 truncate italic mt-0.5">
                            {med.genericName}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              Rs. {price.toLocaleString()}
                            </span>
                            {comparePrice && comparePrice > price && (
                              <span className="text-[10.5px] text-slate-400 font-mono line-through">
                                Rs. {comparePrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">per {med.unit || 'unit'}</span>
                        </div>

                        <button
                          onClick={(e) => handleAddToCart(e, med)}
                          disabled={stock <= 0}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isAdded 
                              ? 'bg-emerald-600 text-white' 
                              : stock > 0 
                                ? 'bg-slate-900 hover:bg-emerald-700 text-white' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {filteredProducts.map((med) => {
                const price = getEffectiveOnlinePrice(med);
                const comparePrice = getCompareAtPrice(med);
                const stock = getEffectiveOnlineStock(med);
                const isAdded = addedItemMap[med.id];

                return (
                  <div
                    key={med.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-md p-4 transition flex flex-col sm:flex-row items-center gap-4"
                  >
                    <Link
                      to={`/store/product/${med.id}`}
                      className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200"
                    >
                      {med.onlineImages && med.onlineImages[0] ? (
                        <img src={med.onlineImages[0]} alt={med.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-slate-400 font-mono">
                          {med.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {med.onlineCategory || med.category}
                        </span>
                        {stock > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-bold">
                            In Stock
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9.5px] font-bold">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/store/product/${med.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition block"
                      >
                        {med.onlineName || med.name}
                      </Link>

                      {med.manufacturer && (
                        <p className="text-[11px] text-slate-500">Mfr: {med.manufacturer}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="text-base font-black text-slate-900 font-mono">
                          Rs. {price.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">per {med.unit || 'unit'}</span>
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, med)}
                        disabled={stock <= 0}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isAdded 
                            ? 'bg-emerald-600 text-white' 
                            : stock > 0 
                              ? 'bg-slate-900 hover:bg-emerald-700 text-white' 
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Mobile Filter Modal */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-5 space-y-5 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Filter Products</h3>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Availability</label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>In Stock Only</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Categories</label>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setIsMobileFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                      selectedCategory === 'All' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs ${
                        selectedCategory === cat ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
