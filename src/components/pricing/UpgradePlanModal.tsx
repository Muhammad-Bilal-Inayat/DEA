import React from 'react';
import { 
  Crown, Check, Zap, ArrowRight, ShieldCheck, 
  Users, Building2, Sparkles, X, AlertCircle, PhoneCall
} from 'lucide-react';
import { getSaaSPlans } from '../../lib/planLimitsService';
import { SaaSPlanTier } from '../../types';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  reason?: string;
  resourceType?: 'user' | 'firm';
  currentCount?: number;
  maxAllowed?: number;
  onSelectPlan?: (planTier: SaaSPlanTier) => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentPlan = 'Basic',
  reason,
  resourceType = 'user',
  currentCount,
  maxAllowed,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  const handleUpgradeClick = (tier: SaaSPlanTier) => {
    if (onSelectPlan) {
      onSelectPlan(tier);
    } else {
      alert(`Upgrade request to ${tier} submitted to Master Admin! An invoice and license activation key will be dispatched.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200">
        
        {/* Modal Header */}
        <div className="relative px-6 py-6 bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-purple-900/60 border-b border-slate-700/80 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Plan Quota Reached
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Current Plan: <strong className="text-white">{currentPlan}</strong>
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Expand Your Pharmacy Capacity
              </h2>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
                {reason || (resourceType === 'user' 
                  ? `You have reached the maximum allowed team members (${currentCount || 5}/${maxAllowed || 5}) for your current plan.`
                  : `You have reached the maximum branch/firm limit (${currentCount || 1}/${maxAllowed || 1}) for your current plan.`
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Cards Matrix */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getSaaSPlans().map((plan) => {
              const isCurrent = currentPlan.toLowerCase().includes(plan.name.toLowerCase());
              const isRecommended = plan.name === 'Business';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isRecommended
                      ? 'bg-gradient-to-b from-blue-950/60 to-slate-900 border-blue-500/60 ring-2 ring-blue-500/20 shadow-xl'
                      : isCurrent
                      ? 'bg-slate-850/70 border-slate-700 opacity-90'
                      : 'bg-slate-850/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                        {plan.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                          Current Active
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[36px]">
                      {plan.tagline}
                    </p>

                    <div className="my-4 pt-3 border-t border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">Rs. {plan.pricing.monthly.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                        Rs. {plan.pricing.yearly.toLocaleString()} / year (Save 17%)
                      </div>
                    </div>

                    {/* Quota Highlights */}
                    <div className="space-y-2 py-2 text-xs font-medium text-slate-300">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span>Up to <strong className="text-white">{plan.maxUsers} Users</strong></span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span>Up to <strong className="text-white">{plan.maxFirms} Firm(s)/Branches</strong></span>
                      </div>
                    </div>

                    {/* Feature Checklist */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>POS & Fast Thermal Billing</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Inventory & Supplier Ledger</span>
                      </div>
                      {plan.features.batchManagement ? (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Batch & Expiry Auto-Alerts</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-500 line-through">
                          <X className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          <span>Batch & Expiry Tracking</span>
                        </div>
                      )}
                      {plan.features.profitAndLoss ? (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>P&L & Financial Reports</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-500 line-through">
                          <X className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          <span>P&L Reports</span>
                        </div>
                      )}
                      {plan.features.multipleWarehouses && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>Multi-Warehouse Transfers</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-700"
                      >
                        Active Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgradeClick(plan.id as SaaSPlanTier)}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                          isRecommended
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                        }`}
                      >
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Need Custom Seats Footer */}
          <div className="p-4 rounded-2xl bg-slate-850/90 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Need Custom User Seats or Dynamic Overrides?</h4>
                <p className="text-[11px] text-slate-400">
                  Master Admins can dynamically expand user quotas or assign custom permissions instantly without interrupting billing.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Continue Working
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
