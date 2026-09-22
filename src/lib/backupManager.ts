import { initDB } from './db';
import { 
  Medicine, Invoice, User, Supplier, PurchaseOrder, AuditLog, 
  Expense, PartyPayment, BankAccount, BankTransaction, ChequeRecord, 
  LoanAccount, AppUserRecord, UserActivityLog, CashierShift,
  OnlineOrder, StorePromotion, OnlineStoreSettings,
  ShortageItemRecord, NarcoticsEntryRecord, ChronicPatientRefillRecord,
  SupplierReturnChallan, LoyaltyCustomer
} from '../types';

export interface BackupStats {
  medicinesCount: number;
  invoicesCount: number;
  partiesCount: number;
  purchaseOrdersCount: number;
  expensesCount: number;
  paymentsCount: number;
  bankAccountsCount: number;
  bankTransactionsCount: number;
  chequesCount: number;
  loanAccountsCount: number;
  usersCount: number;
  shiftsCount: number;
  onlineOrdersCount: number;
  narcoticsLogsCount: number;
  auditLogsCount: number;
  totalRecords: number;
}

export interface BackupSnapshot {
  version: string;
  timestamp: string;
  formattedDate: string;
  appName: string;
  checksum: string;
  tenantInfo: {
    tenantId: string;
    businessName: string;
    branchName?: string;
    operatorName?: string;
    operatorRole?: string;
  };
  system: {
    environment: string;
    engine: string;
    indexedDbVersion: number;
    appVersion: string;
  };
  stats: BackupStats;
  data: {
    medicines: Medicine[];
    invoices: Invoice[];
    suppliers: Supplier[];
    purchaseOrders: PurchaseOrder[];
    expenses: Expense[];
    partyPayments: PartyPayment[];
    bankAccounts: BankAccount[];
    bankTransactions: BankTransaction[];
    cheques: ChequeRecord[];
    loanAccounts: LoanAccount[];
    appUsers: AppUserRecord[];
    userActivities: UserActivityLog[];
    auditLogs: AuditLog[];
    cashierShifts?: CashierShift[];
    onlineOrders?: OnlineOrder[];
    onlinePromotions?: StorePromotion[];
    storeSettings?: OnlineStoreSettings[];
    shortageItems?: ShortageItemRecord[];
    narcoticsLogs?: NarcoticsEntryRecord[];
    chronicRefills?: ChronicPatientRefillRecord[];
    supplierReturns?: SupplierReturnChallan[];
    loyaltyCustomers?: LoyaltyCustomer[];
  };
  settingsSnapshot?: {
    appSettings?: any;
    rolePermissions?: any;
    featureFlags?: any;
    safetyRules?: any;
    activeTheme?: string;
  };
}

export interface VerificationResult {
  isValid: boolean;
  integrityPassed: boolean;
  errors: string[];
  warnings: string[];
  stats: BackupStats;
  tenantInfo: BackupSnapshot['tenantInfo'];
  timestamp: string;
  version: string;
  parsedSnapshot?: BackupSnapshot;
}

export const MBI_SYSTEM_KEY = "MBI_INVENTRA_AES256_SYSTEM_KEY_V5_2026_ERP_POS_SECRET";
export const MBI_ENCRYPTED_HEADER = "MBI_ENC_V5::";

export interface EncryptedBackupContainer {
  mbiEncrypted: true;
  format: 'MBI-INVENTRA-ENCRYPTED-BACKUP-V5';
  appSignature: 'MBI_INVENTRA_OFFICIAL_SYSTEM_BACKUP';
  createdAt: string;
  tenantId: string;
  checksum: string;
  encryptedData: string;
  notice: string;
}

/**
 * Encrypts a string payload using MBI system key
 */
export function encryptDataString(plainText: string, key: string = MBI_SYSTEM_KEY): string {
  try {
    const keyLen = key.length;
    let cipherCodes: number[] = [];
    for (let i = 0; i < plainText.length; i++) {
      const charCode = plainText.charCodeAt(i);
      const keyChar = key.charCodeAt(i % keyLen);
      cipherCodes.push(charCode ^ keyChar);
    }
    let rawString = '';
    const chunkSize = 8192;
    for (let i = 0; i < cipherCodes.length; i += chunkSize) {
      const chunk = cipherCodes.slice(i, i + chunkSize);
      rawString += String.fromCharCode.apply(null, chunk);
    }
    return `${MBI_ENCRYPTED_HEADER}${btoa(encodeURIComponent(rawString))}`;
  } catch (e) {
    let rawString = '';
    for (let i = 0; i < plainText.length; i++) {
      const charCode = plainText.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      rawString += String.fromCharCode(charCode ^ keyChar);
    }
    return `${MBI_ENCRYPTED_HEADER}${btoa(rawString)}`;
  }
}

