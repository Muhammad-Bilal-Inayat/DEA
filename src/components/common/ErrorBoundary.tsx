import React, { ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, RefreshCw, Home, ShieldAlert, WifiOff, 
  Database, Copy, Check, ChevronDown, ChevronUp, Terminal, RotateCcw,
  Trash2, ShieldCheck, Download, AlertOctagon, HelpCircle
} from 'lucide-react';
import { errorReporter } from '../../lib/errorReporter';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCategory: 'firestore_permission' | 'firestore_connection' | 'firestore_quota' | 'indexeddb_error' | 'runtime_crash' | 'storage_corrupted' | 'chunk_reload';
  copied: boolean;
  showDetails: boolean;
  showDiagnosticLogs: boolean;
  reportSent: boolean;
  storageResetSuccess: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCategory: 'runtime_crash',
    copied: false,
    showDetails: false,
    showDiagnosticLogs: false,
    reportSent: false,
    storageResetSuccess: false,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const msg = error?.message || '';
    let errorCategory: State['errorCategory'] = 'runtime_crash';

    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'
    ) {
      errorCategory = 'chunk_reload';
    } else if (
      msg.includes('permission-denied') || 
      msg.includes('Missing or insufficient permissions') ||
      (error as any)?.code === 'permission-denied'
    ) {
      errorCategory = 'firestore_permission';
    } else if (
      msg.includes('unavailable') || 
      msg.includes('offline') || 
      (msg.includes('Failed to fetch') && !msg.includes('module')) ||
      msg.includes('network') ||
      (error as any)?.code === 'unavailable'
    ) {
      errorCategory = 'firestore_connection';
    } else if (
      msg.includes('resource-exhausted') || 
      msg.includes('Quota exceeded') ||
      (error as any)?.code === 'resource-exhausted'
    ) {
      errorCategory = 'firestore_quota';
    } else if (
      error.name === 'QuotaExceededError' ||
      error.name === 'InvalidStateError' ||
      error.name === 'DatabaseClosedError' ||
      msg.includes('IndexedDB') ||
      msg.includes('Dexie')
    ) {
      errorCategory = 'indexeddb_error';
    } else if (
      msg.includes('JSON.parse') || 
      msg.includes('is not valid JSON') || 
      msg.includes('Unexpected token') ||
      msg.includes('localStorage corrupted') ||
      msg.includes('sessionStorage corrupted')
    ) {
      errorCategory = 'storage_corrupted';
    }

    return { hasError: true, error, errorCategory };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMsg = error?.message || 'Unknown Application Error';
    const isFirestorePermission = 
      errorMsg.includes('permission-denied') || 
      errorMsg.includes('Missing or insufficient permissions') ||
      (error as any)?.code === 'permission-denied';

    const isFirestoreConnection = 
      errorMsg.includes('unavailable') || 
      errorMsg.includes('offline') || 
      (error as any)?.code === 'unavailable';

    const errorType = isFirestorePermission 
      ? 'firestore_permission' 
      : (isFirestoreConnection ? 'firestore_connection' : 'runtime_error');

    // More descriptive logging & diagnostics for white screen triage
    console.group('%c[MBI Inventra ErrorBoundary - Crash Diagnostics]', 'background: #dc2626; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;');
    console.error('❌ Error Message:', errorMsg);
    console.error('🔍 Error Name / Code:', error?.name, (error as any)?.code);
    console.error('📚 JavaScript Stack:', error?.stack);
    console.error('🧩 React Component Tree:', errorInfo?.componentStack);
    console.log('🌐 Environment Info:', {
      url: window.location.href,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      isIframe: window.self !== window.top,
      localStorageKeysCount: Object.keys(localStorage).length,
      sessionStorageKeysCount: Object.keys(sessionStorage).length,
    });
    console.groupEnd();

    // Centralized developer error reporting & server sync
    errorReporter.logError({
      type: errorType,
      message: errorMsg,
      stack: error?.stack,
      source: 'ReactErrorBoundary',
      metadata: {
        componentStack: errorInfo?.componentStack,
        errorCode: (error as any)?.code,
        errorName: error?.name,
        isFirestorePermission,
        isFirestoreConnection,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        url: window.location.href,
        storageKeysCount: Object.keys(localStorage).length,
      },
    });

    this.setState({ errorInfo, reportSent: true });
  }

  // Quick reset: Purge corrupted state keys and re-seed clean default profiles
  private handleResetCorruptedState = () => {
    try {
      const keysToClean = [
        'mock_session',
        'mock_business',
        'mock_user_profile',
        'vyapar_system_app_settings_v2',
        'active_simulated_user',
        'active_simulated_role',
        'mbi_pending_firestore_sync_queue',
        'mbi_live_sync_ping',
        'mbi_unified_sync_trigger',
        'mbi_custom_units_v1',
        'mbi_sidebar_collapsed',
        'mbi_calculator_type_pref_v1',
      ];

      keysToClean.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });

      sessionStorage.clear();

      this.setState({ storageResetSuccess: true });
      setTimeout(() => {
        window.location.href = '/';
      }, 700);
    } catch (e) {
      console.error('Failed to reset state:', e);
      window.location.reload();
    }
  };

  // Hard factory reset: Clears all local storage & Dexie IndexedDB
  private handleHardFactoryReset = () => {
    if (window.confirm('⚠️ FACTORY RESET: This will clear all locally stored data on this device and reload the application with verified fresh state. Continue?')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB) {
          indexedDB.deleteDatabase('MbiInventraOfflineDB');
        }
      } catch (e) {
        console.warn(e);
      }
      window.location.href = '/';
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyDiagnostics = () => {
    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      category: this.state.errorCategory,
      errorName: this.state.error?.name,
      errorMessage: this.state.error?.message,
      errorCode: (this.state.error as any)?.code,
      errorStack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        isIframe: window.self !== window.top,
        localStorageKeys: Object.keys(localStorage),
      },
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  private getCategoryDetails() {
    switch (this.state.errorCategory) {
      case 'storage_corrupted':
        return {
          icon: <AlertOctagon className="w-8 h-8 text-amber-600" />,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-900',
          badgeText: 'Corrupted Local State / Data Object',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          title: 'Corrupted Data Object Detected',
          userSummary: 'A stored configuration or session object in local storage has an unexpected format or is unreadable.',
          devGuidance: 'Click "Reset Corrupted Storage State" below to clear malformed session and configuration keys and reload with clean defaults.',
        };
      case 'chunk_reload':
        return {
          icon: <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-900',
          badgeText: 'Software Update Loaded',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
          title: 'New Version Released',
          userSummary: 'A new version of MBI Inventra was deployed. Click Reload to fetch the latest code modules.',
          devGuidance: 'The browser held a reference to an earlier build chunk. Clearing the asset cache and refreshing will resolve this immediately.',
        };
      case 'firestore_permission':
        return {
          icon: <ShieldAlert className="w-8 h-8 text-amber-600" />,
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-900',
          badgeText: 'Firestore Permission Denied',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
          title: 'Cloud Database Permission Error',
          userSummary: 'The application encountered a security rules restriction when querying Cloud Firestore.',
          devGuidance: 'Check that firestore.rules allows read/write access or that authentication is active in AuthContext.',
        };
      case 'firestore_connection':
        return {
          icon: <WifiOff className="w-8 h-8 text-sky-600" />,
          bgColor: 'bg-sky-50',
          textColor: 'text-sky-900',
          badgeText: 'Firestore Network / Offline',
          badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
          title: 'Cloud Connection Interruption',
          userSummary: 'Could not connect to the cloud database. The local offline engine is keeping your transactions safe.',
          devGuidance: 'The Firestore client could not reach backend servers. Verify your internet connection or reload.',
        };
      case 'firestore_quota':
        return {
          icon: <Database className="w-8 h-8 text-rose-600" />,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-900',
          badgeText: 'Firestore Quota Exceeded',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
          title: 'Cloud Database Quota Limit',
          userSummary: 'The Cloud Firestore project reached its daily read/write quota limit.',
          devGuidance: 'Review Firebase project usage in Firebase Console. Local IndexedDB continues to store and buffer changes locally.',
        };
      case 'indexeddb_error':
        return {
          icon: <Database className="w-8 h-8 text-purple-600" />,
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-900',
          badgeText: 'Local IndexedDB Error',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
          title: 'Local Storage State Issue',
          userSummary: 'A local browser database constraint occurred while reading or writing records.',
          devGuidance: 'Browser storage quota or an unhandled schema change occurred. You can use "Reset Corrupted Storage State" to refresh local memory.',
        };
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-rose-600" />,
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-900',
          badgeText: 'Application Component Crash',
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
          title: 'Application Render Exception',
          userSummary: 'A UI component threw an uncaught error while rendering this page view.',
          devGuidance: 'Inspect the component stack trace below or click "Reset Corrupted Storage State" if an outdated cache is preventing the app from mounting.',
        };
    }
  }

  public override render() {
    if (this.state.hasError) {
      const details = this.getCategoryDetails();

      return (
        <div className="min-h-screen bg-slate-900/95 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-xs">
          <div className="max-w-2xl w-full bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header / Banner */}
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl ${details.bgColor} flex items-center justify-center shrink-0 shadow-2xs`}>
                  {details.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${details.badgeColor}`}>
                      {details.badgeText}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    {details.title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={this.handleCopyDiagnostics}
                  className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{this.state.copied ? 'Diagnostics Copied!' : 'Copy Diagnostics'}</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4">
              
              {/* Reset Success Alert */}
              {this.state.storageResetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Local state successfully reset! Restarting application...</span>
                </div>
              )}

              {/* Guidance Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {details.userSummary}
                </p>
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Recommended Recovery:
                  </span>
                  <p className="text-[11.5px] text-slate-700 font-medium mt-0.5">
                    {details.devGuidance}
                  </p>
                </div>
              </div>

              {/* Error Message Box */}
              {this.state.error && (
                <div className="p-3 bg-red-50/80 rounded-xl border border-red-200 text-left overflow-x-auto text-xs font-mono text-red-700">
                  <span className="font-bold text-red-900 block mb-0.5">
                    {this.state.error.name}: {this.state.error.message}
                  </span>
                  {(this.state.error as any).code && (
                    <span className="text-[10.5px] text-red-800/80 block">
                      Code: {(this.state.error as any).code}
                    </span>
                  )}
                </div>
              )}

              {/* Quick State Recovery Tools Callout */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Emergency State Recovery Options</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-mono">Failsafe Engine</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={this.handleResetCorruptedState}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Corrupted Local Storage State</span>
                  </button>

                  <button
                    type="button"
                    onClick={this.handleHardFactoryReset}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hard Factory Reset</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Technical Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    Technical Call Stack & Component Diagnostics
                  </span>
                  {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {this.state.showDetails && (
                  <div className="p-3 bg-slate-900 text-slate-200 text-[11px] font-mono space-y-3 max-h-56 overflow-y-auto">
                    {this.state.error?.stack && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-1 uppercase text-[10px]">
                          JavaScript Stack Trace:
                        </span>
                        <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <span className="text-slate-400 font-bold block mb-1 uppercase text-[10px]">
                          React Component Stack:
                        </span>
                        <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Diagnostic Log Panel (Last 50 System/Sync Errors) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => this.setState({ showDiagnosticLogs: !this.state.showDiagnosticLogs })}
                  className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer border-t border-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    Diagnostic Log (Last 50 System / Sync Errors)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black">
                      {errorReporter.getLogs().length} Recorded
                    </span>
                    {this.state.showDiagnosticLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {this.state.showDiagnosticLogs && (
                  <div className="p-3 bg-slate-950 text-slate-200 text-[11px] font-mono space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                      <span>TIMESTAMP & TYPE</span>
                      <button
                        onClick={() => {
                          errorReporter.clearLogs();
                          this.forceUpdate();
                        }}
                        className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Logs
                      </button>
                    </div>
                    {errorReporter.getLogs().slice(0, 50).length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        No error logs recorded in local diagnostics buffer.
                      </div>
                    ) : (
                      errorReporter.getLogs().slice(0, 50).map((log, idx) => (
                        <div key={log.id || idx} className="p-2 bg-slate-900/80 rounded border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-400 font-bold uppercase">{log.type}</span>
                            <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-200 font-sans text-xs break-words">{log.message}</p>
                          {log.source && <p className="text-[10px] text-slate-400 font-mono">Source: {log.source}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={this.handleResetCorruptedState}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Corrupted State
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Page
                </button>

                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
