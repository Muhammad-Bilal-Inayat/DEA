import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, ShieldBan, 
  Search, Filter, Trash2, Download, AlertTriangle, 
  RefreshCw, CheckCircle2, XCircle, Globe, Smartphone, 
  Laptop, User, Clock, MapPin, Ban, Plus, Key, Lock, Eye
} from 'lucide-react';
import { 
  getLoginAuditLogs, 
  LoginAttemptRecord, 
  getBlockedIps, 
  BlockedIpRecord, 
  blockIpAddress, 
  unblockIpAddress, 
  clearLoginAuditLogs, 
  recordLoginAttempt,
  getCurrentClientIp
} from '../../lib/securityAuditService';

interface SecurityAuditLogPanelProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const SecurityAuditLogPanel: React.FC<SecurityAuditLogPanelProps> = ({ showToast }) => {
  const [logs, setLogs] = useState<LoginAttemptRecord[]>(getLoginAuditLogs);
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>(getBlockedIps);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'BLOCKED'>('ALL');
  const [systemFilter, setSystemFilter] = useState<string>('ALL');

  // Manual IP Block Modal / Input
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlockIp, setNewBlockIp] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('Suspicious automated login attempts');

  // Active View Tab inside Security Audit Panel
  const [activeSubTab, setActiveSubTab] = useState<'attempts' | 'blocked_ips'>('attempts');

  const refreshData = () => {
    setLogs(getLoginAuditLogs());
    setBlockedIps(getBlockedIps());
  };

  useEffect(() => {
    const handleUpdate = () => {
      refreshData();
    };
    window.addEventListener('mbi-security-audit-updated', handleUpdate);
    window.addEventListener('mbi-blocked-ips-updated', handleUpdate);
    return () => {
      window.removeEventListener('mbi-security-audit-updated', handleUpdate);
      window.removeEventListener('mbi-blocked-ips-updated', handleUpdate);
    };
  }, []);

  const handleBlockIp = (ipToBlock: string, reason?: string) => {
    if (!ipToBlock.trim()) return;
    blockIpAddress(ipToBlock.trim(), reason || 'Blocked via Security Audit Log panel', 'Master Admin');
    refreshData();
    if (showToast) {
      showToast('warning', 'IP Blocked', `IP address ${ipToBlock} has been blocked from accessing the central server.`);
    }
  };

  const handleUnblockIp = (ipToUnblock: string) => {
    unblockIpAddress(ipToUnblock);
    refreshData();
    if (showToast) {
      showToast('success', 'IP Unblocked', `IP address ${ipToUnblock} has been removed from blocklist.`);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all login audit logs? This action cannot be undone.')) {
      clearLoginAuditLogs();
      refreshData();
      if (showToast) {
        showToast('info', 'Logs Cleared', 'Login audit history has been cleared.');
      }
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert('No logs to export.');
      return;
    }
    const headers = ['ID', 'Timestamp', 'Username', 'Target System', 'Status', 'IP Address', 'Device ID', 'Device Info', 'Failure Reason', 'Location'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      `"${l.username}"`,
      `"${l.targetSystem}"`,
      l.status,
      l.ipAddress,
      `"${l.deviceId}"`,
      `"${(l.deviceInfo || '').replace(/"/g, '""')}"`,
      `"${(l.failureReason || '').replace(/"/g, '""')}"`,
      `"${l.location || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `security_login_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => {
    // Status filter
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
    // System filter
    if (systemFilter !== 'ALL' && log.targetSystem !== systemFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchIp = log.ipAddress?.toLowerCase().includes(q);
      const matchUser = log.username?.toLowerCase().includes(q);
      const matchDevice = log.deviceId?.toLowerCase().includes(q) || log.deviceInfo?.toLowerCase().includes(q);
      const matchSys = log.targetSystem?.toLowerCase().includes(q);
      const matchLoc = log.location?.toLowerCase().includes(q);
      if (!matchIp && !matchUser && !matchDevice && !matchSys && !matchLoc) return false;
    }
    return true;
  });

  const totalAttempts = logs.length;
  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const failedCount = logs.filter(l => l.status === 'FAILED').length;
  const blockedCount = logs.filter(l => l.status === 'BLOCKED').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Login Events</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAttempts}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Recorded across all portals</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Successful Logins</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{successCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Authorized devices & tokens</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Failed Attempts</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{failedCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Incorrect PINs / unlisted hardware</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Blocked IP Threats</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{blockedIps.length}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{blockedCount} attempts actively neutralized</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShieldBan className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('attempts')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'attempts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Login Attempts History ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blocked_ips')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'blocked_ips'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>Blocked IP Firewall ({blockedIps.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Specific IP</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Logs</span>
          </button>

          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB 1: LOGIN ATTEMPTS AUDIT LOG */}
      {activeSubTab === 'attempts' && (
        <div className="space-y-4">
          
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP address, username, device ID, hardware info, location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by Status"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed Only</option>
                <option value="BLOCKED">Blocked Only</option>
              </select>

              <select
                value={systemFilter}
                onChange={(e) => setSystemFilter(e.target.value)}
                aria-label="Filter by Target System"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Target Systems</option>
                <option value="Central Server Command Center">Central Server</option>
                <option value="Store POS Terminal">POS Terminal</option>
                <option value="Client Web Portal">Client Web Portal</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Timestamp & ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">User / Account</th>
                    <th className="py-3 px-4">Target System</th>
                    <th className="py-3 px-4">IP Address & Location</th>
                    <th className="py-3 px-4">Device ID & Hardware Specs</th>
                    <th className="py-3 px-4 text-right">Firewall Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-bold">No security login records match your filters</p>
                        <p className="text-[11px] mt-0.5">Try clearing your search query or reset filter dropdowns.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isBlocked = blockedIps.some(b => b.ip.toLowerCase() === log.ipAddress.toLowerCase());

                      return (
                        <tr 
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Timestamp & ID */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">{log.id}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {log.status === 'SUCCESS' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                SUCCESS
                              </span>
                            )}
                            {log.status === 'FAILED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                FAILED
                              </span>
                            )}
                            {log.status === 'BLOCKED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-600 text-white shadow-xs">
                                <Ban className="w-3 h-3" />
                                BLOCKED
                              </span>
                            )}
                          </td>

                          {/* User / Account */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-500" />
                              <span>{log.username}</span>
                            </div>
                            {log.failureReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 leading-tight font-medium">
                                {log.failureReason}
                              </div>
                            )}
                          </td>

                          {/* Target System */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {log.targetSystem}
                            </span>
                          </td>

                          {/* IP Address & Location */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.ipAddress}</span>
                              {isBlocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white">
                                  BLOCKED
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{log.location || 'LAN / Cloud'}</span>
                            </div>
                          </td>

                          {/* Device ID & Specs */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              {log.deviceInfo?.includes('Vivo') || log.deviceInfo?.includes('Android') ? (
                                <Smartphone className="w-3.5 h-3.5 text-purple-500" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-blue-500" />
                              )}
                              <span>{log.deviceId}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] mt-0.5" title={log.deviceInfo}>
                              {log.deviceInfo}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {isBlocked ? (
                              <button
                                onClick={() => handleUnblockIp(log.ipAddress)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Unblock IP
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockIp(log.ipAddress, `Manual block from audit log event ${log.id}`)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Block IP</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BLOCKED IP ADDRESSES FIREWALL */}
      {activeSubTab === 'blocked_ips' && (
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <ShieldBan className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-rose-900 dark:text-rose-100">Central IP Address Firewall Active</div>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                Any IP address listed below is completely forbidden from logging into the Master Server Command Center, POS Terminals, and API sync endpoints.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Blocked IP Addresses Registry ({blockedIps.length})
              </h3>
              <button
                onClick={() => setShowBlockModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add IP to Blocklist</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Blocked IP Address</th>
                    <th className="py-3 px-4">Reason for Block</th>
                    <th className="py-3 px-4">Blocked By</th>
                    <th className="py-3 px-4">Blocked Timestamp</th>
                    <th className="py-3 px-4 text-center">Threat Attempts</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                        <ShieldCheck className="w-8 h-8 mx-auto mb-1 text-emerald-500 opacity-60" />
                        <p className="font-bold">No IP addresses currently blocked</p>
                        <p className="text-[11px]">Your server perimeter is clear.</p>
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((item) => (
                      <tr key={item.ip} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <Ban className="w-3.5 h-3.5" />
                            <span>{item.ip}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.reason}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-bold">
                          {item.blockedBy}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(item.blockedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            {item.attemptsCount || 1} Blocked
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleUnblockIp(item.ip)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            Unblock & Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BLOCK SPECIFIC IP ADDRESS */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Block IP Address</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add IP to server firewall blacklist</p>
                </div>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Target IP Address (IPv4 / IPv6)
                </label>
                <input
                  type="text"
                  value={newBlockIp}
                  onChange={(e) => setNewBlockIp(e.target.value)}
                  placeholder="e.g. 192.168.1.150 or 198.51.100.22"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason for Block / Threat Note
                </label>
                <input
                  type="text"
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  placeholder="e.g. Automated bot attack, unauthorized access attempt"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newBlockIp.trim()) {
                      alert('Please provide an IP address to block.');
                      return;
                    }
                    handleBlockIp(newBlockIp, newBlockReason);
                    setNewBlockIp('');
                    setShowBlockModal(false);
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Enforce Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
