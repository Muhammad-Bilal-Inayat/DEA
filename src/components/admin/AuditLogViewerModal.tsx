import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Shield, Filter, Search, Download, 
  Calendar, RefreshCw, X, AlertTriangle, CheckCircle2, Clock, 
  User, DollarSign, Package, Lock, Eye, ArrowUpRight, ArrowDownLeft,
  FileSpreadsheet, Terminal, Activity, ChevronDown
} from 'lucide-react';
import { 
  ComprehensiveAuditLogEntry, 
  AuditActionCategory, 
  AuditSeverity, 
  fetchBusinessAuditLogs,
  getHighValueThreshold 
} from '../../lib/auditLogger';
import { useAuth } from '../../contexts/AuthContext';

interface AuditLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogViewerModal: React.FC<AuditLogViewerModalProps> = ({ isOpen, onClose }) => {
  const { business, activeRole, currentUser } = useAuth();
  const [logs, setLogs] = useState<ComprehensiveAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ComprehensiveAuditLogEntry | null>(null);

  const isPrimaryAdmin = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin';

  const loadLogs = async () => {
    if (!business?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchBusinessAuditLogs(business.id);
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, business?.id]);

  // Listen for real-time audit logs while modal is open
  useEffect(() => {
    const handleNewLog = (e: any) => {
      if (e.detail) {
        setLogs(prev => [e.detail, ...prev]);
      }
    };
    window.addEventListener('mbi-audit-event-logged', handleNewLog);
    return () => window.removeEventListener('mbi-audit-event-logged', handleNewLog);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'ALL' && log.severity !== selectedSeverity) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchUser = log.userName?.toLowerCase().includes(q) || log.userEmail?.toLowerCase().includes(q);
        const matchEntity = log.entity?.toLowerCase().includes(q) || log.entityId?.toLowerCase().includes(q);
        return matchAction || matchDetails || matchUser || matchEntity;
      }
      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, searchQuery]);

  const stats = useMemo(() => {
    const critical = logs.filter(l => l.severity === 'CRITICAL').length;
    const warning = logs.filter(l => l.severity === 'WARNING').length;
    const inventory = logs.filter(l => l.category === 'INVENTORY_CHANGE').length;
    const highValue = logs.filter(l => l.category === 'BILLING_HIGH_VALUE').length;
    return { critical, warning, inventory, highValue, total: logs.length };
  }, [logs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Date/Time', 'Category', 'Severity', 'Action', 'Entity', 'Entity ID', 'Amount (PKR)', 'User', 'Role', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.category}"`,
      `"${l.severity}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.entity}"`,
      `"${l.entityId || ''}"`,
      l.amount || 0,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${business?.name || 'MBI'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Business Operations Audit Trail & Security Logs
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-800">
                  Primary Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Tenant Vault: <span className="text-blue-400 font-bold">{business?.name || 'MBI INVENTRA'}</span> (ID: <code className="text-indigo-300 font-mono text-[11px]">{business?.id}</code>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={isLoading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Refresh Logs from Cloud & Local DB"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Export filtered logs to Excel/CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Warning If Not Primary Admin */}
        {!isPrimaryAdmin && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 px-5 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Notice: Read-only simulated view. Only users with Primary Admin credentials can modify settings and security access policies.</span>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:p-4 bg-slate-900/50 border-b border-slate-800">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Operations</p>
              <p className="text-base font-black text-white">{stats.total}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Critical Events</p>
              <p className="text-base font-black text-rose-400">{stats.critical}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Warnings & Overrides</p>
              <p className="text-base font-black text-amber-400">{stats.warning}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
            <Package className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stock Adjustments</p>
              <p className="text-base font-black text-emerald-400">{stats.inventory}</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <DollarSign className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High Value Invoices</p>
              <p className="text-base font-black text-indigo-400">{stats.highValue}</p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by action, operator, product, invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="INVENTORY_CHANGE">📦 Inventory Changes</option>
              <option value="BILLING_HIGH_VALUE">💰 High-Value Billing</option>
              <option value="INVOICE_VOID_CANCEL">🚫 Voided / Cancelled Invoices</option>
              <option value="TRANSACTION_DELETE">🗑️ Deleted Records</option>
              <option value="PRICE_OVERRIDE">🏷️ Price & Discount Overrides</option>
              <option value="RBAC_SECURITY">🛡️ RBAC & Permissions</option>
              <option value="SETTINGS_FEATURE_FLAGS">⚙️ Feature Flags & Settings</option>
              <option value="NARCOTICS_SCHEDULE">💊 Narcotics & Controlled</option>
              <option value="AUTH_LOGIN">🔑 Logins & Shifts</option>
            </select>

            {/* Severity Select */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">🔴 Critical Only</option>
              <option value="WARNING">🟡 Warnings Only</option>
              <option value="INFO">🔵 Info & Normal</option>
            </select>
          </div>
        </div>

        {/* Logs Table Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px] divide-y divide-slate-800/80">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-semibold">Querying multi-tenant Firestore audit collection...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <ShieldCheck className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No matching audit logs found</p>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                All business operations (stock edits, high-value billing &gt; Rs {getHighValueThreshold().toLocaleString()}, invoice voids, and user privilege changes) are recorded automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredLogs.map((log) => {
                const isCritical = log.severity === 'CRITICAL';
                const isWarning = log.severity === 'WARNING';
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogDetail(log)}
                    className="p-3.5 hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isCritical ? (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : isWarning ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <Clock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isCritical ? 'bg-rose-950 text-rose-300 border-rose-800' :
                            isWarning ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {log.category.replace(/_/g, ' ')}
                          </span>

                          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                            {log.action}
                          </span>

                          {log.amount !== undefined && log.amount > 0 && (
                            <span className="text-xs font-black px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Rs {log.amount.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed break-words">
                          {log.details}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            <strong className="text-slate-200">{log.userName}</strong> ({log.userRole})
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.entityId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/60 px-1 rounded">
                                {log.entity}: {log.entityId}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-blue-400 group-hover:underline flex items-center gap-1 font-semibold">
                        Inspect Payload <Eye className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Immutable Multi-Tenant Firestore Logs Collection (<code className="text-slate-300">audit_logs</code>)</span>
          </div>

          <div>
            Showing <strong className="text-white">{filteredLogs.length}</strong> of <strong className="text-white">{logs.length}</strong> recorded entries
          </div>
        </div>
      </div>

      {/* Inspector Detail Sub-Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl text-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black text-white">Log Event Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Event ID</span>
                  <p className="font-mono text-indigo-300 font-bold">{selectedLogDetail.id}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Business Context</span>
                  <p className="font-mono text-emerald-300 font-bold">{selectedLogDetail.businessId}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Operator / User</span>
                  <p className="text-white font-bold">{selectedLogDetail.userName} ({selectedLogDetail.userRole})</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Severity</span>
                  <p className="font-bold text-rose-400">{selectedLogDetail.severity}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Action & Summary</span>
                <p className="text-white font-semibold text-xs mt-0.5">{selectedLogDetail.action}</p>
                <p className="text-slate-300 text-xs mt-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {selectedLogDetail.details}
                </p>
              </div>

              {(selectedLogDetail.previousValue || selectedLogDetail.newValue || selectedLogDetail.metadata) && (
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Data Payload & Diff</span>
                  <pre className="mt-1 p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-40">
                    {JSON.stringify({
                      previousValue: selectedLogDetail.previousValue,
                      newValue: selectedLogDetail.newValue,
                      metadata: selectedLogDetail.metadata,
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
