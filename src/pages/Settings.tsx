import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Search, X, RotateCcw, 
  Layers, Sliders, Printer, Percent, Users, UserCheck, 
  Package, ShieldCheck, CheckCircle2, ChevronRight, HelpCircle, Sparkles,
  Sun, Moon, BookOpen, Keyboard, QrCode
} from 'lucide-react';
import { GeneralTab } from '../components/settings/GeneralTab';
import { TransactionTab } from '../components/settings/TransactionTab';
import { PrintTab } from '../components/settings/PrintTab';
import { TaxesTab } from '../components/settings/TaxesTab';
import { UserManagementTab } from '../components/settings/UserManagementTab';
import { PartyTab } from '../components/settings/PartyTab';
import { ItemTab } from '../components/settings/ItemTab';
import { PricingMarginTab } from '../components/settings/PricingMarginTab';
import { RbacManagementTab } from '../components/settings/RbacManagementTab';
import { ModuleVisibilityTab } from '../components/settings/ModuleVisibilityTab';
import { ErrorLogsTab } from '../components/settings/ErrorLogsTab';
import { FeatureFlagsTab } from '../components/settings/FeatureFlagsTab';
import { SafetyRulesTab } from '../components/settings/SafetyRulesTab';
import { ControlledAndGenericTab } from '../components/settings/ControlledAndGenericTab';
import { DemoDataTab } from '../components/settings/DemoDataTab';
import { AdminSettingsTab } from '../components/settings/AdminSettingsTab';
import { DocumentationTab } from '../components/settings/DocumentationTab';
import { SystemUpdatesTab } from '../components/settings/SystemUpdatesTab';
import { BackupRestoreTab } from '../components/settings/BackupRestoreTab';
import { BarcodeGeneratorTab } from '../components/settings/BarcodeGeneratorTab';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { generateSeedData } from '../lib/seedData';

export type TabKey = 
  | 'BACKUP & RESTORE'
  | 'QR CODE GENERATOR'
  | 'GENERAL' 
  | 'DOCUMENTATION'
  | 'UPDATES'
  | 'ADMIN SETTINGS'
  | 'CONTROLLED & GENERIC' 
  | 'FEATURE FLAGS' 
  | 'SAFETY & LOCK' 
  | 'MODULE VISIBILITY' 
  | 'ROLES & RBAC' 
  | 'TRANSACTION' 
  | 'PRINT' 
  | 'TAXES' 
  | 'USER MANAGEMENT' 
  | 'PARTY' 
  | 'ITEM' 
  | 'PRICING & MARGIN' 
  | 'DEMO DATA';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: any;
  badge?: string;
  trialOnly?: boolean;
}

export const SETTINGS_TABS: TabItem[] = [
  { key: 'BACKUP & RESTORE', label: 'BACKUP & RESTORE', icon: ShieldCheck, badge: 'VERIFIED' },
  { key: 'QR CODE GENERATOR', label: 'QR & BARCODE GENERATOR', icon: QrCode, badge: 'THERMAL' },
  { key: 'DOCUMENTATION', label: 'DOCUMENTATION & MANUAL', icon: BookOpen, badge: 'MANUAL' },
  { key: 'UPDATES', label: 'SOFTWARE UPDATES & VERSIONS', icon: Sparkles, badge: 'v2.4' },
  { key: 'GENERAL', label: 'GENERAL', icon: Sliders },
  { key: 'ADMIN SETTINGS', label: 'ADMIN SETTINGS & FLAGS', icon: ShieldCheck, badge: 'ADMIN' },
  { key: 'CONTROLLED & GENERIC', label: 'CONTROLLED & GENERIC SUITE', icon: ShieldCheck },
  { key: 'FEATURE FLAGS', label: 'FEATURE FLAGS (19)', icon: Sparkles },
  { key: 'SAFETY & LOCK', label: 'SAFETY & PERIOD LOCK', icon: ShieldCheck },
  { key: 'TRANSACTION', label: 'INVOICE BILLING', icon: Layers },
  { key: 'MODULE VISIBILITY', label: 'MODULE VISIBILITY', icon: Layers },
  { key: 'ROLES & RBAC', label: 'ROLES & RBAC', icon: ShieldCheck },
  { key: 'PRINT', label: 'PRINT', icon: Printer },
  { key: 'TAXES', label: 'TAXES', icon: Percent },
  { key: 'PRICING & MARGIN', label: 'PRICING & MARGIN', icon: Percent },
  { key: 'USER MANAGEMENT', label: 'USER MANAGEMENT', icon: Users },
  { key: 'PARTY', label: 'PARTY', icon: UserCheck },
  { key: 'ITEM', label: 'ITEM', icon: Package },
  { key: 'DEMO DATA', label: '3-DAY TRIAL DATASET', icon: Sparkles, badge: 'TRIAL DATA' },
];

