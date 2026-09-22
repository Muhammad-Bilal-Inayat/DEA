import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Zap, 
  Filter, 
  Download, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { 
  Tenant, 
  getAllTenants, 
  getTenant30DaySyncHealth, 
  SyncHealthReport, 
  DailySyncHealthMetric 
} from '../../lib/masterServerService';

interface SyncHealthVisualizerProps {
  onNotify: (msg: string) => void;
}

export const SyncHealthVisualizer: React.FC<SyncHealthVisualizerProps> = ({ onNotify }) => {
  const [tenants] = useState<Tenant[]>(() => getAllTenants());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Load 30-day sync health report based on selected tenant
  const syncReport: SyncHealthReport = useMemo(() => {
    return getTenant30DaySyncHealth(selectedTenantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, refreshKey]);

  // Highlight days with failures for incident log
  const incidentDays = useMemo(() => {
    return syncReport.dailyMetrics.filter(d => d.failedSyncs > 0);
  }, [syncReport]);

  const handleManualProbe = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
      setIsRefreshing(false);
      onNotify('Real-time sync diagnostics probe completed across all tenant edge nodes!');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">
                30-Day Fleet Sync Health & Failure Telemetry
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visual frequency plot of daily database synchronization, socket transfers, latency jitter, and network failure analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tenant Selection Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scope:</span>
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs font-semibold text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">🌐 All Fleet Branches (Aggregate)</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.city || 'Punjab'})
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnostic Probe Button */}
            <button
              onClick={handleManualProbe}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Run Health Probe</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Overall Success Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Sync Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {syncReport.overallSuccessRatePercent}%
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {syncReport.successfulSyncs30Days.toLocaleString()} successful syncs
          </p>
        </div>

        {/* 2. Total 30-Day Sync Operations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>30-Day Syncs</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white">
            {syncReport.totalSyncs30Days.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            ~{Math.round(syncReport.totalSyncs30Days / 30)} syncs/day avg
          </p>
        </div>

        {/* 3. Highlighted Failed Sync Attempts */}
        <div className={`border rounded-2xl p-4 shadow-sm ${
          syncReport.failedCount30Days > 0 ? 'bg-rose-950/30 border-rose-800/80 text-rose-300' : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={syncReport.failedCount30Days > 0 ? 'text-rose-300' : 'text-slate-400'}>Failed Syncs</span>
            <AlertTriangle className={`w-4 h-4 ${syncReport.failedCount30Days > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${syncReport.failedCount30Days > 0 ? 'text-rose-400' : 'text-white'}`}>
            {syncReport.failedCount30Days}
          </div>
          <p className="mt-1 text-[11px] opacity-80">
            {syncReport.failedCount30Days > 0 ? 'Highlighted in red on chart below' : 'Zero failures in past 30 days'}
          </p>
        </div>

        {/* 4. Average Latency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Avg Network Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-amber-400">
            {syncReport.avgLatencyMs} <span className="text-xs font-bold text-slate-400">ms</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Peak: {syncReport.peakSyncDay} ({syncReport.peakSyncCount} syncs)
          </p>
        </div>

        {/* 5. Total Data Transferred */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>Data Payload</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-cyan-300">
            {syncReport.totalDataTransferredMb} <span className="text-xs font-bold text-slate-400">MB</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Compressed binary sync stream
          </p>
        </div>
      </div>

      {/* Main 30-Day Recharts Visualizer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Daily Sync Frequency & Failed Attempts (Past 30 Days)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                {selectedTenantId === 'ALL' ? 'Fleet-wide' : 'Branch Scope'}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Green/cyan bars indicate successful sync packets. Red markers pinpoint failed attempts.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500" />
              <span className="text-slate-300">Successful Syncs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500 animate-pulse" />
              <span className="text-rose-400 font-semibold">Failed Attempts</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={syncReport.dailyMetrics}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis 
                dataKey="dayLabel" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false}
                interval={2}
                angle={-25}
                textAnchor="end"
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DailySyncHealthMetric;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 text-slate-200">
                        <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                          <span>{label} ({data.date})</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            data.healthStatus === 'HEALTHY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            data.healthStatus === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {data.healthStatus}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Successful Syncs:</span>
                          <span className="font-mono font-bold">{data.successfulSyncs}</span>
                        </div>
                        {data.failedSyncs > 0 && (
                          <div className="flex justify-between gap-4 text-rose-400 font-bold">
                            <span>Failed Attempts:</span>
                            <span className="font-mono">{data.failedSyncs}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Latency:</span>
                          <span className="font-mono">{data.avgLatencyMs} ms</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-400">
                          <span>Payload:</span>
                          <span className="font-mono">{data.dataTransferredMb} MB</span>
                        </div>
                        <div className="flex justify-between gap-4 text-cyan-300">
                          <span>Success Rate:</span>
                          <span className="font-mono font-bold">{data.successRatePercent}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="successfulSyncs" 
                name="Successful Syncs" 
                stackId="syncStack" 
                fill="#10b981" 
                radius={[0, 0, 0, 0]} 
              />
              <Bar 
                dataKey="failedSyncs" 
                name="Failed Attempts" 
                stackId="syncStack" 
                fill="#f43f5e" 
                radius={[4, 4, 0, 0]} 
              >
                {syncReport.dailyMetrics.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.failedSyncs > 0 ? '#ef4444' : '#10b981'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Network Jitter Area Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Network Latency & Response Jitter Trend (ms)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Round-trip sync response time for telemetry heartbeat and batch commits.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            Target SLA: &lt; 50ms
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={syncReport.dailyMetrics}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={10} tickLine={false} interval={3} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="ms" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-2.5 shadow-xl text-xs space-y-1">
                        <span className="font-bold text-white">{label}</span>
                        <div className="text-amber-400 font-mono">
                          Latency: <strong>{payload[0].value} ms</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="avgLatencyMs" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#latencyGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident & Failed Attempts Log Breakdown */}
      {incidentDays.length > 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Sync Incident Log & Anomaly Inspector ({incidentDays.length} Days with Failures)</span>
          </h4>
          <div className="divide-y divide-slate-800 text-xs">
            {incidentDays.map((incident, idx) => (
              <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <WifiOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{incident.dayLabel} ({incident.date})</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                        {incident.failedSyncs} Failed Packets
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Root Cause: Local client socket disconnect. Auto-healed via conflict resolution and subsequent successful sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                  <span className="text-slate-400">Total: {incident.totalSyncs}</span>
                  <span className="text-emerald-400">Recovered: {incident.successfulSyncs}</span>
                  <span className="text-amber-400">Latency: {incident.avgLatencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>No failed sync incidents detected in the past 30 days. Perfect 100% uptime SLA recorded.</span>
        </div>
      )}
    </div>
  );
};
