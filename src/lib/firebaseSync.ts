import { saveRecordToFirestore, deleteRecordFromFirestore, fetchCollectionFromFirestore, subscribeToFirestoreCollection } from './firebase';
import { bulkUpsertRecordsFromCloud, getCurrentBusinessContext } from './db';
import { emitToast } from '../contexts/ToastContext';
import { errorReporter } from './errorReporter';

export type FirebaseSyncState = 'synced' | 'syncing' | 'offline' | 'unsynced' | 'error';

export interface PendingSyncItem {
  id: string;
  collectionName: string;
  data: any;
  action: 'set' | 'delete';
  timestamp: number;
  retryCount: number;
}

export interface SyncStatusInfo {
  state: FirebaseSyncState;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
  isOnline: boolean;
}

const QUEUE_STORAGE_KEY = 'mbi_pending_firestore_sync_queue';
const LAST_SYNC_KEY = 'mbi_last_firestore_sync_time';

const SYNCED_COLLECTIONS = [
  'invoices',
  'medicines',
  'suppliers',
  'purchaseOrders',
  'expenses',
  'partyPayments',
  'bankAccounts',
  'bankTransactions',
  'cheques',
  'loanAccounts',
  'auditLogs',
  'appUsers'
] as const;

class FirebaseSyncManager {
  private listeners: Set<(info: SyncStatusInfo) => void> = new Set();
  private isProcessing = false;
  private isPulling = false;
  private realtimeUnsubscribers: (() => void)[] = [];
  private retryInterval: any = null;
  private currentState: FirebaseSyncState = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  private lastError: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check initial state
      if (!navigator.onLine) {
        this.currentState = 'offline';
      } else {
        const pending = this.getQueue();
        this.currentState = pending.length > 0 ? 'unsynced' : 'synced';
      }

      // Connectivity change listeners
      window.addEventListener('online', () => {
        this.currentState = this.getQueue().length > 0 ? 'unsynced' : 'synced';
        this.notify();
        // Trigger automatic retry and pull immediately on reconnect
        this.flushQueue();
        this.pullAllFromFirestore();
      });

      window.addEventListener('offline', () => {
        this.currentState = 'offline';
        this.notify();
      });

      // Background retry interval every 15 seconds
      this.retryInterval = setInterval(() => {
        if (navigator.onLine && !this.isProcessing && this.getQueue().length > 0) {
          this.flushQueue();
        }
      }, 15000);