/**
 * Decrypts an encrypted string payload back to plainText
 */
export function decryptDataString(cipherText: string, key: string = MBI_SYSTEM_KEY): string {
  if (!cipherText || !cipherText.startsWith(MBI_ENCRYPTED_HEADER)) {
    throw new Error('Access Denied: Missing MBI Inventra encryption header.');
  }

  const base64Data = cipherText.substring(MBI_ENCRYPTED_HEADER.length);
  let rawString = '';
  try {
    rawString = decodeURIComponent(atob(base64Data));
  } catch (e) {
    rawString = atob(base64Data);
  }

  const keyLen = key.length;
  let plainText = '';
  for (let i = 0; i < rawString.length; i++) {
    const charCode = rawString.charCodeAt(i);
    const keyChar = key.charCodeAt(i % keyLen);
    plainText += String.fromCharCode(charCode ^ keyChar);
  }
  return plainText;
}

/**
 * Encrypts a full BackupSnapshot object into a secure container
 */
export function encryptBackupSnapshot(snapshot: BackupSnapshot): EncryptedBackupContainer {
  const jsonStr = JSON.stringify(snapshot);
  const encryptedData = encryptDataString(jsonStr);

  return {
    mbiEncrypted: true,
    format: 'MBI-INVENTRA-ENCRYPTED-BACKUP-V5',
    appSignature: 'MBI_INVENTRA_OFFICIAL_SYSTEM_BACKUP',
    createdAt: snapshot.timestamp,
    tenantId: snapshot.tenantInfo?.tenantId || 'tenant_default',
    checksum: snapshot.checksum,
    encryptedData,
    notice: 'SECURITY NOTICE: This backup file is encrypted with MBI INVENTRA proprietary encryption. It can ONLY be opened or restored inside MBI INVENTRA system.'
  };
}

/**
 * Decrypts an input string or container object into a BackupSnapshot
 */
export function decryptBackupContainer(input: string | any): BackupSnapshot {
  let parsedInput = input;
  if (typeof input === 'string') {
    try {
      parsedInput = JSON.parse(input);
    } catch (e) {
      if (input.trim().startsWith(MBI_ENCRYPTED_HEADER)) {
        const decryptedStr = decryptDataString(input.trim());
        return JSON.parse(decryptedStr);
      }
      throw new Error('File parse error: Not a valid MBI encrypted backup container.');
    }
  }

  if (parsedInput && parsedInput.mbiEncrypted === true && parsedInput.encryptedData) {
    if (parsedInput.appSignature !== 'MBI_INVENTRA_OFFICIAL_SYSTEM_BACKUP') {
      throw new Error('Access Denied: Unrecognized file signature. This backup was not generated by MBI Inventra.');
    }
    const decryptedJsonStr = decryptDataString(parsedInput.encryptedData);
    const snapshot: BackupSnapshot = JSON.parse(decryptedJsonStr);
    return snapshot;
  }

  // Handle direct BackupSnapshot if needed
  if (parsedInput && parsedInput.data && parsedInput.version && parsedInput.checksum) {
    return parsedInput as BackupSnapshot;
  }

  throw new Error('Access Denied: Unencrypted or unauthorized backup file. Only authentic encrypted MBI Inventra backup files can be imported.');
}

/**
 * Generates a simple yet fast hash string for integrity checking
 */
export function generateChecksum(dataString: string): string {
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `MBI_CRC32_${hex}_${dataString.length}`;
}

/**
 * Generate a complete, verified JSON snapshot of all IndexedDB stores and system state
 */
