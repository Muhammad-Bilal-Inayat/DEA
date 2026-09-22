import { v4 as uuidv4 } from 'uuid';
import { 
  Medicine, 
  OnlineOrder, 
  OnlineOrderItem, 
  OnlineOrderStatus, 
  OnlineStoreSettings, 
  StorePromotion, 
  CartItem, 
  Invoice, 
  InvoiceItem, 
  Supplier, 
  AuditLog 
} from '../types';
import { 
  dbMedicines, 
  dbOnlineOrders, 
  dbOnlinePromotions, 
  dbStoreSettings, 
  dbInvoices, 
  dbSuppliers, 
  dbAuditLogs 
} from './db';

export function getInitialUserStoreSettings(): OnlineStoreSettings {
  let businessName = '';
  let businessPhone = '';
  let businessEmail = '';
  let businessAddress = '';
  let businessCity = '';

  if (typeof window !== 'undefined') {
    try {
      const rawBiz = localStorage.getItem('mock_business');
      if (rawBiz) {
        const b = JSON.parse(rawBiz);
        if (b.name) businessName = b.name;
        if (b.phone) businessPhone = b.phone;
        if (b.email) businessEmail = b.email;
        if (b.address) businessAddress = b.address;
        if (b.city) businessCity = b.city;
      }
    } catch (e) {}

    try {
      const rawTenant = localStorage.getItem('mbi_active_tenant_cache');
      if (rawTenant) {
        const t = JSON.parse(rawTenant);
        if (!businessName && t.name) businessName = t.name;
        if (!businessPhone && t.ownerPhone) businessPhone = t.ownerPhone;
        if (!businessEmail && t.ownerEmail) businessEmail = t.ownerEmail;
        if (!businessAddress && t.address) businessAddress = t.address;
        if (!businessCity && t.city) businessCity = t.city;
      }
    } catch (e) {}
  }

  const finalName = businessName || 'My Pharmacy & Surgical Store';
  const finalPhone = businessPhone || '';
  const finalEmail = businessEmail || '';
  const finalAddress = businessAddress || '';
  const finalCity = businessCity || 'Pakistan';
  const cleanWa = finalPhone.replace(/[^0-9]/g, '');

  return {
    id: 'default_store_settings',
    storeName: finalName,
    storeTagline: `${finalName} - Certified Healthcare Products & Pharmaceuticals`,
    logo: '',
    bannerImage: '',
    announcementText: `⚡ Welcome to ${finalName}! Order online for fast delivery.`,
    phone: finalPhone,
    whatsappNumber: cleanWa,
    email: finalEmail,
    address: finalAddress,
    city: finalCity,
    currency: 'PKR',
    currencySymbol: 'Rs',
    deliveryCharges: 199,
    freeDeliveryThreshold: 2500,
    minOrderAmount: 300,
    isStoreOpen: true,
    allowOrderAcceptance: true,
    allowBackorders: false,
    defaultStockSync: true,
    pharmacyLicenseNotice: 'Licensed Pharmacy & DRAP Authorized Distributor.',
    prescriptionRequiredNotice: 'Prescription required for scheduled prescription drugs upon delivery verification.',
    socialLinks: {
      facebook: '',
      instagram: '',
      whatsapp: cleanWa ? `https://wa.me/${cleanWa}` : ''
    },
    featuredCategories: [
      'Surgical Items',
      'Syringes',
      'IV Infusions',
      'Diagnostic Devices',
      'General Medicines',
      'Bandages & Dressing'
    ],
    updatedAt: new Date().toISOString()
  };
}

export const DEFAULT_STORE_SETTINGS: OnlineStoreSettings = getInitialUserStoreSettings();

