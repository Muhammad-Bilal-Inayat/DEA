import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Plus, Minus, Trash2, ArrowRight, 
  Tag, Truck, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';
import { useStore } from './StoreContext';
import { getEffectiveOnlineStock } from '../../lib/storeManager';

export const StoreCart: React.FC = () => {
  const { 
    cart, 
    cartCount, 
    cartSubtotal, 
    cartDiscount, 
    deliveryCharges, 
    freeDeliveryThreshold, 
    freeDeliveryRemaining, 
    cartGrandTotal, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart,
    appliedCoupon, 
    couponMessage, 
    applyCouponCode, 
    removeCouponCode,
    settings 
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    await applyCouponCode(couponInput);
    setCouponLoading(false);
  };

  const freeProgress = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Your Shopping Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Browse our certified pharmacy catalog and add genuine medicines and surgical items.
        </p>
        <Link
          to="/store/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <span>Explore Store Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to="/store" className="hover:text-emerald-700 transition">Store</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Shopping Cart</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-slate-500 mt-0.5">{cartCount} items selected for purchase</p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Free Delivery Bar */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        {freeDeliveryRemaining > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Add <strong>Rs. {freeDeliveryRemaining.toLocaleString()}</strong> more to unlock <strong>FREE Delivery!</strong></span>
              </span>
              <span className="font-mono">{freeProgress}%</span>
            </div>
            <div className="w-full bg-emerald-200/70 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${freeProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-emerald-900 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>You have unlocked <strong>FREE Delivery</strong> on this order!</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 hidden sm:grid sm:grid-cols-12 text-[11px] font-black uppercase tracking-wider text-slate-400">
            <div className="col-span-6">Product</div>
            <div className="col-span-2 text-center">Price</div>
            <div className="col-span-2 text-center">Quantity</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          <div className="divide-y divide-slate-100">
            {cart.map((item) => {
              const stock = getEffectiveOnlineStock(item.medicine);
              return (
                <div key={item.medicine.id} className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center">
                  
                  {/* Product Info */}
                  <div className="col-span-6 flex items-center gap-3 w-full">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.medicine.onlineImages && item.medicine.onlineImages[0] ? (
                        <img src={item.medicine.onlineImages[0]} alt={item.medicine.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {item.medicine.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/store/product/${item.medicine.id}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition block truncate"
                      >
                        {item.medicine.onlineName || item.medicine.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.medicine.category || 'General'} • {item.medicine.unit || 'PCS'}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-[10.5px] font-semibold text-rose-600 hover:underline flex items-center gap-1 mt-1 sm:hidden"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-center hidden sm:block">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      Rs. {item.unitPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2 flex items-center justify-between sm:justify-center w-full sm:w-auto">
                    <span className="text-xs text-slate-500 sm:hidden">Quantity:</span>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateCartQuantity(item.medicine.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 text-xs font-mono font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.medicine.id, item.quantity + 1)}
                        disabled={item.quantity >= stock}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="col-span-2 flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                    <span className="text-xs text-slate-500 sm:hidden">Item Total:</span>
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                        Rs. {item.lineTotal.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.medicine.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition hidden sm:block"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/store/products" className="font-bold text-emerald-700 hover:underline">
              ← Continue Shopping
            </Link>
            <span className="text-slate-500">
              Subtotal ({cartCount} items): <strong className="text-slate-900 font-mono">Rs. {cartSubtotal.toLocaleString()}</strong>
            </span>
          </div>

        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Order Summary</h3>

            {/* Coupon Box */}
            {appliedCoupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Coupon: {appliedCoupon}</span>
                </div>
                <button
                  onClick={removeCouponCode}
                  className="text-rose-600 font-bold hover:underline text-[11px]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Coupon Code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Apply
                </button>
              </form>
            )}

            {couponMessage && !appliedCoupon && (
              <p className="text-[11px] text-rose-600">{couponMessage}</p>
            )}

            {/* Breakdown */}
            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-slate-800">Rs. {cartSubtotal.toLocaleString()}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-Rs. {cartDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-mono font-bold">
                  {deliveryCharges === 0 ? (
                    <strong className="text-emerald-600 uppercase text-[11px]">FREE</strong>
                  ) : (
                    `Rs. ${deliveryCharges}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Estimated Total</span>
                <span className="font-mono text-emerald-700">Rs. {cartGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/store/checkout')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>DRAP Regulated • Genuine Pharmacy Stock</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
