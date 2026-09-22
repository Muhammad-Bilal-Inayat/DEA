import React from 'react';
import { 
  Sliders, Search, Package, Users, Upload, Edit3, 
  Copy, ShieldCheck, FileCheck, Clock, Lock, Paperclip, 
  AlertTriangle, RefreshCw, Key, Database, Percent, Globe,
  CheckCircle2, Sparkles
} from 'lucide-react';
import { useSettings, FeatureFlags } from '../../contexts/SettingsContext';

export const FeatureFlagsTab: React.FC = () => {
  const { settings, updateFeatureFlags } = useSettings();
  const flags = settings.featureFlags || {
    universalSearch: true,
    product360: true,
    customer360: true,
    dataImportWizard: true,
    bulkEdit: true,
    duplicateDetection: true,
    safetyRules: true,
    quotationToInvoice: true,
    cashierShiftClosing: true,
    immutableInvoiceVoid: true,
    periodLock: true,
    documentAttachments: true,
    exceptionCenter: true,
    syncHealthCenter: true,
    idempotencyProtection: true,
    featureFlagsSwitchboard: true,
    databaseMigrationDiagnostics: true,
    taxEngine: true,
    productOnlineControl: true,
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    updateFeatureFlags({ [key]: !flags[key] });
  };

  const enableAll = () => {
    const allEnabled: Partial<FeatureFlags> = {};
    Object.keys(flags).forEach(k => {
      (allEnabled as any)[k] = true;
    });
    updateFeatureFlags(allEnabled);
  };

  const featureGroups = [
    {
      title: 'Search, 360° Intelligence & Diagnostics',
      items: [
        {
          key: 'universalSearch' as keyof FeatureFlags,
          name: '1. Universal Global Search (Ctrl+K)',
          desc: 'Instant search modal across medicines, barcodes, invoices, parties & navigation routes.',
          icon: Search,
        },
        {
          key: 'product360' as keyof FeatureFlags,
          name: '2. Product 360° Intelligence',
          desc: 'Comprehensive product view with batch tracking, sales velocity, margin analysis & purchase history.',
          icon: Package,
        },
        {
          key: 'customer360' as keyof FeatureFlags,
          name: '3. Customer / Party 360° Profile',
          desc: 'Detailed ledger, aging brackets (0-30, 31-60, 61-90, 90+ days), credit meters & WhatsApp statements.',
          icon: Users,
        },
        {
          key: 'exceptionCenter' as keyof FeatureFlags,
          name: '13. Central Exception Center',
          desc: 'Unified operational radar for stockouts, expiring batches, credit breaches and cashier shift discrepancies.',
          icon: AlertTriangle,
        },
        {
          key: 'syncHealthCenter' as keyof FeatureFlags,
          name: '14. Sync Health Center',
          desc: 'Real-time offline/cloud synchronization diagnostics, queue telemetry and conflict resolution.',
          icon: RefreshCw,
        },
        {
          key: 'databaseMigrationDiagnostics' as keyof FeatureFlags,
          name: '17. Database Versioning & Diagnostics',
          desc: 'Schema migrations, IndexedDB store integrity checks and cloud sync backups.',
          icon: Database,
        },
      ],
    },
    {
      title: 'Operations, Workflow & Import Engine',
      items: [
        {
          key: 'dataImportWizard' as keyof FeatureFlags,
          name: '4. Universal Data Import Wizard',
          desc: 'Multi-entity Excel/CSV importer with automatic header mapping, validation and duplicate skipping.',
          icon: Upload,
        },
        {
          key: 'bulkEdit' as keyof FeatureFlags,
          name: '5. Bulk Edit & Batch Updates',
          desc: 'Mass edit pricing, categories, tax rates, reorder thresholds and locations in one click.',
          icon: Edit3,
        },
        {
          key: 'quotationToInvoice' as keyof FeatureFlags,
          name: '8. Quotation → Invoice Conversion',
          desc: '1-click conversion from estimates/quotations into active tax sales invoices.',
          icon: FileCheck,
        },
        {
          key: 'cashierShiftClosing' as keyof FeatureFlags,
          name: '9. Cashier Shift & Register Closing',
          desc: 'Opening/closing float tracking, expected vs physical cash reconciliation and discrepancy audit.',
          icon: Clock,
        },
        {
          key: 'documentAttachments' as keyof FeatureFlags,
          name: '12. Document & Image Attachments',
          desc: 'Attach warranty receipts, delivery challans and prescription photos directly to transactions.',
          icon: Paperclip,
        },
        {
          key: 'taxEngine' as keyof FeatureFlags,
          name: '18. Multi-Tier Tax Engine',
          desc: 'Comprehensive GST/VAT tax calculation groups, HSN classifications and exempt rules.',
          icon: Percent,
        },
        {
          key: 'productOnlineControl' as keyof FeatureFlags,
          name: '19. Product Online-Sale Storefront Control',
          desc: 'Per-product e-commerce publish toggle, online pricing override and prescription checks.',
          icon: Globe,
        },
      ],
    },
    {
      title: 'Safety Rules, Idempotency & Financial Integrity',
      items: [
        {
          key: 'duplicateDetection' as keyof FeatureFlags,
          name: '6. Duplicate Barcode & Entity Detection',
          desc: 'Real-time collision prevention for duplicate barcodes, phone numbers and invoice identifiers.',
          icon: Copy,
        },
        {
          key: 'safetyRules' as keyof FeatureFlags,
          name: '7. Data Validation & Safety Rules',
          desc: 'Enforce MRP >= Cost, block negative stock billing, and prohibit sale of expired batches.',
          icon: ShieldCheck,
        },
        {
          key: 'immutableInvoiceVoid' as keyof FeatureFlags,
          name: '10. Immutable Posted Invoice / Void System',
          desc: 'Audited cancellation & voiding of final posted invoices with auto stock/ledger reversals.',
          icon: Lock,
        },
        {
          key: 'periodLock' as keyof FeatureFlags,
          name: '11. Accounting Financial Period Lock',
          desc: 'Prevent historical back-dated alterations of transactions prior to closing lock date.',
          icon: Lock,
        },
        {
          key: 'idempotencyProtection' as keyof FeatureFlags,
          name: '15. Transaction Idempotency Protection',
          desc: 'Guard against double-clicks and network retries duplicating financial bills.',
          icon: Key,
        },
        {
          key: 'featureFlagsSwitchboard' as keyof FeatureFlags,
          name: '16. Modular Feature Switchboard',
          desc: 'Enable or disable any subsystem on-demand without rebuilding or reloading the app.',
          icon: Sliders,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Modular Feature Switchboard (19 Master Capabilities)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn any business feature ON or OFF instantly. Changes apply in real-time across the entire application.
          </p>
        </div>
        <button
          onClick={enableAll}
          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> Enable All 19 Features
        </button>
      </div>

      {featureGroups.map((group, gIdx) => (
        <div key={gIdx} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{group.title}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {group.items.map(item => {
              const Icon = item.icon;
              const isEnabled = !!flags[item.key];
              return (
                <div key={item.key} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${isEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => toggleFlag(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