export const DEFAULT_PROMOTIONS: StorePromotion[] = [
  {
    id: 'promo-welcome10',
    code: 'WELCOME10',
    title: 'New Customer Special',
    description: 'Get 10% OFF on your first healthcare order',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderAmount: 1000,
    maxDiscount: 500,
    isActive: true,
    usageCount: 14,
    usageLimit: 500,
    createdAt: new Date().toISOString()
  },
  {
    id: 'promo-freeship',
    code: 'FREESHIP',
    title: 'Free Delivery Special',
    description: 'Enjoy zero delivery fee on orders above Rs. 1,500',
    discountType: 'FIXED_AMOUNT',
    discountValue: 199,
    minOrderAmount: 1500,
    isActive: true,
    usageCount: 32,
    usageLimit: 1000,
    createdAt: new Date().toISOString()
  },
  {
    id: 'promo-mbi50',
    code: 'MBI50',
    title: 'Flat Rs. 50 Discount',
    description: 'Flat Rs. 50 off on essential surgical supplies',
    discountType: 'FIXED_AMOUNT',
    discountValue: 50,
    minOrderAmount: 800,
    isActive: true,
    usageCount: 9,
    usageLimit: 200,
    createdAt: new Date().toISOString()
  }
];

/**
 * Calculates the effective unit price for online storefront display and checkout.
 * If useMainSalePrice is true or onlinePrice is undefined/0, it falls back to sellingPrice or mrp.
 */
export function getEffectiveOnlinePrice(medicine: Medicine): number {
  if (medicine.useMainSalePrice === false && typeof medicine.onlinePrice === 'number' && medicine.onlinePrice > 0) {
    return medicine.onlinePrice;
  }
  return medicine.sellingPrice || medicine.mrp || 0;
}

/**
 * Returns compare-at (strikethrough) original price if discount exists
 */
export function getCompareAtPrice(medicine: Medicine): number | undefined {
  if (medicine.compareAtPrice && medicine.compareAtPrice > getEffectiveOnlinePrice(medicine)) {
    return medicine.compareAtPrice;
  }
  if (medicine.mrp && medicine.mrp > getEffectiveOnlinePrice(medicine)) {
    return medicine.mrp;
  }
  return undefined;
}

/**
 * Calculates effective available stock for the online store.
 */
export function getEffectiveOnlineStock(medicine: Medicine): number {
  if (medicine.onlineStockManagement === 'MANUAL') {
    return Math.max(0, medicine.manualOnlineStock ?? 0);
  }
  return Math.max(0, medicine.quantity || 0);
}

/**
 * Checks whether a product is eligible and visible on the public storefront.
 */
export function isMedicineOnlineVisible(medicine: Medicine): boolean {
  // If explicitly hidden via either flag
  if (medicine.showInOnlineStore === false) return false;
  if (medicine.showOnline === false) return false;
  if (medicine.onlineStatus === 'Hidden' || medicine.onlineStatus === 'Draft') return false;
  if (medicine.stockStatus === 'Quarantined' || medicine.stockStatus === 'Recalled') return false;
  if (medicine.onlineSaleAllowed === false) return false;
  return true;
}

/**
 * Synchronizes and publishes all available inventory products to the Online Storefront.
 */
export async function syncAllProductsToOnlineStore(options?: {
  publishAll?: boolean;
  selectedIds?: string[];
}): Promise<{ total: number; updated: number; published: number }> {
  const allMeds = await dbMedicines.getAll();
  if (!allMeds || allMeds.length === 0) {
    return { total: 0, updated: 0, published: 0 };
  }

  let updatedCount = 0;
  let publishedCount = 0;

  for (const med of allMeds) {
    if (options?.selectedIds && !options.selectedIds.includes(med.id)) {
      continue;
    }

    // Skip quarantined or recalled items
    if (med.stockStatus === 'Quarantined' || med.stockStatus === 'Recalled') {
      continue;
    }

    let changed = false;
    const medCopy: Medicine = { ...med };
    const shouldPublish = options?.publishAll !== false;

    if (shouldPublish) {
      if (medCopy.showOnline !== true) {
        medCopy.showOnline = true;
        changed = true;
      }
      if (medCopy.showInOnlineStore !== true) {
        medCopy.showInOnlineStore = true;
        changed = true;
      }
      if (medCopy.onlineStatus !== 'Published') {
        medCopy.onlineStatus = 'Published';
        changed = true;
      }
      if (medCopy.onlineSaleAllowed !== true) {
        medCopy.onlineSaleAllowed = true;
        changed = true;
      }
    }

    if (!medCopy.onlineCategory && medCopy.category) {
      medCopy.onlineCategory = medCopy.category;
      changed = true;
    }

    if (!medCopy.onlineName && medCopy.name) {
      medCopy.onlineName = medCopy.name;
      changed = true;
    }

    if (changed) {
      medCopy.updatedAt = new Date().toISOString();
      await dbMedicines.save(medCopy);
      updatedCount++;
    }

    if (isMedicineOnlineVisible(medCopy)) {
      publishedCount++;
    }
  }

  // Dispatch events for immediate reactive updates across all components & tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: { type: 'medicines', count: updatedCount } }));
    window.dispatchEvent(new CustomEvent('mbi-medicines-updated', { detail: { count: updatedCount } }));
    window.dispatchEvent(new Event('storage'));
  }

  return {
    total: allMeds.length,
    updated: updatedCount,
    published: publishedCount
  };
}

