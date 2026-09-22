/**
 * MBI Inventra - Client & Server Error Reporting & Diagnostics Tab
 * Allows pharmacists & site administrators to inspect captured client errors,
 * server sync logs, check sync health, and copy/export comprehensive diagnostic reports.
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, Bug, Copy, Download, Trash2, RefreshCw, 
  CheckCircle2, Globe, Terminal, ShieldAlert, Check, Server, Activity, Database
} from 'lucide-react';
import { errorReporter, AppErrorLog, ServerDiagnosticReport } from '../../lib/errorReporter';
import { emitToast } from '../../contexts/ToastContext';

export const ErrorLogsTab: React.FC = () => {
  const [activeView, setActiveView] = useState<'client' | 'server' | 'health'>('client');
  const [clientLogs, setClientLogs] = useState<AppErrorLog[]>([]);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [serverHealth, setServerHealth] = useState<ServerDiagnosticReport | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoadingServer, setIsLoadingServer] = useState(false);

  const loadClientLogs = () => {
    const list = errorReporter.getLogs();
    setClientLogs(list);
    if (activeView === 'client' && list.length > 0 && !selectedLog) {
      setSelectedLog(list[0]);
    }
  };

  const loadServerData = async () => {
    setIsLoadingServer(true);
    try {
      const [sLogs, sHealth] = await Promise.all([
        errorReporter.fetchServerLogs(),
        errorReporter.fetchServerDiagnostics(),
      ]);
      setServerLogs(sLogs);
      setServerHealth(sHealth);
      if (activeView === 'server' && sLogs.length > 0 && !selectedLog) {
        setSelectedLog(sLogs[0]);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingServer(false);
    }
  };

  useEffect(() => {
    loadClientLogs();
    loadServerData();
    const handleUpdate = () => loadClientLogs();
    window.addEventListener('mbi-error-logged', handleUpdate);
    return () => window.removeEventListener('mbi-error-logged', handleUpdate);
  }, []);

  const handleCopyLogs = () => {
    const clientJson = errorReporter.exportLogsJSON();
    const combined = {
      clientDiagnostics: JSON.parse(clientJson),
      serverHealth,
      serverLogs,
    };
    navigator.clipboard.writeText(JSON.stringify(combined, null, 2));
    setCopied(true);
    emitToast('Diagnostics report copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJSON = () => {
    const clientJson = errorReporter.exportLogsJSON();
    const combined = {
      exportedAt: new Date().toISOString(),
      clientDiagnostics: JSON.parse(clientJson),
      serverHealth,
      serverLogs,
    };
    const blob = new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MBI_Diagnostics_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    emitToast('Comprehensive diagnostics report exported', 'success');
  };

  const handleClearLogs = async () => {
    if (activeView === 'server') {
      if (window.confirm('Clear all server-side error & sync logs?')) {
        await errorReporter.clearServerLogs();
        setServerLogs([]);
        setSelectedLog(null);
        emitToast('Server logs cleared', 'info');
      }
    } else {
      if (window.confirm('Clear all locally captured error logs?')) {
        errorReporter.clearLogs();
        setClientLogs([]);
        setSelectedLog(null);
        emitToast('Client error logs cleared', 'info');
      }
    }
  };

  const handleSimulateTestError = () => {
    errorReporter.logError({
      type: 'runtime_error',
      message: 'Test simulation error triggered by user from Settings Diagnostics',
      source: 'SettingsDiagnosticsTab:TestButton',
      metadata: { testMode: true, triggeredBy: 'Admin' },
    });
    emitToast('Simulated error logged & reported to server', 'warning');
    loadClientLogs();
    setTimeout(() => loadServerData(), 500);
  };

  const displayedLogs = activeView === 'client' 
    ? clientLogs.filter(l => filterType === 'all' || l.type === filterType)
    : serverLogs;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Client & Server Diagnostics Hub</h3>
            <p className="text-xs text-slate-500">
              Real-time monitoring of runtime crashes, cloud sync queues, and backend error reporting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateTestError}
            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Test Error</span>
          </button>

          <button
            type="button"
            onClick={loadServerData}
            title="Refresh Server Diagnostics"
            className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServer ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => { setActiveView('client'); setSelectedLog(clientLogs[0] || null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeView === 'client' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Client Errors ({clientLogs.length})</span>
        </button>

        <button
          onClick={() => { setActiveView('server'); setSelectedLog(serverLogs[0] || null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeView === 'server' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Server Error Logs ({serverLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveView('health')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeView === 'health' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Sync Health & Storage</span>
        </button>
      </div>

      {/* Health & Storage View */}
      {activeView === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sync Server Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-800">Operational / Healthy</span>
              </div>
              <span className="text-[10.5px] text-slate-500 block">Endpoints: /api/sync & /api/report-error</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Storage File Size</span>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {serverHealth?.storage?.fileSize ? `${(serverHealth.storage.fileSize / 1024).toFixed(1)} KB` : 'Active'}
              </div>
              <span className="text-[10.5px] text-slate-500 block">
                Last modified: {serverHealth?.storage?.lastModified ? new Date(serverHealth.storage.lastModified).toLocaleTimeString() : 'Recent'}
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Server Log Entries</span>
              <div className="text-sm font-bold text-slate-800 font-mono">
                {serverLogs.length} logged events
              </div>
              <span className="text-[10.5px] text-slate-500 block">Rolling buffer limit: 200 logs</span>
            </div>
          </div>

          {serverHealth?.storage?.storeCounts && (
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Synchronized Store Record Breakdown</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(serverHealth.storage.storeCounts).map(([k, v]) => (
                  <div key={k} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-600 capitalize">{k}</span>
                    <span className="text-xs font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Pane for Client & Server Logs */}
      {activeView !== 'health' && (
        <>
          {displayedLogs.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                {activeView === 'server' ? 'No Server Errors or Sync Failures' : 'No Client Errors Recorded'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeView === 'server' 
                  ? 'All background sync actions and server endpoints are executing without errors.' 
                  : 'Your application runs cleanly with zero runtime crashes or sync exceptions detected.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Logs List */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden max-h-96 flex flex-col">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Captured Events ({displayedLogs.length})</span>
                  <span className="text-[10.5px] text-slate-400 font-mono capitalize">{activeView} Mode</span>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                  {displayedLogs.map((log, idx) => {
                    const isSelected = selectedLog?.id === log.id || (!selectedLog && idx === 0);
                    return (
                      <div
                        key={log.id || idx}
                        onClick={() => setSelectedLog(log)}
                        className={`p-3 cursor-pointer transition-colors text-left select-none ${
                          isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-black uppercase ${
                            log.type === 'firestore_permission' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            log.type === 'firestore_connection' ? 'bg-sky-100 text-sky-900 border border-sky-300' :
                            log.type === 'sync_failure' ? 'bg-amber-100 text-amber-900' :
                            log.type === 'runtime_error' ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {(log.type || 'EVENT').replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                          {log.message || log.details || 'Log record'}
                        </p>
                        <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                          Source: {log.source || 'App'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Log Details Viewer */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 max-h-96 overflow-y-auto">
                {selectedLog ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        <h4 className="text-xs font-bold text-slate-900">Diagnostics Trace</h4>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : ''}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Message / Event Summary
                      </label>
                      <div className="p-2.5 bg-red-50 text-red-900 rounded-lg text-xs font-mono border border-red-200">
                        {selectedLog.message || selectedLog.details}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block">Source:</span>
                        <span className="font-semibold text-slate-800 truncate block">{selectedLog.source || 'Unknown'}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-[10px] block">Execution Context:</span>
                        <span className={`font-semibold ${selectedLog.isIframe ? 'text-blue-700' : 'text-slate-800'}`}>
                          {selectedLog.isIframe ? 'Inside iFrame' : 'Direct Window'}
                        </span>
                      </div>
                    </div>

                    {selectedLog.stack && (
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Stack Trace
                        </label>
                        <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10.5px] font-mono overflow-x-auto max-h-36 leading-relaxed">
                          {selectedLog.stack}
                        </pre>
                      </div>
                    )}

                    {selectedLog.metadata && (
                      <div>
                        <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Metadata & Parameters
                        </label>
                        <pre className="p-2 bg-slate-100 text-slate-700 rounded-lg text-[10.5px] font-mono overflow-x-auto max-h-28">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Select an item from the left list to view diagnostic details
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

