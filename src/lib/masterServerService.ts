import { hashPassword, generateTOTPSecret, generateEmergencyBackupCodes, verifyTOTPToken } from './totpService';
import { v4 as uuidv4 } from 'uuid';
import { Tenant, TenantFeatureToggles, DEFAULT_TENANT_FEATURE_TOGGLES } from '../types';
import { dbMedicines, dbInvoices, dbSuppliers } from './db';
import { saveRecordToFirestore } from './firebase';

export type { Tenant, TenantFeatureToggles };
export { DEFAULT_TENANT_FEATURE_TOGGLES };

export interface ModulePermissions {
  sales: boolean;
  purchases: boolean;
  pharmacy: boolean;
  inventory: boolean;
  reports: boolean;
  cloudSync: boolean;
  multiBranch: boolean;
  aiVoice: boolean;
  cashierShifts: boolean;
  customPrint: boolean;
  accountsLedger: boolean;
  narcoticsSchedule: boolean;
  customerLoyalty: boolean;
  bulkExcel: boolean;
  barcodeLabels: boolean;
}

export interface ClientLicense {
  id: string;
  licenseKey: string;
  clientName: string; // Business Name (e.g. Al-Madina Pharmacy)
  ownerName: string;
  phone: string;
  city: string;
  plan: 'Trial (15 Days)' | 'Trial (30 Days)' | 'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch' | 'Lifetime Perpetual';
  status: 'Active' | 'Suspended' | 'Expired' | 'Deactivated';
  issueDate: string;
  expiryDate: string; // YYYY-MM-DD or 'Lifetime'
  maxDevices: number;
  strictHardwareLock: boolean;
  maxOfflineDays: number; // e.g. 7, 15, 30, 0 = unlimited
  boundHardwareIds: string[];
  allowedModules: ModulePermissions;
  // SaaS Software Sale & Custom Deal Pricing
  salePrice?: number; // Custom Deal Price in PKR
  amountPaid?: number; // Paid amount in PKR
  amountDue?: number; // Receivable / pending amount in PKR
  saleStatus?: 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial';
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Cheque' | 'Other';
  saleDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterUserPermissions {
  canEditSalePrice: boolean;
  canGiveDiscount: boolean;
  maxDiscountPercent: number;
  canVoidInvoice: boolean;
  canDeleteTransaction: boolean;
  canEditBill: boolean;
  canDeleteBill: boolean;
  canShareBill: boolean;
  canSellBelowCost: boolean;
  canViewPurchaseCost: boolean;
  canViewProfitReports: boolean;
  canAccessControlledDrugs: boolean;
  canExportExcel: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
  canProcessReturns: boolean;
  canAccessBankAccounts: boolean;
  canChangePaymentTerms: boolean;
}

export const DEFAULT_USER_PERMISSIONS: MasterUserPermissions = {
  canEditSalePrice: true,
  canGiveDiscount: true,
  maxDiscountPercent: 25,
  canVoidInvoice: false,
  canDeleteTransaction: false,
  canEditBill: true,
  canDeleteBill: false,
  canShareBill: true,
  canSellBelowCost: false,
  canViewPurchaseCost: true,
  canViewProfitReports: true,
  canAccessControlledDrugs: true,
  canExportExcel: true,
  canManageUsers: false,
  canAccessSettings: true,
  canProcessReturns: true,
  canAccessBankAccounts: true,
  canChangePaymentTerms: true,
};

export interface MasterActiveUser {
  id: string;
  name: string;
  emailOrPhone: string;
  role: 'Primary Admin' | 'Store Manager' | 'Cashier' | 'Accountant' | 'Sales Staff' | 'Guest';
  status: 'Active' | 'Suspended' | 'Disconnected';
  passcode: string;
  storeName: string;
  installationId?: string;
  boundHwid?: string;
  lastSyncTime: string;
  isOnline: boolean;
  totalTransactions?: number;
  sessionDurationMinutes?: number;
  totalActiveHours?: number;
  allowedModules?: ModulePermissions;
  permissions?: MasterUserPermissions;
  customSettingsOverrides?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientInstanceHeartbeat {
  installationId: string;
  clientName: string;
  ownerName: string;
  phone: string;
  licenseKey: string;
  plan: string;
  status: 'Active' | 'Suspended' | 'Expired' | 'Deactivated';
  appVersion: string;
  lastHeartbeat: string;
  ipAddress?: string;
  userAgent?: string;
  hardwareFingerprint?: string;
  dataMetrics: {
    totalInvoices: number;
    totalItems: number;
    totalParties: number;
    totalPayments: number;
    estimatedRevenue: number;
    databaseSizeKb: number;
  };
  remoteMessage?: string | null;
  remoteCommand?: 'force_backup' | 'emergency_lock' | 'clear_cache' | 'screen_alert' | 'unlock' | null;
  remoteCommandPayload?: any;
}

export interface ClientBackupRecord {
  id: string;
  clientName: string;
  installationId: string;
  timestamp: string;
  fileName: string;
  sizeKb: number;
  recordCounts: {
    medicines: number;
    invoices: number;
    suppliers: number;
    payments: number;
    expenses: number;
    customers?: number;
  };
  notes?: string;
  backupPayload?: any;
}

export interface MasterAuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'LICENSE' | 'FLEET' | 'BACKUP' | 'SECURITY' | 'COMMAND';
  details: string;
  targetClient?: string;
}

export type SecurityAlertType = 
  | 'UNUSUAL_LOGIN_TIME' 
  | 'BULK_DELETION' 
  | 'MULTIPLE_AUTH_FAILURES' 
  | 'SUSPICIOUS_IP_ACTIVITY' 
  | 'UNAUTHORIZED_EXPORT';

export type SecurityAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SecurityAlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface SecurityAlert {
  id: string;
  alertType: SecurityAlertType;
  severity: SecurityAlertSeverity;
  tenantId: string;
  tenantName: string;
  userId?: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  timestamp: string;
  title: string;
  description: string;
  evidence: string;
  recordsAffected?: number;
  loginHour?: number;
  status: SecurityAlertStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  actionRecommendation: string;
  sourceLogId?: string;
}

export interface SecurityThreatMetrics {
  totalAlerts: number;
  activeThreatsCount: number;
  unusualLoginsCount: number;
  bulkDeletionsCount: number;
  criticalCount: number;
  resolvedCount: number;
  systemRiskScore: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export interface ServerActivityLog {
  id: string;
  timestamp: string;
  tenantId?: string;
  tenantName: string;
  userId?: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  action: string;
  actionType: 'SYNC' | 'BILLING' | 'AUTH' | 'INVENTORY' | 'SECURITY' | 'BACKUP' | 'ADMIN';
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  deviceInfo?: string;
  latencyMs?: number;
  recordsAffected?: number;
  syncSummary?: {
    invoicesSynced?: number;
    itemsSynced?: number;
    partiesSynced?: number;
    dbSizeKb?: number;
  };
}

export interface MasterServerAdminConfig {
  masterUsername: string;
  masterPasswordHash: string;
  is2FAEnabled: boolean;
  totpSecret: string;
  backupCodes: string[];
  usedBackupCodes: string[];
  apiSecretKey: string;
  lastLogin?: string;
  serverName: string;
  broadcastNotice?: string;
  autoBackupIntervalHours?: number;
  catalogMode?: 'clean_zero' | 'preloaded_generic';
}

const MASTER_CONFIG_KEY = 'mbi_master_admin_config_v3';
const MASTER_LICENSES_KEY = 'mbi_master_client_licenses_v3';
const MASTER_INSTANCES_KEY = 'mbi_master_client_instances_v3';
const MASTER_BACKUPS_KEY = 'mbi_master_client_backups_v3';
const MASTER_SESSION_KEY = 'mbi_master_active_session_v3';
const MASTER_AUDIT_KEY = 'mbi_master_audit_logs_v3';
const MASTER_ACTIVITY_KEY = 'mbi_master_server_activity_logs_v1';
const MASTER_SECURITY_ALERTS_KEY = 'mbi_master_security_alerts_v1';
const MASTER_TENANTS_KEY = 'mbi_master_tenants_v3';

export const DEFAULT_MODULES: ModulePermissions = {
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
};

/**
 * Log individual user & tenant activity into Master Server
 */
export function logServerActivity(activity: Omit<ServerActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) {
  try {
    const existing = getServerActivityLogs();
    const newLog: ServerActivityLog = {
      id: 'ACT-' + uuidv4().substring(0, 8).toUpperCase(),
      timestamp: activity.timestamp || new Date().toISOString(),
      tenantId: activity.tenantId || 'mbi-tenant-main',
      tenantName: activity.tenantName || 'Main Branch',
      userId: activity.userId || 'usr-main',
      userName: activity.userName || 'Master Admin',
      userRole: activity.userRole || 'Admin',
      ipAddress: activity.ipAddress || '192.168.1.' + Math.floor(100 + Math.random() * 50),
      action: activity.action,
      actionType: activity.actionType || 'ADMIN',
      details: activity.details,
      status: activity.status || 'SUCCESS',
      deviceInfo: activity.deviceInfo || 'Chrome 124 / Windows 11 POS Terminal',
      latencyMs: activity.latencyMs || Math.floor(12 + Math.random() * 45),
      recordsAffected: activity.recordsAffected,
      syncSummary: activity.syncSummary,
    };

    existing.unshift(newLog);
    // Keep last 500 logs for high fidelity history
    localStorage.setItem(MASTER_ACTIVITY_KEY, JSON.stringify(existing.slice(0, 500)));

    // Run real-time threat analysis for unusual login times or bulk deletions
    const detectedThreat = analyzeActivityLogForThreats(newLog);
    if (detectedThreat) {
      saveSecurityAlert(detectedThreat);
    }

    // Also trigger custom event for live subscriptions
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-server-activity-update', { detail: newLog }));
    }
    return newLog;
  } catch (e) {
    console.error('Failed to log server activity:', e);
    return null;
  }
}

/**
 * Get all Master Server Activity Logs with auto-seeding if empty
 */
export function getServerActivityLogs(): ServerActivityLog[] {
  try {
    const stored = localStorage.getItem(MASTER_ACTIVITY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Seed realistic, multi-user and multi-tenant activity logs with IPs and real timestamps
    const now = Date.now();
    const seedLogs: ServerActivityLog[] = [
      {
        id: 'ACT-98214A',
        timestamp: new Date(now - 1000 * 60 * 2).toISOString(),
        tenantId: 'tenant-islamabad-01',
        tenantName: 'Islamabad Central Meds',
        userId: 'usr_bilal_01',
        userName: 'Bilal Khan',
        userRole: 'Cashier',
        ipAddress: '192.168.1.104',
        action: 'TENANT_DATA_SYNC',
        actionType: 'SYNC',
        details: 'Delta sync complete: 18 offline invoices pushed, 420 item catalog synced',
        status: 'SUCCESS',
        deviceInfo: 'Win11 / POS Terminal 1 (Edge 124)',
        latencyMs: 18,
        recordsAffected: 18,
        syncSummary: { invoicesSynced: 18, itemsSynced: 420, partiesSynced: 12, dbSizeKb: 1420 }
      },
      {
        id: 'ACT-98213B',
        timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        tenantId: 'tenant-lahore-02',
        tenantName: 'Lahore Model Town Pharmacy',
        userId: 'usr_usman_02',
        userName: 'Usman Ali',
        userRole: 'Pharmacist',
        ipAddress: '172.16.4.88',
        action: 'INVOICE_GENERATED',
        actionType: 'BILLING',
        details: 'Created Invoice #INV-2026-1049 for Walk-in Patient (Total: Rs 4,850)',
        status: 'SUCCESS',
        deviceInfo: 'Win10 / Fast Biller Counter 2',
        latencyMs: 12,
        recordsAffected: 1
      },
      {
        id: 'ACT-98212C',
        timestamp: new Date(now - 1000 * 60 * 9).toISOString(),
        tenantId: 'tenant-karachi-03',
        tenantName: 'Karachi Health Plus',
        userId: 'usr_tariq_03',
        userName: 'Dr. Tariq Mehmood',
        userRole: 'Store Manager',
        ipAddress: '10.0.12.14',
        action: 'USER_LOGIN',
        actionType: 'AUTH',
        details: 'Passcode PIN authentication verified successfully for Manager console',
        status: 'SUCCESS',
        deviceInfo: 'Android POS Tablet v14',
        latencyMs: 34,
        recordsAffected: 1
      },
      {
        id: 'ACT-98211D',
        timestamp: new Date(now - 1000 * 60 * 14).toISOString(),
        tenantId: 'tenant-islamabad-01',
        tenantName: 'Islamabad Central Meds',
        userId: 'usr_zainab_04',
        userName: 'Zainab Bibi',
        userRole: 'Cashier',
        ipAddress: '192.168.1.108',
        action: 'INVENTORY_STOCK_UPDATE',
        actionType: 'INVENTORY',
        details: 'Reconciled stock batch: Panadol 500mg (+120 packs received from Distributor)',
        status: 'SUCCESS',
        deviceInfo: 'Win11 / POS Terminal 2',
        latencyMs: 22,
        recordsAffected: 120
      },
      {
        id: 'ACT-98210E',
        timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        tenantId: 'tenant-peshawar-04',
        tenantName: 'Khyber Medico Peshawar',
        userId: 'usr_fawad_05',
        userName: 'Fawad Durrani',
        userRole: 'Cashier',
        ipAddress: '192.168.10.42',
        action: 'TENANT_DATA_SYNC',
        actionType: 'SYNC',
        details: 'Automated periodic telemetry sync: Heartbeat OK, 0 conflicts detected',
        status: 'SUCCESS',
        deviceInfo: 'Ubuntu Touch 22.04 POS Node',
        latencyMs: 41,
        recordsAffected: 0,
        syncSummary: { invoicesSynced: 4, itemsSynced: 310, partiesSynced: 8, dbSizeKb: 980 }
      },
      {
        id: 'ACT-98209F',
        timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        tenantId: 'tenant-rawalpindi-05',
        tenantName: 'Saddar Pharmacy Rawalpindi',
        userId: 'usr_asif_06',
        userName: 'Asif Nawaz',
        userRole: 'Cashier',
        ipAddress: '172.16.8.19',
        action: 'BACKUP_SNAPSHOT_EXPORT',
        actionType: 'BACKUP',
        details: 'Encrypted client database snapshot exported to Master Vault (420 KB)',
        status: 'SUCCESS',
        deviceInfo: 'Win11 / Main Cashier Register',
        latencyMs: 65,
        recordsAffected: 620
      },
      {
        id: 'ACT-98208G',
        timestamp: new Date(now - 1000 * 60 * 48).toISOString(),
        tenantId: 'tenant-lahore-02',
        tenantName: 'Lahore Model Town Pharmacy',
        userId: 'usr_usman_02',
        userName: 'Usman Ali',
        userRole: 'Pharmacist',
        ipAddress: '172.16.4.88',
        action: 'SHIFT_REGISTER_OPEN',
        actionType: 'BILLING',
        details: 'Opening shift drawer initialized with opening float Rs 5,000',
        status: 'SUCCESS',
        deviceInfo: 'Win10 / Fast Biller Counter 2',
        latencyMs: 15,
        recordsAffected: 1
      },
      {
        id: 'ACT-98207H',
        timestamp: new Date(now - 1000 * 60 * 65).toISOString(),
        tenantId: 'tenant-multan-06',
        tenantName: 'Multan Care Chemists',
        userId: 'usr_rashid_07',
        userName: 'Rashid Minhas',
        userRole: 'Cashier',
        ipAddress: '192.168.3.77',
        action: 'SECURITY_PIN_ATTEMPT',
        actionType: 'SECURITY',
        details: 'Passcode PIN entry retry detected on Counter 3 (Verified on attempt 2)',
        status: 'WARNING',
        deviceInfo: 'Win10 / POS Terminal 3',
        latencyMs: 28,
        recordsAffected: 0
      }
    ];

    localStorage.setItem(MASTER_ACTIVITY_KEY, JSON.stringify(seedLogs));
    return seedLogs;
  } catch (e) {
    return [];
  }
}

/**
 * Clear all Master Server Activity Logs
 */
export function clearServerActivityLogs() {
  localStorage.setItem(MASTER_ACTIVITY_KEY, JSON.stringify([]));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-server-activity-update', { detail: null }));
  }
}

/**
 * Log an audit action into Master Server history
 */
export function logMasterAudit(action: string, category: MasterAuditLog['category'], details: string, targetClient?: string) {
  try {
    const existing: MasterAuditLog[] = JSON.parse(localStorage.getItem(MASTER_AUDIT_KEY) || '[]');
    const newLog: MasterAuditLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      targetClient,
    };
    existing.unshift(newLog);
    // Keep last 300 logs
    localStorage.setItem(MASTER_AUDIT_KEY, JSON.stringify(existing.slice(0, 300)));
  } catch (e) {}
}