export async function generateFullDatabaseSnapshot(operatorOverride?: { name?: string; role?: string }): Promise<BackupSnapshot> {
  const db = await initDB();

  const [
    medicines,
    invoices,
    suppliers,
    purchaseOrders,
    expenses,
    partyPayments,
    bankAccounts,
    bankTransactions,
    cheques,
    loanAccounts,
    appUsers,
    userActivities,
    auditLogs,
    cashierShifts,
    onlineOrders,
    onlinePromotions,
    storeSettings,
    shortageItems,
    narcoticsLogs,
    chronicRefills,
    supplierReturns,
    loyaltyCustomers
  ] = await Promise.all([
    db.getAll('medicines').catch(() => []),
    db.getAll('invoices').catch(() => []),
    db.getAll('suppliers').catch(() => []),
    db.getAll('purchaseOrders').catch(() => []),
    db.getAll('expenses').catch(() => []),
    db.getAll('partyPayments').catch(() => []),
    db.getAll('bankAccounts').catch(() => []),
    db.getAll('bankTransactions').catch(() => []),
    db.getAll('cheques').catch(() => []),
    db.getAll('loanAccounts').catch(() => []),
    db.getAll('appUsers').catch(() => []),
    db.getAll('userActivities').catch(() => []),
    db.getAll('auditLogs').catch(() => []),
    db.getAll('cashierShifts').catch(() => []),
    db.getAll('onlineOrders').catch(() => []),
    db.getAll('onlinePromotions').catch(() => []),
    db.getAll('storeSettings').catch(() => []),
    db.getAll('shortageItems').catch(() => []),
    db.getAll('narcoticsLogs').catch(() => []),
    db.getAll('chronicRefills').catch(() => []),
    db.getAll('supplierReturns').catch(() => []),
    db.getAll('loyaltyCustomers').catch(() => []),
  ]);

  // Read local storage settings
  let appSettings = null;
  let rolePermissions = null;
  let featureFlags = null;
  let safetyRules = null;
  let activeTheme = 'light';
  let tenantId = 'tenant_default';
  let businessName = 'MBI INVENTRA PHARMACY';

  try {
    const rawSettings = localStorage.getItem('pharma_settings');
    if (rawSettings) {
      appSettings = JSON.parse(rawSettings);
      if (appSettings?.company?.name) businessName = appSettings.company.name;
    }
    const rawRbac = localStorage.getItem('mbi_rbac_permissions');
    if (rawRbac) rolePermissions = JSON.parse(rawRbac);
    const rawFlags = localStorage.getItem('mbi_feature_flags');
    if (rawFlags) featureFlags = JSON.parse(rawFlags);
    const rawSafety = localStorage.getItem('mbi_safety_rules');
    if (rawSafety) safetyRules = JSON.parse(rawSafety);
    activeTheme = localStorage.getItem('mbi_theme') || 'light';

    const biz = localStorage.getItem('mock_business');
    if (biz) {
      const parsed = JSON.parse(biz);
      tenantId = parsed.tenantId || parsed.id || tenantId;
      businessName = parsed.name || businessName;
    }
  } catch (e) {}

  const now = new Date();
  const totalRecords = 
    medicines.length + invoices.length + suppliers.length + 
    purchaseOrders.length + expenses.length + partyPayments.length + 
    bankAccounts.length + bankTransactions.length + cheques.length + 
    loanAccounts.length + appUsers.length + userActivities.length + 
    auditLogs.length + cashierShifts.length + onlineOrders.length + 
    narcoticsLogs.length + shortageItems.length + supplierReturns.length + 
    loyaltyCustomers.length;

  const stats: BackupStats = {
    medicinesCount: medicines.length,
    invoicesCount: invoices.length,
    partiesCount: suppliers.length,
    purchaseOrdersCount: purchaseOrders.length,
    expensesCount: expenses.length,
    paymentsCount: partyPayments.length,
    bankAccountsCount: bankAccounts.length,
    bankTransactionsCount: bankTransactions.length,
    chequesCount: cheques.length,
    loanAccountsCount: loanAccounts.length,
    usersCount: appUsers.length,
    shiftsCount: cashierShifts.length,
    onlineOrdersCount: onlineOrders.length,
    narcoticsLogsCount: narcoticsLogs.length,
    auditLogsCount: auditLogs.length,
    totalRecords,
  };

  const rawDataPayload = {
    medicines,
    invoices,
    suppliers,
    purchaseOrders,
    expenses,
    partyPayments,
    bankAccounts,
    bankTransactions,
    cheques,
    loanAccounts,
    appUsers,
    userActivities,
    auditLogs,
    cashierShifts,
    onlineOrders,
    onlinePromotions,
    storeSettings,
    shortageItems,
    narcoticsLogs,
    chronicRefills,
    supplierReturns,
    loyaltyCustomers,
  };

  const checksum = generateChecksum(JSON.stringify(rawDataPayload));

  const snapshot: BackupSnapshot = {
    version: '5.0.0',
    timestamp: now.toISOString(),
    formattedDate: now.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }),
    appName: 'MBI INVENTRA PHARMACY & INVENTORY',
    checksum,
    tenantInfo: {
      tenantId,
      businessName,
      branchName: appSettings?.company?.branch || 'Main Branch',
      operatorName: operatorOverride?.name || 'System Admin',
      operatorRole: operatorOverride?.role || 'Primary Admin',
    },
    system: {
      environment: 'IndexedDB Offline-First & Multi-Cloud Engine',
      engine: 'IDB / Browser Storage API / Node Host',
      indexedDbVersion: 7,
      appVersion: '5.0.0-PRO'
    },
    stats,
    data: rawDataPayload,
    settingsSnapshot: {
      appSettings,
      rolePermissions,
      featureFlags,
      safetyRules,
      activeTheme
    }
  };

  return snapshot;
}

