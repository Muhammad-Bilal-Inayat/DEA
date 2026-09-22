import React, { useState, useEffect } from 'react';
import {
  UserDeviceRecord,
  DeviceReplacementToken,
  getAllRegisteredDevices,
  authorizeDevice,
  revokeDevice,
  generateDeviceReplacementToken,
  preConfigureDevice,
  deleteDeviceRecord,
  getLocalInstallationId
} from '../../lib/deviceSecurityService';
import { getAllTenants, getMasterActiveUsers, clearMasterUserHardwareLock } from '../../lib/masterServerService';
import {
  Laptop,
  Smartphone,
  Monitor,
  Tablet,
  Key,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  User,
  Unlock,
  Building2,
  ExternalLink,
  Sliders,
  Send
} from 'lucide-react';

interface DeviceAuthorizationManagerPanelProps {
  showToast?: (msg: string) => void;
}

export const DeviceAuthorizationManagerPanel: React.FC<DeviceAuthorizationManagerPanelProps> = ({ showToast }) => {
  const [devices, setDevices] = useState<UserDeviceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [tenants, setTenants] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  
  // Modal states
  const [showAllowNewDeviceModal, setShowAllowNewDeviceModal] = useState(false);
  const [workflowTab, setWorkflowTab] = useState<'token' | 'preconfig' | 'unlock'>('token');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<DeviceReplacementToken | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [revocationModalDevice, setRevocationModalDevice] = useState<UserDeviceRecord | null>(null);
  const [revocationReasonInput, setRevocationReasonInput] = useState('Administrative Security Check / Device Superseded');

  // Form states
  const [selectedUserId, setSelectedUserId] = useState('');
  const [preConfigData, setPreConfigData] = useState({
    deviceName: '',
    deviceType: 'Laptop' as UserDeviceRecord['deviceType'],
    os: 'Windows 11 Pro',
    model: '',
    serialNumber: ''
  });

  const loadData = () => {
    setDevices(getAllRegisteredDevices());
    setTenants(getAllTenants());
    setActiveUsers(getMasterActiveUsers());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('mbi-devices-updated', handleUpdate);
    return () => window.removeEventListener('mbi-devices-updated', handleUpdate);
  }, []);

  const toast = (msg: string) => {
    if (showToast) showToast(msg);
    else alert(msg);
  };

  const handleAuthorize = (deviceId: string) => {
    const updated = authorizeDevice(deviceId, 'Master Admin');
    setDevices(updated);
    toast('Device authorized successfully! Bound to user account.');
  };

  const handleOpenRevokeModal = (dev: UserDeviceRecord) => {
    setRevocationModalDevice(dev);
    setRevocationReasonInput('Hardware Replaced / Security Revocation');
  };

  const handleConfirmRevoke = () => {
    if (!revocationModalDevice) return;
    const updated = revokeDevice(revocationModalDevice.id, revocationReasonInput || 'Administrative Policy', 'Master Admin');
    setDevices(updated);
    setRevocationModalDevice(null);
    toast(`Authorization revoked for ${revocationModalDevice.deviceName}.`);
  };

  const handleDelete = (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device registration record?')) return;
    const updated = deleteDeviceRecord(deviceId);
    setDevices(updated);
    toast('Device record deleted.');
  };

  const handleGenerateTokenForUser = (userId: string, userName: string, tenantId: string) => {
    const token = generateDeviceReplacementToken(userId, userName, tenantId, 'Master Admin');
    setGeneratedToken(token);
    setShowTokenModal(true);
    toast(`One-Time Replacement Key generated: ${token.tokenKey}`);
  };

  const handleExecuteAllowWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user account.');
      return;
    }

    const selectedUser = activeUsers.find(u => u.id === selectedUserId);
    const uName = selectedUser?.name || 'Authorized User';
    const tId = selectedUser?.storeName || 'default_tenant';

    if (workflowTab === 'token') {
      const token = generateDeviceReplacementToken(selectedUserId, uName, tId, 'Master Admin');
      setGeneratedToken(token);
      setShowAllowNewDeviceModal(false);
      setShowTokenModal(true);
      toast(`One-Time Replacement Key created for ${uName}!`);
    } else if (workflowTab === 'preconfig') {
      if (!preConfigData.deviceName) {
        alert('Please enter a device name.');
        return;
      }
      preConfigureDevice({
        userId: selectedUserId,
        userName: uName,
        tenantId: tId,
        deviceName: preConfigData.deviceName,
        deviceType: preConfigData.deviceType,
        os: preConfigData.os,
        model: preConfigData.model,
        serialNumber: preConfigData.serialNumber,
        adminName: 'Master Admin'
      });
      setShowAllowNewDeviceModal(false);
      loadData();
      toast(`Pre-authorized ${preConfigData.deviceType} (${preConfigData.deviceName}) for ${uName}!`);
    } else if (workflowTab === 'unlock') {
      clearMasterUserHardwareLock(selectedUserId);
      setShowAllowNewDeviceModal(false);
      loadData();
      toast(`Hardware lock cleared for ${uName}. Next device login will be automatically authorized.`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const currentLocalId = getLocalInstallationId();

  // Filtered devices list
  const filteredDevices = devices.filter(dev => {
    if (filterStatus !== 'all' && dev.status !== filterStatus) return false;
    if (selectedTenant !== 'all' && dev.tenantId !== selectedTenant) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        dev.userName.toLowerCase().includes(q) ||
        dev.deviceName.toLowerCase().includes(q) ||
        dev.installationId.toLowerCase().includes(q) ||
        (dev.model && dev.model.toLowerCase().includes(q)) ||
        (dev.serialNumber && dev.serialNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getDeviceIcon = (type: UserDeviceRecord['deviceType']) => {
    switch (type) {
      case 'Mobile': return <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Tablet': return <Tablet className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'Laptop': return <Laptop className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default: return <Monitor className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  const getStatusBadge = (status: UserDeviceRecord['status']) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Authorized Active</span>
          </span>
        );
      case 'Pending_Authorization':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Pending Approval</span>
          </span>
        );
      case 'Replaced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Replaced / Inactive</span>
          </span>
        );
      case 'Revoked':
      case 'Disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Revoked Access</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with High-Visibility Action */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-600/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white">User Device Manager & Fleet Security</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                1 USER = 1 DEVICE ENFORCED
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-1 max-w-2xl">
              Inspect authorized user hardware, revoke unauthorized logins, and grant new replacement devices via one-time tokens or instant pre-authorization with 0 data loss.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              setShowAllowNewDeviceModal(true);
              if (activeUsers.length > 0 && !selectedUserId) {
                setSelectedUserId(activeUsers[0].id);
              }
            }}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Allow New Device</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center justify-center cursor-pointer"
            title="Refresh Device Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Registered</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{devices.length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Enrolled Hardware Units</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Authorized</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{devices.filter(d => d.status === 'Active').length}</p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">Currently Operational</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Approval</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{devices.filter(d => d.status === 'Pending_Authorization').length}</p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-500/80 mt-0.5">New Device Logins</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Replaced / Revoked</p>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{devices.filter(d => d.status === 'Replaced' || d.status === 'Revoked').length}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Historical Devices</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search user, device name, model, HWID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 shrink-0 font-medium"
          >
            <option value="all">All Device Statuses</option>
            <option value="Active">Authorized Active</option>
            <option value="Pending_Authorization">Pending Authorization</option>
            <option value="Replaced">Replaced / Inactive</option>
            <option value="Revoked">Revoked / Disabled</option>
          </select>

          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 shrink-0 font-medium"
          >
            <option value="all">All Tenants / Stores</option>
            {tenants.map(t => (
              <option key={t.id || t.tenantId} value={t.tenantId || t.id}>
                {t.name || t.storeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">User / Account</th>
                <th className="py-3 px-4">Device & Specifications</th>
                <th className="py-3 px-4">Installation ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Master Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Laptop className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="font-bold">No registered devices found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Allow New Device" to authorize a user's computer or smartphone.</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map(dev => {
                  const isCurrentMachine = dev.installationId === currentLocalId;
                  return (
                    <tr key={dev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{dev.userName}</span>
                          {isCurrentMachine && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40">
                              THIS MACHINE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          ID: {dev.userId} • Store: {dev.tenantId}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shrink-0">
                            {getDeviceIcon(dev.deviceType)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{dev.deviceName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {dev.os} • {dev.browserInfo || 'Browser POS'}
                              {dev.model && ` • Model: ${dev.model}`}
                              {dev.serialNumber && ` • S/N: ${dev.serialNumber}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                        <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 select-all">
                          {dev.installationId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(dev.status)}
                        {dev.revocationReason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-xs truncate">
                            {dev.revocationReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(dev.lastSeenAt).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {dev.status !== 'Active' ? (
                            <button
                              onClick={() => handleAuthorize(dev.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Authorize this device as primary"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Authorize</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenRevokeModal(dev)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Revoke device authorization"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleGenerateTokenForUser(dev.userId, dev.userName, dev.tenantId)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Generate one-time replacement key"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Replace Key</span>
                          </button>

                          <button
                            onClick={() => handleDelete(dev.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Delete device record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ALLOW NEW DEVICE WORKFLOW */}
      {showAllowNewDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 text-slate-900 dark:text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Allow New Device / Hardware Replacement</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure new hardware authorization for a user account</p>
                </div>
              </div>
              <button onClick={() => setShowAllowNewDeviceModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select User */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">1. Target User Account</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="">-- Choose User to Authorize --</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) • {u.storeName || 'Primary Store'}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Authorization Method */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">2. Authorization Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWorkflowTab('token')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    workflowTab === 'token'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Key className="w-4 h-4 mb-1.5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="font-bold text-xs">Issue 48h Key</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Token entry on client login</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkflowTab('preconfig')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    workflowTab === 'preconfig'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Laptop className="w-4 h-4 mb-1.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-bold text-xs">Pre-Configure</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Register exact hardware unit</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkflowTab('unlock')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    workflowTab === 'unlock'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Unlock className="w-4 h-4 mb-1.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-xs">Quick Unlock</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Auto-enroll next login</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Method Details */}
            <form onSubmit={handleExecuteAllowWorkflow} className="space-y-3.5 text-xs pt-2">
              {workflowTab === 'token' && (
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-3.5 space-y-1.5 text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4" />
                    <span>How One-Time Replacement Key Works:</span>
                  </p>
                  <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                    <li>Generates a secure 12-character alphanumeric code valid for 48 hours.</li>
                    <li>The client user opens the application on their new computer or phone and enters the key.</li>
                    <li>The system instantly binds the new hardware to their account and retires the previous device.</li>
                  </ul>
                </div>
              )}

              {workflowTab === 'preconfig' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Device Form Factor</label>
                      <select
                        value={preConfigData.deviceType}
                        onChange={(e) => setPreConfigData({ ...preConfigData, deviceType: e.target.value as any })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white"
                      >
                        <option value="Laptop">Laptop</option>
                        <option value="Desktop">Desktop PC</option>
                        <option value="POS Terminal">POS Touch Terminal</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Mobile">Mobile Phone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Operating System</label>
                      <input
                        type="text"
                        value={preConfigData.os}
                        onChange={(e) => setPreConfigData({ ...preConfigData, os: e.target.value })}
                        placeholder="e.g. Windows 11 Pro"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Device Name / Label</label>
                    <input
                      type="text"
                      value={preConfigData.deviceName}
                      onChange={(e) => setPreConfigData({ ...preConfigData, deviceName: e.target.value })}
                      placeholder="e.g. Counter 1 - Dell Latitude 5420"
                      required={workflowTab === 'preconfig'}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Model (Optional)</label>
                      <input
                        type="text"
                        value={preConfigData.model}
                        onChange={(e) => setPreConfigData({ ...preConfigData, model: e.target.value })}
                        placeholder="e.g. HP ProBook 450"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Serial Number (Optional)</label>
                      <input
                        type="text"
                        value={preConfigData.serialNumber}
                        onChange={(e) => setPreConfigData({ ...preConfigData, serialNumber: e.target.value })}
                        placeholder="e.g. 5CD938102"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {workflowTab === 'unlock' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3.5 space-y-1.5 text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Unlock className="w-4 h-4" />
                    <span>Instant Hardware Lock Reset</span>
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Clears any hardware ID restriction for this user account. When the user logs in from their new computer, it will automatically become their authorized device without prompting for a key.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAllowNewDeviceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedUserId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {workflowTab === 'token' && 'Generate Replacement Key'}
                  {workflowTab === 'preconfig' && 'Authorize Hardware Unit'}
                  {workflowTab === 'unlock' && 'Reset Hardware Lock & Allow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVOCATION CONFIRMATION */}
      {revocationModalDevice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Revoke Device Authorization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{revocationModalDevice.userName} • {revocationModalDevice.deviceName}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>This will immediately revoke access for this device installation. The user will not be able to log in from this machine until re-authorized.</p>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Reason for Revocation</label>
                <input
                  type="text"
                  value={revocationReasonInput}
                  onChange={(e) => setRevocationReasonInput(e.target.value)}
                  placeholder="e.g. Device lost / Replacement laptop issued"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRevocationModalDevice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATED REPLACEMENT TOKEN */}
      {showTokenModal && generatedToken && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 rounded-2xl max-w-md w-full p-6 text-slate-900 dark:text-white shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">One-Time Device Replacement Key</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Issued for <span className="font-bold text-indigo-600 dark:text-indigo-300">{generatedToken.userName}</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-center space-y-2">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Redemption Token</p>
              <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-wider select-all">
                {generatedToken.tokenKey}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Valid for 48 Hours • Single Use Only
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-slate-800/50 p-3 rounded-xl text-[11px] text-amber-900 dark:text-slate-300 space-y-1 border border-amber-200 dark:border-slate-700/50">
              <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Zero Data Loss Replacement</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                When the user enters this key upon logging into their new device, their previous device is revoked, and all branch stock, invoices, and ledgers remain 100% intact.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(generatedToken.tokenKey)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? 'Copied to Clipboard!' : 'Copy Key for Client'}</span>
              </button>
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
