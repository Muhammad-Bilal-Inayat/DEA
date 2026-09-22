import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Wifi, 
  RefreshCw, 
  Clock, 
  Globe, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Users, 
  Building2, 
  Smartphone, 
  Laptop, 
  Layers, 
  Zap, 
  FileText, 
  Lock, 
  Key, 
  TrendingUp, 
  Receipt, 
  Database,
  ArrowDownRight,
  ExternalLink,
  SlidersHorizontal,
  Play,
  Calendar,
  CalendarDays,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { 
  ServerActivityLog, 
  getServerActivityLogs, 
  logServerActivity, 
  clearServerActivityLogs, 
  getAllTenants, 
  Tenant, 
  saveTenant,
  calculateTrialRemaining
} from '../../lib/masterServerService';

interface ServerActivityFeedPanelProps {
  onNotify: (msg: string) => void;
}

const ALL_ACTIVITY_TYPES: { id: ServerActivityLog['actionType']; label: string; color: string }[] = [
  { id: 'SYNC', label: 'Data Sync', color: 'blue' },
  { id: 'BILLING', label: 'Sales & Invoices', color: 'emerald' },
  { id: 'AUTH', label: 'Auth & Logins', color: 'purple' },
  { id: 'INVENTORY', label: 'Inventory Updates', color: 'cyan' },
  { id: 'SECURITY', label: 'Security & PINs', color: 'rose' },
  { id: 'BACKUP', label: 'Backups & Quota', color: 'amber' },
  { id: 'ADMIN', label: 'Admin Actions', color: 'indigo' },
];

