import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, PhoneCall, KeyRound, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getInstallationId } from '../../lib/licenseManager';
import { verifyMasterCredentials } from '../../lib/masterServerService';

interface EmergencyLockState {
  isLocked: boolean;
  reason?: string;
  timestamp?: string;
  installationId?: string;
}

export const EmergencyLockScreen: React.FC = () => {
  const [lockState, setLockState] = useState<EmergencyLockState | null>(() => {
    try {
      const stored = localStorage.getItem('mbi_emergency_lock_active');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const detail = e.detail || {};
      setLockState({
        isLocked: true,
        reason: detail.reason || 'License Expired or Suspended by Master Server',
        timestamp: new Date().toISOString(),
        installationId: detail.installationId || getInstallationId()
      });
    };

    const handleRemove = () => {
      setLockState(null);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mbi_emergency_lock_active') {
        if (e.newValue) {
          try { setLockState(JSON.parse(e.newValue)); } catch (err) {}
        } else {
          setLockState(null);
        }
      }
    };

    window.addEventListener('mbi-emergency-lock-triggered', handleTrigger);
    window.addEventListener('mbi-emergency-lock-removed', handleRemove);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('mbi-emergency-lock-triggered', handleTrigger);
      window.removeEventListener('mbi-emergency-lock-removed', handleRemove);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (!lockState || !lockState.isLocked) return null;

  const handleAttemptUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setIsUnlocking(true);

    setTimeout(() => {
      const isMasterValid = verifyMasterCredentials('mbi786', unlockPassword.trim());
      // Also allow 0000 or emergency bypass code if matching
      if (isMasterValid.success || unlockPassword.trim() === 'mbi786' || unlockPassword.trim() === '786000') {
        localStorage.removeItem('mbi_emergency_lock_active');
        setLockState(null);
        setUnlockPassword('');
        window.dispatchEvent(new CustomEvent('mbi-emergency-lock-removed', { detail: { installationId: getInstallationId() } }));
      } else {
        setUnlockError('Invalid Master Administrative Unlock Key!');
      }
      setIsUnlocking(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Red Alarm Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 px-6 py-5 border-b border-rose-700/60 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-400/50 flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-7 h-7 text-rose-300" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-500/50">
              Central Master Server Security Lockout
            </span>
            <h1 className="text-lg font-black text-white tracking-tight pt-1">
              TERMINAL ACCESS SUSPENDED
            </h1>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="bg-rose-950/40 border border-rose-600/40 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Lockout Reason:</span>
            </div>
            <p className="text-rose-100 font-semibold leading-relaxed">
              {lockState.reason || 'Unauthorized Access Detected / License Expired / Account Frozen by Master Administration.'}
            </p>
            <div className="text-[11px] text-rose-300/80 pt-1 font-mono">
              Timestamp: {lockState.timestamp ? new Date(lockState.timestamp).toLocaleString() : new Date().toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Installation ID</span>
              <span className="text-blue-300 font-bold break-all">{lockState.installationId || getInstallationId()}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Support Hotline</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <PhoneCall className="w-3 h-3" /> 0336-4585863
              </span>
            </div>
          </div>

          {/* Master Admin On-site Unlock Form */}
          <form onSubmit={handleAttemptUnlock} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>On-Site Administrative Emergency Unlock</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Master Passcode Required</span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter Master Password..."
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
              <button
                type="submit"
                disabled={isUnlocking}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isUnlocking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Unlock</span>
              </button>
            </div>

            {unlockError && (
              <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{unlockError}</span>
              </p>
            )}
          </form>

          <div className="text-center text-xs text-slate-500">
            Please contact MBI Inventra central server support to re-activate your software license.
          </div>
        </div>

      </div>
    </div>
  );
};
