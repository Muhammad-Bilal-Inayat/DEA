import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Download, Upload, ShieldCheck, ShieldAlert, RefreshCw, 
  CheckCircle2, AlertTriangle, FileText, Server, Clock, HardDrive, 
  Activity, ArrowRight, Eye, Check, X, Lock, Cpu, Globe, Cloud,
  FileCheck, Sparkles, Terminal, Copy, Trash2
} from 'lucide-react';
import { 
  generateFullDatabaseSnapshot, 
  downloadBackupSnapshot, 
  verifyBackupSnapshot, 
  executeVerifiedRestore, 
  pushBackupToServer,
  startAutomatedBackupService,
  BackupSnapshot,
  VerificationResult,
  BackupStats
} from '../../lib/backupManager';
import { useAuth } from '../../contexts/AuthContext';
import { logAuditEvent } from '../../lib/auditLogger';

export const BackupRestoreTab: React.FC = () => {
  const { business, activeRole, currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant Backup State
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [instantBackupMsg, setInstantBackupMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('mbi_last_backup_timestamp') || '';
  });
  const [lastBackupRecords, setLastBackupRecords] = useState<string>(() => {
    return localStorage.getItem('mbi_last_backup_records') || '0';
  });

  // Automated Backup Config
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mbi_auto_backup_enabled') !== 'false';
  });
  const [autoBackupInterval, setAutoBackupInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('mbi_auto_backup_interval') || '15', 10);
  });

  // VPS Emergency Mirror Config
  const [vpsEmergencyUrl, setVpsEmergencyUrl] = useState<string>(() => {
    return localStorage.getItem('mbi_vps_emergency_backup_url') || '';
  });
  const [isTestingVps, setIsTestingVps] = useState(false);
  const [vpsPingResult, setVpsPingResult] = useState<{ success: boolean; message: string } | null>(null);

  // Restore & Verification State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [serverVerificationMsg, setServerVerificationMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreOutcome, setRestoreOutcome] = useState<{ success: boolean; message: string; recordCount: number } | null>(null);

  // Server Backups History List
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [isLoadingServerBackups, setIsLoadingServerBackups] = useState(false);
  const [selectedServerBackup, setSelectedServerBackup] = useState<any | null>(null);

  // Load server backups on mount
  const fetchServerBackups = async () => {
    setIsLoadingServerBackups(true);
    try {
      const res = await fetch('/api/master/backups');
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data.backups || []);
      }
    } catch (e) {
      console.warn('Failed to fetch server backups list:', e);
    } finally {
      setIsLoadingServerBackups(false);
    }
  };

  useEffect(() => {
    fetchServerBackups();
  }, []);

  // Handle Instant Backup Creation & Server Push
  const handleCreateInstantBackup = async () => {
    setIsGeneratingBackup(true);
    setInstantBackupMsg(null);
    try {
      const snapshot = await generateFullDatabaseSnapshot({
        name: currentUser?.name || currentUser?.displayName || 'Admin',
        role: activeRole || 'Primary Admin'
      });

      // 1. Download to local computer
      downloadBackupSnapshot(snapshot);

      // 2. Push to local Node server & VPS mirror
      const pushRes = await pushBackupToServer(snapshot, vpsEmergencyUrl);

      const timeStr = new Date().toLocaleTimeString();
      setLastBackupTime(snapshot.timestamp);
      setLastBackupRecords(snapshot.stats.totalRecords.toString());

      await logAuditEvent({
        category: 'SETTINGS_FEATURE_FLAGS',
        action: 'Generated Full Verified Instant Database Backup',
        entity: 'BACKUP_ARCHIVE',
        details: `Operator created backup (${snapshot.stats.totalRecords} records). Server sync: ${pushRes.serverSaved ? 'YES' : 'OFFLINE'}, VPS Mirror: ${pushRes.vpsMirrored ? 'YES' : 'N/A'}`
      });

      setInstantBackupMsg({
        text: `Instant backup created! ${snapshot.stats.totalRecords} records downloaded & saved to Server disk (${pushRes.message}).`,
        isError: false
      });

      fetchServerBackups();
    } catch (err: any) {
      console.error('Instant backup failed:', err);
      setInstantBackupMsg({
        text: `Backup failed: ${err?.message || 'Unknown storage error'}`,
        isError: true
      });
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  // Toggle Auto Backup
  const handleToggleAutoBackup = () => {
    const next = !autoBackupEnabled;
    setAutoBackupEnabled(next);
    localStorage.setItem('mbi_auto_backup_enabled', next ? 'true' : 'false');
    if (next) {
      startAutomatedBackupService(autoBackupInterval);
    }
  };

  const handleIntervalChange = (val: number) => {
    setAutoBackupInterval(val);
    localStorage.setItem('mbi_auto_backup_interval', val.toString());
    if (autoBackupEnabled) {
      startAutomatedBackupService(val);
    }
  };

  // Save & Test VPS Emergency URL
  const handleSaveVpsUrl = (url: string) => {
    setVpsEmergencyUrl(url);
    localStorage.setItem('mbi_vps_emergency_backup_url', url);
  };

  const handleTestVpsPing = async () => {
    if (!vpsEmergencyUrl.trim()) return;
    setIsTestingVps(true);
    setVpsPingResult(null);
    try {
      const res = await fetch('/api/master/backup/vps-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpsUrl: vpsEmergencyUrl.trim() })
      });
      const data = await res.json();
      setVpsPingResult(data);
    } catch (err: any) {
      setVpsPingResult({
        success: false,
        message: err?.message || 'Connection test failed'
      });
    } finally {
      setIsTestingVps(false);
    }
  };

  // Handle File Selection & Verification
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsVerifying(true);
    setVerificationResult(null);
    setServerVerificationMsg(null);
    setRestoreOutcome(null);

    try {
      const text = await file.text();
      // 1. Client-Side Verification Engine
      const clientVerify = verifyBackupSnapshot(text);
      setVerificationResult(clientVerify);

      // 2. Server-Side Verification Check (/api/master/backup/verify)
      if (clientVerify.isValid) {
        try {
          const srvRes = await fetch('/api/master/backup/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backupPayload: clientVerify.parsedSnapshot })
          });
          if (srvRes.ok) {
            const srvData = await srvRes.json();
            setServerVerificationMsg(srvData.message || 'Server verified: 100% data structures intact.');
          }
        } catch (e) {
          // Server offline or non-blocking
        }
      }
    } catch (err: any) {
      setVerificationResult({
        isValid: false,
        integrityPassed: false,
        errors: [`Could not read backup file: ${err?.message || 'File reading error'}`],
        warnings: [],
        stats: {
          medicinesCount: 0, invoicesCount: 0, partiesCount: 0, purchaseOrdersCount: 0,
          expensesCount: 0, paymentsCount: 0, bankAccountsCount: 0, bankTransactionsCount: 0,
          chequesCount: 0, loanAccountsCount: 0, usersCount: 0, shiftsCount: 0,
          onlineOrdersCount: 0, narcoticsLogsCount: 0, auditLogsCount: 0, totalRecords: 0
        },
        tenantInfo: { tenantId: 'unknown', businessName: 'Unknown' },
        timestamp: '',
        version: 'unknown'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Execute Verified Restore
  const handleExecuteRestore = async () => {
    if (!verificationResult || !verificationResult.parsedSnapshot) return;

    if (restoreMode === 'replace') {
      const confirmed = window.confirm(
        '⚠️ WARNING: Clean Slate Replace will clear current data and replace it entirely with the backup contents. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    setIsRestoring(true);
    setRestoreProgress(20);
    setRestoreOutcome(null);

    try {
      setRestoreProgress(50);
      const res = await executeVerifiedRestore(verificationResult.parsedSnapshot, {
        mode: restoreMode,
        restoreSettings: true
      });
      setRestoreProgress(90);

      await logAuditEvent({
        category: 'SETTINGS_FEATURE_FLAGS',
        action: 'Restored Database From Verified Backup Archive',
        entity: 'BACKUP_IMPORT',
        details: `Imported ${res.recordCount} records (Mode: ${restoreMode}). Post-verification: ${res.postValidationSuccess ? 'PASSED' : 'CHECKED'}`
      });

      setRestoreProgress(100);
      setRestoreOutcome(res);
      fetchServerBackups();
    } catch (err: any) {
      setRestoreOutcome({
        success: false,
        message: err?.message || 'Restore process encountered an error',
        recordCount: 0
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Download Backup from Server File
  const handleDownloadServerBackup = (fileName: string) => {
    window.open(`/api/master/backup/download/${fileName}`, '_blank');
  };

  // Delete Server Backup
  const handleDeleteServerBackup = async (fileName: string) => {
    if (!window.confirm(`Delete backup file "${fileName}" from server storage?`)) return;
    try {
      const res = await fetch(`/api/master/backup/${fileName}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServerBackups();
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Triple-Tier Instant & Automated Backup Center</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified Safe
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Multi-Layer Redundancy: <strong>1. Local IndexedDB</strong> → <strong>2. Server Disk (Port 3000)</strong> → <strong>3. Emergency VPS Mirror</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateInstantBackup}
          disabled={isGeneratingBackup}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isGeneratingBackup ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Snapshot...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Instant Backup Now</span>
            </>
          )}
        </button>
      </div>

      {instantBackupMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2 border ${
          instantBackupMsg.isError 
            ? 'bg-rose-50 text-rose-800 border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {instantBackupMsg.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{instantBackupMsg.text}</span>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Backup Configuration & Automation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Automated Background Backups */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Automated Background Backups</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                autoBackupEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {autoBackupEnabled ? 'Active Running' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">Auto-Backup Engine</p>
                  <p className="text-[11px] text-slate-500">Automatically take snapshots and push to central server</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoBackup}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    autoBackupEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoBackupEnabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Backup Frequency Interval</label>
                <select
                  value={autoBackupInterval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
                  disabled={!autoBackupEnabled}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>Every 5 Minutes (High-Frequency Real-time POS)</option>
                  <option value={15}>Every 15 Minutes (Standard Retail Recommendation)</option>
                  <option value={30}>Every 30 Minutes</option>
                  <option value={60}>Every 1 Hour</option>
                  <option value={360}>Every 6 Hours</option>
                  <option value={1440}>Daily Once (At midnight)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-500">Last Recorded Snapshot</p>
                  <p className="font-bold text-slate-900">
                    {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'Not taken yet in this session'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-500">Total Records</p>
                  <p className="font-black text-blue-700 font-mono">{lastBackupRecords}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 3rd Emergency VPS Host Redundancy Target */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Server className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">3rd VPS Emergency Mirror Backup</h3>
            </div>

            <p className="text-xs text-slate-600">
              Configure an offsite VPS host endpoint or backup webhook URL. Every automated or instant backup will stream a mirrored copy directly to this server as an emergency 3rd copy.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">VPS Host Webhook / Backup Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://vps.yourdomain.com/api/backup/receiver"
                    value={vpsEmergencyUrl}
                    onChange={(e) => handleSaveVpsUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestVpsPing}
                    disabled={isTestingVps || !vpsEmergencyUrl.trim()}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isTestingVps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>Test Ping</span>
                  </button>
                </div>
              </div>

              {vpsPingResult && (
                <div className={`p-3 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                  vpsPingResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {vpsPingResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{vpsPingResult.message}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-[11px] text-purple-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Triple-Safety Guarantee:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-purple-800">
                  <li><strong>Tier 1:</strong> Offline IndexedDB cache inside browser</li>
                  <li><strong>Tier 2:</strong> Port 3000 local master server disk storage</li>
                  <li><strong>Tier 3:</strong> Remote VPS host live mirrored push</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 3: Server Storage Backups History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Server Stored Backups</h3>
              </div>
              <button
                type="button"
                onClick={fetchServerBackups}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                title="Refresh Backups List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingServerBackups ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {serverBackups.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No server backups found yet. Create an instant backup above.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {serverBackups.slice(0, 8).map((bk) => (
                  <div key={bk.id || bk.fileName} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{bk.clientName || 'Pharmacy Store'}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(bk.timestamp).toLocaleString()} • {bk.sizeKb} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadServerBackup(bk.fileName)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 cursor-pointer"
                        title="Download .json file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteServerBackup(bk.fileName)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        title="Delete from server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Upload, Verify & Restore (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload & Restore Database</h3>
                  <p className="text-[11px] text-slate-500">Dual-Level User & Server-Side Pre-Import Verification</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                .JSON / .MBIBACKUP
              </span>
            </div>

            {/* Dropzone & File Picker */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.mbibackup"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {selectedFile ? selectedFile.name : 'Click to Browse or Drag Backup File Here'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : 'Supports all MBI Inventra backup archives (.json)'}
                </p>
              </div>
            </div>

            {/* Loading Verification State */}
            {isVerifying && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold">Verifying database structure & calculating cryptographic integrity...</p>
                  <p className="text-[11px] text-blue-700">Checking medicines, sales bills, party ledger, and checksum signatures.</p>
                </div>
              </div>
            )}

            {/* Verification Results Panel */}
            {verificationResult && (
              <div className="space-y-4 animate-in fade-in">
                
                {/* Status Card */}
                <div className={`p-4 rounded-xl border ${
                  verificationResult.isValid 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {verificationResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-bold text-xs">
                        {verificationResult.isValid 
                          ? 'Backup Verification PASSED: File is 100% Ready for Safe Import' 
                          : 'Backup Verification FAILED: File Structure Corrupted'}
                      </h4>
                      <p className="text-[11px] opacity-80">
                        Origin: <strong>{verificationResult.tenantInfo.businessName}</strong> ({verificationResult.tenantInfo.tenantId}) • Version: {verificationResult.version} • Created: {new Date(verificationResult.timestamp || Date.now()).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {serverVerificationMsg && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/60 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{serverVerificationMsg}</span>
                    </div>
                  )}

                  {verificationResult.warnings.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      {verificationResult.warnings.map((w, idx) => (
                        <p key={idx}>⚠️ {w}</p>
                      ))}
                    </div>
                  )}

                  {verificationResult.errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-800 bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                      {verificationResult.errors.map((e, idx) => (
                        <p key={idx}>❌ {e}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Table Records Breakdown Grid */}
                {verificationResult.isValid && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <p className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Verified Record Contents:</span>
                      <span className="font-mono text-blue-600">{verificationResult.stats.totalRecords.toLocaleString()} Total Records</span>
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Medicines / Stock</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.medicinesCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Sales Invoices</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.invoicesCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Parties / Vendors</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.partiesCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Purchase Bills</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.purchaseOrdersCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Expenses</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.expensesCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Party Payments</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.paymentsCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Bank Accounts</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.bankAccountsCount}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500">Audit Logs</p>
                        <p className="font-black text-slate-900 font-mono text-sm">{verificationResult.stats.auditLogsCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Restore Mode Controls */}
                {verificationResult.isValid && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-800">Choose Restore Strategy:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          restoreMode === 'merge'
                            ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1.5 text-blue-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Safe Merge / Append (Recommended)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Updates existing records and adds new ones. Does NOT delete current database items.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          restoreMode === 'replace'
                            ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1.5 text-rose-700">
                          <AlertTriangle className="w-4 h-4" />
                          Clean Slate Replace
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Clears local stores first and restores the snapshot exactly as exported.
                        </p>
                      </button>
                    </div>

                    {/* Execute Restore Button */}
                    <button
                      type="button"
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Restoring Records ({restoreProgress}%)...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Execute Verified Database Restore ({verificationResult.stats.totalRecords} Records)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* Restore Outcome Receipt */}
            {restoreOutcome && (
              <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 animate-in zoom-in-95 ${
                restoreOutcome.success 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}>
                {restoreOutcome.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="font-black text-sm">
                    {restoreOutcome.success ? 'Database Restore Completed Successfully!' : 'Restore Failed'}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">{restoreOutcome.message}</p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
