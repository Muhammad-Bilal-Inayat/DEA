import React, { useState, useEffect, useMemo } from 'react';
import {
  SYSTEM_MENU_TREE,
  UserAccessControlProfile,
  getUserAccessControlProfile,
  computeEffectivePermissions,
  saveUserAccessControlProfile,
  checkGranularRouteAccess,
  evaluatePermission,
  resolveUserAliases
} from '../../lib/userAccessControl';
import { UserRole } from '../../types';
import { MasterActiveUser, getAllTenants } from '../../lib/masterServerService';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Zap,
  UserCheck,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  Copy,
  Check,
  Eye,
  Sliders,
  X,
  Bug,
  Filter,
  RefreshCw,
  FolderTree,
  Code2,
  ExternalLink,
  Lock,
  Unlock,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface RouteEvaluationEvent {
  timestamp: string;
  pathname: string;
  userParams: { userId?: string; role?: UserRole; plan?: string; tenantId?: string };
  result: { isAllowed: boolean; reason?: string; requiredFunction?: string; blockingFactor?: string };
  matchedRule?: { prefix: string; menuId: string; submenuId?: string; functionId?: string; label: string };
}

interface PermissionDebuggerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  users: MasterActiveUser[];
  selectedUserId: string;
  onSelectUserId: (userId: string) => void;
  onSwitchSession?: (user: MasterActiveUser) => void;
}