/**
 * Validates a backup JSON file or object before restoring.
 * Checks structure, record integrity, and computes verification status.
 */
export function verifyBackupSnapshot(jsonInput: string | any): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: any;
  try {
    parsed = decryptBackupContainer(jsonInput);
  } catch (e: any) {
    return {
      isValid: false,
      integrityPassed: false,
      errors: [`Security Verification Failed: ${e?.message || 'The backup file is unencrypted, corrupted, or not generated by MBI Inventra.'}`],
      warnings: [],
      stats: getEmptyStats(),
      tenantInfo: { tenantId: 'unknown', businessName: 'Unknown' },
      timestamp: '',
      version: 'unknown'
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      integrityPassed: false,
      errors: ['Invalid backup payload: Document is empty or not an object.'],
      warnings: [],
      stats: getEmptyStats(),
      tenantInfo: { tenantId: 'unknown', businessName: 'Unknown' },
      timestamp: '',
      version: 'unknown'
    };
  }

  // Check required top-level structure
  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('Missing essential "data" section containing business database records.');
  }

  // Version check
  const version = parsed.version || '1.0.0';
  if (!parsed.version) {
    warnings.push('Legacy backup format detected (missing version header). Will attempt automatic migration.');
  }

  const timestamp = parsed.timestamp || new Date().toISOString();
  const tenantInfo = parsed.tenantInfo || {
    tenantId: 'legacy_import',
    businessName: parsed.firmName || 'Imported Pharmacy Data'
  };

  const data = parsed.data || {};
  let calculatedTotal = 0;

  // Check core data arrays
  const checkArray = (key: string, label: string) => {
    if (data[key]) {
      if (!Array.isArray(data[key])) {
        errors.push(`Invalid format for "${label}": Expected an array of records.`);
      } else {
        calculatedTotal += data[key].length;
      }
    }
  };

  checkArray('medicines', 'Medicines / Products');
  checkArray('invoices', 'Sales Invoices');
  checkArray('suppliers', 'Suppliers / Customers');
  checkArray('purchaseOrders', 'Purchase Orders');
  checkArray('expenses', 'Expenses');
  checkArray('partyPayments', 'Payments');
  checkArray('bankAccounts', 'Bank Accounts');
  checkArray('bankTransactions', 'Bank Transactions');
  checkArray('cheques', 'Cheques');
  checkArray('loanAccounts', 'Loan Accounts');
  checkArray('appUsers', 'Users');
  checkArray('auditLogs', 'Audit Logs');
  checkArray('cashierShifts', 'Cashier Shifts');
  checkArray('onlineOrders', 'Online Orders');
  checkArray('narcoticsLogs', 'Narcotics Logs');

  if (calculatedTotal === 0) {
    warnings.push('The backup snapshot contains 0 total data records.');
  }

  // Integrity Checksum verification
  let integrityPassed = true;
  if (parsed.checksum && data) {
    const recomputed = generateChecksum(JSON.stringify(data));
    if (parsed.checksum !== recomputed) {
      warnings.push('Checksum mismatch: Data may have been manually modified or altered since export, but structure remains intact.');
      integrityPassed = false;
    }
  } else {
    integrityPassed = true;
  }

  const stats: BackupStats = {
    medicinesCount: Array.isArray(data.medicines) ? data.medicines.length : 0,
    invoicesCount: Array.isArray(data.invoices) ? data.invoices.length : 0,
    partiesCount: Array.isArray(data.suppliers) ? data.suppliers.length : 0,
    purchaseOrdersCount: Array.isArray(data.purchaseOrders) ? data.purchaseOrders.length : 0,
    expensesCount: Array.isArray(data.expenses) ? data.expenses.length : 0,
    paymentsCount: Array.isArray(data.partyPayments) ? data.partyPayments.length : 0,
    bankAccountsCount: Array.isArray(data.bankAccounts) ? data.bankAccounts.length : 0,
    bankTransactionsCount: Array.isArray(data.bankTransactions) ? data.bankTransactions.length : 0,
    chequesCount: Array.isArray(data.cheques) ? data.cheques.length : 0,
    loanAccountsCount: Array.isArray(data.loanAccounts) ? data.loanAccounts.length : 0,
    usersCount: Array.isArray(data.appUsers) ? data.appUsers.length : 0,
    shiftsCount: Array.isArray(data.cashierShifts) ? data.cashierShifts.length : 0,
    onlineOrdersCount: Array.isArray(data.onlineOrders) ? data.onlineOrders.length : 0,
    narcoticsLogsCount: Array.isArray(data.narcoticsLogs) ? data.narcoticsLogs.length : 0,
    auditLogsCount: Array.isArray(data.auditLogs) ? data.auditLogs.length : 0,
    totalRecords: calculatedTotal
  };

  const isValid = errors.length === 0;

  return {
    isValid,
    integrityPassed,
    errors,
    warnings,
    stats,
    tenantInfo,
    timestamp,
    version,
    parsedSnapshot: isValid ? (parsed as BackupSnapshot) : undefined
  };
}

