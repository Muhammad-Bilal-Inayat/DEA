import { 
  dbMedicines, dbInvoices, dbSuppliers, dbPurchaseOrders, 
  dbPartyPayments, dbExpenses, dbBankTransactions, dbAuditLogs, dbAppUsers,
  initDB 
} from './db';

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error';

export interface DiscrepancyItem {
  id: string;
  storeName: string;
  type: 'missing_local' | 'missing_remote' | 'local_newer' | 'remote_newer' | 'identical';
  localTimestamp?: string;
  remoteTimestamp?: string;
  localItem?: any;
  remoteItem?: any;
}

export interface DiscrepancyReport {
  hasDiscrepancies: boolean;
  totalDiscrepancies: number;
  missingInLocalCount: number;
  missingInRemoteCount: number;
  conflictsCount: number;
  stores: Record<string, {
    totalLocal: number;
    totalRemote: number;
    missingInLocal: number;
    missingInRemote: number;
    conflicts: number;
    discrepancies: DiscrepancyItem[];
  }>;
  timestamp: string;
}

export interface SyncEventPayload {
  storeName: string;
  action: 'add' | 'save' | 'delete' | 'reconcile' | 'full';
  record?: any;
  id?: string;
  timestamp: string;
  source: 'local' | 'broadcast' | 'server' | 'reconcile';
}

/**
 * Consistent ID generation for offline-first entries
 * Ensures timestamp sorting, collision resistance, and deterministic prefixing.
 */
export function generateOfflineId(prefix = 'item'): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  const cryptoRand = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID().split('-')[0] 
    : Math.floor(Math.random() * 10000).toString(16);
  return `${prefix}-${timestamp}-${randomPart}${cryptoRand}`;
}

/**
 * Ensure an offline-first entry has consistent identifiers and timestamps
 */
export function stampOfflineEntry<T extends Record<string, any>>(record: T, prefix = 'rec'): T & {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'conflict';
} {
  const now = new Date().toISOString();
  return {
    ...record,
    id: record.id || generateOfflineId(prefix),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    syncStatus: record.syncStatus || 'pending'
  };
}

/**
 * Helper to extract comparable millisecond timestamp
 */
