import { AccountUsageRecord, SaaSPlanTier } from '../types';
import { getEffectiveTenantLimits, getSaaSPlanById } from './planLimitsService';
import { saveRecordToFirestore, fetchCollectionFromFirestore, getFirebaseFirestore } from './firebase';
import { dbAppUsers } from './db';
import { getTenantById } from './masterServerService';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ACCOUNT_USAGE_COLLECTION = 'accountUsage';
const USAGE_LOCAL_STORAGE_PREFIX = 'mbi_account_usage_v1_';

export interface LimitValidationResult {
  allowed: boolean;
  resourceType: 'user' | 'firm';
  currentCount: number;
  maxAllowed: number;
  planTier: SaaSPlanTier | string;
  isOverLimit: boolean;
  message?: string;
  usage?: TenantUsageInfo;
}

export interface TenantUsageInfo {
  tenantId: string;
  userCount: number;
  firmCount: number;
  maxUsers: number;
  maxFirms: number;
  plan: string;
  isOverLimit: boolean;
}

export class AccountUsageService {
  /**
   * Helper alias to check resource limit before action (e.g. 'users' | 'firms')
   */
  public static async checkLimitBeforeAction(
    tenantId: string = 'tenant_default',
    resource: 'users' | 'firms' | 'user' | 'firm'
  ): Promise<{ allowed: boolean; usage: TenantUsageInfo; message?: string }> {
    const resType = resource === 'firms' || resource === 'firm' ? 'firm' : 'user';
    const validation = await this.validateQuota(tenantId, resType);
    const usage = await this.getTenantUsage(tenantId);
    const limits = getEffectiveTenantLimits(tenantId);

    const usageInfo: TenantUsageInfo = {
      tenantId,
      userCount: usage.userCount,
      firmCount: usage.firmCount,
      maxUsers: limits.maxUsers,
      maxFirms: limits.maxFirms,
      plan: limits.planTier,
      isOverLimit: validation.isOverLimit,
    };

    return {
      allowed: validation.allowed,
      usage: usageInfo,
      message: validation.message,
    };
  }

  /**
   * Helper alias to increment resource usage
   */
  public static async incrementUsage(
    tenantId: string = 'tenant_default',
    resource: 'users' | 'firms' | 'user' | 'firm',
    actor: string = 'Admin'
  ): Promise<AccountUsageRecord> {
    const action = resource === 'firms' || resource === 'firm' ? 'add_firm' : 'add_user';
    return await this.recordUsageChange(tenantId, action, actor);
  }

  /**
   * Retrieve current resource usage record for a tenant from Firestore
   */
  public static async getTenantUsage(tenantId: string = 'tenant_default'): Promise<AccountUsageRecord> {
    const localKey = `${USAGE_LOCAL_STORAGE_PREFIX}${tenantId}`;

    // 1. Try local storage cache
    try {
      const cached = localStorage.getItem(localKey);
      if (cached) {
        const parsed: AccountUsageRecord = JSON.parse(cached);
        const ageMinutes = (Date.now() - new Date(parsed.lastUpdated).getTime()) / (1000 * 60);
        if (ageMinutes < 2) {
          return parsed;
        }
      }
    } catch {}

    // 2. Fetch from Cloud Firestore
    if (navigator.onLine) {
      try {
        const db = getFirebaseFirestore();
        if (db) {
          const docRef = doc(db, ACCOUNT_USAGE_COLLECTION, tenantId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as AccountUsageRecord;
            localStorage.setItem(localKey, JSON.stringify(data));
            return data;
          }
        }
      } catch (e) {
        console.warn('Could not fetch cloud accountUsage:', e);
      }
    }

    // 3. If not existing or offline, compute fresh from DB and save
    return await this.syncTenantUsage(tenantId);
  }

  /**
   * Helper utility to validate whether a tenant can add a new user or firm.
   * If limit is exceeded, returns allowed: false with detailed quota info.
   */
  public static async validateQuota(
    tenantId: string = 'tenant_default',
    resourceType: 'user' | 'firm'
  ): Promise<LimitValidationResult> {
    // 1. Attempt server-side validation via endpoint if online
    if (navigator.onLine) {
      try {
        const res = await fetch('/api/tenant/validate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, resourceType })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.allowed === 'boolean') {
            return data;
          }
        }
      } catch {
        // Fallback to client-side rule evaluation
      }
    }

    // 2. Client-side evaluation against effective plan limits & usage doc
    const usage = await this.getTenantUsage(tenantId);
    const limits = getEffectiveTenantLimits(tenantId);

