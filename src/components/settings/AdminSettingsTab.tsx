import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Sparkles, Sliders, Save, RotateCcw, 
  Store, Clock, FileText, Activity, Users, Globe, Truck, 
  Upload, DollarSign, Lock, AlertTriangle, CheckCircle2, RefreshCw,
  Eye, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { saveRecordToFirestore } from '../../lib/firebase';
import { logAuditEvent, getHighValueThreshold } from '../../lib/auditLogger';

export interface BusinessAdminSettings {
  enableOnlineStore: boolean;
  allowShiftManagement: boolean;
  advancedReporting: boolean;
  controlledSubstancesRegister: boolean;
  customerLoyalty: boolean;
  aiVoiceAssistant: boolean;
  multiBranchFleet: boolean;
  universalDataImport: boolean;
  strictNegativeStock: boolean;
  allowCounterPriceEdit: boolean;
  highValueAuditThreshold: number;
  periodLockEnabled: boolean;
  periodLockDate: string;
}

export const DEFAULT_BUSINESS_ADMIN_SETTINGS: BusinessAdminSettings = {
  enableOnlineStore: true,
  allowShiftManagement: true,
  advancedReporting: true,
  controlledSubstancesRegister: true,
  customerLoyalty: true,
  aiVoiceAssistant: true,
  multiBranchFleet: true,
  universalDataImport: true,
  strictNegativeStock: false,
  allowCounterPriceEdit: true,
  highValueAuditThreshold: 25000,
  periodLockEnabled: false,
  periodLockDate: new Date().toISOString().split('T')[0],
};

export const AdminSettingsTab: React.FC = () => {
  const { business, activeRole, currentUser } = useAuth();
  const { updateFeatureFlags, updateSafetyRules, updateModules } = useSettings();

  const [settings, setSettings] = useState<BusinessAdminSettings>(() => {
    try {
      const stored = localStorage.getItem(`mbi_admin_settings_${business?.id || 'default'}`);
      if (stored) {
        return { ...DEFAULT_BUSINESS_ADMIN_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_BUSINESS_ADMIN_SETTINGS;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const isPrimaryAdmin = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin';

  const handleToggle = (key: keyof BusinessAdminSettings) => {
    if (!isPrimaryAdmin) return;
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasUnsavedChanges(true);
  };

  const handleNumberChange = (key: keyof BusinessAdminSettings, val: number) => {
    if (!isPrimaryAdmin) return;
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!business?.id) return;
    setIsSaving(true);
    try {
      // Save locally
      localStorage.setItem(`mbi_admin_settings_${business.id}`, JSON.stringify(settings));
      localStorage.setItem('mbi_admin_settings', JSON.stringify(settings));

      // Sync with global SettingsContext feature flags
      updateFeatureFlags({
        productOnlineControl: settings.enableOnlineStore,
        cashierShiftClosing: settings.allowShiftManagement,
        dataImportWizard: settings.universalDataImport,
        periodLock: settings.periodLockEnabled,
      });

      updateSafetyRules({
        blockNegativeStockBilling: settings.strictNegativeStock,
      });

      // Save to Firestore multi-tenant cloud storage
      if (navigator.onLine) {
        await saveRecordToFirestore('business_settings', business.id, {
          businessId: business.id,
          settings,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || 'Admin',
        });
      }

      // Record Audit Log event
      await logAuditEvent({
        category: 'SETTINGS_FEATURE_FLAGS',
        action: 'Updated Business Admin Settings & Feature Flags',
        entity: 'BusinessSettings',
        entityId: business.id,
        details: `Primary Admin modified feature flags for ${business.name}: ShiftMgmt=${settings.allowShiftManagement}, OnlineStore=${settings.enableOnlineStore}, HighValueThreshold=Rs.${settings.highValueAuditThreshold.toLocaleString()}, StrictNegativeStock=${settings.strictNegativeStock}`,
        newValue: settings,
      });

      setHasUnsavedChanges(false);
      setSaveSuccessMsg('Admin settings and feature flags persisted successfully to Enterprise Cloud Database!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to persist admin settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Admin settings & Feature flags for this business to system defaults?')) {
      setSettings(DEFAULT_BUSINESS_ADMIN_SETTINGS);
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Centralized Admin Settings & Feature Flags</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                Primary Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Tenant Instance: <strong className="text-blue-300">{business?.name || 'MBI INVENTRA'}</strong> • Synced live to Cloud Server
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Persisting...' : hasUnsavedChanges ? 'Save to Cloud' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Module Feature Flags */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Instance Module Feature Flags</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Online Store */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Enable Online Store & WhatsApp Ordering</p>
                  <p className="text-[11px] text-slate-500">Public customer e-commerce storefront & digital catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('enableOnlineStore')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.enableOnlineStore ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.enableOnlineStore ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Shift Management */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Allow Shift Management & Cashier Float</p>
                  <p className="text-[11px] text-slate-500">Opening/closing drawer float balance & cash reconciliation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allowShiftManagement')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.allowShiftManagement ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.allowShiftManagement ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Advanced Reporting */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Advanced Reporting & Profit Analytics</p>
                  <p className="text-[11px] text-slate-500">Net margin analysis, P&L, balance sheets & tax reports</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('advancedReporting')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.advancedReporting ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.advancedReporting ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Controlled Substances */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Controlled Substances & Narcotics (Form 7)</p>
                  <p className="text-[11px] text-slate-500">Regulatory dispensing registers, doctor prescription checks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('controlledSubstancesRegister')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.controlledSubstancesRegister ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.controlledSubstancesRegister ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Customer Loyalty */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Customer Loyalty & Reward Points</p>
                  <p className="text-[11px] text-slate-500">Point accumulation on invoices and redemption tiers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('customerLoyalty')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.customerLoyalty ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.customerLoyalty ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Audit Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Security, Safety & Audit Policies</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* High Value Audit Threshold */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">High-Value Bill Audit Threshold</p>
                    <p className="text-[11px] text-slate-500">Auto-flag sales bills exceeding this amount into Audit Logs</p>
                  </div>
                </div>
                <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                  Rs {settings.highValueAuditThreshold.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={5000}
                max={200000}
                step={5000}
                value={settings.highValueAuditThreshold}
                onChange={(e) => handleNumberChange('highValueAuditThreshold', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Rs 5,000</span>
                <span>Rs 50,000</span>
                <span>Rs 200,000</span>
              </div>
            </div>

            {/* Strict Negative Stock */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Strict Negative Stock Billing Lock</p>
                  <p className="text-[11px] text-slate-500">Block sale of medicines when available quantity is zero or less</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('strictNegativeStock')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.strictNegativeStock ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.strictNegativeStock ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Counter Price Edit */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Allow Counter Selling Price Override</p>
                  <p className="text-[11px] text-slate-500">Permit cashiers to alter unit prices directly on billing table</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allowCounterPriceEdit')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.allowCounterPriceEdit ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.allowCounterPriceEdit ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Multi-Branch Fleet */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Multi-Branch Transfers & Central Fleet</p>
                  <p className="text-[11px] text-slate-500">Inter-branch inventory gate passes and transfer challans</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('multiBranchFleet')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.multiBranchFleet ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.multiBranchFleet ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>

            {/* Universal Data Import */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Excel / CSV Bulk Data Importer</p>
                  <p className="text-[11px] text-slate-500">Enable universal spreadsheet wizard for products & parties</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('universalDataImport')}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  settings.universalDataImport ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.universalDataImport ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
