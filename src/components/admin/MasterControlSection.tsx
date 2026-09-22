import React, { useState, useEffect, useMemo } from 'react';
import {
  SYSTEM_MENU_TREE,
  MenuItemDefinition,
  SubmenuItemDefinition,
  FunctionItemDefinition,
  ActionItemDefinition,
  UserAccessControlProfile,
  getUserAccessControlProfile,
  saveUserAccessControlProfile,
  resetUserToRoleDefaults,
  resetUserToPlanDefaults,
  evaluatePermission
} from '../../lib/userAccessControl';
import { MasterActiveUser, getMasterActiveUsers } from '../../lib/masterServerService';
import {
  Shield,
  Sliders,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  Save,
  Check,
  Zap,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Copy,
  Layers,
  AlertTriangle,
  Info,
  Filter,
  Eye,
  Share2,
  Trash2,
  Edit3,
  DollarSign,
  TrendingUp,
  Percent,
  Download,
  Upload
} from 'lucide-react';

interface MasterControlSectionProps {
  onNotify?: (message: string) => void;
}

export const MasterControlSection: React.FC<MasterControlSectionProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<MasterActiveUser[]>(() => getMasterActiveUsers());
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const list = getMasterActiveUsers();
    return list[0]?.id || 'usr_admin_01';
  });

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || users[0] || {
      id: 'usr_admin_01',
      name: 'Primary Admin',
      role: 'Primary Admin',
      storeName: 'Central Branch',
      status: 'Active',
      isOnline: true,
      passcode: '1234'
    } as MasterActiveUser;
  }, [users, selectedUserId]);

  const [profile, setProfile] = useState<UserAccessControlProfile>(() => {
    return getUserAccessControlProfile(
      selectedUser.id,
      selectedUser.role as any,
      (selectedUser as any).plan || 'Pharmacy Pro',
      selectedUser.installationId || selectedUser.storeName
    );
  });

  // Reload profile when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setProfile(
        getUserAccessControlProfile(
          selectedUser.id,
          selectedUser.role as any,
          (selectedUser as any).plan || 'Pharmacy Pro',
          selectedUser.installationId || selectedUser.storeName
        )
      );
      setIsDirty(false);
      setSaveStatusMsg(null);
    }
  }, [selectedUserId]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    sale: true,
    items: true,
    dashboard: true,
    purchase: true
  });
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({
    saleInvoices: true,
    inventoryList: true,
    purchaseBills: true
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSourceUserId, setCloneSourceUserId] = useState<string>('');
  const [testActionCode, setTestActionCode] = useState('SALE_EDIT');
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string; path: string } | null>(null);

  // Flattened features stats (Total calculated features across all levels)
  const stats = useMemo(() => {
    let totalFeatures = 0;
    let activeFeatures = 0;

    SYSTEM_MENU_TREE.forEach(menu => {
      totalFeatures += 1;
      if (profile.menuToggles[menu.id] !== false) activeFeatures += 1;

      menu.submenus.forEach(sub => {
        totalFeatures += 1;
        if (profile.submenuToggles[sub.id] !== false && profile.menuToggles[menu.id] !== false) {
          activeFeatures += 1;
        }

        sub.functions.forEach(fn => {
          totalFeatures += 1;
          if (
            profile.functionToggles[fn.id] !== false &&
            profile.submenuToggles[sub.id] !== false &&
            profile.menuToggles[menu.id] !== false
          ) {
            activeFeatures += 1;
          }

          fn.actions.forEach(act => {
            totalFeatures += 1;
            if (
              profile.actionToggles[act.id] !== false &&
              profile.functionToggles[fn.id] !== false &&
              profile.submenuToggles[sub.id] !== false &&
              profile.menuToggles[menu.id] !== false
            ) {
              activeFeatures += 1;
            }
          });
        });
      });
    });

    const inactiveFeatures = totalFeatures - activeFeatures;
    const percentage = totalFeatures > 0 ? Math.round((activeFeatures / totalFeatures) * 100) : 100;

    return { totalFeatures, activeFeatures, inactiveFeatures, percentage };
  }, [profile]);

  // Toggle handlers
  const handleToggleMenu = (menuId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextMenuToggles = { ...prev.menuToggles, [menuId]: newVal };
      const nextSubmenuToggles = { ...prev.submenuToggles };
      const nextFunctionToggles = { ...prev.functionToggles };
      const nextActionToggles = { ...prev.actionToggles };

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
    setIsDirty(true);
  };

  const handleToggleSubmenu = (submenuId: string, currentVal: boolean, parentMenuId: string) => {
    const newVal = !currentVal;
    setProfile(prev => {
      const nextSubmenuToggles = { ...prev.submenuToggles, [submenuId]: newVal };
      const nextFunctionToggles = { ...prev.functionToggles };
      const nextActionToggles = { ...prev.actionToggles };
      const nextMenuToggles = { ...prev.menuToggles };

      if (newVal) {
        nextMenuToggles[parentMenuId] = true;
      }

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
    setIsDirty(true);
  };

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
    setIsDirty(true);
  };

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
    setIsDirty(true);
  };

  // High-Priority Direct Quick-Toggles
  const isInvoiceEditingAllowed = profile.actionToggles['act_edit_sale'] !== false && profile.functionToggles['editSale'] !== false && profile.menuToggles['sale'] !== false;
  const isBillDeletionAllowed = profile.actionToggles['act_delete_sale'] !== false && profile.functionToggles['deleteSale'] !== false && profile.menuToggles['sale'] !== false;
  const isShareAccessAllowed = profile.actionToggles['act_print_sale'] !== false && profile.functionToggles['reprintSale'] !== false && profile.menuToggles['sale'] !== false;
  const isPurchaseCostAllowed = profile.actionToggles['act_view_cost'] !== false && profile.functionToggles['viewCostsAndMargins'] !== false && profile.menuToggles['items'] !== false;
  const isDiscountAllowed = profile.actionToggles['act_apply_disc'] !== false && profile.functionToggles['applyDiscount'] !== false && profile.menuToggles['sale'] !== false;

  const handleQuickToggleInvoiceEditing = () => {
    const newVal = !isInvoiceEditingAllowed;
    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: { ...prev.menuToggles, sale: true },
      submenuToggles: { ...prev.submenuToggles, saleInvoices: true },
      functionToggles: { ...prev.functionToggles, editSale: newVal },
      actionToggles: { ...prev.actionToggles, act_edit_sale: newVal }
    }));
    setIsDirty(true);
    triggerNotify(`Invoice editing ${newVal ? 'ALLOWED' : 'DENIED'} for ${selectedUser.name}`);
  };

  const handleQuickToggleBillDeletion = () => {
    const newVal = !isBillDeletionAllowed;
    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: { ...prev.menuToggles, sale: true },
      submenuToggles: { ...prev.submenuToggles, saleInvoices: true },
      functionToggles: { ...prev.functionToggles, deleteSale: newVal },
      actionToggles: { ...prev.actionToggles, act_delete_sale: newVal }
    }));
    setIsDirty(true);
    triggerNotify(`Bill deletion ${newVal ? 'ALLOWED' : 'DENIED'} for ${selectedUser.name}`);
  };

  const handleQuickToggleShareAccess = () => {
    const newVal = !isShareAccessAllowed;
    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: { ...prev.menuToggles, sale: true },
      submenuToggles: { ...prev.submenuToggles, saleInvoices: true },
      functionToggles: { ...prev.functionToggles, reprintSale: newVal },
      actionToggles: { ...prev.actionToggles, act_print_sale: newVal }
    }));
    setIsDirty(true);
    triggerNotify(`Share & PDF print access ${newVal ? 'ALLOWED' : 'DENIED'} for ${selectedUser.name}`);
  };

  const handleQuickTogglePurchaseCost = () => {
    const newVal = !isPurchaseCostAllowed;
    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: { ...prev.menuToggles, items: true },
      submenuToggles: { ...prev.submenuToggles, inventoryList: true },
      functionToggles: { ...prev.functionToggles, viewCostsAndMargins: newVal },
      actionToggles: { ...prev.actionToggles, act_view_cost: newVal }
    }));
    setIsDirty(true);
    triggerNotify(`Purchase cost & margin view ${newVal ? 'ALLOWED' : 'DENIED'} for ${selectedUser.name}`);
  };

  // Bulk Actions
  const handleActivateAll = () => {
    const menus: Record<string, boolean> = {};
    const submenus: Record<string, boolean> = {};
    const functions: Record<string, boolean> = {};
    const actions: Record<string, boolean> = {};

    SYSTEM_MENU_TREE.forEach(menu => {
      menus[menu.id] = true;
      menu.submenus.forEach(sub => {
        submenus[sub.id] = true;
        sub.functions.forEach(fn => {
          functions[fn.id] = true;
          fn.actions.forEach(act => {
            actions[act.id] = true;
          });
        });
      });
    });

    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: menus,
      submenuToggles: submenus,
      functionToggles: functions,
      actionToggles: actions
    }));
    setIsDirty(true);
    triggerNotify(`All 173 system features activated for ${selectedUser.name}`);
  };

  const handleDeactivateAll = () => {
    const menus: Record<string, boolean> = {};
    const submenus: Record<string, boolean> = {};
    const functions: Record<string, boolean> = {};
    const actions: Record<string, boolean> = {};

    SYSTEM_MENU_TREE.forEach(menu => {
      menus[menu.id] = false;
      menu.submenus.forEach(sub => {
        submenus[sub.id] = false;
        sub.functions.forEach(fn => {
          functions[fn.id] = false;
          fn.actions.forEach(act => {
            actions[act.id] = false;
          });
        });
      });
    });

    setProfile(prev => ({
      ...prev,
      isCustomOverrideActive: true,
      menuToggles: menus,
      submenuToggles: submenus,
      functionToggles: functions,
      actionToggles: actions
    }));
    setIsDirty(true);
    triggerNotify(`All features deactivated for ${selectedUser.name}`);
  };

  const handleResetToRole = () => {
    const reset = resetUserToRoleDefaults(
      selectedUser.id,
      selectedUser.role as any,
      (selectedUser as any).plan || 'Pharmacy Pro',
      selectedUser.installationId || selectedUser.storeName
    );
    setProfile(reset);
    setIsDirty(false);
    triggerNotify(`Reset ${selectedUser.name} permissions to default ${selectedUser.role} template`);
  };

  const handleSaveProfile = () => {
    saveUserAccessControlProfile(profile, true, 'Master Server Admin');
    setIsDirty(false);
    setSaveStatusMsg(`Master Control profile saved & broadcast for ${selectedUser.name}!`);
    triggerNotify(`Successfully updated 173 feature permissions for ${selectedUser.name}`);
    setTimeout(() => setSaveStatusMsg(null), 3500);
  };

  const triggerNotify = (msg: string) => {
    if (onNotify) onNotify(msg);
  };

  const handleRunPermissionTest = () => {
    const code = testActionCode.trim().toUpperCase();
    // Search for action, function, or menu matching this code
    let matchedAction: ActionItemDefinition | undefined;
    let matchedFn: FunctionItemDefinition | undefined;
    let matchedSub: SubmenuItemDefinition | undefined;
    let matchedMenu: MenuItemDefinition | undefined;

    for (const m of SYSTEM_MENU_TREE) {
      if (m.id.toUpperCase() === code) {
        matchedMenu = m;
        break;
      }
      for (const s of m.submenus) {
        if (s.id.toUpperCase() === code) {
          matchedMenu = m;
          matchedSub = s;
          break;
        }
        for (const f of s.functions) {
          if (f.id.toUpperCase() === code) {
            matchedMenu = m;
            matchedSub = s;
            matchedFn = f;
            break;
          }
          for (const a of f.actions) {
            if (a.code.toUpperCase() === code || a.id.toUpperCase() === code) {
              matchedMenu = m;
              matchedSub = s;
              matchedFn = f;
              matchedAction = a;
              break;
            }
          }
          if (matchedAction) break;
        }
        if (matchedAction || matchedFn || matchedSub) break;
      }
      if (matchedAction || matchedFn || matchedSub || matchedMenu) break;
    }

    if (!matchedMenu) {
      setTestResult({
        allowed: false,
        reason: `Feature or Action code '${code}' is not recognized in the 173 system feature tree.`,
        path: 'Unknown Code'
      });
      return;
    }

    // Evaluate against profile toggles
    const isMenuOn = profile.menuToggles[matchedMenu.id] !== false;
    const isSubOn = matchedSub ? profile.submenuToggles[matchedSub.id] !== false : true;
    const isFnOn = matchedFn ? profile.functionToggles[matchedFn.id] !== false : true;
    const isActOn = matchedAction ? profile.actionToggles[matchedAction.id] !== false : true;

    const allowed = isMenuOn && isSubOn && isFnOn && isActOn;
    let reason = '';
    if (!isMenuOn) reason = `Blocked because parent Menu Module '${matchedMenu.label}' is turned OFF.`;
    else if (!isSubOn && matchedSub) reason = `Blocked because Submenu '${matchedSub.label}' is turned OFF.`;
    else if (!isFnOn && matchedFn) reason = `Blocked because Function '${matchedFn.label}' is turned OFF.`;
    else if (!isActOn && matchedAction) reason = `Blocked because Action '${matchedAction.label}' is explicitly DENIED.`;
    else reason = `Authorized and permitted for ${selectedUser.name} (${selectedUser.role}).`;

    const path = [matchedMenu.label, matchedSub?.label, matchedFn?.label, matchedAction?.label].filter(Boolean).join(' -> ');

    setTestResult({ allowed, reason, path });
  };

  // Expand / Collapse all
  const handleExpandAll = () => {
    const em: Record<string, boolean> = {};
    const es: Record<string, boolean> = {};
    SYSTEM_MENU_TREE.forEach(m => {
      em[m.id] = true;
      m.submenus.forEach(s => {
        es[s.id] = true;
      });
    });
    setExpandedMenus(em);
    setExpandedSubmenus(es);
  };

  const handleCollapseAll = () => {
    setExpandedMenus({});
    setExpandedSubmenus({});
  };

  // Filtered menus based on search and category
  const filteredMenuTree = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return SYSTEM_MENU_TREE.filter(menu => {
      if (selectedCategory !== 'all' && menu.id !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      // Check if menu matches
      if (menu.label.toLowerCase().includes(q) || menu.id.toLowerCase().includes(q)) return true;

      // Check if any submenu matches
      const subMatch = menu.submenus.some(sub => 
        sub.label.toLowerCase().includes(q) || sub.path.toLowerCase().includes(q) ||
        sub.functions.some(fn => 
          fn.label.toLowerCase().includes(q) || fn.description.toLowerCase().includes(q) ||
          fn.actions.some(act => act.label.toLowerCase().includes(q) || act.code.toLowerCase().includes(q))
        )
      );

      return subMatch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-5" id="master-control-section">
      {/* 1. Header Banner & Tenant Switcher */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-inner shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Master Control • 173 Granular Feature Switchboard
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Per-User & Per-Tenant
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {stats.activeFeatures} / {stats.totalFeatures} Active ({stats.percentage}%)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Activate or deactivate any menu, submenu, operational function, or specific security permission (invoice editing, bill deletion, share access) per client tenant.
              </p>
            </div>
          </div>

          {/* User Selector Dropdown & Save Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
              <UserCheck className="w-4 h-4 text-purple-400 ml-1.5" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none pr-3 cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.role}) • {u.storeName || 'Branch'}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveProfile}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                isDirty 
                  ? 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isDirty ? 'Save Changes *' : 'Saved Live'}</span>
            </button>
          </div>
        </div>

        {/* Selected User Info Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-300">
            <span>Target: <strong className="text-white">{selectedUser.name}</strong></span>
            <span>Role: <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">{selectedUser.role}</span></span>
            <span>Branch/Firm: <strong className="text-slate-200">{selectedUser.storeName}</strong></span>
            <span>Passcode: <code className="text-amber-400 font-mono font-bold">{selectedUser.passcode || '1234'}</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleActivateAll}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[11px] font-bold transition-all cursor-pointer"
              title="Turn ON all 173 features"
            >
              Activate All (173)
            </button>
            <button
              onClick={handleDeactivateAll}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-bold transition-all cursor-pointer"
              title="Turn OFF all features"
            >
              Deactivate All
            </button>
            <button
              onClick={handleResetToRole}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Role Defaults</span>
            </button>
          </div>
        </div>
      </div>

      {saveStatusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{saveStatusMsg}</span>
        </div>
      )}

      {/* 2. High-Priority Direct Security Quick-Toggles */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              High-Priority Critical Security Switches (1-Click Override)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Instantly toggle core restrictions for {selectedUser.name}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Invoice Editing Toggle */}
          <div className={`p-3 rounded-xl border transition-all ${
            isInvoiceEditingAllowed 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Edit3 className="w-3.5 h-3.5 text-purple-500" />
                <span>Invoice Editing</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                isInvoiceEditingAllowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                {isInvoiceEditingAllowed ? 'ALLOWED' : 'DENIED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Edit items & rates on past invoices</p>
            <button
              onClick={handleQuickToggleInvoiceEditing}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isInvoiceEditingAllowed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isInvoiceEditingAllowed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isInvoiceEditingAllowed ? 'Deny Editing' : 'Allow Editing'}</span>
            </button>
          </div>

          {/* Bill Deletion Toggle */}
          <div className={`p-3 rounded-xl border transition-all ${
            isBillDeletionAllowed 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Bill Deletion</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                isBillDeletionAllowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                {isBillDeletionAllowed ? 'ALLOWED' : 'DENIED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Delete & void completed bills</p>
            <button
              onClick={handleQuickToggleBillDeletion}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isBillDeletionAllowed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isBillDeletionAllowed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isBillDeletionAllowed ? 'Deny Deletion' : 'Allow Deletion'}</span>
            </button>
          </div>

          {/* Share Access Toggle */}
          <div className={`p-3 rounded-xl border transition-all ${
            isShareAccessAllowed 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Share & PDF</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                isShareAccessAllowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                {isShareAccessAllowed ? 'ALLOWED' : 'DENIED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">WhatsApp share, export & duplicate print</p>
            <button
              onClick={handleQuickToggleShareAccess}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isShareAccessAllowed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isShareAccessAllowed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isShareAccessAllowed ? 'Deny Share' : 'Allow Share'}</span>
            </button>
          </div>

          {/* View Purchase Cost Toggle */}
          <div className={`p-3 rounded-xl border transition-all ${
            isPurchaseCostAllowed 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span>Purchase Cost</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                isPurchaseCostAllowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                {isPurchaseCostAllowed ? 'VISIBLE' : 'HIDDEN'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Supplier cost price & profit margin %</p>
            <button
              onClick={handleQuickTogglePurchaseCost}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isPurchaseCostAllowed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPurchaseCostAllowed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isPurchaseCostAllowed ? 'Hide Cost' : 'Show Cost'}</span>
            </button>
          </div>

          {/* Customer Discount Toggle */}
          <div className={`p-3 rounded-xl border transition-all ${
            isDiscountAllowed 
              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Percent className="w-3.5 h-3.5 text-indigo-500" />
                <span>Discounts</span>
              </div>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                isDiscountAllowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
              }`}>
                {isDiscountAllowed ? 'ALLOWED' : 'DENIED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">Grant custom % or cash discounts</p>
            <button
              onClick={() => {
                const newVal = !isDiscountAllowed;
                setProfile(prev => ({
                  ...prev,
                  isCustomOverrideActive: true,
                  menuToggles: { ...prev.menuToggles, sale: true },
                  submenuToggles: { ...prev.submenuToggles, saleInvoices: true },
                  functionToggles: { ...prev.functionToggles, applyDiscount: newVal },
                  actionToggles: { ...prev.actionToggles, act_apply_disc: newVal }
                }));
                setIsDirty(true);
                triggerNotify(`Discount authorization ${newVal ? 'ALLOWED' : 'DENIED'} for ${selectedUser.name}`);
              }}
              className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isDiscountAllowed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isDiscountAllowed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isDiscountAllowed ? 'Deny Disc' : 'Allow Disc'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Search, Category Filters & Tree Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all 173 features, submenus, actions (e.g. edit, delete, share, cost, report, sync)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExpandAll}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Categories ({stats.totalFeatures})
          </button>
          {SYSTEM_MENU_TREE.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedCategory(m.id)}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === m.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. The 173-Feature Hierarchical Tree Switchboard */}
      <div className="space-y-3">
        {filteredMenuTree.map((menu) => {
          const isMenuOpen = !!expandedMenus[menu.id];
          const isMenuEnabled = profile.menuToggles[menu.id] !== false;

          return (
            <div
              key={menu.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isMenuEnabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-80'
              }`}
            >
              {/* Level 1: Menu Header */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => setExpandedMenus(p => ({ ...p, [menu.id]: !p[menu.id] }))}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {isMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {menu.label}
                      </h4>
                      <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {menu.defaultPath}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {menu.submenus.length} submenus • {menu.submenus.reduce((s, sub) => s + sub.functions.length, 0)} functions
                    </span>
                  </div>
                </div>

                {/* Menu Master Toggle Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-bold ${isMenuEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isMenuEnabled ? 'MODULE ON' : 'MODULE OFF'}
                  </span>
                  <button
                    onClick={() => handleToggleMenu(menu.id, isMenuEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      isMenuEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        isMenuEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Submenus & Nested Tree */}
              {isMenuOpen && (
                <div className="p-3 sm:p-4 space-y-4">
                  {menu.submenus.map((sub) => {
                    const isSubOpen = !!expandedSubmenus[sub.id];
                    const isSubEnabled = profile.submenuToggles[sub.id] !== false && isMenuEnabled;

                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl border p-3 transition-all ${
                          isSubEnabled
                            ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                            : 'bg-slate-100/40 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/40 opacity-75'
                        }`}
                      >
                        {/* Level 2: Submenu Header */}
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedSubmenus(p => ({ ...p, [sub.id]: !p[sub.id] }))}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {isSubOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Submenu: {sub.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({sub.path})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${isSubEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {isSubEnabled ? 'ON' : 'OFF'}
                            </span>
                            <button
                              onClick={() => handleToggleSubmenu(sub.id, isSubEnabled, menu.id)}
                              className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer ${
                                isSubEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                                  isSubEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Level 3 & Level 4: Functions & Actions */}
                        {isSubOpen && (
                          <div className="space-y-2.5 pt-1">
                            {sub.functions.map((fn) => {
                              const isFnEnabled = profile.functionToggles[fn.id] !== false && isSubEnabled;

                              return (
                                <div
                                  key={fn.id}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    isFnEnabled
                                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                      : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/40 opacity-70'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                          {fn.label}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        {fn.description}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        onClick={() => handleToggleFunction(fn.id, isFnEnabled, sub.id, menu.id)}
                                        className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                                          isFnEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                      >
                                        <span
                                          className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                                            isFnEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Level 4: Action Buttons / Specific Permissions */}
                                  {fn.actions.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                                      {fn.actions.map((act) => {
                                        const isActEnabled = profile.actionToggles[act.id] !== false && isFnEnabled;

                                        return (
                                          <button
                                            key={act.id}
                                            onClick={() => handleToggleAction(act.id, isActEnabled, fn.id, sub.id, menu.id)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                              isActEnabled
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through'
                                            }`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${isActEnabled ? 'bg-blue-500' : 'bg-slate-400'}`} />
                                            <span>{act.label}</span>
                                            <code className="text-[9px] px-1 py-0.2 rounded bg-white/60 dark:bg-slate-900/60 font-mono">
                                              {act.code}
                                            </code>
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

      {/* 5. Live Permission Simulator & Policy Tester */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Realtime Policy & Permission Simulator for {selectedUser.name}
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Verify whether an exact action code (e.g. <code>SALE_EDIT</code>, <code>SALE_DELETE</code>, <code>VIEW_COST</code>, <code>SYNC_CLOUD</code>) will be allowed or blocked for this client user according to the most restrictive hierarchy rule.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={testActionCode}
            onChange={(e) => setTestActionCode(e.target.value.toUpperCase())}
            placeholder="Enter action code (e.g. SALE_EDIT, SALE_DELETE, PARTY_CREATE)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleRunPermissionTest}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Test Policy</span>
          </button>
        </div>

        {testResult && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
            testResult.allowed
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}>
            {testResult.allowed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>Result: {testResult.allowed ? '✅ ACCESS ALLOWED' : '❌ ACCESS DENIED / RESTRICTED'}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/60 dark:bg-slate-900/60">
                  {testActionCode}
                </span>
              </div>
              <p className="text-[11px] opacity-90">{testResult.reason}</p>
              {testResult.path && (
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Hierarchy Path: {testResult.path}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
