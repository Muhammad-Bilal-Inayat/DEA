import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, 
  Tag, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, Truck
} from 'lucide-react';
import { useStore } from './StoreContext';
import { formatCurrency } from '../../lib/utils';
import { getEffectiveOnlineStock } from '../../lib/storeManager';

export const StoreCartDrawer: React.FC = () => {
  const { 
    isCartDrawerOpen, 
    setIsCartDrawerOpen, 
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
    appliedCoupon, 
    couponMessage, 
    applyCouponCode, 
    removeCouponCode,
    settings
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    await applyCouponCode(couponInput);
    setCouponLoading(false);
  };

  const handleProceedCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/store/checkout');
  };

  const freeProgress = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Shopping Cart</h2>
                <p className="text-[11px] text-slate-500">{cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Bar */}
          {cart.length > 0 && (
            <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100">
              {freeDeliveryRemaining > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11.5px] text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Add <strong>Rs. {freeDeliveryRemaining.toLocaleString()}</strong> more for <strong>FREE Delivery!</strong></span>
                  </p>
                  <div className="w-full bg-emerald-200/70 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${freeProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11.5px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Congratulations! You qualified for <strong>FREE Delivery</strong></span>
                </p>
              )}
            </div>
          )}

          {/* Items Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Your cart is currently empty</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    Browse our certified pharmacy catalog and add genuine medical products.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/store/products');
                  }}
                  className="mt-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  Browse Store Catalog
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const stock = getEffectiveOnlineStock(item.medicine);
                return (
                  <div 
                    key={item.medicine.id}
                    className="flex gap-3 pb-4 border-b border-slate-100 group"
                  >
                    {/* Item Image / Fallback */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.medicine.onlineImages && item.medicine.onlineImages[0] ? (
                        <img 
                          src={item.medicine.onlineImages[0]} 
                          alt={item.medicine.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-lg font-black text-slate-400 font-mono">
                          {item.medicine.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <Link
                            to={`/store/product/${item.medicine.id}`}
                            onClick={() => setIsCartDrawerOpen(false)}
                            className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition line-clamp-1"
                          >
                            {item.medicine.onlineName || item.medicine.name}
                          </Link>
                          <button
                            onClick={() => removeFromCart(item.medicine.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 transition flex-shrink-0"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{item.medicine.category || 'General'}</span>
                          {item.medicine.unit && <span>• {item.medicine.unit}</span>}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            onClick={() => updateCartQuantity(item.medicine.id, item.quantity - 1)}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.medicine.id, item.quantity + 1)}
                            disabled={item.quantity >= stock}
                            className="px-2 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900 font-mono">
                            Rs. {item.lineTotal.toLocaleString()}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Rs. {item.unitPrice} each
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/70 space-y-3.5">
              
              {/* Coupon Form */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon: {appliedCoupon}</span>
                    <span className="text-[11px] font-normal text-emerald-700">(-Rs. {cartDiscount})</span>
                  </div>
                  <button 
                    onClick={removeCouponCode}
                    className="text-rose-600 hover:underline text-[11px] font-bold"
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
                      placeholder="Promo / Coupon Code (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
              )}

              {couponMessage && !appliedCoupon && (
                <p className="text-[11px] text-rose-600 font-medium">{couponMessage}</p>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-slate-800">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-Rs. {cartDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span className="font-mono font-semibold">
                    {deliveryCharges === 0 ? (
                      <strong className="text-emerald-600 uppercase text-[11px]">FREE</strong>
                    ) : (
                      `Rs. ${deliveryCharges}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="font-mono text-base text-emerald-700">Rs. {cartGrandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleProceedCheckout}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/store/cart');
                  }}
                  className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
                >
                  View Full Cart & Review
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Genuine Pharmacy Guarantee • DRAP Verified</span>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
