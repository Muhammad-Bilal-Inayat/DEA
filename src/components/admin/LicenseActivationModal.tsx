import React, { useState } from 'react';
import { Key, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, X, HardDrive, Lock } from 'lucide-react';
import { getLicenseInfo, saveLicenseInfo, LicenseInfo } from '../../lib/licenseManager';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [license, setLicense] = useState<LicenseInfo>(() => getLicenseInfo());
  const [inputKey, setInputKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleVerifyKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsVerifying(true);
    setMessage(null);

    setTimeout(() => {
      setIsVerifying(false);
      if (inputKey.trim().toUpperCase().startsWith('MBI-')) {
        const updated: LicenseInfo = {
          ...license,
          licenseKey: inputKey.trim().toUpperCase(),
          status: 'Active',
          lastCheck: new Date().toISOString()
        };
        saveLicenseInfo(updated);
        setLicense(updated);
        setMessage({ text: 'License verified and activated successfully!', type: 'success' });
        if (onStatusChange) onStatusChange();
      } else {
        setMessage({ text: 'Invalid license key format. Keys must start with MBI-...', type: 'error' });
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">License & Installation Status</h3>
              <p className="text-xs text-slate-400">Offline-first local installation verification</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              {message.text}
            </div>
          )}

          {/* Installation Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-600" /> Installation Device ID:
              </span>
              <span className="font-mono font-bold text-xs bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
                {license.installationId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">License Status:</span>
              <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                license.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                license.status === 'Deactivated' ? 'bg-red-100 text-red-800 border border-red-200' :
                'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {license.status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Software Type:</span>
              <span className="font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Enterprise Server Software</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Plan:</span>
              <span className="font-bold text-xs text-slate-800">{license.plan}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Validity & Expiry:</span>
              <span className="font-bold text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Lifetime Valid (No Expiry)</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200">
              <span>Last Verification Check:</span>
              <span>{new Date(license.lastCheck).toLocaleString()}</span>
            </div>
          </div>

          {/* Activate / Update Key Form */}
          <form onSubmit={handleVerifyKey} className="space-y-3 pt-2">
            <label className="block text-xs font-bold text-slate-700">Enter / Update License Key</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. MBI-PRO-2026-XXXX" 
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Activate
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Local database is completely private & independent.</span>
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
