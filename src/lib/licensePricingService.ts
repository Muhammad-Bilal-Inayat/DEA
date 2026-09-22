/**
 * MBI Inventra - Master Server License Activation & Pricing Engine
 * 
 * Rates and pricing for all 3 core plans across all subscription durations:
 * - 2 Days (Instant Demo / Express Evaluation)
 * - 7 Days (1-Week Trial)
 * - 15 Days (Half-Month Trial)
 * - 30 Days (1 Month Standard)
 * - 1 Year (12 Months Annual)
 * - 3 Years (36 Months Triennial)
 * - 5 Years (60 Months Quinquennial)
 * - Custom Days
 * - Lifetime Perpetual
 */

export type LicensePlanTier = 'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch';

export type LicenseDurationType = 
  | '2_days' 
  | '7_days' 
  | '15_days' 
  | '30_days' 
  | '1_year' 
  | '3_years' 
  | '5_years' 
  | 'custom' 
  | 'lifetime';

export interface PlanPricingDetail {
  planTier: LicensePlanTier;
  planName: string;
  badge: string;
  tagline: string;
  maxUsers: number;
  maxFirms: number;
  rates: {
    '2_days': { days: 2; pricePkr: number; label: string };
    '7_days': { days: 7; pricePkr: number; label: string };
    '15_days': { days: 15; pricePkr: number; label: string };
    '30_days': { days: 30; pricePkr: number; label: string };
    '1_year': { days: 365; pricePkr: number; label: string; discountBadge?: string };
    '3_years': { days: 1095; pricePkr: number; label: string; discountBadge?: string };
    '5_years': { days: 1825; pricePkr: number; label: string; discountBadge?: string };
    'lifetime': { days: 0; pricePkr: number; label: string; discountBadge?: string };
  };
}

export const MASTER_LICENSE_PRICING_CATALOG: Record<LicensePlanTier, PlanPricingDetail> = {
  'Standard POS': {
    planTier: 'Standard POS',
    planName: 'Standard POS (Retail Retailer)',
    badge: '🟢 Starter POS',
    tagline: 'Essential POS billing, thermal receipts & inventory for single-counter stores.',
    maxUsers: 3,
    maxFirms: 1,
    rates: {
      '2_days': { days: 2, pricePkr: 0, label: 'Free Demo (2 Days)' },
      '7_days': { days: 7, pricePkr: 500, label: '7-Day Quick Trial' },
      '15_days': { days: 15, pricePkr: 1000, label: '15-Day Half Month' },
      '30_days': { days: 30, pricePkr: 1999, label: '30-Day (1 Month)' },
      '1_year': { days: 365, pricePkr: 19990, label: '1-Year Annual', discountBadge: 'Save 17%' },
      '3_years': { days: 1095, pricePkr: 49990, label: '3-Years License', discountBadge: 'Save 25%' },
      '5_years': { days: 1825, pricePkr: 79990, label: '5-Years Extended', discountBadge: 'Save 30%' },
      'lifetime': { days: 0, pricePkr: 120000, label: 'Lifetime Perpetual', discountBadge: 'One-Time Buy' },
    }
  },
  'Pharmacy Pro': {
    planTier: 'Pharmacy Pro',
    planName: 'Pharmacy Pro (Most Popular ⭐)',
    badge: '🔵 Pharmacy Pro',
    tagline: 'Batch & expiry tracking, multi-warehouse, doctor commission & voice search.',
    maxUsers: 10,
    maxFirms: 5,
    rates: {
      '2_days': { days: 2, pricePkr: 0, label: 'Free Pro Demo (2 Days)' },
      '7_days': { days: 7, pricePkr: 1000, label: '7-Day Pro Trial' },
      '15_days': { days: 15, pricePkr: 2000, label: '15-Day Pro Trial' },
      '30_days': { days: 30, pricePkr: 3999, label: '30-Day (1 Month Pro)' },
      '1_year': { days: 365, pricePkr: 39990, label: '1-Year Pro Annual', discountBadge: 'Save 17%' },
      '3_years': { days: 1095, pricePkr: 99990, label: '3-Years Pro Edition', discountBadge: 'Save 25%' },
      '5_years': { days: 1825, pricePkr: 159990, label: '5-Years Pro Edition', discountBadge: 'Save 30%' },
      'lifetime': { days: 0, pricePkr: 250000, label: 'Lifetime Pro Perpetual', discountBadge: 'One-Time Buy' },
    }
  },
  'Enterprise Multi-Branch': {
    planTier: 'Enterprise Multi-Branch',
    planName: 'Enterprise Multi-Branch (HQ Cloud)',
    badge: '🟣 Enterprise HQ',
    tagline: 'Unlimited branch synchronization, master server fleet management & custom API.',
    maxUsers: 50,
    maxFirms: 20,
    rates: {
      '2_days': { days: 2, pricePkr: 0, label: 'Free Enterprise Demo' },
      '7_days': { days: 7, pricePkr: 2000, label: '7-Day Enterprise Trial' },
      '15_days': { days: 15, pricePkr: 4000, label: '15-Day Enterprise Trial' },
      '30_days': { days: 30, pricePkr: 6999, label: '30-Day (1 Month Enterprise)' },
      '1_year': { days: 365, pricePkr: 69990, label: '1-Year Enterprise Annual', discountBadge: 'Save 17%' },
      '3_years': { days: 1095, pricePkr: 179990, label: '3-Years Enterprise', discountBadge: 'Save 25%' },
      '5_years': { days: 1825, pricePkr: 279990, label: '5-Years Enterprise', discountBadge: 'Save 30%' },
      'lifetime': { days: 0, pricePkr: 450000, label: 'Lifetime Enterprise Perpetual', discountBadge: 'One-Time Buy' },
    }
  }
};