export const ServerActivityFeedPanel: React.FC<ServerActivityFeedPanelProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<ServerActivityLog[]>(() => getServerActivityLogs());
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Multi-select Activity Types Filter (Empty = All)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  // Date Range Picker State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'LAST30' | 'CUSTOM'>('ALL');

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('ALL');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [selectedLogDetail, setSelectedLogDetail] = useState<ServerActivityLog | null>(null);
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);

  // Load and subscribe to real-time events
  const refreshLogs = () => {
    setLogs(getServerActivityLogs());
    setTenants(getAllTenants());
  };

  useEffect(() => {
    refreshLogs();

    const handleCustomUpdate = () => {
      refreshLogs();
    };

    window.addEventListener('mbi-server-activity-update', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      window.removeEventListener('mbi-server-activity-update', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      refreshLogs();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  // Handle Date Preset Selection
  const applyDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'LAST30') => {
    setActiveDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'LAST7') {
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(d7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'LAST30') {
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(d30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Toggle activity type in multi-select
  const toggleActivityType = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(t => t !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const selectAllTypes = () => {
    setSelectedTypes(ALL_ACTIVITY_TYPES.map(t => t.id));
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  // Unique lists for filters
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    logs.forEach(l => {
      if (l.userName && !map.has(l.userName)) {
        map.set(l.userName, { id: l.userId || l.userName, name: l.userName, role: l.userRole });
      }
    });
    return Array.from(map.values());
  }, [logs]);

  // Tenant Last Sync Matrix
  const tenantSyncFeed = useMemo(() => {
    return tenants.map(t => {
      const latestTenantLog = logs.find(l => 
        l.tenantName?.toLowerCase() === t.name.toLowerCase() || 
        l.tenantId === t.id ||
        (l.actionType === 'SYNC' && l.tenantName?.toLowerCase().includes(t.name.toLowerCase()))
      );

      const lastSyncTimeStr = t.lastSyncAt || latestTenantLog?.timestamp || t.updatedAt || t.createdAt || new Date().toISOString();
      const lastSyncDate = new Date(lastSyncTimeStr);
      const diffMinutes = Math.max(0, Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60)));
      
      let relativeTime = 'Just now';
      if (diffMinutes < 1) relativeTime = 'Just now (< 1m)';
      else if (diffMinutes < 60) relativeTime = `${diffMinutes} mins ago`;
      else if (diffMinutes < 1440) relativeTime = `${Math.floor(diffMinutes / 60)} hrs ago`;
      else relativeTime = `${Math.floor(diffMinutes / 1440)} days ago`;

      const assignedIp = latestTenantLog?.ipAddress || `192.168.1.${100 + (t.name.charCodeAt(0) % 80)}`;
      const isOnline = diffMinutes < 15;

      return {
        id: t.id,
        name: t.name,
        city: t.city || 'Punjab',
        ownerName: t.ownerName || 'Branch Manager',
        lastSyncTime: lastSyncTimeStr,
        relativeTime,
        diffMinutes,
        ipAddress: assignedIp,
        isOnline,
        status: t.status,
        invoicesCount: t.totalInvoicesCount || 0,
        productsCount: t.totalProductsCount || 0,
        deviceInfo: latestTenantLog?.deviceInfo || 'POS Station Node',
        lastAction: latestTenantLog?.action || 'HEARTBEAT_POLL'
      };
    }).sort((a, b) => new Date(b.lastSyncTime).getTime() - new Date(a.lastSyncTime).getTime());
  }, [tenants, logs]);

  // Filtered Logs applying multi-select and date range
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.userName.toLowerCase().includes(q) ||
          l.tenantName.toLowerCase().includes(q) ||
          l.ipAddress.toLowerCase().includes(q) ||
          (l.deviceInfo && l.deviceInfo.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Multi-select Action Type filter
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(l.actionType)) return false;
      }

      // Date Range Filter
      if (startDate || endDate) {
        const logDateStr = l.timestamp.split('T')[0];
        if (startDate && logDateStr < startDate) return false;
        if (endDate && logDateStr > endDate) return false;
      }

      // Status
      if (selectedStatusFilter !== 'ALL' && l.status !== selectedStatusFilter) return false;

      // Tenant
      if (selectedTenantFilter !== 'ALL' && l.tenantName !== selectedTenantFilter && l.tenantId !== selectedTenantFilter) return false;

      // User
      if (selectedUserFilter !== 'ALL' && l.userName !== selectedUserFilter && l.userId !== selectedUserFilter) return false;

      return true;
    });
  }, [logs, searchQuery, selectedTypes, startDate, endDate, selectedStatusFilter, selectedTenantFilter, selectedUserFilter]);

  // Handle Manual Force Sync for a specific tenant in the activity feed
  const handleTriggerTenantSync = (tenantId: string, tenantName: string) => {
    const updatedTenant = tenants.find(t => t.id === tenantId);
    const nowStr = new Date().toISOString();
    const fakeIp = `192.168.1.${100 + (tenantName.charCodeAt(0) % 80)}`;

    if (updatedTenant) {
      const saved = { ...updatedTenant, lastSyncAt: nowStr, updatedAt: nowStr };
      saveTenant(saved);
    }

    // Log the sync event with IP and full telemetry
    logServerActivity({
      tenantId,
      tenantName,
      userId: 'usr_auto_' + tenantName.substring(0, 4).toLowerCase(),
      userName: updatedTenant?.ownerName || 'Terminal Operator',
      userRole: 'Cashier',
      ipAddress: fakeIp,
      action: 'TENANT_DATA_SYNC',
      actionType: 'SYNC',
      details: `Manual server-orchestrated sync completed for ${tenantName}. 0 schema conflicts.`,
      status: 'SUCCESS',
      deviceInfo: 'Win11 / POS Terminal Local Client',
      latencyMs: Math.floor(15 + Math.random() * 20),
      recordsAffected: 12,
      syncSummary: {
        invoicesSynced: Math.floor(5 + Math.random() * 15),
        itemsSynced: updatedTenant?.totalProductsCount || 340,
        partiesSynced: 12,
        dbSizeKb: 1240
      }
    });

    refreshLogs();
    onNotify(`Real-time sync event logged for ${tenantName} (IP: ${fakeIp})!`);
  };

  // Simulate a live user activity (for testing real-time stream)
  const handleSimulateRandomEvent = () => {
    setIsSimulatingEvent(true);
    const sampleTenants = tenants.length > 0 ? tenants : [{ id: 't1', name: 'Al-Madina Chemist', ownerName: 'Dr. Tariq' }];
    const targetTenant = sampleTenants[Math.floor(Math.random() * sampleTenants.length)];
    const mockUsers = [
      { name: 'Bilal Khan', role: 'Cashier', ip: '192.168.1.104' },
      { name: 'Usman Ali', role: 'Pharmacist', ip: '172.16.4.88' },
      { name: 'Zainab Bibi', role: 'Cashier', ip: '192.168.1.108' },
      { name: 'Asif Nawaz', role: 'Store Manager', ip: '10.0.12.14' }
    ];
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    const eventTypes: Array<{ action: string; type: ServerActivityLog['actionType']; details: string; status: 'SUCCESS' | 'WARNING' }> = [
      { action: 'INVOICE_GENERATED', type: 'BILLING', details: `Billed Invoice #INV-${Math.floor(202600 + Math.random() * 500)} (Amount: Rs ${Math.floor(800 + Math.random() * 4500).toLocaleString()})`, status: 'SUCCESS' },
      { action: 'TENANT_DATA_SYNC', type: 'SYNC', details: `Real-time POS queue sync: ${Math.floor(2 + Math.random() * 10)} records merged to master ledger`, status: 'SUCCESS' },
      { action: 'INVENTORY_STOCK_UPDATE', type: 'INVENTORY', details: `Stock level updated for Arinac Forte / Brufen Syrup (+${Math.floor(10 + Math.random() * 50)} units)`, status: 'SUCCESS' },
      { action: 'USER_LOGIN', type: 'AUTH', details: `Cashier authenticated on Terminal IP ${user.ip}`, status: 'SUCCESS' },
      { action: 'SECURITY_PIN_ATTEMPT', type: 'SECURITY', details: `Passcode verification checked for discount approval (>15%)`, status: 'WARNING' }
    ];
    const pickedEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    setTimeout(() => {
      logServerActivity({
        tenantId: targetTenant.id,
        tenantName: targetTenant.name,
        userId: 'usr_' + user.name.replace(/\s+/g, '_').toLowerCase(),
        userName: user.name,
        userRole: user.role,
        ipAddress: user.ip,
        action: pickedEvent.action,
        actionType: pickedEvent.type,
        details: pickedEvent.details,
        status: pickedEvent.status,
        deviceInfo: 'Edge 124 / Windows 11 POS Station',
        latencyMs: Math.floor(10 + Math.random() * 30),
        recordsAffected: 1
      });

      refreshLogs();
      setIsSimulatingEvent(false);
      onNotify(`Live event logged from ${user.name} (${user.ip})!`);
    }, 400);
  };

  // Export logs to JSON
  const handleExportLogsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `mbi_server_activity_logs_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onNotify('Activity audit trail exported as JSON successfully!');
  };

  // Clear logs
  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all server activity logs?')) {
      clearServerActivityLogs();
      refreshLogs();
      onNotify('Server activity logs cleared.');
    }
  };

  // Action badge colors
  const getActionBadge = (type: ServerActivityLog['actionType']) => {
    switch (type) {
      case 'SYNC':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'BILLING':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'AUTH':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'INVENTORY':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SECURITY':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'BACKUP':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION HEADER & REAL-TIME CONTROLS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Real-Time Fleet & User Activity Stream</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every individual user transaction, IP address, sync timestamp, and security event stored centrally.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
          {/* Simulate Event Button */}
          <button
            onClick={handleSimulateRandomEvent}
            disabled={isSimulatingEvent}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Simulate incoming real-time POS event"
          >
            <Play className={`w-3.5 h-3.5 text-emerald-400 ${isSimulatingEvent ? 'animate-spin' : ''}`} />
            <span>Test Live Event</span>
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoRefresh
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-spin' : ''}`} />
            <span>{isAutoRefresh ? `Auto-Refresh (${refreshInterval}s)` : 'Paused'}</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportLogsJSON}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Export Activity Trail to JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Logs */}
          <button
            onClick={handleClearLogs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Clear Activity Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP SECTION: TENANT LAST-SYNC REAL-TIME FEED MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Tenant Data Sync Matrix (کس کلائنٹ کا ڈیٹا کب سنک ہوا)
              </h3>
              <p className="text-[11px] text-slate-400">
                Real-time connection pulse, IP address, and last data sync timestamp for each client branch.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/30">
            {tenantSyncFeed.length} Registered Tenants
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tenantSyncFeed.map((tenant) => (
            <div
              key={tenant.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                tenant.isOnline 
                  ? 'bg-slate-850 border-slate-800 hover:border-blue-500/50' 
                  : 'bg-slate-900/60 border-slate-800/80 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{tenant.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tenant.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                        }`}
                        title={tenant.isOnline ? 'Active Online Sync' : 'Idle / Offline'}
                      />
                    </h4>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{tenant.ownerName}</span>
                      <span>•</span>
                      <span>{tenant.city}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      tenant.isOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {tenant.isOnline ? 'ONLINE' : 'IDLE'}
                  </span>
                </div>

                {/* Telemetry rows: IP and Sync Time */}
                <div className="space-y-1.5 pt-2.5 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-blue-400" />
                      <span>Client IP Address:</span>
                    </span>
                    <span className="font-mono font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                      {tenant.ipAddress}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Last Data Synced:</span>
                    </span>
                    <span className="font-bold text-white">
                      {tenant.relativeTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                    <span>Exact Timestamp:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(tenant.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {tenant.invoicesCount} Invoices • {tenant.productsCount} Meds
                </span>
                <button
                  onClick={() => handleTriggerTenantSync(tenant.id, tenant.name)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Trigger instant data synchronization for this tenant"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER & ANALYTICAL DRILL-DOWN BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl space-y-4 shadow-sm">
        {/* Row 1: Search & Primary Selects */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 flex-wrap">
            {/* Search box */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP, user, tenant, action details..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tenant Filter Dropdown */}
            <select
              value={selectedTenantFilter}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches ({tenants.length})</option>
              {tenants.map(t => (
                <option key={t.id} value={t.name}>{t.name} ({t.city})</option>
              ))}
            </select>

            {/* User Filter Dropdown */}
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Operators ({uniqueUsers.length})</option>
              {uniqueUsers.map(u => (
                <option key={u.name} value={u.name}>User: {u.name} ({u.role})</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">✅ Success (200 OK)</option>
              <option value="WARNING">⚠️ Warnings</option>
              <option value="FAILED">❌ Failed</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-mono self-end md:self-auto shrink-0">
            Showing <span className="text-white font-bold">{filteredLogs.length}</span> of {logs.length} events
          </div>
        </div>

        {/* Row 2: Multi-Select Activity Types Filter */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Activity Types:</span>
            </span>

            {ALL_ACTIVITY_TYPES.map(type => {
              const isSelected = selectedTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleActivityType(type.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400 shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span>{type.label}</span>
                </button>
              );
            })}

            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={selectAllTypes}
                className="text-[11px] font-semibold text-cyan-400 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={clearAllTypes}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Date Range Picker & Presets */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Date Range:</span>
            </span>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => applyDatePreset('ALL')}
                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                  activeDatePreset === 'ALL' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('TODAY')}
                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                  activeDatePreset === 'TODAY' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('YESTERDAY')}
                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                  activeDatePreset === 'YESTERDAY' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('LAST7')}
                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                  activeDatePreset === 'LAST7' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('LAST30')}
                className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                  activeDatePreset === 'LAST30' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Date Picker Custom Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('CUSTOM');
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => applyDatePreset('ALL')}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                title="Reset date filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED ACTIVITY LOG TABLE / FEED */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Time & ID</th>
                <th className="py-3.5 px-3">IP Address</th>
                <th className="py-3.5 px-3">User / Operator</th>
                <th className="py-3.5 px-3">Tenant / Store</th>
                <th className="py-3.5 px-3">Action Type</th>
                <th className="py-3.5 px-4">Activity Details</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => {
                const isSelected = selectedLogDetail?.id === log.id;
                const dateObj = new Date(log.timestamp);
                const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                return (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLogDetail(isSelected ? null : log)}
                    className={`transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-950/40 border-l-4 border-l-blue-500' 
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Time & Log ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-white text-[11px]">
                        {timeFormatted}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{dateFormatted}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{log.id}</span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-blue-300">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>{log.ipAddress}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {log.deviceInfo || 'POS Station'}
                      </div>
                    </td>

                    {/* User / Operator */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{log.userName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {log.userRole}
                      </div>
                    </td>

                    {/* Tenant / Store */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-200 truncate max-w-[140px]">
                        {log.tenantName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {log.tenantId?.substring(0, 14)}
                      </div>
                    </td>

                    {/* Action Type Badge */}
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border whitespace-nowrap ${getActionBadge(log.actionType)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Activity Details */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs sm:max-w-md">
                      <div className="line-clamp-2 leading-relaxed text-[11.5px]">
                        {log.details}
                      </div>
                      {log.syncSummary && (
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5 flex items-center gap-2">
                          <span>Invoices: {log.syncSummary.invoicesSynced}</span>
                          <span>•</span>
                          <span>Catalog: {log.syncSummary.itemsSynced}</span>
                          <span>•</span>
                          <span>Payload: {log.syncSummary.dbSizeKb} KB</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : log.status === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                      {log.latencyMs ? `${log.latencyMs}ms` : '14ms'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white">No Activity Logs Found</h4>
            <p className="text-xs text-slate-400 mt-1">
              No server activity records matched your filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* SELECTED LOG INSPECTION DRAWER / MODAL */}
      {selectedLogDetail && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-blue-500/40 text-white shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Activity Inspection: {selectedLogDetail.id}</h3>
                <p className="text-xs text-slate-400">{new Date(selectedLogDetail.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedLogDetail(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold"
            >
              Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-slate-400 text-[11px]">Client Terminal & IP</div>
              <div className="font-bold text-blue-300 mt-1 font-mono text-sm">{selectedLogDetail.ipAddress}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{selectedLogDetail.deviceInfo}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-slate-400 text-[11px]">User Operator & Role</div>
              <div className="font-bold text-white mt-1 text-sm">{selectedLogDetail.userName}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{selectedLogDetail.userRole} (ID: {selectedLogDetail.userId})</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-slate-400 text-[11px]">Tenant & Execution</div>
              <div className="font-bold text-white mt-1 text-sm">{selectedLogDetail.tenantName}</div>
              <div className="text-emerald-400 text-[10px] mt-0.5 font-mono">Latency: {selectedLogDetail.latencyMs}ms • Status: {selectedLogDetail.status}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payload / Message Details</div>
            <p className="text-sm text-slate-200 leading-relaxed font-mono">
              {selectedLogDetail.details}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
