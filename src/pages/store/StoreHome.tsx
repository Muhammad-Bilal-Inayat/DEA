import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, ShieldCheck, Truck, Clock, Sparkles, 
  ArrowRight, Tag, Check, Star, Plus, Eye, Award, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useStore } from './StoreContext';
import { getEffectiveOnlinePrice, getCompareAtPrice, getEffectiveOnlineStock } from '../../lib/storeManager';
import { Medicine } from '../../types';

export const StoreHome: React.FC = () => {
  const { 
    settings, 
    publishedMedicines, 
    featuredMedicines, 
    categories, 
    addToCart, 
    toggleCartDrawer,
    storeSearchQuery,
    setStoreSearchQuery
  } = useStore();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

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

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Recent / New Arrival medicines
  const newArrivals = React.useMemo(() => {
    return [...publishedMedicines].slice(0, 8);
  }, [publishedMedicines]);

  // Featured list fallback if none explicitly marked
  const displayFeatured = React.useMemo(() => {
    if (featuredMedicines.length > 0) return featuredMedicines.slice(0, 8);
    return publishedMedicines.slice(0, 8);
  }, [featuredMedicines, publishedMedicines]);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      
      {/* ================= 1. HERO BANNER SECTION ================= */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white overflow-hidden py-12 sm:py-20">
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>OFFICIAL VERIFIED HEALTHCARE STOREFRONT</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
                Genuine Medicines & <br className="hidden sm:inline" />
                <span className="text-emerald-400">Surgical Supplies</span> Delivered to Your Door.
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Directly connected to our physical pharmacy inventory. DRAP authorized stock, temperature-monitored cold chain, and rapid same-day delivery.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/store/products"
                  className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>BROWSE ALL PRODUCTS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                
                <Link
                  to="/store/track"
                  className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 transition flex items-center justify-center gap-2"
                >
                  <span>Track Existing Order</span>
                </Link>
              </div>

              {/* Trust badges strip */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-white/10 text-center lg:text-left">
                <div>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">100%</p>
                  <p className="text-[11px] text-slate-400">Authentic & DRAP Regulated</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">Fast</p>
                  <p className="text-[11px] text-slate-400">Same-Day Express Dispatch</p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-black text-white font-mono">COD & Raast</p>
                  <p className="text-[11px] text-slate-400">Multiple Safe Payments</p>
                </div>
              </div>

            </div>

            {/* Right Card / Promo Highlight */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/70">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black tracking-wider uppercase text-emerald-400">PROMO DISCOUNT</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10.5px] font-mono font-bold">
                    Active Code
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">Flat 10% OFF on First Order</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Use promo code <strong className="text-white font-mono">WELCOME10</strong> at checkout to claim instant 10% discount on entire cart.
                  </p>
                </div>

                {/* Coupon Copy Pill */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700 rounded-2xl p-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Coupon Code</p>
                    <p className="text-base font-black text-emerald-400 font-mono tracking-wider">WELCOME10</p>
                  </div>
                  <button
                    onClick={() => handleCopyCoupon('WELCOME10')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {copiedCode === 'WELCOME10' ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Free delivery on all orders over Rs. {settings.freeDeliveryThreshold || 2500}</span>
                </div>

              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ================= 2. FEATURED CATEGORIES ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Shop by Department</h2>
            <p className="text-xs text-slate-500 mt-0.5">Explore our wide range of pharmaceutical & surgical items</p>
          </div>
          <Link
            to="/store/products"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((category) => {
            const count = publishedMedicines.filter(m => (m.onlineCategory || m.category) === category).length;
            return (
              <Link
                key={category}
                to={`/store/products?category=${encodeURIComponent(category)}`}
                className="p-4 bg-white hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition group text-center flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition duration-200">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition line-clamp-1">
                    {category}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{count} {count === 1 ? 'item' : 'items'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= 3. FEATURED PRODUCTS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Featured Products</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Top-rated items in high demand</p>
          </div>
          <Link
            to="/store/products"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>See All Products</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayFeatured.map((med) => {
            const price = getEffectiveOnlinePrice(med);
            const comparePrice = getCompareAtPrice(med);
            const stock = getEffectiveOnlineStock(med);
            const isAdded = addedItemMap[med.id];

            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg transition duration-200 overflow-hidden flex flex-col group"
              >
                {/* Image Box */}
                <Link
                  to={`/store/product/${med.id}`}
                  className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100"
                >
                  {med.onlineImages && med.onlineImages[0] ? (
                    <img 
                      src={med.onlineImages[0]} 
                      alt={med.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition">
                        <ShoppingBag className="w-7 h-7" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2">
                        {med.unit || 'PCS'}
                      </span>
                    </div>
                  )}

                  {/* Discount / Featured Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    {comparePrice && comparePrice > price && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        SAVE {Math.round(((comparePrice - price) / comparePrice) * 100)}%
                      </span>
                    )}
                    {med.isFeatured && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                        FEATURED
                      </span>
                    )}
                  </div>

                  {/* Stock Status Pill */}
                  <div className="absolute top-2.5 right-2.5">
                    {stock > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        In Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {med.onlineCategory || med.category || 'General'}
                    </p>
                    <Link
                      to={`/store/product/${med.id}`}
                      className="text-xs sm:text-sm font-black text-slate-900 hover:text-emerald-700 transition line-clamp-2"
                    >
                      {med.onlineName || med.name}
                    </Link>
                    {med.genericName && (
                      <p className="text-[11px] text-slate-500 truncate italic">
                        {med.genericName}
                      </p>
                    )}
                  </div>

                  {/* Price & Add to Cart */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                          Rs. {price.toLocaleString()}
                        </span>
                        {comparePrice && comparePrice > price && (
                          <span className="text-[11px] text-slate-400 font-mono line-through">
                            Rs. {comparePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">per {med.unit || 'unit'}</span>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, med)}
                      disabled={stock <= 0}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        isAdded 
                          ? 'bg-emerald-600 text-white' 
                          : stock > 0 
                            ? 'bg-slate-900 hover:bg-emerald-700 text-white active:scale-95' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 4. PROMOTIONS & PERKS BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Free Doorstep Delivery</h4>
                <p className="text-xs text-emerald-100/80">
                  On all pharmacy orders over Rs. {settings.freeDeliveryThreshold || 2500}. Standard fee applies below threshold.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">DRAP Quality Certified</h4>
                <p className="text-xs text-emerald-100/80">
                  100% genuine products sourced directly from licensed pharma manufacturers and authorized distributors.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Cash on Delivery & Raast</h4>
                <p className="text-xs text-emerald-100/80">
                  Pay securely upon package inspection or direct instant Raast / Bank transfer.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 5. ALL CATALOG QUICK BROWSE ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">New Pharmacy Arrivals</h2>
            <p className="text-xs text-slate-500 mt-0.5">Recently added stock from inventory</p>
          </div>
          <Link
            to="/store/products"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>Explore Full Catalog</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {newArrivals.map((med) => {
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
                  className="relative h-40 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100"
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
                  <div className="absolute top-2 right-2">
                    {stock > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9.5px] font-bold">
                        In Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9.5px] font-bold">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {med.onlineCategory || med.category}
                    </p>
                    <Link
                      to={`/store/product/${med.id}`}
                      className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-1 mt-0.5"
                    >
                      {med.onlineName || med.name}
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 font-mono">
                        Rs. {price.toLocaleString()}
                      </span>
                      <span className="block text-[9.5px] text-slate-400">/{med.unit || 'PCS'}</span>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(e, med)}
                      disabled={stock <= 0}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isAdded 
                          ? 'bg-emerald-600 text-white' 
                          : stock > 0 
                            ? 'bg-slate-900 hover:bg-emerald-700 text-white' 
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