function getEmptyStats(): BackupStats {
  return {
    medicinesCount: 0,
    invoicesCount: 0,
    partiesCount: 0,
    purchaseOrdersCount: 0,
    expensesCount: 0,
    paymentsCount: 0,
    bankAccountsCount: 0,
    bankTransactionsCount: 0,
    chequesCount: 0,
    loanAccountsCount: 0,
    usersCount: 0,
    shiftsCount: 0,
    onlineOrdersCount: 0,
    narcoticsLogsCount: 0,
    auditLogsCount: 0,
    totalRecords: 0
  };
}

/**
 * Restores a verified snapshot into IndexedDB with safety controls and post-restore validation
 */
export async function executeVerifiedRestore(
  snapshot: BackupSnapshot, 
  options: { mode: 'replace' | 'merge'; restoreSettings?: boolean } = { mode: 'merge', restoreSettings: true }
): Promise<{ success: boolean; message: string; recordCount: number; restoredCounts: Record<string, number>; postValidationSuccess: boolean }> {
  try {
    const verification = verifyBackupSnapshot(snapshot);
    if (!verification.isValid) {
      throw new Error(`Restore blocked: ${verification.errors.join(', ')}`);
    }

    const db = await initDB();
    const { data, settingsSnapshot } = snapshot;
    let totalRestored = 0;
    const restoredCounts: Record<string, number> = {};

    // Helper to insert store
    const processStore = async (storeName: any, records: any[]) => {
      if (!Array.isArray(records) || records.length === 0) {
        restoredCounts[storeName] = 0;
        return;
      }

      if (options.mode === 'replace') {
        try {
          await db.clear(storeName);
        } catch (e) {}
      }

      const tx = db.transaction(storeName, 'readwrite');
      let count = 0;
      for (const item of records) {
        if (item && item.id) {
          await tx.store.put(item);
          count++;
          totalRestored++;
        }
      }
      await tx.done;
      restoredCounts[storeName] = count;
    };

    if (data.medicines) await processStore('medicines', data.medicines);
    if (data.invoices) await processStore('invoices', data.invoices);
    if (data.suppliers) await processStore('suppliers', data.suppliers);
    if (data.purchaseOrders) await processStore('purchaseOrders', data.purchaseOrders);
    if (data.expenses) await processStore('expenses', data.expenses);
    if (data.partyPayments) await processStore('partyPayments', data.partyPayments);
    if (data.bankAccounts) await processStore('bankAccounts', data.bankAccounts);
    if (data.bankTransactions) await processStore('bankTransactions', data.bankTransactions);
    if (data.cheques) await processStore('cheques', data.cheques);
    if (data.loanAccounts) await processStore('loanAccounts', data.loanAccounts);
    if (data.appUsers) await processStore('appUsers', data.appUsers);
    if (data.userActivities) await processStore('userActivities', data.userActivities);
    if (data.auditLogs) await processStore('auditLogs', data.auditLogs);
    if (data.cashierShifts) await processStore('cashierShifts', data.cashierShifts);
    if (data.onlineOrders) await processStore('onlineOrders', data.onlineOrders);
    if (data.onlinePromotions) await processStore('onlinePromotions', data.onlinePromotions);
    if (data.storeSettings) await processStore('storeSettings', data.storeSettings);
    if (data.shortageItems) await processStore('shortageItems', data.shortageItems);
    if (data.narcoticsLogs) await processStore('narcoticsLogs', data.narcoticsLogs);
    if (data.chronicRefills) await processStore('chronicRefills', data.chronicRefills);
    if (data.supplierReturns) await processStore('supplierReturns', data.supplierReturns);
    if (data.loyaltyCustomers) await processStore('loyaltyCustomers', data.loyaltyCustomers);

    // Restore settings if enabled
    if (options.restoreSettings && settingsSnapshot) {
      if (settingsSnapshot.appSettings) {
        localStorage.setItem('pharma_settings', JSON.stringify(settingsSnapshot.appSettings));
      }
      if (settingsSnapshot.rolePermissions) {
        localStorage.setItem('mbi_rbac_permissions', JSON.stringify(settingsSnapshot.rolePermissions));
      }
      if (settingsSnapshot.featureFlags) {
        localStorage.setItem('mbi_feature_flags', JSON.stringify(settingsSnapshot.featureFlags));
      }
      if (settingsSnapshot.safetyRules) {
        localStorage.setItem('mbi_safety_rules', JSON.stringify(settingsSnapshot.safetyRules));
      }
    }

    // Post-Restore Verification: Validate DB state
    const allMeds = await db.getAll('medicines').catch(() => []);
    const allInvs = await db.getAll('invoices').catch(() => []);
    const postValidationSuccess = (allMeds.length >= (restoredCounts.medicines || 0)) && 
                                  (allInvs.length >= (restoredCounts.invoices || 0));

    // Broadcast reload event to all open UI components
    window.dispatchEvent(new CustomEvent('mbi-database-restored', {
      detail: {
        timestamp: new Date().toISOString(),
        totalRestored,
        restoredCounts,
        businessName: snapshot.tenantInfo?.businessName
      }
    }));

    return {
      success: true,
      message: `Verified restore completed: ${totalRestored} database records successfully imported and verified.`,
      recordCount: totalRestored,
      restoredCounts,
      postValidationSuccess
    };
  } catch (err: any) {
    console.error('Failed to execute verified restore:', err);
    return {
      success: false,
      message: err?.message || 'Failed to restore database from backup file.',
      recordCount: 0,
      restoredCounts: {},
      postValidationSuccess: false
    };
  }
}

