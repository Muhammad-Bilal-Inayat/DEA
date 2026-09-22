import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShieldAlert, 
  ArrowLeft, 
  EyeOff, 
  Server, 
  Lock, 
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export const StealthReturnBar: React.FC = () => {
  const { impersonationSession, stopImpersonating } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [liveDuration, setLiveDuration] = useState('00:00');

  useEffect(() => {
    if (!impersonationSession) return;
    const start = new Date(impersonationSession.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.floor((now - start) / 1000);
      const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
      const secs = String(diffSec % 60).padStart(2, '0');
      setLiveDuration(`${mins}:${secs}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [impersonationSession]);

  if (!impersonationSession || !impersonationSession.isImpersonating) {
    return null;
  }

  const { targetClient } = impersonationSession;

  if (minimized) {
    return (
      <div className="fixed top-2 right-4 z-[99999] animate-in fade-in slide-in-from-top-2">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/95 text-indigo-200 border border-indigo-500/50 rounded-full shadow-2xl backdrop-blur-md hover:bg-indigo-900 transition-all text-xs font-bold cursor-pointer"
          title="Expand Master Stealth Controls"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
          <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
          <span>Stealth: {targetClient.clientName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
        </button>
      </div>
    );
  }

  return (
    <div 
      id="stealth-remote-session-bar"
      className="fixed top-0 inset-x-0 z-[99999] bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white border-b-2 border-indigo-500/70 shadow-2xl backdrop-blur-xl px-4 py-2 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Status & Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
            <EyeOff className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-indigo-300 uppercase tracking-wider text-[10px] bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600/50">
                Stealth Shadow Session Active
              </span>
              <span className="font-bold text-white text-sm">
                {targetClient.clientName}
              </span>
              <span className="text-[11px] font-mono text-indigo-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                {targetClient.licenseKey}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Owner: <strong className="text-white">{targetClient.ownerName || 'Admin'}</strong></span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">Silent Ghost Access ({liveDuration})</span>
              <span>•</span>
              <span className="text-slate-400">Client is unaware of session</span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-master-admin'));
            }}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg font-bold text-xs border border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Open Master Server Control Hub"
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Master Hub (Alt+M)</span>
          </button>

          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
            title="Minimize Bar"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            id="btn-return-master-server"
            onClick={stopImpersonating}
            className="px-4 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-lg font-black text-xs shadow-lg shadow-rose-900/40 border border-rose-400/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Master Server (Wapas Jao)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