const COMMON_ROUTE_PRESETS = [
  { path: '/user', label: 'Dashboard' },
  { path: '/sale/invoices', label: 'Sale Invoices' },
  { path: '/sale/quotation', label: 'Estimates/Quotations' },
  { path: '/sale/payment-in', label: 'Payment In' },
  { path: '/sale/order', label: 'Sale Order' },
  { path: '/shift-management', label: 'Shift Mgmt' },
  { path: '/items', label: 'Inventory / Items' },
  { path: '/shortage-registry', label: 'Shortage Registry' },
  { path: '/purchase', label: 'Purchase Bills' },
  { path: '/purchase/payment-out', label: 'Payment Out' },
  { path: '/parties', label: 'Customers / Parties' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/bank', label: 'Bank & Cash' },
  { path: '/reports', label: 'Reports' },
  { path: '/online-store', label: 'Online Store' },
  { path: '/utilities', label: 'Utilities' },
  { path: '/sync-share', label: 'Sync & Share' },
  { path: '/settings', label: 'Settings' },
];

export const PermissionDebuggerOverlay: React.FC<PermissionDebuggerOverlayProps> = ({
  isOpen,
  onClose,
  users,
  selectedUserId,
  onSelectUserId,
  onSwitchSession,
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'hierarchy' | 'events' | 'rawJson'>('tester');
  const [testPath, setTestPath] = useState('/sale/invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'blocked' | 'allowed'>('all');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [eventLogs, setEventLogs] = useState<RouteEvaluationEvent[]>([]);
  const [activeSessionUser, setActiveSessionUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [profileVersion, setProfileVersion] = useState(0);

  // Target user details
  const targetUser: MasterActiveUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || users[0] || {
      id: selectedUserId || 'usr_admin_01',
      name: 'Primary Admin (M.Bilal Inayat)',
      role: 'Primary Admin',
      storeName: 'Main Store',
      status: 'Active',
      emailOrPhone: '03364585863',
      passcode: '1234',
      lastSyncTime: new Date().toISOString(),
      isOnline: true,
      totalTransactions: 0,
      sessionDurationMinutes: 0,
      totalActiveHours: 0,
    };
  }, [users, selectedUserId]);

  // Active Tenant
  const activeTenant = useMemo(() => {
    try {
      const tenants = getAllTenants();
      return tenants.find(t => t.status === 'Active') || tenants[0] || {
        id: 'tenant-main',
        name: 'MBI Pharma Main Branch',
        plan: 'Pharmacy Pro'
      };
    } catch {
      return { id: 'tenant-main', name: 'MBI Pharma Main Branch', plan: 'Pharmacy Pro' };
    }
  }, []);

  // Compute profile & effective policy
  const currentProfile = useMemo(() => {
    return getUserAccessControlProfile(
      targetUser.id,
      targetUser.role as UserRole,
      activeTenant.plan || 'Pharmacy Pro',
      activeTenant.id
    );
  }, [targetUser.id, targetUser.role, activeTenant.plan, activeTenant.id, profileVersion]);

  const effectivePolicy = useMemo(() => {
    return computeEffectivePermissions(currentProfile);
  }, [currentProfile]);

  // Refresh active session info
  const checkSession = () => {
    try {
      const activeId = localStorage.getItem('mbi_user_access_active_id');
      const activeStr = localStorage.getItem('active_simulated_user');
      if (activeStr) {
        const parsed = JSON.parse(activeStr);
        setActiveSessionUser({ id: parsed.id || 'usr_unknown', name: parsed.name || 'User', role: parsed.role || 'Cashier' });
      } else if (activeId) {
        const u = users.find(x => x.id === activeId);
        setActiveSessionUser({ id: activeId, name: u?.name || activeId, role: u?.role || 'Active User' });
      } else {
        setActiveSessionUser({ id: 'usr_admin_01', name: 'Primary Admin (M.Bilal Inayat)', role: 'Primary Admin' });
      }
    } catch {
      setActiveSessionUser({ id: 'usr_admin_01', name: 'Primary Admin', role: 'Primary Admin' });
    }
  };

  useEffect(() => {
    checkSession();
    const handleStorage = () => {
      checkSession();
      setProfileVersion(v => v + 1);
    };
    const handleProfileUpdate = () => {
      checkSession();
      setProfileVersion(v => v + 1);
    };

    const handleRouteEvent = (e: any) => {
      if (e.detail) {
        setEventLogs(prev => [e.detail as RouteEvaluationEvent, ...prev].slice(0, 40));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('mbi-user-access-profile-updated', handleProfileUpdate);
    window.addEventListener('mbi-effective-permissions-updated', handleProfileUpdate);
    window.addEventListener('mbi-route-access-evaluated', handleRouteEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mbi-user-access-profile-updated', handleProfileUpdate);
      window.removeEventListener('mbi-effective-permissions-updated', handleProfileUpdate);
      window.removeEventListener('mbi-route-access-evaluated', handleRouteEvent);
    };
  }, [users]);

  // Evaluated Route Result for testPath
  const testResult = useMemo(() => {
    return checkGranularRouteAccess(testPath, {
      userId: targetUser.id,
      role: targetUser.role as UserRole,
      plan: activeTenant.plan,
      tenantId: activeTenant.id
    });
  }, [testPath, targetUser.id, targetUser.role, activeTenant.plan, activeTenant.id, profileVersion]);

  // Stats
  const stats = useMemo(() => {
    const menus = Object.values(effectivePolicy.menus);
    const submenus = Object.values(effectivePolicy.submenus);
    const functions = Object.values(effectivePolicy.functions);
    const actions = Object.values(effectivePolicy.actions);

    return {
      menusAllowed: menus.filter(Boolean).length,
      menusTotal: menus.length,
      submenusAllowed: submenus.filter(Boolean).length,
      submenusTotal: submenus.length,
      functionsAllowed: functions.filter(Boolean).length,
      functionsTotal: functions.length,
      actionsAllowed: actions.filter(Boolean).length,
      actionsTotal: actions.length
    };
  }, [effectivePolicy]);

  // Quick Toggle Handler inside debugger
  const handleToggle = (type: 'menu' | 'submenu' | 'function' | 'action', id: string, currentVal: boolean) => {
    const updated = { ...currentProfile, isCustomOverrideActive: true };
    const newVal = !currentVal;

    if (type === 'menu') {
      updated.menuToggles = { ...updated.menuToggles, [id]: newVal };
    } else if (type === 'submenu') {
      updated.submenuToggles = { ...updated.submenuToggles, [id]: newVal };
    } else if (type === 'function') {
      updated.functionToggles = { ...updated.functionToggles, [id]: newVal };
    } else if (type === 'action') {
      updated.actionToggles = { ...updated.actionToggles, [id]: newVal };
    }

    saveUserAccessControlProfile(updated);
    try {
      localStorage.setItem('mbi_active_user_access_profile', JSON.stringify(updated));
      localStorage.setItem('mbi_user_access_profile_user_usr_active', JSON.stringify(updated));
    } catch {}

    window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('mbi-effective-permissions-updated', { detail: computeEffectivePermissions(updated) }));
    window.dispatchEvent(new Event('storage'));
    setProfileVersion(v => v + 1);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(effectivePolicy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-200 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">Permission Debugger</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME TRACE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live Effective Access Policy inspector & route evaluation engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen View'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors cursor-pointer"
              title="Close Debugger"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tenant Session & Target User Bar */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs shrink-0">
          {/* User Selector Dropdown */}
          <div className="md:col-span-4 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-700">
            <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inspect Target User</div>
              <select
                value={selectedUserId}
                onChange={(e) => onSelectUserId(e.target.value)}
                className="w-full bg-transparent text-xs font-black text-amber-300 focus:outline-none cursor-pointer truncate"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.role}) • ID: {u.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Tenant and Session Info */}
          <div className="md:col-span-5 flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-slate-300">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Active Tenant Session</span>
              <strong className="text-white truncate block">{activeTenant.name} ({activeTenant.id})</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold">Simulated In Browser</span>
              <span className="font-bold text-emerald-400">{activeSessionUser?.name || 'Primary Admin'}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-3 flex items-center gap-2 justify-end">
            {onSwitchSession && (
              <button
                type="button"
                onClick={() => onSwitchSession(targetUser)}
                className="w-full h-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Simulate this user in the browser right now to see sidebar changes"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulate In App</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Menus:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {stats.menusAllowed} / {stats.menusTotal} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Submenus:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {stats.submenusAllowed} / {stats.submenusTotal} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Functions:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {stats.functionsAllowed} / {stats.functionsTotal} Active
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Actions:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {stats.actionsAllowed} / {stats.actionsTotal} Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              currentProfile.isCustomOverrideActive 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-slate-800 text-slate-400'
            }`}>
              {currentProfile.isCustomOverrideActive ? 'Custom Switchboard Override: ACTIVE' : 'Role Default Policy'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('tester')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tester'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Route Access Tester</span>
          </button>
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hierarchy'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Policy Hierarchy & Toggles</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Route Events Log ({eventLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rawJson')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rawJson'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Computed Policy JSON</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: ROUTE ACCESS TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <span>Enter Application Route to Test Access for {targetUser.name}:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Live evaluation using current switchboard rules</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={testPath}
                      onChange={(e) => setTestPath(e.target.value)}
                      placeholder="/sale/invoices, /items, /purchase, /expenses..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    onClick={() => {
                      checkGranularRouteAccess(testPath, {
                        userId: targetUser.id,
                        role: targetUser.role as UserRole,
                        plan: activeTenant.plan,
                        tenantId: activeTenant.id
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Evaluate & Trace in Console</span>
                  </button>
                </div>

                {/* Route Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Presets:</span>
                  {COMMON_ROUTE_PRESETS.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => setTestPath(p.path)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        testPath === p.path
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {p.label} ({p.path})
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluation Result Card */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  testResult.isAllowed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {testResult.isAllowed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-400" />
                    )}
                    <div>
                      <h4 className="text-base font-black">
                        {testResult.isAllowed ? 'ACCESS PERMITTED (VISIBLE)' : 'ACCESS BLOCKED (HIDDEN)'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Evaluated for Route: <code className="text-amber-300 font-mono font-bold">{testPath}</code>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                      testResult.isAllowed
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-rose-600 text-white animate-pulse'
                    }`}
                  >
                    {testResult.isAllowed ? 'STATUS: PERMITTED' : 'STATUS: BLOCKED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold mb-1">Reason / Status Note:</span>
                    <p className="text-white font-semibold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {testResult.reason || 'Allowed: No blocking toggles or role restrictions prevent access.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold mb-1">Root Cause / Blocking Factor:</span>
                    <p className="text-amber-300 font-semibold bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      {testResult.blockingFactor || 'None: All parent menus, submenus, and functions are enabled.'}
                    </p>
                  </div>
                </div>

                {testResult.requiredFunction && (
                  <div className="mt-3 text-xs flex items-center gap-2 text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Associated Operational Function ID:</span>
                    <code className="text-amber-400 font-mono font-bold">{testResult.requiredFunction}</code>
                  </div>
                )}
              </div>

              {/* Helper instructions */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Developer Console Trace:</span>
                </div>
                <p>
                  Open your browser developer tools (<kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">F12</kbd> or <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">Ctrl+Shift+I</kbd>) to view the structured <strong>[Permission Trace]</strong> output detailing the complete effective permission object, matched route rule, and raw switchboard toggles for each evaluation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: POLICY HIERARCHY & TOGGLES */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[200px] relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu, submenu, function, or action..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All Items
                  </button>
                  <button
                    onClick={() => setFilterMode('blocked')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'blocked'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Blocked Only
                  </button>
                  <button
                    onClick={() => setFilterMode('allowed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'allowed'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Allowed Only
                  </button>
                </div>
              </div>

              {/* Hierarchy Tree List */}
              <div className="space-y-3">
                {SYSTEM_MENU_TREE.map((menu) => {
                  const isMenuAllowed = effectivePolicy.menus[menu.id] !== false;
                  if (filterMode === 'blocked' && isMenuAllowed) return null;
                  if (filterMode === 'allowed' && !isMenuAllowed) return null;

                  return (
                    <div
                      key={menu.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isMenuAllowed
                          ? 'bg-slate-950/70 border-slate-800'
                          : 'bg-rose-950/15 border-rose-800/40'
                      }`}
                    >
                      {/* Menu Level */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isMenuAllowed ? 'bg-purple-500/20 text-purple-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">{menu.label}</h5>
                              <code className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">
                                id: {menu.id}
                              </code>
                            </div>
                            <span className="text-[11px] text-slate-400">{menu.defaultPath}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            isMenuAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {isMenuAllowed ? 'MENU: ALLOWED' : 'MENU: BLOCKED'}
                          </span>
                          <button
                            onClick={() => handleToggle('menu', menu.id, isMenuAllowed)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isMenuAllowed ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={isMenuAllowed ? 'Block Menu' : 'Allow Menu'}
                          >
                            {isMenuAllowed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Submenus */}
                      <div className="pl-4 border-l border-slate-800 space-y-2">
                        {menu.submenus.map((sub) => {
                          const isSubAllowed = effectivePolicy.submenus[sub.id] !== false && isMenuAllowed;
                          return (
                            <div
                              key={sub.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                isSubAllowed ? 'bg-slate-900/60 border-slate-800/80' : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                <div>
                                  <strong className="text-slate-200">{sub.label}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono ml-2">({sub.path})</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${isSubAllowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isSubAllowed ? 'ALLOWED' : 'BLOCKED'}
                                </span>
                                <button
                                  onClick={() => handleToggle('submenu', sub.id, isSubAllowed)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                    isSubAllowed ? 'bg-rose-950 text-rose-300 hover:bg-rose-900' : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                                  }`}
                                >
                                  {isSubAllowed ? 'Disable' : 'Enable'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ROUTE EVENTS LOG */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-300">
                  Real-time route access evaluations intercepted from application navigation:
                </span>
                <button
                  onClick={() => setEventLogs([])}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              {eventLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                  <p>No route events captured yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click links in the sidebar or evaluate routes using the Route Access Tester above to see real-time events.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventLogs.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
                        ev.result.isAllowed
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-[10px]">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          ev.result.isAllowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {ev.result.isAllowed ? 'ALLOWED' : 'BLOCKED'}
                        </span>
                        <strong className="text-white">{ev.pathname}</strong>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        {ev.result.blockingFactor || 'Permitted by granular policy'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMPUTED POLICY JSON */}
          {activeTab === 'rawJson' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-300 font-bold">
                  Effective Computed Policy Object for {targetUser.name} ({targetUser.role}):
                </span>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Policy JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[500px]">
                <pre>{JSON.stringify(effectivePolicy, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Target User ID: <code className="text-amber-300 font-mono font-bold">{targetUser.id}</code></span>
            <span>• Role: <strong className="text-white">{targetUser.role}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close Debugger
          </button>
        </div>
      </div>
    </div>
  );
};
