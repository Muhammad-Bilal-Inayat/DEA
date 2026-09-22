import React, { useState, useRef } from 'react';
import { 
  Info, Lock, Building2, Plus, Edit2, Trash2, CheckCircle2, 
  RotateCcw, ShieldCheck, Database, Calendar, DollarSign, FileText,
  Download, Upload, AlertCircle, Sparkles, RefreshCw, Sun, Moon, Monitor, Coins
} from 'lucide-react';
import { useSettings, Firm } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  generateFullDatabaseSnapshot, 
  downloadBackupSnapshot, 
  restoreDatabaseFromBackup,
  BackupSnapshot 
} from '../../lib/backupManager';
import { AccountUsageService, TenantUsageInfo } from '../../lib/accountUsageService';
import { UpgradePlanModal } from '../pricing/UpgradePlanModal';

export const GeneralTab: React.FC = () => {
  const { 
    settings, 
    theme, 
    isDarkMode, 
    toggleTheme, 
    setTheme, 
    updateGeneral, 
    addFirm, 
    updateFirm, 
    deleteFirm, 
    setDefaultFirm 
  } = useSettings();
  const { business } = useAuth();

  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [passcodeVal, setPasscodeVal] = useState(settings.general.passcode || '');
  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeUsageInfo, setUpgradeUsageInfo] = useState<TenantUsageInfo | null>(null);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [firmForm, setFirmForm] = useState({
    name: '',
    address: '',
    phone: '',
    gstin: '',
    email: '',
    isDefault: false,
  });

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAddFirm = async () => {
    const tenantId = settings?.general?.firms?.[0]?.name || 'default-tenant';
    const limitCheck = await AccountUsageService.checkLimitBeforeAction(tenantId, 'firms');
    
    if (!limitCheck.allowed) {
      setUpgradeUsageInfo(limitCheck.usage);
      setIsUpgradeModalOpen(true);
      return;
    }

    setEditingFirm(null);
    setFirmForm({
      name: '',
      address: '',
      phone: '',
      gstin: '',
      email: '',
      isDefault: settings.general.firms.length === 0,
    });
    setIsFirmModalOpen(true);
  };

  const handleOpenEditFirm = (firm: Firm) => {
    setEditingFirm(firm);
    setFirmForm({
      name: firm.name,
      address: firm.address || '',
      phone: firm.phone || '',
      gstin: firm.gstin || '',
      email: firm.email || '',
      isDefault: firm.isDefault,
    });
    setIsFirmModalOpen(true);
  };

  const handleSaveFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firmForm.name.trim()) return;

    if (editingFirm) {
      updateFirm(editingFirm.id, firmForm);
      showToast(`Firm "${firmForm.name}" updated successfully!`);
      setIsFirmModalOpen(false);
    } else {
      const tenantId = settings?.general?.firms?.[0]?.name || 'default-tenant';
      const limitCheck = await AccountUsageService.checkLimitBeforeAction(tenantId, 'firms');
      if (!limitCheck.allowed) {
        setIsFirmModalOpen(false);
        setUpgradeUsageInfo(limitCheck.usage);
        setIsUpgradeModalOpen(true);
        return;
      }

      addFirm(firmForm);
      AccountUsageService.incrementUsage(tenantId, 'firms').catch(() => {});
      showToast(`New Firm "${firmForm.name}" added successfully!`);
      setIsFirmModalOpen(false);
    }
  };

  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackupFile = async () => {
    setIsExportingBackup(true);
    try {
      const snapshot = await generateFullDatabaseSnapshot();
      downloadBackupSnapshot(snapshot);
      const now = new Date();
      const formatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} | ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      updateGeneral({ lastBackupDate: formatted });
      showToast(`Downloaded backup (${snapshot.stats.totalRecords} records across all collections)!`);
    } catch (err: any) {
      console.error('Backup generation error:', err);
      showToast('Failed to generate backup JSON snapshot.');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Restore database from "${file.name}"? Existing data records will be synchronized with the snapshot.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoringBackup(true);
    try {
      const text = await file.text();
      const result = await restoreDatabaseFromBackup(text);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast(`Restore warning: ${result.message}`);
      }
    } catch (err: any) {
      console.error('Failed to read restore file:', err);
      showToast('Invalid backup file. Please select a valid MBI Inventra JSON backup.');
    } finally {
      setIsRestoringBackup(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualBackup = () => {
    handleDownloadBackupFile();
  };

  return (
    <div className="space-y-6 text-slate-800 text-[13px] relative">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 3 Column Grid as in Vyapar screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Application & More Transactions */}
        <div className="space-y-6">

          {/* Night Shift & Global Theme Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase flex items-center gap-1.5">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>Theme & Night Shift</span>
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isDarkMode 
                  ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isDarkMode ? '🌙 Night Shift Active' : '☀️ Day Mode Active'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Switch between daylight and dark eye-safe theme for comfortable billing during late night shifts.
            </p>

            {/* 3-Way Segmented Theme Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  showToast('☀️ Switched to Light Day Mode');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  showToast('🌙 Switched to Dark Night Shift Mode');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-white' : 'text-slate-400'}`} />
                <span>Night</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('system');
                  showToast('💻 Switched to System Auto Theme');
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className={`w-3.5 h-3.5 ${theme === 'system' ? 'text-blue-500' : 'text-slate-400'}`} />
                <span>Auto</span>
              </button>
            </div>

            {/* Quick 1-Click Toggle Button */}
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                showToast(isDarkMode ? '☀️ Switched to Light Day Mode' : '🌙 Switched to Dark Night Shift Mode');
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Switch to Daylight Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span>Switch to Night Shift (Dark Mode)</span>
                </>
              )}
            </button>
          </div>
          
          {/* Application Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>Application</span>
              <span className="text-[10px] text-blue-600 font-normal">Core System</span>
            </h3>

            {/* Passcode */}
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.enablePasscode}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateGeneral({ enablePasscode: checked });
                    if (checked && !settings.general.passcode) {
                      setIsPasscodeModalOpen(true);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-medium text-slate-800">Enable Passcode</span>
              </label>
              <div className="flex items-center gap-1.5">
                {settings.general.enablePasscode && (
                  <button
                    onClick={() => setIsPasscodeModalOpen(true)}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    Change PIN
                  </button>
                )}
                <span title="Protects application opening with a 4-digit security PIN"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
            </div>

            {/* Enable QR / Barcode Scanner Button */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.enableQrScanner ?? true}
                  onChange={(e) => updateGeneral({ enableQrScanner: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-medium text-slate-800">Enable QR / Barcode Scanner</span>
              </label>
              <span title="Show camera barcode/QR scanner button in item search input"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-700 text-xs">Business Currency</label>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-company-profile'))}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span>Manage Multi-Currency & Rates</span>
                </button>
              </div>
              <select
                value={settings.general.currency}
                onChange={(e) => {
                  const val = e.target.value;
                  let symbol = 'Rs.';
                  if (val.includes('$')) symbol = '$';
                  else if (val.includes('€')) symbol = '€';
                  else if (val.includes('£')) symbol = '£';
                  else if (val.includes('AED')) symbol = 'AED';
                  else if (val.includes('SAR')) symbol = 'SAR';
                  updateGeneral({ currency: val, currencySymbol: symbol });
                  showToast(`Currency updated to ${val}`);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PKR (Rs.)">PKR (Rs.) - Pakistani Rupee</option>
                <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                <option value="USD ($)">USD ($) - US Dollar</option>
                <option value="EUR (€)">EUR (€) - Euro</option>
                <option value="GBP (£)">GBP (£) - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="SAR">SAR - Saudi Riyal</option>
              </select>
            </div>

            {/* Decimal places */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-700 text-xs">Amount (upto Decimal Places)</span>
                <span title="Precision for billing figures and totals"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              <select
                value={settings.general.decimalPlaces}
                onChange={(e) => updateGeneral({ decimalPlaces: Number(e.target.value) })}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>0 (e.g. 100)</option>
                <option value={1}>1 (e.g. 100.0)</option>
                <option value={2}>2 (e.g. 100.00)</option>
                <option value={3}>3 (e.g. 100.000)</option>
              </select>
            </div>

            {/* TIN Number */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.general.tinNumber}
                    onChange={(e) => updateGeneral({ tinNumber: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800">TIN / NTN Number</span>
                </label>
                <span title="Taxpayer Identification / National Tax Number"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>
              {settings.general.tinNumber && (
                <input
                  type="text"
                  placeholder="e.g. PK-NTN-4928172-9"
                  value={settings.general.tinValue}
                  onChange={(e) => updateGeneral({ tinValue: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          {/* More Transactions Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>More Transactions</span>
              <span className="text-[10px] text-blue-600 font-normal">Active Modules</span>
            </h3>

            {/* Estimate/Quotation */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.estimateQuotation}
                  onChange={(e) => updateGeneral({ estimateQuotation: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Estimate / Quotation</span>
              </label>
              <span title="Enables Quotation creation in Sale menu"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Sale/Purchase Order */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.salePurchaseOrder}
                  onChange={(e) => updateGeneral({ salePurchaseOrder: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Sale / Purchase Order</span>
              </label>
              <span title="Enable booking orders before converting to invoices"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Other Income */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.otherIncome}
                  onChange={(e) => updateGeneral({ otherIncome: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Other Income</span>
              </label>
              <span title="Track interest, commission, scrap sales, rent income"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Fixed Assets */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.fixedAssets}
                  onChange={(e) => updateGeneral({ fixedAssets: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-slate-800 font-medium">Fixed Assets (FA)</span>
              </label>
              <span title="Track machinery, vehicles, furniture, computers and depreciation"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {/* Delivery Challan */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.general.deliveryChallan}
                    onChange={(e) => updateGeneral({ deliveryChallan: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-slate-800 font-medium">Delivery Challan</span>
                </label>
                <span title="Dispatch goods on approval or transport challan"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
              </div>

              {settings.general.deliveryChallan && (
                <div className="pl-6 space-y-2 text-xs border-l-2 border-blue-100 ml-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.general.deliveryChallanReturn}
                        onChange={(e) => updateGeneral({ deliveryChallanReturn: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Goods return on Delivery Challan</span>
                    </label>
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.general.deliveryChallanPrintAmount}
                        onChange={(e) => updateGeneral({ deliveryChallanPrintAmount: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">Print amount in Delivery Challan</span>
                    </label>
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Column 2: Multi Firm */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.multiFirm}
                  onChange={(e) => updateGeneral({ multiFirm: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500">
                  Multi Firm
                </span>
              </label>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {settings.general.firms.length} Firms
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Maintain separate books, inventories, and invoices for multiple sister companies or brand branches.
            </p>

            {/* List of Firms */}
            <div className="space-y-2.5">
              {settings.general.firms.map((firm) => (
                <div
                  key={firm.id}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                    firm.isDefault
                      ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="radio"
                      name="default_firm"
                      checked={firm.isDefault}
                      onChange={() => {
                        setDefaultFirm(firm.id);
                        showToast(`"${firm.name}" is now the active default firm`);
                      }}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs uppercase truncate">
                          {firm.name}
                        </span>
                        {firm.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9.5px] font-black uppercase tracking-wider">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      {firm.address && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{firm.address}</p>
                      )}
                      {firm.gstin && (
                        <p className="text-[10.5px] text-slate-400 mt-0.5">NTN/GST: {firm.gstin}</p>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleOpenEditFirm(firm)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                      title="Edit Firm Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {settings.general.firms.length > 1 && !firm.isDefault && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete firm "${firm.name}"?`)) {
                            deleteFirm(firm.id);
                            showToast('Firm deleted');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                        title="Delete Firm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Firm Button */}
            <button
              onClick={handleOpenAddFirm}
              className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Firm / Company</span>
            </button>
          </div>
        </div>

        {/* Column 3: Backup & Data Safety */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase text-slate-500">
                Backup & Disaster Recovery
              </h3>
              <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                JSON Snapshot
              </span>
            </div>

            {/* Auto Backup Toggle */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.general.autoBackup}
                  onChange={(e) => updateGeneral({ autoBackup: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">Auto Backup</span>
              </label>
              <span title="Automatically creates local snapshots and encrypted backups"><Info className="w-3.5 h-3.5 text-slate-400" /></span>
            </div>

            {settings.general.autoBackup && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Backup Frequency:</span>
                  <select
                    value={settings.general.autoBackupFrequency}
                    onChange={(e: any) => updateGeneral({ autoBackupFrequency: e.target.value })}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  >
                    <option value="daily">Daily (Every Evening)</option>
                    <option value="weekly">Weekly</option>
                    <option value="onClose">On Application Close</option>
                  </select>
                </div>
              </div>
            )}

            {/* Last Backup Info */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase">Last Backup Snapshot</span>
                  <Info className="w-3 h-3 text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-slate-800">{settings.general.lastBackupDate || 'Never generated'}</p>
                <p className="text-[11px] text-emerald-700">IndexedDB local database snapshot secured with timestamped metadata</p>
              </div>
            </div>

            {/* Main Action: Download JSON Backup File */}
            <button
              type="button"
              onClick={handleDownloadBackupFile}
              disabled={isExportingBackup}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isExportingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating JSON Snapshot...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup File (.json)</span>
                </>
              )}
            </button>

            {/* Restore from File */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoringBackup}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>{isRestoringBackup ? 'Restoring Snapshot...' : 'Restore from Backup File'}</span>
              </button>
            </div>
          </div>

          {/* Quick Stats / System Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>System & Environment</span>
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Version:</span>
                <span className="font-bold text-slate-800">MBI Inventra v4.2.0 Enterprise</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Mode:</span>
                <span className="font-bold text-emerald-600">Online & Offline Sync Ready</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Business Type:</span>
                <span className="font-bold text-slate-800">{business?.businessType || 'General Wholesale & Retail'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Passcode Modal */}
      {isPasscodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Application Passcode</h3>
                <p className="text-xs text-slate-500">Enter a 4-6 digit security PIN</p>
              </div>
            </div>

            <input
              type="password"
              maxLength={6}
              placeholder="Enter PIN (e.g. 1234)"
              value={passcodeVal}
              onChange={(e) => setPasscodeVal(e.target.value)}
              className="w-full text-center tracking-widest text-xl font-bold py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasscodeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateGeneral({ passcode: passcodeVal, enablePasscode: !!passcodeVal });
                  setIsPasscodeModalOpen(false);
                  showToast('Passcode updated successfully');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Save PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firm Add/Edit Modal */}
      {isFirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingFirm ? 'Edit Firm / Company' : 'Add New Firm / Company'}
                </h3>
                <p className="text-xs text-slate-500">Configure business identity and tax credentials</p>
              </div>
            </div>

            <form onSubmit={handleSaveFirm} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Company / Firm Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MBI INVENTRA MAIN BRANCH"
                  value={firmForm.name}
                  onChange={(e) => setFirmForm({ ...firmForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop # 14, Main Medical Complex"
                  value={firmForm.address}
                  onChange={(e) => setFirmForm({ ...firmForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="03364585863"
                    value={firmForm.phone}
                    onChange={(e) => setFirmForm({ ...firmForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NTN / GST Number</label>
                  <input
                    type="text"
                    placeholder="PK-NTN-4928172"
                    value={firmForm.gstin}
                    onChange={(e) => setFirmForm({ ...firmForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="firm@mbinventra.com"
                  value={firmForm.email}
                  onChange={(e) => setFirmForm({ ...firmForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFirmModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Save Firm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentPlan={upgradeUsageInfo?.plan || 'Basic'}
          reason="You have reached the maximum firm / branch limit for your current subscription plan. Upgrade to unlock additional pharmacy firms."
        />
      )}

    </div>
  );
};
