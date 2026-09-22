import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Truck, CreditCard, Banknote, Building2, 
  CheckCircle2, ArrowRight, AlertCircle, ShoppingBag, 
  MapPin, Phone, Mail, User, FileText, ChevronRight
} from 'lucide-react';
import { useStore } from './StoreContext';
import { placeOnlineOrder } from '../../lib/storeManager';

const MAJOR_PAK_CITIES = [
  'Islamabad',
  'Rawalpindi',
  'Lahore',
  'Karachi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Bahawalpur',
  'Sargodha',
  'Abbottabad',
  'Other City'
];

export const StoreCheckout: React.FC = () => {
  const { 
    cart, 
    cartCount, 
    cartSubtotal, 
    cartDiscount, 
    deliveryCharges, 
    cartGrandTotal, 
    appliedCoupon,
    clearCart,
    settings 
  } = useStore();

  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Islamabad');
  const [areaOrLandmark, setAreaOrLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Bank Transfer' | 'Card / Raast'>('Cash on Delivery');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Your cart is empty</h2>
        <p className="text-xs text-slate-500">Please add items to your cart before proceeding to checkout.</p>
        <Link
          to="/store/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <span>Return to Catalog</span>
        </Link>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMessage('Please enter a valid Pakistani phone/mobile number (e.g. 03001234567).');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Please provide your complete delivery street address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await placeOnlineOrder({
        customer: {
          name,
          phone,
          email,
          address,
          city,
          areaOrLandmark,
          notes
        },
        cartItems: cart.map(item => ({
          medicine: item.medicine,
          quantity: item.quantity
        })),
        deliveryCharges,
        couponCode: appliedCoupon || undefined,
        discountAmount: cartDiscount,
        paymentMethod
      });

      if (result.success && result.order) {
        clearCart();
        navigate(`/store/order-success/${result.order.id}`, { state: { order: result.order } });
      } else {
        setErrorMessage(result.error || 'Could not place order. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to="/store" className="hover:text-emerald-700 transition">Store</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/store/cart" className="hover:text-emerald-700 transition">Cart</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Checkout</span>
      </nav>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Express Checkout</h1>
        <p className="text-xs text-slate-500 mt-0.5">Please provide delivery address and confirm payment method</p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Contact Details Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">1. Customer Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Shahzad Rafiq"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone / WhatsApp Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">2. Delivery Address</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                >
                  {MAJOR_PAK_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Area / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Sector F-8/3, Near Metro Station"
                  value={areaOrLandmark}
                  onChange={(e) => setAreaOrLandmark(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Complete Street Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="House / Flat / Clinic / Hospital / Ward No., Street Address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Special Delivery Instructions / Cold Box Request (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Call before arrival, handle with cold box packaging..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">3. Payment Method</h3>
            </div>

            <div className="space-y-3">
              <label 
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                  paymentMethod === 'Cash on Delivery' 
                    ? 'border-emerald-600 bg-emerald-50/50' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={() => setPaymentMethod('Cash on Delivery')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">Cash on Delivery (COD)</strong>
                    <span className="text-[11px] text-slate-500">Pay cash in hand when rider delivers your medicine parcel</span>
                  </div>
                </div>
                <Banknote className="w-5 h-5 text-emerald-700" />
              </label>

              <label 
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                  paymentMethod === 'Bank Transfer' 
                    ? 'border-emerald-600 bg-emerald-50/50' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Bank Transfer'}
                    onChange={() => setPaymentMethod('Bank Transfer')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">Raast / Online Bank Transfer</strong>
                    <span className="text-[11px] text-slate-500">Instant transfer via Raast ID / Meezan Bank / HBL</span>
                  </div>
                </div>
                <Building2 className="w-5 h-5 text-emerald-700" />
              </label>

              <label 
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                  paymentMethod === 'Card / Raast' 
                    ? 'border-emerald-600 bg-emerald-50/50' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Card / Raast'}
                    onChange={() => setPaymentMethod('Card / Raast')}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">Credit / Debit Card</strong>
                    <span className="text-[11px] text-slate-500">Visa / MasterCard / PayPak processed securely</span>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-emerald-700" />
              </label>
            </div>
          </div>

        </div>

        {/* Right: Order Summary Review & Final CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 sticky top-24">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Review Items ({cartCount})</h3>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2">
              {cart.map((item) => (
                <div key={item.medicine.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-slate-900 truncate">{item.medicine.onlineName || item.medicine.name}</p>
                    <p className="text-[10px] text-slate-400">Qty: {item.quantity} × Rs. {item.unitPrice.toLocaleString()}</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {item.lineTotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-800">Rs. {cartSubtotal.toLocaleString()}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon ({appliedCoupon})</span>
                  <span className="font-mono">-Rs. {cartDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-mono font-bold">
                  {deliveryCharges === 0 ? (
                    <strong className="text-emerald-600 uppercase text-[11px]">FREE</strong>
                  ) : (
                    `Rs. ${deliveryCharges}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Total Payable</span>
                <span className="font-mono text-emerald-700 text-lg">Rs. {cartGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Confirming Order & Syncing Stock...</span>
              ) : (
                <>
                  <span>Place Order (Rs. {cartGrandTotal.toLocaleString()})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              <p className="flex items-center justify-center gap-1.5 text-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Risk • DRAP Licensed Pharmacy Partner</span>
              </p>
              <p>By placing this order you accept delivery verification and pharmacy dispatch terms.</p>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};
