import React from 'react';
import { 
  ShieldCheck, Lock, AlertTriangle, CheckCircle2, 
  Calendar, DollarSign, Ban, FileWarning, ShieldAlert
} from 'lucide-react';
import { useSettings, SafetyRulesConfig, PeriodLockConfig } from '../../contexts/SettingsContext';

export const SafetyRulesTab: React.FC = () => {
  const { settings, updateSafetyRules, updatePeriodLock } = useSettings();

  const safety = settings.safetyRules || {
    blockBelowCostSale: false,
    warnBelowCostSale: true,
    blockNegativeStockBilling: false,
    blockExpiredBatchBilling: true,
    blockExceededCreditLimit: false,
    requireBatchOnSale: false,
    requireCustomerPhoneOnCredit: true,
    strictBarcodeUniqueCheck: true,
  };

  const periodLock = settings.periodLock || {
    enabled: false,
    lockDate: '',
    allowAdminOverride: true,
    reason: 'Audit closing lock',
  };

  const toggleSafety = (key: keyof SafetyRulesConfig) => {
    updateSafetyRules({ [key]: !safety[key] });
  };

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Financial Accounting Period Lock Section (Rule 11) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Financial Accounting Period Lock (Feature #11)
            </h3>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            periodLock.enabled ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {periodLock.enabled ? 'Lock Active' : 'Unlocked'}
          </span>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            When enabled, transactions dated on or prior to the specified <strong>Lock Date</strong> cannot be created, edited, deleted, or back-dated. This guarantees financial statement integrity for filed tax and audit periods.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Period Lock Status
              </label>
              <button
                type="button"
                onClick={() => updatePeriodLock({ enabled: !periodLock.enabled })}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  periodLock.enabled 
                    ? 'bg-amber-600 text-white shadow-2xs hover:bg-amber-500' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{periodLock.enabled ? 'Disable Period Lock' : 'Enable Period Lock'}</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lock All Entries On / Before Date
              </label>
              <input
                type="date"
                value={periodLock.lockDate || ''}
                onChange={(e) => updatePeriodLock({ lockDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lock Reason / Audit Note
              </label>
              <input
                type="text"
                value={periodLock.reason || ''}
                onChange={(e) => updatePeriodLock({ reason: e.target.value })}
                placeholder="e.g., Fiscal year-end audited"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction & Inventory Safety Rules (Rule 7) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Operational Safety & Validation Rules (Feature #7)
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {[
            {
              key: 'blockBelowCostSale' as keyof SafetyRulesConfig,
              name: 'Strictly Block Selling Below Purchase Cost',
              desc: 'Disallows saving any invoice item where Selling Price is lower than Purchase Cost.',
              icon: Ban,
            },
            {
              key: 'warnBelowCostSale' as keyof SafetyRulesConfig,
              name: 'Warn When Selling Below Purchase Cost',
              desc: 'Displays a visual warning prompt during billing if price is below cost, but permits billing.',
              icon: AlertTriangle,
            },
            {
              key: 'blockNegativeStockBilling' as keyof SafetyRulesConfig,
              name: 'Prohibit Negative Stock Invoicing',
              desc: 'Prevents checkout if any billed item quantity exceeds current physical inventory.',
              icon: FileWarning,
            },
            {
              key: 'blockExpiredBatchBilling' as keyof SafetyRulesConfig,
              name: 'Prohibit Expired Batch Billing',
              desc: 'Blocks checkout if a medicine batch has passed its expiry date (FEFO compliance).',
              icon: ShieldAlert,
            },
            {
              key: 'blockExceededCreditLimit' as keyof SafetyRulesConfig,
              name: 'Block Sales To Customers Exceeding Credit Limit',
              desc: 'Restricts new credit invoices for customers whose balance exceeds their approved credit limit.',
              icon: DollarSign,
            },
            {
              key: 'strictBarcodeUniqueCheck' as keyof SafetyRulesConfig,
              name: 'Strict Barcode Uniqueness Enforcement',
              desc: 'Blocks saving medicines with duplicate or colliding barcodes across the entire catalog.',
              icon: CheckCircle2,
            },
            {
              key: 'requireCustomerPhoneOnCredit' as keyof SafetyRulesConfig,
              name: 'Require Valid Phone Number For Credit Sales',
              desc: 'Mandates a customer contact number whenever an invoice has an unpaid balance.',
              icon: ShieldCheck,
            },
          ].map(rule => {
            const isEnabled = !!safety[rule.key];
            const Icon = rule.icon;
            return (
              <div key={rule.key} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl mt-0.5 ${isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{rule.desc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  onClick={() => toggleSafety(rule.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? 'bg-emerald-600' : 'bg-slate-200'
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
    </div>
  );
};