export function extractRecordTimestamp(record: any): number {
  if (!record || typeof record !== 'object') return 0;
  const candidates = [record.updatedAt, record.timestamp, record.createdAt, record.date, record.orderDate];
  for (const candidate of candidates) {
    if (candidate) {
      const parsed = new Date(candidate).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 0;
}

class UnifiedSyncService {
  private channel: BroadcastChannel | null = null;
  private changeListeners: Set<(payload: SyncEventPayload) => void> = new Set();
  private statusListeners: Set<(status: SyncStatusType) => void> = new Set();
  private isReconciling = false;
  private isPushing = false;
  private currentStatus: SyncStatusType = 'synced';
  private lastReport: DiscrepancyReport | null = null;
  private syncBatchQueue: Map<string, { entityType: string; record: any }> = new Map();
  private batchDebounceTimer: any = null;
  private isFlushingBatch = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('mbi_unified_sync_channel');
          this.channel.onmessage = (event) => this.handleBroadcast(event.data);
        }
      } catch (e) {
        console.warn('BroadcastChannel fallback enabled');
      }

      window.addEventListener('storage', (e) => {
        if (e.key === 'mbi_unified_sync_trigger' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.emitChangeEvent({
              ...data,
              source: 'broadcast'
            });
          } catch (err) {}
        }
      });

      // Auto-reconcile on focus & online
      window.addEventListener('focus', () => {
        this.detectAndReconcile(false);
      });
      window.addEventListener('online', () => {
        this.setStatus('synced');
        this.flushSyncBatch().catch(() => {});
        this.detectAndReconcile(false);
      });
      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });
    }
  }

  public getStatus(): SyncStatusType {
    return this.currentStatus;
  }

  public getLastReport(): DiscrepancyReport | null {
    return this.lastReport;
  }

  public subscribeStatus(listener: (status: SyncStatusType) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => this.statusListeners.delete(listener);
  }

  public onEntityChange(listener: (payload: SyncEventPayload) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private setStatus(status: SyncStatusType) {
    this.currentStatus = status;
    this.statusListeners.forEach(fn => fn(status));
  }

  private handleBroadcast(data: any) {
    if (!data || !data.storeName) return;
    this.emitChangeEvent({
      ...data,
      source: 'broadcast'
    });
  }

  private emitChangeEvent(payload: SyncEventPayload) {
    // Notify all listeners
    this.changeListeners.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {
        console.error('Error in sync change listener:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail: payload }));
      window.dispatchEvent(new CustomEvent('mbi-entity-added', { detail: payload }));
    }
  }

  /**
   * Forces a re-fetch of the state to refresh the UI immediately after any 'Add' or 'Save' operation
   */
  public async notifyEntityAdded(storeName: string, record: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const stamped = {
      ...record,
      updatedAt: record.updatedAt || timestamp,
      createdAt: record.createdAt || timestamp
    };

    const payload: SyncEventPayload = {
      storeName,
      action: 'add',
      record: stamped,
      id: stamped.id,
      timestamp,
      source: 'local'
    };

    // 1. Broadcast to other tabs immediately
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {}
    }

    // 2. Storage event trigger for multi-tab fallback
    try {
      localStorage.setItem('mbi_unified_sync_trigger', JSON.stringify(payload));
    } catch (e) {}

    // 3. Emit local event for current tab UI components to immediately re-fetch
    this.emitChangeEvent(payload);

    // 4. Send batched update via debounced queue to backend server
    this.queueRecordForSync(storeName, stamped);
  }

  /**
   * Queue record into client-side debounced batching queue
   */
  public queueRecordForSync(entityType: string, record: any): void {
    if (!record || !record.id) return;
    const queueKey = `${entityType}:${record.id}`;
    this.syncBatchQueue.set(queueKey, { entityType, record });

    if (this.batchDebounceTimer) clearTimeout(this.batchDebounceTimer);
    this.batchDebounceTimer = setTimeout(() => {
      this.flushSyncBatch().catch(() => {});
    }, 350);
  }

  /**
   * Flush queued records to server in a single request (or single record if only 1)
   */
  public async flushSyncBatch(): Promise<void> {
    if (this.isFlushingBatch || this.syncBatchQueue.size === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return; // Keep queued for when back online
    }

    this.isFlushingBatch = true;
    const items = Array.from(this.syncBatchQueue.values());
    this.syncBatchQueue.clear();

    try {
      if (items.length === 1) {
        await fetch('/api/sync/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items[0]),
        });
      } else {
        await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: items }),
        });
      }
    } catch (err) {
      // Re-queue items if network failed
      for (const it of items) {
        const key = `${it.entityType}:${it.record.id}`;
        if (!this.syncBatchQueue.has(key)) {
          this.syncBatchQueue.set(key, it);
        }
      }
    } finally {
      this.isFlushingBatch = false;
    }
  }

  /**
   * Push single record directly or queue it
   */
  public async pushSingleRecord(entityType: string, record: any): Promise<void> {
    this.queueRecordForSync(entityType, record);
  }

  /**
   * Collect all local records across stores
   */
  public async getLocalStoreData(): Promise<Record<string, any[]>> {
    const [
      medicines, invoices, purchaseOrders, suppliers, 
      partyPayments, expenses, bankTransactions, auditLogs, appUsers
    ] = await Promise.all([
      dbMedicines.getAll().catch(() => []),
      dbInvoices.getAll().catch(() => []),
      dbPurchaseOrders.getAll().catch(() => []),
      dbSuppliers.getAll().catch(() => []),
      dbPartyPayments.getAll().catch(() => []),
      dbExpenses.getAll().catch(() => []),
      dbBankTransactions.getAll().catch(() => []),
      dbAuditLogs.getAll().catch(() => []),
      dbAppUsers.getAll().catch(() => [])
    ]);

    return {
      medicines,
      invoices,
      purchaseOrders,
      suppliers,
      partyPayments,
      expenses,
      bankTransactions,
      auditLogs,
      appUsers
    };
  }

  /**
   * Fetch current remote data from Server sync API
   */
  public async getRemoteStoreData(): Promise<Record<string, any[]> | null> {
    // 1. Local Express API
    try {
      const res = await fetch('/api/sync', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) return json.data;
      }
    } catch (e) {}

    return null;
  }

  /**
   * Detect data discrepancies between client and sync API
   */
  public async detectDiscrepancies(): Promise<DiscrepancyReport> {
    const localData = await this.getLocalStoreData();
    const remoteData = (await this.getRemoteStoreData()) || {};

    const report: DiscrepancyReport = {
      hasDiscrepancies: false,
      totalDiscrepancies: 0,
      missingInLocalCount: 0,
      missingInRemoteCount: 0,
      conflictsCount: 0,
      stores: {},
      timestamp: new Date().toISOString()
    };

    const allStores = Array.from(new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData)
    ]));

    for (const storeName of allStores) {
      const localItems: any[] = Array.isArray(localData[storeName]) ? localData[storeName] : [];
      const remoteItems: any[] = Array.isArray(remoteData[storeName]) ? remoteData[storeName] : [];

      const localMap = new Map<string, any>();
      for (const item of localItems) {
        if (item && item.id) localMap.set(item.id, item);
      }

      const remoteMap = new Map<string, any>();
      for (const item of remoteItems) {
        if (item && item.id) remoteMap.set(item.id, item);
      }

      const discrepancies: DiscrepancyItem[] = [];
      let missingInLocal = 0;
      let missingInRemote = 0;
      let conflicts = 0;

      // Check items in remote
      for (const [id, remoteItem] of remoteMap.entries()) {
        if (!localMap.has(id)) {
          missingInLocal++;
          discrepancies.push({
            id,
            storeName,
            type: 'missing_local',
            remoteTimestamp: remoteItem.updatedAt || remoteItem.createdAt,
            remoteItem
          });
        } else {
          const localItem = localMap.get(id);
          const localTime = extractRecordTimestamp(localItem);
          const remoteTime = extractRecordTimestamp(remoteItem);

          if (localTime !== remoteTime) {
            conflicts++;
            discrepancies.push({
              id,
              storeName,
              type: localTime >= remoteTime ? 'local_newer' : 'remote_newer',
              localTimestamp: localItem.updatedAt || localItem.createdAt,
              remoteTimestamp: remoteItem.updatedAt || remoteItem.createdAt,
              localItem,
              remoteItem
            });
          }
        }
      }

      // Check local items not present in remote
      for (const [id, localItem] of localMap.entries()) {
        if (!remoteMap.has(id)) {
          missingInRemote++;
          discrepancies.push({
            id,
            storeName,
            type: 'missing_remote',
            localTimestamp: localItem.updatedAt || localItem.createdAt,
            localItem
          });
        }
      }

      const storeDiscrepancyCount = missingInLocal + missingInRemote + conflicts;
      if (storeDiscrepancyCount > 0) {
        report.hasDiscrepancies = true;
        report.totalDiscrepancies += storeDiscrepancyCount;
        report.missingInLocalCount += missingInLocal;
        report.missingInRemoteCount += missingInRemote;
        report.conflictsCount += conflicts;
      }

      report.stores[storeName] = {
        totalLocal: localItems.length,
        totalRemote: remoteItems.length,
        missingInLocal,
        missingInRemote,
        conflicts,
        discrepancies
      };
    }

    this.lastReport = report;
    return report;
  }

  /**
   * Reconcile discrepancies with timestamp-first conflict resolution:
   * - Newer local entries are prioritized and pushed to server
   * - Newer remote entries are merged into local database
   */
  public async reconcileDiscrepancies(customReport?: DiscrepancyReport): Promise<{
    success: boolean;
    reconciledCount: number;
    message: string;
  }> {
    if (this.isReconciling) return { success: true, reconciledCount: 0, message: 'Reconcile already in progress' };
    this.isReconciling = true;
    this.setStatus('syncing');

    try {
      const report = customReport || (await this.detectDiscrepancies());
      if (!report.hasDiscrepancies) {
        this.setStatus('synced');
        return { success: true, reconciledCount: 0, message: 'All client and cloud records are in perfect synchronization.' };
      }

      const db = await initDB();
      let updatedLocalCount = 0;
      let needsRemotePush = false;

      for (const [storeName, storeInfo] of Object.entries(report.stores)) {
        for (const item of storeInfo.discrepancies) {
          if (item.type === 'missing_local' && item.remoteItem) {
            // Write to local IndexedDB
            try {
              await db.put(storeName as any, item.remoteItem);
              updatedLocalCount++;
            } catch (e) {}
          } else if (item.type === 'remote_newer' && item.remoteItem) {
            // Remote is newer: write to local IndexedDB
            try {
              await db.put(storeName as any, item.remoteItem);
              updatedLocalCount++;
            } catch (e) {}
          } else if (item.type === 'local_newer' || item.type === 'missing_remote') {
            // Local is newer: needs push to remote
            needsRemotePush = true;
          }
        }
      }

      // If local had newer records, push to remote
      if (needsRemotePush) {
        const fullLocal = await this.getLocalStoreData();
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: fullLocal })
        }).catch(() => {});
      }

      this.setStatus('synced');

      // Force UI refresh across components
      this.emitChangeEvent({
        storeName: 'all',
        action: 'reconcile',
        timestamp: new Date().toISOString(),
        source: 'reconcile'
      });

      return {
        success: true,
        reconciledCount: report.totalDiscrepancies,
        message: `Successfully reconciled ${report.totalDiscrepancies} discrepancies with timestamp prioritization.`
      };
    } catch (err: any) {
      this.setStatus('error');
      return { success: false, reconciledCount: 0, message: err?.message || 'Failed to reconcile discrepancies.' };
    } finally {
      this.isReconciling = false;
    }
  }

  /**
   * Quick detect & reconcile convenience method
   */
  public async detectAndReconcile(showNotification = false): Promise<void> {
    const report = await this.detectDiscrepancies();
    if (report.hasDiscrepancies) {
      await this.reconcileDiscrepancies(report);
    }
  }
}

export const unifiedSyncService = new UnifiedSyncService();
