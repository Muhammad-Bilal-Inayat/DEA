import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, ShieldCheck, Truck, Clock, Plus, Minus, 
  Check, ArrowRight, Share2, AlertCircle, ChevronRight,
  Package, Calendar, Tag, Info, Heart
} from 'lucide-react';
import { useStore } from './StoreContext';
import { getEffectiveOnlinePrice, getCompareAtPrice, getEffectiveOnlineStock } from '../../lib/storeManager';
import { Medicine } from '../../types';

export const StoreProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { publishedMedicines, addToCart, setIsCartDrawerOpen, settings } = useStore();
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const product = useMemo(() => {
    return publishedMedicines.find(m => m.id === id);
  }, [publishedMedicines, id]);

  const price = product ? getEffectiveOnlinePrice(product) : 0;
  const comparePrice = product ? getCompareAtPrice(product) : undefined;
  const stock = product ? getEffectiveOnlineStock(product) : 0;

  // Related products in same category
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const cat = product.onlineCategory || product.category;
    return publishedMedicines
      .filter(m => m.id !== product.id && (m.onlineCategory || m.category) === cat)
      .slice(0, 4);
  }, [publishedMedicines, product]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This product might be temporarily unpublished or out of stock.
        </p>
        <Link
          to="/store/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
        >
          <span>Return to Storefront</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    const res = addToCart(product, quantity);
    if (res.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    const res = addToCart(product, quantity);
    if (res.success) {
      navigate('/store/checkout');
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const images = (product.onlineImages && product.onlineImages.length > 0) 
    ? product.onlineImages 
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link to="/store" className="hover:text-emerald-700 transition">Store</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to="/store/products" className="hover:text-emerald-700 transition">Catalog</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link 
          to={`/store/products?category=${encodeURIComponent(product.onlineCategory || product.category)}`}
          className="hover:text-emerald-700 transition"
        >
          {product.onlineCategory || product.category}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.onlineName || product.name}</span>
      </nav>

      {/* Main Product Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left: Product Images Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center justify-center h-80 sm:h-96 relative overflow-hidden shadow-xs">
            {images.length > 0 ? (
              <img
                src={images[activeImageIdx] || images[0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center p-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <ShoppingBag className="w-12 h-12" />
                </div>
                <p className="text-xs font-mono font-bold text-slate-400 mt-3 uppercase tracking-wider">
                  {product.name}
                </p>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
              {comparePrice && comparePrice > price && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  SAVE {Math.round(((comparePrice - price) / comparePrice) * 100)}%
                </span>
              )}
              {product.onlineBadge && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  {product.onlineBadge}
                </span>
              )}
              {product.isFeatured && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  POPULAR
                </span>
              )}
            </div>

            <button
              onClick={handleShare}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              title="Share product link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnail row if multiple images exist */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl border-2 overflow-hidden bg-white flex-shrink-0 transition cursor-pointer ${
                    activeImageIdx === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {copiedLink && (
            <p className="text-xs text-emerald-700 font-bold text-center">
              ✓ Product link copied to clipboard!
            </p>
          )}
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-wider border border-emerald-200">
                {product.onlineCategory || product.category || 'General'}
              </span>
              {product.packSize && (
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                  {product.packSize}
                </span>
              )}
              {product.dosageForm && (
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                  {product.dosageForm}
                </span>
              )}
              {product.requiresPrescription && (
                <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-2xs">
                  Rx Prescription Required
                </span>
              )}
              {product.coldChain && (
                <span className="px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-800 text-[11px] font-bold">
                  ❄ Cold Storage (2-8°C)
                </span>
              )}
              {stock > 0 ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>In Stock ({stock} available)</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Out of Stock</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              {product.onlineName || product.name}
            </h1>

            {product.genericName && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Active Formulation / Salt: <span className="font-bold text-slate-800">{product.genericName}</span>
              </p>
            )}

            {product.manufacturer && (
              <p className="text-xs text-slate-500">
                Manufactured by: <span className="font-semibold text-slate-700">{product.manufacturer}</span>
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                Rs. {price.toLocaleString()}
              </span>
              {comparePrice && comparePrice > price && (
                <span className="text-base text-slate-400 font-mono line-through">
                  Rs. {comparePrice.toLocaleString()}
                </span>
              )}
              <span className="text-xs font-bold text-slate-500">
                / {product.unit || 'Unit'}
              </span>
            </div>

            {comparePrice && comparePrice > price && (
              <p className="text-xs text-emerald-700 font-semibold">
                You save Rs. {(comparePrice - price).toLocaleString()} ({Math.round(((comparePrice - price) / comparePrice) * 100)}% discount)
              </p>
            )}
          </div>

          {/* Quantity & Add to Cart Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 transition"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 py-1 text-sm font-mono font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(stock > 0 ? stock : 99, quantity + 1))}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 transition"
                  disabled={quantity >= stock}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: <strong>Rs. {(price * quantity).toLocaleString()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-700 text-white'
                    : stock > 0
                      ? 'bg-slate-900 hover:bg-emerald-700 text-white active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={stock <= 0}
                className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                  stock > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Instant Buy Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delivery & Assurance Strip */}
          <div className="border-t border-slate-200 pt-5 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold">Fast Express Delivery</strong>
                <span className="text-[11px] text-slate-500">Free above Rs. {settings.freeDeliveryThreshold || 2500}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold">100% Genuine Medicine</strong>
                <span className="text-[11px] text-slate-500">DRAP certified pharmacy source</span>
              </div>
            </div>
          </div>

          {/* Description & Clinical Info */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Product Description & Details</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {product.onlineDescription || product.description || product.notes || 'High quality pharmaceutical grade formulation produced under strict cGMP standards. For dosage guidance, refer to your attending physician.'}
            </p>

            {/* Spec Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
              <div className="grid grid-cols-2 py-1 border-b border-slate-100">
                <span className="text-slate-500">Unit Packing</span>
                <span className="font-bold text-slate-800">{product.unit || 'PCS'} {product.packSize ? `(${product.packSize})` : ''}</span>
              </div>
              {product.batchNumber && (
                <div className="grid grid-cols-2 py-1 border-b border-slate-100">
                  <span className="text-slate-500">Active Batch Number</span>
                  <span className="font-mono font-bold text-slate-800">{product.batchNumber}</span>
                </div>
              )}
              {product.expiryDate && (
                <div className="grid grid-cols-2 py-1 border-b border-slate-100">
                  <span className="text-slate-500">Expiry Date</span>
                  <span className="font-mono font-bold text-slate-800">{new Date(product.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
              {product.barcode && (
                <div className="grid grid-cols-2 py-1">
                  <span className="text-slate-500">Product Barcode (GTIN)</span>
                  <span className="font-mono text-slate-800">{product.barcode}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <section className="pt-10 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Related Products</h2>
              <p className="text-xs text-slate-500">Other items in {product.onlineCategory || product.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => {
              const relPrice = getEffectiveOnlinePrice(rel);
              return (
                <Link
                  key={rel.id}
                  to={`/store/product/${rel.id}`}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition space-y-2 group"
                >
                  <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                    {rel.onlineImages && rel.onlineImages[0] ? (
                      <img src={rel.onlineImages[0]} alt={rel.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition">
                    {rel.onlineName || rel.name}
                  </h4>
                  <p className="text-xs font-black text-slate-900 font-mono">
                    Rs. {relPrice.toLocaleString()}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
