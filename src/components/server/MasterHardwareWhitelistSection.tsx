import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Key, 
  AlertTriangle, 
  Check, 
  Copy, 
  RefreshCw,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { 
  getWhitelistedDevices, 
  saveWhitelistedDevices, 
  addWhitelistedDevice, 
  revokeWhitelistedDevice, 
  deleteWhitelistedDevice, 
  getEmergencyMasterCode, 
  setEmergencyMasterCode, 
  WhitelistedHardwareDevice 
} from '../../lib/masterDeviceLockService';

export const MasterHardwareWhitelistSection: React.FC = () => {
  const [devices, setDevices] = useState<WhitelistedHardwareDevice[]>(() => getWhitelistedDevices());
  const [emergencyCode, setEmergencyCode] = useState(() => getEmergencyMasterCode());
  const [isEditingEmergencyCode, setIsEditingEmergencyCode] = useState(false);
  const [newEmergencyCodeInput, setNewEmergencyCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Add Device Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Laptop' as 'Laptop' | 'Mobile' | 'Desktop',
    model: '',
    serialOrDeviceId: '',
    productIdOrBuild: '',
    specsSummary: ''
  });

  const refresh = () => {
    setDevices(getWhitelistedDevices());
    setEmergencyCode(getEmergencyMasterCode());
  };

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('mbi-whitelisted-devices-updated', handleUpdate);
    return () => window.removeEventListener('mbi-whitelisted-devices-updated', handleUpdate);
  }, []);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    notify('Copied to clipboard!');
  };

  const handleSaveEmergencyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmergencyCodeInput.trim()) return;
    setEmergencyMasterCode(newEmergencyCodeInput.trim());
    setEmergencyCode(newEmergencyCodeInput.trim());
    setIsEditingEmergencyCode(false);
    notify('Emergency Master Passphrase updated successfully!');
  };

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.serialOrDeviceId.trim()) {
      alert('Please provide device name and Hardware/Device ID');
      return;
    }

    addWhitelistedDevice({
      name: formData.name.trim(),
      type: formData.type,
      model: formData.model.trim() || `${formData.type} Terminal`,
      serialOrDeviceId: formData.serialOrDeviceId.trim(),
      productIdOrBuild: formData.productIdOrBuild.trim() || 'Custom Registered Device',
      specsSummary: formData.specsSummary.trim() || `Authorized Admin Hardware Profile`,
      isPreConfigured: false
    });

    setFormData({
      name: '',
      type: 'Laptop',
      model: '',
      serialOrDeviceId: '',
      productIdOrBuild: '',
      specsSummary: ''
    });

    setShowAddModal(false);
    refresh();
    notify('New Hardware Device added to Whitelist!');
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Are you sure you want to revoke access for this device?')) return;
    revokeWhitelistedDevice(id);
    refresh();
    notify('Device access revoked.');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Permanently delete this hardware whitelist entry?')) return;
    deleteWhitelistedDevice(id);
    refresh();
    notify('Device permanently removed from whitelist.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-xs text-emerald-200 shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header / Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Physical Hardware Whitelist Lock
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold font-mono">
                  ACTIVE LOCKDOWN
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Only the registered physical hardware profiles below are permitted to load and authenticate into <code className="text-rose-400 font-mono font-bold">/server</code>. All other unauthorized browsers/devices are strictly blocked.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-900/30 flex items-center gap-2 shrink-0 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Device</span>
          </button>
        </div>
      </div>

      {/* Emergency Bypass Master Card */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Key className="w-4 h-4" />
            <span>Emergency Master Recovery Passphrase</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsEditingEmergencyCode(!isEditingEmergencyCode);
              setNewEmergencyCodeInput(emergencyCode);
            }}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
          >
            {isEditingEmergencyCode ? 'Cancel' : 'Change Master Passphrase'}
          </button>
        </div>

        <p className="text-[11px] text-slate-300">
          If you lose your registered laptop or phone, you can immediately access <code className="text-rose-400 font-mono">/server</code> from ANY new device by selecting <strong>Emergency Master Bypass</strong> and entering this emergency passphrase.
        </p>

        {!isEditingEmergencyCode ? (
          <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <span className="font-mono text-xs font-black text-amber-300 tracking-wider select-all">
              {emergencyCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(emergencyCode)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ml-auto cursor-pointer"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveEmergencyCode} className="flex gap-2">
            <input
              type="text"
              required
              value={newEmergencyCodeInput}
              onChange={e => setNewEmergencyCodeInput(e.target.value)}
              placeholder="Enter new emergency master passphrase"
              className="flex-1 px-3 py-2 bg-slate-950 border border-amber-500 rounded-xl text-amber-200 font-mono text-xs focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl cursor-pointer"
            >
              Save Key
            </button>
          </form>
        )}
      </div>

      {/* Whitelisted Hardware Devices Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>Registered Hardware Profiles ({devices.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">Auto-enforced on /server load</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((dev) => {
            const isLaptop = dev.type === 'Laptop' || dev.type === 'Desktop';
            const isActive = dev.status === 'ACTIVE';

            return (
              <div
                key={dev.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-rose-950/20 border-rose-900/40 opacity-70'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                        {isLaptop ? <Laptop className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">
                          {dev.name}
                        </h4>
                        <div className="text-[10.5px] font-mono text-slate-400">
                          {dev.type} Profile
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      isActive 
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    }`}>
                      {dev.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware ID:</span>
                      <span className="text-slate-200 font-bold truncate max-w-[190px]">{dev.serialOrDeviceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Product/Build:</span>
                      <span className="text-slate-300 truncate max-w-[190px]">{dev.productIdOrBuild}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Specs / OS:</span>
                      <span className="text-slate-300 font-sans text-[10px] truncate max-w-[190px]">{dev.specsSummary}</span>
                    </div>
                    {dev.lastAccessAt && (
                      <div className="flex justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">Last Verified:</span>
                        <span className="text-emerald-400 text-[10px]">{new Date(dev.lastAccessAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Cryptographic Token Bound
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleRevoke(dev.id)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 transition-all cursor-pointer"
                        title="Revoke Device Access"
                      >
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const list = getWhitelistedDevices();
                          const target = list.find(d => d.id === dev.id);
                          if (target) {
                            target.status = 'ACTIVE';
                            saveWhitelistedDevices(list);
                            refresh();
                            notify('Device restored to ACTIVE!');
                          }
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer"
                      >
                        Restore
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(dev.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30 transition-all cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                <span>Register New Hardware Device</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDeviceSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bilal Office PC / iPhone 15 Pro"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Device Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile / Smartphone</option>
                  <option value="Desktop">Desktop PC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Hardware / Device ID (Serial / UUID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B44B46B9-83F4-4AE0-8EC5 or Serial Number"
                  value={formData.serialOrDeviceId}
                  onChange={e => setFormData({ ...formData, serialOrDeviceId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Product ID / Model / OS Build</label>
                <input
                  type="text"
                  placeholder="e.g. 00330-52627-28992-AAOEM / Android 15"
                  value={formData.productIdOrBuild}
                  onChange={e => setFormData({ ...formData, productIdOrBuild: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Hardware Specifications / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Core i7 / 16GB RAM / Windows 11"
                  value={formData.specsSummary}
                  onChange={e => setFormData({ ...formData, specsSummary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-900/40 cursor-pointer"
                >
                  Add to Whitelist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
