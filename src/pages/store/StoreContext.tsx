import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Medicine, OnlineStoreSettings, StorePromotion, OnlineOrder } from '../../types';
import { dbMedicines, dbOnlineOrders } from '../../lib/db';
import { SERVER_DUMMY_STORE_PRODUCTS } from '../../lib/dummyStoreProducts';
import { 
  getStoreSettings, 
  saveStoreSettings, 
  ensurePromotions, 
  evaluateCoupon, 
  getLocalCart, 
  saveLocalCart, 
  clearLocalCart, 
  getEffectiveOnlinePrice, 
  getEffectiveOnlineStock, 
  isMedicineOnlineVisible,
  placeOnlineOrder
} from '../../lib/storeManager';

export interface CartLineItem {
  medicine: Medicine;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface StoreContextType {
  settings: OnlineStoreSettings;
  updateSettings: (newSettings: OnlineStoreSettings) => Promise<void>;
  medicines: Medicine[];
  publishedMedicines: Medicine[];
  featuredMedicines: Medicine[];
  categories: string[];
  isLoading: boolean;
  refreshStoreData: () => Promise<void>;
  
  // Cart
  cart: CartLineItem[];
  cartCount: number;
  cartSubtotal: number;
  cartDiscount: number;
  deliveryCharges: number;
  freeDeliveryThreshold: number;
  freeDeliveryRemaining: number;
  cartGrandTotal: number;
  appliedCoupon: string;
  couponMessage: string;
  addToCart: (medicine: Medicine, qty?: number) => { success: boolean; message: string };
  updateCartQuantity: (medicineId: string, qty: number) => void;
  removeFromCart: (medicineId: string) => void;
  clearCart: () => void;
  applyCouponCode: (code: string) => Promise<{ valid: boolean; message: string }>;
  removeCouponCode: () => void;
  
  // Cart Drawer UI
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  toggleCartDrawer: () => void;
  
  // Search Query
  storeSearchQuery: string;
  setStoreSearchQuery: (query: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OnlineStoreSettings>(() => ({
    id: 'default_store_settings',
    storeName: 'MBI Inventra Pharmacy & Surgical Store',
    storeTagline: 'Certified Healthcare Products & Surgical Supplies Delivered Fast',
    phone: '+92 300 1234567',
    whatsappNumber: '923001234567',
    email: 'store@mbi-inventra.com',
    address: 'Commercial Plaza, Blue Area',
    city: 'Islamabad',
    currency: 'PKR',
    currencySymbol: 'Rs',
    deliveryCharges: 199,
    freeDeliveryThreshold: 2500,
    minOrderAmount: 300,
    isStoreOpen: true,
    allowOrderAcceptance: true,
    allowBackorders: false,
    defaultStockSync: true,
    updatedAt: new Date().toISOString()
  }));

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localCartState, setLocalCartState] = useState<{ medicineId: string; quantity: number }[]>(() => getLocalCart());
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  const refreshStoreData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedSettings, fetchedMeds] = await Promise.all([
        getStoreSettings(),
        dbMedicines.getAll()
      ]);
      setSettings(fetchedSettings);
      setMedicines(fetchedMeds || []);
      setLocalCartState(getLocalCart());
    } catch (err) {
      console.error('Error refreshing store data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStoreData();

    const handleCartSync = () => {
      setLocalCartState(getLocalCart());
    };

    window.addEventListener('mbi_cart_updated', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    window.addEventListener('mbi-data-synced', refreshStoreData);
    window.addEventListener('mbi-medicines-updated', refreshStoreData);
    window.addEventListener('focus', refreshStoreData);

    return () => {
      window.removeEventListener('mbi_cart_updated', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
      window.removeEventListener('mbi-data-synced', refreshStoreData);
      window.removeEventListener('mbi-medicines-updated', refreshStoreData);
      window.removeEventListener('focus', refreshStoreData);
    };
  }, [refreshStoreData]);

  // Published medicines
  const publishedMedicines = React.useMemo(() => {
    return medicines.filter(isMedicineOnlineVisible);
  }, [medicines]);

  // Featured medicines
  const featuredMedicines = React.useMemo(() => {
    return publishedMedicines.filter(m => m.isFeatured);
  }, [publishedMedicines]);

  // Categories list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    publishedMedicines.forEach(m => {
      const cat = m.onlineCategory || m.category;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [publishedMedicines]);

  // Formatted Cart line items
  const cart: CartLineItem[] = React.useMemo(() => {
    const lines: CartLineItem[] = [];
    for (const item of localCartState) {
      const med = medicines.find(m => m.id === item.medicineId);
      if (med) {
        const unitPrice = getEffectiveOnlinePrice(med);
        lines.push({
          medicine: med,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity
        });
      }
    }
    return lines;
  }, [localCartState, medicines]);

  const cartCount = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.lineTotal, 0);
  }, [cart]);

  const deliveryCharges = React.useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (settings.freeDeliveryThreshold && cartSubtotal >= settings.freeDeliveryThreshold) {
      return 0;
    }
    return settings.deliveryCharges || 199;
  }, [cartSubtotal, settings]);

  const freeDeliveryThreshold = settings.freeDeliveryThreshold || 2500;
  const freeDeliveryRemaining = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  const cartDiscount = couponDiscount;
  const cartGrandTotal = Math.max(0, cartSubtotal - cartDiscount + deliveryCharges);

  const addToCart = useCallback((medicine: Medicine, qty: number = 1): { success: boolean; message: string } => {
    const availableStock = getEffectiveOnlineStock(medicine);
    const existing = localCartState.find(item => item.medicineId === medicine.id);
    const currentQty = existing ? existing.quantity : 0;
    const targetQty = currentQty + qty;

    if (availableStock <= 0) {
      return { success: false, message: `"${medicine.name}" is currently Out of Stock.` };
    }

    if (targetQty > availableStock) {
      return { 
        success: false, 
        message: `Only ${availableStock} units of "${medicine.name}" available in stock.` 
      };
    }

    let nextCart: { medicineId: string; quantity: number }[];
    if (existing) {
      nextCart = localCartState.map(i => 
        i.medicineId === medicine.id ? { ...i, quantity: targetQty } : i
      );
    } else {
      nextCart = [...localCartState, { medicineId: medicine.id, quantity: qty }];
    }

    saveLocalCart(nextCart);
    setLocalCartState(nextCart);
    return { success: true, message: `Added ${qty}x "${medicine.name}" to cart.` };
  }, [localCartState]);

  const updateCartQuantity = useCallback((medicineId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(medicineId);
      return;
    }

    const med = medicines.find(m => m.id === medicineId);
    if (med) {
      const availableStock = getEffectiveOnlineStock(med);
      const safeQty = Math.min(qty, availableStock > 0 ? availableStock : qty);

      const nextCart = localCartState.map(item => 
        item.medicineId === medicineId ? { ...item, quantity: safeQty } : item
      );
      saveLocalCart(nextCart);
      setLocalCartState(nextCart);
    }
  }, [localCartState, medicines]);

  const removeFromCart = useCallback((medicineId: string) => {
    const nextCart = localCartState.filter(item => item.medicineId !== medicineId);
    saveLocalCart(nextCart);
    setLocalCartState(nextCart);
  }, [localCartState]);

  const clearCart = useCallback(() => {
    clearLocalCart();
    setLocalCartState([]);
    setAppliedCoupon('');
    setCouponDiscount(0);
    setCouponMessage('');
  }, []);

  const applyCouponCode = useCallback(async (code: string) => {
    const res = await evaluateCoupon(code, cartSubtotal, deliveryCharges);
    if (res.valid) {
      setAppliedCoupon(code.toUpperCase());
      setCouponDiscount(res.discount);
      setCouponMessage(res.message);
      return { valid: true, message: res.message };
    } else {
      setCouponMessage(res.message);
      return { valid: false, message: res.message };
    }
  }, [cartSubtotal, deliveryCharges]);

  const removeCouponCode = useCallback(() => {
    setAppliedCoupon('');
    setCouponDiscount(0);
    setCouponMessage('');
  }, []);

  const updateSettings = useCallback(async (newSettings: OnlineStoreSettings) => {
    const saved = await saveStoreSettings(newSettings);
    setSettings(saved);
  }, []);

  const toggleCartDrawer = useCallback(() => {
    setIsCartDrawerOpen(prev => !prev);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings,
        updateSettings,
        medicines,
        publishedMedicines,
        featuredMedicines,
        categories,
        isLoading,
        refreshStoreData,
        cart,
        cartCount,
        cartSubtotal,
        cartDiscount,
        deliveryCharges,
        freeDeliveryThreshold,
        freeDeliveryRemaining,
        cartGrandTotal,
        appliedCoupon,
        couponMessage,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCouponCode,
        removeCouponCode,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        toggleCartDrawer,
        storeSearchQuery,
        setStoreSearchQuery
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
