import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  Settings, 
  HelpCircle,
  Calendar
} from 'lucide-react';
import { 
  checkClockIntegrity, 
  reVerifyAndUnlockClock, 
  ClockTamperStatus 
} from '../../lib/clockIntegrityService';

export const TimeTamperGuardModal: React.FC = () => {
  const [tamperStatus, setTamperStatus] = useState<ClockTamperStatus | null>(() => {
    const check = checkClockIntegrity();
    return check.isTampered ? check : null;
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleTamperDetected = (e: any) => {
      if (e.detail) {
        setTamperStatus(e.detail);
      } else {
        setTamperStatus(checkClockIntegrity());
      }
    };

    const handleTamperResolved = () => {
      setTamperStatus(null);
    };

    window.addEventListener('mbi-clock-tamper-detected', handleTamperDetected as any);
    window.addEventListener('mbi-clock-tamper-resolved', handleTamperResolved);

    return () => {
      window.removeEventListener('mbi-clock-tamper-detected', handleTamperDetected as any);
      window.removeEventListener('mbi-clock-tamper-resolved', handleTamperResolved);
    };
  }, []);

  if (!tamperStatus || !tamperStatus.isTampered) {
    return null;
  }

  const handleReVerify = async () => {
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const result = await reVerifyAndUnlockClock();
      if (result.isTampered) {
        setTamperStatus(result);
        setVerifyMessage('Clock is still set to the past! Please update your system date/time to the current real time.');
      } else {
        setTamperStatus(null);
      }
    } catch (e) {
      setVerifyMessage('Failed to verify time. Please ensure system time is accurate.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl border-2 border-red-500/80 max-w-xl w-full p-6 sm:p-8 shadow-2xl shadow-red-950/50 animate-in zoom-in-95 space-y-6">
        
        {/* Header with Security Badge */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30 flex items-center justify-center shrink-0 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-red-600 text-white shadow-sm">
                SECURITY LOCKOUT
              </span>
              <span className="text-xs text-red-600 dark:text-red-400 font-mono font-bold">
                ERR_CLOCK_TAMPER
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              System Clock Tampering Detected
            </h2>
            <p className="text-sm font-bold text-red-600 dark:text-red-400 font-urdu" dir="rtl">
              اپنے کمپیوٹر کا وقت اور تاریخ درست کریں
            </p>
          </div>
        </div>

        {/* Explanation Alert */}
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs leading-relaxed space-y-2 text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-red-900 dark:text-red-200">
            {tamperStatus.message || 'Your device clock has been set to the past. MBI Inventra requires your device date & time to be accurate to prevent license expiration bypass and accounting record corruption.'}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            {tamperStatus.urduMessage || 'سسٹم کی تاریخ اور وقت میں تبدیلی کی وجہ سے سافٹ ویئر کو عارضی طور پر روکا گیا ہے۔ جب آپ کمپیوٹر کا ٹائم درست کریں گے تو سافٹ ویئر خود بخود بحال ہو جائے گا۔'}
          </p>
        </div>

        {/* Date & Time Comparison Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Your Device Clock</span>
            </div>
            <div className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
              {tamperStatus.currentSystemTime}
            </div>
            <span className="inline-block text-[10px] text-red-500 font-bold">
              (Invalid / In Past)
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last Verified System Time</span>
            </div>
            <div className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
              {tamperStatus.expectedMinTime}
            </div>
            {tamperStatus.driftDescription && (
              <span className="inline-block text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                Skew: {tamperStatus.driftDescription}
              </span>
            )}
          </div>
        </div>

        {/* Instructions on How to Fix */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-blue-500" />
            <span>How to resolve on your computer:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1">
            <li>Right-click the clock in your Windows taskbar and select <strong>"Adjust date and time"</strong>.</li>
            <li>Toggle <strong>"Set time automatically"</strong> and <strong>"Set time zone automatically"</strong> to <strong>ON</strong>.</li>
            <li>Click <strong>"Sync now"</strong> under Synchronize your clock.</li>
            <li>Return here and click the <strong>"Re-Verify Time & Resume"</strong> button below.</li>
          </ol>
        </div>

        {verifyMessage && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold animate-in fade-in">
            {verifyMessage}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReVerify}
            disabled={isVerifying}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black tracking-wide uppercase transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying System Time...' : 'Re-Verify Time & Resume Software'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
