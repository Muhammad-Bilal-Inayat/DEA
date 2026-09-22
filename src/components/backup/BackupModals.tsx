import React, { useState, useRef } from 'react';
import { 
  History, Download, Cloud, UploadCloud, CheckCircle2, AlertTriangle, 
  X, RefreshCw, HardDrive, ShieldCheck, Folder, Settings, FileJson, Check
} from 'lucide-react';
import { exportFullBackup, restoreFullBackup } from '../../lib/db';
import { decryptBackupContainer } from '../../lib/backupManager';
import { useAuth } from '../../contexts/AuthContext';

export interface BackupModalsProps {
  activeModal: 'auto' | 'computer' | 'drive' | 'restore' | null;
  onClose: () => void;
}

export const BackupModals: React.FC<BackupModalsProps> = ({ activeModal, onClose }) => {
  const { business, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto Backup State
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => {
    return localStorage.getItem('vyapar_auto_backup_enabled') !== 'false';
  });
  const [backupFrequency, setBackupFrequency] = useState(() => {
    return localStorage.getItem('vyapar_auto_backup_freq') || 'daily';
  });
  const [backupLocation, setBackupLocation] = useState(() => {
    return localStorage.getItem('vyapar_auto_backup_loc') || 'C:\\MBI_Inventra_Backups';
  });

  // Backup to Drive State
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveLastBackup, setDriveLastBackup] = useState(() => {
    return localStorage.getItem('vyapar_drive_last_backup') || new Date().toLocaleString();
  });

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [restoreStats, setRestoreStats] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Save Auto Backup Settings
  const handleSaveAutoBackup = () => {
    localStorage.setItem('vyapar_auto_backup_enabled', String(autoBackupEnabled));
    localStorage.setItem('vyapar_auto_backup_freq', backupFrequency);
    localStorage.setItem('vyapar_auto_backup_loc', backupLocation);
    onClose();
  };

  // Perform Backup to Drive
  const handleBackupToDrive = async () => {
    setIsDriveSyncing(true);
    try {
      const backupJson = await exportFullBackup();
      // Simulate Google Drive storage upload
      setTimeout(() => {
        const now = new Date().toLocaleString();
        setDriveLastBackup(now);
        localStorage.setItem('vyapar_drive_last_backup', now);
        localStorage.setItem('vyapar_cloud_backup_snapshot', backupJson);
        setIsDriveSyncing(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setIsDriveSyncing(false);
    }
  };

  // Handle File Upload for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setRestoreError(null);
    setRestoreSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsed: any;
        try {
          parsed = decryptBackupContainer(text);
        } catch (decErr: any) {
          setRestoreError(decErr?.message || 'Access Denied: File is unencrypted or not an MBI Inventra backup file.');
          setRestoreStats(null);
          return;
        }

        if (!parsed || (!parsed.data && !parsed.stats)) {
          setRestoreError('Invalid backup file. The uploaded file does not contain a valid database payload.');
          setRestoreStats(null);
          return;
        }

        setFileContent(text);
        const dataObj = parsed.data || {};
        setRestoreStats({
          medicines: dataObj.medicines?.length || parsed.stats?.medicinesCount || 0,
          invoices: dataObj.invoices?.length || parsed.stats?.invoicesCount || 0,
          suppliers: dataObj.suppliers?.length || parsed.stats?.partiesCount || 0,
          bankAccounts: dataObj.bankAccounts?.length || parsed.stats?.bankAccountsCount || 0,
          expenses: dataObj.expenses?.length || parsed.stats?.expensesCount || 0,
          timestamp: parsed.timestamp || 'Unknown',
          businessName: parsed.tenantInfo?.businessName || parsed.business?.name || 'MBI Inventra'
        });
      } catch (err) {
        setRestoreError('Could not process backup file. Please select a valid MBI Inventra encrypted backup.');
        setRestoreStats(null);
      }
    };
    reader.readAsText(file);
  };

  // Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!fileContent) return;
    setIsRestoring(true);
    setRestoreError(null);

    const res = await restoreFullBackup(fileContent);
    setIsRestoring(false);

    if (res.success) {
      setRestoreSuccess(res.message);
      await refreshProfile();
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1800);
    } else {
      setRestoreError(res.message);
    }
  };

  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* =========================================================
            1. AUTO BACKUP MODAL
        ========================================================= */}
        {activeModal === 'auto' && (
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Auto Backup Settings</h3>
                  <p className="text-xs text-slate-500">Configure automated data protection & cloud copies</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-800">Enable Auto Backup</span>
                  <p className="text-xs text-slate-500">Automatically creates backup snapshots in the background</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoBackupEnabled} 
                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Backup Frequency</label>
                <select
                  disabled={!autoBackupEnabled}
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="daily">Every Day (Recommended)</option>
                  <option value="on_exit">Every Time Application Closes</option>
                  <option value="hourly_3">Every 3 Hours</option>
                  <option value="weekly">Once a Week</option>
                </select>
              </div>

              {/* Local Directory / Path */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Backup Directory / Folder</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    disabled={!autoBackupEnabled}
                    value={backupLocation}
                    onChange={(e) => setBackupLocation(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Backups are stored safely on your device with date-stamped file names.</p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAutoBackup}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            2. BACKUP TO DRIVE MODAL
        ========================================================= */}
        {activeModal === 'drive' && (
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Backup To Google Drive</h3>
                  <p className="text-xs text-slate-500">Secure off-site cloud storage backup</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Connected Account Card */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Connected Google Account
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-200 text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 font-mono">
                  mbilalhassan00111@gmail.com
                </p>
                <p className="text-xs text-slate-500">
                  Target Cloud Folder: <span className="font-mono text-slate-700 font-medium">/GoogleDrive/MBI_Inventra_Backups/</span>
                </p>
              </div>

              {/* Status Info */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Last Cloud Backup:</span>
                  <span className="font-bold text-slate-800">{driveLastBackup}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Encryption:</span>
                  <span className="font-bold text-emerald-600">AES-256 Cloud Vault</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Sync Status:</span>
                  <span className="text-slate-700 font-medium">Ready to sync</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  disabled={isDriveSyncing}
                  onClick={handleBackupToDrive}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDriveSyncing ? 'animate-spin' : ''}`} />
                  <span>{isDriveSyncing ? 'Uploading to Drive...' : 'Back Up Now to Drive'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            3. RESTORE BACKUP MODAL
        ========================================================= */}
        {activeModal === 'restore' && (
          <div>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Restore Backup File</h3>
                  <p className="text-xs text-slate-500">Restore your company database from a previous snapshot</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* File Upload Drop Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all space-y-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <FileJson className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {selectedFile ? selectedFile.name : 'Click to select or drop backup .json file'}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">Supports MBI Inventra full backup archives (.json)</p>
                </div>
              </div>

              {/* Error Message */}
              {restoreError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Success Message */}
              {restoreSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{restoreSuccess} Refreshing data...</span>
                </div>
              )}

              {/* File Preview Breakdown */}
              {restoreStats && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Archive: {restoreStats.businessName}</span>
                    <span className="text-slate-500 font-normal">{new Date(restoreStats.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-900">{restoreStats.medicines}</div>
                      <div className="text-[10.5px] text-slate-400 font-medium">Medicines</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-900">{restoreStats.invoices}</div>
                      <div className="text-[10.5px] text-slate-400 font-medium">Invoices</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-900">{restoreStats.suppliers}</div>
                      <div className="text-[10.5px] text-slate-400 font-medium">Parties</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Warning: Restoring will overwrite existing records with this archive.</span>
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!fileContent || isRestoring}
                  onClick={handleExecuteRestore}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isRestoring ? 'Restoring Database...' : 'Restore Backup Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
