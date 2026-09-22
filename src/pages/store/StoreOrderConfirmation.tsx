import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, ShoppingBag, Truck, Phone, MessageSquare, 
  Printer, ArrowRight, Package, MapPin, Calendar, Clock, ShieldCheck 
} from 'lucide-react';
import { OnlineOrder } from '../../types';
import { dbOnlineOrders } from '../../lib/db';
import { useStore } from './StoreContext';

export const StoreOrderConfirmation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { settings } = useStore();

  const [order, setOrder] = useState<OnlineOrder | null>(
    (location.state as any)?.order || null
  );
  const [loading, setLoading] = useState(!order);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!order && id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dbOnlineOrders.getById(id).then((found) => {
        if (found) setOrder(found);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }
  }, [id, order]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold">Loading order receipt...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <p className="text-xs text-slate-500">We couldn't retrieve the details for this order number.</p>
        <Link
          to="/store"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  const whatsappMessage = `Hello MBI Pharmacy, I placed Order #${order.orderNumber} for Rs. ${order.grandTotal.toLocaleString()}. Customer: ${order.customer.name}, Phone: ${order.customer.phone}. Please confirm dispatch!`;
  const whatsappUrl = `https://wa.me/${(settings.whatsappNumber || '923001234567').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/25 animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Order Placed Successfully!</h1>
        <p className="text-xs sm:text-sm text-emerald-900 max-w-md mx-auto">
          Thank you for choosing <strong>{settings.storeName}</strong>. Your order has been registered and inventory reserved.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <span className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-slate-900 font-mono font-black text-sm shadow-xs">
            Order #: {order.orderNumber}
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
            Status: {order.status}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Confirm on WhatsApp</span>
        </a>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipt</span>
        </button>

        <Link
          to={`/store/track?order=${order.orderNumber}`}
          className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
        >
          <Truck className="w-4 h-4" />
          <span>Live Tracking</span>
        </Link>
      </div>

      {/* Order Details Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6 shadow-xs print:shadow-none print:border-none">
        
        {/* Receipt Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{settings.storeName}</h3>
            <p className="text-[11px] text-slate-500">{settings.address}, {settings.city}</p>
            <p className="text-[11px] text-slate-500">Helpline: {settings.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 uppercase font-bold">Order Date</p>
            <p className="text-xs font-mono font-bold text-slate-800">
              {new Date(order.orderDate).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Customer & Shipping Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="space-y-1">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Deliver To</span>
            <p className="font-bold text-slate-900">{order.customer.name}</p>
            <p className="text-slate-600">{order.customer.address}</p>
            <p className="text-slate-600">{order.customer.city} {order.customer.areaOrLandmark ? `(${order.customer.areaOrLandmark})` : ''}</p>
            <p className="font-mono text-slate-700 font-semibold">{order.customer.phone}</p>
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Payment Details</span>
            <p className="font-bold text-slate-900">{order.paymentMethod}</p>
            <p className="text-slate-600">
              Payment Status: <strong className={order.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-600'}>{order.paymentStatus}</strong>
            </p>
            {order.notes && (
              <p className="text-slate-500 italic mt-1">Note: "{order.notes}"</p>
            )}
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Ordered Products</h4>
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 flex-1 pr-3">
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10.5px] text-slate-400">
                    {item.category} • Qty: {item.quantity} × Rs. {item.price.toLocaleString()}
                  </p>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  Rs. {item.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 max-w-xs ml-auto">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-slate-800">Rs. {order.subTotal.toLocaleString()}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span className="font-mono">-Rs. {order.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Delivery Charges</span>
            <span className="font-mono font-bold">
              {order.deliveryCharges === 0 ? 'FREE' : `Rs. ${order.deliveryCharges}`}
            </span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Grand Total</span>
            <span className="font-mono text-emerald-700 text-base">Rs. {order.grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* DRAP Footer Guarantee */}
        <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>DRAP Verified Authentic Pharmaceutical Distribution</span>
        </div>

      </div>

      <div className="text-center pt-4">
        <Link
          to="/store/products"
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          ← Continue Shopping More Medicines
        </Link>
      </div>

    </div>
  );
};
