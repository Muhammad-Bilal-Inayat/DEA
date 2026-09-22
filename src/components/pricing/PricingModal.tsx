import React, { useState, useEffect } from 'react';
import { X, Check, Award, Shield, Sparkles, MessageSquare, CheckCircle2, Phone, ArrowRight } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BillingInterval = 'monthly' | '1year' | '3years' | '5years';

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('1year');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plans = [
    {
      name: 'Basic',
      badge: '🟢 Basic',
      tagline: 'Essential billing & inventory for single shops',
      prices: {
        monthly: 'Rs. 1,999',
        '1year': 'Rs. 19,990',
        '3years': 'Rs. 59,970',
        '5years': 'Rs. 99,950',
      },
      popular: false,
      color: 'border-emerald-200 bg-emerald-50/20',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      features: [
        'Up to 5 Users',
        '2 Firms / Branches',
        'POS & Billing',
        'Inventory Management',
        'Products & Categories',
        'Customers & Suppliers',
        'Sales & Purchases',
        'Customer/Supplier Ledger',
        'Barcode Support',
        'Expenses',
        'Basic Reports',
        'Low Stock Alerts',
        'Invoice Print/PDF',
        'Offline Working',
        'Local Backup & Restore'
      ]
    },
    {
      name: 'Business',
      badge: '🔵 Business ⭐',
      tagline: 'Advanced multi-warehouse & stock management',
      prices: {
        monthly: 'Rs. 3,999',
        '1year': 'Rs. 39,990',
        '3years': 'Rs. 119,970',
        '5years': 'Rs. 199,950',
      },
      popular: true,
      color: 'border-blue-300 bg-blue-50/45 shadow-md ring-2 ring-blue-500/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      features: [
        'Up to 10 Users',
        '5 Firms / Branches',
        'Everything in Basic +',
        'Multiple Warehouses',
        'Batch & Expiry Tracking',
        'Automated Purchase Reordering',
        'Purchase Orders',
        'Sales & Purchase Returns',
        'Cash & Bank Management',
        'Profit & Loss',
        'Advanced Reports',
        'Customer/Supplier Aging',
        'Stock Transfers',
        'Advanced Expenses',
        'Advanced Dashboard',
        'Backup & Restore',
        'Priority Support'
      ]
    },
    {
      name: 'Premium',
      badge: '🟣 Premium',
      tagline: 'Enterprise-grade custom controls & audit logs',
      prices: {
        monthly: 'Rs. 6,999',
        '1year': 'Rs. 69,990',
        '3years': 'Rs. 209,970',
        '5years': 'Rs. 349,950',
      },
      popular: false,
      color: 'border-purple-200 bg-purple-50/20',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      features: [
        'Up to 20 Users',
        '10 Firms / Branches',
        'Everything in Business +',
        'Online Storefront Catalog',
        'Unlimited Warehouses',
        'Advanced Inventory Controls',
        'Advanced Permissions',
        'Audit Logs',
        'Approval System',
        'Advanced Analytics',
        'Custom Reports',
        'Custom Invoice Templates',
        'Multiple Cash Registers',
        'Advanced Financial Reports',
        'Advanced Backup & Restore',
        'Premium Support'
      ]
    }
  ];

  const handleSubscribe = (planName: string) => {
    setSelectedPlan(planName);
    const whatsappNum = '923364585863';
    const message = encodeURIComponent(`Hello! I want to subscribe to MBI Inventra — ${planName} Plan (${billingInterval.toUpperCase()}). Please guide me with activation.`);
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      {/* Modal Container with smooth fade-in and scale-up animation */}
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[92vh] h-full text-slate-800 animate-in fade-in zoom-in-95 animate-fade-scale duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-2xl shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>💙 MBI Inventra — Simplified Plans & Pricing</span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Save Up to 40%
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Choose the right plan for your pharmacy, wholesale store, or retail business.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Billing Interval Toggle Bar */}
        <div className="bg-slate-100 px-6 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs font-bold text-slate-600">
            Select Billing Duration:
          </div>

          <div className="inline-flex bg-slate-200 p-1 rounded-2xl shadow-inner">
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: '1year', label: '1 Year (Best Value)' },
              { key: '3years', label: '3 Years' },
              { key: '5years', label: '5 Years' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setBillingInterval(item.key as BillingInterval)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingInterval === item.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards Grid Container */}
        <div className="flex-1 overflow-y-auto h-full p-6 bg-slate-50/70">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            
            {plans.map((plan) => {
              const currentPrice = plan.prices[billingInterval];

              return (
                <div 
                  key={plan.name}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all bg-white relative ${plan.color}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                      Most Popular Choice ⭐
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-black text-slate-900">{plan.badge}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.tagline}</p>

                    <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {currentPrice}
                      </div>
                      <div className="text-[11px] text-slate-500 uppercase font-semibold mt-0.5">
                        Billed {billingInterval === 'monthly' ? 'Monthly' : billingInterval === '1year' ? 'Annually' : billingInterval === '3years' ? 'for 3 Years' : 'for 5 Years'}
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 mb-6">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Included Features:</div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="font-medium">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.name)}
                    className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer ${plan.buttonBg}`}
                  >
                    <span>Activate {plan.name} Plan via WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

          </div>
        </div>

        {/* Footer Support Banner */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Need a custom enterprise license or multi-branch setup? Call / WhatsApp: <strong className="text-slate-900 font-bold">0336-4585863</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
          >
            Close Pricing
          </button>
        </div>

      </div>

    </div>
  );
};