/**
 * Calculate computed expiry date based on duration
 */
export function calculateLicenseExpiryDate(durationType: LicenseDurationType, customDaysCount: number = 30): {
  expiryDateStr: string;
  isLifetime: boolean;
  days: number;
} {
  const now = new Date();

  if (durationType === 'lifetime') {
    return {
      expiryDateStr: 'Lifetime',
      isLifetime: true,
      days: 0
    };
  }

  let days = 30;
  if (durationType === '2_days') days = 2;
  else if (durationType === '7_days') days = 7;
  else if (durationType === '15_days') days = 15;
  else if (durationType === '30_days') days = 30;
  else if (durationType === '1_year') days = 365;
  else if (durationType === '3_years') days = 1095;
  else if (durationType === '5_years') days = 1825;
  else if (durationType === 'custom') days = Math.max(1, customDaysCount);

  const expDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    expiryDateStr: expDate.toISOString().slice(0, 10),
    isLifetime: false,
    days
  };
}

/**
 * Get standard catalog price for a plan and duration
 */
export function getCatalogPrice(planTier: LicensePlanTier, durationType: LicenseDurationType, customDaysCount: number = 30): number {
  const plan = MASTER_LICENSE_PRICING_CATALOG[planTier] || MASTER_LICENSE_PRICING_CATALOG['Pharmacy Pro'];
  if (durationType === 'custom') {
    // Pro-rate based on 30-day rate
    const base30Rate = plan.rates['30_days'].pricePkr;
    return Math.round((base30Rate / 30) * Math.max(1, customDaysCount));
  }
  return plan.rates[durationType]?.pricePkr ?? 3999;
}

/**
 * Format currency in PKR
 */
export function formatPKR(amount: number): string {
  return 'Rs. ' + (amount || 0).toLocaleString('en-PK');
}

/**
 * Generate formatted WhatsApp deal confirmation
 */
export function buildWhatsAppLicenseConfirmation(params: {
  clientName: string;
  ownerName: string;
  phone: string;
  planName: string;
  durationType: LicenseDurationType;
  durationLabel: string;
  expiryDate: string;
  licenseKey: string;
  agreedPrice: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: string;
}): string {
  return `*MBI INVENTRA POS & ERP - LICENSE ACTIVATION CONFIRMATION* 🚀%0A` +
    `========================================%0A` +
    `*Pharmacy / Store:* ${params.clientName}%0A` +
    `*Owner:* ${params.ownerName}%0A` +
    `*Plan Tier:* ${params.planName}%0A` +
    `*Validity Period:* ${params.durationLabel} (${params.expiryDate === 'Lifetime' ? 'Lifetime Perpetual' : 'Valid until ' + params.expiryDate})%0A` +
    `*License Key:* ${params.licenseKey}%0A` +
    `----------------------------------------%0A` +
    `*Agreed Software Price:* ${formatPKR(params.agreedPrice)}%0A` +
    `*Amount Received:* ${formatPKR(params.amountPaid)}%0A` +
    `*Balance Due:* ${formatPKR(params.amountDue)}%0A` +
    `*Payment Method:* ${params.paymentMethod}%0A` +
    `*Activation Date:* ${new Date().toLocaleDateString('en-PK')}%0A` +
    `========================================%0A` +
    `Thank you for trusting MBI Inventra! For instant technical support: 0336-4585863.`;
}