/**
 * Retrieves the current Store Settings, initializing with defaults if missing.
 */
export async function getStoreSettings(): Promise<OnlineStoreSettings> {
  const initial = getInitialUserStoreSettings();
  try {
    const existing = await dbStoreSettings.get();
    if (existing && existing.storeName) {
      // If existing had the generic hardcoded placeholder name, migrate it to user's real business name
      if (
        (existing.storeName === 'MBI Inventra Pharmacy & Surgical Store' || !existing.phone || existing.phone === '+92 300 1234567') &&
        initial.storeName &&
        initial.storeName !== 'MBI Inventra Pharmacy & Surgical Store'
      ) {
        const migrated: OnlineStoreSettings = {
          ...existing,
          storeName: initial.storeName,
          storeTagline: initial.storeTagline,
          phone: initial.phone || existing.phone,
          whatsappNumber: initial.whatsappNumber || existing.whatsappNumber,
          email: initial.email || existing.email,
          address: initial.address || existing.address,
          city: initial.city || existing.city,
          updatedAt: new Date().toISOString()
        };
        await dbStoreSettings.save(migrated);
        return migrated;
      }
      return existing;
    }
    await dbStoreSettings.save(initial);
    return initial;
  } catch (err) {
    return initial;
  }
}

/**
 * Saves or updates Store Settings.
 */
export async function saveStoreSettings(settings: OnlineStoreSettings): Promise<OnlineStoreSettings> {
  const updated = {
    ...settings,
    id: 'default_store_settings',
    updatedAt: new Date().toISOString()
  };
  return await dbStoreSettings.save(updated);
}

/**
 * Initializes default store promotions if empty.
 */
export async function ensurePromotions(): Promise<StorePromotion[]> {
  const existing = await dbOnlinePromotions.getAll();
  if (existing && existing.length > 0) {
    return existing;
  }
  for (const promo of DEFAULT_PROMOTIONS) {
    await dbOnlinePromotions.save(promo);
  }
  return await dbOnlinePromotions.getAll();
}

/**
 * Evaluates a coupon code against the cart subtotal.
 */
export async function evaluateCoupon(
  code: string, 
  subtotal: number, 
  deliveryCharges: number
): Promise<{ valid: boolean; discount: number; message: string; promo?: StorePromotion }> {
  if (!code || !code.trim()) {
    return { valid: false, discount: 0, message: 'Please enter a coupon code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const allPromos = await ensurePromotions();
  const matched = allPromos.find(p => p.code.toUpperCase() === cleanCode && p.isActive);

  if (!matched) {
    return { valid: false, discount: 0, message: 'Invalid or expired coupon code.' };
  }

  if (matched.minOrderAmount && subtotal < matched.minOrderAmount) {
    return { 
      valid: false, 
      discount: 0, 
      message: `Minimum order amount of Rs. ${matched.minOrderAmount.toLocaleString()} required for this coupon.` 
    };
  }

  if (matched.usageLimit && matched.usageCount >= matched.usageLimit) {
    return { valid: false, discount: 0, message: 'This coupon usage limit has been reached.' };
  }

  let discount = 0;
  if (matched.discountType === 'PERCENTAGE') {
    discount = Math.round((subtotal * matched.discountValue) / 100);
    if (matched.maxDiscount && discount > matched.maxDiscount) {
      discount = matched.maxDiscount;
    }
  } else {
    discount = matched.discountValue;
  }

  discount = Math.min(discount, subtotal + deliveryCharges);

  return {
    valid: true,
    discount,
    message: `Coupon "${matched.code}" applied: Rs. ${discount} saved!`,
    promo: matched
  };
}

/**
 * Customer Cart Storage and State Helper (using localStorage for cross-refresh persistence)
 */
const CART_STORAGE_KEY = 'mbi_store_cart_items';

export function getLocalCart(): { medicineId: string; quantity: number }[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveLocalCart(items: { medicineId: string; quantity: number }[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('mbi_cart_updated'));
  } catch (e) {}
}

export function clearLocalCart(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('mbi_cart_updated'));
  } catch (e) {}
}

