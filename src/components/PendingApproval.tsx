import React from 'react';
import { Clock, ShieldAlert, MessageSquare, Phone, LogOut, ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_PRIMARY_WHATSAPP, ADMIN_SUPPORT_PHONE } from '../lib/registrationLeadsService';
import { Link } from 'react-router-dom';

export const PendingApproval: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();

  const userEmail = userProfile?.email || currentUser?.email || 'Registered User';
  const userName = userProfile?.name || currentUser?.displayName || 'Valued User';

  const handleContactAdmin = () => {
    const text = encodeURIComponent(
      `Salam Admin! My account (${userEmail}) is pending approval on MBI Inventra. Please approve my access.`
    );
    window.open(`https://wa.me/923281302636?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-100">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 text-center space-y-6">
        
        {/* Animated Badge */}
        <div className="relative w-20 h-20 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-900 animate-ping" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
            <span>Waiting for Admin Approval</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Account Pending Approval
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Welcome <strong className="text-slate-900 dark:text-slate-200">{userName}</strong> ({userEmail}). 
            Your registration details have been saved to Firestore. Access to the POS Dashboard is currently restricted until the Master Admin verifies and approves your account.
          </p>
        </div>

        {/* Status Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-left space-y-2">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500 font-semibold">Account Status:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              isApproved: false (Pending)
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="text-slate-500 font-semibold">User Email:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{userEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold">Database Sync:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Recorded in Firestore</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleContactAdmin}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Contact Admin on WhatsApp ({ADMIN_PRIMARY_WHATSAPP})</span>
          </button>

          <Link
            to="/feedback"
            className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Phone className="w-4 h-4 text-blue-600" />
            <span>Open Feedback & Support Page</span>
          </Link>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Try Different Account</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          MBI INVENTRA — Enterprise Cloud ERP & POS Security Engine
        </div>
      </div>
    </div>
  );
};
