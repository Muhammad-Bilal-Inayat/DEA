import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, Package, Truck, CheckCircle2, Clock, 
  MapPin, Phone, MessageSquare, AlertCircle, ChevronRight, ShieldCheck 
} from 'lucide-react';
import { dbOnlineOrders } from '../../lib/db';
import { OnlineOrder, OnlineOrderStatus } from '../../types';
import { useStore } from './StoreContext';

const STATUS_STEPS: { status: OnlineOrderStatus; label: string; desc: string }[] = [
  { status: 'New', label: 'Order Placed', desc: 'Order received in pharmacy system' },
  { status: 'Confirmed', label: 'Confirmed', desc: 'Prescription & inventory verified' },
  { status: 'Processing', label: 'Packed', desc: 'Packed in protective cold packaging' },
  { status: 'Dispatched', label: 'On the Way', desc: 'Handed over to delivery rider' },
  { status: 'Delivered', label: 'Delivered', desc: 'Successfully handed over to customer' }
];

export const StoreOrderTracking: React.FC = () => {
  const location = useLocation();
  const { settings } = useStore();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [order, setOrder] = useState<OnlineOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderNum = params.get('order');
    if (orderNum) {
      setQuery(orderNum);
      handleSearch(orderNum);
    }
  }, [location.search]);

  const handleSearch = async (searchQuery?: string) => {
    const target = (searchQuery || query).trim();
    if (!target) return;

    setIsSearching(true);
    setError('');
    setOrder(null);

    try {
      const allOrders = await dbOnlineOrders.getAll();
      const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');

      const found = allOrders.find(o => 
        o.orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanTarget) ||
        o.customer.phone.replace(/[^0-9]/g, '').includes(cleanTarget)
      );

      if (found) {
        setOrder(found);
      } else {
        setError(`No order found matching "${target}". Please check your order ID or phone number.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Error looking up order.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStepStatus = (stepIndex: number, currentStatus: OnlineOrderStatus) => {
    const orderIndex = STATUS_STEPS.findIndex(s => s.status === currentStatus);
    if (currentStatus === 'Cancelled') return 'cancelled';
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to="/store" className="hover:text-emerald-700 transition">Store</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Track Order</span>
      </nav>

      {/* Header & Search */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Track Your Medicine Order</h1>
          <p className="text-xs text-slate-500 mt-1">Enter your Order Number (e.g. ORD-2026-1001) or Registered Phone Number</p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }} 
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="e.g. ORD-2026-1001 or 03001234567"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {isSearching ? <Clock className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            <span>Track Order</span>
          </button>
        </form>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tracked Order Result */}
      {order && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-8 shadow-xs">
          
          {/* Top Order Status Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 font-mono">#{order.orderNumber}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  order.status === 'Delivered' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : order.status === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {new Date(order.orderDate).toLocaleDateString()} at {new Date(order.orderDate).toLocaleTimeString()}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block uppercase font-bold">Total Amount</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                Rs. {order.grandTotal.toLocaleString()}
              </span>
              <span className="block text-[11px] text-slate-500">
                Payment: {order.paymentMethod} ({order.paymentStatus})
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          {order.status !== 'Cancelled' ? (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Delivery Status Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepStatus(idx, order.status);
                  return (
                    <div 
                      key={step.status}
                      className={`p-3.5 rounded-2xl border transition ${
                        state === 'completed' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                          : state === 'current'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                            : 'bg-slate-50 border-slate-200/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {state === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : state === 'current' ? (
                          <Truck className="w-4 h-4 text-white animate-pulse" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-xs font-bold">{step.label}</span>
                      </div>
                      <p className={`text-[10.5px] mt-1 line-clamp-2 ${state === 'current' ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {step.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              This order was cancelled. Please contact pharmacy support if this was an error.
            </div>
          )}

          {/* Courier / Dispatch Info if available */}
          {(order.trackingNumber || order.riderName) && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Courier & Rider Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {order.trackingNumber && (
                  <div>
                    <span className="text-slate-400 text-[10.5px]">Courier / Tracking Number:</span>
                    <p className="font-mono font-bold text-slate-800">{order.trackingNumber}</p>
                  </div>
                )}
                {order.riderName && (
                  <div>
                    <span className="text-slate-400 text-[10.5px]">Assigned Delivery Rider:</span>
                    <p className="font-bold text-slate-800">{order.riderName}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer & Address Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recipient Details</span>
              <p className="font-bold text-slate-900">{order.customer.name}</p>
              <p className="text-slate-600">{order.customer.phone}</p>
              {order.customer.email && <p className="text-slate-500">{order.customer.email}</p>}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery Destination</span>
              <p className="text-slate-700">{order.customer.address}</p>
              <p className="font-bold text-slate-900">{order.customer.city}</p>
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Package Contents ({order.items.length} items)</h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10.5px] text-slate-400">Qty: {item.quantity} × Rs. {item.price.toLocaleString()}</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {item.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Support CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Questions regarding dispatch? Our pharmacy team is available 24/7.</span>
            </div>

            <a
              href={`https://wa.me/${(settings.whatsappNumber || '923001234567').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, inquiring about Order #${order.orderNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inquire via WhatsApp</span>
            </a>
          </div>

        </div>
      )}

    </div>
  );
};
