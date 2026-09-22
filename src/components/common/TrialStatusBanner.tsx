import React from 'react';
import { Sparkles, Clock, AlertTriangle, ArrowRight, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getEffectiveTenantLimits } from '../../lib/planLimitsService';

interface TrialStatusBannerProps {
  onOpenLicenseModal?: () => void;
  onOpenPricingModal?: () => void;
}

export const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  onOpenLicenseModal,
  onOpenPricingModal
}) => {
  const { tenant, tenantId, isTrialActive, trialExpired, trialRemaining } = useAuth();
  const navigate = useNavigate();

  // If no trial active or tenant is on a paid perpetual/subscription license, don't show trial banner
  if (!tenant || (!isTrialActive && !trialExpired && tenant.status !== 'Trial')) {
    return null;
  }

  const effectiveLimits = getEffectiveTenantLimits(tenantId);
  const maxUsers = effectiveLimits.maxUsers || 5;
  const maxFirms = effectiveLimits.maxFirms || 2;

  // Case 1: Trial Expired
  if (trialExpired || trialRemaining.isExpired || tenant.status === 'Expired') {
    return (
      <div 
        id="trial-expired-banner"
        className="w-full bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-3 sm:px-4 py-2 shadow-sm border-b border-amber-500/40 text-xs select-none z-30"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-white/20 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black tracking-wide uppercase bg-black/30 px-2 py-0.5 rounded-full text-[10px] border border-white/20">
                  Trial Expired
                </span>
                <span className="font-bold text-white truncate text-[11.5px] sm:text-xs">
                  Your 3-Day BASIC Free Trial for "{tenant.name}" has ended.
                </span>
              </div>
              <p className="text-[10.5px] text-amber-100/90 truncate hidden md:block mt-0.5">
                All your products, invoices, customers, and settings are <strong>100% safe & preserved</strong>. Choose a paid plan to continue full operation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {onOpenLicenseModal && (
              <button
                type="button"
                onClick={onOpenLicenseModal}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] transition-colors border border-white/30 flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3 h-3 text-amber-200" />
                <span className="hidden sm:inline">Activate License</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenPricingModal) onOpenPricingModal();
                else navigate('/pricing');
              }}
              className="px-3 py-1 rounded-lg bg-white text-slate-900 hover:bg-amber-50 font-black text-[11px] shadow-sm transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>Choose Paid Plan (Basic / Business / Premium)</span>
              <ArrowRight className="w-3 h-3 text-slate-900" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Active 3-Day Basic Free Trial
  return (
    <div 
      id="trial-active-banner"
      className="w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-slate-200 px-3 py-1 shadow-2xs border-b border-indigo-800/60 text-xs select-none z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5 min-h-[26px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0 border border-blue-400/30">
            <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
          </span>
          <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
            <span className="font-black tracking-wide uppercase bg-blue-600/30 text-blue-200 px-1.5 py-0.2 rounded-full text-[9.5px] border border-blue-400/40">
              3-Day (72h) Trial
            </span>
            
            <div className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-200" title={`Strict 72-Hour Free Trial: ${trialRemaining.hoursFormatted || trialRemaining.formatted}`}>
              <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="font-mono text-amber-300 font-bold">
                {trialRemaining.formatted}
              </span>
            </div>

            <span className="hidden lg:inline text-slate-600">•</span>

            <span className="hidden lg:inline text-[10.5px] text-slate-400">
              Limits: <strong className="text-slate-200">Max {maxUsers} Users</strong> & <strong className="text-slate-200">{maxFirms} Firms</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {onOpenLicenseModal && (
            <button
              type="button"
              onClick={onOpenLicenseModal}
              className="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-[10px] transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              title="Activate Paid Pharmacy License Key"
            >
              <Key className="w-2.5 h-2.5 text-amber-400" />
              <span className="hidden sm:inline">Enter License</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onOpenPricingModal) onOpenPricingModal();
              else navigate('/pricing');
            }}
            className="px-2 py-0.2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <span>Upgrade</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
