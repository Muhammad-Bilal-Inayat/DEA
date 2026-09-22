import { dbAuditLogs } from './db';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';
import { AuditLog } from '../types';

export type AuditActionCategory = 
  | 'INVENTORY_CHANGE'
  | 'BILLING_HIGH_VALUE'
  | 'INVOICE_VOID_CANCEL'
  | 'TRANSACTION_DELETE'
  | 'PRICE_OVERRIDE'
  | 'RBAC_SECURITY'
  | 'SETTINGS_FEATURE_FLAGS'
  | 'NARCOTICS_SCHEDULE'
  | 'AUTH_LOGIN'
  | 'BUSINESS_SWITCH'
  | 'GENERAL_OPERATION';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ComprehensiveAuditLogEntry {
  id: string;
  businessId: string;
  businessName?: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail?: string;
  category: AuditActionCategory;
  severity: AuditSeverity;
  action: string;
  entity: string;
  entityId?: string;
  amount?: number;
  details: string;
  metadata?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  terminalHwid?: string;
  timestamp: number;
  createdAt: string;
}

const DEFAULT_HIGH_VALUE_THRESHOLD = 25000; // Rs. 25,000

/**
 * Gets high-value bill threshold from active settings
 */
export function getHighValueThreshold(): number {
  try {
    const raw = localStorage.getItem('mbi_admin_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.highValueAuditThreshold === 'number') {
        return parsed.highValueAuditThreshold;
      }
    }
  } catch {}
  return DEFAULT_HIGH_VALUE_THRESHOLD;
}

/**
 * Core function to log an audit event to both local database and Firestore
 */
export async function logAuditEvent(params: {
  category: AuditActionCategory;
  severity?: AuditSeverity;
  action: string;
  entity: string;
  entityId?: string;
  amount?: number;
  details: string;
  metadata?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  businessId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
}): Promise<ComprehensiveAuditLogEntry> {
  const currentBusinessId = params.businessId || localStorage.getItem('mbi_active_business_id') || 'local-business-id';
  let storedUser: any = null;
  try {
    const rawUser = localStorage.getItem('active_simulated_user') || localStorage.getItem('mock_session');
    if (rawUser) storedUser = JSON.parse(rawUser);
  } catch {}

  const activeRole = localStorage.getItem('active_simulated_role') || 'Primary Admin';
  const userId = params.userId || storedUser?.id || storedUser?.uid || 'admin_user';
  const userName = params.userName || storedUser?.name || storedUser?.displayName || 'Primary Admin';
  const userEmail = storedUser?.email || storedUser?.emailOrPhone || '';

  const entryId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date();

  // Automatic severity determination if not explicitly provided
  let severity: AuditSeverity = params.severity || 'INFO';
  if (!params.severity) {
    if (
      params.category === 'INVOICE_VOID_CANCEL' ||
      params.category === 'TRANSACTION_DELETE' ||
      params.category === 'RBAC_SECURITY' ||
      params.category === 'NARCOTICS_SCHEDULE'
    ) {
      severity = 'CRITICAL';
    } else if (
      params.category === 'BILLING_HIGH_VALUE' ||
      params.category === 'PRICE_OVERRIDE' ||
      params.category === 'SETTINGS_FEATURE_FLAGS'
    ) {
      severity = 'WARNING';
    }
  }

  const entry: ComprehensiveAuditLogEntry = {
    id: entryId,
    businessId: currentBusinessId,
    userId,
    userName,
    userRole: params.userRole || activeRole,
    userEmail,
    category: params.category,
    severity,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    amount: params.amount,
    details: params.details,
    metadata: params.metadata,
    previousValue: params.previousValue,
    newValue: params.newValue,
    terminalHwid: localStorage.getItem('mbi_hardware_token') || undefined,
    timestamp: Date.now(),
    createdAt: now.toISOString(),
  };

  // 1. Save to local IndexedDB (with backwards compatibility for standard AuditLog interface)
  try {
    const legacyAuditLog: AuditLog = {
      id: entry.id,
      date: new Date(entry.timestamp).toISOString().split('T')[0],
      userId: entry.userId,
      action: `${entry.category}: ${entry.action}`,
      details: entry.details,
      timestamp: new Date(entry.timestamp).toISOString(),
    };
    await dbAuditLogs.save(legacyAuditLog);
  } catch (err) {
    console.warn('Local audit log save warning:', err);
  }

  // 2. Also cache in dedicated localStorage for fast UI rendering
  try {
    const storedLogsRaw = localStorage.getItem(`mbi_audit_logs_${currentBusinessId}`) || '[]';
    const parsedLogs: ComprehensiveAuditLogEntry[] = JSON.parse(storedLogsRaw);
    parsedLogs.unshift(entry);
    // Keep max 200 locally cached
    if (parsedLogs.length > 200) parsedLogs.length = 200;
    localStorage.setItem(`mbi_audit_logs_${currentBusinessId}`, JSON.stringify(parsedLogs));
  } catch {}

  // 3. Persist to Firestore cloud logs collection under business multi-tenancy
  if (navigator.onLine) {
    try {
      saveRecordToFirestore('audit_logs', entry.id, entry).catch((e) => {
        console.warn('Async firestore audit log sync notice:', e);
      });
    } catch (e) {}
  }

  // 4. Dispatch custom event for real-time UI listening
  try {
    window.dispatchEvent(new CustomEvent('mbi-audit-event-logged', { detail: entry }));
  } catch {}

  return entry;
}

/**
 * Fetch all audit logs for a specific business from Firestore & local DB
 */
export async function fetchBusinessAuditLogs(businessId: string): Promise<ComprehensiveAuditLogEntry[]> {
  const localList: ComprehensiveAuditLogEntry[] = [];

  // Read local cache
  try {
    const localRaw = localStorage.getItem(`mbi_audit_logs_${businessId}`);
    if (localRaw) {
      localList.push(...JSON.parse(localRaw));
    }
  } catch {}

  // Read Firestore if online
  if (navigator.onLine) {
    try {
      const cloudLogs = await fetchCollectionFromFirestore('audit_logs');
      if (cloudLogs && Array.isArray(cloudLogs)) {
        const filtered = cloudLogs.filter((l: any) => l.businessId === businessId || !l.businessId);
        
        // Merge and deduplicate by id
        const map = new Map<string, ComprehensiveAuditLogEntry>();
        [...filtered, ...localList].forEach((item: any) => {
          if (item && item.id) {
            map.set(item.id, item as ComprehensiveAuditLogEntry);
          }
        });
        
        const merged = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        return merged;
      }
    } catch (e) {
      console.warn('Cloud audit logs fetch notice:', e);
    }
  }

  return localList.sort((a, b) => b.timestamp - a.timestamp);
}