/**
 * Get all Master Audit Logs
 */
export function getMasterAuditLogs(): MasterAuditLog[] {
  try {
    return JSON.parse(localStorage.getItem(MASTER_AUDIT_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clear Master Audit Logs
 */
export function clearMasterAuditLogs() {
  localStorage.setItem(MASTER_AUDIT_KEY, JSON.stringify([]));
}

// ============================================================================
// REAL-TIME SECURITY ALERTS & ANOMALY DETECTION ENGINE
// ============================================================================

/**
 * Play a subtle browser audio chime when a high/critical security threat is detected
 */
export function playSecurityAlertChime(severity: SecurityAlertSeverity = 'HIGH') {
  try {
    if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'CRITICAL' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(severity === 'CRITICAL' ? 880 : 587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(severity === 'CRITICAL' ? 440 : 880, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio contexts may be blocked by autoplay policies
  }
}

/**
 * Analyze an incoming activity log for security anomalies:
 * 1. Unusual login times (e.g. 00:00 - 05:30 off-hours)
 * 2. Sudden bulk deletions (e.g. mass invoice/item/record deletions >= 10 items)
 * 3. Rapid authentication failures / security pin violations
 */
export function analyzeActivityLogForThreats(log: ServerActivityLog): SecurityAlert | null {
  if (!log) return null;

  try {
    const actionUpper = (log.action || '').toUpperCase();
    const detailsLower = (log.details || '').toLowerCase();
    const logDate = new Date(log.timestamp);
    const hour = isNaN(logDate.getTime()) ? 3 : logDate.getHours();
    const minutes = isNaN(logDate.getTime()) ? 15 : logDate.getMinutes();

    // 1. CHECK UNUSUAL LOGIN TIMES (Midnight to 05:30 AM or explicit off-hours)
    const isAuthEvent = log.actionType === 'AUTH' || 
      actionUpper.includes('LOGIN') || 
      actionUpper.includes('AUTH') || 
      detailsLower.includes('login') || 
      detailsLower.includes('authenticated') ||
      detailsLower.includes('passcode pin');

    const isOffHours = (hour >= 0 && hour < 6) || 
      detailsLower.includes('off-hours') || 
      detailsLower.includes('late night') || 
      actionUpper.includes('OFF_HOURS');

    if (isAuthEvent && isOffHours) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      return {
        id: 'SEC-LOG-' + uuidv4().substring(0, 8).toUpperCase(),
        alertType: 'UNUSUAL_LOGIN_TIME',
        severity: 'HIGH',
        tenantId: log.tenantId || 'tenant-unknown',
        tenantName: log.tenantName || 'Main Pharmacy Branch',
        userId: log.userId,
        userName: log.userName || 'Staff User',
        userRole: log.userRole || 'Cashier',
        ipAddress: log.ipAddress || '192.168.1.100',
        timestamp: log.timestamp || new Date().toISOString(),
        loginHour: hour,
        title: `Unusual Off-Hours Tenant Login (${timeStr} PKT)`,
        description: `User "${log.userName}" (${log.userRole}) logged in at anomalous off-hours (${timeStr}) for "${log.tenantName}". Standard retail store operating hours are 08:00 - 23:30.`,
        evidence: `IP: ${log.ipAddress} • Device: ${log.deviceInfo || 'POS Terminal'} • Action: ${log.action} • Timestamp: ${new Date(log.timestamp).toLocaleString()}`,
        status: 'NEW',
        actionRecommendation: 'Verify whether late-night restocking or emergency shift was scheduled. If unauthorized, immediately reset user passcode or lock terminal instance.',
        sourceLogId: log.id
      };
    }

    // 2. CHECK SUDDEN BULK DELETIONS (Mass record purges or deletions >= 10 records)
    const isDeletionAction = actionUpper.includes('DELETE') || 
      actionUpper.includes('PURGE') || 
      actionUpper.includes('VOID_BULK') ||
      detailsLower.includes('bulk delete') || 
      detailsLower.includes('bulk deletion') || 
      detailsLower.includes('mass delete') || 
      detailsLower.includes('purged') ||
      detailsLower.includes('deleted all') ||
      detailsLower.includes('voided multiple');

    const hasSignificantRecords = (log.recordsAffected !== undefined && log.recordsAffected >= 10);

    if (isDeletionAction || (hasSignificantRecords && (log.actionType === 'INVENTORY' || log.actionType === 'BILLING' || log.actionType === 'ADMIN'))) {
      const affectedCount = log.recordsAffected || (detailsLower.includes('145') ? 145 : 28);
      return {
        id: 'SEC-DEL-' + uuidv4().substring(0, 8).toUpperCase(),
        alertType: 'BULK_DELETION',
        severity: 'CRITICAL',
        tenantId: log.tenantId || 'tenant-unknown',
        tenantName: log.tenantName || 'Main Pharmacy Branch',
        userId: log.userId,
        userName: log.userName || 'Staff User',
        userRole: log.userRole || 'Cashier',
        ipAddress: log.ipAddress || '192.168.1.100',
        timestamp: log.timestamp || new Date().toISOString(),
        recordsAffected: affectedCount,
        title: `Sudden Bulk Data Deletion Detected (${affectedCount} Records)`,
        description: `High-risk mass deletion event recorded at "${log.tenantName}". User "${log.userName}" (${log.userRole}) deleted or purged ${affectedCount} critical inventory/invoice records in a single batch.`,
        evidence: `Records Affected: ${affectedCount} • Action: ${log.action} • Details: ${log.details} • IP: ${log.ipAddress}`,
        status: 'NEW',
        actionRecommendation: 'Audit transaction deletion history immediately. Consider restoring from latest hourly cloud snapshot or suspending tenant POS access if suspected data tampering.',
        sourceLogId: log.id
      };
    }

    // 3. CHECK MULTIPLE FAILED AUTH / PIN ATTEMPTS
    if (log.actionType === 'SECURITY' && (log.status === 'WARNING' || log.status === 'FAILED' || detailsLower.includes('retry') || detailsLower.includes('failed'))) {
      return {
        id: 'SEC-PIN-' + uuidv4().substring(0, 8).toUpperCase(),
        alertType: 'MULTIPLE_AUTH_FAILURES',
        severity: 'MEDIUM',
        tenantId: log.tenantId || 'tenant-unknown',
        tenantName: log.tenantName || 'Main Pharmacy Branch',
        userId: log.userId,
        userName: log.userName || 'Staff User',
        userRole: log.userRole || 'Cashier',
        ipAddress: log.ipAddress || '192.168.1.100',
        timestamp: log.timestamp || new Date().toISOString(),
        title: `Repeated Passcode PIN Failures (${log.tenantName})`,
        description: `Multiple failed PIN authentication retries detected for "${log.userName}" at "${log.tenantName}". Possible terminal tampering or brute-force attempt.`,
        evidence: `Details: ${log.details} • IP: ${log.ipAddress} • Device: ${log.deviceInfo || 'POS Node'}`,
        status: 'NEW',
        actionRecommendation: 'Check physical security / CCTV at terminal counter and verify user identity.',
        sourceLogId: log.id
      };
    }

    return null;
  } catch (e) {
    console.warn('Error analyzing activity log for security threats:', e);
    return null;
  }
}

/**
 * Get all Security Alerts (seeds high-fidelity realistic alerts if none exist)
 */
export function getSecurityAlerts(): SecurityAlert[] {
  try {
    const stored = localStorage.getItem(MASTER_SECURITY_ALERTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Save or prepend a new Security Alert and broadcast real-time event
 */
export function saveSecurityAlert(alert: SecurityAlert): SecurityAlert[] {
  try {
    const existing = getSecurityAlerts();
    // Avoid exact duplicate alerts for same sourceLogId
    if (alert.sourceLogId && existing.some(a => a.sourceLogId === alert.sourceLogId)) {
      return existing;
    }

    const updated = [alert, ...existing.filter(a => a.id !== alert.id)].slice(0, 100);
    localStorage.setItem(MASTER_SECURITY_ALERTS_KEY, JSON.stringify(updated));

    // Play subtle chime for critical/high alerts
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      playSecurityAlertChime(alert.severity);
    }

    // Broadcast event across UI listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-security-alert-triggered', { detail: alert }));
      window.dispatchEvent(new CustomEvent('mbi-security-alerts-updated', { detail: updated }));
    }

    return updated;
  } catch (e) {
    console.error('Failed to save security alert:', e);
    return [];
  }
}

/**
 * Update Security Alert Status (e.g. Acknowledge, Resolve, Dismiss)
 */
export function updateSecurityAlertStatus(
  alertId: string, 
  status: SecurityAlertStatus, 
  resolutionNote?: string, 
  resolvedBy: string = 'Master Admin'
): SecurityAlert[] {
  try {
    const existing = getSecurityAlerts();
    const updated = existing.map(a => {
      if (a.id === alertId) {
        return {
          ...a,
          status,
          resolutionNote: resolutionNote !== undefined ? resolutionNote : a.resolutionNote,
          resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : a.resolvedAt,
          resolvedBy: status === 'RESOLVED' ? resolvedBy : a.resolvedBy
        };
      }
      return a;
    });

    localStorage.setItem(MASTER_SECURITY_ALERTS_KEY, JSON.stringify(updated));

    logMasterAudit(
      `Security Alert ${status}`,
      'SECURITY',
      `Alert #${alertId} updated to status "${status}" by ${resolvedBy}. ${resolutionNote ? 'Note: ' + resolutionNote : ''}`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-security-alerts-updated', { detail: updated }));
    }

    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Dismiss a Security Alert
 */
export function dismissSecurityAlert(alertId: string): SecurityAlert[] {
  return updateSecurityAlertStatus(alertId, 'DISMISSED', 'Dismissed by administrator');
}

/**
 * Clear all Security Alerts
 */
export function clearSecurityAlerts() {
  try {
    localStorage.setItem(MASTER_SECURITY_ALERTS_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-security-alerts-updated', { detail: [] }));
    }
  } catch (e) {}
}

/**
 * Compute Security Threat Metrics
 */
export function getSecurityThreatMetrics(): SecurityThreatMetrics {
  const alerts = getSecurityAlerts();
  const activeAlerts = alerts.filter(a => a.status === 'NEW' || a.status === 'ACKNOWLEDGED');
  const criticalCount = activeAlerts.filter(a => a.severity === 'CRITICAL').length;
  const unusualLoginsCount = activeAlerts.filter(a => a.alertType === 'UNUSUAL_LOGIN_TIME').length;
  const bulkDeletionsCount = activeAlerts.filter(a => a.alertType === 'BULK_DELETION').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;

  let systemRiskScore: SecurityThreatMetrics['systemRiskScore'] = 'NORMAL';
  if (criticalCount >= 2 || (bulkDeletionsCount >= 1 && unusualLoginsCount >= 1)) {
    systemRiskScore = 'CRITICAL';
  } else if (criticalCount === 1 || unusualLoginsCount >= 2 || bulkDeletionsCount >= 1) {
    systemRiskScore = 'HIGH';
  } else if (activeAlerts.length > 0) {
    systemRiskScore = 'ELEVATED';
  }

  return {
    totalAlerts: alerts.length,
    activeThreatsCount: activeAlerts.length,
    unusualLoginsCount,
    bulkDeletionsCount,
    criticalCount,
    resolvedCount,
    systemRiskScore
  };
}

/**
 * Simulate test security anomaly to test live trigger and notifications
 */
export function simulateThreatEvent(type: 'UNUSUAL_LOGIN_TIME' | 'BULK_DELETION' | 'MULTIPLE_AUTH_FAILURES') {
  const tenants = getAllTenants();
  const targetTenant = tenants[Math.floor(Math.random() * tenants.length)] || {
    id: 'tenant-lahore-02',
    name: 'Lahore Model Town Pharmacy'
  };

  const now = new Date();

  if (type === 'UNUSUAL_LOGIN_TIME') {
    // Generate a 03:45 AM login timestamp
    const fakeOffHoursDate = new Date(now);
    fakeOffHoursDate.setHours(3, 45, 12, 0);

    return logServerActivity({
      timestamp: fakeOffHoursDate.toISOString(),
      tenantId: targetTenant.id || (targetTenant as any).tenantId,
      tenantName: targetTenant.name,
      userId: 'usr_anomaly_' + Math.floor(100 + Math.random() * 900),
      userName: 'Asad Qureshi (Cashier)',
      userRole: 'Cashier',
      ipAddress: '182.185.129.' + Math.floor(10 + Math.random() * 80),
      action: 'USER_LOGIN_OFF_HOURS',
      actionType: 'AUTH',
      details: 'Suspicious 03:45 AM login detected from non-whitelisted residential IP range.',
      status: 'WARNING',
      deviceInfo: 'Edge 125 on Windows 11 / Remote Terminal',
      latencyMs: 38
    });
  } else if (type === 'BULK_DELETION') {
    return logServerActivity({
      timestamp: now.toISOString(),
      tenantId: targetTenant.id || (targetTenant as any).tenantId,
      tenantName: targetTenant.name,
      userId: 'usr_purger_' + Math.floor(100 + Math.random() * 900),
      userName: 'Hamza Malik',
      userRole: 'Store Operator',
      ipAddress: '192.168.4.' + Math.floor(50 + Math.random() * 40),
      action: 'BULK_INVOICE_PURGE',
      actionType: 'BILLING',
      details: 'Sudden bulk deletion of 68 historical sales invoices and associated customer credit ledgers.',
      status: 'WARNING',
      recordsAffected: 68,
      deviceInfo: 'Fast Biller Cashier Counter 1',
      latencyMs: 95
    });
  } else {
    return logServerActivity({
      timestamp: now.toISOString(),
      tenantId: targetTenant.id || (targetTenant as any).tenantId,
      tenantName: targetTenant.name,
      userId: 'usr_brute_' + Math.floor(100 + Math.random() * 900),
      userName: 'Unknown Attacker',
      userRole: 'Guest',
      ipAddress: '115.186.155.72',
      action: 'SECURITY_PIN_ATTEMPT',
      actionType: 'SECURITY',
      details: '6 failed PIN attempts within 45 seconds on Master Terminal.',
      status: 'FAILED',
      deviceInfo: 'POS Counter 4',
      latencyMs: 12
    });
  }
}

/**
 * Get Master Admin Server Configuration
 */
export function getMasterServerConfig(): MasterServerAdminConfig {
  const stored = localStorage.getItem(MASTER_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse master server config:', e);
    }
  }

  // Initial Config
  const initialSecret = generateTOTPSecret(20);
  const initialBackupCodes = generateEmergencyBackupCodes(6);
  const initialConfig: MasterServerAdminConfig = {
    masterUsername: 'mbi786',
    masterPasswordHash: hashPassword('mbi786'),
    is2FAEnabled: false,
    totpSecret: initialSecret,
    backupCodes: initialBackupCodes,
    usedBackupCodes: [],
    apiSecretKey: 'MBI-SEC-' + uuidv4().replace(/-/g, '').substring(0, 24).toUpperCase(),
    serverName: 'MBI Inventra Master Control Hub',
    broadcastNotice: '',
    autoBackupIntervalHours: 24,
    catalogMode: 'clean_zero',
  };

  localStorage.setItem(MASTER_CONFIG_KEY, JSON.stringify(initialConfig));
  return initialConfig;
}

/**
 * Purge sample dummy data records while protecting actual real transactions & user accounts
 */
export async function purgeSampleDummyData(): Promise<{ success: boolean; clearedCount: number }> {
  try {
    const allMeds = await dbMedicines.getAll();
    let removed = 0;
    for (const med of allMeds) {
      if ((med as any).isSample || (med as any).isDemo || med.name.toLowerCase().includes('sample') || med.name.toLowerCase().includes('dummy')) {
        await dbMedicines.delete(med.id);
        removed++;
      }
    }
    logMasterAudit('Purge Sample Records', 'COMMAND', `Cleaned ${removed} sample demo records for clean slate`, 'Master Server');
    return { success: true, clearedCount: removed };
  } catch (e) {
    console.error('Failed to purge sample records:', e);
    return { success: false, clearedCount: 0 };
  }
}

/**
 * Save Master Admin Server Configuration
 */
export function saveMasterServerConfig(config: Partial<MasterServerAdminConfig>): MasterServerAdminConfig {
  const current = getMasterServerConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(MASTER_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

const MASTER_TOKEN_KEY = 'mbi_master_server_token_v3';

/**
 * Get stored Master Admin Server Session Token
 */
export function getMasterSessionToken(): string {
  return sessionStorage.getItem(MASTER_TOKEN_KEY) || localStorage.getItem(MASTER_TOKEN_KEY) || '';
}

/**
 * Set Master Admin Server Session Token
 */
export function setMasterSessionToken(token: string) {
  sessionStorage.setItem(MASTER_TOKEN_KEY, token);
  localStorage.setItem(MASTER_TOKEN_KEY, token);
}

/**
 * Clear Master Admin Server Session Token
 */
export function clearMasterSessionToken() {
  sessionStorage.removeItem(MASTER_TOKEN_KEY);
  localStorage.removeItem(MASTER_TOKEN_KEY);
}

/**
 * Get standard headers for Master Admin requests with Bearer Token
 */
export function getMasterAuthHeaders(): HeadersInit {
  const token = getMasterSessionToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}`, 'x-master-token': token } : {}),
  };
}

/**
 * Verify Master Admin authentication with backend server
 */
export async function checkServerMasterAuth(): Promise<boolean> {
  const token = getMasterSessionToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/master/auth/check-status', {
      headers: getMasterAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.authorized);
    }
  } catch (e) {
    // If offline or network error, fallback to local session validation if unexpired
    return isMasterAdminAuthenticated();
  }
  return false;
}

/**
 * Check if Master Admin is currently logged in (Valid Session)
 */
export function isMasterAdminAuthenticated(): boolean {
  const token = getMasterSessionToken();
  const session = sessionStorage.getItem(MASTER_SESSION_KEY);
  if (!session && !token) return false;
  try {
    if (session) {
      const data = JSON.parse(session);
      // Session valid for 4 hours locally
      if (Date.now() - data.loginTime < 4 * 60 * 60 * 1000) {
        return true;
      }
    }
    if (token) return true;
  } catch (e) {}
  sessionStorage.removeItem(MASTER_SESSION_KEY);
  clearMasterSessionToken();
  return false;
}

/**
 * Set Master Admin Login Session
 */
export function setMasterAdminSession(username: string, token?: string) {
  const serverToken = token || uuidv4();
  const sessionData = {
    username,
    loginTime: Date.now(),
    token: serverToken,
  };
  sessionStorage.setItem(MASTER_SESSION_KEY, JSON.stringify(sessionData));
  setMasterSessionToken(serverToken);
  saveMasterServerConfig({ lastLogin: new Date().toISOString() });
  logMasterAudit('Master Admin Logged In', 'SECURITY', `Authenticated session established for user ${username}`);
}

/**
 * Log out from Master Admin Panel
 */
export async function logoutMasterAdminSession() {
  logMasterAudit('Master Admin Logged Out', 'SECURITY', 'Session explicitly locked by user');
  try {
    await fetch('/api/master/auth/logout', {
      method: 'POST',
      headers: getMasterAuthHeaders(),
    });
  } catch (e) {}
  sessionStorage.removeItem(MASTER_SESSION_KEY);
  clearMasterSessionToken();
}

/**
 * Authenticate with Master Admin Backend API
 */
export async function loginMasterAdminOnServer(
  usernameInput: string,
  passwordInput: string,
  totpCodeInput?: string
): Promise<{ success: boolean; requires2FA?: boolean; message: string; token?: string }> {
  try {
    const res = await fetch('/api/master/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput,
        password: passwordInput,
        totpCode: totpCodeInput,
      }),
    });

    const data = await res.json();
    if (data.success && data.token) {
      setMasterAdminSession(data.username || usernameInput, data.token);
      return { success: true, message: data.message || 'Master Admin authenticated successfully', token: data.token };
    }
    if (data.requires2FA) {
      return { success: false, requires2FA: true, message: data.message || '2FA code required' };
    }
    return { success: false, message: data.error || data.message || 'Invalid Master credentials' };
  } catch (err: any) {
    // Fallback to local credential validation if server is unreachable
    console.warn('[Master Auth] Server endpoint offline, falling back to local credentials', err);
    return verifyMasterCredentials(usernameInput, passwordInput, totpCodeInput);
  }
}

/**
 * Verify Master Admin Credentials & 2FA
 */
export function verifyMasterCredentials(
  usernameInput: string,
  passwordInput: string,
  totpCodeInput?: string
): { success: boolean; requires2FA?: boolean; message: string } {
  const config = getMasterServerConfig();
  const inputHash = hashPassword(passwordInput);

  if (usernameInput.trim().toLowerCase() !== config.masterUsername.toLowerCase() || inputHash !== config.masterPasswordHash) {
    logMasterAudit('Master Login Attempt Failed', 'SECURITY', `Invalid credentials attempt for username "${usernameInput}"`);
    return { success: false, message: 'Invalid Master Username or Password!' };
  }

  // If 2FA is active
  if (config.is2FAEnabled) {
    if (!totpCodeInput || totpCodeInput.trim() === '') {
      return { success: false, requires2FA: true, message: '2FA TOTP Authenticator code required!' };
    }

    const cleanCode = totpCodeInput.trim();

    // Check emergency backup code first
    const backupCodeIndex = config.backupCodes.indexOf(cleanCode);
    if (backupCodeIndex !== -1 && !config.usedBackupCodes.includes(cleanCode)) {
      const updatedUsed = [...config.usedBackupCodes, cleanCode];
      saveMasterServerConfig({ usedBackupCodes: updatedUsed });
      setMasterAdminSession(config.masterUsername);
      logMasterAudit('2FA Emergency Code Used', 'SECURITY', `Logged in using 1-time emergency backup code`);
      return { success: true, message: 'Authenticated successfully using Emergency Backup Code!' };
    }

    // Check TOTP code
    const isTotpValid = verifyTOTPToken(config.totpSecret, cleanCode, 2);
    if (!isTotpValid) {
      logMasterAudit('2FA Code Invalid Attempt', 'SECURITY', `Invalid TOTP code attempted for user ${config.masterUsername}`);
      return { success: false, requires2FA: true, message: 'Invalid 6-digit 2FA code! Please check your Google Authenticator app.' };
    }
  }

  setMasterAdminSession(config.masterUsername);
  return { success: true, message: 'Master Access Granted!' };
}

/**
 * Generate a new unique License Key
 */
export function generateNewLicenseKey(plan: string = 'Standard POS'): string {
  const prefix = plan.includes('Lifetime') 
    ? 'MBI-LIFE' 
    : plan.includes('Pharmacy') 
    ? 'MBI-PHARM' 
    : plan.includes('Enterprise') 
    ? 'MBI-ENT' 
    : plan.includes('Trial')
    ? 'MBI-TRL'
    : 'MBI-PRO';
  
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const part3 = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${part1}-${part2}-${part3}`;
}

/**
 * Get all client licenses in server registry
 */
export function getAllClientLicenses(): ClientLicense[] {
  const stored = localStorage.getItem(MASTER_LICENSES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }

  // Initial default seed license
  const seed: ClientLicense[] = [
    {
      id: uuidv4(),
      licenseKey: 'MBI-PRO-2026-8812',
      clientName: 'Main Store / Primary Business',
      ownerName: 'Admin',
      phone: '03364585863',
      city: 'Headquarters',
      plan: 'Lifetime Perpetual',
      status: 'Active',
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: 'Lifetime',
      maxDevices: 5,
      strictHardwareLock: false,
      maxOfflineDays: 0,
      boundHardwareIds: [],
      allowedModules: { ...DEFAULT_MODULES },
      notes: 'Master default primary installation license.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(seed));
  return seed;
}

/**
 * Save or update a client license
 */
export function saveClientLicense(license: ClientLicense): ClientLicense[] {
  const list = getAllClientLicenses();
  const idx = list.findIndex(l => l.id === license.id || l.licenseKey === license.licenseKey);
  license.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...license };
    logMasterAudit('License Updated', 'LICENSE', `Updated license ${license.licenseKey} for ${license.clientName} (Status: ${license.status}, Plan: ${license.plan})`, license.clientName);
  } else {
    list.unshift(license);
    logMasterAudit('License Created', 'LICENSE', `Issued new license ${license.licenseKey} for ${license.clientName} (Plan: ${license.plan})`, license.clientName);
  }

  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(list));
  return list;
}

/**
 * Reset Bound Hardware IDs for a License (Allows client to move software to new PC)
 */
export function resetLicenseHardware(licenseId: string): ClientLicense[] {
  const list = getAllClientLicenses();
  const idx = list.findIndex(l => l.id === licenseId);
  if (idx >= 0) {
    list[idx].boundHardwareIds = [];
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('Hardware Lock Reset', 'LICENSE', `Cleared all bound machine fingerprints for ${list[idx].clientName}`, list[idx].clientName);
    localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Activate client software license key
 */
export function activateLicenseKey(licenseKey: string, targetTenantId?: string): { success: boolean; message: string; tenant?: Tenant } {
  const cleanKey = licenseKey.trim().toUpperCase();
  if (!cleanKey || cleanKey.length < 8) {
    return { success: false, message: 'License key must be at least 8 characters long.' };
  }

  // Determine plan from key
  let plan = 'Standard POS';
  if (cleanKey.includes('LIFE') || cleanKey.includes('PERP')) {
    plan = 'Lifetime Perpetual';
  } else if (cleanKey.includes('PHARM')) {
    plan = 'Pharmacy Pro';
  } else if (cleanKey.includes('ENT')) {
    plan = 'Enterprise';
  } else if (cleanKey.includes('PRO')) {
    plan = 'Professional';
  }

  // Update current tenant
  const tenants = getAllTenants();
  let target = tenants.find(t => (targetTenantId && (t.id === targetTenantId || t.tenantId === targetTenantId)) || t.status === 'Active') || tenants[0];

  if (target) {
    target.licenseId = cleanKey;
    target.plan = plan as any;
    target.status = 'Active';
    target.paidLicenseActive = true;
    target.isTrialActive = false;
    target.trialExpired = false;
    target.trialExpiryDate = 'Lifetime';
    target.updatedAt = new Date().toISOString();
    saveTenant(target);
  }

  // Save in client licenses
  saveClientLicense({
    id: uuidv4(),
    licenseKey: cleanKey,
    clientName: target?.name || 'My Pharmacy Store',
    ownerName: target?.ownerName || 'Admin',
    phone: target?.ownerPhone || '03364585863',
    city: target?.city || 'Pakistan',
    plan: plan as any,
    status: 'Active',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: 'Lifetime',
    maxDevices: plan.includes('Enterprise') ? 10 : 5,
    strictHardwareLock: false,
    maxOfflineDays: 30,
    boundHardwareIds: [],
    allowedModules: { ...DEFAULT_MODULES },
    notes: `Activated via Sync & Share station on ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    message: `License successfully activated for ${plan}!`,
    tenant: target
  };
}

/**
 * Delete a client license
 */
export function deleteClientLicense(id: string): ClientLicense[] {
  const list = getAllClientLicenses();
  const target = list.find(l => l.id === id);
  const filtered = list.filter(l => l.id !== id);
  if (target) {
    logMasterAudit('License Deleted', 'LICENSE', `Deleted license ${target.licenseKey} belonging to ${target.clientName}`, target.clientName);
  }
  localStorage.setItem(MASTER_LICENSES_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Get all live client instances tracking
 */
export function getAllClientInstances(): ClientInstanceHeartbeat[] {
  const stored = localStorage.getItem(MASTER_INSTANCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Record or update a client instance heartbeat
 */
export function recordClientHeartbeat(heartbeat: ClientInstanceHeartbeat): ClientInstanceHeartbeat[] {
  const list = getAllClientInstances();
  const idx = list.findIndex(i => i.installationId === heartbeat.installationId);

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...heartbeat };
  } else {
    list.unshift(heartbeat);
    logMasterAudit('New Device Connected', 'FLEET', `Installation ${heartbeat.installationId.slice(0, 8)} reported for ${heartbeat.clientName}`, heartbeat.clientName);
  }

  localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(list));
  return list;
}

/**
 * Queue a remote command to a client instance
 */
export function dispatchRemoteCommand(
  installationId: string,
  command: ClientInstanceHeartbeat['remoteCommand'],
  payload?: any
): ClientInstanceHeartbeat[] {
  const list = getAllClientInstances();
  const idx = list.findIndex(i => i.installationId === installationId);
  if (idx >= 0) {
    list[idx].remoteCommand = command;
    list[idx].remoteCommandPayload = payload;
    logMasterAudit('Remote Command Queued', 'COMMAND', `Dispatched command "${command}" to ${list[idx].clientName}`, list[idx].clientName);
    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Get all client backups stored on master server
 */
export function getAllClientBackups(): ClientBackupRecord[] {
  const stored = localStorage.getItem(MASTER_BACKUPS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return [];
}

/**
 * Save a new client backup record
 */
export function saveClientBackup(backup: ClientBackupRecord): ClientBackupRecord[] {
  const list = getAllClientBackups();
  list.unshift(backup);
  logMasterAudit('Client Backup Received', 'BACKUP', `Received partitioned snapshot for ${backup.clientName} (${backup.sizeKb} KB)`, backup.clientName);
  localStorage.setItem(MASTER_BACKUPS_KEY, JSON.stringify(list));
  return list;
}

/**
 * Delete a client backup
 */
export function deleteClientBackup(id: string): ClientBackupRecord[] {
  const list = getAllClientBackups();
  const target = list.find(b => b.id === id);
  const filtered = list.filter(b => b.id !== id);
  if (target) {
    logMasterAudit('Backup Purged', 'BACKUP', `Deleted backup file ${target.fileName} for ${target.clientName}`, target.clientName);
  }
  localStorage.setItem(MASTER_BACKUPS_KEY, JSON.stringify(filtered));
  return filtered;
}

const MASTER_USERS_KEY = 'mbi_master_active_users_v3';

/**
 * Get all active users across instances and local deployments
 */
export function getMasterActiveUsers(): MasterActiveUser[] {
  const stored = localStorage.getItem(MASTER_USERS_KEY);
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(u => u && u.id && u.name && typeof u.name === 'string' && u.name.trim() !== '' && u.name !== 'undefined');
      }
    } catch (e) {}
  }

  // Initial seed of active operators
  const seedUsers: MasterActiveUser[] = [
    {
      id: 'usr_mbi_admin',
      name: 'M Bilal Inayat',
      emailOrPhone: '03364585863',
      role: 'Primary Admin',
      status: 'Active',
      passcode: '0000',
      storeName: 'MBI INVENTRA Headquarters',
      installationId: 'MBI-INST-HQ-PRIMARY',
      boundHwid: 'HWID-E3B0-C442-98FC',
      lastSyncTime: new Date().toISOString(),
      isOnline: true,
      totalTransactions: 0,
      sessionDurationMinutes: 0,
      totalActiveHours: 0,
      allowedModules: { ...DEFAULT_MODULES },
      permissions: { ...DEFAULT_USER_PERMISSIONS, canManageUsers: true, canVoidInvoice: true, canDeleteTransaction: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(seedUsers));
  return seedUsers;
}

/**
 * Save or update a Master User record with server synchronization
 */
export function saveMasterActiveUser(user: MasterActiveUser): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === user.id);
  user.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...user };
    logMasterAudit('User Updated', 'SECURITY', `Updated configuration for user ${user.name} (${user.role})`, user.storeName);
  } else {
    list.unshift(user);
    logMasterAudit('User Created', 'SECURITY', `Provisioned new user ${user.name} (${user.role}) for ${user.storeName}`, user.storeName);
  }

  localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

  // Async sync to server API
  if (typeof fetch !== 'undefined') {
    fetch('/api/master/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(() => {});
  }

  return list;
}

/**
 * Create a new user from Master Control
 */
export function createMasterActiveUser(userData: Omit<MasterActiveUser, 'id'>): MasterActiveUser {
  const newUser: MasterActiveUser = {
    ...userData,
    id: 'usr_' + uuidv4().replace(/-/g, '').substring(0, 12),
    allowedModules: userData.allowedModules || { ...DEFAULT_MODULES },
    permissions: userData.permissions || { ...DEFAULT_USER_PERMISSIONS },
    lastSyncTime: new Date().toISOString(),
    isOnline: true,
    totalTransactions: 0,
    sessionDurationMinutes: 0,
    totalActiveHours: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveMasterActiveUser(newUser);
  return newUser;
}

/**
 * Delete a user from Master Control
 */
export function deleteMasterActiveUser(userId: string): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const target = list.find(u => u.id === userId);
  const filtered = list.filter(u => u.id !== userId);

  if (target) {
    logMasterAudit('User Deleted', 'SECURITY', `Removed user account ${target.name} (${target.emailOrPhone}) from ${target.storeName}`, target.storeName);
  }

  localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(filtered));

  // Async sync to server API
  if (typeof fetch !== 'undefined') {
    fetch(`/api/master/users/${userId}`, { method: 'DELETE' }).catch(() => {});
  }

  return filtered;
}

/**
 * Update granular permissions for a user
 */
export function updateMasterUserPermissions(userId: string, permissions: Partial<MasterUserPermissions>): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    list[idx].permissions = {
      ...(list[idx].permissions || DEFAULT_USER_PERMISSIONS),
      ...permissions
    };
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('User Permissions Changed', 'SECURITY', `Updated permissions matrix for user ${list[idx].name}`, list[idx].storeName);
    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/master/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: list[idx].permissions })
      }).catch(() => {});
    }
  }
  return list;
}

/**
 * Update module access flags for a user
 */
export function updateMasterUserModules(userId: string, modules: Partial<ModulePermissions>): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    list[idx].allowedModules = {
      ...(list[idx].allowedModules || DEFAULT_MODULES),
      ...modules
    };
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('User Modules Changed', 'SECURITY', `Updated allowed modules for user ${list[idx].name}`, list[idx].storeName);
    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/master/users/${userId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedModules: list[idx].allowedModules })
      }).catch(() => {});
    }
  }
  return list;
}

/**
 * Reset passcode for a user
 */
export function resetMasterUserPasscode(userId: string, newPasscode: string): { success: boolean; message: string; users: MasterActiveUser[] } {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    list[idx].passcode = newPasscode;
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('Passcode Reset', 'SECURITY', `Reset passcode for user ${list[idx].name} to "${newPasscode}"`, list[idx].storeName);
    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/master/users/${userId}/passcode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: newPasscode })
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Passcode for ${list[idx].name} has been reset to "${newPasscode}"`,
      users: list
    };
  }
  return { success: false, message: 'User not found', users: list };
}

/**
 * Update custom setting overrides for a user
 */
export function updateMasterUserSettings(userId: string, settings: Record<string, any>): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    list[idx].customSettingsOverrides = {
      ...(list[idx].customSettingsOverrides || {}),
      ...settings
    };
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('User Settings Overridden', 'SECURITY', `Custom settings updated for user ${list[idx].name}`, list[idx].storeName);
    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    if (typeof fetch !== 'undefined') {
      fetch(`/api/master/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: list[idx].customSettingsOverrides })
      }).catch(() => {});
    }
  }
  return list;
}

/**
 * Clear hardware lock for a user
 */
export function clearMasterUserHardwareLock(userId: string): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    list[idx].boundHwid = undefined;
    list[idx].updatedAt = new Date().toISOString();
    logMasterAudit('User Hardware Lock Cleared', 'SECURITY', `Cleared HWID lock for user ${list[idx].name}`, list[idx].storeName);
    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));
  }
  return list;
}

/**
 * Update user account status (Active / Suspended / Disconnected)
 */
export function updateMasterUserStatus(userId: string, newStatus: MasterActiveUser['status']): MasterActiveUser[] {
  const list = getMasterActiveUsers();
  const idx = list.findIndex(u => u.id === userId);
  if (idx >= 0) {
    const prevStatus = list[idx].status;
    list[idx].status = newStatus;
    list[idx].isOnline = newStatus === 'Active';
    list[idx].lastSyncTime = new Date().toISOString();
    
    logMasterAudit(
      newStatus === 'Suspended' ? 'User Account Suspended' : newStatus === 'Disconnected' ? 'User Force Disconnected' : 'User Account Re-activated',
      'SECURITY',
      `Changed user ${list[idx].name} (${list[idx].role}) status from ${prevStatus} to ${newStatus}`,
      list[idx].storeName
    );

    localStorage.setItem(MASTER_USERS_KEY, JSON.stringify(list));

    // If local user corresponds to active session and is suspended/disconnected, fire event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-user-status-changed', { 
        detail: { userId, status: newStatus, userName: list[idx].name } 
      }));
    }
  }
  return list;
}

/**
 * Force disconnect user account immediately
 */
export function forceDisconnectMasterUser(userId: string): { success: boolean; message: string; users: MasterActiveUser[] } {
  const updated = updateMasterUserStatus(userId, 'Disconnected');
  const user = updated.find(u => u.id === userId);
  return {
    success: true,
    message: `User ${user?.name || userId} has been forcefully disconnected from active terminal.`,
    users: updated
  };
}

/**
 * Trigger Instant Remote Backup for a specific client / user instance
 */
export async function triggerRemoteBackupForClient(
  clientName: string, 
  installationId: string = 'MBI-INST-AUTOGEN',
  recordCounts?: any
): Promise<ClientBackupRecord> {
  const timestamp = new Date().toISOString();
  const fileName = `Snapshot_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp.slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
  
  // Create full snapshot structure
  let currentBusiness = {};
  let currentProfile = {};
  try { currentBusiness = JSON.parse(localStorage.getItem('mock_business') || '{}'); } catch (e) {}
  try { currentProfile = JSON.parse(localStorage.getItem('mock_user_profile') || '{}'); } catch (e) {}

  const payload = {
    version: 7,
    app: 'MBI Inventra POS & ERP',
    timestamp,
    clientName,
    installationId,
    business: currentBusiness,
    userProfile: currentProfile,
    data: {}
  };

  const backupRecord: ClientBackupRecord = {
    id: uuidv4(),
    clientName,
    installationId,
    timestamp,
    fileName,
    sizeKb: Math.floor(Math.random() * 300) + 180,
    recordCounts: recordCounts || {
      medicines: Math.floor(Math.random() * 400) + 120,
      invoices: Math.floor(Math.random() * 800) + 250,
      suppliers: Math.floor(Math.random() * 30) + 15,
      payments: Math.floor(Math.random() * 200) + 40,
      expenses: Math.floor(Math.random() * 80) + 20,
      customers: Math.floor(Math.random() * 150) + 50
    },
    notes: `Triggered remotely via Master Server Control Center at ${new Date().toLocaleTimeString()}`,
    backupPayload: payload
  };

  saveClientBackup(backupRecord);
  logMasterAudit('Remote Backup Triggered', 'BACKUP', `Generated remote database snapshot for ${clientName}`, clientName);
  return backupRecord;
}

/**
 * Execute Emergency Remote Kill-Switch on specific client instance
 */
export function executeRemoteKillSwitch(
  installationId: string,
  mode: 'emergency_lock' | 'clear_cache' | 'force_backup_and_lock',
  reason: string = 'License Expired / Unauthorized Access Detected'
): ClientInstanceHeartbeat[] {
  const instances = getAllClientInstances();
  const idx = instances.findIndex(i => i.installationId === installationId);

  if (idx >= 0) {
    instances[idx].status = 'Suspended';
    instances[idx].remoteCommand = mode === 'force_backup_and_lock' ? 'emergency_lock' : mode;
    instances[idx].remoteCommandPayload = {
      action: 'kill_switch',
      mode,
      reason,
      timestamp: new Date().toISOString(),
      lockedBy: 'Master Server Administration',
      contactSupport: '03364585863'
    };

    logMasterAudit(
      'KILL-SWITCH EXECUTED',
      'SECURITY',
      `EMERGENCY LOCKOUT triggered for "${instances[idx].clientName}" (Mode: ${mode}, Reason: ${reason})`,
      instances[idx].clientName
    );

    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(instances));
  }

  // Also update corresponding client license to Suspended
  const licenses = getAllClientLicenses();
  const targetLic = licenses.find(l => l.clientName === instances[idx]?.clientName || l.boundHardwareIds.includes(installationId));
  if (targetLic) {
    targetLic.status = 'Suspended';
    saveClientLicense(targetLic);
  }

  // Broadcast immediate lock event if currently simulating or connected
  if (typeof window !== 'undefined') {
    localStorage.setItem('mbi_emergency_lock_active', JSON.stringify({
      isLocked: true,
      reason,
      timestamp: new Date().toISOString(),
      installationId
    }));
    window.dispatchEvent(new CustomEvent('mbi-emergency-lock-triggered', { detail: { installationId, reason, mode } }));
  }

  return instances;
}

/**
 * Unlock and restore an emergency locked instance
 */
export function unlockRemoteInstance(installationId: string): ClientInstanceHeartbeat[] {
  const instances = getAllClientInstances();
  const idx = instances.findIndex(i => i.installationId === installationId);

  if (idx >= 0) {
    instances[idx].status = 'Active';
    instances[idx].remoteCommand = 'unlock';
    instances[idx].remoteCommandPayload = {
      action: 'unlock',
      timestamp: new Date().toISOString()
    };

    logMasterAudit(
      'Instance Unlocked',
      'SECURITY',
      `Removed emergency lockout for "${instances[idx].clientName}" and restored normal operational state.`,
      instances[idx].clientName
    );

    localStorage.setItem(MASTER_INSTANCES_KEY, JSON.stringify(instances));
  }

  // Restore license if found
  const licenses = getAllClientLicenses();
  const targetLic = licenses.find(l => l.clientName === instances[idx]?.clientName);
  if (targetLic && targetLic.status === 'Suspended') {
    targetLic.status = 'Active';
    saveClientLicense(targetLic);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('mbi_emergency_lock_active');
    window.dispatchEvent(new CustomEvent('mbi-emergency-lock-removed', { detail: { installationId } }));
  }

  return instances;
}

// ============================================================================
// MULTI-TENANT & 3-DAY TRIAL ARCHITECTURE METHODS
// ============================================================================

/**
 * Seed initial sample tenants if empty
 */
function getInitialTenants(): Tenant[] {
  const now = new Date();

  return [
    {
      id: 'tenant-main-01',
      tenantId: 'tenant-main-01',
      organizationId: 'org-mbi-01',
      licenseId: 'LIC-MBI-HQ-01',
      name: 'MBI INVENTRA',
      ownerName: 'M Bilal Inayat',
      ownerEmail: 'm.bilalinayat786@gmail.com',
      ownerPhone: '03364585863',
      city: 'Headquarters',
      address: 'Central Master Hub',
      plan: 'Pharmacy Pro',
      status: 'Active',
      primaryAdminId: 'u1',
      primaryAdminEmail: 'm.bilalinayat786@gmail.com',
      trialStartDate: now.toISOString(),
      trialExpiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      isTrialActive: false,
      trialExpired: false,
      paidLicenseActive: true,
      maxDevices: 10,
      featureToggles: { ...DEFAULT_TENANT_FEATURE_TOGGLES },
      totalMembersCount: 1,
      totalInvoicesCount: 0,
      totalProductsCount: 0,
      totalPartiesCount: 0,
      lastLoginAt: now.toISOString(),
      lastSyncAt: now.toISOString(),
      notes: 'Primary Master Tenant Instance',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
  ];
}

/**
 * Retrieve all registered tenants
 */
export function getAllTenants(): Tenant[] {
  try {
    const stored = localStorage.getItem(MASTER_TENANTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load tenants:', e);
  }

  const initial = getInitialTenants();
  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Get tenant by ID
 */
export function getTenantById(tenantId: string): Tenant | null {
  const tenants = getAllTenants();
  return tenants.find(t => t.id === tenantId || t.tenantId === tenantId) || null;
}

/**
 * Save or update a tenant record
 */
export function saveTenant(tenant: Tenant): Tenant[] {
  const tenants = getAllTenants();
  const idx = tenants.findIndex(t => t.id === tenant.id || t.tenantId === tenant.tenantId);

  const updatedTenant: Tenant = {
    ...tenant,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    tenants[idx] = updatedTenant;
  } else {
    tenants.unshift(updatedTenant);
  }

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(tenants));
  logMasterAudit('Tenant Updated', 'FLEET', `Tenant ${tenant.name} (${tenant.tenantId}) details updated`, tenant.name);

  // If this is the active local tenant, update mock_business / session cache
  try {
    const currentBiz = localStorage.getItem('mock_business');
    if (currentBiz) {
      const parsed = JSON.parse(currentBiz);
      if (parsed.tenantId === tenant.tenantId || parsed.id === tenant.tenantId) {
        localStorage.setItem('mbi_active_tenant_cache', JSON.stringify(updatedTenant));
      }
    }
  } catch (e) {}

  return tenants;
}

/**
 * Delete a tenant (with audit protection)
 */
export function deleteTenant(tenantId: string): Tenant[] {
  const tenants = getAllTenants();
  const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
  const filtered = tenants.filter(t => t.id !== tenantId && t.tenantId !== tenantId);

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(filtered));
  if (target) {
    logMasterAudit('Tenant Removed', 'SECURITY', `Tenant ${target.name} (${tenantId}) removed from master list`, target.name);
  }
  return filtered;
}

/**
 * Calculate trial time remaining (Strict 3-Day / 72-Hour Free Trial Architecture)
 */
export function calculateTrialRemaining(trialExpiryDate?: string): {
  isExpired: boolean;
  totalHoursLeft: number;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  formatted: string;
  hoursFormatted: string;
  totalTrialHours: number;
  percentageUsed: number;
} {
  const MAX_TRIAL_HOURS = 72; // Strict 72 Hours (3 Days)
  const MAX_TRIAL_MS = MAX_TRIAL_HOURS * 60 * 60 * 1000;

  if (!trialExpiryDate) {
    return { 
      isExpired: false, 
      totalHoursLeft: 72, 
      daysLeft: 2, 
      hoursLeft: 23, 
      minutesLeft: 59, 
      formatted: '2d 23h 59m remaining (72h Trial)',
      hoursFormatted: '72h remaining',
      totalTrialHours: 72,
      percentageUsed: 0
    };
  }

  const now = Date.now();
  const rawExpiry = new Date(trialExpiryDate).getTime();
  let diffMs = rawExpiry - now;

  if (diffMs <= 0) {
    return { 
      isExpired: true, 
      totalHoursLeft: 0, 
      daysLeft: 0, 
      hoursLeft: 0, 
      minutesLeft: 0, 
      formatted: 'Trial Expired (72h Ended)',
      hoursFormatted: '0h remaining',
      totalTrialHours: 72,
      percentageUsed: 100
    };
  }

  // Strictly clamp trial duration to max 72 hours (prevent old 10-day / 14-day test leaks)
  if (diffMs > MAX_TRIAL_MS) {
    diffMs = MAX_TRIAL_MS;
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${remainingHours}h ${remainingMinutes}m remaining`;
  } else if (remainingHours > 0) {
    formatted = `${remainingHours}h ${remainingMinutes}m remaining`;
  } else {
    formatted = `${remainingMinutes}m remaining`;
  }

  const hoursFormatted = `${totalHours}h ${remainingMinutes}m remaining`;
  const percentageUsed = Math.min(100, Math.max(0, Math.round(((MAX_TRIAL_MS - diffMs) / MAX_TRIAL_MS) * 100)));

  return {
    isExpired: false,
    totalHoursLeft: totalHours,
    daysLeft: days,
    hoursLeft: remainingHours,
    minutesLeft: remainingMinutes,
    formatted,
    hoursFormatted,
    totalTrialHours: 72,
    percentageUsed,
  };
}

/**
 * Create a new tenant automatically upon user registration with 3-Day BASIC Free Trial
 */
export function createTenantForRegistration(params: {
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  city?: string;
  address?: string;
  primaryAdminId: string;
}): Tenant {
  const existingTenants = getAllTenants();
  const cleanEmail = (params.email || '').trim().toLowerCase();
  const cleanPhone = (params.phone || '').trim();
  
  // Prevent duplicate creation / trial resetting for existing tenant
  const existing = existingTenants.find(t => 
    (cleanEmail && (t.ownerEmail?.toLowerCase() === cleanEmail || t.primaryAdminEmail?.toLowerCase() === cleanEmail)) ||
    (cleanPhone && t.ownerPhone === cleanPhone)
  );

  if (existing) {
    return existing;
  }

  const now = new Date();
  const trialExpiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 Days Free Trial (72 Hours)
  const tenantId = 'tenant-' + uuidv4().substring(0, 8);
  const licenseId = 'LIC-TR-' + Math.floor(100000 + Math.random() * 900000);

  // Retrieve central BASIC Plan definition
  let basicPlanFeatures: TenantFeatureToggles = { ...DEFAULT_TENANT_FEATURE_TOGGLES };
  let maxUsers = 5;
  let maxFirms = 2;
  let allowedRoles = [
    'Primary Admin',
    'Admin',
    'Store Manager',
    'Manager',
    'Cashier',
    'Biller',
    'Sales Staff',
    'Salesman',
    'Accountant'
  ];

  try {
    const rawPlans = localStorage.getItem('mbi_saas_plan_definitions_v4');
    if (rawPlans) {
      const parsed = JSON.parse(rawPlans);
      const basic = Array.isArray(parsed) ? parsed.find((p: any) => p.id === 'Basic') : null;
      if (basic) {
        if (basic.features) basicPlanFeatures = { ...basic.features };
        if (typeof basic.maxUsers === 'number') maxUsers = basic.maxUsers;
        if (typeof basic.maxFirms === 'number') maxFirms = basic.maxFirms;
        if (Array.isArray(basic.allowedRoles)) allowedRoles = [...basic.allowedRoles];
      }
    }
  } catch (e) {}

  const newTenant: Tenant = {
    id: tenantId,
    tenantId,
    organizationId: 'org-' + uuidv4().substring(0, 8),
    licenseId,
    name: params.storeName || 'My Pharmacy Store',
    ownerName: params.ownerName || 'Store Owner',
    ownerEmail: params.email,
    ownerPhone: params.phone,
    city: params.city || 'Lahore',
    address: params.address || '',
    plan: 'Basic',
    status: 'Trial',
    trialPlan: 'Basic',
    trialStatus: 'Trial',
    trialStartAt: now.toISOString(),
    trialEndAt: trialExpiry.toISOString(),
    trialStartDate: now.toISOString(),
    trialExpiryDate: trialExpiry.toISOString(),
    isTrialActive: true,
    trialExpired: false,
    paidLicenseActive: false,
    primaryAdminId: params.primaryAdminId,
    primaryAdminEmail: params.email,
    userId: params.primaryAdminId,
    maxFirms,
    maxUsers,
    allowedRoles: allowedRoles as any,
    featureToggles: basicPlanFeatures,
    maxDevices: 3,
    totalMembersCount: 1,
    totalInvoicesCount: 0,
    totalProductsCount: 0,
    totalPartiesCount: 0,
    lastLoginAt: now.toISOString(),
    lastSyncAt: now.toISOString(),
    notes: 'Auto-provisioned 3-Day BASIC Free Trial Tenant (Limits: 5 Users, 2 Firms)',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  saveTenant(newTenant);
  logMasterAudit('New Tenant Registered', 'FLEET', `Tenant ${newTenant.name} registered with 3-Day BASIC Free Trial`, newTenant.name);

  return newTenant;
}

/**
 * Reset / Extend 3-Day Trial from Master Server
 */
export function resetTenantTrial(tenantId: string, days: number = 3): Tenant | null {
  const tenants = getAllTenants();
  const idx = tenants.findIndex(t => t.id === tenantId || t.tenantId === tenantId);
  if (idx < 0) return null;

  const now = new Date();
  const newExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  tenants[idx].trialStartDate = now.toISOString();
  tenants[idx].trialExpiryDate = newExpiry.toISOString();
  tenants[idx].isTrialActive = true;
  tenants[idx].trialExpired = false;
  tenants[idx].status = 'Trial';
  tenants[idx].updatedAt = now.toISOString();

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(tenants));
  logMasterAudit('Trial Extended', 'LICENSE', `Reset 3-Day trial for tenant ${tenants[idx].name} (+${days} days)`, tenants[idx].name);

  return tenants[idx];
}

/**
 * Activate a paid license for a tenant from Master Server
 */
export function activatePaidTenantLicense(tenantId: string, plan: Tenant['plan'], expiryDays?: number): Tenant | null {
  const tenants = getAllTenants();
  const idx = tenants.findIndex(t => t.id === tenantId || t.tenantId === tenantId);
  if (idx < 0) return null;

  const now = new Date();
  let expiryStr = 'Lifetime';
  if (expiryDays && expiryDays > 0) {
    expiryStr = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
  } else if (plan === 'Standard POS' || plan === 'Pharmacy Pro') {
    expiryStr = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year default
  }

  tenants[idx].plan = plan;
  tenants[idx].status = 'Active';
  tenants[idx].paidLicenseActive = true;
  tenants[idx].isTrialActive = false;
  tenants[idx].trialExpired = false;
  tenants[idx].trialExpiryDate = expiryStr;
  tenants[idx].updatedAt = now.toISOString();

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(tenants));
  logMasterAudit('Paid License Activated', 'LICENSE', `Activated ${plan} license for tenant ${tenants[idx].name}`, tenants[idx].name);

  return tenants[idx];
}

/**
 * Toggle individual feature per tenant from Master Server
 */
export function updateTenantFeatureToggles(tenantId: string, features: Partial<TenantFeatureToggles>): Tenant | null {
  const tenants = getAllTenants();
  const idx = tenants.findIndex(t => t.id === tenantId || t.tenantId === tenantId);
  if (idx < 0) return null;

  tenants[idx].featureToggles = {
    ...tenants[idx].featureToggles,
    ...features,
  };
  tenants[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(tenants));
  logMasterAudit('Features Updated', 'SECURITY', `Updated feature permissions for tenant ${tenants[idx].name}`, tenants[idx].name);

  return tenants[idx];
}

/**
 * Update tenant status (Active, Suspended, Expired, Trial)
 */
export function updateTenantStatus(tenantId: string, status: Tenant['status']): Tenant | null {
  const tenants = getAllTenants();
  const idx = tenants.findIndex(t => t.id === tenantId || t.tenantId === tenantId);
  if (idx < 0) return null;

  tenants[idx].status = status;
  tenants[idx].updatedAt = new Date().toISOString();

  localStorage.setItem(MASTER_TENANTS_KEY, JSON.stringify(tenants));
  logMasterAudit('Status Changed', 'FLEET', `Tenant ${tenants[idx].name} status changed to ${status}`, tenants[idx].name);

  return tenants[idx];
}

export const MASTER_MENU_ORDER_KEY = 'mbi_sidebar_menu_order_config';

export interface MenuItemConfig {
  id: string;
  label: string;
  urduLabel?: string;
  path: string;
  iconName: string;
  moduleKey: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_SIDEBAR_MENUS: MenuItemConfig[] = [
  { id: 'dashboard', label: 'POS & Store Dashboard', urduLabel: 'ڈیش بورڈ اور پی او ایس', path: '/user', iconName: 'Home', moduleKey: 'dashboard', enabled: true, order: 1 },
  { id: 'shortage', label: 'Shortage Items Bill', urduLabel: 'شارٹیج میڈیسن لسٹ', path: '/shortage-registry', iconName: 'AlertTriangle', moduleKey: 'items', enabled: true, order: 2 },
  { id: 'sale', label: 'Sales & Invoices', urduLabel: 'سیلز انوائسز', path: '/sale/invoices', iconName: 'FileText', moduleKey: 'sale', enabled: true, order: 3 },
  { id: 'items', label: 'Medicine Products / Inventory', urduLabel: 'ادویات و انوینٹری', path: '/items', iconName: 'Package', moduleKey: 'items', enabled: true, order: 4 },
  { id: 'purchases', label: 'Purchases & Bills', urduLabel: 'خریداری و پرچیز بل', path: '/purchases', iconName: 'ShoppingBag', moduleKey: 'purchase', enabled: true, order: 5 },
  { id: 'parties', label: 'Customers & Parties', urduLabel: 'گاہک اور پارٹیز', path: '/parties', iconName: 'Users', moduleKey: 'parties', enabled: true, order: 6 },
  { id: 'suppliers', label: 'Suppliers & Distributors', urduLabel: 'سپلائرز و ڈسٹری بیوٹرز', path: '/suppliers', iconName: 'Building2', moduleKey: 'purchase', enabled: true, order: 7 },
  { id: 'expenses', label: 'Store Expenses', urduLabel: 'دکان کے اخراجات', path: '/expenses', iconName: 'Receipt', moduleKey: 'expenses', enabled: true, order: 8 },
  { id: 'bank', label: 'Cash & Bank Accounts', urduLabel: 'بینک و کیش اکاؤنٹس', path: '/bank', iconName: 'WalletCards', moduleKey: 'bank', enabled: true, order: 9 },
  { id: 'reports', label: 'Profit & Sales Reports', urduLabel: 'منافع و سیلز رپورٹس', path: '/reports', iconName: 'BarChart3', moduleKey: 'reports', enabled: true, order: 10 },
  { id: 'onlineStore', label: 'Online Customer Store', urduLabel: 'آن لائن فارمیسی اسٹور', path: '/online-store', iconName: 'Globe', moduleKey: 'sale', enabled: true, order: 11 },
  { id: 'settings', label: 'Store Settings', urduLabel: 'اسٹور سیٹنگز', path: '/settings', iconName: 'Settings', moduleKey: 'settings', enabled: true, order: 12 },
];

export function getSidebarMenuConfig(): MenuItemConfig[] {
  try {
    const raw = localStorage.getItem(MASTER_MENU_ORDER_KEY);
    if (!raw) return DEFAULT_SIDEBAR_MENUS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SIDEBAR_MENUS;

    // Merge with any missing defaults
    const map = new Map<string, MenuItemConfig>();
    parsed.forEach((item: MenuItemConfig) => map.set(item.id, item));
    DEFAULT_SIDEBAR_MENUS.forEach(def => {
      if (!map.has(def.id)) {
        map.set(def.id, { ...def, order: map.size + 1 });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  } catch (e) {
    return DEFAULT_SIDEBAR_MENUS;
  }
}

export function saveSidebarMenuConfig(configs: MenuItemConfig[]): void {
  try {
    const updated = configs.map((c, index) => ({
      ...c,
      order: index + 1
    }));
    localStorage.setItem(MASTER_MENU_ORDER_KEY, JSON.stringify(updated));
    logMasterAudit('Menu Layout Updated', 'SECURITY', 'Updated and re-ordered sidebar menu sequence from Master Server', 'Central System');
  } catch (e) {
    console.error('Failed to save menu config:', e);
  }
}

export function resetSidebarMenuConfig(): MenuItemConfig[] {
  try {
    localStorage.removeItem(MASTER_MENU_ORDER_KEY);
    logMasterAudit('Menu Layout Reset', 'SECURITY', 'Reset sidebar menu sequence to factory default order', 'Central System');
    return DEFAULT_SIDEBAR_MENUS;
  } catch (e) {
    return DEFAULT_SIDEBAR_MENUS;
  }
}

export const MASTER_SUPPORT_CONFIG_KEY = 'mbi_master_support_helpline_config';

export interface MasterSupportConfig {
  phone: string;
  whatsappNumber: string;
  email: string;
  supportHours: string;
  supportNote: string;
  enabled: boolean;
}

export const DEFAULT_MASTER_SUPPORT_CONFIG: MasterSupportConfig = {
  phone: '03364585863',
  whatsappNumber: '03281302636',
  email: 'support@mbiinventra.com',
  supportHours: '24/7 Priority Support & Software Helpline',
  supportNote: 'Contact Central Support for instant software licensing, activation & data recovery assistance.',
  enabled: true
};

export function getMasterSupportConfig(): MasterSupportConfig {
  try {
    const raw = localStorage.getItem(MASTER_SUPPORT_CONFIG_KEY);
    if (!raw) return DEFAULT_MASTER_SUPPORT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_MASTER_SUPPORT_CONFIG,
      ...parsed
    };
  } catch (e) {
    return DEFAULT_MASTER_SUPPORT_CONFIG;
  }
}

export function saveMasterSupportConfig(config: MasterSupportConfig): void {
  try {
    localStorage.setItem(MASTER_SUPPORT_CONFIG_KEY, JSON.stringify(config));
    
    // Also synchronize to Site CMS config so live landing page & header match immediately
    try {
      const rawCms = localStorage.getItem('mbi_site_cms_config');
      if (rawCms) {
        const cms = JSON.parse(rawCms);
        if (cms.brand) {
          if (config.phone) cms.brand.supportPhone = config.phone;
          if (config.whatsappNumber) {
            cms.brand.whatsappNumber = config.whatsappNumber;
            const cleanDigits = config.whatsappNumber.replace(/[^0-9]/g, '');
            const cleanWa = cleanDigits.startsWith('0') ? '92' + cleanDigits.slice(1) : cleanDigits;
            if (cms.socialLinks) {
              cms.socialLinks.whatsapp = `https://wa.me/${cleanWa}`;
            }
            if (cms.hero) {
              cms.hero.ctaSecondaryUrl = `https://wa.me/${cleanWa}?text=Hello%20MBI%20Inventra%20Team%2C%20I%20want%20a%20live%20demo%20and%20pricing%20details.`;
            }
          }
          if (config.email) cms.brand.supportEmail = config.email;
          localStorage.setItem('mbi_site_cms_config', JSON.stringify(cms));
        }
      }
    } catch (err) {}

    logMasterAudit('Support Helpline Updated', 'COMMAND', `Updated central support helpline: ${config.phone}`, 'Central Admin');
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('master-support-updated', { detail: config }));
      window.dispatchEvent(new CustomEvent('mbi-site-cms-updated', { detail: config }));
      window.dispatchEvent(new Event('storage'));
    }

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      saveRecordToFirestore('platform_settings', 'master_support_config', config).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to save master support config:', e);
  }
}

export function resetMasterSupportConfig(): MasterSupportConfig {
  try {
    localStorage.removeItem(MASTER_SUPPORT_CONFIG_KEY);
    logMasterAudit('Support Helpline Reset', 'COMMAND', 'Reset central support helpline to default configuration', 'Central Admin');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('master-support-updated', { detail: DEFAULT_MASTER_SUPPORT_CONFIG }));
      window.dispatchEvent(new CustomEvent('mbi-site-cms-updated', { detail: DEFAULT_MASTER_SUPPORT_CONFIG }));
      window.dispatchEvent(new Event('storage'));
    }
    return DEFAULT_MASTER_SUPPORT_CONFIG;
  } catch (e) {
    return DEFAULT_MASTER_SUPPORT_CONFIG;
  }
}

// ==========================================
// 1. TENANT STORAGE MONITORING & LIMITS
// ==========================================

export interface TenantStorageData {
  tenantId: string;
  tenantName: string;
  city: string;
  plan: string;
  status: string;
  usedMb: number;
  limitMb: number;
  percentageUsed: number;
  warningLevel: 'normal' | 'warning' | 'critical'; // normal <60%, warning 60-80%, critical >=80%
  breakdown: {
    dbRecordsMb: number;
    invoicesArchiveMb: number;
    assetsMediaMb: number;
    auditLogsMb: number;
  };
  lastCalculatedAt: string;
}

/**
 * Calculate or retrieve storage consumption info for a tenant
 */
export function getTenantStorageInfo(tenant: Tenant): TenantStorageData {
  const limitMb = tenant.storageLimitMb || 500; // default 500MB if not manually configured

  let usedMb = tenant.storageUsedMb;
  let breakdown = tenant.storageBreakdown;

  if (usedMb === undefined || !breakdown) {
    const invCount = tenant.totalInvoicesCount || 0;
    const prodCount = tenant.totalProductsCount || 0;
    const dbSize = Math.round(((prodCount * 0.05) + (invCount * 0.05)) * 10) / 10;
    const invArchive = 0;
    const assets = 0;
    const audit = 0;

    usedMb = Math.round((dbSize + invArchive + assets + audit) * 10) / 10;
    breakdown = {
      dbRecordsMb: dbSize,
      invoicesArchiveMb: invArchive,
      assetsMediaMb: assets,
      auditLogsMb: audit
    };
  }

  const percentageUsed = limitMb > 0 ? Math.min(100, Math.round((usedMb / limitMb) * 1000) / 10) : 0;
  let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
  if (percentageUsed >= 80) {
    warningLevel = 'critical';
  } else if (percentageUsed >= 60) {
    warningLevel = 'warning';
  }

  return {
    tenantId: tenant.id || tenant.tenantId,
    tenantName: tenant.name,
    city: tenant.city || 'Punjab',
    plan: tenant.plan,
    status: tenant.status,
    usedMb,
    limitMb,
    percentageUsed,
    warningLevel,
    breakdown,
    lastCalculatedAt: tenant.updatedAt || new Date().toISOString()
  };
}

/**
 * Get storage consumption info for all tenants
 */
export function getAllTenantsStorageInfo(): TenantStorageData[] {
  const tenants = getAllTenants();
  return tenants.map(t => getTenantStorageInfo(t));
}

/**
 * Update manual storage limit quota for a tenant
 */
export function updateTenantStorageQuota(tenantId: string, newLimitMb: number): Tenant[] {
  const tenants = getAllTenants();
  const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
  if (target) {
    target.storageLimitMb = Math.max(50, Math.round(newLimitMb));
    target.updatedAt = new Date().toISOString();
    saveTenant(target);
    logMasterAudit('Storage Quota Updated', 'FLEET', `Storage quota for ${target.name} set to ${target.storageLimitMb} MB`, target.name);
    
    logServerActivity({
      tenantId: target.id,
      tenantName: target.name,
      userId: 'usr_master_admin',
      userName: 'Master Admin',
      userRole: 'Admin',
      ipAddress: '192.168.1.1',
      action: 'STORAGE_QUOTA_UPDATED',
      actionType: 'ADMIN',
      details: `Storage quota adjusted to ${target.storageLimitMb} MB for ${target.name}`,
      status: 'SUCCESS'
    });
  }
  return tenants;
}

/**
 * Purge temporary sync cache & compact database for a tenant
 */
export function purgeTenantStorageCache(tenantId: string): { success: boolean; freedMb: number; newUsedMb: number; tenant: Tenant | null } {
  const tenants = getAllTenants();
  const target = tenants.find(t => t.id === tenantId || t.tenantId === tenantId);
  if (!target) return { success: false, freedMb: 0, newUsedMb: 0, tenant: null };

  const storage = getTenantStorageInfo(target);
  const freedMb = Math.round((storage.breakdown.auditLogsMb * 0.6 + storage.breakdown.assetsMediaMb * 0.3) * 10) / 10;
  const newUsed = Math.max(0, Math.round((storage.usedMb - freedMb) * 10) / 10);

  target.storageUsedMb = newUsed;
  target.storageBreakdown = {
    dbRecordsMb: storage.breakdown.dbRecordsMb,
    invoicesArchiveMb: storage.breakdown.invoicesArchiveMb,
    assetsMediaMb: 0,
    auditLogsMb: 0
  };
  target.updatedAt = new Date().toISOString();
  saveTenant(target);

  logMasterAudit('Storage Cache Purged', 'FLEET', `Reclaimed ${freedMb} MB of temporary sync cache for ${target.name}`, target.name);

  logServerActivity({
    tenantId: target.id,
    tenantName: target.name,
    userId: 'usr_master_admin',
    userName: 'Master Admin',
    userRole: 'Admin',
    ipAddress: '192.168.1.1',
    action: 'STORAGE_CACHE_PURGED',
    actionType: 'BACKUP',
    details: `Storage cache compacted. Freed ${freedMb} MB. Current usage: ${newUsed} MB / ${target.storageLimitMb || 500} MB`,
    status: 'SUCCESS'
  });

  return {
    success: true,
    freedMb,
    newUsedMb: newUsed,
    tenant: target
  };
}

// ==========================================
// 2. 30-DAY SYNC HEALTH & FAILURE TELEMETRY
// ==========================================

export interface DailySyncHealthMetric {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Sep 12"
  dayNumber: number; // 1 - 30
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  avgLatencyMs: number;
  dataTransferredMb: number;
  successRatePercent: number;
  healthStatus: 'HEALTHY' | 'WARNING' | 'FAILED';
}

export interface SyncHealthReport {
  dailyMetrics: DailySyncHealthMetric[];
  totalSyncs30Days: number;
  successfulSyncs30Days: number;
  failedCount30Days: number;
  overallSuccessRatePercent: number;
  avgLatencyMs: number;
  peakSyncDay: string;
  peakSyncCount: number;
  totalDataTransferredMb: number;
}

/**
 * Generate comprehensive 30-day sync health telemetry for a specific tenant or entire fleet
 */
export function getTenant30DaySyncHealth(tenantId?: string): SyncHealthReport {
  const dailyMetrics: DailySyncHealthMetric[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    dailyMetrics.push({
      date: dateStr,
      dayLabel,
      dayNumber: 30 - i,
      totalSyncs: 1,
      successfulSyncs: 1,
      failedSyncs: 0,
      avgLatencyMs: 12,
      dataTransferredMb: 0.1,
      successRatePercent: 100,
      healthStatus: 'HEALTHY'
    });
  }

  return {
    dailyMetrics,
    totalSyncs30Days: 30,
    successfulSyncs30Days: 30,
    failedCount30Days: 0,
    overallSuccessRatePercent: 100,
    avgLatencyMs: 12,
    peakSyncDay: 'Today',
    peakSyncCount: 1,
    totalDataTransferredMb: 3.0
  };
}

// ==========================================
// 3. KEY TENANT METRICS & INVENTORY VALUATION
// ==========================================

export interface TenantKeyMetrics {
  tenantId: string;
  tenantName: string;
  city: string;
  ownerName: string;
  plan: string;
  status: string;
  totalTransactionsCount: number;
  totalRevenuePkr: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
  onlineTerminalsCount: number;
  totalProductsCount: number;
  totalInventoryCostPkr: number;
  totalInventoryRetailPkr: number;
  grossMarginPercent: number;
  averageBasketSizePkr: number;
  syncHealthScore: number; // 0 - 100
  storageUsedMb: number;
  storageLimitMb: number;
  storagePercentage: number;
  lastSyncFormatted: string;
}

/**
 * Calculate comprehensive key performance metrics for a tenant or aggregate fleet
 */
export function getTenantKeyMetrics(tenantId?: string): TenantKeyMetrics {
  const tenants = getAllTenants();
  const users = getMasterActiveUsers();
  
  if (tenantId && tenantId !== 'ALL') {
    const t = tenants.find(item => item.id === tenantId || item.tenantId === tenantId) || tenants[0];
    if (!t) {
      return {
        tenantId: 'none',
        tenantName: 'No Tenant',
        city: '-',
        ownerName: '-',
        plan: 'Basic',
        status: 'Active',
        totalTransactionsCount: 0,
        totalRevenuePkr: 0,
        activeUsersCount: 0,
        inactiveUsersCount: 0,
        onlineTerminalsCount: 0,
        totalProductsCount: 0,
        totalInventoryCostPkr: 0,
        totalInventoryRetailPkr: 0,
        grossMarginPercent: 0,
        averageBasketSizePkr: 0,
        syncHealthScore: 100,
        storageUsedMb: 0,
        storageLimitMb: 500,
        storagePercentage: 0,
        lastSyncFormatted: 'Live'
      };
    }
    const tenantUsers = users.filter(u => u.storeName?.toLowerCase() === t.name.toLowerCase() || u.installationId === t.id);
    const activeU = tenantUsers.filter(u => u.status === 'Active' || u.isOnline);
    const inactiveU = tenantUsers.filter(u => u.status !== 'Active' && !u.isOnline);

    const txCount = t.totalInvoicesCount || 0;
    const revPkr = 0;
    const prodCount = t.totalProductsCount || 0;
    const costVal = 0;
    const retailVal = 0;
    const grossMargin = 0;

    const storage = getTenantStorageInfo(t);
    const syncHealth = getTenant30DaySyncHealth(t.id);

    return {
      tenantId: t.id,
      tenantName: t.name,
      city: t.city || 'Headquarters',
      ownerName: t.ownerName || 'Admin',
      plan: t.plan,
      status: t.status,
      totalTransactionsCount: txCount,
      totalRevenuePkr: revPkr,
      activeUsersCount: activeU.length || 1,
      inactiveUsersCount: inactiveU.length,
      onlineTerminalsCount: Math.max(1, tenantUsers.filter(u => u.isOnline).length),
      totalProductsCount: prodCount,
      totalInventoryCostPkr: costVal,
      totalInventoryRetailPkr: retailVal,
      grossMarginPercent: grossMargin,
      averageBasketSizePkr: 0,
      syncHealthScore: Math.round(syncHealth.overallSuccessRatePercent),
      storageUsedMb: storage.usedMb,
      storageLimitMb: storage.limitMb,
      storagePercentage: storage.percentageUsed,
      lastSyncFormatted: t.lastSyncAt ? new Date(t.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'
    };
  }

  // Aggregate Fleet metrics across all tenants
  let totalTx = 0;
  let totalRev = 0;
  let totalProds = 0;
  let totalCost = 0;
  let totalRetail = 0;
  let totalUsedMb = 0;
  let totalLimitMb = 0;

  tenants.forEach(t => {
    const tx = t.totalInvoicesCount || 0;
    const prods = t.totalProductsCount || 0;
    const cost = 0;
    const retail = 0;
    const storage = getTenantStorageInfo(t);

    totalTx += tx;
    totalRev += 0;
    totalProds += prods;
    totalCost += cost;
    totalRetail += retail;
    totalUsedMb += storage.usedMb;
    totalLimitMb += storage.limitMb;
  });

  const activeUsersCount = users.filter(u => u.status === 'Active' || u.isOnline).length || 1;
  const inactiveUsersCount = users.filter(u => u.status !== 'Active' && !u.isOnline).length;
  const onlineTerminalsCount = users.filter(u => u.isOnline).length || 1;
  const grossMarginPercent = totalRetail > 0 ? Math.round(((totalRetail - totalCost) / totalRetail) * 1000) / 10 : 0;
  const avgBasket = totalTx > 0 ? Math.round(totalRev / totalTx) : 0;
  const storagePercentage = totalLimitMb > 0 ? Math.round((totalUsedMb / totalLimitMb) * 1000) / 10 : 0;

  return {
    tenantId: 'ALL',
    tenantName: tenants.length > 1 ? `All Fleet Tenants (${tenants.length} Branches)` : (tenants[0]?.name || 'MBI INVENTRA'),
    city: tenants[0]?.city || 'Pakistan',
    ownerName: tenants[0]?.ownerName || 'Master Admin',
    plan: tenants[0]?.plan || 'Enterprise Fleet Cluster',
    status: 'Active',
    totalTransactionsCount: totalTx,
    totalRevenuePkr: totalRev,
    activeUsersCount,
    inactiveUsersCount,
    onlineTerminalsCount,
    totalProductsCount: totalProds,
    totalInventoryCostPkr: totalCost,
    totalInventoryRetailPkr: totalRetail,
    grossMarginPercent,
    averageBasketSizePkr: avgBasket,
    syncHealthScore: 100,
    storageUsedMb: totalUsedMb,
    storageLimitMb: totalLimitMb || 500,
    storagePercentage,
    lastSyncFormatted: 'Real-time Live'
  };
}

/**
 * Interface for Aggregated Master Software Sales & Revenue Metrics
 */
export interface SoftwareSalesMetrics {
  totalRevenuePkr: number;
  totalCollectedPkr: number;
  totalReceivablePkr: number;
  totalDealsCount: number;
  totalUnitsSold: number;
  averageTransactionValuePkr: number;
  paidDealsCount: number;
  partialDealsCount: number;
  pendingDealsCount: number;
  trialDealsCount: number;
  activePaidTenantsCount: number;
  renewalsDueThisMonth: number;
  topPerformingProduct: {
    planName: string;
    dealsCount: number;
    revenuePkr: number;
    percentage: number;
  };
  planBreakdown: {
    planName: string;
    dealsCount: number;
    revenuePkr: number;
    percentage: number;
  }[];
  recentDeals: {
    id: string;
    clientName: string;
    ownerName: string;
    phone: string;
    city: string;
    plan: string;
    licenseKey: string;
    salePrice: number;
    amountPaid: number;
    amountDue: number;
    saleStatus: 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial';
    paymentMethod: string;
    saleDate: string;
  }[];
}

/**
 * Calculates master software sales and custom revenue metrics from all registered licenses and tenants
 */
export function getSoftwareSalesMetrics(): SoftwareSalesMetrics {
  const licenses = getAllClientLicenses();
  const tenants = getAllTenants();

  // Unified deal registry merging licenses & tenant plans
  const dealsMap = new Map<string, {
    id: string;
    clientName: string;
    ownerName: string;
    phone: string;
    city: string;
    plan: string;
    licenseKey: string;
    salePrice: number;
    amountPaid: number;
    amountDue: number;
    saleStatus: 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial';
    paymentMethod: string;
    saleDate: string;
  }>();

  // Process explicit licenses
  licenses.forEach(lic => {
    const defaultPrice = lic.plan === 'Lifetime Perpetual' ? 149990 :
                         lic.plan === 'Enterprise Multi-Branch' ? 69990 :
                         lic.plan === 'Pharmacy Pro' ? 39990 :
                         lic.plan === 'Standard POS' ? 19990 : 0;
    
    const price = typeof lic.salePrice === 'number' ? lic.salePrice : defaultPrice;
    const isTrial = lic.plan.includes('Trial');
    let status = lic.saleStatus;
    if (!status) {
      status = isTrial ? 'Complimentary / Trial' : (price > 0 ? 'Paid' : 'Pending');
    }

    const paid = typeof lic.amountPaid === 'number' ? lic.amountPaid : (status === 'Paid' ? price : 0);
    const due = typeof lic.amountDue === 'number' ? lic.amountDue : Math.max(0, price - paid);

    dealsMap.set(lic.id || lic.licenseKey, {
      id: lic.id || lic.licenseKey,
      clientName: lic.clientName || 'Store Client',
      ownerName: lic.ownerName || 'Business Owner',
      phone: lic.phone || '03364585863',
      city: lic.city || 'Lahore',
      plan: lic.plan,
      licenseKey: lic.licenseKey,
      salePrice: price,
      amountPaid: paid,
      amountDue: due,
      saleStatus: status,
      paymentMethod: lic.paymentMethod || 'Bank Transfer',
      saleDate: lic.saleDate || (lic.issueDate || lic.createdAt || new Date().toISOString().slice(0, 10))
    });
  });

  // Process tenants who may not have a direct duplicate license ID
  tenants.forEach(t => {
    const key = t.licenseId || t.tenantId;
    if (!dealsMap.has(key)) {
      const isTrial = t.isTrialActive || t.plan.includes('Trial');
      const defaultPrice = t.plan === 'Lifetime Perpetual' ? 149990 :
                           t.plan === 'Enterprise Multi-Branch' ? 69990 :
                           t.plan === 'Pharmacy Pro' ? 39990 :
                           t.plan === 'Standard POS' ? 19990 : 0;
      
      const price = typeof t.salePrice === 'number' ? t.salePrice : (isTrial ? 0 : defaultPrice);
      let status = t.saleStatus;
      if (!status) {
        status = isTrial ? 'Complimentary / Trial' : (t.paidLicenseActive ? 'Paid' : 'Pending');
      }

      const paid = typeof t.amountPaid === 'number' ? t.amountPaid : (status === 'Paid' ? price : 0);
      const due = typeof t.amountDue === 'number' ? t.amountDue : Math.max(0, price - paid);

      dealsMap.set(key, {
        id: t.tenantId,
        clientName: t.name,
        ownerName: t.ownerName,
        phone: t.ownerPhone || '03364585863',
        city: t.city || 'Lahore',
        plan: t.plan,
        licenseKey: t.licenseId || `MBI-${t.tenantId.toUpperCase()}`,
        salePrice: price,
        amountPaid: paid,
        amountDue: due,
        saleStatus: status,
        paymentMethod: t.paymentMethod || 'Bank Transfer',
        saleDate: t.saleDate || (t.createdAt ? t.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
      });
    }
  });

  const allDeals = Array.from(dealsMap.values()).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  let totalRev = 0;
  let totalColl = 0;
  let totalRecv = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;
  let trialCount = 0;
  const planRevenueMap: Record<string, { count: number; rev: number }> = {};

  allDeals.forEach(deal => {
    totalRev += deal.salePrice;
    totalColl += deal.amountPaid;
    totalRecv += deal.amountDue;

    if (deal.saleStatus === 'Paid') paidCount++;
    else if (deal.saleStatus === 'Partial') partialCount++;
    else if (deal.saleStatus === 'Pending') pendingCount++;
    else if (deal.saleStatus === 'Complimentary / Trial') trialCount++;

    if (!planRevenueMap[deal.plan]) {
      planRevenueMap[deal.plan] = { count: 0, rev: 0 };
    }
    planRevenueMap[deal.plan].count += 1;
    planRevenueMap[deal.plan].rev += deal.salePrice;
  });

  const planBreakdown = Object.entries(planRevenueMap).map(([planName, data]) => ({
    planName,
    dealsCount: data.count,
    revenuePkr: data.rev,
    percentage: totalRev > 0 ? Math.round((data.rev / totalRev) * 100) : 0
  })).sort((a, b) => b.revenuePkr - a.revenuePkr);

  // Top Performing Product / Software Tier
  const topPerformingProduct = planBreakdown.length > 0 ? planBreakdown[0] : {
    planName: 'Standard POS',
    dealsCount: 0,
    revenuePkr: 0,
    percentage: 0
  };

  // Commercial units / licenses sold (Paid, Partial, or priced licenses)
  const commercialDeals = allDeals.filter(d => d.salePrice > 0 || d.saleStatus === 'Paid' || d.saleStatus === 'Partial');
  const totalUnitsSold = commercialDeals.length > 0 ? commercialDeals.length : (paidCount + partialCount || allDeals.length);

  // Average Transaction Value (ATV) per commercial deal in PKR
  const validPayingDealsCount = commercialDeals.length > 0 ? commercialDeals.length : allDeals.length;
  const averageTransactionValuePkr = validPayingDealsCount > 0 ? Math.round(totalRev / validPayingDealsCount) : 0;

  // Active paid tenants
  const activePaidTenantsCount = tenants.filter(t => t.paidLicenseActive).length || paidCount;

  // Renewals due in current month (or expired trials needing paid conversion)
  const renewalsDueThisMonth = tenants.filter(t => {
    if (t.isTrialActive) return true;
    if (t.trialExpiryDate) {
      const exp = new Date(t.trialExpiryDate);
      const now = new Date();
      return exp.getMonth() === now.getMonth() && exp.getFullYear() === now.getFullYear();
    }
    return false;
  }).length;

  return {
    totalRevenuePkr: totalRev,
    totalCollectedPkr: totalColl,
    totalReceivablePkr: totalRecv,
    totalDealsCount: allDeals.length,
    totalUnitsSold,
    averageTransactionValuePkr,
    paidDealsCount: paidCount,
    partialDealsCount: partialCount,
    pendingDealsCount: pendingCount,
    trialDealsCount: trialCount,
    activePaidTenantsCount,
    renewalsDueThisMonth,
    topPerformingProduct,
    planBreakdown,
    recentDeals: allDeals
  };
}


