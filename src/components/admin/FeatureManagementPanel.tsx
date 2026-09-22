import React, { useState } from 'react';
import { 
  Sliders, Search, Sparkles, CheckCircle2, XCircle, 
  RotateCcw, Shield, ShoppingCart, Activity, Lock, 
  AlertTriangle, Check, Layers, Cpu, Cloud, Database
} from 'lucide-react';
import { PlatformFeatureSettings } from '../../types';
import { useFeatureToggle } from '../../hooks/useFeatureToggle';
import { PlatformSettingsService } from '../../lib/platformSettingsService';

interface FeatureMeta {
  key: keyof PlatformFeatureSettings;
  label: string;
  description: string;
  category: 'pos_sales' | 'finance_stock' | 'security_core';
  badge?: string;
}

const FEATURE_DEFINITIONS: FeatureMeta[] = [
  // POS & Sales
  {
    key: 'onlineStore',
    label: 'Online Storefront & Direct Ordering',
    description: 'Enables customer-facing web catalog, mobile e-prescriptions, and direct online pickup cart.',
    category: 'pos_sales',
    badge: 'E-Commerce',
  },
  {
    key: 'barcodeScanner',
    label: 'High-Speed Barcode / QR Scanner',
    description: 'Hardware USB & camera-based real-time medicine barcode lookup and checkout.',
    category: 'pos_sales',
  },
  {
    key: 'controlledDrugsSchedule',
    label: 'Controlled Substance / Form 9 Register',
    description: 'Mandatory narcotic and psychotropic drug record keeping with doctor prescription validation.',
    category: 'pos_sales',
    badge: 'Regulatory',
  },
  {
    key: 'cashierShiftManagement',
    label: 'Cashier Shifts & Float Management',
    description: 'Enforces shift opening cash counts, mid-day drops, and end-of-day register reconciliation.',
    category: 'pos_sales',
  },
  {
    key: 'customerLoyaltyLedger',
    label: 'Customer Loyalty Points & Credit Ledger',
    description: 'Allows reward points accumulation, customer khata credit tracking, and WhatsApp balance alerts.',
    category: 'pos_sales',
  },
  {
    key: 'bulkExcelImportExport',
    label: 'Bulk Excel / CSV Catalog Import & Export',
    description: 'Batch upload thousands of medicine records, wholesale price lists, and customer profiles.',
    category: 'pos_sales',
  },

  // Financials & Stock
  {
    key: 'profitAndLossReports',
    label: 'Profit & Loss Financial Statement Generator',
    description: 'Real-time COGS accounting, net revenue tracking, overhead expense deductions, and margins.',
    category: 'finance_stock',
    badge: 'Financials',
  },
  {
    key: 'batchExpiryTracking',
    label: 'Batch-Level Expiry Alert Engine',
    description: 'Automatic quarantine of expired stock and color-coded near-expiry shelf warnings.',
    category: 'finance_stock',
    badge: 'Critical',
  },
  {
    key: 'multiWarehouseSync',
    label: 'Multi-Warehouse & Rack Bin Routing',
    description: 'Track stock across multiple storage rooms, godowns, and distributor warehouses.',
    category: 'finance_stock',
  },
  {
    key: 'supplierIntelligence',
    label: 'Supplier Intelligence & Rate Comparison',
    description: 'Auto-suggests cheapest verified distributor for medicine re-orders and purchase orders.',
    category: 'finance_stock',
  },
  {
    key: 'autoDemandForecast',
    label: 'Automated Demand & Reorder Forecaster',
    description: 'AI statistical prediction of seasonal flu and antibiotic demand spikes.',
    category: 'finance_stock',
    badge: 'AI Smart',
  },
  {
    key: 'warrantyManagement',
    label: 'Medical Device Serial & Warranty Tracker',
    description: 'Track warranty periods and serial numbers for nebulizers, BP monitors, and glucometers.',
    category: 'finance_stock',
  },

  // Security & Core Infrastructure
  {
    key: 'cloudSync',
    label: 'Continuous Cloud Firestore Multi-Device Sync',
    description: 'Real-time bidirectional synchronization between offline POS terminals and cloud database.',
    category: 'security_core',
    badge: 'Core Infra',
  },
  {
    key: 'emergencyLockdown',
    label: 'Global Emergency Remote Lockdown',
    description: 'Instantly locks client terminals in case of critical breach or unauthorized distributor redistribution.',
    category: 'security_core',
    badge: 'Killswitch',
  },
  {
    key: 'multiCurrency',
    label: 'Multi-Currency & International Exchange Support',
    description: 'Support for PKR, USD, AED, SAR, and EUR with auto-calculated exchange rates.',
    category: 'security_core',
  },
  {
    key: 'twoFactorAuth',
    label: 'Mandatory RFC 6238 2FA Authentication',
    description: 'Requires Google Authenticator / TOTP verification for all managerial and admin logins.',
    category: 'security_core',
    badge: 'Security',
  },
  {
    key: 'auditTrail',
    label: 'Immutable Multi-Tenant Audit Trail',
    description: 'Cryptographically records every invoice deletion, stock adjustment, and price change.',
    category: 'security_core',
  },
  {
    key: 'shadowImpersonation',
    label: 'Master Admin Shadow Support Impersonation',
    description: 'Allows technical support to securely troubleshoot tenant accounts without password sharing.',
    category: 'security_core',
  },
];

