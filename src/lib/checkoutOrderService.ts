import { getAllTenants, saveTenant, saveClientLicense, DEFAULT_TENANT_FEATURE_TOGGLES } from './masterServerService';

export interface CheckoutOrder {
  id: string;
  createdAt: string;
  businessName: string;
  ownerName: string;
  whatsapp: string;
  email: string;
  city: string;
  username: string;
  planId: 'basic' | 'business' | 'premium' | 'custom' | string;
  planName: string;
  billingInterval: 'monthly' | '1year' | '3years' | '5years' | string;
  amountRupees: number;
  paymentMethod: 'Meezan Bank' | 'UBL Bank' | 'JazzCash' | 'EasyPaisa' | 'NayaPay' | 'SadaPay' | 'Binance Crypto' | 'Other' | string;
  paymentScreenshot: string; // Base64 or Image URL
  trxId: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  licenseKeyGenerated?: string;
}

const STORAGE_KEY = 'mbi_checkout_orders';

export const PAYMENT_ACCOUNTS = {
  meezan: {
    bankName: 'Meezan Bank (Sargodha Branch)',
    accountTitle: 'MUHAMMAD BILAL INAYAT',
    accountNumber: '14010111536981',
    iban: 'PK85MEZN0014010111536981',
  },
  ubl: {
    bankName: 'United Bank Limited (UBL)',
    accountTitle: 'M Bilal Inayat',
    accountNumber: '010900033910',
    iban: 'PK53UNIL0109000339108343',
  },
  wallets: {
    name: 'JazzCash / EasyPaisa / NayaPay / SadaPay',
    accountTitle: 'M.Bilal Inayat',
    mobileNumber: '03281302636',
  },
  crypto: {
    name: 'Binance Crypto (USDT / Pay)',
    binanceId: '977181706',
    username: 'MBI786',
  }
};

const INITIAL_ORDERS: CheckoutOrder[] = [
  {
    id: 'ORD-2026-9081',
    createdAt: '2026-09-17T10:15:00.000Z',
    businessName: 'Al-Shafi Pharmacy & Medical Store',
    ownerName: 'Dr. Tariq Mahmood',
    whatsapp: '+923001234567',
    email: 'alshafi.pharmacy@gmail.com',
    city: 'Sargodha',
    username: 'alshafi_sgd',
    planId: 'business',
    planName: 'Business Plan (Multi-Terminal & WhatsApp POS)',
    billingInterval: '1year',
    amountRupees: 37800,
    paymentMethod: 'Meezan Bank',
    paymentScreenshot: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    trxId: 'MZ-984012948',
    notes: 'Transferred via Meezan Mobile App to 14010111536981',
    status: 'pending'
  },
  {
    id: 'ORD-2026-8812',
    createdAt: '2026-09-16T14:30:00.000Z',
    businessName: 'MedLife Pharmacy',
    ownerName: 'Usman Ghani',
    whatsapp: '+923219876543',
    email: 'medlife.lahore@gmail.com',
    city: 'Lahore',
    username: 'medlife_lhr',
    planId: 'premium',
    planName: 'Premium Enterprise Plan',
    billingInterval: '3years',
    amountRupees: 135000,
    paymentMethod: 'JazzCash',
    paymentScreenshot: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    trxId: 'JC-881294812',
    notes: 'Sent via JazzCash to 03281302636 M.Bilal Inayat',
    status: 'approved',
    approvedAt: '2026-09-16T15:00:00.000Z',
    licenseKeyGenerated: 'MBI-BUS-2026-A948-X812-OK'
  }
];

export function getCheckoutOrders(): CheckoutOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ORDERS;
  }
}

