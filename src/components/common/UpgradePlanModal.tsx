import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, X, CheckCircle2, ShieldAlert, ArrowRight, 
  Crown, Zap, Building2, Users, HardDrive
} from 'lucide-react';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'users' | 'firms' | 'storage' | 'general';
  currentCount?: number;
  maxAllowed?: number;
  plan?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  currentCount = 0,
  maxAllowed = 0,
  plan = 'Free Starter'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const getResourceTitle = () => {
    switch (resourceType) {
      case 'users':
        return 'User Account Limit Reached';
      case 'firms':
        return 'Branch / Organization Limit Reached';
      case 'storage':
        return 'Cloud Storage Quota Reached';
      default:
        return 'Tier Upgrade Required';
    }
  };

  const getResourceDesc = () => {
    switch (resourceType) {
      case 'users':
        return `Your current ${plan} plan allows up to ${maxAllowed} team user account(s) (current: ${currentCount}). Upgrade to Business (10 users) or Premium (20 users) to expand team capacity.`;
      case 'firms':
        return `Your current ${plan} plan allows up to ${maxAllowed} business firm(s)/branches (current: ${currentCount}). Upgrade to Business (5 firms) or Premium (10 firms) to add multiple pharmacies.`;
      default:
        return `You have reached the capacity limit of your current ${plan} plan. Upgrade to Business or Premium to unlock additional capacity.`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                Plan Limit Warning
              </span>
              <h3 className="text-base font-bold leading-tight mt-0.5">
                {getResourceTitle()}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Usage Meter Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                {resourceType === 'users' && <Users className="w-4 h-4 text-blue-600" />}
                {resourceType === 'firms' && <Building2 className="w-4 h-4 text-emerald-600" />}
                {resourceType === 'storage' && <HardDrive className="w-4 h-4 text-purple-600" />}
                <span>Active Resource Usage</span>
              </span>
              <span className="font-bold font-mono text-amber-700">
                {currentCount} / {maxAllowed} ({Math.min(100, Math.round((currentCount / (maxAllowed || 1)) * 100))}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((currentCount / (maxAllowed || 1)) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {getResourceDesc()}
            </p>
          </div>

          {/* Premium Plan Benefits */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Upgrade to Premium Tier Includes:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Unlimited Staff & Cashiers</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Multi-Branch Synchronization</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Daily Cloud Automatic Backups</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>24/7 Priority WhatsApp Support</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/pricing');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Explore Upgrade Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