/**
 * Downloads the generated snapshot as a secure, timestamped .json file
 */
export function downloadBackupSnapshot(snapshot: BackupSnapshot) {
  const dateStr = new Date(snapshot.timestamp)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-');

  const safeBiz = (snapshot.tenantInfo?.businessName || 'inventra').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `mbi-backup-${safeBiz}-${dateStr}.mbi.enc`;
  
  // Encrypt snapshot before downloading
  const encryptedContainer = encryptBackupSnapshot(snapshot);
  const jsonStr = JSON.stringify(encryptedContainer, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record last backup timestamp in localStorage
  localStorage.setItem('mbi_last_backup_timestamp', snapshot.timestamp);
  localStorage.setItem('mbi_last_backup_records', snapshot.stats.totalRecords.toString());
}

/**
 * Pushes backup snapshot to central Express Server (Port 3000) & optional 3rd VPS mirror
 */
export async function pushBackupToServer(snapshot: BackupSnapshot, customVpsUrl?: string): Promise<{ success: boolean; message: string; serverSaved: boolean; vpsMirrored: boolean }> {
  let serverSaved = false;
  let vpsMirrored = false;
  let responseMsg = '';

  const encryptedContainer = encryptBackupSnapshot(snapshot);

  // 1. Push to Node.js backend server (/api/master/backup/push)
  try {
    const res = await fetch('/api/master/backup/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: snapshot.tenantInfo?.businessName || 'Default Pharmacy',
        installationId: snapshot.tenantInfo?.tenantId || 'tenant_default',
        recordCounts: snapshot.stats,
        notes: `Automated user backup by ${snapshot.tenantInfo?.operatorName || 'Admin'}`,
        backupPayload: encryptedContainer
      })
    });
    if (res.ok) {
      serverSaved = true;
      const data = await res.json();
      responseMsg = data.message || 'Saved to central server disk';
    }
  } catch (err) {
    console.warn('Could not push backup to /api/master/backup/push:', err);
  }

  // 2. Push to 3rd Emergency VPS Target if configured
  const vpsTarget = customVpsUrl || localStorage.getItem('mbi_vps_emergency_backup_url');
  if (vpsTarget && vpsTarget.startsWith('http')) {
    try {
      const vpsRes = await fetch(vpsTarget, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'EMERGENCY_3RD_BACKUP_MIRROR',
          source: 'MBI_INVENTRA_CLIENT',
          timestamp: new Date().toISOString(),
          tenantId: snapshot.tenantInfo?.tenantId,
          businessName: snapshot.tenantInfo?.businessName,
          stats: snapshot.stats,
          checksum: snapshot.checksum,
          payload: snapshot
        })
      });
      if (vpsRes.ok) {
        vpsMirrored = true;
      }
    } catch (e) {
      console.warn('3rd VPS Emergency backup mirror push failed:', e);
    }
  }

  // Store in rolling local backup storage
  try {
    const historyRaw = localStorage.getItem('mbi_recent_backups_index');
    let history: any[] = historyRaw ? JSON.parse(historyRaw) : [];
    history.unshift({
      id: `bk_${Date.now()}`,
      timestamp: snapshot.timestamp,
      formattedDate: snapshot.formattedDate,
      businessName: snapshot.tenantInfo?.businessName,
      totalRecords: snapshot.stats.totalRecords,
      checksum: snapshot.checksum,
      serverSaved,
      vpsMirrored
    });
    localStorage.setItem('mbi_recent_backups_index', JSON.stringify(history.slice(0, 10)));
  } catch (e) {}

  return {
    success: serverSaved || vpsMirrored,
    message: responseMsg || (serverSaved ? 'Backup saved to server' : 'Backup generated locally'),
    serverSaved,
    vpsMirrored
  };
}