/**
 * Places an Online Order:
 * 1. Checks live inventory stock for each medicine.
 * 2. Deducts quantity from inventory (`dbMedicines.save`).
 * 3. Records an Audit Log.
 * 4. Ensures customer party profile exists or creates one in `dbSuppliers`.
 * 5. Saves order in `dbOnlineOrders`.
 */
export async function placeOnlineOrder(params: {
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    areaOrLandmark?: string;
    notes?: string;
  };
  cartItems: { medicine: Medicine; quantity: number }[];
  deliveryCharges: number;
  couponCode?: string;
  discountAmount?: number;
  paymentMethod: 'Cash on Delivery' | 'Bank Transfer' | 'Card / Raast';
}): Promise<{ success: boolean; order?: OnlineOrder; error?: string }> {
  try {
    if (!params.cartItems || params.cartItems.length === 0) {
      return { success: false, error: 'Your cart is empty.' };
    }

    const allMeds = await dbMedicines.getAll();
    const orderItems: OnlineOrderItem[] = [];
    let subTotal = 0;

    // 1. Verify stock and calculate item totals
    for (const item of params.cartItems) {
      const liveMed = allMeds.find(m => m.id === item.medicine.id);
      if (!liveMed) {
        return { success: false, error: `Product "${item.medicine.name}" is no longer available in inventory.` };
      }

      const availableStock = getEffectiveOnlineStock(liveMed);
      if (availableStock < item.quantity) {
        return { 
          success: false, 
          error: `Insufficient stock for "${liveMed.name}". Only ${availableStock} units available.` 
        };
      }

      const unitPrice = getEffectiveOnlinePrice(liveMed);
      const itemTotal = unitPrice * item.quantity;
      subTotal += itemTotal;

      orderItems.push({
        medicineId: liveMed.id,
        name: liveMed.onlineName || liveMed.name,
        genericName: liveMed.genericName,
        category: liveMed.onlineCategory || liveMed.category,
        unit: liveMed.unit || 'PCS',
        packSize: liveMed.packSize,
        image: (liveMed.onlineImages && liveMed.onlineImages[0]) || undefined,
        quantity: item.quantity,
        price: unitPrice,
        compareAtPrice: getCompareAtPrice(liveMed),
        total: itemTotal
      });
    }

    const discountAmount = params.discountAmount || 0;
    const deliveryCharges = params.deliveryCharges || 0;
    const grandTotal = Math.max(0, subTotal - discountAmount + deliveryCharges);

    // Generate unique Order Number
    const count = (await dbOnlineOrders.getAll()).length + 1001;
    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${count}`;

    const newOrder: OnlineOrder = {
      id: uuidv4(),
      orderNumber,
      orderDate: new Date().toISOString(),
      customer: {
        name: params.customer.name.trim(),
        phone: params.customer.phone.trim(),
        email: params.customer.email?.trim() || '',
        address: params.customer.address.trim(),
        city: params.customer.city.trim(),
        areaOrLandmark: params.customer.areaOrLandmark?.trim(),
        notes: params.customer.notes?.trim()
      },
      items: orderItems,
      subTotal,
      discountAmount,
      couponCode: params.couponCode,
      deliveryCharges,
      grandTotal,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'Pending',
      status: 'New',
      statusHistory: [
        {
          status: 'New',
          timestamp: new Date().toISOString(),
          note: `Order placed online via storefront with ${params.paymentMethod}`,
          updatedBy: 'Customer'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 2. Deduct live inventory quantity
    for (const item of params.cartItems) {
      const liveMed = allMeds.find(m => m.id === item.medicine.id);
      if (liveMed) {
        const newQty = Math.max(0, liveMed.quantity - item.quantity);
        const updatedMed: Medicine = {
          ...liveMed,
          quantity: newQty,
          updatedAt: new Date().toISOString()
        };
        await dbMedicines.save(updatedMed);

        // Audit Log
        const audit: AuditLog = {
          id: uuidv4(),
          date: new Date().toISOString(),
          action: 'SALE',
          medicineId: liveMed.id,
          medicineName: liveMed.name,
          quantityChanged: -item.quantity,
          userId: 'online_store',
          notes: `Stock deducted for Online Order #${orderNumber} (${params.customer.name})`
        };
        await dbAuditLogs.save(audit);
      }
    }

    // 3. Increment coupon usage if used
    if (params.couponCode) {
      const allPromos = await dbOnlinePromotions.getAll();
      const usedPromo = allPromos.find(p => p.code.toUpperCase() === params.couponCode?.toUpperCase());
      if (usedPromo) {
        await dbOnlinePromotions.save({
          ...usedPromo,
          usageCount: (usedPromo.usageCount || 0) + 1
        });
      }
    }

    // 4. Ensure customer is synced to Parties / Customers list
    try {
      const allSuppliers = await dbSuppliers.getAll();
      const existingCustomer = allSuppliers.find(s => 
        (s.partyType === 'Customer') &&
        ((s.phone && s.phone === params.customer.phone) || s.name.toLowerCase() === params.customer.name.toLowerCase())
      );

      if (!existingCustomer) {
        const newCustomer: Supplier = {
          id: uuidv4(),
          name: params.customer.name,
          partyType: 'Customer',
          contactPerson: params.customer.name,
          paymentTerms: 'Immediate',
          phone: params.customer.phone,
          email: params.customer.email || '',
          address: `${params.customer.address}, ${params.customer.city}`,
          balance: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await dbSuppliers.save(newCustomer);
      }
    } catch (e) {
      console.warn('Could not auto-register customer party:', e);
    }

    // 5. Save order
    await dbOnlineOrders.save(newOrder);

    // Clear cart
    clearLocalCart();

    return { success: true, order: newOrder };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to place order. Please try again.' };
  }
}