export const FeatureManagementPanel: React.FC = () => {
  const { allFeatures, maintenanceMode, toggleFeature } = useFeatureToggle();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pos_sales' | 'finance_stock' | 'security_core'>('all');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = async (key: keyof PlatformFeatureSettings, currentValue: boolean) => {
    try {
      setSavingKey(String(key));
      await toggleFeature(key, !currentValue);
      showToast(`Feature "${String(key)}" ${!currentValue ? 'Enabled' : 'Disabled'} and synced to Firestore.`);
    } catch (e) {
      alert('Failed to update feature toggle.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const next = !maintenanceMode;
      await PlatformSettingsService.setMaintenanceMode(next, next ? 'System undergoing scheduled maintenance. POS remains in offline mode.' : '');
      showToast(`Maintenance Mode set to ${next ? 'ACTIVE' : 'OFF'}.`);
    } catch {
      alert('Failed to update maintenance mode.');
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all platform feature toggles to recommended factory defaults?')) {
      setIsResetting(true);
      try {
        await PlatformSettingsService.resetToDefaults();
        showToast('All platform features restored to default state.');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const filteredFeatures = FEATURE_DEFINITIONS.filter(f => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = f.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(f.key).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const enabledCount = FEATURE_DEFINITIONS.filter(f => !!allFeatures[f.key]).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Maintenance Switch */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/60 border border-slate-700/80 dark:border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
              Centralized Control
            </span>
            <span className="text-xs text-slate-400">
              Firestore Doc: <code className="text-indigo-300 font-mono">platformSettings/global</code>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Dynamic Platform Feature Management</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Instantly turn specific application modules and security subsystems on or off across all client instances in real-time. Changes propagate to client apps with zero downtime via Firestore snapshot streams.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleToggleMaintenance}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md border ${
              maintenanceMode
                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{maintenanceMode ? 'Maintenance Mode: ACTIVE' : 'Toggle Maintenance Mode'}</span>
          </button>

          <button
            onClick={handleResetDefaults}
            disabled={isResetting}
            className="px-4 py-2.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/50 text-slate-200 text-xs font-bold rounded-2xl border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Modules</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{FEATURE_DEFINITIONS.length}</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Modules</span>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{enabledCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 shadow-xs">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Disabled Modules</span>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-300 mt-1">{FEATURE_DEFINITIONS.length - enabledCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Sync State</span>
          <div className="text-sm font-black text-indigo-800 dark:text-indigo-300 mt-2 flex items-center gap-1.5">
            <Cloud className="w-4 h-4" /> Realtime Cloud
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Features ({FEATURE_DEFINITIONS.length})
          </button>
          <button
            onClick={() => setSelectedCategory('pos_sales')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'pos_sales'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            POS &amp; Sales
          </button>
          <button
            onClick={() => setSelectedCategory('finance_stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'finance_stock'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Financials &amp; Inventory
          </button>
          <button
            onClick={() => setSelectedCategory('security_core')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'security_core'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Security &amp; System
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feature flags..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Feature Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFeatures.map((f) => {
          const isEnabled = !!allFeatures[f.key];
          const isSaving = savingKey === String(f.key);

          return (
            <div
              key={f.key}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                isEnabled
                  ? 'bg-white dark:bg-slate-850/80 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{f.label}</h3>
                    {f.badge && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                        {f.badge}
                      </span>
                    )}
                  </div>

                  {/* Switch Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(f.key, isEnabled)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-400 dark:text-slate-500">key: {String(f.key)}</span>
                <span className={`font-bold flex items-center gap-1 ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {isEnabled ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isEnabled ? 'Enabled Globally' : 'Disabled'}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