export const resolveTabKey = (param?: string | null): TabKey => {
  if (!param) return 'GENERAL';
  const clean = decodeURIComponent(param).trim();
  const upper = clean.toUpperCase();

  // 1. Direct match with key
  const directMatch = SETTINGS_TABS.find(t => t.key === upper || t.key === clean);
  if (directMatch) return directMatch.key;

  // 2. Direct match with label
  const labelMatch = SETTINGS_TABS.find(t => t.label.toUpperCase() === upper);
  if (labelMatch) return labelMatch.key;

  // 3. Match normalized key or slug (remove special chars & spaces)
  const normalized = upper.replace(/[^A-Z0-9]/g, '');

  if (normalized.includes('QR') || normalized.includes('BARCODE') || normalized.includes('STICKER') || normalized.includes('LABEL')) return 'QR CODE GENERATOR';
  if (normalized.includes('BACKUP') || normalized.includes('RESTORE') || normalized.includes('SNAPSHOT') || normalized.includes('VPS')) return 'BACKUP & RESTORE';
  if (normalized.includes('DOC') || normalized.includes('MANUAL') || normalized.includes('SHORTCUT') || normalized.includes('GUIDE')) return 'DOCUMENTATION';
  if (normalized.includes('UPDATE') || normalized.includes('VERSION') || normalized.includes('RELEASE')) return 'UPDATES';
  if (normalized.includes('ADMINSETTING') || normalized.includes('ADMINFLAG')) return 'ADMIN SETTINGS';
  if (normalized.includes('CONTROLLED') || normalized.includes('GENERIC')) return 'CONTROLLED & GENERIC';
  if (normalized.includes('FEATURE') || normalized.includes('FLAG')) return 'FEATURE FLAGS';
  if (normalized.includes('SAFETY') || normalized.includes('LOCK')) return 'SAFETY & LOCK';
  if (normalized.includes('MODULE') || normalized.includes('VISIBIL')) return 'MODULE VISIBILITY';
  if (normalized.includes('ROLE') || normalized.includes('RBAC')) return 'ROLES & RBAC';
  if (normalized.includes('TRANSACTION') || normalized.includes('BILLING') || normalized.includes('INVOICE')) return 'TRANSACTION';
  if (normalized.includes('PRINT')) return 'PRINT';
  if (normalized.includes('TAX')) return 'TAXES';
  if (normalized.includes('PRICING') || normalized.includes('MARGIN')) return 'PRICING & MARGIN';
  if (normalized.includes('USER') || normalized.includes('STAFF')) return 'USER MANAGEMENT';
  if (normalized.includes('PARTY') || normalized.includes('CUSTOMER') || normalized.includes('SUPPLIER')) return 'PARTY';
  if (normalized.includes('ITEM') || normalized.includes('PRODUCT') || normalized.includes('STOCK')) return 'ITEM';
  if (normalized.includes('DEMO') || normalized.includes('SEED') || normalized.includes('TRIAL') || normalized.includes('3DAY') || normalized.includes('DATASET')) return 'DEMO DATA';
  if (normalized.includes('GENERAL')) return 'GENERAL';

  return 'GENERAL';
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useSettings();
  const { isTrialActive } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TabKey>(() => resolveTabKey(tabParam));

  useEffect(() => {
    setActiveTab(resolveTabKey(tabParam));
  }, [tabParam]);

  const visibleTabs = SETTINGS_TABS;

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Window Header (Vyapar Desktop Settings Title Bar) */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Configure system policies, transaction rules, invoice print styles, taxes & catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Theme Toggle Button */}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              showToast(isDarkMode ? '☀️ Switched to Light Day Mode' : '🌙 Switched to Dark Night Shift Mode');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border ${
              isDarkMode
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Light Day Mode' : 'Switch to Dark Night Shift Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Night Shift</span>
              </>
            )}
          </button>

          {/* Close Window (X) button matching Screenshot top right */}
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Horizontal Tabs Bar */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'BACKUP & RESTORE' && <BackupRestoreTab />}
          {activeTab === 'QR CODE GENERATOR' && <BarcodeGeneratorTab />}
          {activeTab === 'DOCUMENTATION' && <DocumentationTab />}
          {activeTab === 'UPDATES' && <SystemUpdatesTab />}
          {activeTab === 'GENERAL' && <GeneralTab />}
          {activeTab === 'ADMIN SETTINGS' && <AdminSettingsTab />}
          {activeTab === 'CONTROLLED & GENERIC' && <ControlledAndGenericTab />}
          {activeTab === 'FEATURE FLAGS' && <FeatureFlagsTab />}
          {activeTab === 'SAFETY & LOCK' && <SafetyRulesTab />}
          {activeTab === 'MODULE VISIBILITY' && <ModuleVisibilityTab />}
          {activeTab === 'ROLES & RBAC' && <RbacManagementTab />}
          {activeTab === 'TRANSACTION' && <TransactionTab />}
          {activeTab === 'PRINT' && <PrintTab />}
          {activeTab === 'TAXES' && <TaxesTab />}
          {activeTab === 'USER MANAGEMENT' && <UserManagementTab />}
          {activeTab === 'PARTY' && <PartyTab />}
          {activeTab === 'ITEM' && <ItemTab />}
          {activeTab === 'PRICING & MARGIN' && <PricingMarginTab />}
          {activeTab === 'DEMO DATA' && <DemoDataTab />}
        </div>
      </main>

    </div>
  );
};
