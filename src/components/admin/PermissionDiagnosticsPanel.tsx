import React, { useState, useMemo, useEffect } from 'react';
import {
  SYSTEM_MENU_TREE,
  UserAccessControlProfile,
  evaluatePermission,
  resolveUserAliases,
  getUserAccessProfileKey,
  getEffectivePermissionsStorageKey,
  computeEffectivePermissions
} from '../../lib/userAccessControl';
import { MasterActiveUser } from '../../lib/masterServerService';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Zap,
  Info,
  Sliders,
  UserCheck,
  Lock,
  Unlock,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  UserX,
  ExternalLink,
  Copy,
  Check,
  Save,
  RotateCcw,
  Eye,
  Trash2,
  Edit3,
  Share2,
  DollarSign
} from 'lucide-react';

interface PermissionDiagnosticsPanelProps {
  selectedUser: MasterActiveUser;
  profile: UserAccessControlProfile;
  isDirty: boolean;
  onSaveProfile: () => void;
  onUpdateProfile: (updater: (prev: UserAccessControlProfile) => UserAccessControlProfile) => void;
  onNotify?: (message: string) => void;
}

export const PermissionDiagnosticsPanel: React.FC<PermissionDiagnosticsPanelProps> = ({
  selectedUser,
  profile,
  isDirty,
  onSaveProfile,
  onUpdateProfile,
  onNotify
}) => {
  const [activeSessionUser, setActiveSessionUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blocked' | 'allowed' | 'actions' | 'functions'>('all');
  
  // Custom simulator test input
  const [customTestKey, setCustomTestKey] = useState('act_delete_sale');
  const [testTraceLog, setTestTraceLog] = useState<{
    key: string;
    allowed: boolean;
    reason: string;
    steps: { step: string; status: 'pass' | 'fail' | 'info'; detail: string }[];
  } | null>(null);

  // Check active browser session
  const refreshActiveSession = () => {
    try {
      const activeId = localStorage.getItem('mbi_user_access_active_id');
      const activeUserStr = localStorage.getItem('active_simulated_user');
      if (activeUserStr) {
        const parsed = JSON.parse(activeUserStr);
        setActiveSessionUser({ id: parsed.id || 'usr_unknown', name: parsed.name || 'User', role: parsed.role || 'Cashier' });
      } else if (activeId) {
        setActiveSessionUser({ id: activeId, name: activeId === selectedUser.id ? selectedUser.name : activeId, role: 'Active User' });
      } else {
        setActiveSessionUser({ id: 'usr_admin_01', name: 'Primary Admin (M.Bilal Inayat)', role: 'Primary Admin' });
      }
    } catch {
      setActiveSessionUser({ id: 'usr_admin_01', name: 'Primary Admin', role: 'Primary Admin' });
    }
  };

  useEffect(() => {
    refreshActiveSession();
    window.addEventListener('storage', refreshActiveSession);
    window.addEventListener('mbi-user-access-profile-updated', refreshActiveSession);
    return () => {
      window.removeEventListener('storage', refreshActiveSession);
      window.removeEventListener('mbi-user-access-profile-updated', refreshActiveSession);
    };
  }, [selectedUser.id]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Impersonate / switch active session to selected user
  const handleImpersonateUser = () => {
    try {
      localStorage.setItem('mbi_user_access_active_id', selectedUser.id);
      localStorage.setItem('active_simulated_user', JSON.stringify({
        id: selectedUser.id,
        name: selectedUser.name,
        role: selectedUser.role,
        storeName: selectedUser.storeName || 'Branch'
      }));
      window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated', { detail: { userId: selectedUser.id } }));
      window.dispatchEvent(new Event('storage'));
      refreshActiveSession();
      if (onNotify) onNotify(`Session switched to ${selectedUser.name} (${selectedUser.role}). Live restrictions active!`);
    } catch (e) {
      console.error('Failed to impersonate:', e);
    }
  };

  const handleRevertToAdmin = () => {
    try {
      localStorage.setItem('mbi_user_access_active_id', 'usr_admin_01');
      localStorage.setItem('active_simulated_user', JSON.stringify({
        id: 'usr_admin_01',
        name: 'Primary Admin (M.Bilal Inayat)',
        role: 'Primary Admin',
        storeName: 'Central Branch'
      }));
      window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated', { detail: { userId: 'usr_admin_01' } }));
      window.dispatchEvent(new Event('storage'));
      refreshActiveSession();
      if (onNotify) onNotify('Session reverted to Primary Admin (Full Unrestricted Access).');
    } catch (e) {
      console.error('Failed to revert:', e);
    }
  };

  const handleEnforceCustomOverride = (enable: boolean) => {
    onUpdateProfile(prev => ({
      ...prev,
      isCustomOverrideActive: enable
    }));
    if (onNotify) {
      onNotify(enable 
        ? `Strict Custom Override ENABLED for ${selectedUser.name}. Granular denies will now strictly block them!`
        : `Custom Override DISABLED for ${selectedUser.name}. Reverted to default role behavior.`
      );
    }
  };

  // Diagnostic Factors
  const isPrimaryAdmin = selectedUser.role === 'Primary Admin';
  const hasCustomOverride = !!profile.isCustomOverrideActive;
  const roleBypassActive = isPrimaryAdmin && !hasCustomOverride;
  const aliases = useMemo(() => resolveUserAliases(selectedUser.id), [selectedUser.id]);
  const isSessionMatching = activeSessionUser ? (activeSessionUser.id === selectedUser.id || aliases.includes(activeSessionUser.id)) : false;
  const effectiveProfileKey = getUserAccessProfileKey(selectedUser.id);
  const effectiveStorageKey = getEffectivePermissionsStorageKey(selectedUser.id);

  // Compute flattened capabilities
  const effectivePerms = useMemo(() => {
    return computeEffectivePermissions(profile);
  }, [profile]);

  // Key Security Capabilities to Audit
  const securityAudits = useMemo(() => {
    const list = [
      {
        id: 'canEditBills',
        actionCode: 'act_edit_sale',
        functionId: 'editSale',
        submenuId: 'saleInvoices',
        menuId: 'sale',
        title: 'Edit Completed Bills / Invoices',
        description: 'Modify previously saved customer invoices and prices',
        icon: Edit3
      },
      {
        id: 'canDeleteBills',
        actionCode: 'act_delete_sale',
        functionId: 'deleteSale',
        submenuId: 'saleInvoices',
        menuId: 'sale',
        title: 'Delete Completed Bills / Invoices',
        description: 'Permanently remove completed sales transactions',
        icon: Trash2
      },
      {
        id: 'canReprintBills',
        actionCode: 'act_print_sale',
        functionId: 'reprintSale',
        submenuId: 'saleInvoices',
        menuId: 'sale',
        title: 'Reprint & WhatsApp Share Invoices',
        description: 'Print thermal slips or send invoice on WhatsApp',
        icon: Share2
      },
      {
        id: 'canViewCostsAndProfit',
        actionCode: 'act_view_cost',
        functionId: 'viewCostsAndMargins',
        submenuId: 'inventoryList',
        menuId: 'items',
        title: 'View Purchase Costs & Profit Margins',
        description: 'Reveals purchase prices and margins (masked if blocked)',
        icon: Eye
      },
      {
        id: 'canApplyDiscount',
        actionCode: 'act_apply_disc',
        functionId: 'applyDiscount',
        submenuId: 'posRegister',
        menuId: 'sale',
        title: 'Apply Manual Discounts at POS',
        description: 'Grant custom bill discounts or percentage markdowns',
        icon: DollarSign
      },
      {
        id: 'route_billing',
        actionCode: 'route_billing',
        functionId: 'billingModule',
        submenuId: 'saleInvoices',
        menuId: 'sale',
        title: 'Access POS Billing Screen (/billing)',
        description: 'Allows navigation to the billing POS workspace',
        icon: Sliders
      },
      {
        id: 'route_inventory',
        actionCode: 'route_inventory',
        functionId: 'inventoryModule',
        submenuId: 'inventoryList',
        menuId: 'items',
        title: 'Access Inventory Screen (/inventory)',
        description: 'Allows navigation to stock and medicine inventory',
        icon: Layers
      },
      {
        id: 'route_reports',
        actionCode: 'route_reports',
        functionId: 'reportsModule',
        submenuId: 'salesReports',
        menuId: 'reports',
        title: 'Access Financial Reports (/reports)',
        description: 'Allows navigation to revenue, profit, and audit reports',
        icon: Activity
      }
    ];

    return list.map(item => {
      // Evaluate exact access
      const isMenuOn = profile.menuToggles[item.menuId] !== false;
      const isSubOn = profile.submenuToggles[item.submenuId] !== false;
      const isFnOn = profile.functionToggles[item.functionId] !== false;
      const isActOn = profile.actionToggles[item.actionCode] !== false;

      let allowed = false;
      let reason = '';
      let blockReasonShort = '';

      if (roleBypassActive) {
        allowed = true;
        reason = 'BYPASSED: User has Primary Admin role without strict custom override. All restrictions are bypassed.';
        blockReasonShort = 'Primary Admin Bypass';
      } else if (!isMenuOn) {
        allowed = false;
        reason = `BLOCKED: Parent Menu '${item.menuId}' is disabled in switchboard.`;
        blockReasonShort = `Menu [${item.menuId}] OFF`;
      } else if (!isSubOn) {
        allowed = false;
        reason = `BLOCKED: Submenu '${item.submenuId}' is disabled.`;
        blockReasonShort = `Submenu [${item.submenuId}] OFF`;
      } else if (!isFnOn) {
        allowed = false;
        reason = `BLOCKED: Function '${item.functionId}' is disabled.`;
        blockReasonShort = `Function [${item.functionId}] OFF`;
      } else if (!isActOn) {
        allowed = false;
        reason = `BLOCKED: Action '${item.actionCode}' is explicitly denied.`;
        blockReasonShort = `Action [${item.actionCode}] OFF`;
      } else {
        allowed = true;
        reason = 'ALLOWED: All hierarchy levels (Menu -> Submenu -> Function -> Action) are active.';
        blockReasonShort = 'Permitted';
      }

      const chain = [
        { label: `Menu: ${item.menuId}`, on: isMenuOn },
        { label: `Sub: ${item.submenuId}`, on: isSubOn },
        { label: `Fn: ${item.functionId}`, on: isFnOn },
        { label: `Act: ${item.actionCode}`, on: isActOn }
      ];

      return {
        ...item,
        allowed,
        reason,
        blockReasonShort,
        chain
      };
    });
  }, [profile, roleBypassActive]);

  // Quick Action: Force Block / Force Allow a Capability
  const handleQuickToggleCapability = (audit: typeof securityAudits[0], makeAllowed: boolean) => {
    onUpdateProfile(prev => {
      const nextMenu = { ...prev.menuToggles };
      const nextSub = { ...prev.submenuToggles };
      const nextFn = { ...prev.functionToggles };
      const nextAct = { ...prev.actionToggles };

      if (makeAllowed) {
        nextMenu[audit.menuId] = true;
        nextSub[audit.submenuId] = true;
        nextFn[audit.functionId] = true;
        nextAct[audit.actionCode] = true;
      } else {
        nextAct[audit.actionCode] = false;
      }

      return {
        ...prev,
        isCustomOverrideActive: true,
        menuToggles: nextMenu,
        submenuToggles: nextSub,
        functionToggles: nextFn,
        actionToggles: nextAct
      };
    });

    if (onNotify) {
      onNotify(`${audit.title} is now ${makeAllowed ? 'ALLOWED' : 'BLOCKED'} for ${selectedUser.name}`);
    }
  };

  // Compile full 173-item list with trace evaluation
  const all173Items = useMemo(() => {
    const items: Array<{
      id: string;
      code: string;
      type: 'menu' | 'submenu' | 'function' | 'action';
      title: string;
      parentLabel: string;
      storedVal: boolean;
      allowed: boolean;
      reason: string;
      menuId: string;
      submenuId?: string;
      functionId?: string;
      actionId?: string;
    }> = [];

    SYSTEM_MENU_TREE.forEach(menu => {
      const isMenuOn = profile.menuToggles[menu.id] !== false;
      items.push({
        id: menu.id,
        code: menu.id,
        type: 'menu',
        title: menu.label,
        parentLabel: 'Root Menu',
        storedVal: isMenuOn,
        allowed: roleBypassActive ? true : isMenuOn,
        reason: roleBypassActive ? 'Role Bypass' : (isMenuOn ? 'Menu Active' : 'Menu Disabled'),
        menuId: menu.id
      });

      menu.submenus.forEach(sub => {
        const isSubOn = profile.submenuToggles[sub.id] !== false;
        const subAllowed = roleBypassActive ? true : (isMenuOn && isSubOn);
        items.push({
          id: sub.id,
          code: sub.id,
          type: 'submenu',
          title: sub.label,
          parentLabel: menu.label,
          storedVal: isSubOn,
          allowed: subAllowed,
          reason: roleBypassActive ? 'Role Bypass' : (!isMenuOn ? `Blocked: Menu [${menu.label}] OFF` : (!isSubOn ? 'Submenu Disabled' : 'Submenu Active')),
          menuId: menu.id,
          submenuId: sub.id
        });

        sub.functions.forEach(fn => {
          const isFnOn = profile.functionToggles[fn.id] !== false;
          const fnAllowed = roleBypassActive ? true : (isMenuOn && isSubOn && isFnOn);
          items.push({
            id: fn.id,
            code: fn.id,
            type: 'function',
            title: fn.label,
            parentLabel: `${menu.label} > ${sub.label}`,
            storedVal: isFnOn,
            allowed: fnAllowed,
            reason: roleBypassActive ? 'Role Bypass' : (!isMenuOn ? `Blocked: Menu [${menu.label}] OFF` : (!isSubOn ? `Blocked: Submenu [${sub.label}] OFF` : (!isFnOn ? 'Function Disabled' : 'Function Active'))),
            menuId: menu.id,
            submenuId: sub.id,
            functionId: fn.id
          });

          fn.actions.forEach(act => {
            const isActOn = profile.actionToggles[act.id] !== false;
            const actAllowed = roleBypassActive ? true : (isMenuOn && isSubOn && isFnOn && isActOn);
            let reason = 'Action Active';
            if (roleBypassActive) reason = 'Bypassed by Primary Admin role';
            else if (!isMenuOn) reason = `Blocked: Menu [${menu.label}] OFF`;
            else if (!isSubOn) reason = `Blocked: Submenu [${sub.label}] OFF`;
            else if (!isFnOn) reason = `Blocked: Function [${fn.label}] OFF`;
            else if (!isActOn) reason = `Blocked: Action toggle denied`;

            items.push({
              id: act.id,
              code: act.code,
              type: 'action',
              title: act.label,
              parentLabel: `${sub.label} > ${fn.label}`,
              storedVal: isActOn,
              allowed: actAllowed,
              reason,
              menuId: menu.id,
              submenuId: sub.id,
              functionId: fn.id,
              actionId: act.id
            });
          });
        });
      });
    });

    return items;
  }, [profile, roleBypassActive]);

  // Filter 173 items
  const filteredItems = useMemo(() => {
    return all173Items.filter(item => {
      if (filterType === 'blocked' && item.allowed) return false;
      if (filterType === 'allowed' && !item.allowed) return false;
      if (filterType === 'actions' && item.type !== 'action') return false;
      if (filterType === 'functions' && item.type !== 'function') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.parentLabel.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [all173Items, filterType, searchQuery]);

  // Run Custom Permission Test Simulation
  const handleRunCustomTest = () => {
    const key = customTestKey.trim();
    if (!key) return;

    const steps: { step: string; status: 'pass' | 'fail' | 'info'; detail: string }[] = [];
    
    // Step 1: User & Role Resolution
    steps.push({
      step: '1. User Identity & Alias Resolution',
      status: 'info',
      detail: `Target User: ${selectedUser.name} (ID: ${selectedUser.id}). Aliases mapped: [${aliases.join(', ')}]. Active storage profile key: ${effectiveProfileKey}`
    });

    // Step 2: Role Override Check
    if (isPrimaryAdmin) {
      if (!hasCustomOverride) {
        steps.push({
          step: '2. Role Bypass Check (Primary Admin)',
          status: 'pass',
          detail: '⚠️ Primary Admin bypass is ACTIVE because custom override is false. All granular rules are bypassed!'
        });
        setTestTraceLog({
          key,
          allowed: true,
          reason: 'Bypassed by Primary Admin role defaults.',
          steps
        });
        return;
      } else {
        steps.push({
          step: '2. Role Bypass Check (Primary Admin)',
          status: 'info',
          detail: 'Strict Custom Override is ACTIVE. Primary Admin bypass is disabled; evaluating granular switchboard.'
        });
      }
    } else {
      steps.push({
        step: '2. Role Enforcement Check',
        status: 'info',
        detail: `Role is '${selectedUser.role}'. Standard granular switchboard enforcement applies.`
      });
    }

    // Step 3: Match Key in 173 Tree
    let matchedItem = all173Items.find(i => i.id === key || i.code === key);
    if (!matchedItem) {
      matchedItem = all173Items.find(i => i.title.toLowerCase().includes(key.toLowerCase()));
    }

    if (matchedItem) {
      const isMenuOn = profile.menuToggles[matchedItem.menuId] !== false;
      steps.push({
        step: `3. Parent Menu Module [${matchedItem.menuId}]`,
        status: isMenuOn ? 'pass' : 'fail',
        detail: isMenuOn ? `Menu is ON (Toggle: ${profile.menuToggles[matchedItem.menuId] !== false ? 'Enabled' : 'Disabled'})` : `Parent Menu [${matchedItem.menuId}] is DISABLED. Cascades failure downward.`
      });

      if (matchedItem.submenuId) {
        const isSubOn = profile.submenuToggles[matchedItem.submenuId] !== false;
        steps.push({
          step: `4. Submenu Module [${matchedItem.submenuId}]`,
          status: isSubOn ? 'pass' : 'fail',
          detail: isSubOn ? `Submenu is ON` : `Submenu [${matchedItem.submenuId}] is DISABLED.`
        });
      }

      if (matchedItem.functionId) {
        const isFnOn = profile.functionToggles[matchedItem.functionId] !== false;
        steps.push({
          step: `5. Function Module [${matchedItem.functionId}]`,
          status: isFnOn ? 'pass' : 'fail',
          detail: isFnOn ? `Function is ON` : `Function [${matchedItem.functionId}] is DISABLED.`
        });
      }

      if (matchedItem.actionId) {
        const isActOn = profile.actionToggles[matchedItem.actionId] !== false;
        steps.push({
          step: `6. Specific Action Toggle [${matchedItem.actionId}]`,
          status: isActOn ? 'pass' : 'fail',
          detail: isActOn ? `Action is explicitly ALLOWED` : `Action is explicitly DENIED in switchboard.`
        });
      }

      setTestTraceLog({
        key: matchedItem.code,
        allowed: matchedItem.allowed,
        reason: matchedItem.reason,
        steps
      });
    } else {
      // Evaluate generic feature
      const allowed = evaluatePermission({
        userId: selectedUser.id,
        role: selectedUser.role as any,
        feature: key
      });
      steps.push({
        step: '3. Evaluated via evaluatePermission fallback',
        status: allowed ? 'pass' : 'fail',
        detail: `Feature key '${key}' evaluated to: ${allowed ? 'ALLOWED' : 'BLOCKED'}`
      });

      setTestTraceLog({
        key,
        allowed,
        reason: allowed ? 'Evaluated to ALLOWED via system mapping.' : 'Evaluated to BLOCKED by system policy.',
        steps
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Diagnostics Alert Header */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Effective Permission Diagnostics & Security Audit</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Target: {selectedUser.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Inspect why granular restrictions might fail to block this user. Verify session identity, role bypasses, and evaluation chains.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={onSaveProfile}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md animate-pulse cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Unsaved Toggles *</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Root Cause Cards (The 3 Main Reasons Why Restrictions Fail) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Factor 1: Active Session Identity */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isSessionMatching 
            ? 'bg-emerald-950/20 border-emerald-500/30' 
            : 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-950/20'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>1. Browser Session Identity</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              isSessionMatching ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {isSessionMatching ? 'MATCHING' : 'MISMATCH'}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Selected User:</span>
              <span className="font-bold text-white">{selectedUser.name}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Active Tab Session:</span>
              <span className={`font-bold ${isSessionMatching ? 'text-emerald-400' : 'text-amber-300'}`}>
                {activeSessionUser?.name || 'Primary Admin'}
              </span>
            </div>

            {!isSessionMatching ? (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[11px] text-amber-200 space-y-2 mt-2">
                <p>
                  ⚠️ <strong>Session Mismatch:</strong> Your current browser tab is running as <strong>{activeSessionUser?.name}</strong>. Toggles for {selectedUser.name} will NOT block your current screen until you switch active session.
                </p>
                <button
                  type="button"
                  onClick={handleImpersonateUser}
                  className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Impersonate & Test as {selectedUser.name}</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 space-y-2 mt-2">
                <p>
                  ✅ <strong>Session Aligned:</strong> Current browser is acting as {selectedUser.name}. Any saved restriction immediately blocks actions in Billing & Inventory!
                </p>
                <button
                  type="button"
                  onClick={handleRevertToAdmin}
                  className="w-full py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] transition-all cursor-pointer"
                >
                  Revert Session to Primary Admin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Factor 2: Role Override & Master Bypass */}
        <div className={`p-4 rounded-2xl border transition-all ${
          roleBypassActive 
            ? 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Role Bypass Policy</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              roleBypassActive ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {roleBypassActive ? 'BYPASS ACTIVE' : 'STRICT ENFORCEMENT'}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Assigned Role:</span>
              <span className="font-bold text-white">{selectedUser.role}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Strict Override:</span>
              <span className={`font-bold ${hasCustomOverride ? 'text-emerald-400' : 'text-slate-400'}`}>
                {hasCustomOverride ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            {roleBypassActive ? (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-[11px] text-rose-200 space-y-2 mt-2">
                <p>
                  🚨 <strong>Primary Admin Bypass:</strong> By default, Primary Admins bypass granular denials. Turn ON &quot;Strict Custom Override&quot; so your toggles block this user!
                </p>
                <button
                  type="button"
                  onClick={() => handleEnforceCustomOverride(true)}
                  className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enforce Custom Override Now</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 mt-2">
                <p className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Granular Rules Active</span>
                </p>
                <p className="text-slate-400 text-[10px]">
                  All menu, function, and action denies will strictly block this user without implicit bypasses.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Factor 3: Storage State & Persistence */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Persistence & Database</span>
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
              isDirty ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {isDirty ? 'UNSAVED EDITS' : 'SAVED LIVE'}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Profile Key:</span>
              <button
                type="button"
                onClick={() => handleCopy(effectiveProfileKey, 'profileKey')}
                className="font-mono text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-1 cursor-pointer"
                title="Click to copy storage key"
              >
                <span>{effectiveProfileKey.slice(0, 22)}...</span>
                {copiedText === 'profileKey' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Last Modified:</span>
              <span className="font-mono text-[10px] text-slate-300">{profile.updatedAt ? new Date(profile.updatedAt).toLocaleTimeString() : 'Default'}</span>
            </div>

            {isDirty ? (
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 space-y-2 mt-2">
                <p>
                  ⚠️ <strong>Unsaved Changes:</strong> You toggled items on screen, but haven&apos;t saved. Pages like Billing will use the previous state until saved!
                </p>
                <button
                  type="button"
                  onClick={onSaveProfile}
                  className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes Now</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 mt-2">
                <span className="text-emerald-400 font-bold">In-Sync: </span>
                Profile is saved in localStorage and broadcasted across all tabs via reactive events.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Security Capabilities Audit Matrix */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>High-Impact Security Capabilities Audit</span>
            </h4>
            <p className="text-xs text-slate-400">
              Direct verification of high-risk actions (bill editing, deletion, cost masking) with complete hierarchy trace.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {securityAudits.filter(a => !a.allowed).length} Blocked • {securityAudits.filter(a => a.allowed).length} Allowed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {securityAudits.map(audit => {
            const Icon = audit.icon;
            return (
              <div 
                key={audit.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  audit.allowed 
                    ? 'bg-slate-950/60 border-slate-800' 
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        audit.allowed 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{audit.title}</div>
                        <div className="text-[11px] text-slate-400">{audit.description}</div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase shrink-0 border ${
                      audit.allowed 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {audit.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </span>
                  </div>

                  {/* Hierarchy Path Trace */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[10px] font-mono space-y-1">
                    <div className="text-slate-400 font-sans font-bold text-[10px]">Hierarchy Chain Trace:</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-300">
                      {audit.chain.map((c, i) => (
                        <React.Fragment key={i}>
                          <span className={`px-1.5 py-0.5 rounded ${
                            c.on ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950 text-rose-300 border border-rose-800/40'
                          }`}>
                            {c.label}: {c.on ? 'ON' : 'OFF'}
                          </span>
                          {i < audit.chain.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 italic">
                    <strong className="text-slate-300 not-italic">Verdict: </strong>
                    {audit.reason}
                  </div>
                </div>

                {/* Quick Toggle Controls */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">{audit.actionCode}</span>
                  <div className="flex items-center gap-2">
                    {audit.allowed ? (
                      <button
                        type="button"
                        onClick={() => handleQuickToggleCapability(audit, false)}
                        className="px-3 py-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>BLOCK NOW</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickToggleCapability(audit, true)}
                        className="px-3 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ALLOW NOW</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Permission Trace Simulator Box */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <span>Interactive Permission Trace Simulator</span>
            </h4>
            <p className="text-xs text-slate-400">
              Simulate any action code, route name, or function to view step-by-step evaluation logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={customTestKey}
            onChange={(e) => setCustomTestKey(e.target.value)}
            placeholder="Enter action code (e.g. act_delete_sale, act_edit_sale, /billing)..."
            className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />

          {/* Quick preset buttons */}
          {(['act_delete_sale', 'act_edit_sale', 'act_view_cost', 'route_billing'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setCustomTestKey(preset);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-all"
            >
              {preset}
            </button>
          ))}

          <button
            type="button"
            onClick={handleRunCustomTest}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Trace Execution</span>
          </button>
        </div>

        {testTraceLog && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-purple-300">{testTraceLog.key}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  testTraceLog.allowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {testTraceLog.allowed ? 'FINAL VERDICT: ALLOWED' : 'FINAL VERDICT: BLOCKED'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 italic">{testTraceLog.reason}</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              {testTraceLog.steps.map((st, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {st.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                  {st.status === 'fail' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                  {st.status === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-[11px]">{st.step}</div>
                    <div className="text-slate-400 text-[11px] font-mono">{st.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complete 173-Feature Effective Permissions Log Table */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Full 173-Feature Effective Permission Log Table</span>
            </h4>
            <p className="text-xs text-slate-400">
              Searchable real-time evaluation logs showing how every toggle cascades into final user permissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">
              Showing {filteredItems.length} of {all173Items.length} items
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, title, module, or reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(['all', 'blocked', 'allowed', 'actions', 'functions'] as const).map(ft => (
              <button
                key={ft}
                type="button"
                onClick={() => setFilterType(ft)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap cursor-pointer ${
                  filterType === ft
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tier & Code</th>
                  <th className="py-3 px-4">Feature Name & Path</th>
                  <th className="py-3 px-4 text-center">Stored Toggle</th>
                  <th className="py-3 px-4 text-center">Effective State</th>
                  <th className="py-3 px-4">Decision Reason & Chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                      No items matched your search query or filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            item.type === 'action' ? 'bg-purple-500/20 text-purple-300' :
                            item.type === 'function' ? 'bg-blue-500/20 text-blue-300' :
                            item.type === 'submenu' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-white font-bold">{item.code}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4">
                        <div className="font-bold text-white text-xs">{item.title}</div>
                        <div className="text-[10px] text-slate-400">{item.parentLabel}</div>
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.storedVal ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}>
                          {item.storedVal ? 'ON' : 'OFF'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.allowed 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.allowed ? 'ALLOWED' : 'BLOCKED'}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-[11px] text-slate-400">
                        {item.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
