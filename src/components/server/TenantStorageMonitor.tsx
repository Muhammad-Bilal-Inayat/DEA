import React, { useState, useMemo } from 'react';
import { 
  Database, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  FileText, 
  Image, 
  Layers, 
  ShieldAlert, 
  ArrowUpRight, 
  Sparkles, 
  X, 
  Save, 
  Zap, 
  Check,
  Building2,
  PieChart
} from 'lucide-react';
import { 
  Tenant, 
  TenantStorageData, 
  getAllTenants, 
  getAllTenantsStorageInfo, 
  updateTenantStorageQuota, 
  purgeTenantStorageCache 
} from '../../lib/masterServerService';

interface TenantStorageMonitorProps {
  onNotify: (msg: string) => void;
}

export const TenantStorageMonitor: React.FC<TenantStorageMonitorProps> = ({ onNotify }) => {
  const [tenants, setTenants] = useState<Tenant[]>(() => getAllTenants());
  const [searchQuery, setSearchQuery] = useState('');
  const [thresholdFilter, setThresholdFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'NORMAL'>('ALL');
  const [selectedTenantStorage, setSelectedTenantStorage] = useState<TenantStorageData | null>(null);
  
  // Edit Manual Limit Modal State
  const [editLimitTenant, setEditLimitTenant] = useState<TenantStorageData | null>(null);
  const [customLimitInput, setCustomLimitInput] = useState<number>(500);
  const [isPurgingTenantId, setIsPurgingTenantId] = useState<string | null>(null);

  const storageList: TenantStorageData[] = useMemo(() => {
    return tenants.map(t => {
      // Re-calculate
      const limitMb = t.storageLimitMb || 500;
      let usedMb = t.storageUsedMb;
      let breakdown = t.storageBreakdown;

      if (usedMb === undefined || !breakdown) {
        const invCount = t.totalInvoicesCount || 100;
        const prodCount = t.totalProductsCount || 200;
        const dbSize = Math.max(12, Math.round((prodCount * 0.08) + (invCount * 0.12)));
        const invArchive = Math.max(25, Math.round(invCount * 0.22));
        const assets = Math.max(10, Math.round(prodCount * 0.15));
        const audit = Math.max(8, Math.round(invCount * 0.05));

        usedMb = Math.round((dbSize + invArchive + assets + audit) * 10) / 10;
        breakdown = {
          dbRecordsMb: dbSize,
          invoicesArchiveMb: invArchive,
          assetsMediaMb: assets,
          auditLogsMb: audit
        };
      }

      const percentageUsed = Math.min(100, Math.round((usedMb / limitMb) * 1000) / 10);
      let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentageUsed >= 80) {
        warningLevel = 'critical';
      } else if (percentageUsed >= 60) {
        warningLevel = 'warning';
      }

      return {
        tenantId: t.id || t.tenantId,
        tenantName: t.name,
        city: t.city || 'Punjab',
        plan: t.plan,
        status: t.status,
        usedMb,
        limitMb,
        percentageUsed,
        warningLevel,
        breakdown,
        lastCalculatedAt: t.updatedAt || new Date().toISOString()
      };
    });
  }, [tenants]);

  // Aggregate stats
  const aggregateMetrics = useMemo(() => {
    let totalUsed = 0;
    let totalLimit = 0;
    let criticalCount = 0;
    let warningCount = 0;

    storageList.forEach(item => {
      totalUsed += item.usedMb;
      totalLimit += item.limitMb;
      if (item.warningLevel === 'critical') criticalCount++;
      if (item.warningLevel === 'warning') warningCount++;
    });

    const fleetPercentage = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 1000) / 10 : 0;

    return {
      totalUsedMb: Math.round(totalUsed * 10) / 10,
      totalLimitMb: totalLimit,
      fleetPercentage,
      criticalCount,
      warningCount,
      tenantsCount: storageList.length
    };
  }, [storageList]);

  // Filtered storage items
  const filteredStorageList = useMemo(() => {
    return storageList.filter(item => {
      const matchesSearch = !searchQuery || 
        item.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tenantId.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (thresholdFilter === 'CRITICAL') return item.warningLevel === 'critical';
      if (thresholdFilter === 'WARNING') return item.warningLevel === 'warning';
      if (thresholdFilter === 'NORMAL') return item.warningLevel === 'normal';

      return true;
    });
  }, [storageList, searchQuery, thresholdFilter]);

  const handleOpenEditLimit = (item: TenantStorageData) => {
    setEditLimitTenant(item);
    setCustomLimitInput(item.limitMb);
  };

  const handleSaveManualLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLimitTenant) return;

    const newLimit = Math.max(50, customLimitInput);
    const updated = updateTenantStorageQuota(editLimitTenant.tenantId, newLimit);
    setTenants([...updated]);
    onNotify(`Storage quota for "${editLimitTenant.tenantName}" updated to ${newLimit} MB!`);
    setEditLimitTenant(null);
  };

  const handlePurgeCache = (tenantId: string, tenantName: string) => {
    setIsPurgingTenantId(tenantId);
    setTimeout(() => {
      const res = purgeTenantStorageCache(tenantId);
      if (res.success) {
        setTenants(getAllTenants());
        onNotify(`Database compacted for ${tenantName}. Reclaimed ${res.freedMb} MB storage space!`);
      } else {
        onNotify(`Failed to compact cache for ${tenantName}`);
      }
      setIsPurgingTenantId(null);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Aggregate Storage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fleet Consumption */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Fleet Consumption</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {(aggregateMetrics.totalUsedMb / 1024).toFixed(2)} <span className="text-sm font-bold text-slate-400">GB</span>
            </span>
            <span className="text-xs text-slate-400">
              / {(aggregateMetrics.totalLimitMb / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                aggregateMetrics.fleetPercentage >= 80 ? 'bg-rose-500' : aggregateMetrics.fleetPercentage >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, aggregateMetrics.fleetPercentage)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{aggregateMetrics.fleetPercentage}% Total Allocated</span>
            <span>{aggregateMetrics.tenantsCount} Active Tenants</span>
          </div>
        </div>

        {/* Card 2: High-Usage Capacity Warnings (>=80%) */}
        <div className={`border rounded-2xl p-4.5 shadow-sm transition-all ${
          aggregateMetrics.criticalCount > 0 
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200' 
            : 'bg-slate-900/90 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Critical Over-Capacity (&gt;80%)</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              aggregateMetrics.criticalCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${aggregateMetrics.criticalCount > 0 ? 'text-rose-400' : 'text-white'}`}>
              {aggregateMetrics.criticalCount}
            </span>
            <span className="text-xs">Tenants Exceeding 80%</span>
          </div>
          <p className="mt-2 text-[11px] opacity-80">
            {aggregateMetrics.criticalCount > 0 
              ? 'Urgent: Tenants approaching storage cutoff ceiling. Increase quota or compact DB.'
              : 'All tenant nodes have healthy storage headroom.'}
          </p>
        </div>

        {/* Card 3: Warning Threshold (60% - 80%) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Warning Threshold (60-80%)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {aggregateMetrics.warningCount}
            </span>
            <span className="text-xs text-slate-400">Tenants in Warning Zone</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Monitor transaction growth. Quota expansions can be configured manually below.
          </p>
        </div>

        {/* Card 4: Normal Headroom (<60%) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Healthy Storage (&lt;60%)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {aggregateMetrics.tenantsCount - aggregateMetrics.criticalCount - aggregateMetrics.warningCount}
            </span>
            <span className="text-xs text-slate-400">Optimal Headroom</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Automatic snapshot compaction and SQLite indexing active across all clusters.
          </p>
        </div>
      </div>

      {/* Main Storage Monitor Table & Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>Tenant Storage Quota & Capacity Manager</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time disk consumption, breakdown by tables/invoices, manual limit overrides, and auto-compaction.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tenant or city..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Threshold Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setThresholdFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  thresholdFilter === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({storageList.length})
              </button>
              <button
                onClick={() => setThresholdFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  thresholdFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-400 hover:bg-rose-950/40'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                &gt;80% Critical ({aggregateMetrics.criticalCount})
              </button>
              <button
                onClick={() => setThresholdFilter('WARNING')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  thresholdFilter === 'WARNING' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-400 hover:bg-amber-950/40'
                }`}
              >
                60-80% Warning ({aggregateMetrics.warningCount})
              </button>
              <button
                onClick={() => setThresholdFilter('NORMAL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  thresholdFilter === 'NORMAL' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-400 hover:bg-emerald-950/40'
                }`}
              >
                &lt;60% Normal
              </button>
            </div>
          </div>
        </div>

        {/* Tenant Quota Grid / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Tenant & Branch</th>
                <th className="py-3 px-3">Storage Consumption</th>
                <th className="py-3 px-3">Capacity Gauge & Threshold</th>
                <th className="py-3 px-3">Data Breakdown</th>
                <th className="py-3 px-3 text-right">Quota Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStorageList.map((item) => {
                const isCritical = item.warningLevel === 'critical';
                const isWarning = item.warningLevel === 'warning';

                return (
                  <tr 
                    key={item.tenantId} 
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCritical ? 'bg-rose-950/15' : isWarning ? 'bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Tenant Info */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          isWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.tenantName}</span>
                            {isCritical && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-900/80 text-rose-200 border border-rose-500/40 animate-pulse">
                                OVER 80%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{item.city}</span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                              {item.plan}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Storage Consumption Numbers */}
                    <td className="py-3.5 px-3">
                      <div>
                        <div className="font-mono font-bold text-slate-100 flex items-baseline gap-1">
                          <span className="text-sm">{item.usedMb} MB</span>
                          <span className="text-slate-400 text-[11px]">/ {item.limitMb} MB</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          Free: <span className="font-mono text-emerald-400">{(item.limitMb - item.usedMb).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </td>

                    {/* Capacity Gauge & Warning Threshold */}
                    <td className="py-3.5 px-3 min-w-[180px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={`font-bold ${
                            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {item.percentageUsed}% Used
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {isCritical ? '⚠️ Quota Warning' : isWarning ? '⚡ Moderate' : '✅ Optimal'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/60">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-sm shadow-rose-500/50 animate-pulse' :
                              isWarning ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                              'bg-gradient-to-r from-emerald-500 to-teal-400'
                            }`}
                            style={{ width: `${Math.min(100, item.percentageUsed)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Data Breakdown (DB, Invoices, Media, Audit) */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-300 font-mono" title="SQLite Database Records">
                          DB: {item.breakdown.dbRecordsMb} MB
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono" title="Invoice PDFs & Slips">
                          Invoices: {item.breakdown.invoicesArchiveMb} MB
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono" title="Media & Batch Photos">
                          Media: {item.breakdown.assetsMediaMb} MB
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono" title="Audit & Sync Queues">
                          Logs: {item.breakdown.auditLogsMb} MB
                        </span>
                      </div>
                    </td>

                    {/* Actions: Set Manual Limit & Purge Cache */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditLimit(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Configure custom manual storage quota in MB/GB"
                        >
                          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Set Limit</span>
                        </button>

                        <button
                          onClick={() => handlePurgeCache(item.tenantId, item.tenantName)}
                          disabled={isPurgingTenantId === item.tenantId}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Purge temporary sync queue and compact SQLite tables"
                        >
                          <Trash2 className={`w-3.5 h-3.5 text-amber-400 ${isPurgingTenantId === item.tenantId ? 'animate-spin' : ''}`} />
                          <span>Compact DB</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStorageList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No tenants found matching criteria "{searchQuery || thresholdFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Limit Configuration Modal */}
      {editLimitTenant && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setEditLimitTenant(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Manual Storage Quota Limit</h3>
                <p className="text-xs text-slate-400">{editLimitTenant.tenantName}</p>
              </div>
            </div>

            <form onSubmit={handleSaveManualLimit} className="mt-5 space-y-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Current Consumption:</span>
                  <span className="font-mono font-bold text-cyan-300">{editLimitTenant.usedMb} MB</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Current Active Limit:</span>
                  <span className="font-mono font-bold text-slate-100">{editLimitTenant.limitMb} MB</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Quick Preset Quotas
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[250, 500, 1000, 2048, 5120, 10240].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomLimitInput(preset)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer border ${
                        customLimitInput === preset
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset >= 1024 ? `${preset / 1024} GB` : `${preset} MB`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Number Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Limit (in Megabytes - MB)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    step={50}
                    value={customLimitInput}
                    onChange={(e) => setCustomLimitInput(Number(e.target.value) || 50)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Enter limit in MB (e.g. 500, 1000, 2000)"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    MB (~{(customLimitInput / 1024).toFixed(2)} GB)
                  </span>
                </div>
              </div>

              {/* Warning Threshold Note */}
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-200/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  The system will automatically trigger <strong>Yellow Warning at 60%</strong> and <strong>Red Warning with lock alert at 80%</strong> of this configured limit.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditLimitTenant(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Quota Limit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
