import React, { useState, useEffect } from 'react';
import {
  SYSTEM_MENU_TREE,
  MenuItemDefinition,
  SubmenuItemDefinition,
  FunctionItemDefinition,
  ActionItemDefinition,
  UserAccessControlProfile,
  getUserAccessControlProfile,
  saveUserAccessControlProfile,
  resetUserToPlanDefaults,
  resetUserToRoleDefaults,
  getPlanDefaultToggles,
  getRoleDefaultToggles,
  evaluatePermission
} from '../../lib/userAccessControl';
import { MasterActiveUser, getMasterAuditLogs, MasterAuditLog } from '../../lib/masterServerService';
import { getPrivateTabShortcutKey, setPrivateTabShortcutKey } from '../../lib/shortcutsManager';
import {
  Sliders,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  Check,
  Zap,
  Info,
  History,
  Keyboard
} from 'lucide-react';

interface MasterGranularUserControlProps {
  user: MasterActiveUser;
  onClose: () => void;
  onPreviewUser?: (user: MasterActiveUser) => void;
  showToast: (msg: string) => void;
}

export const MasterGranularUserControl: React.FC<MasterGranularUserControlProps> = ({
  user,
  onClose,
  onPreviewUser,
  showToast
}) => {
  const [profile, setProfile] = useState<UserAccessControlProfile>(() => {
    return getUserAccessControlProfile(
      user.id,
      user.role as any,
      (user as any).plan || 'Standard POS',
      user.installationId || user.storeName,
      (user as any).firmId || 'firm-main'
    );
  });

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<'matrix' | 'hierarchy_test' | 'audit_log'>('matrix');
  const [isSaved, setIsSaved] = useState(true);
  const [testResult, setTestResult] = useState<{ checked: boolean; path: string; allowed: boolean; reason: string } | null>(null);
  const [userShortcutKey, setUserShortcutKey] = useState<string>(() => getPrivateTabShortcutKey(user.id));

  // Initialize with the first menu expanded
  useEffect(() => {
    if (SYSTEM_MENU_TREE.length > 0) {
      setExpandedMenus({ [SYSTEM_MENU_TREE[0].id]: true, sale: true, items: true });
    }
  }, []);

  const toggleMenuExpand = (menuId: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const toggleSubmenuExpand = (submenuId: string) => {
    setExpandedSubmenus(prev => ({ ...prev, [submenuId]: !prev[submenuId] }));
  };

  // Toggle Menu ON / OFF
  const handleToggleMenu = (menuId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextMenuToggles = { ...prev.menuToggles, [menuId]: newVal };
      const nextSubmenuToggles = { ...prev.submenuToggles };
      const nextFunctionToggles = { ...prev.functionToggles };
      const nextActionToggles = { ...prev.actionToggles };

      // Cascade down if turned OFF
      const menu = SYSTEM_MENU_TREE.find(m => m.id === menuId);
      if (menu) {
        menu.submenus.forEach(sub => {
          if (!newVal) {
            nextSubmenuToggles[sub.id] = false;
            sub.functions.forEach(fn => {
              nextFunctionToggles[fn.id] = false;
              fn.actions.forEach(act => {
                nextActionToggles[act.id] = false;
              });
            });
          } else {
            // When turning ON, enable sub items by default
            nextSubmenuToggles[sub.id] = true;
            sub.functions.forEach(fn => {
              nextFunctionToggles[fn.id] = true;
              fn.actions.forEach(act => {
                nextActionToggles[act.id] = true;
              });
            });
          }
        });
      }

      return {
        ...prev,
        isCustomOverrideActive: true,
        menuToggles: nextMenuToggles,
        submenuToggles: nextSubmenuToggles,
        functionToggles: nextFunctionToggles,
        actionToggles: nextActionToggles
      };
    });
    setIsSaved(false);
  };

  // Toggle Submenu ON / OFF
  const handleToggleSubmenu = (submenuId: string, currentVal: boolean, parentMenuId: string) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextSubmenuToggles = { ...prev.submenuToggles, [submenuId]: newVal };
      const nextFunctionToggles = { ...prev.functionToggles };
      const nextActionToggles = { ...prev.actionToggles };

      // If turning ON, ensure parent menu is ON
      const nextMenuToggles = { ...prev.menuToggles };
      if (newVal) {
        nextMenuToggles[parentMenuId] = true;
      }

      // Cascade down to functions and actions
      const menu = SYSTEM_MENU_TREE.find(m => m.id === parentMenuId);
      const sub = menu?.submenus.find(s => s.id === submenuId);
      if (sub) {
        sub.functions.forEach(fn => {
          nextFunctionToggles[fn.id] = newVal;
          fn.actions.forEach(act => {
            nextActionToggles[act.id] = newVal;
          });
        });
      }

      return {
        ...prev,
        isCustomOverrideActive: true,
        menuToggles: nextMenuToggles,
        submenuToggles: nextSubmenuToggles,
        functionToggles: nextFunctionToggles,
        actionToggles: nextActionToggles
      };
    });
    setIsSaved(false);
  };

  // Toggle Function ON / OFF
  const handleToggleFunction = (functionId: string, currentVal: boolean, parentSubmenuId: string, parentMenuId: string) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextFunctionToggles = { ...prev.functionToggles, [functionId]: newVal };
      const nextActionToggles = { ...prev.actionToggles };
      const nextSubmenuToggles = { ...prev.submenuToggles };
      const nextMenuToggles = { ...prev.menuToggles };

      if (newVal) {
        nextSubmenuToggles[parentSubmenuId] = true;
        nextMenuToggles[parentMenuId] = true;
      }

      // Cascade to actions
      const menu = SYSTEM_MENU_TREE.find(m => m.id === parentMenuId);
      const sub = menu?.submenus.find(s => s.id === parentSubmenuId);
      const fn = sub?.functions.find(f => f.id === functionId);
      if (fn) {
        fn.actions.forEach(act => {
          nextActionToggles[act.id] = newVal;
        });
      }

      return {
        ...prev,
        isCustomOverrideActive: true,
        menuToggles: nextMenuToggles,
        submenuToggles: nextSubmenuToggles,
        functionToggles: nextFunctionToggles,
        actionToggles: nextActionToggles
      };
    });
    setIsSaved(false);
  };

  // Toggle Action ON / OFF
  const handleToggleAction = (actionId: string, currentVal: boolean, parentFunctionId: string, parentSubmenuId: string, parentMenuId: string) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextActionToggles = { ...prev.actionToggles, [actionId]: newVal };
      const nextFunctionToggles = { ...prev.functionToggles };
      const nextSubmenuToggles = { ...prev.submenuToggles };
      const nextMenuToggles = { ...prev.menuToggles };

      if (newVal) {
        nextFunctionToggles[parentFunctionId] = true;
        nextSubmenuToggles[parentSubmenuId] = true;
        nextMenuToggles[parentMenuId] = true;
      }

      return {
        ...prev,
        isCustomOverrideActive: true,
        menuToggles: nextMenuToggles,
        submenuToggles: nextSubmenuToggles,
        functionToggles: nextFunctionToggles,
        actionToggles: nextActionToggles
      };
    });
    setIsSaved(false);
  };

  // Menu Ordering: Move Up / Down
  const handleMoveMenu = (menuId: string, direction: 'up' | 'down') => {
    setProfile(prev => {
      const currentOrder = [...(prev.menuOrder || SYSTEM_MENU_TREE.map(m => m.id))];
      const idx = currentOrder.indexOf(menuId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx > 0) {
        const temp = currentOrder[idx];
        currentOrder[idx] = currentOrder[idx - 1];
        currentOrder[idx - 1] = temp;
      } else if (direction === 'down' && idx < currentOrder.length - 1) {
        const temp = currentOrder[idx];
        currentOrder[idx] = currentOrder[idx + 1];
        currentOrder[idx + 1] = temp;
      }
      return { ...prev, menuOrder: currentOrder, isCustomOverrideActive: true };
    });
    setIsSaved(false);
  };

  // Submenu Ordering: Move Up / Down
  const handleMoveSubmenu = (menuId: string, submenuId: string, direction: 'up' | 'down') => {
    setProfile(prev => {
      const currentSubs = [...(prev.submenuOrder[menuId] || SYSTEM_MENU_TREE.find(m => m.id === menuId)?.submenus.map(s => s.id) || [])];
      const idx = currentSubs.indexOf(submenuId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx > 0) {
        const temp = currentSubs[idx];
        currentSubs[idx] = currentSubs[idx - 1];
        currentSubs[idx - 1] = temp;
      } else if (direction === 'down' && idx < currentSubs.length - 1) {
        const temp = currentSubs[idx];
        currentSubs[idx] = currentSubs[idx + 1];
        currentSubs[idx + 1] = temp;
      }
      return {
        ...prev,
        submenuOrder: { ...prev.submenuOrder, [menuId]: currentSubs },
        isCustomOverrideActive: true
      };
    });
    setIsSaved(false);
  };

  // Save changes
  const handleSave = () => {
    saveUserAccessControlProfile(profile, true, 'Master Admin');
    setPrivateTabShortcutKey(userShortcutKey, user.id);
    setIsSaved(true);
    showToast(`Access Control profile & Private Tab Key saved for "${user.name}".`);
  };

  // Reset to Plan Defaults
  const handleResetToPlan = () => {
    if (window.confirm(`Reset all permissions for "${user.name}" to their Plan defaults (${(user as any).plan || 'Standard POS'})?`)) {
      const reset = resetUserToPlanDefaults(user.id, (user as any).plan || 'Standard POS', user.role as any, user.installationId, user.name, (user as any).firmId || 'firm-main');
      setProfile(reset);
      setIsSaved(true);
      showToast(`User permissions reset to ${(user as any).plan || 'Standard POS'} defaults.`);
    }
  };

  // Reset to Role Defaults
  const handleResetToRole = () => {
    if (window.confirm(`Reset all permissions for "${user.name}" to standard ${user.role} role defaults?`)) {
      const reset = resetUserToRoleDefaults(user.id, user.role as any, (user as any).plan || 'Standard POS', user.installationId, user.name, (user as any).firmId || 'firm-main');
      setProfile(reset);
      setIsSaved(true);
      showToast(`User permissions reset to standard ${user.role} role defaults.`);
    }
  };

  // Quick Preset Cashier Test (Turn POS/Sale ON, Purchases/Reports OFF)
  const handleApplyCashierStrictPreset = () => {
    const roleDefaults = getRoleDefaultToggles('Cashier');
    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: { ...roleDefaults.menus },
      submenuToggles: { ...roleDefaults.submenus },
      functionToggles: { ...roleDefaults.functions },
      actionToggles: { ...roleDefaults.actions }
    }));
    setIsSaved(false);
    showToast(`Strict Cashier Preset applied (POS/Sales ON, Purchases/Reports/Settings OFF)`);
  };

  // Run Real-Time Hierarchy Test
  const handleRunHierarchyTest = (testPath: string) => {
    // Evaluate effective permission using hierarchy
    const menuMapping: Record<string, { menuId: string; submenuId?: string; functionId?: string }> = {
      '/sale/invoices': { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'createSale' },
      '/purchase': { menuId: 'purchase', submenuId: 'purchaseBills', functionId: 'createPurchase' },
      '/items': { menuId: 'items', submenuId: 'inventoryList', functionId: 'addEditItems' },
      '/reports': { menuId: 'reports', submenuId: 'financialReports', functionId: 'viewProfitLoss' },
      '/settings': { menuId: 'settings', submenuId: 'generalSettings', functionId: 'manageSettings' },
      '/expenses': { menuId: 'expenses', submenuId: 'expenseDirectory', functionId: 'manageExpenses' },
    };

    const target = menuMapping[testPath] || { menuId: 'dashboard' };
    const isMenuOn = profile.menuToggles[target.menuId] !== false;
    const isSubmenuOn = target.submenuId ? profile.submenuToggles[target.submenuId] !== false : true;
    const isFunctionOn = target.functionId ? profile.functionToggles[target.functionId] !== false : true;

    const allowed = isMenuOn && isSubmenuOn && isFunctionOn;
    let reason = 'Authorized by Master Policy';
    if (!isMenuOn) reason = `Parent Menu [${target.menuId}] is turned OFF`;
    else if (!isSubmenuOn) reason = `Submenu [${target.submenuId}] is turned OFF`;
    else if (!isFunctionOn) reason = `Function [${target.functionId}] is turned OFF`;

    setTestResult({
      checked: true,
      path: testPath,
      allowed,
      reason
    });
  };

  // Get sorted menus
  const sortedMenus = [...SYSTEM_MENU_TREE].sort((a, b) => {
    const orderList = profile.menuOrder || SYSTEM_MENU_TREE.map(m => m.id);
    const idxA = orderList.indexOf(a.id);
    const idxB = orderList.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.order - b.order;
  });

  // Calculate stats
  const totalMenus = SYSTEM_MENU_TREE.length;
  const enabledMenus = Object.values(profile.menuToggles).filter(Boolean).length;
  const totalFunctions = SYSTEM_MENU_TREE.flatMap(m => m.submenus.flatMap(s => s.functions)).length;
  const enabledFunctions = Object.values(profile.functionToggles).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border-2 border-indigo-500/60 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white">{user.name}</h3>
                <span className="text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/40 px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                  {user.role}
                </span>
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-600/40 px-2 py-0.5 rounded-full font-bold">
                  {(user as any).plan || 'Standard POS'}
                </span>
                {profile.isCustomOverrideActive ? (
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-600/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Custom Override Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                    Standard Defaults
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {user.storeName} • {user.emailOrPhone} • Hierarchy: <span className="font-mono text-indigo-300 font-bold">PLAN → ROLE → USER → FIRM → MENU → SUBMENU → ACTION</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSaved && (
              <span className="text-xs text-amber-400 font-bold animate-pulse flex items-center gap-1 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-600/50">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Unsaved Changes</span>
              </span>
            )}

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply</span>
            </button>

            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Toolbar & Presets */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('matrix')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'matrix' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Granular Matrix ({enabledMenus}/{totalMenus} Menus • {enabledFunctions}/{totalFunctions} Functions ON)</span>
            </button>

            <button
              onClick={() => setActiveView('hierarchy_test')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'hierarchy_test' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Live Hierarchy Tester</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Presets */}
            <button
              onClick={handleApplyCashierStrictPreset}
              className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-600/50 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Quickly turn ON POS/Sales/Customers and turn OFF Purchases/Reports/Settings"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Cashier Preset</span>
            </button>

            <button
              onClick={handleResetToRole}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Role Defaults</span>
            </button>

            <button
              onClick={handleResetToPlan}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Plan Defaults</span>
            </button>

            {onPreviewUser && (
              <button
                onClick={() => onPreviewUser(user)}
                className="px-3 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-600/60 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>Preview User Access</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* User Private Tab Shortcut Key Override Card */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-indigo-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>User Private Transaction Shortcut Key</span>
                  <span className="text-[10px] text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                    Default: Alt + P
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Custom key combination to open/toggle private tab for this specific user.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userShortcutKey}
                onChange={(e) => {
                  setUserShortcutKey(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="e.g. Alt + P or Alt + K"
                className="w-32 px-3 py-1.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-xs font-mono font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => {
                  setUserShortcutKey('Alt + P');
                  setIsSaved(false);
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-xl"
                title="Reset to Alt + P default"
              >
                Reset Default
              </button>
            </div>
          </div>

          {/* User-Tenant-Firm Intersection & Flattened Effective Permissions Status Card */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-emerald-500/40 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black font-mono text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{(profile.tenantId || user.installationId || 'tenant-main')} : {(profile.firmId || (user as any).firmId || 'firm-main')} : {(profile.userId || user.id)}</span>
              </span>
              <span className="text-slate-300 text-[11.5px] font-medium">
                Intersection Storage &bull; Flattened Map O(1) Active
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold text-[10.5px] flex items-center gap-1 shadow-xs">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>173 Features &bull; Resolved Effective Map Ready</span>
              </span>
            </div>
          </div>
          
          {/* VIEW 1: GRANULAR MATRIX (Menu -> Submenu -> Function -> Action) */}
          {activeView === 'matrix' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>
                    Control exact ON/OFF switches and custom ordering for <strong>{user.name}</strong>. The most restrictive rule in the hierarchy applies automatically.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ON
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> OFF
                  </span>
                </div>
              </div>

              {/* Menus List */}
              <div className="space-y-3">
                {sortedMenus.map((menu, menuIndex) => {
                  const isMenuOn = profile.menuToggles[menu.id] !== false;
                  const isExpanded = !!expandedMenus[menu.id];
                  const sortedSubmenus = [...menu.submenus].sort((a, b) => {
                    const subOrder = profile.submenuOrder[menu.id] || menu.submenus.map(s => s.id);
                    const idxA = subOrder.indexOf(a.id);
                    const idxB = subOrder.indexOf(b.id);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    return a.order - b.order;
                  });

                  return (
                    <div
                      key={menu.id}
                      className={`border rounded-2xl transition-all overflow-hidden ${
                        isMenuOn 
                          ? 'bg-slate-950/60 border-slate-800' 
                          : 'bg-slate-950/30 border-rose-950/50 opacity-75'
                      }`}
                    >
                      {/* Menu Bar */}
                      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${
                        isMenuOn ? 'bg-slate-900/90' : 'bg-rose-950/20'
                      }`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleMenuExpand(menu.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                              #{menuIndex + 1}
                            </span>
                            <span className="font-bold text-sm text-white truncate">{menu.label}</span>
                            <span className="text-[10px] font-mono text-slate-500">({menu.submenus.length} submenus)</span>
                          </div>
                        </div>

                        {/* Menu Controls: Move Up/Down & Toggle Switch */}
                        <div className="flex items-center gap-2">
                          {/* Order Buttons */}
                          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                            <button
                              onClick={() => handleMoveMenu(menu.id, 'up')}
                              disabled={menuIndex === 0}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Menu Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveMenu(menu.id, 'down')}
                              disabled={menuIndex === sortedMenus.length - 1}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="Move Menu Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Master Switch */}
                          <button
                            onClick={() => handleToggleMenu(menu.id, isMenuOn)}
                            className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              isMenuOn
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900'
                                : 'bg-rose-950/80 text-rose-300 border-rose-600/60 hover:bg-rose-900'
                            }`}
                          >
                            {isMenuOn ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            <span>MENU {isMenuOn ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Submenus & Functions Tree */}
                      {isExpanded && (
                        <div className="p-4 space-y-3 bg-slate-950/40 border-t border-slate-800">
                          {sortedSubmenus.map((sub, subIndex) => {
                            const isSubOn = isMenuOn && (profile.submenuToggles[sub.id] !== false);
                            const isSubExpanded = expandedSubmenus[sub.id] !== false; // Default expanded

                            return (
                              <div
                                key={sub.id}
                                className={`rounded-xl border transition-all ${
                                  isSubOn 
                                    ? 'bg-slate-900/60 border-slate-800' 
                                    : 'bg-rose-950/10 border-rose-950/40 opacity-70'
                                }`}
                              >
                                {/* Submenu Header */}
                                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleSubmenuExpand(sub.id)}
                                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                                    >
                                      {isSubExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                    <span className="text-[10px] font-mono text-slate-500">Submenu:</span>
                                    <span className="font-bold text-xs text-slate-200">{sub.label}</span>
                                    <span className="text-[10px] font-mono text-indigo-400">{sub.path}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Submenu Order Controls */}
                                    <div className="flex items-center bg-slate-800 rounded p-0.5">
                                      <button
                                        onClick={() => handleMoveSubmenu(menu.id, sub.id, 'up')}
                                        disabled={subIndex === 0}
                                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleMoveSubmenu(menu.id, sub.id, 'down')}
                                        disabled={subIndex === sortedSubmenus.length - 1}
                                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Submenu Toggle */}
                                    <button
                                      onClick={() => handleToggleSubmenu(sub.id, isSubOn, menu.id)}
                                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                        isSubOn
                                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900'
                                          : 'bg-rose-950/70 text-rose-300 border-rose-600/40 hover:bg-rose-900'
                                      }`}
                                    >
                                      <span>SUBMENU {isSubOn ? 'ON' : 'OFF'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Functions & Actions */}
                                {isSubExpanded && (
                                  <div className="p-3 space-y-2.5">
                                    {sub.functions.map(fn => {
                                      const isFnOn = isSubOn && (profile.functionToggles[fn.id] !== false);

                                      return (
                                        <div
                                          key={fn.id}
                                          className={`p-2.5 rounded-lg border transition-all ${
                                            isFnOn 
                                              ? 'bg-slate-950/80 border-slate-800' 
                                              : 'bg-rose-950/20 border-rose-900/30 opacity-60'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">{fn.label}</span>
                                                <span className="text-[9px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-400">
                                                  ID: {fn.id}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 mt-0.5">{fn.description}</p>
                                            </div>

                                            <button
                                              onClick={() => handleToggleFunction(fn.id, isFnOn, sub.id, menu.id)}
                                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                                                isFnOn
                                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                                                  : 'bg-rose-950 text-rose-300 border-rose-500/50'
                                              }`}
                                            >
                                              FUNCTION {isFnOn ? 'ON' : 'OFF'}
                                            </button>
                                          </div>

                                          {/* Actions list */}
                                          {fn.actions.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
                                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Actions:</span>
                                              {fn.actions.map(act => {
                                                const isActOn = isFnOn && (profile.actionToggles[act.id] !== false);

                                                return (
                                                  <button
                                                    key={act.id}
                                                    onClick={() => handleToggleAction(act.id, isActOn, fn.id, sub.id, menu.id)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer border transition-all ${
                                                      isActOn
                                                        ? 'bg-indigo-950/80 text-indigo-200 border-indigo-500/40 hover:bg-indigo-900'
                                                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                                                    }`}
                                                  >
                                                    {isActOn ? <Check className="w-2.5 h-2.5 text-indigo-400" /> : <Lock className="w-2.5 h-2.5 text-slate-600" />}
                                                    <span>{act.label}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: HIERARCHY TESTER & VALIDATION */}
          {activeView === 'hierarchy_test' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Real-Time Hierarchy Permission Validator</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test how the system's strict permission hierarchy evaluates access for <strong>{user.name}</strong> across various system routes and actions:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                  {[
                    { label: 'Sale Invoices & POS', path: '/sale/invoices' },
                    { label: 'Purchases & Bills', path: '/purchase' },
                    { label: 'Items & Catalog', path: '/items' },
                    { label: 'Financial & P&L Reports', path: '/reports' },
                    { label: 'Expenses Directory', path: '/expenses' },
                    { label: 'System Settings', path: '/settings' },
                  ].map(t => (
                    <button
                      key={t.path}
                      onClick={() => handleRunHierarchyTest(t.path)}
                      className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer"
                    >
                      <div className="font-bold text-xs text-white">{t.label}</div>
                      <div className="text-[10px] font-mono text-indigo-400">{t.path}</div>
                    </button>
                  ))}
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div className={`mt-4 p-4 rounded-2xl border ${
                    testResult.allowed 
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                      : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 font-black text-sm">
                      {testResult.allowed ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
                      <span>RESULT: Route [{testResult.path}] is {testResult.allowed ? 'AUTHORIZED (ACCESS GRANTED)' : 'BLOCKED (ACCESS DENIED)'}</span>
                    </div>
                    <p className="text-xs mt-1.5 opacity-90">
                      Evaluated Policy: {testResult.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Last Modified: {new Date(profile.updatedAt).toLocaleString()}</span>
            {profile.updatedBy && <span>• By: {profile.updatedBy}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-md shadow-emerald-600/30"
            >
              Save Changes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
