import { 
  SaaSPlanDefinition, 
  SaaSPlanTier, 
  DynamicLimitOverride, 
  TenantFeatureToggles, 
  UserRole, 
  DEFAULT_TENANT_FEATURE_TOGGLES,
  Tenant
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getAllTenants, getTenantById, saveTenant, logMasterAudit } from './masterServerService';

const SAAS_PLANS_KEY = 'mbi_saas_plan_definitions_v5';
const DYNAMIC_OVERRIDES_KEY = 'mbi_dynamic_limit_overrides_v5';

export const DEFAULT_SAAS_PLANS: SaaSPlanDefinition[] = [
  {
    id: 'Basic',
    name: 'Basic',
    badge: '🟢 Basic Shop',
    tagline: 'Essential billing, thermal printing & inventory for retail pharmacies.',
    description: 'Entry-level plan for retail pharmacies needing reliable POS, local receipts, inventory, and customer credit ledger.',
    pricing: {
      monthly: 1999,
      yearly: 19990,
      threeYears: 59970,
      fiveYears: 99950,
    },
    trialDurationDays: 3,
    maxFirms: 2,
    maxUsers: 5,
    allowedRoles: [
      'Primary Admin',
      'Admin',
      'Store Manager',
      'Manager',
      'Cashier',
      'Biller',
      'Sales Staff',
      'Salesman',
      'Accountant'
    ],
    features: {
      sales: true,
      billing: true,
      purchases: true,
      inventory: true,
      customers: true,
      suppliers: true,
      ledgers: true,
      expenses: true,
      cashAndBank: true,
      reports: true,
      profitAndLoss: false,
      batchManagement: false,
      expiryManagement: false,
      barcode: true,
      warranty: false,
      onlineStore: false,
      advancedReports: false,
      multipleWarehouses: false,
      dataExport: true,
      backupAndRestore: true,
      aiVoice: false,
    },
    isPopular: false,
    isVisible: true,
    order: 1,
    notes: 'Basic plan: up to 2 firms and 5 team users.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Business',
    name: 'Business',
    badge: '🔵 Business Pro ⭐',
    tagline: 'Comprehensive multi-warehouse, batch expiry alert & automated tax management.',
    description: 'Designed for busy retail pharmacies, clinical stores, and growing multi-counter establishments with up to 5 firms.',
    pricing: {
      monthly: 3999,
      yearly: 39990,
      threeYears: 119970,
      fiveYears: 199950,
    },
    trialDurationDays: 3,
    maxFirms: 5,
    maxUsers: 10,
    allowedRoles: [
      'Primary Admin',
      'Secondary Admin',
      'Admin',
      'Store Manager',
      'Manager',
      'Pharmacist',
      'Cashier',
      'Biller',
      'Sales Staff',
      'Salesman',
      'Staff',
      'Biller and Salesman',
      'Accountant',
      'CA/Accountant',
      'Stock Keeper',
      'Inventory Manager',
      'Sales User',
      'Purchase User'
    ],
    features: {
      sales: true,
      billing: true,
      purchases: true,
      inventory: true,
      customers: true,
      suppliers: true,
      ledgers: true,
      expenses: true,
      cashAndBank: true,
      reports: true,
      profitAndLoss: true,
      batchManagement: true,
      expiryManagement: true,
      barcode: true,
      warranty: true,
      onlineStore: false,
      advancedReports: true,
      multipleWarehouses: true,
      dataExport: true,
      backupAndRestore: true,
      aiVoice: true,
    },
    isPopular: true,
    isVisible: true,
    order: 2,
    notes: 'Most popular plan: up to 5 firms and 10 team users with batch, expiry tracking & voice AI.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'Premium',
    name: 'Premium',
    badge: '🟣 Premium Enterprise',
    tagline: 'Multi-branch sync, enterprise audit logs, custom invoice branding & dedicated server.',
    description: 'Complete enterprise grade solution for pharmacy chains, hospitals, and surgical distributors with up to 10 firms and 20 users.',
    pricing: {
      monthly: 6999,
      yearly: 69990,
      threeYears: 209970,
      fiveYears: 349950,
    },
    trialDurationDays: 3,
    maxFirms: 10,
    maxUsers: 20,
    allowedRoles: [
      'Primary Admin',
      'Secondary Admin',
      'Admin',
      'Store Manager',
      'Manager',
      'Pharmacist',
      'Cashier',
      'Biller',
      'Sales Staff',
      'Salesman',
      'Staff',
      'Biller and Salesman',
      'Accountant',
      'CA/Accountant',
      'Stock Keeper',
      'Inventory Manager',
      'Sales User',
      'Purchase User',
      'Viewer',
      'Custom Role'
    ],
    features: {
      ...DEFAULT_TENANT_FEATURE_TOGGLES,
    },
    isPopular: false,
    isVisible: true,
    order: 3,
    notes: 'Flagship enterprise tier: up to 10 firms, 20 team users, online storefront & full audit trail.',
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Retrieve all SaaS Plan Definitions
 */
export function getSaaSPlans(): SaaSPlanDefinition[] {
  try {
    const stored = localStorage.getItem(SAAS_PLANS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load SaaS plans from localStorage:', e);
  }
  localStorage.setItem(SAAS_PLANS_KEY, JSON.stringify(DEFAULT_SAAS_PLANS));
  return DEFAULT_SAAS_PLANS;
}

/**
 * Save updated SaaS Plan Definitions (Master Server Action)
 */
export function saveSaaSPlans(plans: SaaSPlanDefinition[]): SaaSPlanDefinition[] {
  localStorage.setItem(SAAS_PLANS_KEY, JSON.stringify(plans));
  logMasterAudit('SaaS Plans Updated', 'LICENSE', `Updated configurations for ${plans.length} plan packages`);
  window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: plans }));
  return plans;
}

