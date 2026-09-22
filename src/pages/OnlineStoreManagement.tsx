import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Package, DollarSign, Clock, CheckCircle2, 
  Truck, XCircle, Search, Filter, Plus, Edit3, Trash2, 
  ExternalLink, ArrowUpRight, ShieldCheck, Tag, Settings as SettingsIcon,
  RefreshCw, MessageSquare, Printer, FileText, Check, AlertCircle, Eye,
  Layers, ChevronRight, Save, ToggleLeft, ToggleRight, Image as ImageIcon,
  Star, Camera, ThermometerSnowflake
} from 'lucide-react';
import { 
  Medicine, 
  OnlineOrder, 
  OnlineOrderStatus, 
  OnlineStoreSettings, 
  StorePromotion, 
  Invoice 
} from '../types';
import { EditStoreProductModal } from '../components/store/EditStoreProductModal';
import { 
  dbMedicines, 
  dbOnlineOrders, 
  dbOnlinePromotions, 
  dbStoreSettings 
} from '../lib/db';
import { 
  getStoreSettings, 
  saveStoreSettings, 
  ensurePromotions, 
  getEffectiveOnlinePrice, 
  getCompareAtPrice, 
  getEffectiveOnlineStock,
  convertOnlineOrderToSaleInvoice,
  syncAllProductsToOnlineStore,
  DEFAULT_STORE_SETTINGS
} from '../lib/storeManager';