      // Initial cloud pull and realtime sync after boot
      setTimeout(() => {
        if (navigator.onLine) {
          this.pullAllFromFirestore();
          this.startRealtimeListeners();
          if (this.getQueue().length > 0) {
            this.flushQueue();
          }
        }
      }, 1000);
    }
  }

  public getQueue(): PendingSyncItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private setQueue(queue: PendingSyncItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.updateState();
    } catch (e) {
      console.warn('Failed to save firestore queue to localStorage', e);
    }
  }

  public getLastSyncTime(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_SYNC_KEY);
  }

  private setLastSyncTime(timeIso: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LAST_SYNC_KEY, timeIso);
    } catch {}
  }

  public getStatusInfo(): SyncStatusInfo {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pending = this.getQueue();
    let state = this.currentState;

    if (!isOnline) {
      state = 'offline';
    } else if (this.isProcessing || this.isPulling) {
      state = 'syncing';
    } else if (pending.length > 0) {
      state = 'unsynced';
    } else {
      state = 'synced';
    }

    return {
      state,
      pendingCount: pending.length,
      lastSyncTime: this.getLastSyncTime(),
      lastError: this.lastError,
      isOnline,
    };
  }

  public subscribe(callback: (info: SyncStatusInfo) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatusInfo());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const info = this.getStatusInfo();
    this.listeners.forEach((fn) => {
      try {
        fn(info);
      } catch (e) {
        console.error('Error in firestore sync listener:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-firebase-sync-state', { detail: info }));
    }
  }

  private updateState() {
    const pending = this.getQueue();
    if (!navigator.onLine) {
      this.currentState = 'offline';
    } else if (this.isProcessing || this.isPulling) {
      this.currentState = 'syncing';
    } else if (pending.length > 0) {
      this.currentState = 'unsynced';
    } else {
      this.currentState = 'synced';
    }
    this.notify();
  }

  /**
   * Enqueue a record for Firestore push
   */
  public async queueRecord(collectionName: string, id: string, data: any, action: 'set' | 'delete' = 'set'): Promise<void> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // If online, attempt direct save or delete first
    if (isOnline) {
      try {
        this.currentState = 'syncing';
        this.notify();
        let success = false;
        if (action === 'delete') {
          success = await deleteRecordFromFirestore(collectionName, id);
          if (collectionName === 'appUsers') {
            deleteRecordFromFirestore('app_users', id).catch(() => {});
          } else if (collectionName === 'app_users') {
            deleteRecordFromFirestore('appUsers', id).catch(() => {});
          }
        } else {
          success = await saveRecordToFirestore(collectionName, id, data);
        }

        if (success) {
          const now = new Date().toISOString();
          this.setLastSyncTime(now);
          this.currentState = this.getQueue().length > 0 ? 'unsynced' : 'synced';
          this.lastError = null;
          this.notify();
          return;
        }
      } catch (err: any) {
        console.warn(`Direct sync to Firestore failed for ${collectionName}/${id}, enqueueing:`, err);
        this.lastError = err?.message || 'Direct sync failed';
      }
    }

    // Otherwise (or if direct save failed), push to pending queue
    const queue = this.getQueue();
    const filtered = queue.filter((item) => !(item.collectionName === collectionName && item.id === id));
    filtered.push({
      id,
      collectionName,
      data,
      action,
      timestamp: Date.now(),
      retryCount: 0,
    });

    this.setQueue(filtered);
    this.updateState();
  }

  /**
   * Flush pending queue to Firestore (background retry)
   */
  public async flushQueue(): Promise<{ success: boolean; pushedCount: number; remainingCount: number }> {
    if (this.isProcessing) {
      return { success: true, pushedCount: 0, remainingCount: this.getQueue().length };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.currentState = 'offline';
      this.notify();
      return { success: false, pushedCount: 0, remainingCount: this.getQueue().length };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      this.currentState = 'synced';
      this.notify();
      return { success: true, pushedCount: 0, remainingCount: 0 };
    }

    this.isProcessing = true;
    this.currentState = 'syncing';
    this.notify();

    let pushedCount = 0;
    const remaining: PendingSyncItem[] = [];

    for (const item of queue) {
      try {
        let ok = false;
        if (item.action === 'delete') {
          ok = await deleteRecordFromFirestore(item.collectionName, item.id);
          if (item.collectionName === 'appUsers') {
            deleteRecordFromFirestore('app_users', item.id).catch(() => {});
          } else if (item.collectionName === 'app_users') {
            deleteRecordFromFirestore('appUsers', item.id).catch(() => {});
          }
        } else {
          ok = await saveRecordToFirestore(item.collectionName, item.id, item.data);
        }

        if (ok) {
          pushedCount++;
        } else {
          remaining.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        }
      } catch (err: any) {
        this.lastError = err?.message || 'Sync error';
        errorReporter.logSyncFailure(item.collectionName, err, item.id);
        remaining.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      }
    }

    this.isProcessing = false;
    this.setQueue(remaining);

    if (remaining.length === 0) {
      this.setLastSyncTime(new Date().toISOString());
      this.currentState = 'synced';
      this.lastError = null;
      if (pushedCount > 0) {
        emitToast(`Data Synced (${pushedCount} ${pushedCount === 1 ? 'record' : 'records'})`, 'success');
      }
    } else {
      this.currentState = 'unsynced';
    }

    this.notify();
    return {
      success: remaining.length === 0,
      pushedCount,
      remainingCount: remaining.length,
    };
  }

  /**
   * Pull all cloud records from Firestore into local IndexedDB
   * This ensures Incognito tabs, new devices, and remote browser clients get all data instantly.
   */
  public async pullAllFromFirestore(): Promise<{ totalPulled: number; error: string | null }> {
    if (this.isPulling) return { totalPulled: 0, error: null };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { totalPulled: 0, error: 'Offline' };
    }

    this.isPulling = true;
    this.currentState = 'syncing';
    this.notify();

    let totalPulled = 0;
    let syncError: string | null = null;

    const ctx = getCurrentBusinessContext();
    const activeTenantId = ctx.isMaster ? undefined : ctx.tenantId;

    try {
      for (const col of SYNCED_COLLECTIONS) {
        try {
          const records = await fetchCollectionFromFirestore(col, activeTenantId);
          if (records && records.length > 0) {
            await bulkUpsertRecordsFromCloud(col as any, records);
            totalPulled += records.length;
          }
        } catch (colErr: any) {
          console.warn(`Error pulling collection ${col} from Firestore:`, colErr);
          errorReporter.logSyncFailure(col, colErr);
        }
      }

      const now = new Date().toISOString();
      this.setLastSyncTime(now);
      this.lastError = null;
    } catch (e: any) {
      syncError = e?.message || 'Pull sync error';
      this.lastError = syncError;
      errorReporter.logError({
        type: 'sync_failure',
        message: `Firestore pull failed: ${syncError}`,
        source: 'FirebaseSyncManager:pullAllFromFirestore',
        stack: e?.stack,
      });
    } finally {
      this.isPulling = false;
      this.updateState();
    }

    return { totalPulled, error: syncError };
  }

  /**
   * Start real-time Firestore listeners for immediate live multi-device syncing
   */
  public startRealtimeListeners() {
    if (this.realtimeUnsubscribers.length > 0) {
      return; // Already listening
    }

    const ctx = getCurrentBusinessContext();
    const activeTenantId = ctx.isMaster ? undefined : ctx.tenantId;

    const priorityCollections: (typeof SYNCED_COLLECTIONS)[number][] = [
      'invoices',
      'medicines',
      'suppliers',
      'purchaseOrders',
      'expenses',
      'partyPayments'
    ];

    priorityCollections.forEach((col) => {
      const unsub = subscribeToFirestoreCollection(col, (items) => {
        if (items && items.length > 0) {
          bulkUpsertRecordsFromCloud(col as any, items).catch(() => {});
        }
      }, activeTenantId);
      this.realtimeUnsubscribers.push(unsub);
    });
  }

  public restartRealtimeListeners() {
    this.stopRealtimeListeners();
    this.startRealtimeListeners();
  }

  public stopRealtimeListeners() {
    this.realtimeUnsubscribers.forEach((u) => {
      try {
        u();
      } catch {}
    });
    this.realtimeUnsubscribers = [];
  }
}

export const firebaseSyncManager = new FirebaseSyncManager();

/**
 * React hook for consuming Firebase Sync status anywhere
 */
import { useState, useEffect } from 'react';

export function useFirebaseSyncStatus() {
  const [status, setStatus] = useState<SyncStatusInfo>(() => firebaseSyncManager.getStatusInfo());

  useEffect(() => {
    const unsub = firebaseSyncManager.subscribe((info) => {
      setStatus(info);
    });
    return unsub;
  }, []);

  const triggerRetry = async () => {
    await firebaseSyncManager.flushQueue();
    return await firebaseSyncManager.pullAllFromFirestore();
  };

  return {
    ...status,
    triggerRetry,
    pullFromCloud: () => firebaseSyncManager.pullAllFromFirestore(),
  };
}