/**
 * Get a specific SaaS Plan by ID or Name
 */
export function getSaaSPlanById(planId: string): SaaSPlanDefinition {
  const plans = getSaaSPlans();
  const normalized = planId.toLowerCase();
  
  if (normalized.includes('prem') || normalized.includes('enterp') || normalized.includes('multi')) {
    return plans.find(p => p.id === 'Premium') || DEFAULT_SAAS_PLANS[2];
  }
  if (normalized.includes('bus') || normalized.includes('pro') || normalized.includes('pharma')) {
    return plans.find(p => p.id === 'Business') || DEFAULT_SAAS_PLANS[1];
  }
  if (normalized.includes('basic') || normalized.includes('trial') || normalized.includes('standard')) {
    return plans.find(p => p.id === 'Basic') || DEFAULT_SAAS_PLANS[0];
  }

  return plans.find(p => p.id === planId) || plans[0] || DEFAULT_SAAS_PLANS[0];
}

/**
 * Retrieve all Dynamic Limit Overrides
 */
export function getAllDynamicOverrides(tenantId?: string): DynamicLimitOverride[] {
  try {
    const stored = localStorage.getItem(DYNAMIC_OVERRIDES_KEY);
    if (stored) {
      const parsed: DynamicLimitOverride[] = JSON.parse(stored);
      if (tenantId) {
        return parsed.filter(o => o.tenantId === tenantId);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load dynamic overrides:', e);
  }
  return [];
}

/**
 * Create a new Dynamic Limit Override (Master Server Action)
 */
export function createDynamicOverride(params: {
  tenantId: string;
  firmId?: string;
  overrideType: DynamicLimitOverride['overrideType'];
  targetField: string;
  previousValue: any;
  newValue: any;
  reason: string;
  createdBy?: string;
  expiryDate?: string;
}): DynamicLimitOverride {
  const overrides = getAllDynamicOverrides();
  const newOverride: DynamicLimitOverride = {
    id: 'ovr_' + uuidv4().substring(0, 8),
    tenantId: params.tenantId,
    firmId: params.firmId,
    overrideType: params.overrideType,
    targetField: params.targetField,
    previousValue: params.previousValue,
    newValue: params.newValue,
    reason: params.reason || 'Master Admin dynamic limit customization',
    createdBy: params.createdBy || 'MASTER_ADMIN',
    createdAt: new Date().toISOString(),
    expiryDate: params.expiryDate,
    status: 'Active',
  };

  overrides.unshift(newOverride);
  localStorage.setItem(DYNAMIC_OVERRIDES_KEY, JSON.stringify(overrides));

  // Sync to Tenant record
  const tenant = getTenantById(params.tenantId);
  if (tenant) {
    const tenantOverrides = tenant.dynamicOverrides || [];
    tenant.dynamicOverrides = [newOverride, ...tenantOverrides.filter(o => o.id !== newOverride.id)];

    // Apply directly if maxFirms or maxUsers
    if (params.targetField === 'maxFirms' || params.overrideType === 'max_firms') {
      tenant.maxFirms = Number(params.newValue);
    }
    if (params.targetField === 'maxUsers' || params.overrideType === 'max_users') {
      tenant.maxUsers = Number(params.newValue);
    }

    saveTenant(tenant);
  }

  logMasterAudit(
    'Limit Override Created',
    'FLEET',
    `Applied override ${params.targetField} = ${JSON.stringify(params.newValue)} for tenant ${params.tenantId}. Reason: ${params.reason}`,
    tenant?.name || params.tenantId
  );

  return newOverride;
}

/**
 * Revoke or Delete a Dynamic Limit Override
 */
export function revokeDynamicOverride(overrideId: string): boolean {
  const overrides = getAllDynamicOverrides();
  const target = overrides.find(o => o.id === overrideId);
  if (!target) return false;

  target.status = 'Revoked';
  localStorage.setItem(DYNAMIC_OVERRIDES_KEY, JSON.stringify(overrides));

  // Update tenant
  const tenant = getTenantById(target.tenantId);
  if (tenant && tenant.dynamicOverrides) {
    tenant.dynamicOverrides = tenant.dynamicOverrides.map(o => o.id === overrideId ? { ...o, status: 'Revoked' } : o);
    saveTenant(tenant);
  }

  logMasterAudit('Limit Override Revoked', 'FLEET', `Revoked override ${overrideId} for tenant ${target.tenantId}`, tenant?.name);
  return true;
}

/**
 * Compute the Effective Limits for a Tenant taking into account:
 * 1. Base SaaS Plan Package
 * 2. Active Dynamic Limit Overrides
 */
export function getEffectiveTenantLimits(tenantId: string): {
  planTier: SaaSPlanTier;
  plan: SaaSPlanDefinition;
  maxFirms: number;
  maxUsers: number;
  allowedRoles: UserRole[];
  features: TenantFeatureToggles;
  activeOverrides: DynamicLimitOverride[];
} {
  const tenant = getTenantById(tenantId);
  const planTier: SaaSPlanTier = tenant?.plan === 'Premium' || (tenant?.plan && tenant.plan.includes('Enterprise'))
    ? 'Premium'
    : tenant?.plan === 'Business' || (tenant?.plan && (tenant.plan.includes('Pharmacy Pro') || tenant.plan.includes('Business')))
    ? 'Business'
    : 'Basic';

  const basePlan = getSaaSPlanById(planTier);
  let maxFirms = tenant?.maxFirms ?? basePlan.maxFirms;
  let maxUsers = tenant?.maxUsers ?? basePlan.maxUsers;
  let allowedRoles = tenant?.allowedRoles ?? [...basePlan.allowedRoles];
  let features = tenant?.featureToggles ? { ...basePlan.features, ...tenant.featureToggles } : { ...basePlan.features };

  // Apply active dynamic overrides
  const allOverrides = getAllDynamicOverrides(tenantId);
  const now = new Date().toISOString();
  const activeOverrides = allOverrides.filter(o => {
    if (o.status !== 'Active') return false;
    if (o.expiryDate && o.expiryDate < now) return false;
    return true;
  });

  for (const ovr of activeOverrides) {
    if (ovr.overrideType === 'max_firms' || ovr.targetField === 'maxFirms') {
      maxFirms = Number(ovr.newValue);
    } else if (ovr.overrideType === 'max_users' || ovr.targetField === 'maxUsers') {
      maxUsers = Number(ovr.newValue);
    } else if (ovr.overrideType === 'role_access' || ovr.targetField === 'allowedRoles') {
      if (Array.isArray(ovr.newValue)) {
        allowedRoles = ovr.newValue as UserRole[];
      }
    } else if (ovr.overrideType === 'feature_toggle' && ovr.targetField) {
      (features as any)[ovr.targetField] = Boolean(ovr.newValue);
    }
  }

  return {
    planTier,
    plan: basePlan,
    maxFirms,
    maxUsers,
    allowedRoles,
    features,
    activeOverrides,
  };
}

/**
 * Check whether a tenant is allowed to add a new firm/business
 */
export function canAddFirm(tenantId: string, currentFirmCount: number): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
} {
  const { maxFirms, planTier } = getEffectiveTenantLimits(tenantId);
  // Support high capacity and unlimited expansion
  const effectiveMax = Math.max(maxFirms, 100);
  if (currentFirmCount >= effectiveMax) {
    return {
      allowed: false,
      maxAllowed: effectiveMax,
      currentCount: currentFirmCount,
      message: `Your ${planTier} plan allows up to ${effectiveMax} firm(s). Please upgrade to Business/Premium or contact Master Admin to add more firms.`,
    };
  }
  return {
    allowed: true,
    maxAllowed: effectiveMax,
    currentCount: currentFirmCount,
  };
}

/**
 * Check whether a tenant is allowed to add a new user account
 */
export function canAddUser(tenantId: string, currentUserCount: number): {
  allowed: boolean;
  maxAllowed: number;
  currentCount: number;
  message?: string;
} {
  const { maxUsers, planTier } = getEffectiveTenantLimits(tenantId);
  // Support high capacity and unlimited expansion
  const effectiveMax = Math.max(maxUsers, 100);
  if (currentUserCount >= effectiveMax) {
    return {
      allowed: false,
      maxAllowed: effectiveMax,
      currentCount: currentUserCount,
      message: `Your ${planTier} plan allows up to ${effectiveMax} total user(s). Please upgrade your plan or contact Master Admin to expand user seats.`,
    };
  }
  return {
    allowed: true,
    maxAllowed: effectiveMax,
    currentCount: currentUserCount,
  };
}

/**
 * 100% UNLIMITED GUARANTEE: Invoices, Items, and Parties are ALWAYS unlimited
 */
export function canCreateInvoice(_tenantId?: string): { allowed: boolean; isUnlimited: boolean; message: string } {
  return {
    allowed: true,
    isUnlimited: true,
    message: 'Unlimited Billing & Invoices Active (Full Capacity Engine)'
  };
}

export function canCreateItem(_tenantId?: string): { allowed: boolean; isUnlimited: boolean; message: string } {
  return {
    allowed: true,
    isUnlimited: true,
    message: 'Unlimited Products & Inventory Items Active (Full Capacity Engine)'
  };
}

export function canCreateParty(_tenantId?: string): { allowed: boolean; isUnlimited: boolean; message: string } {
  return {
    allowed: true,
    isUnlimited: true,
    message: 'Unlimited Customers & Suppliers Active (Full Capacity Engine)'
  };
}

/**
 * Check whether a specific role is allowed under the tenant's current plan
 */
export function isRoleAllowedForTenant(tenantId: string, role: UserRole): boolean {
  const { allowedRoles } = getEffectiveTenantLimits(tenantId);
  return allowedRoles.includes(role);
}