    if (resourceType === 'user') {
      const currentCount = usage.userCount;
      const maxAllowed = limits.maxUsers;
      const allowed = currentCount < maxAllowed;
      return {
        allowed,
        resourceType: 'user',
        currentCount,
        maxAllowed,
        planTier: limits.planTier,
        isOverLimit: !allowed,
        message: allowed 
          ? undefined 
          : `You have reached the maximum user limit (${currentCount}/${maxAllowed}) for your ${limits.planTier} plan. Please upgrade to add more team members.`
      };
    } else {
      const currentCount = usage.firmCount;
      const maxAllowed = limits.maxFirms;
      const allowed = currentCount < maxAllowed;
      return {
        allowed,
        resourceType: 'firm',
        currentCount,
        maxAllowed,
        planTier: limits.planTier,
        isOverLimit: !allowed,
        message: allowed 
          ? undefined 
          : `You have reached the maximum firm limit (${currentCount}/${maxAllowed}) for your ${limits.planTier} plan. Please upgrade to create additional business entities.`
      };
    }
  }

  /**
   * Record increment or decrement in usage count upon user/firm creation or deletion
   */
  public static async recordUsageChange(
    tenantId: string = 'tenant_default',
    action: 'add_user' | 'remove_user' | 'add_firm' | 'remove_firm',
    actor: string = 'Admin'
  ): Promise<AccountUsageRecord> {
    const currentUsage = await this.getTenantUsage(tenantId);
    const limits = getEffectiveTenantLimits(tenantId);

    let newUserCount = currentUsage.userCount;
    let newFirmCount = currentUsage.firmCount;

    if (action === 'add_user') newUserCount = Math.max(1, newUserCount + 1);
    if (action === 'remove_user') newUserCount = Math.max(1, newUserCount - 1);
    if (action === 'add_firm') newFirmCount = Math.max(1, newFirmCount + 1);
    if (action === 'remove_firm') newFirmCount = Math.max(1, newFirmCount - 1);

    const isOverLimit = newUserCount > limits.maxUsers || newFirmCount > limits.maxFirms;

    const history = currentUsage.usageHistory || [];
    history.unshift({
      timestamp: new Date().toISOString(),
      action,
      userCount: newUserCount,
      firmCount: newFirmCount,
      actor,
    });

    const updatedRecord: AccountUsageRecord = {
      id: tenantId,
      tenantId,
      userCount: newUserCount,
      firmCount: newFirmCount,
      activePlan: limits.planTier,
      maxUsersAllowed: limits.maxUsers,
      maxFirmsAllowed: limits.maxFirms,
      isOverLimit,
      lastUpdated: new Date().toISOString(),
      usageHistory: history.slice(0, 50),
    };

    // Save locally
    const localKey = `${USAGE_LOCAL_STORAGE_PREFIX}${tenantId}`;
    localStorage.setItem(localKey, JSON.stringify(updatedRecord));

    // Save to Firestore 'accountUsage' collection
    if (navigator.onLine) {
      saveRecordToFirestore(ACCOUNT_USAGE_COLLECTION, tenantId, updatedRecord).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('account-usage-updated', { detail: updatedRecord }));
    return updatedRecord;
  }

  /**
   * Syncs actual user and firm counts from local/cloud DB and stores in Firestore
   */
  public static async syncTenantUsage(tenantId: string = 'tenant_default'): Promise<AccountUsageRecord> {
    const limits = getEffectiveTenantLimits(tenantId);
    const tenant = getTenantById(tenantId);

    let userCount = 1;
    try {
      const users = await dbAppUsers.getAll();
      userCount = Math.max(1, users.length);
    } catch {
      userCount = 1;
    }

    let firmCount = 1;
    try {
      const storedBiz = localStorage.getItem('mock_business');
      if (storedBiz) {
        firmCount = 1;
      }
    } catch {
      firmCount = 1;
    }

    const isOverLimit = userCount > limits.maxUsers || firmCount > limits.maxFirms;

    const record: AccountUsageRecord = {
      id: tenantId,
      tenantId,
      businessId: tenant?.id || 'local-business-id',
      userCount,
      firmCount,
      activePlan: limits.planTier,
      maxUsersAllowed: limits.maxUsers,
      maxFirmsAllowed: limits.maxFirms,
      isOverLimit,
      lastUpdated: new Date().toISOString(),
      usageHistory: [
        {
          timestamp: new Date().toISOString(),
          action: 'sync',
          userCount,
          firmCount,
          actor: 'System Auto-Sync',
        }
      ]
    };

    // Save locally
    const localKey = `${USAGE_LOCAL_STORAGE_PREFIX}${tenantId}`;
    localStorage.setItem(localKey, JSON.stringify(record));

    // Save to Firestore 'accountUsage' collection
    if (navigator.onLine) {
      saveRecordToFirestore(ACCOUNT_USAGE_COLLECTION, tenantId, record).catch(() => {});
    }

    return record;
  }
}
