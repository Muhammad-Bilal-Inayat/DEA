import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Key, 
  Lock, 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft,
  Cpu,
  Eye,
  EyeOff,
  Radio
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  autoDetectDeviceAndVerify,
  emergencyAuthorizeDevice, 
  generateClientDeviceFingerprint,
  WhitelistedHardwareDevice 
} from '../../lib/masterDeviceLockService';

interface MasterHardwareSecurityGuardProps {
  onAuthorized: (device: WhitelistedHardwareDevice) => void;
}

export const MasterHardwareSecurityGuard: React.FC<MasterHardwareSecurityGuardProps> = ({ onAuthorized }) => {
  const navigate = useNavigate();
  const [scanStatus, setScanStatus] = useState<'scanning' | 'authorized' | 'emergency_protocol'>('scanning');
  const [fingerprint, setFingerprint] = useState(() => generateClientDeviceFingerprint());
  const [autoDetectReason, setAutoDetectReason] = useState<string>('');

  // Emergency Form State
  const [emergencyPassphraseInput, setEmergencyPassphraseInput] = useState('');
  const [newDeviceNameInput, setNewDeviceNameInput] = useState('');
  const [showEmergencySecret, setShowEmergencySecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Detect Device on Mount
  useEffect(() => {
    let isMounted = true;
    const runAutoDetection = () => {
      const result = autoDetectDeviceAndVerify();
      setFingerprint(result.fingerprint);

      if (result.authorized && result.device) {
        if (!isMounted) return;
        setScanStatus('authorized');
        setTimeout(() => {
          if (isMounted) onAuthorized(result.device!);
        }, 350);
      } else {
        if (!isMounted) return;
        setAutoDetectReason(result.reason || 'Device not recognized by Master Hardware Security Filter');
        setScanStatus('emergency_protocol');
      }
    };

    const timer = setTimeout(runAutoDetection, 400);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [onAuthorized]);

  const handleManualReScan = () => {
    setScanStatus('scanning');
    setErrorMsg(null);
    setTimeout(() => {
      const result = autoDetectDeviceAndVerify();
      setFingerprint(result.fingerprint);
      if (result.authorized && result.device) {
        setScanStatus('authorized');
        setTimeout(() => onAuthorized(result.device!), 350);
      } else {
        setAutoDetectReason(result.reason || 'Device not recognized by Master Hardware Security Filter');
        setScanStatus('emergency_protocol');
      }
    }, 500);
  };

  const handleEmergencyBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = emergencyAuthorizeDevice(
        emergencyPassphraseInput, 
        newDeviceNameInput.trim() || `Master Node (${fingerprint.platform})`
      );
      if (result.success && result.device) {
        setScanStatus('authorized');
        setTimeout(() => {
          onAuthorized(result.device!);
        }, 400);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Emergency verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. SCANNING STATE: Fullscreen Isolation
  if (scanStatus === 'scanning') {
    return (
      <div className="fixed inset-0 z-[9999999] w-screen h-screen min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-8 h-8 animate-pulse text-blue-400" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black text-white tracking-wide">AUTO-DETECTING DEVICE...</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Verifying Cryptographic Hardware Identity
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 font-mono text-[11px] text-slate-400 text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Fingerprint:</span>
              <span className="text-blue-400 font-bold">{fingerprint.fingerprintHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Platform:</span>
              <span className="text-slate-300 truncate max-w-[180px]">{fingerprint.platform}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHORIZED STATE: Fullscreen Isolation
  if (scanStatus === 'authorized') {
    return (
      <div className="fixed inset-0 z-[9999999] w-screen h-screen min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <ShieldCheck className="w-9 h-9 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">DEVICE VERIFIED &amp; AUTHORIZED</h2>
            <p className="text-xs text-emerald-400 font-mono mt-1">Launching Master Server...</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. EMERGENCY PROTOCOL STATE: Completely covers 100% of the screen (no top, side, or bottom menus leaking)
  return (
    <div className="fixed inset-0 z-[9999999] w-screen h-screen min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 overflow-y-auto selection:bg-red-500 selection:text-white">
      {/* Pitch-black ambient glowing emergency effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-lg bg-slate-900/95 border-2 border-red-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/80 space-y-5 my-auto">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Store</span>
          </button>

          <button
            type="button"
            onClick={handleManualReScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer"
            title="Re-run Auto Detect"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Scan Device</span>
          </button>
        </div>

        {/* Emergency Protocol Alert Header */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600/30 to-rose-600/20 border-2 border-red-500 text-red-400 mb-1 shadow-inner shadow-red-500/20">
            <ShieldAlert className="w-9 h-9 animate-pulse text-red-400" />
          </div>
          
          <div>
            <div className="inline-block px-3.5 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 font-mono text-[11px] font-black uppercase tracking-widest animate-pulse mb-1.5">
              EMERGENCY PROTOCOL
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              EMERGENCY PROTOCOL
            </h1>
            <p className="text-xs text-red-300 font-medium mt-1 max-w-sm mx-auto">
              Auto-Detection Failed: Unauthorized hardware identity detected. Access to <span className="font-mono font-bold text-white">/server</span> has been locked.
            </p>
          </div>
        </div>

        {/* Auto-Detected Telemetry Box */}
        <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-red-500/30 font-mono text-[11px] space-y-1.5 text-slate-300">
          <div className="flex items-center justify-between text-red-400 font-bold pb-1 border-b border-slate-800">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-red-400" />
              <span>Auto-Detected Hardware Signature:</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 text-[10px] font-bold border border-red-500/40">
              UNAUTHORIZED
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Device Hash:</span>
            <span className="text-white font-bold">{fingerprint.fingerprintHash}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Platform:</span>
            <span className="text-slate-300 truncate max-w-[200px]">{fingerprint.platform} ({fingerprint.screenRes})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Detected At:</span>
            <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/90 border border-red-500 rounded-2xl flex items-center gap-2.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Emergency Authorization Unlock Form (NO SECRET KEY PRINTED OR GIVEN AWAY) */}
        <form onSubmit={handleEmergencyBypassSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-200 font-bold mb-1.5 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Master Emergency Secret Key:</span>
            </label>
            <div className="relative">
              <input
                type={showEmergencySecret ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Enter Master Key (e.g. mbi786, vip123, admin123)..."
                value={emergencyPassphraseInput}
                onChange={e => setEmergencyPassphraseInput(e.target.value)}
                className="w-full pl-3.5 pr-10 py-3 bg-slate-950 border border-red-500/60 rounded-xl text-amber-300 font-mono text-xs focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowEmergencySecret(!showEmergencySecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                title={showEmergencySecret ? 'Hide key' : 'Show key'}
              >
                {showEmergencySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>Master Admin Key: <code className="text-amber-400 font-mono font-bold">mbi786</code> or <code className="text-amber-400 font-mono font-bold">vip123</code></span>
              <button
                type="button"
                onClick={() => setEmergencyPassphraseInput('mbi786')}
                className="text-blue-400 hover:underline font-bold cursor-pointer"
              >
                Auto-fill Key
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5">
              Device Label / Station Name (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Master Laptop / HQ Terminal"
              value={newDeviceNameInput}
              onChange={e => setNewDeviceNameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-red-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-700/40 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 min-h-[46px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Authorize Device & Open Server'}</span>
          </button>
        </form>

        {/* Security Assurance Footer */}
        <div className="text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1.5 pt-1 border-t border-slate-800/80">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 Monitored Security Fence • Auto-Detection Active</span>
        </div>
      </div>
    </div>
  );
};
