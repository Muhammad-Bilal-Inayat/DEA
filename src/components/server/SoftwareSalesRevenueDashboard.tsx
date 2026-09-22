import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Users, Clock, AlertCircle, CheckCircle2,
  Share2, ArrowUpRight, Search, Plus, RefreshCw, Calendar, 
  CreditCard, ShieldCheck, FileText, Phone, Building2, ExternalLink,
  Award, PackageCheck, Calculator, Sparkles, Layers, Trophy,
  Percent, ArrowRight, Zap, BadgePercent, Check
} from 'lucide-react';
import { 
  getSoftwareSalesMetrics, 
  SoftwareSalesMetrics, 
  ClientLicense, 
  getAllClientLicenses, 
  getAllTenants 
} from '../../lib/masterServerService';
import { LicenseActivationModal } from './LicenseActivationModal';

interface SoftwareSalesRevenueDashboardProps {
  onOpenNewLicense?: () => void;
  onOpenNewTenant?: () => void;
  onNotify?: (msg: string) => void;
}

export const SoftwareSalesRevenueDashboard: React.FC<SoftwareSalesRevenueDashboardProps> = ({
  onOpenNewLicense,
  onOpenNewTenant,
  onNotify
}) => {
  const [metrics, setMetrics] = useState<SoftwareSalesMetrics>(() => getSoftwareSalesMetrics());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  const refreshData = () => {
    const updated = getSoftwareSalesMetrics();
    setMetrics(updated);
    onNotify?.('Software sales & revenue synced with live master fleet!');
  };

  useEffect(() => {
    setMetrics(getSoftwareSalesMetrics());
  }, []);

  const formatPkr = (num: number) => {
    return 'Rs. ' + (num || 0).toLocaleString('en-PK');
  };

  const handleShareWhatsAppDeal = (deal: SoftwareSalesMetrics['recentDeals'][0]) => {
    const text = `*MBI INVENTRA POS & ERP - LICENSE & DEAL CONFIRMATION* 🚀%0A` +
      `---------------------------------------%0A` +
      `*Client Business:* ${deal.clientName}%0A` +
      `*Owner Name:* ${deal.ownerName}%0A` +
      `*City:* ${deal.city}%0A` +
      `*Software Plan:* ${deal.plan}%0A` +
      `*License Key:* ${deal.licenseKey}%0A` +
      `*Agreed Deal Price:* ${formatPkr(deal.salePrice)}%0A` +
      `*Amount Paid:* ${formatPkr(deal.amountPaid)}%0A` +
      `*Balance Due:* ${formatPkr(deal.amountDue)}%0A` +
      `*Payment Status:* ${deal.saleStatus.toUpperCase()}%0A` +
      `*Payment Method:* ${deal.paymentMethod}%0A` +
      `*Date of Issue:* ${deal.saleDate}%0A` +
      `---------------------------------------%0A` +
      `Thank you for choosing MBI Inventra POS & ERP. For support: 03364585863.`;

    const cleanPhone = deal.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : 
                             cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;

    const url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`;
    window.open(url, '_blank');
  };

  // Filter deals
  const filteredDeals = metrics.recentDeals.filter(d => {
    const matchSearch = 
      d.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.licenseKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.plan.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter !== 'all' && d.saleStatus !== statusFilter) return false;
    if (planFilter !== 'all' && d.plan !== planFilter) return false;

    return true;
  });

  // Top 3 performing products ranked
  const topProducts = metrics.planBreakdown.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-100/50 dark:from-slate-900 dark:via-slate-850 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-3xl shadow-md dark:shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Software Sales & Master Revenue Hub</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50">
                  Master SaaS Live
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Track your software license sales, custom deal prices, payments received, receivables, and subscription renewals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={refreshData}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Deals</span>
          </button>

          <button
            onClick={() => {
              if (onOpenNewLicense) onOpenNewLicense();
              else setIsActivationModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Sale Deal</span>
          </button>

          {onOpenNewTenant && (
            <button
              onClick={onOpenNewTenant}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Building2 className="w-4 h-4" />
              <span>Onboard Tenant Store</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HIGH-LEVEL EXECUTIVE SUMMARY: BUSINESS SUCCESS OVERVIEW (3 SUMMARY CARDS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Top Performing Products */}
        <div className="p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-amber-400/60 transition-all flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Performance Leader</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Top Performing Products</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                #1 Best Seller
              </span>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>{metrics.topPerformingProduct.planName}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="text-amber-700 dark:text-amber-300 font-bold font-mono">{metrics.topPerformingProduct.dealsCount} Units Sold</span> &bull; <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{metrics.topPerformingProduct.percentage}% Share</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatPkr(metrics.topPerformingProduct.revenuePkr)}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Revenue Generated</div>
                </div>
              </div>

              {/* Progress bar contribution */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(12, metrics.topPerformingProduct.percentage)}%` }}
                />
              </div>
            </div>

            {/* Runner-up Products Ranking */}
            {topProducts.length > 1 && (
              <div className="mt-3 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Product Tier Ranking:</span>
                <div className="grid grid-cols-2 gap-2">
                  {topProducts.slice(1, 3).map((prod, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-xl text-[11px] flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">#{idx + 2} {prod.planName}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">{prod.dealsCount}u</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Gross Portfolio Value:</span>
            <span className="text-amber-700 dark:text-amber-300 font-mono font-bold">{formatPkr(metrics.totalRevenuePkr)}</span>
          </div>
        </div>

        {/* Card 2: Total Units Sold */}
        <div className="p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-indigo-400/60 transition-all flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Fleet Volume</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Total Units Sold</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40">
                Commercial Units
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3">
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {metrics.totalUnitsSold}
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300">
                Licenses &amp; Systems Deployed
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Paid &amp; Partial Deals</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {metrics.paidDealsCount + metrics.partialDealsCount} Units
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pipeline Free Trials</span>
                <span className="text-sm font-black text-cyan-600 dark:text-cyan-300 font-mono">
                  {metrics.trialDealsCount} Units
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-indigo-800 dark:text-indigo-200 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Active Commercial Stores</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {metrics.activePaidTenantsCount} Pharmacy Branches
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>License Deployment Rate:</span>
            <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">
              {metrics.totalDealsCount > 0 ? Math.round((metrics.totalUnitsSold / metrics.totalDealsCount) * 100) : 100}% Closed
            </span>
          </div>
        </div>

        {/* Card 3: Average Transaction Value (ATV) */}
        <div className="p-5 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-emerald-400/60 transition-all flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Deal Economics</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Average Transaction Value</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                ATV (PKR)
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                {formatPkr(metrics.averageTransactionValuePkr)}
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                / deal
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Avg Cash Collected</span>
                <span className="text-xs font-black text-blue-600 dark:text-blue-300 font-mono">
                  {formatPkr(metrics.totalUnitsSold > 0 ? Math.round(metrics.totalCollectedPkr / metrics.totalUnitsSold) : 0)}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Avg Outstanding Due</span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                  {formatPkr(metrics.totalUnitsSold > 0 ? Math.round(metrics.totalReceivablePkr / metrics.totalUnitsSold) : 0)}
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Collection Efficiency</span>
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {metrics.totalRevenuePkr > 0 ? Math.round((metrics.totalCollectedPkr / metrics.totalRevenuePkr) * 100) : 100}% Realized
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Revenue Velocity Benchmark:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">Strong SaaS Margins</span>
          </div>
        </div>

      </div>

      {/* 6 Essential Software Sales & Revenue Breakdown Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Widget 1: Total Software Revenue */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sales Booked</span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{formatPkr(metrics.totalRevenuePkr)}</div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.totalDealsCount} Total Deals Closed</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Collected Cash vs Paid */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collected / Paid</span>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-blue-600 dark:text-blue-300">{formatPkr(metrics.totalCollectedPkr)}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="text-blue-600 dark:text-blue-400">{metrics.paidDealsCount} Full</span> • <span className="text-amber-600 dark:text-amber-400">{metrics.partialDealsCount} Partial</span>
            </div>
          </div>
        </div>

        {/* Widget 3: Unpaid & Pending Receivables */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Receivables</span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">{formatPkr(metrics.totalReceivablePkr)}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="text-amber-700 dark:text-amber-300 font-bold">{metrics.pendingDealsCount} Unpaid</span> Clients
            </div>
          </div>
        </div>

        {/* Widget 4: Active Paid Subscriptions */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Paid Clients</span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{metrics.activePaidTenantsCount} Stores</div>
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-300 mt-0.5">
              Commercial Fleet Active
            </div>
          </div>
        </div>

        {/* Widget 5: Renewals Due This Month */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Renewals Due</span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-rose-600 dark:text-rose-400">{metrics.renewalsDueThisMonth} Accounts</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Trial / Sub Expiring
            </div>
          </div>
        </div>

        {/* Widget 6: Complimentary & 3-Day Trials */}
        <div className="p-4 bg-white dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-500/40 rounded-2xl shadow-sm dark:shadow-lg relative overflow-hidden group hover:border-cyan-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Free Trials Funnel</span>
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-cyan-600 dark:text-cyan-300">{metrics.trialDealsCount} Trials</div>
            <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              Leads In Pipeline
            </div>
          </div>
        </div>
      </div>

      {/* Plan Revenue Breakdown & Sales Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Top Selling Software Plans</span>
          </h3>

          <div className="space-y-3">
            {metrics.planBreakdown.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900 dark:text-white">{item.planName}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatPkr(item.revenuePkr)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${Math.max(8, item.percentage)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{item.dealsCount} Sold Deals</span>
                  <span>{item.percentage}% of Volume</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deals Table & Feed with Filters */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm dark:shadow-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Software Sales Ledger &amp; Deals Feed</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">All registered software sales and custom pricing</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search store, owner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">All Payment Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
                <option value="Complimentary / Trial">Trial / Free</option>
              </select>
            </div>
          </div>

          {/* Deals Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3.5">Client / Store</th>
                  <th className="py-3 px-3.5">Plan &amp; License</th>
                  <th className="py-3 px-3.5 text-right">Deal Price</th>
                  <th className="py-3 px-3.5 text-right">Paid / Due</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No software sale records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-black text-slate-900 dark:text-white">{deal.clientName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{deal.ownerName}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400/90">{deal.phone}</span>
                          <span>•</span>
                          <span className="text-slate-400 dark:text-slate-500">{deal.city}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{deal.plan}</span>
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400/80">{deal.licenseKey}</span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {formatPkr(deal.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{deal.saleDate}</div>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-300 font-mono">
                          Paid: {formatPkr(deal.amountPaid)}
                        </div>
                        {deal.amountDue > 0 && (
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                            Due: {formatPkr(deal.amountDue)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          deal.saleStatus === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600/50' :
                          deal.saleStatus === 'Partial' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-600/50' :
                          deal.saleStatus === 'Pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50 animate-pulse' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {deal.saleStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleShareWhatsAppDeal(deal)}
                            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Share Official Deal & License Receipt on WhatsApp"
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LicenseActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        onSuccess={(msg) => {
          refreshData();
          onNotify?.(msg);
        }}
      />
    </div>
  );
};