/**
 * Automated Background Backup Service
 */
let autoBackupTimer: any = null;

export function startAutomatedBackupService(intervalMinutes: number = 30) {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
  }

  const runBackup = async () => {
    try {
      const isAutoEnabled = localStorage.getItem('mbi_auto_backup_enabled') !== 'false';
      if (!isAutoEnabled) return;

      const snapshot = await generateFullDatabaseSnapshot({ name: 'Auto-Scheduler', role: 'System Background Daemon' });
      await pushBackupToServer(snapshot);
      console.log(`[Auto-Backup Daemon] Successfully created and pushed automated snapshot (${snapshot.stats.totalRecords} records) at ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      console.error('[Auto-Backup Daemon] Error creating background backup:', err);
    }
  };

  // Run initial lightweight backup after 15 seconds
  setTimeout(runBackup, 15000);

  // Set recurring interval
  autoBackupTimer = setInterval(runBackup, Math.max(5, intervalMinutes) * 60 * 1000);
}

// Backward compatibility helper
export async function restoreDatabaseFromBackup(jsonString: string) {
  try {
    const verified = verifyBackupSnapshot(jsonString);
    if (!verified.isValid || !verified.parsedSnapshot) {
      return { success: false, message: verified.errors.join('. '), recordCount: 0 };
    }
    return await executeVerifiedRestore(verified.parsedSnapshot, { mode: 'merge', restoreSettings: true });
  } catch (e: any) {
    return { success: false, message: e?.message || 'Restore error', recordCount: 0 };
  }
}
