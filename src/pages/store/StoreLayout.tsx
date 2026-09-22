import React, { useState } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, Search, Phone, ShieldCheck, Truck, Clock, 
  MapPin, Menu, X, ArrowRight, MessageSquare, Heart, 
  Package, Sparkles, ExternalLink, HelpCircle, Check, ChevronRight
} from 'lucide-react';
import { useStore, StoreProvider } from './StoreContext';
import { StoreCartDrawer } from './StoreCartDrawer';
import { getEffectiveOnlinePrice, getEffectiveOnlineStock } from '../../lib/storeManager';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { PWAInstallBanner } from '../../components/pwa/PWAInstallBanner';

const StoreLayoutInner: React.FC = () => {
  const { 
    settings, 
    cartCount, 
    toggleCartDrawer, 
    categories, 
    publishedMedicines,
    storeSearchQuery,
    setStoreSearchQuery
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeSearchQuery.trim()) {
      navigate(`/store/products?q=${encodeURIComponent(storeSearchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  // Instant live search matches
  const searchMatches = React.useMemo(() => {
    if (!storeSearchQuery.trim()) return [];
    const clean = storeSearchQuery.toLowerCase().trim();
    return publishedMedicines.filter(m => 
      m.name.toLowerCase().includes(clean) ||
      (m.onlineName && m.onlineName.toLowerCase().includes(clean)) ||
      (m.genericName && m.genericName.toLowerCase().includes(clean)) ||
      (m.category && m.category.toLowerCase().includes(clean))
    ).slice(0, 5);
  }, [publishedMedicines, storeSearchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      <PWAInstallBanner />
      
      {/* Top Announcement Bar */}
      {settings.announcementText && (
        <div className="bg-emerald-800 text-emerald-100 text-[11px] sm:text-xs py-1.5 px-4 text-center font-medium flex items-center justify-between border-b border-emerald-700/50">
          <div className="hidden md:flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>DRAP Authorized Pharmacy</span>
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cold-Chain Verified</span>
            </span>
          </div>
          
          <div className="mx-auto flex items-center gap-1.5 font-medium tracking-tight">
            <span>{settings.announcementText}</span>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[11px]">
            <Link to="/store/track" className="hover:text-white transition underline font-semibold">
              Track Order
            </Link>
            <Link to="/user" className="hover:text-white transition flex items-center gap-1 font-semibold text-emerald-300">
              <span>Admin POS</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link to="/store" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:bg-emerald-700 transition">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>MBI STORE</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ONLINE
                    </span>
                  </span>
                  <p className="text-[10.5px] text-slate-500 font-medium hidden sm:block truncate max-w-[220px]">
                    {settings.storeName}
                  </p>
                </div>
              </Link>
            </div>

            {/* Live Search Bar with Instant Autocomplete Popover */}
            <div className="flex-1 max-w-xl relative hidden md:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search medicines, surgical items, syringes, brands (e.g. Panadol, Augmentin)..."
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Autocomplete Dropdown */}
              {searchFocused && storeSearchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1">
                  {searchMatches.length > 0 ? (
                    searchMatches.map((m) => {
                      const price = getEffectiveOnlinePrice(m);
                      const stock = getEffectiveOnlineStock(m);
                      return (
                        <Link
                          key={m.id}
                          to={`/store/product/${m.id}`}
                          onClick={() => setSearchFocused(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-mono font-bold text-slate-500 overflow-hidden">
                              {m.onlineImages && m.onlineImages[0] ? (
                                <img src={m.onlineImages[0]} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                m.name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition">
                                {m.onlineName || m.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {m.category} • {m.unit || 'PCS'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 font-mono">
                              Rs. {price.toLocaleString()}
                            </span>
                            {stock > 0 ? (
                              <span className="block text-[9.5px] font-bold text-emerald-600">In Stock</span>
                            ) : (
                              <span className="block text-[9.5px] font-bold text-rose-600">Out of Stock</span>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No online products found matching "{storeSearchQuery}".
                    </div>
                  )}
                  <div className="p-2 border-t border-slate-100 text-center">
                    <Link
                      to={`/store/products?q=${encodeURIComponent(storeSearchQuery)}`}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      View all results for "{storeSearchQuery}" →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* WhatsApp Live Support */}
              {settings.whatsappNumber && (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello MBI Store, I need assistance with medicine order.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition"
                  title="WhatsApp Pharmacy Assistance"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Order</span>
                </a>
              )}

              {/* Track Order */}
              <Link
                to="/store/track"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
              >
                <Package className="w-4 h-4 text-slate-500" />
                <span>Track Order</span>
              </Link>

              {/* Back to Home / Main App */}
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                title="Return to Main Application Home"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180 text-emerald-400" />
                <span>Back to Home</span>
              </Link>

              {/* Cart Drawer Trigger */}
              <button
                onClick={toggleCartDrawer}
                className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">CART</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10.5px] font-mono font-black shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>

            </div>

          </div>
        </div>

        {/* Secondary Category Navigation Bar */}
        <div className="bg-slate-50 border-t border-slate-200/70 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs py-2 overflow-x-auto no-scrollbar gap-4">
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <NavLink
                  to="/store"
                  end
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/store/products"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg font-bold transition flex-shrink-0 ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`
                  }
                >
                  All Products ({publishedMedicines.length})
                </NavLink>

                {categories.slice(0, 6).map((cat) => (
                  <NavLink
                    key={cat}
                    to={`/store/products?category=${encodeURIComponent(cat)}`}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-lg font-medium transition flex-shrink-0 ${
                        isActive ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`
                    }
                  >
                    {cat}
                  </NavLink>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11.5px] text-slate-500 font-medium flex-shrink-0">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Free shipping above Rs. {settings.freeDeliveryThreshold || 2500}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search & Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search products..."
                value={storeSearchQuery}
                onChange={(e) => setStoreSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </form>

            <div className="space-y-1 text-xs font-semibold text-slate-700">
              <Link 
                to="/store" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-slate-100"
              >
                Storefront Home
              </Link>
              <Link 
                to="/store/products" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-slate-100"
              >
                All Products ({publishedMedicines.length})
              </Link>
              <Link 
                to="/store/cart" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-slate-100"
              >
                Shopping Cart ({cartCount})
              </Link>
              <Link 
                to="/store/track" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="block p-2.5 rounded-xl hover:bg-slate-100"
              >
                Track Your Order
              </Link>
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Categories</p>
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/store/products?category=${encodeURIComponent(cat)}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block p-2 rounded-lg text-slate-600 hover:bg-slate-50 text-xs"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>

      {/* Cart Drawer Component */}
      <StoreCartDrawer />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Col 1: Store Brand */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 text-white font-black text-base">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>{settings.storeName}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                {settings.storeTagline || 'Authentic healthcare, surgical disposables, diagnostic kits, and prescription medicines.'}
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{settings.pharmacyLicenseNotice || 'DRAP Certified Distributor'}</span>
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-2">
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Quick Navigation</h4>
              <ul className="space-y-1.5">
                <li><Link to="/store" className="hover:text-emerald-400 transition">Storefront Home</Link></li>
                <li><Link to="/store/products" className="hover:text-emerald-400 transition">Catalog & All Products</Link></li>
                <li><Link to="/store/cart" className="hover:text-emerald-400 transition">View Shopping Cart</Link></li>
                <li><Link to="/store/track" className="hover:text-emerald-400 transition">Live Order Tracking</Link></li>
                <li><Link to="/user" className="hover:text-emerald-400 transition text-emerald-400">Back to Admin ERP / POS</Link></li>
              </ul>
            </div>

            {/* Col 3: Categories */}
            <div className="space-y-2">
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Popular Categories</h4>
              <ul className="space-y-1.5">
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat}>
                    <Link to={`/store/products?category=${encodeURIComponent(cat)}`} className="hover:text-emerald-400 transition">
                      {cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Contact & Support */}
            <div className="space-y-3">
              <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Pharmacy Helpline</h4>
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{settings.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp: {settings.whatsappNumber}</span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{settings.address}, {settings.city}</span>
                </p>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-slate-500">
                  {settings.prescriptionRequiredNotice || 'Valid doctor prescription required for scheduled drugs.'}
                </p>
              </div>
            </div>

          </div>

          <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
            <p>© {new Date().getFullYear()} {settings.storeName}. Powered by MBI Inventra Core.</p>
            <div className="flex items-center gap-4">
              <span>Same-Day City Delivery</span>
              <span>•</span>
              <span>100% Genuine Stock</span>
              <span>•</span>
              <span>Cash on Delivery & Raast</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around text-slate-600 shadow-lg">
        <Link to="/store" className="flex flex-col items-center gap-0.5 text-[10px] font-bold hover:text-emerald-600">
          <ShoppingBag className="w-4 h-4" />
          <span>Shop</span>
        </Link>
        <Link to="/store/products" className="flex flex-col items-center gap-0.5 text-[10px] font-bold hover:text-emerald-600">
          <Search className="w-4 h-4" />
          <span>Catalog</span>
        </Link>
        <button onClick={toggleCartDrawer} className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-emerald-700 relative">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold font-mono">
                {cartCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>
        <Link to="/store/track" className="flex flex-col items-center gap-0.5 text-[10px] font-bold hover:text-emerald-600">
          <Package className="w-4 h-4" />
          <span>Track</span>
        </Link>
      </div>

    </div>
  );
};

export const StoreLayout: React.FC = () => {
  return (
    <StoreProvider>
      <StoreLayoutInner />
    </StoreProvider>
  );
};