export function saveCheckoutOrder(order: Omit<CheckoutOrder, 'id' | 'createdAt' | 'status'>): CheckoutOrder {
  const orders = getCheckoutOrders();
  const newOrder: CheckoutOrder = {
    ...order,
    id: `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  orders.unshift(newOrder);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {}

  return newOrder;
}

export function updateOrderStatus(id: string, status: 'approved' | 'rejected'): CheckoutOrder | null {
  const orders = getCheckoutOrders();
  const order = orders.find(o => o.id === id);
  if (!order) return null;

  order.status = status;
  if (status === 'approved') {
    const licenseKey = `MBI-${(order.planId || 'PRO').toUpperCase()}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    order.approvedAt = new Date().toISOString();
    order.licenseKeyGenerated = licenseKey;

    // Resilient composite identity linking for Tenant:
    // Match by username, email, phone, businessName or existing licenseId to keep data 100% safe
    const allTenants = getAllTenants();
    const existingTenant = allTenants.find(t => 
      (order.username && t.primaryAdminEmail && (t.primaryAdminEmail.toLowerCase() === order.username.toLowerCase() || t.tenantId.toLowerCase().includes(order.username.toLowerCase()))) ||
      (order.email && t.ownerEmail && t.ownerEmail.toLowerCase() === order.email.toLowerCase()) ||
      (order.whatsapp && t.ownerPhone && t.ownerPhone.replace(/\D/g, '') === order.whatsapp.replace(/\D/g, '')) ||
      (order.businessName && t.name && t.name.toLowerCase() === order.businessName.toLowerCase()) ||
      (t.licenseId === licenseKey)
    );

    if (existingTenant) {
      existingTenant.licenseId = licenseKey;
      existingTenant.plan = order.planName as any;
      existingTenant.status = 'Active';
      existingTenant.paidLicenseActive = true;
      existingTenant.isTrialActive = false;
      existingTenant.updatedAt = new Date().toISOString();
      saveTenant(existingTenant);
    } else {
      const tenantId = `t-${(order.username || order.businessName).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}-${Date.now().toString().slice(-4)}`;
      saveTenant({
        id: `ten_${Date.now()}`,
        tenantId,
        organizationId: `org_${Date.now()}`,
        licenseId: licenseKey,
        name: order.businessName,
        ownerName: order.ownerName,
        ownerPhone: order.whatsapp,
        ownerEmail: order.email,
        city: order.city,
        address: `${order.city}, Pakistan`,
        plan: order.planName as any,
        status: 'Active',
        primaryAdminId: `usr_admin_${Date.now()}`,
        primaryAdminEmail: order.email,
        trialStartDate: new Date().toISOString(),
        trialExpiryDate: 'Lifetime',
        isTrialActive: false,
        trialExpired: false,
        paidLicenseActive: true,
        maxDevices: 10,
        featureToggles: {
          ...DEFAULT_TENANT_FEATURE_TOGGLES,
        },
        storageUsedMb: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Save client license
    saveClientLicense({
      id: `lic_${Date.now()}`,
      licenseKey,
      clientName: order.businessName,
      ownerName: order.ownerName,
      phone: order.whatsapp,
      city: order.city,
      plan: order.planName as any,
      status: 'Active',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: order.billingInterval === 'monthly' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : 'Lifetime',
      maxDevices: 10,
      strictHardwareLock: false,
      maxOfflineDays: 30,
      boundHardwareIds: [],
      allowedModules: {
        sales: true,
        purchases: true,
        pharmacy: true,
        inventory: true,
        reports: true,
        cloudSync: true,
        multiBranch: true,
        aiVoice: true,
        cashierShifts: true,
        customPrint: true,
        accountsLedger: true,
        narcoticsSchedule: true,
        customerLoyalty: true,
        bulkExcel: true,
        barcodeLabels: true,
      },
      salePrice: order.amountRupees,
      amountPaid: order.amountRupees,
      amountDue: 0,
      saleStatus: 'Paid',
      paymentMethod: order.paymentMethod as any,
      notes: `Order ${order.id} verified via Checkout Orders - TRX: ${order.trxId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {}

  return order;
}

export function deleteCheckoutOrder(id: string): boolean {
  let orders = getCheckoutOrders();
  const lenBefore = orders.length;
  orders = orders.filter(o => o.id !== id);
  if (orders.length !== lenBefore) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {}
    return true;
  }
  return false;
}