/**
 * Converts an Online Order to an official MBI Inventra Sale Invoice without double-deducting stock.
 */
export async function convertOnlineOrderToSaleInvoice(order: OnlineOrder): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  try {
    if (order.invoiceId) {
      const existingInv = await dbInvoices.getById(order.invoiceId);
      if (existingInv) {
        return { success: true, invoice: existingInv };
      }
    }

    const allInvoices = await dbInvoices.getAll();
    const nextInvoiceNum = `INV-${new Date().getFullYear()}-${allInvoices.length + 1001}`;

    const invoiceItems: InvoiceItem[] = order.items.map(item => ({
      id: uuidv4(),
      medicineId: item.medicineId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || 'PCS',
      sellingPrice: item.price,
      mrp: item.compareAtPrice || item.price,
      discountAmount: item.discountAmount || 0,
      total: item.total
    }));

    const newInvoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: nextInvoiceNum,
      transactionType: 'Sale',
      date: new Date().toISOString(),
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      customerAddress: `${order.customer.address}, ${order.customer.city}`,
      items: invoiceItems,
      subTotal: order.subTotal,
      discountAmount: order.discountAmount,
      roundOff: 0,
      grandTotal: order.grandTotal,
      receivedAmount: order.paymentStatus === 'Paid' ? order.grandTotal : 0,
      balanceDue: order.paymentStatus === 'Paid' ? 0 : order.grandTotal,
      paymentType: order.paymentMethod === 'Cash on Delivery' ? 'Cash' : 'Bank Transfer',
      status: order.paymentStatus === 'Paid' ? 'Completed' : 'Pending',
      description: `Generated from Online Order #${order.orderNumber}. Delivery Address: ${order.customer.address}, ${order.customer.city}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbInvoices.save(newInvoice);

    // Link back to online order
    const updatedOrder: OnlineOrder = {
      ...order,
      invoiceId: newInvoice.id,
      updatedAt: new Date().toISOString()
    };
    await dbOnlineOrders.save(updatedOrder);

    return { success: true, invoice: newInvoice };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to convert order to invoice.' };
  }
}
