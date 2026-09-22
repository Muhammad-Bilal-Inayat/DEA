import React, { useState, useEffect } from 'react';
import { 
  Award, Check, Sparkles, Shield, Phone, ArrowRight, 
  HelpCircle, Star, Zap, CheckCircle2, ArrowLeft, Key, MessageSquare,
  Users, Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LicenseActivationModal } from '../components/admin/LicenseActivationModal';
import { getLicenseInfo } from '../lib/licenseManager';
import { getSaaSPlans } from '../lib/planLimitsService';
import { getBrandContact } from '../lib/siteCmsService';

type BillingInterval = 'monthly' | '1year' | '3years' | '5years';

export const Pricing: React.FC = () => {
  const { business } = useAuth();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('1year');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedPlanSuccess, setSelectedPlanSuccess] = useState<string | null>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(() => getLicenseInfo());
  const [saasPlans, setSaasPlans] = useState(() => getSaaSPlans());
  const [contact, setContact] = useState(getBrandContact);

  useEffect(() => {
    const handlePlansUpdate = () => {
      setSaasPlans(getSaaSPlans());
    };
    const handleCmsUpdate = () => {
      setContact(getBrandContact());
    };

    window.addEventListener('saas-plans-updated', handlePlansUpdate);
    window.addEventListener('mbi-site-cms-updated', handleCmsUpdate);
    window.addEventListener('storage', handlePlansUpdate);
    return () => {
      window.removeEventListener('saas-plans-updated', handlePlansUpdate);
      window.removeEventListener('mbi-site-cms-updated', handleCmsUpdate);
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  const visibleSaasPlans = saasPlans.filter(sp => sp.isVisible !== false);

  const plans = visibleSaasPlans.map(sp => {
    const isBusiness = sp.id === 'Business';
    const isPremium = sp.id === 'Premium';

    const monthlyPrice = sp.pricing?.monthly || 1999;
    const yearlyPrice = sp.pricing?.yearly || monthlyPrice * 10;
    const threeYearsPrice = sp.pricing?.threeYears || monthlyPrice * 24;
    const fiveYearsPrice = sp.pricing?.fiveYears || monthlyPrice * 36;

    let savingsText = 'Standard Baseline';
    let effectiveMonthly = monthlyPrice;
    let priceNumeric = monthlyPrice;
    let periodText = '/mo';

    if (billingInterval === 'monthly') {
      savingsText = 'Billed Monthly';
      effectiveMonthly = monthlyPrice;
      priceNumeric = monthlyPrice;
      periodText = '/month';
    } else if (billingInterval === '1year') {
      const discount = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);
      savingsText = `Save ~${discount > 0 ? discount : 30}% (Annual Deal)`;
      effectiveMonthly = Math.round(yearlyPrice / 12);
      priceNumeric = yearlyPrice;
      periodText = '/year';
    } else if (billingInterval === '3years') {
      const discount = Math.round(((monthlyPrice * 36 - threeYearsPrice) / (monthlyPrice * 36)) * 100);
      savingsText = `Save ~${discount > 0 ? discount : 45}% (3 Years Deal)`;
      effectiveMonthly = Math.round(threeYearsPrice / 36);
      priceNumeric = threeYearsPrice;
      periodText = 'for 3 Years';
    } else if (billingInterval === '5years') {
      const discount = Math.round(((monthlyPrice * 60 - fiveYearsPrice) / (monthlyPrice * 60)) * 100);
      savingsText = `Save ~${discount > 0 ? discount : 60}% (5 Years Super Deal)`;
      effectiveMonthly = Math.round(fiveYearsPrice / 60);
      priceNumeric = fiveYearsPrice;
      periodText = 'for 5 Years';
    }

    if (sp.isPopular || isBusiness) savingsText += ' • Most Popular';
    if (isPremium) savingsText += ' • Best Enterprise Value';

    const featureList: string[] = [];
    featureList.push(`Maximum ${sp.maxUsers} Team Users (Accounts)`);
    featureList.push(`Maximum ${sp.maxFirms} Firm(s) / Branches`);
    featureList.push('High-Speed Thermal POS & A4 Bills');
    featureList.push('Comprehensive Medicine Catalog & Category Tree');
    featureList.push('Customer & Supplier Ledger Accounts');

    if (sp.features?.batchManagement || sp.features?.expiryManagement) {
      featureList.push('Batch & Expiry 30/60/90/180 Days Alerts');
    }
    if (sp.features?.profitAndLoss) {
      featureList.push('Profit & Loss Statements & Balance Sheet');
    }
    if (sp.features?.multipleWarehouses) {
      featureList.push('Multi-Warehouse & Sub-Location Stock');
    }
    if (isPremium) {
      featureList.push('Granular Audit Logs & Activity Trails');
      featureList.push('Multi-Register Cash Drawer Lock');
      featureList.push('Dedicated Support & Priority Setup');
    } else if (isBusiness) {
      featureList.push('Credit Notes & Debit Notes (Returns)');
      featureList.push('Priority 24/7 WhatsApp Support');
    } else {
      featureList.push('100% Offline Mode & Local Backups');
      featureList.push('Standard WhatsApp Support');
    }

    return {
      id: sp.id,
      name: sp.name,
      badge: sp.badge,
      tagline: sp.tagline,
      price: `Rs. ${priceNumeric.toLocaleString()}`,
      periodText,
      effectiveMonthly: `≈ Rs. ${effectiveMonthly.toLocaleString()}/mo effective`,
      savings: savingsText,
      popular: sp.isPopular ?? isBusiness,
      maxUsers: sp.maxUsers,
      maxFirms: sp.maxFirms,
      color: isBusiness 
        ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/30 shadow-xl' 
        : isPremium 
        ? 'border-purple-200 bg-white hover:border-purple-300' 
        : 'border-slate-200 bg-white hover:border-blue-300',
      buttonBg: isBusiness 
        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
        : isPremium 
        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
        : 'bg-slate-900 hover:bg-slate-800 text-white',
      features: featureList,
    };
  });

  const handleSubscribe = (planName: string) => {
    setSelectedPlanSuccess(planName);
    const message = `Hello! I want to activate my pharmacy (${business?.name || 'MBI Inventra User'}) for the *${planName} Plan* (${billingInterval.toUpperCase()}). Please provide activation details.`;
    window.open(contact.whatsappUrl(message), '_blank');
  };

  const faqs = [
    {
      q: 'Does MBI Inventra work 100% offline without internet?',
      a: 'Yes! MBI Inventra is engineered to run completely offline. You can conduct lightning-fast POS billing, update inventory, print receipts, and track customer debts without an internet connection.'
    },
    {
      q: 'How fast is plan activation after payment?',
      a: `Activation is immediate! After contacting on WhatsApp (${contact.displayPhone2}), you receive your unique pharmacy license key within 5-10 minutes, which unlocks all features instantly in the app.`
    },
    {
      q: 'Can I export my sales and inventory reports for tax filing?',
      a: 'Yes! You can export your full medicine catalog, stock valuations, and detailed sales registers as CSV or Excel spreadsheets formatted for accountant review and tax compliance.'
    },
    {
      q: 'Can I upgrade or downgrade my plan later?',
      a: 'Yes, you can upgrade from Basic to Business Pro or Enterprise at any time. You only pay the prorated difference for the remaining duration.'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 font-sans overflow-y-auto h-full">
      
      {/* Top Breadcrumb & Quick Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Plans & Licensing</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${licenseInfo.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {licenseInfo.status === 'Active' ? `Active: ${licenseInfo.plan}` : 'Trial Version'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">Transparent pricing synced directly with central administration</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLicenseModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>Enter License Key</span>
          </button>
          <a
            href={contact.whatsappUrl('Hello! I have a question about MBI Inventra pricing.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp {contact.displayPhone2}</span>
          </a>
        </div>
      </div>

      {/* Success Notification Alert */}
      {selectedPlanSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-bold">Subscription Request Initiated for {selectedPlanSuccess} Plan!</div>
              <div className="text-xs text-emerald-700">WhatsApp has been opened with your pre-filled inquiry to helpline ({contact.displayPhone2}).</div>
            </div>
          </div>
          <button 
            onClick={() => setSelectedPlanSuccess(null)}
            className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Section & Billing Frequency Switcher */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Flexible Plans Built for Pharmacy Operations</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Select Your Pharmacy Software License
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Everything your pharmacy needs: fast POS billing, batch expiry tracking, barcode generation, thermal printing, and tax compliance.
        </p>

        {/* Billing Interval Toggle */}
        <div className="pt-3 flex justify-center">
          <div className="inline-flex bg-slate-200/90 p-1.5 rounded-2xl shadow-inner gap-1">
            {[
              { key: 'monthly', label: 'Monthly' },
              { key: '1year', label: '1 Year (Save 30%)' },
              { key: '3years', label: '3 Years (Save 45%)' },
              { key: '5years', label: '5 Years (Save 60%)' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setBillingInterval(item.key as BillingInterval)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  billingInterval === item.key
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {plans.map((plan) => {
          return (
            <div
              key={plan.name}
              className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all bg-white relative ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                  Most Popular for Pharmacies
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {plan.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plan.tagline}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{plan.price}</span>
                    <span className="text-xs font-bold text-slate-500">{plan.periodText}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    {plan.effectiveMonthly}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400">
                    {plan.savings}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Users: <strong className="text-blue-600">{plan.maxUsers} Accounts</strong></span>
                  <span>•</span>
                  <span>Firms: <strong className="text-blue-600">{plan.maxFirms} Branch(es)</strong></span>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Features Included</div>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${plan.buttonBg}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Activate on WhatsApp</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Highlights Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6 shadow-xs">
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Why Top Pharmacies Trust MBI Inventra</h3>
          <p className="text-xs text-slate-500">Engineered specifically for medical stores with offline reliability and audit trails.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <h4 className="text-sm font-bold text-slate-900">High-Speed POS Billing</h4>
            <p className="text-xs text-slate-500">Instant barcode scanning, keyboard-first shortcuts, and crystal-clear thermal receipts in under 3 seconds.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-lg">
              🛡️
            </div>
            <h4 className="text-sm font-bold text-slate-900">Batch & Expiry Protection</h4>
            <p className="text-xs text-slate-500">Prevent dispensing expired medicines. Automated 30/60/90-day alert monitor with return debit notes.</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
              📑
            </div>
            <h4 className="text-sm font-bold text-slate-900">Tax & Audit Readiness</h4>
            <p className="text-xs text-slate-500">Export CSV and Excel registers for tax compliance, sales audits, profit & loss, and ledger reconciliations.</p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">Frequently Asked Questions</h3>
          <p className="text-xs text-slate-500">Everything you need to know about licensing and offline features.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-xs sm:text-sm hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-blue-600 text-base font-mono font-bold">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Developer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <Phone className="w-3.5 h-3.5" />
            <span>Direct Developer Hotline</span>
          </div>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight">Need Custom Features or Hardware Setup?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Contact technical helpline for barcode printer configuration, multi-device networking, or customized pharmacy features.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            href={contact.callUrl(contact.phone1)}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-98 flex items-center gap-2 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>Call {contact.displayPhone1}</span>
          </a>
          <a
            href={contact.whatsappUrl('Hello! I need assistance with MBI Inventra pharmacy software.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-transform active:scale-98 flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp {contact.displayPhone2}</span>
          </a>
        </div>
      </div>

      {/* License Key Modal */}
      <LicenseActivationModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        onStatusChange={() => setLicenseInfo(getLicenseInfo())}
      />
    </div>
  );
};