export const OnlineStoreManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'promotions' | 'settings'>('overview');
  
  // Data State
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [settings, setSettings] = useState<OnlineStoreSettings>(DEFAULT_STORE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('All');
  const [productImageFilter, setProductImageFilter] = useState<'All' | 'WithPhotos' | 'MissingPhotos'>('All');

  // Modals & Active Edit States
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<StorePromotion | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSyncingStore, setIsSyncingStore] = useState(false);

  // Status Change Inputs
  const [statusNote, setStatusNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [riderName, setRiderName] = useState('');

  const handleSyncAllToStore = async () => {
    setIsSyncingStore(true);
    try {
      const res = await syncAllProductsToOnlineStore({ publishAll: true });
      await loadData();
      setSaveSuccessMsg(`Successfully synced & published ${res.updated} products! (${res.published} online)`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(`Sync failed: ${err.message || err}`);
    } finally {
      setIsSyncingStore(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedMeds, fetchedPromos, fetchedSettings] = await Promise.all([
        dbOnlineOrders.getAll(),
        dbMedicines.getAll(),
        ensurePromotions(),
        getStoreSettings()
      ]);
      setOrders(fetchedOrders || []);
      setMedicines(fetchedMeds || []);
      setPromotions(fetchedPromos || []);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error('Error loading online store data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary KPIs
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const newOrders = orders.filter(o => o.status === 'New').length;
    const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const publishedProductsCount = medicines.filter(m => m.showOnline !== false && m.onlineStatus !== 'Hidden' && m.onlineStatus !== 'Draft').length;

    return {
      totalOrders,
      newOrders,
      deliveredOrders,
      totalRevenue,
      publishedProductsCount
    };
  }, [orders, medicines]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase().trim();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchName = o.customer.name.toLowerCase().includes(q);
        const matchPhone = o.customer.phone.includes(q);
        const matchCity = o.customer.city.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchPhone && !matchCity) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, orderStatusFilter, orderSearch]);

  // Filtered Products for Online Management
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (productCategoryFilter !== 'All' && (m.onlineCategory || m.category) !== productCategoryFilter) return false;
      
      // Photo presence filter
      const hasPhoto = !!(m.onlineImages && m.onlineImages.length > 0 && m.onlineImages[0]) || 
                       !!(m.description && m.description.startsWith('data:image'));
      if (productImageFilter === 'WithPhotos' && !hasPhoto) return false;
      if (productImageFilter === 'MissingPhotos' && hasPhoto) return false;

      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q) || (m.onlineName && m.onlineName.toLowerCase().includes(q));
        const matchCat = m.category && m.category.toLowerCase().includes(q);
        const matchBarcode = m.barcode && m.barcode.includes(q);
        const matchKw = m.searchKeywords && m.searchKeywords.some(kw => kw.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchBarcode && !matchKw) return false;
      }
      return true;
    });
  }, [medicines, productCategoryFilter, productImageFilter, productSearch]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    medicines.forEach(m => {
      const c = m.onlineCategory || m.category;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [medicines]);

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OnlineOrderStatus) => {
    const target = orders.find(o => o.id === orderId);
    if (!target) return;

    const updatedOrder: OnlineOrder = {
      ...target,
      status: newStatus,
      trackingNumber: trackingNumber || target.trackingNumber,
      riderName: riderName || target.riderName,
      paymentStatus: newStatus === 'Delivered' ? 'Paid' : target.paymentStatus,
      statusHistory: [
        ...(target.statusHistory || []),
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: statusNote || `Status updated to ${newStatus}`,
          updatedBy: 'Admin'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    await dbOnlineOrders.save(updatedOrder);
    setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setStatusNote('');
    showSuccessToast(`Order #${target.orderNumber} status updated to ${newStatus}`);
  };

  // Convert Online Order to Official Sale Invoice
  const handleConvertToInvoice = async (order: OnlineOrder) => {
    const res = await convertOnlineOrderToSaleInvoice(order);
    if (res.success && res.invoice) {
      showSuccessToast(`Sale Invoice #${res.invoice.invoiceNumber} created successfully!`);
      loadData();
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, invoiceId: res.invoice.id });
      }
    } else {
      alert(res.error || 'Failed to convert order to invoice.');
    }
  };

  // Save Product Online Fields
  const handleSaveMedicineOnlineFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;

    const updated: Medicine = {
      ...editingMedicine,
      updatedAt: new Date().toISOString()
    };

    await dbMedicines.save(updated);
    setMedicines(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditingMedicine(null);
    showSuccessToast(`Online store settings updated for "${updated.name}"`);
  };

  // Quick Toggle Product Online Status
  const handleToggleOnlineStatus = async (med: Medicine) => {
    const nextStatus = med.showOnline === false || med.onlineStatus === 'Hidden' ? 'Published' : 'Hidden';
    const nextShowOnline = nextStatus === 'Published';
    const updated: Medicine = {
      ...med,
      showOnline: nextShowOnline,
      onlineStatus: nextStatus as any,
      updatedAt: new Date().toISOString()
    };
    await dbMedicines.save(updated);
    setMedicines(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  // Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await saveStoreSettings(settings);
    setSettings(saved);
    showSuccessToast('Online store settings saved successfully!');
  };

  // Save Promotion / Coupon
  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    await dbOnlinePromotions.save(editingPromo);
    const updatedPromos = await dbOnlinePromotions.getAll();
    setPromotions(updatedPromos);
    setIsPromoModalOpen(false);
    setEditingPromo(null);
    showSuccessToast(`Promotion coupon "${editingPromo.code}" saved!`);
  };

  const handleDeletePromotion = async (promoId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    await dbOnlinePromotions.delete(promoId);
    setPromotions(prev => prev.filter(p => p.id !== promoId));
    showSuccessToast('Coupon removed.');
  };

  const showSuccessToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Online Store Management</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                Active Storefront
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage e-commerce orders, independent online pricing, published catalog & promotions
            </p>
          </div>
        </div>

        {/* Storefront Link & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Store Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/store"
            target="_blank"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition"
          >
            <span>Open Live Storefront</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Online Orders ({orders.length})</span>
          {kpis.newOrders > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9.5px] font-mono">
              {kpis.newOrders} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Products & Pricing ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'promotions'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons & Deals ({promotions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Store Settings</span>
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Online Revenue</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                Rs. {kpis.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500">From all processed e-commerce orders</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {kpis.totalOrders}
              </p>
              <p className="text-[11px] text-slate-500">
                <strong className="text-rose-600">{kpis.newOrders} New</strong> orders awaiting action
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Completed Orders</span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {kpis.deliveredOrders}
              </p>
              <p className="text-[11px] text-slate-500">Delivered & payment settled</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Published Catalog</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-mono">
                {kpis.publishedProductsCount} <span className="text-xs text-slate-400 font-normal">/ {medicines.length}</span>
              </p>
              <p className="text-[11px] text-slate-500">Live products on storefront</p>
            </div>

          </div>

          {/* Quick Recent Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Recent Online Orders</h3>
                <p className="text-xs text-slate-500">Latest orders placed by customers through the storefront</p>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>View All Orders</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">City</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="block text-slate-900">{order.customer.name}</strong>
                        <span className="text-[10.5px] text-slate-400 font-mono">{order.customer.phone}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {order.customer.city}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        Rs. {order.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-slate-700">{order.paymentMethod}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'New' 
                            ? 'bg-rose-100 text-rose-800' 
                            : order.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveTab('orders');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 2: ORDERS ================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Order #, Customer Name, Phone, City..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['All', 'New', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex-shrink-0 cursor-pointer ${
                    orderStatusFilter === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3 text-right">Grand Total</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Invoice</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No orders matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <strong className="block text-slate-900">{order.customer.name}</strong>
                          <span className="text-[10.5px] text-slate-500">{order.customer.city} • {order.customer.phone}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {order.items.length} items
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          Rs. {order.grandTotal.toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-700 font-semibold">{order.paymentMethod}</span>
                          <span className={`block text-[10px] ${order.paymentStatus === 'Paid' ? 'text-emerald-600 font-bold' : 'text-amber-600'}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                            order.status === 'New' 
                              ? 'bg-rose-100 text-rose-800' 
                              : order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {order.invoiceId ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10.5px] font-mono font-bold border border-emerald-200">
                              Synced
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConvertToInvoice(order)}
                              className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-[10.5px] font-bold rounded-lg transition"
                              title="Create Official Sale Invoice"
                            >
                              + Invoice
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 3: PRODUCTS & ONLINE PRICING ================= */}
      {activeTab === 'products' && (
        <div className="space-y-6">

          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-sm font-bold flex items-center justify-center sm:justify-start gap-2">
                <ShoppingBag className="w-4 h-4" />
                Online Store Product Sync & Publishing
              </h3>
              <p className="text-emerald-100 text-xs">
                Ensure all inventory items are published and synchronized with the public storefront catalog instantly.
              </p>
            </div>
            <button
              onClick={handleSyncAllToStore}
              disabled={isSyncingStore}
              className="px-5 py-2.5 bg-white text-emerald-800 font-bold rounded-xl shadow hover:bg-emerald-50 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingStore ? 'animate-spin' : ''}`} />
              <span>{isSyncingStore ? 'Syncing Products...' : 'Sync & Publish All Products'}</span>
            </button>
          </div>
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search medicine name, salt, barcode, keywords..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Photo Presence Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setProductImageFilter('All')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    productImageFilter === 'All'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({medicines.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductImageFilter('WithPhotos')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    productImageFilter === 'WithPhotos'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-3 h-3 text-emerald-600" />
                  <span>Has Photo ({medicines.filter(m => (m.onlineImages && m.onlineImages.length > 0 && m.onlineImages[0]) || (m.description && m.description.startsWith('data:image'))).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductImageFilter('MissingPhotos')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    productImageFilter === 'MissingPhotos'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3 h-3 text-amber-600" />
                  <span>No Photo ({medicines.filter(m => !((m.onlineImages && m.onlineImages.length > 0 && m.onlineImages[0]) || (m.description && m.description.startsWith('data:image')))).length})</span>
                </button>
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Product & Media</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">POS Rate</th>
                    <th className="py-3 px-3 text-right">Online Rate</th>
                    <th className="py-3 px-3 text-center">Live Stock</th>
                    <th className="py-3 px-3 text-center">Store Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.map((med) => {
                    const effectivePrice = getEffectiveOnlinePrice(med);
                    const stock = getEffectiveOnlineStock(med);
                    const isPublished = med.showOnline !== false && med.onlineStatus !== 'Hidden' && med.onlineStatus !== 'Draft';
                    const coverPhoto = (med.onlineImages && med.onlineImages[0]) || 
                                       (med.description && med.description.startsWith('data:image') ? med.description : null);

                    return (
                      <tr key={med.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative group">
                              {coverPhoto ? (
                                <img 
                                  src={coverPhoto} 
                                  alt="" 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80';
                                  }}
                                />
                              ) : (
                                <div className="text-slate-300 flex flex-col items-center justify-center">
                                  <ImageIcon className="w-5 h-5" />
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">No Img</span>
                                </div>
                              )}
                              {med.onlineImages && med.onlineImages.length > 1 && (
                                <span className="absolute bottom-0 right-0 px-1 bg-slate-900/80 text-white text-[8px] font-mono font-bold rounded-tl">
                                  +{med.onlineImages.length}
                                </span>
                              )}
                            </div>

                            <div className="space-y-0.5 max-w-xs sm:max-w-sm">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <strong className="text-slate-900 text-xs hover:text-emerald-700 transition">
                                  {med.onlineName || med.name}
                                </strong>
                                {med.onlineBadge && (
                                  <span className="px-1.5 py-0.2 bg-rose-600 text-white font-black text-[9px] rounded uppercase shadow-2xs">
                                    {med.onlineBadge}
                                  </span>
                                )}
                                {med.requiresPrescription && (
                                  <span className="px-1.5 py-0.2 bg-indigo-600 text-white font-black text-[9px] rounded uppercase">
                                    Rx
                                  </span>
                                )}
                                {med.coldChain && (
                                  <span className="px-1.5 py-0.2 bg-cyan-100 text-cyan-800 font-bold text-[9px] rounded flex items-center gap-0.5">
                                    <ThermometerSnowflake className="w-2.5 h-2.5" />
                                    2-8°C
                                  </span>
                                )}
                                {med.isFeatured && (
                                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-bold text-[9px] rounded flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                                {med.onlineName && med.onlineName !== med.name && (
                                  <span>ERP: {med.name}</span>
                                )}
                                {med.packSize && (
                                  <span className="text-slate-500 font-medium">&bull; {med.packSize}</span>
                                )}
                                {med.genericName && (
                                  <span className="text-slate-500 italic truncate">&bull; {med.genericName}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium">
                            {med.onlineCategory || med.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          Rs. {med.sellingPrice || med.mrp || 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {med.useMainSalePrice === false && med.onlinePrice ? (
                            <div>
                              <span className="text-emerald-700">Rs. {med.onlinePrice}</span>
                              {med.compareAtPrice && med.compareAtPrice > med.onlinePrice && (
                                <span className="block text-[9.5px] text-slate-400 line-through">
                                  Rs. {med.compareAtPrice}
                                </span>
                              )}
                              <span className="block text-[9px] text-emerald-600 font-bold">Independent</span>
                            </div>
                          ) : (
                            <div>
                              <span>Rs. {effectivePrice}</span>
                              <span className="block text-[9.5px] text-slate-400">POS Linked</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={stock > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {stock} {med.unit || 'PCS'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleOnlineStatus(med)}
                            className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition ${
                              isPublished
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {isPublished ? 'Published' : 'Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setEditingMedicine(med)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Edit Photos & Info</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 4: PROMOTIONS ================= */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Store Promotions & Discount Coupons</h3>
              <p className="text-xs text-slate-500">Create discount codes for customer marketing</p>
            </div>
            <button
              onClick={() => {
                setEditingPromo({
                  id: `promo-${Date.now()}`,
                  code: '',
                  title: '',
                  description: '',
                  discountType: 'PERCENTAGE',
                  discountValue: 10,
                  minOrderAmount: 1000,
                  isActive: true,
                  usageCount: 0,
                  createdAt: new Date().toISOString()
                });
                setIsPromoModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-mono font-black text-xs rounded-xl border border-emerald-200">
                    {promo.code}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    promo.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {promo.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{promo.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{promo.description}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount:</span>
                    <strong className="font-mono text-slate-900">
                      {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `Rs. ${promo.discountValue} OFF`}
                    </strong>
                  </div>
                  {promo.minOrderAmount && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Min Order:</span>
                      <span className="font-mono text-slate-700">Rs. {promo.minOrderAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Usage:</span>
                    <span className="font-mono text-slate-700">{promo.usageCount} times</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => {
                      setEditingPromo(promo);
                      setIsPromoModalOpen(true);
                    }}
                    className="text-xs font-bold text-slate-700 hover:text-emerald-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePromotion(promo.id)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: SETTINGS ================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="max-w-4xl space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Online Store General Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Store Name</label>
                <input
                  type="text"
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Store Tagline / Subtitle</label>
                <input
                  type="text"
                  value={settings.storeTagline || ''}
                  onChange={(e) => setSettings({ ...settings, storeTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Top Header Announcement Bar Text</label>
                <input
                  type="text"
                  value={settings.announcementText || ''}
                  onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Helpline Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">WhatsApp Order Number</label>
                <input
                  type="text"
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700">Pharmacy Address & City</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Delivery & Checkout Rules</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Standard Delivery Charges (PKR)</label>
                <input
                  type="number"
                  value={settings.deliveryCharges}
                  onChange={(e) => setSettings({ ...settings, deliveryCharges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Free Delivery Threshold (PKR)</label>
                <input
                  type="number"
                  value={settings.freeDeliveryThreshold}
                  onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Minimum Order Amount (PKR)</label>
                <input
                  type="number"
                  value={settings.minOrderAmount || 300}
                  onChange={(e) => setSettings({ ...settings, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Settings</span>
          </button>
        </form>
      )}

      {/* ================= MODAL: ORDER DETAILS & STATUS WORKFLOW ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">Order #{selectedOrder.orderNumber}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedOrder.status === 'New' 
                      ? 'bg-rose-100 text-rose-800' 
                      : selectedOrder.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {new Date(selectedOrder.orderDate).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Customer Information</span>
                <p className="font-bold text-slate-900">{selectedOrder.customer.name}</p>
                <p className="text-slate-700">{selectedOrder.customer.address}, {selectedOrder.customer.city}</p>
                <p className="font-mono text-slate-700 font-bold">{selectedOrder.customer.phone}</p>
                {selectedOrder.customer.notes && (
                  <p className="text-slate-500 italic mt-1">Instructions: "{selectedOrder.customer.notes}"</p>
                )}
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Payment & Sync</span>
                <p className="font-bold text-slate-900">{selectedOrder.paymentMethod}</p>
                <p className="text-slate-600">Payment Status: <strong>{selectedOrder.paymentStatus}</strong></p>
                {selectedOrder.invoiceId ? (
                  <p className="text-emerald-700 font-bold mt-1">✓ Linked to Sale Invoice</p>
                ) : (
                  <button
                    onClick={() => handleConvertToInvoice(selectedOrder)}
                    className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Convert to Sale Invoice
                  </button>
                )}
              </div>
            </div>

            {/* Ordered Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Ordered Items</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10.5px] text-slate-400">Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">Rs. {item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-900">
                <span>Grand Total (incl. delivery):</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  Rs. {selectedOrder.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status Change Workflow */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-black uppercase tracking-wider text-slate-900">Update Order Status</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'] as OnlineOrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateOrderStatus(selectedOrder.id, st)}
                    className={`py-2 px-3 rounded-xl font-bold transition text-center cursor-pointer ${
                      selectedOrder.status === st
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Mark {st}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  placeholder="Courier Tracking # (e.g. TCS-90184)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Rider Name & Contact (e.g. Ali - 0300...)"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* WhatsApp Contact Action */}
            <div className="flex justify-between items-center pt-2">
              <a
                href={`https://wa.me/${selectedOrder.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedOrder.customer.name}, regarding your MBI Pharmacy Order #${selectedOrder.orderNumber}: status is ${selectedOrder.status}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Message Customer on WhatsApp</span>
              </a>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT MEDICINE ONLINE FIELDS ================= */}
      {editingMedicine && (
        <EditStoreProductModal
          medicine={editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={async (updatedMed) => {
            await dbMedicines.save(updatedMed);
            setMedicines(prev => prev.map(m => m.id === updatedMed.id ? updatedMed : m));
            setEditingMedicine(null);
            showSuccessToast(`Online store info & photos updated for "${updatedMed.onlineName || updatedMed.name}"`);
          }}
        />
      )}

      {/* ================= MODAL: PROMOTION EDIT ================= */}
      {isPromoModalOpen && editingPromo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSavePromotion} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-sm font-black text-slate-900">Manage Discount Coupon</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  value={editingPromo.code}
                  onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none font-mono uppercase font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Offer Title</label>
                <input
                  type="text"
                  required
                  value={editingPromo.title}
                  onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discount Type</label>
                  <select
                    value={editingPromo.discountType}
                    onChange={(e) => setEditingPromo({ ...editingPromo, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none font-bold"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (Rs)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Value</label>
                  <input
                    type="number"
                    required
                    value={editingPromo.discountValue}
                    onChange={(e) => setEditingPromo({ ...editingPromo, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Minimum Order Amount (PKR)</label>
                <input
                  type="number"
                  value={editingPromo.minOrderAmount || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, minOrderAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
              >
                Save Coupon
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
