import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Sparkles, Plus, Trash2, RotateCcw, Save, 
  CheckCircle2, AlertCircle, Edit3, Shield, Users, Building2, 
  Percent, Check, Eye, EyeOff, Star, HelpCircle, ArrowRight, Tag
} from 'lucide-react';
import { 
  SaaSPlanDefinition, 
  DEFAULT_TENANT_FEATURE_TOGGLES 
} from '../../types';
import { 
  getSaaSPlans, 
  saveSaaSPlans, 
  DEFAULT_SAAS_PLANS 
} from '../../lib/planLimitsService';

interface PlanPricingManagerPanelProps {
  onNotify?: (msg: string) => void;
}

export const PlanPricingManagerPanel: React.FC<PlanPricingManagerPanelProps> = ({ onNotify }) => {
  const [plans, setPlans] = useState<SaaSPlanDefinition[]>(() => getSaaSPlans());
  const [editingPlan, setEditingPlan] = useState<SaaSPlanDefinition | null>(null);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPlans(getSaaSPlans());
  }, []);

  const handleSavePlan = (updatedPlan: SaaSPlanDefinition) => {
    const updatedPlans = plans.map(p => p.id === updatedPlan.id ? { ...updatedPlan, updatedAt: new Date().toISOString() } : p);
    setPlans(updatedPlans);
    saveSaaSPlans(updatedPlans);
    window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
    setEditingPlan(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onNotify?.(`Plan "${updatedPlan.name}" updated successfully!`);
  };

  const handleCreatePlan = (newPlan: SaaSPlanDefinition) => {
    const updatedPlans = [...plans, { ...newPlan, updatedAt: new Date().toISOString() }];
    setPlans(updatedPlans);
    saveSaaSPlans(updatedPlans);
    window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
    setIsNewPlanModalOpen(false);
    onNotify?.(`New plan "${newPlan.name}" created successfully!`);
  };

  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) {
      alert('You must maintain at least one active SaaS licensing plan.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this subscription plan tier?')) {
      const updatedPlans = plans.filter(p => p.id !== planId);
      setPlans(updatedPlans);
      saveSaaSPlans(updatedPlans);
      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updatedPlans }));
      onNotify?.('Plan tier deleted successfully.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all SaaS plans and pricing back to official default rates?')) {
      setPlans(DEFAULT_SAAS_PLANS);
      saveSaaSPlans(DEFAULT_SAAS_PLANS);
      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: DEFAULT_SAAS_PLANS }));
      onNotify?.('Reset all plans to factory default pricing.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 rounded-3xl shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold tracking-wide uppercase mb-2">
            <CreditCard className="w-3.5 h-3.5" /> Server SaaS License &amp; Pricing Manager
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Plans &amp; Subscription Pricing Engine</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Centrally configure pharmacy software subscription tiers, recurring prices in PKR (Monthly, 1-Year, 3-Years, 5-Years), discount rules, trial durations, and allowed feature modules. Changes reflect live on the customer licensing portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const newBlankPlan: SaaSPlanDefinition = {
                id: `Custom_${Date.now()}`,
                name: 'Custom Pro Tier',
                badge: '✨ Custom Special',
                tagline: 'Customized pharmacy license with selected modules.',
                description: 'Tailored plan package for specific pharmacy client configurations.',
                pricing: {
                  monthly: 1999,
                  yearly: 19990,
                  threeYears: 44990,
                  fiveYears: 69990,
                },
                trialDurationDays: 3,
                maxFirms: 3,
                maxUsers: 8,
                allowedRoles: ['Primary Admin', 'Cashier', 'Manager'],
                features: { ...DEFAULT_TENANT_FEATURE_TOGGLES },
                isPopular: false,
                isVisible: true,
                order: plans.length + 1,
                notes: 'Custom configured server plan.',
                updatedAt: new Date().toISOString(),
              };
              setEditingPlan(newBlankPlan);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Plan</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to factory default plans"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>SaaS Plan changes successfully committed! All client licensing pages have updated in real-time.</span>
        </div>
      )}

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`bg-slate-900/90 border rounded-3xl p-6 shadow-xl flex flex-col justify-between relative transition-all ${
              plan.isPopular 
                ? 'border-indigo-500 ring-2 ring-indigo-500/30' 
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                ⭐ Most Popular
              </div>
            )}

            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-indigo-400 block">{plan.badge}</span>
                  <h3 className="text-xl font-black text-white">{plan.name} Plan</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const updated = plans.map(p => p.id === plan.id ? { ...p, isVisible: !p.isVisible } : p);
                      setPlans(updated);
                      saveSaaSPlans(updated);
                      window.dispatchEvent(new CustomEvent('saas-plans-updated', { detail: updated }));
                    }}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      plan.isVisible 
                        ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                    }`}
                    title={plan.isVisible ? 'Plan is Visible on Customer Portal' : 'Plan is Hidden from Customer Portal'}
                  >
                    {plan.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="p-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs cursor-pointer transition-colors"
                    title="Edit Plan Pricing & Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs cursor-pointer transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 min-h-[36px]">{plan.tagline}</p>

              {/* Price Matrix */}
              <div className="bg-slate-950/70 border border-slate-800/90 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Monthly:</span>
                  <span className="font-mono font-bold text-white">PKR {plan.pricing.monthly?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <span>1 Year:</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded">Save 30%</span>
                  </span>
                  <span className="font-mono font-black text-emerald-400">PKR {plan.pricing.yearly?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400 font-medium">3 Years:</span>
                  <span className="font-mono font-bold text-slate-200">PKR {plan.pricing.threeYears?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-1.5">
                  <span className="text-slate-400 font-medium">5 Years:</span>
                  <span className="font-mono font-bold text-slate-200">PKR {plan.pricing.fiveYears?.toLocaleString() || 0}</span>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Max Users</span>
                  <span className="font-mono font-black text-indigo-300">{plan.maxUsers} Users</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Max Branches</span>
                  <span className="font-mono font-black text-cyan-300">{plan.maxFirms} Firms</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold">Trial Length</span>
                  <span className="font-mono font-black text-amber-300">{plan.trialDurationDays || 3} Days</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${plan.features.profitAndLoss ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className={plan.features.profitAndLoss ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}>
                    P&amp;L Statements &amp; Balance Sheet
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${plan.features.batchManagement ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className={plan.features.batchManagement ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}>
                    Batch &amp; Expiry Radar Alerts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${plan.features.multipleWarehouses ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className={plan.features.multipleWarehouses ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}>
                    Multi-Warehouse Stock Control
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className={`w-3.5 h-3.5 ${plan.features.onlineStore ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className={plan.features.onlineStore ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}>
                    Online E-Commerce Web Storefront
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="pt-5 mt-4 border-t border-slate-800">
              <button
                onClick={() => setEditingPlan(plan)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Edit Pricing &amp; Modules</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / CREATE PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Edit Subscription Plan</h3>
                  <p className="text-xs text-slate-400">Configure pricing in PKR, branch quotas and feature modules</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Business Pro"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Badge &amp; Icon Label</label>
                <input
                  type="text"
                  value={editingPlan.badge}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, badge: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 🔵 Business Pro ⭐"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tagline (Short Summary)</label>
                <input
                  type="text"
                  value={editingPlan.tagline}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, tagline: e.target.value } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Comprehensive multi-warehouse & automated tax management"
                />
              </div>

              {/* Pricing Grid */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Pricing in PKR (Pakistani Rupees)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">Monthly (PKR)</label>
                    <input
                      type="number"
                      value={editingPlan.pricing.monthly}
                      onChange={(e) => setEditingPlan(prev => prev ? {
                        ...prev,
                        pricing: { ...prev.pricing, monthly: Number(e.target.value) }
                      } : null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-emerald-400 font-bold">1 Year (PKR)</label>
                    <input
                      type="number"
                      value={editingPlan.pricing.yearly}
                      onChange={(e) => setEditingPlan(prev => prev ? {
                        ...prev,
                        pricing: { ...prev.pricing, yearly: Number(e.target.value) }
                      } : null)}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">3 Years (PKR)</label>
                    <input
                      type="number"
                      value={editingPlan.pricing.threeYears}
                      onChange={(e) => setEditingPlan(prev => prev ? {
                        ...prev,
                        pricing: { ...prev.pricing, threeYears: Number(e.target.value) }
                      } : null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-semibold">5 Years (PKR)</label>
                    <input
                      type="number"
                      value={editingPlan.pricing.fiveYears}
                      onChange={(e) => setEditingPlan(prev => prev ? {
                        ...prev,
                        pricing: { ...prev.pricing, fiveYears: Number(e.target.value) }
                      } : null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quota Limits */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Max Team Users (Accounts)</label>
                <input
                  type="number"
                  value={editingPlan.maxUsers}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, maxUsers: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Max Firms / Branches</label>
                <input
                  type="number"
                  value={editingPlan.maxFirms}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, maxFirms: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Trial Period (Days)</label>
                <input
                  type="number"
                  value={editingPlan.trialDurationDays || 3}
                  onChange={(e) => setEditingPlan(prev => prev ? { ...prev, trialDurationDays: Number(e.target.value) } : null)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isPopular}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, isPopular: e.target.checked } : null)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-300">Mark as Popular</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isVisible}
                    onChange={(e) => setEditingPlan(prev => prev ? { ...prev, isVisible: e.target.checked } : null)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-300">Visible on Portal</span>
                </label>
              </div>

              {/* Module Toggles */}
              <div className="sm:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Included Feature Modules for this Tier
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.keys(editingPlan.features).map((featKey) => (
                    <label key={featKey} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={(editingPlan.features as any)[featKey]}
                        onChange={(e) => setEditingPlan(prev => prev ? {
                          ...prev,
                          features: {
                            ...prev.features,
                            [featKey]: e.target.checked
                          }
                        } : null)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3.5 h-3.5"
                      />
                      <span className="capitalize">{featKey.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSavePlan(editingPlan)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Plan &amp; Update Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
