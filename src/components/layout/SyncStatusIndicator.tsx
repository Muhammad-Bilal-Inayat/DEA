import React, { useState } from 'react';
import { 
  Cloud, RefreshCw, CheckCircle2, 
  Wifi, WifiOff, Database, ArrowUpCircle
} from 'lucide-react';
import { useFirebaseSyncStatus } from '../../lib/firebaseSync';

export const SyncStatusIndicator: React.FC = () => {
  const { state, pendingCount, lastSyncTime, isOnline, triggerRetry, pullFromCloud } = useFirebaseSyncStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setFeedback(null);
    try {
      const res = await triggerRetry();
      if (res.error) {
        setFeedback(isOnline ? 'Cloud sync error. Background retry scheduled.' : 'Device is offline. Changes are saved locally.');
      } else {
        setFeedback(res.totalPulled > 0 ? `Synced! Pulled ${res.totalPulled} cloud records.` : 'All items are 100% synchronized with Firebase.');
      }
    } catch (err: any) {
      setFeedback('Sync failed. Will retry automatically.');
    } finally {
      setIsRetrying(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return 'Not yet synced';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const isPending = pendingCount > 0 || state === 'unsynced';
  const isSyncing = state === 'syncing' || isRetrying;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer select-none shadow-2xs ${
          !isOnline
            ? 'bg-amber-50/90 text-amber-900 border-amber-300/90 hover:bg-amber-100 hover:border-amber-400'
            : isSyncing
            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
            : isPending
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-amber-100'
            : 'bg-emerald-50/90 text-emerald-900 border-emerald-300/90 hover:bg-emerald-100 hover:border-emerald-400 shadow-emerald-100'
        }`}
        title="Firebase Cloud Database Synchronization Status - Click for details"
      >
        {/* Pulsing Dot Indicator */}
        <div className="relative flex h-2.5 w-2.5 items-center justify-center">
          {!isOnline ? (
            <>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </>
          ) : isSyncing ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </>
          ) : isPending ? (
            <>
              {/* Amber Pulsing Dot */}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-85" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-xs shadow-amber-400/50" />
            </>
          ) : (
            <>
              {/* Green Pulsing Dot */}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 shadow-xs shadow-emerald-500/50" />
            </>
          )}
        </div>

        {/* Text & Icon Status */}
        {!isOnline ? (
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-amber-700" />
            <span className="font-bold">Offline</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-200 text-amber-950 rounded-full text-[9px] font-black">
                {pendingCount}
              </span>
            )}
          </div>
        ) : isSyncing ? (
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            <span className="font-bold text-blue-700">Syncing...</span>
          </div>
        ) : isPending ? (
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3 h-3 text-amber-600" />
            <span className="font-bold text-amber-800">
              {pendingCount} Pending
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span className="font-bold text-emerald-800 hidden sm:inline">Firebase Synced</span>
            <span className="font-bold text-emerald-800 sm:hidden">Synced</span>
          </div>
        )}
      </button>

      {/* Popover Details on Click */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="absolute right-0 top-full mt-2 w-76 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150 select-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">Firebase Cloud Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex h-2 w-2 items-center justify-center">
                  {isPending ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </>
                  ) : !isOnline ? (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  ) : (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  !isOnline ? 'bg-amber-100 text-amber-800' :
                  isSyncing ? 'bg-blue-100 text-blue-800' :
                  isPending ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {!isOnline ? 'Offline Mode' : isSyncing ? 'Syncing...' : isPending ? `${pendingCount} Pending Push` : '100% Cloud Synced'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-slate-400" />
                  Network Connection:
                </span>
                <span className={`font-bold flex items-center gap-1 ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isOnline ? 'Connected (Online)' : 'Disconnected (Offline)'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ArrowUpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Pending Cloud Changes:
                </span>
                <span className={`font-bold font-mono px-1.5 py-0.2 rounded ${pendingCount > 0 ? 'bg-amber-100 text-amber-900' : 'text-slate-800'}`}>
                  {pendingCount} {pendingCount === 1 ? 'record' : 'records'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  Last Cloud Synchronization:
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatTime(lastSyncTime)}
                </span>
              </div>

              {feedback && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] font-semibold animate-in fade-in flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-500 leading-relaxed">
                {!isOnline 
                  ? 'Offline protection active. All transactions are securely stored locally on this machine and will auto-push to Firebase the moment connection resumes.' 
                  : 'Real-time bidirectional Firebase listeners are active. Invoices, medicines, and ledgers automatically sync across devices and tabs.'}
              </div>
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isRetrying || !isOnline}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer ${
                  !isOnline 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Synchronizing with Cloud...' : 'Force Sync & Pull Latest'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
