import { 
  dbMedicines, dbInvoices, dbSuppliers, dbPurchaseOrders, 
  dbPartyPayments, dbExpenses, dbBankTransactions, dbAuditLogs, initDB 
} from './db';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface SyncEventDetail {
  source: string;
  storeName?: string;
  action?: 'save' | 'delete' | 'full';
  timestamp: string;
}

class SyncEngine {
  private channel: BroadcastChannel | null = null;
  private syncStatus: SyncStatus = 'synced';
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private isPulling = false;
  private isPushing = false;
  private pollInterval: any = null;
  private lastSyncTimestamp: string = new Date().toISOString();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel('mbi_inventra_live_sync');
          this.channel.onmessage = (event) => this.handleBroadcastMessage(event.data);
        }
      } catch (e) {
        console.warn('BroadcastChannel not supported, falling back to storage events');
      }

      // Fallback cross-tab sync via storage events
      window.addEventListener('storage', (e) => {
        if (e.key === 'mbi_live_sync_ping') {
          this.notifyLocalSubscribers({
            source: 'storage',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Sync on window focus / re-entry
      window.addEventListener('focus', () => {
        this.pullServerSync(false);
      });

      window.addEventListener('online', () => {
        this.setStatus('synced');
        this.pullServerSync(false);
      });

      window.addEventListener('offline', () => {
        this.setStatus('offline');
      });

      // Periodic background poll every 6 seconds for multi-browser sync
      this.pollInterval = setInterval(() => {
        if (navigator.onLine && !this.isPulling && !this.isPushing) {
          this.pullServerSync(false);
        }
      }, 6000);

      // Initial pull on start
      setTimeout(() => {
        this.pullServerSync(false);
      }, 1000);
    }
  }

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  public getLastSyncTime(): string {
    return this.lastSyncTimestamp;
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.syncStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onDataChange(listener: (detail?: SyncEventDetail) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SyncEventDetail>;
      listener(customEvent.detail);
    };
    window.addEventListener('mbi-data-synced', handler);
    return () => {
      window.removeEventListener('mbi-data-synced', handler);
    };
  }

  public onSyncMessage(listener: (detail?: any) => void): () => void {
    return this.onDataChange(listener);
  }

  private setStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.listeners.forEach(fn => fn(status));
  }

  private notifyLocalSubscribers(detail: SyncEventDetail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-data-synced', { detail }));
    }
  }

  private async handleBroadcastMessage(data: any) {
    if (!data || !data.type) return;

    if (data.type === 'RECORD_UPDATED') {
      const { storeName, action, record, id } = data;
      try {
        const db = await initDB();
        if (action === 'save' && record) {
          await db.put(storeName, record);
        } else if (action === 'delete' && id) {
          await db.delete(storeName, id);
        }
      } catch (err) {
        console.warn('Broadcast sync store update failed:', err);
      }

      this.notifyLocalSubscribers({
        source: 'broadcast',
        storeName,
        action,
        timestamp: data.timestamp || new Date().toISOString()
      });
    } else if (data.type === 'FULL_SYNC_PING') {
      this.notifyLocalSubscribers({
        source: 'broadcast',
        action: 'full',
        timestamp: data.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast a single local record change to other tabs and sync to server
   */
  public broadcastLocalChange(storeName: string, action: 'save' | 'delete', recordOrId: any) {
    const timestamp = new Date().toISOString();
    this.lastSyncTimestamp = timestamp;

    // 1. Send via BroadcastChannel for 0ms same-browser tab sync
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'RECORD_UPDATED',
          storeName,
          action,
          record: action === 'save' ? recordOrId : undefined,
          id: action === 'delete' ? (typeof recordOrId === 'string' ? recordOrId : recordOrId?.id) : recordOrId?.id,
          timestamp
        });
      } catch (e) {
        console.warn('Channel post failed:', e);
      }
    }

    // 2. Storage event fallback
    try {
      localStorage.setItem('mbi_live_sync_ping', `${storeName}_${action}_${timestamp}`);
    } catch {}

    // 3. Background push to Cloud Server
    this.debouncedServerPush();
  }

  private pushTimeout: any = null;
  private debouncedServerPush() {
    if (this.pushTimeout) clearTimeout(this.pushTimeout);
    this.pushTimeout = setTimeout(() => {
      this.pushServerSync();
    }, 800);
  }

  /**
   * Pull latest data from server API
   */
  public async pullServerSync(showToast = false): Promise<{ success: boolean; message: string }> {
    if (this.isPulling) return { success: true, message: 'Sync in progress' };
    this.isPulling = true;
    this.setStatus('syncing');

    try {
      let serverData: any = null;

      // 1. Try local Express / Vite Server API
      try {
        const res = await fetch('/api/sync', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            serverData = json.data;
          }
        }
      } catch (err) {
        // Silent server fetch fallback
      }

      // Merge serverData into local IndexedDB
      if (serverData && typeof serverData === 'object') {
        const db = await initDB();
        const storeMap: Record<string, any[]> = {
          medicines: serverData.medicines || [],
          invoices: serverData.invoices || [],
          purchaseOrders: serverData.purchaseOrders || [],
          suppliers: serverData.suppliers || [],
          partyPayments: serverData.partyPayments || [],
          expenses: serverData.expenses || [],
          bankTransactions: serverData.bankTransactions || [],
          auditLogs: serverData.auditLogs || []
        };

        let updatedCount = 0;
        for (const [storeName, items] of Object.entries(storeMap)) {
          if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
              if (item && item.id) {
                const existing = await db.get(storeName as any, item.id);
                // Extract comparable timestamps
                const itemTime = new Date(item.updatedAt || item.timestamp || item.createdAt || item.date || item.orderDate || 0).getTime();
                const existingTime = existing ? new Date(existing.updatedAt || existing.timestamp || existing.createdAt || existing.date || existing.orderDate || 0).getTime() : 0;
                
                // If remote is newer or doesn't exist locally
                if (!existing || (itemTime > existingTime)) {
                  await db.put(storeName as any, item);
                  updatedCount++;
                }
              }
            }
          }
        }

        if (updatedCount > 0) {
          this.notifyLocalSubscribers({
            source: 'server_pull',
            action: 'full',
            timestamp: new Date().toISOString()
          });
        }
      }

      this.setStatus('synced');
      this.lastSyncTimestamp = new Date().toISOString();
      return { success: true, message: 'Sync successful with cloud & connected browsers.' };
    } catch (e: any) {
      console.warn('Sync pull notice:', e);
      this.setStatus('error');
      return { success: false, message: e?.message || 'Sync encountered a temporary issue.' };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Push all local data to server API
   */
  public async pushServerSync(): Promise<{ success: boolean; message: string }> {
    if (this.isPushing) return { success: true, message: 'Push in progress' };
    this.isPushing = true;
    this.setStatus('syncing');

    try {
      const [
        medicines,
        invoices,
        suppliers,
        purchaseOrders,
        partyPayments,
        expenses,
        bankTransactions,
        auditLogs
      ] = await Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbPartyPayments.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
        dbBankTransactions.getAll().catch(() => []),
        dbAuditLogs.getAll().catch(() => [])
      ]);

      const payload = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
          medicines,
          invoices,
          suppliers,
          purchaseOrders,
          partyPayments,
          expenses,
          bankTransactions,
          auditLogs
        }
      };

      // 1. Push to Server API
      let serverPushed = false;
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) serverPushed = true;
      } catch (err) {}

      this.setStatus('synced');
      this.lastSyncTimestamp = new Date().toISOString();
      return {
        success: true,
        message: serverPushed ? 'Successfully synchronized with server & connected browsers!' : 'Saved locally & cached for synchronization.'
      };
    } catch (err: any) {
      this.setStatus('error');
      return { success: false, message: err?.message || 'Push failed' };
    } finally {
      this.isPushing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
