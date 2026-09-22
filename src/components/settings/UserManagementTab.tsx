import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, ShieldCheck, UserPlus, RefreshCw, Key, 
  CheckCircle2, AlertCircle, ArrowRight, Activity, Lock, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { AppUserRecord, UserRole } from '../../types';
import { ActivityLogModal } from '../common/ActivityLogModal';
import { AccountUsageService, TenantUsageInfo } from '../../lib/accountUsageService';
import { UpgradePlanModal } from '../common/UpgradePlanModal';
import { useSettings } from '../../contexts/SettingsContext';

export const UserManagementTab: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { 
    appUsers, 
    activeRole, 
    activeUser, 
    setActiveRole, 
    setActiveUser, 
    addAppUser, 
    activityLogs,
    tenantId,
    tenant,
    business
  } = useAuth();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isActivityLogModalOpen, setIsActivityLogModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeUsageInfo, setUpgradeUsageInfo] = useState<TenantUsageInfo | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Pharmacist');
  const [newUserPin, setNewUserPin] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const [newUserStatus, setNewUserStatus] = useState<'Joined' | 'Pending' | 'Inactive'>('Pending');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const currentTenantId = tenantId || tenant?.id || business?.tenantId || 'tenant-demo-01';
    const limitCheck = await AccountUsageService.checkLimitBeforeAction(currentTenantId, 'users');
    
    if (!limitCheck.allowed) {
      setUpgradeUsageInfo(limitCheck.usage);
      setIsUpgradeModalOpen(true);
      return;
    }

    await addAppUser({
      name: newUserName.trim(),
      emailOrPhone: newUserEmail.trim(),
      role: newUserRole,
      status: newUserStatus,
      passcode: newUserPin.trim() || '1234',
      tenantId: currentTenantId,
    });

    // Increment usage record
    AccountUsageService.incrementUsage(currentTenantId, 'users').catch(() => {});

    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPin('');
    setNewUserStatus('Pending');
    showToast(`Staff user ${newUserName} (${newUserRole}) added successfully`);
  };

  return (
    <div className="space-y-6 text-slate-800 text-[13px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Warning/Notice Box matching Screenshot 8 */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-900 text-xs">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Multi-Device Security & Activity Notice:</p>
          <p className="text-blue-800">
            MBI Inventra secures multi-user access with role-based authentication. You can view user activity audit logs below or manage synchronized devices through cloud sync.
          </p>
        </div>
      </div>

      {/* Enhanced Sync Banner matching Screenshot 8 */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-bold text-[10px] uppercase">
              NEW FEATURE
            </span>
            <h3 className="font-bold text-base">Introducing Enhanced Sync & User Access</h3>
          </div>
          <p className="text-xs text-blue-100">
            Now you can manage live multi-device connections, staff invitations, and role permissions directly from Sync & Share.
          </p>
        </div>

        <button
          onClick={() => navigate('/sync-share')}
          className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0"
        >
          <span>Go To Sync & Share</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Users List & Role Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Registered Users */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Registered App Users ({appUsers.length})</span>
            </h4>

            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Staff / User</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">User Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Quick Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appUsers.map(user => {
                  const isCurrent = activeUser?.id === user?.id || (!activeUser && user?.role === activeRole);
                  const displayName = user?.name || user?.emailOrPhone || 'User';
                  const initialChar = (displayName.charAt(0) || 'U').toUpperCase();
                  return (
                    <tr key={user?.id || Math.random()} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50/40 font-semibold' : ''}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                            {initialChar}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{displayName}</p>
                            {isCurrent && <span className="text-[10px] text-blue-600 font-bold">[ACTIVE NOW]</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{user?.emailOrPhone || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                          {user?.role || 'User'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          user?.status === 'Joined' || user?.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : user?.status === 'Pending' || user?.status === 'Invited'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user?.status === 'Pending' ? 'Pending Invite' : user?.status || 'Joined'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            if (user) {
                              setActiveUser(user);
                              setActiveRole(user.role);
                              showToast(`Switched active profile to ${displayName} (${user.role})`);
                            }
                          }}
                          disabled={isCurrent}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700'
                          }`}
                        >
                          {isCurrent ? 'Active' : 'Switch'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Role Matrix Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Role Permissions Breakdown</span>
          </h4>

          <div className="space-y-2 text-xs">
            {Object.entries(ROLE_DEFINITIONS).map(([roleName, def]) => (
              <div key={roleName} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{roleName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {Object.values(def.allowedModules).filter(Boolean).length} modules
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">{def.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Activity Logs Preview & Dashboard Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dashboard Layout Preferences Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Pharmacist Dashboard Preferences</span>
            </h4>
            <button
              onClick={() => navigate('/')}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Customize drag-and-drop ordering for <strong>Expiry Alerts</strong>, <strong>Low Stock Reorder</strong>, and <strong>Sales Reports</strong> using dnd-kit. Preferences sync with your user account.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <span>Customize Layout on Dashboard</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(`mbi_dashboard_layout_preferences_${activeUser?.id || 'default_user'}`);
                localStorage.removeItem('mbi_dashboard_layout_preferences_v3');
                showToast('Reset dashboard preferences to factory defaults.');
              }}
              className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Recent User Audit & Security Trail</span>
            </h4>
            <button
              onClick={() => setIsActivityLogModalOpen(true)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <span>View All Logs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
            {activityLogs && activityLogs.length > 0 ? (
              activityLogs.slice(0, 5).map((log, idx) => (
                <div key={log?.id || idx} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between gap-2 border border-slate-100">
                  <div>
                    <span className="font-bold text-slate-800">{log?.userName || 'User'}</span>
                    <span className="text-slate-500 ml-1">({log?.userRole || 'Staff'}):</span>
                    <span className="text-slate-700 ml-1">{log?.details || log?.action || 'Activity recorded'}</span>
                  </div>
                  <span className="text-[10.5px] text-slate-400 font-mono flex-shrink-0">
                    {log?.timestamp && !isNaN(new Date(log.timestamp).getTime())
                      ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400">
                No recent audit actions logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={isActivityLogModalOpen}
        onClose={() => setIsActivityLogModalOpen(false)}
      />

      {/* Add Staff Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Add Staff User</span>
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asim Raza"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email / Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="user@mbinventra.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assign Role</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="Pharmacist">Pharmacist (Clinical Dispensing, Batches & Sales)</option>
                  <option value="Cashier">Cashier (POS Counter Billing & Payments)</option>
                  <option value="Accountant">Accountant (Financials, Ledgers & Expenses)</option>
                  <option value="CA/Accountant">CA / Accountant (Financial Audit & Balance Sheet)</option>
                  <option value="Manager">Manager (Daily Operations & Staff Supervision)</option>
                  <option value="Store Manager">Store Manager (Inventory, Purchases & Sales Desk)</option>
                  <option value="Inventory Manager">Inventory Manager (Stock, Batches & Expiries)</option>
                  <option value="Stock Keeper">Stock Keeper (Inventory & Warehouse Items)</option>
                  <option value="Salesman">Salesman (Invoices, Orders & Parties)</option>
                  <option value="Sales Staff">Sales Staff (Counter Orders & Billing)</option>
                  <option value="Biller">Biller (Counter POS Billing)</option>
                  <option value="Secondary Admin">Secondary Admin (All except Settings)</option>
                  <option value="Viewer">Viewer (Read-Only Catalog & Reports)</option>
                  <option value="Custom Role">Custom Role (Configured Permissions)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
                <select
                  value={newUserStatus}
                  onChange={(e: any) => setNewUserStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs"
                >
                  <option value="Pending">Pending Invite (Awaiting User Acceptance)</option>
                  <option value="Joined">Joined (Active Immediately)</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Security PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="1234"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold tracking-widest text-center"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Quota & Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          resourceType="users"
          currentCount={upgradeUsageInfo?.userCount || appUsers.length}
          maxAllowed={upgradeUsageInfo?.maxUsers || 5}
          plan={upgradeUsageInfo?.plan || 'Free Starter'}
        />
      )}

    </div>
  );
};
