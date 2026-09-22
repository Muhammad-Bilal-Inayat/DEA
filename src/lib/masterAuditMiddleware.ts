import { v4 as uuidv4 } from 'uuid';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';

export type MasterAuditActionType =
  | 'FEATURE_TOGGLE_UPDATE'
  | 'PLAN_OVERRIDE'
  | 'ROLE_OVERRIDE'
  | 'DEVICE_AUTHORIZED'
  | 'DEVICE_REVOKED'
  | 'DEVICE_REPLACED'
  | 'HARDWARE_PRECONFIGURED'
  | 'REPLACEMENT_TOKEN_ISSUED'
  | 'REPLACEMENT_TOKEN_REDEEMED'
  | 'DATABASE_INITIALIZED'
  | 'PASSWORD_RESET'
  | 'MODULE_ACCESS_CHANGED'
  | 'SYSTEM_PARAM_CHANGED'
  | 'SECURITY_OVERRIDE';

export type MasterAuditCategory =
  | 'SECURITY'
  | 'FLEET'
  | 'ACCESS_CONTROL'
  | 'BILLING'
  | 'DATABASE'
  | 'FEATURE_SWITCHBOARD'
  | 'SYSTEM';

export interface AuditActor {
  userId?: string;
  name: string;
  role: string;
  email?: string;
  ip?: string;
}

export interface AuditTargetUser {
  userId?: string;
  name?: string;
  tenantId: string;
  firmId?: string;
  role?: string;
  plan?: string;
  deviceId?: string;
}

export interface MasterControlAuditRecord {
  id: string;
  timestamp: string;
  actionType: MasterAuditActionType;
  category: MasterAuditCategory;
  description: string;
  actor: AuditActor;
  targetUser: AuditTargetUser;
  previousState?: Record<string, any> | string | null;
  newState?: Record<string, any> | string | null;
  diffSummary?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  syncedToCloud?: boolean;
}

const MASTER_AUDIT_STORAGE_KEY = 'mbi_master_control_audit_logs_v1';

/**
 * Helper to get current actor from session
 */
function getDefaultActor(): AuditActor {
  try {
    const activeAdminStr = localStorage.getItem('mbi_master_active_session_v3');
    if (activeAdminStr) {
      const parsed = JSON.parse(activeAdminStr);
      return {
        userId: parsed.userId || 'master-root',
        name: parsed.username || 'Master Admin',
        role: 'MASTER_ADMIN',
        email: parsed.email || 'admin@mbinventra.com',
        ip: '127.0.0.1'
      };
    }
  } catch {}
  return {
    userId: 'master-root',
    name: 'Master Admin',
    role: 'MASTER_ADMIN',
    email: 'admin@mbinventra.com',
    ip: '127.0.0.1'
  };
}

/**
 * Compute readable difference between two states
 */
function computeStateDiff(prev: any, next: any): string {
  if (!prev || !next) return 'Initial state recorded';
  if (typeof prev !== 'object' || typeof next !== 'object') {
    return `Changed from "${String(prev)}" to "${String(next)}"`;
  }

  const changes: string[] = [];
  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));

  for (const key of allKeys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changes.push(`${key}: ${JSON.stringify(prev[key]) ?? 'undefined'} -> ${JSON.stringify(next[key]) ?? 'undefined'}`);
    }
  }

  return changes.length > 0 ? changes.slice(0, 10).join('; ') : 'No semantic value differences';
}

/**
 * Centralized Audit Logging Middleware for Master Control actions
 */
export async function logMasterControlAction(params: {
  actionType: MasterAuditActionType;
  category: MasterAuditCategory;
  description: string;
  targetUser: AuditTargetUser;
  actor?: Partial<AuditActor>;
  previousState?: any;
  newState?: any;
  diffSummary?: string;
  metadata?: Record<string, any>;
}): Promise<MasterControlAuditRecord> {
  const defaultActor = getDefaultActor();
  const actor: AuditActor = {
    ...defaultActor,
    ...(params.actor || {})
  };

  const diff = params.diffSummary || computeStateDiff(params.previousState, params.newState);

  const auditRecord: MasterControlAuditRecord = {
    id: 'AUD-' + uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase(),
    timestamp: new Date().toISOString(),
    actionType: params.actionType,
    category: params.category,
    description: params.description,
    actor,
    targetUser: params.targetUser,
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    diffSummary: diff,
    metadata: params.metadata || {},
    ipAddress: actor.ip || '127.0.0.1',
    syncedToCloud: false
  };

  // 1. Save locally with capped array
  try {
    const raw = localStorage.getItem(MASTER_AUDIT_STORAGE_KEY);
    const list: MasterControlAuditRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(auditRecord);
    // Retain last 500 audit entries
    localStorage.setItem(MASTER_AUDIT_STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
  } catch (e) {
    console.error('[MasterAuditMiddleware] Failed to cache audit log locally:', e);
  }

  // 2. Dispatch event for live UI reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-master-audit-recorded', { detail: auditRecord }));
  }

  // 3. Persist to Firestore cloud audit collection
  try {
    await saveRecordToFirestore('master_audit_logs', auditRecord.id, {
      ...auditRecord,
      syncedToCloud: true,
      syncedAt: new Date().toISOString()
    });
    auditRecord.syncedToCloud = true;
  } catch (err) {
    console.warn('[MasterAuditMiddleware] Firestore cloud audit sync queued for background retry:', err);
  }

  return auditRecord;
}

/**
 * Retrieve Master Control Audit Logs with optional filtering
 */
export function getMasterControlAuditLogs(filter?: {
  tenantId?: string;
  userId?: string;
  category?: MasterAuditCategory;
  actionType?: MasterAuditActionType;
}): MasterControlAuditRecord[] {
  try {
    const raw = localStorage.getItem(MASTER_AUDIT_STORAGE_KEY);
    let list: MasterControlAuditRecord[] = raw ? JSON.parse(raw) : [];

    if (filter?.tenantId && filter.tenantId !== 'all') {
      list = list.filter(l => l.targetUser?.tenantId === filter.tenantId);
    }
    if (filter?.userId) {
      list = list.filter(l => l.targetUser?.userId === filter.userId);
    }
    if (filter?.category) {
      list = list.filter(l => l.category === filter.category);
    }
    if (filter?.actionType) {
      list = list.filter(l => l.actionType === filter.actionType);
    }

    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Fetch latest audit logs directly from Firestore
 */
export async function syncAuditLogsFromFirestore(): Promise<MasterControlAuditRecord[]> {
  try {
    const cloudLogs = await fetchCollectionFromFirestore<MasterControlAuditRecord>('master_audit_logs');
    if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
      const local = getMasterControlAuditLogs();
      const map = new Map<string, MasterControlAuditRecord>();
      
      local.forEach(l => map.set(l.id, l));
      cloudLogs.forEach(c => map.set(c.id, { ...c, syncedToCloud: true }));

      const merged = Array.from(map.values()).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      localStorage.setItem(MASTER_AUDIT_STORAGE_KEY, JSON.stringify(merged.slice(0, 500)));
      return merged;
    }
  } catch (e) {
    console.warn('[MasterAuditMiddleware] Cloud fetch fallback to local logs:', e);
  }
  return getMasterControlAuditLogs();
}
