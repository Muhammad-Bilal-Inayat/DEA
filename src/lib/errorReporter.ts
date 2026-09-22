/**
 * MBI Inventra - Centralized Client-Side & Server Error Reporting Utility
 * Captures application crashes, unhandled promises, Firestore errors, and sync failures.
 * Persists errors locally and transmits them to server-side logging endpoint (/api/report-error).
 */

export interface AppErrorLog {
  id: string;
  timestamp: string;
  type: 'runtime_error' | 'unhandled_rejection' | 'sync_failure' | 'firestore_permission' | 'firestore_connection' | 'custom_warning';
  message: string;
  stack?: string;
  source?: string;
  url: string;
  isIframe: boolean;
  userAgent: string;
  metadata?: Record<string, any>;
}

export interface ServerDiagnosticReport {
  success: boolean;
  status: string;
  timestamp: string;
  storage: {
    fileSize: number;
    lastModified: string | null;
    storeCounts: Record<string, number>;
  };
  serverErrorsCount: number;
}

const ERROR_STORAGE_KEY = 'mbi_client_error_logs_v1';
const MAX_STORED_ERRORS = 100;

class ErrorReporter {
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Capture uncaught JavaScript errors
    window.addEventListener('error', (event: ErrorEvent) => {
      // Ignore benign resize observer loop errors
      if (event.message && (event.message.includes('ResizeObserver loop') || event.message.includes('Script error.'))) {
        return;
      }
      this.logError({
        type: 'runtime_error',
        message: event.message || 'Unknown runtime error',
        stack: event.error?.stack,
        source: `${event.filename || 'unknown'}:${event.lineno || 0}:${event.colno || 0}`,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack: string | undefined;
      let type: AppErrorLog['type'] = 'unhandled_rejection';

      if (typeof reason === 'string') {
        msg = reason;
      } else if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack;
      } else if (reason && typeof reason === 'object') {
        msg = reason.message || JSON.stringify(reason);
      }

      if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
        type = 'firestore_permission';
      } else if (msg.includes('unavailable') || msg.includes('offline') || msg.includes('Failed to get document')) {
        type = 'firestore_connection';
      }

      this.logError({
        type,
        message: msg,
        stack,
        source: 'PromiseRejection',
        metadata: { reasonDetails: typeof reason === 'object' ? reason : undefined },
      });
    });
  }

  public logError(params: {
    type: AppErrorLog['type'];
    message: string;
    stack?: string;
    source?: string;
    metadata?: Record<string, any>;
  }) {
    if (typeof window === 'undefined') return;

    try {
      const isIframe = window.self !== window.top;
      const newLog: AppErrorLog = {
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: params.type,
        message: params.message || 'Unknown error',
        stack: params.stack,
        source: params.source || 'ClientApp',
        url: window.location.href,
        isIframe,
        userAgent: navigator.userAgent,
        metadata: params.metadata,
      };

      const existing = this.getLogs();
      const updated = [newLog, ...existing].slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updated));

      // Dispatch event for UI listeners
      window.dispatchEvent(new CustomEvent('mbi-error-logged', { detail: newLog }));

      // Transmit to Server-Side Reporting Endpoint asynchronously
      this.sendToServer(newLog).catch(() => {});
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }

  private async sendToServer(log: AppErrorLog): Promise<void> {
    try {
      await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
    } catch {
      // Offline fallback
    }
  }

  public logSyncFailure(collection: string, error: any, docId?: string) {
    const isPermission = error?.code === 'permission-denied' || String(error?.message || '').includes('Missing or insufficient permissions');
    const isConnection = error?.code === 'unavailable' || String(error?.message || '').includes('offline');

    this.logError({
      type: isPermission ? 'firestore_permission' : (isConnection ? 'firestore_connection' : 'sync_failure'),
      message: `Firebase sync failed for collection "${collection}": ${error?.message || String(error)}`,
      stack: error?.stack,
      source: 'FirebaseSyncManager',
      metadata: { 
        collection, 
        docId, 
        errorCode: error?.code, 
        isPermission, 
        isConnection 
      },
    });
  }

  public getLogs(): AppErrorLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(ERROR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public clearLogs() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ERROR_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('mbi-error-logged', { detail: null }));
  }

  public async fetchServerLogs(): Promise<any[]> {
    try {
      const res = await fetch('/api/report-error', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        return json.logs || [];
      }
    } catch {
      // Return empty
    }
    return [];
  }

  public async fetchServerDiagnostics(): Promise<ServerDiagnosticReport | null> {
    try {
      const res = await fetch('/api/diagnostics', { cache: 'no-store' });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Return null
    }
    return null;
  }

  public async clearServerLogs(): Promise<boolean> {
    try {
      const res = await fetch('/api/report-error', { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }

  public exportLogsJSON(): string {
    const logs = this.getLogs();
    const systemInfo = {
      exportedAt: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      isIframe: typeof window !== 'undefined' ? window.self !== window.top : false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      totalErrors: logs.length,
      errors: logs,
    };
    return JSON.stringify(systemInfo, null, 2);
  }
}

export const errorReporter = new ErrorReporter();

// Auto-initialize reporter
if (typeof window !== 'undefined') {
  errorReporter.init();
}
