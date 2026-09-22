import React from 'react';
import { 
  AlertTriangle, ShieldCheck, Check, Sparkles, Key, 
  ArrowRight, Phone, MessageSquare, X, Building2, Users, FileText 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSaaSPlans } from '../../lib/planLimitsService';

interface TrialExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLicenseModal: () => void;
}

export const TrialExpiredModal: React.FC<TrialExpiredModalProps> = ({
  isOpen,
  onClose,
  onOpenLicenseModal,
}) => {
  const { tenant, business } = useAuth();
  const navigate = useNavigate();
  const saasPlans = getSaaSPlans();

  if (!isOpen) return null;

  const handleSelectPlan = (planId: string) => {
    onClose();
    navigate('/pricing');
  };

  const handleWhatsAppSupport = (planName: string = 'Basic') => {
    const whatsappNum = '923364585863';
    const message = encodeURIComponent(
      `Hello! My 3-day trial for pharmacy "${tenant?.name || business?.name || 'My Pharmacy Store'}" has expired. I want to activate the ${planName} Plan. Please share payment and license activation details.`
    );
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, '_blank');
  };

  return (
    <div 
      id="trial-expired-modal-backdrop"
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="trial-expired-modal"
        className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <span className="bg-black/30 border border-white/20 text-amber-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                3-Day BASIC Free Trial Ended
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Choose a Paid Plan to Continue
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5">
                Pharmacy: <strong>{tenant?.name || business?.name || 'Your Pharmacy'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Data Preservation Guarantee Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-y border-emerald-200 dark:border-emerald-800/80 px-5 py-3 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold leading-relaxed">
            <strong>100% Data Preservation Guarantee:</strong> None of your data has been deleted. All your medicines, stock levels, sales bills, supplier purchases, ledgers, and settings are safe.
          </p>
        </div>

        {/* Available Paid Plans Selection */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-center sm:text-left">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Available Paid Plans
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select a package to upgrade your existing account without creating a new store:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            {saasPlans.map((plan) => {
              const isBusiness = plan.id === 'Business';
              const isPremium = plan.id === 'Premium';

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-4 flex flex-col justify-between border transition-all ${
                    isBusiness
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 ring-2 ring-blue-500/30 shadow-md'
                      : isPremium
                      ? 'border-purple-300 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        isBusiness 
                          ? 'bg-blue-600 text-white' 
                          : isPremium 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-slate-800 text-white'
                      }`}>
                        {plan.name}
                      </span>
                      {isBusiness && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.2 rounded">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Rs. {plan.pricing.yearly.toLocaleString()}<span className="text-xs font-normal text-slate-500">/yr</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                        {plan.tagline}
                      </p>
                    </div>

                    <ul className="space-y-1.5 text-[11.5px] text-slate-700 dark:text-slate-300 my-3">
                      <li className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Up to <strong>{plan.maxUsers} Users</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Up to <strong>{plan.maxFirms} Firm(s)</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>POS & Inventory</span>
                      </li>
                      {plan.features.batchManagement && (
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Batch & Expiry Radar</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      isBusiness
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : isPremium
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span>Choose {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions & Direct Activation */}
        <div className="bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenLicenseModal();
              }}
              className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Enter License Key</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Need instant activation?</span>
            <button
              onClick={() => handleWhatsAppSupport('Basic')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Support (0336-4585863)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
