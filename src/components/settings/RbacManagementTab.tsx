import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldCheck, ShieldAlert, Lock, CheckCircle2, 
  RotateCcw, Save, Key, AlertTriangle, Eye, EyeOff, 
  DollarSign, FileText, Package, Users, Database, HelpCircle,
  Plus, Edit2, Trash2, UserCheck, UserX, RefreshCw
} from 'lucide-react';
import { UserRole, AppUserRecord } from '../../types';
import { 
  RolePermissions, 
  ROLE_DEFINITIONS, 
  getActiveRolePermissions, 
  saveCustomRolePermissions, 
  resetRolePermissionsToDefault 
} from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { saveRecordToFirestore } from '../../lib/firebase';
import { logAuditEvent } from '../../lib/auditLogger';

const ROLES_LIST: UserRole[] = [
  'Primary Admin',
  'Secondary Admin',
  'Store Manager',
  'Cashier',
  'Sales Staff',
  'Accountant',
  'Stock Keeper',
];

export const RbacManagementTab: React.FC = () => {
  const { business, activeRole, appUsers, addAppUser, updateAppUser, removeAppUser } = useAuth();
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<UserRole, RolePermissions>>(() => getActiveRolePermissions(business?.id));
  const [selectedRole, setSelectedRole] = useState<UserRole>('Cashier');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // User management state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserRecord | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Cashier');
  const [newUserPin, setNewUserPin] = useState('0000');

  const isPrimaryAdmin = activeRole === 'Primary Admin';

  useEffect(() => {
    setPermissionsMatrix(getActiveRolePermissions(business?.id));
  }, [business?.id]);

  const currentRolePerms = permissionsMatrix[selectedRole] || ROLE_DEFINITIONS[selectedRole] || ROLE_DEFINITIONS['Cashier'];
  const isSelectedPrimaryAdmin = selectedRole === 'Primary Admin';

  const handleModuleToggle = (moduleKey: keyof RolePermissions['allowedModules']) => {
    if (isSelectedPrimaryAdmin) return;
    setPermissionsMatrix(prev => {
      const current = prev[selectedRole] || ROLE_DEFINITIONS[selectedRole];
      const updatedRole = {
        ...current,
        allowedModules: {
          ...current.allowedModules,
          [moduleKey]: !current.allowedModules[moduleKey]
        }
      };
      return {
        ...prev,
        [selectedRole]: updatedRole
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleFeatureToggle = (featureKey: keyof RolePermissions['features']) => {
    if (isSelectedPrimaryAdmin) return;
    setPermissionsMatrix(prev => {
      const current = prev[selectedRole] || ROLE_DEFINITIONS[selectedRole];
      const updatedRole = {
        ...current,
        features: {
          ...current.features,
          [featureKey]: !current.features[featureKey]
        }
      };
      return {
        ...prev,
        [selectedRole]: updatedRole
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    saveCustomRolePermissions(permissionsMatrix, business?.id);
    
    // Save to Firestore if online
    if (navigator.onLine && business?.id) {
      try {
        await saveRecordToFirestore('rbac_roles', business.id, {
          businessId: business.id,
          permissionsMatrix,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firestore rbac sync notice:', e);
      }
    }

    await logAuditEvent({
      category: 'RBAC_SECURITY',
      action: `Updated Role Permissions for ${selectedRole}`,
      entity: 'RBAC',
      entityId: selectedRole,
      details: `Primary Admin saved updated security privileges & module matrix for role: ${selectedRole}`,
    });

    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`Security permissions updated successfully for ${selectedRole} and active staff roles!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all roles and permission levels back to default factory security policies?')) {
      const defaults = resetRolePermissionsToDefault(business?.id);
      setPermissionsMatrix(defaults);
      setHasUnsavedChanges(true);
      setSaveSuccessMsg('Permissions successfully reset to factory defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    if (editingUser) {
      const updated: AppUserRecord = {
        ...editingUser,
        name: newUserName.trim(),
        emailOrPhone: newUserEmail.trim() || editingUser.emailOrPhone,
        role: newUserRole,
        passcode: newUserPin || '0000',
        updatedAt: new Date().toISOString()
      };
      await updateAppUser(updated);

      await logAuditEvent({
        category: 'RBAC_SECURITY',
        action: `Modified User Role: ${updated.name} -> ${updated.role}`,
        entity: 'AppUser',
        entityId: updated.id,
        details: `Primary Admin changed staff role to ${updated.role} (PIN: ${updated.passcode})`,
      });
    } else {
      const newRecord: AppUserRecord = {
        id: 'usr_' + Date.now().toString(36),
        name: newUserName.trim(),
        emailOrPhone: newUserEmail.trim() || 'staff@mbinventra.com',
        role: newUserRole,
        status: 'Joined',
        passcode: newUserPin || '0000',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await addAppUser(newRecord);

      await logAuditEvent({
        category: 'RBAC_SECURITY',
        action: `Assigned New Staff User: ${newRecord.name} (${newRecord.role})`,
        entity: 'AppUser',
        entityId: newRecord.id,
        details: `Primary Admin added new user ${newRecord.name} with role ${newRecord.role}`,
      });
    }

    setIsAddUserModalOpen(false);
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Cashier');
    setNewUserPin('0000');
  };

  const handleEditUserClick = (u: AppUserRecord) => {
    setEditingUser(u);
    setNewUserName(u.name);
    setNewUserEmail(u.emailOrPhone);
    setNewUserRole(u.role);
    setNewUserPin(u.passcode || '0000');
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUserClick = async (u: AppUserRecord) => {
    if (u.role === 'Primary Admin') {
      alert('Primary Admin cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove user "${u.name}" from this pharmacy instance?`)) {
      await removeAppUser(u.id);
      await logAuditEvent({
        category: 'RBAC_SECURITY',
        action: `Removed Staff User: ${u.name} (${u.role})`,
        entity: 'AppUser',
        entityId: u.id,
        details: `Primary Admin removed user ${u.name} from business`,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Role-Based Access Control (RBAC)</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Multi-Tenant Security
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Assign and configure granular roles (Admin, Manager, Cashier, Staff, Accountant) for <span className="text-blue-300 font-bold">{business?.name || 'MBI INVENTRA'}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Staff Users Assignment Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pharmacy Staff & Role Assignments ({appUsers.length})</h3>
              <p className="text-xs text-slate-500">Primary Admin assigns roles, passcodes and permissions to each employee</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setNewUserName('');
              setNewUserEmail('');
              setNewUserRole('Cashier');
              setNewUserPin('0000');
              setIsAddUserModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-end sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff User</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {appUsers.map((user) => {
            const isOwner = user.role === 'Primary Admin';
            const userName = user?.name || (user as any)?.displayName || (user as any)?.emailOrPhone || 'Staff';
            return (
              <div key={user.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {(userName.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{userName}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        isOwner ? 'bg-red-100 text-red-700 border-red-200' :
                        user.role === 'Store Manager' || user.role === 'Manager' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                        user.role === 'Cashier' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                        user.role === 'Accountant' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        PIN: {user.passcode || '0000'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{user.emailOrPhone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleEditUserClick(user)}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Edit role and PIN"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span className="text-xs">Edit Role</span>
                  </button>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUserClick(user)}
                      className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {ROLES_LIST.map((role) => {
            const isSelected = selectedRole === role;
            const def = permissionsMatrix[role] || ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS['Cashier'];
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-xl text-left transition-all relative border flex flex-col justify-between min-h-[76px] cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20' 
                    : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${def.badgeBg}`}>
                    {role}
                  </span>
                  {role === 'Primary Admin' && (
                    <Lock className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs text-slate-900 mt-2 truncate">
                  {def.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Role Configuration Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Role Overview Sub-Header */}
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-black text-slate-900">{currentRolePerms.title}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentRolePerms.badgeBg}`}>
                {currentRolePerms.badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">{currentRolePerms.description}</p>
          </div>

          {isSelectedPrimaryAdmin && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2 self-start">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Primary Admin has absolute immutable super-user rights.</span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">

          {/* Section 1: Sensitive Data & Security Privileges */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Sensitive Financial & Operational Privileges
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* canViewFinancialReports */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canViewFinancialReports 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Financial Reports & P&L</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Access to Profit & Loss, Balance Sheet, Day Book, and Audit Trails.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isSelectedPrimaryAdmin}
                  checked={currentRolePerms.features.canViewFinancialReports}
                  onChange={() => handleFeatureToggle('canViewFinancialReports')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canViewCostsAndProfit */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canViewCostsAndProfit 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Purchase Costs & Profit Margins</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hides wholesale purchase cost prices and net margins from POS billers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isSelectedPrimaryAdmin}
                  checked={currentRolePerms.features.canViewCostsAndProfit}
                  onChange={() => handleFeatureToggle('canViewCostsAndProfit')}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canDeleteTransactions */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canDeleteTransactions 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Invoices & Void Records</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permission to permanently delete sales bills and cancel vouchers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isSelectedPrimaryAdmin}
                  checked={currentRolePerms.features.canDeleteTransactions}
                  onChange={() => handleFeatureToggle('canDeleteTransactions')}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canAddEditItems */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canAddEditItems 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <Package className="w-3.5 h-3.5 text-teal-600" />
                    <span>Add & Edit Inventory Products</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modify product prices, barcodes, batch numbers, and stock levels.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isSelectedPrimaryAdmin}
                  checked={currentRolePerms.features.canAddEditItems}
                  onChange={() => handleFeatureToggle('canAddEditItems')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* canManageUsersAndRoles */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                currentRolePerms.features.canManageUsersAndRoles 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="pr-3">
                  <div className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Manage Staff Users & Passwords</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create new staff logins and assign role access permissions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={isSelectedPrimaryAdmin}
                  checked={currentRolePerms.features.canManageUsersAndRoles}
                  onChange={() => handleFeatureToggle('canManageUsersAndRoles')}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                />
              </div>

            </div>
          </div>

          {/* Section 2: Module Navigation Permissions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Key className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Module Navigation & Screen Access
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { key: 'dashboard', label: 'Dashboard & Analytics' },
                { key: 'parties', label: 'Customers & Parties' },
                { key: 'items', label: 'Inventory / Medicines' },
                { key: 'sale', label: 'Sales & Invoices' },
                { key: 'purchase', label: 'Purchases & Orders' },
                { key: 'expenses', label: 'Expenses Tracking' },
                { key: 'bank', label: 'Bank & Cash Management' },
                { key: 'reports', label: 'Reports & P&L Analysis' },
                { key: 'syncShare', label: 'Cloud Sync & Share' },
                { key: 'backup', label: 'Disaster Recovery Backup' },
                { key: 'utilities', label: 'Barcode & Utility Tools' },
                { key: 'settings', label: 'System Settings' },
              ].map(({ key, label }) => {
                const isAllowed = currentRolePerms.allowedModules[key as keyof RolePermissions['allowedModules']];
                return (
                  <label
                    key={key}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                      isAllowed 
                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 font-bold' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span className="text-xs">{label}</span>
                    <input
                      type="checkbox"
                      disabled={isSelectedPrimaryAdmin}
                      checked={isAllowed}
                      onChange={() => handleModuleToggle(key as any)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                    />
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Changes will take effect instantly across all logged-in user sessions.
          </span>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            Save Role Permissions
          </button>
        </div>

      </div>

      {/* Modal: Add/Edit Staff User */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUser ? 'Edit Staff Role & Passcode' : 'Add New Staff User'}
                  </h3>
                  <p className="text-xs text-slate-500">Assign role and POS security PIN</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Employee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood (Cashier)"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email or Phone
                </label>
                <input
                  type="text"
                  placeholder="tariq@mbinventra.com / 03001234567"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Role *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Sales Staff">Sales Staff</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Stock Keeper">Stock Keeper</option>
                    <option value="Secondary Admin">Secondary Admin</option>
                    <option value="Primary Admin">Primary Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    4-Digit POS PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="0000"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingUser ? 'Save Updates' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
