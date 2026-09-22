import React, { useState, useMemo } from 'react';
import { AlertOctagon, Calendar, Package, Trash2, ShieldAlert, ArrowRight, Download, Filter, DollarSign } from 'lucide-react';
import { Medicine } from '../../types';
import { calculateExpiryAnalytics } from '../../lib/enterprisePharma';
import { formatCurrency, formatDate } from '../../lib/utils';

interface ExpiryManagementViewProps {
  medicines: Medicine[];
  onOpenTraceability: (med: Medicine) => void;
  onOpenRecall: (med: Medicine, batch: string) => void;
  onQuarantineExpired: (med: Medicine) => void;
}

export const ExpiryManagementView: React.FC<ExpiryManagementViewProps> = ({
  medicines,
  onOpenTraceability,
  onOpenRecall,
  onQuarantineExpired
}) => {
  const [activeBucket, setActiveBucket] = useState<'EXPIRED' | '30' | '60' | '90' | '180'>('EXPIRED');
  const analytics = useMemo(() => calculateExpiryAnalytics(medicines), [medicines]);

  const currentList = useMemo(() => {
    switch (activeBucket) {
      case 'EXPIRED': return analytics.expired.items;
      case '30': return analytics.in30Days.items;
      case '60': return analytics.in60Days.items;
      case '90': return analytics.in90Days.items;
      case '180': return (analytics as any).in180Days?.items || [];
    }
  }, [activeBucket, analytics]);

  return (
    <div className="space-y-6">
      
      {/* Top Expiry Risk Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
              DRAP & Expiration Risk Intelligence
            </div>
            <h2 className="text-xl font-black text-white">
              Smart Expiry Dashboard & Capital At Risk
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Proactive tracking of expired and near-expiry medications with projected loss valuation and supplier return routing.
            </p>
          </div>

          <div className="bg-rose-500/20 border border-rose-400/30 px-4 py-2.5 rounded-xl text-right">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">Estimated Capital At Risk (&lt;60d)</span>
            <span className="text-2xl font-black text-white">{formatCurrency(analytics.totalAtRiskCost)}</span>
          </div>
        </div>

        {/* 5 Risk Buckets (Expired, 30d, 60d, 90d, 6 Months) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <button
            onClick={() => setActiveBucket('EXPIRED')}
            className={`p-3 rounded-xl border text-left transition ${
              activeBucket === 'EXPIRED'
                ? 'bg-rose-600/40 border-rose-400 ring-2 ring-rose-400'
                : 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
            }`}
          >
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">Expired Today / Past</span>
            <span className="text-xl font-black text-white">{analytics.expired.count} <span className="text-xs font-normal text-rose-200">items</span></span>
            <div className="text-[11px] text-rose-200 mt-1">Loss: {formatCurrency(analytics.expired.costValue)}</div>
          </button>

          <button
            onClick={() => setActiveBucket('30')}
            className={`p-3 rounded-xl border text-left transition ${
              activeBucket === '30'
                ? 'bg-amber-600/40 border-amber-400 ring-2 ring-amber-400'
                : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Expires in &le; 30 Days</span>
            <span className="text-xl font-black text-white">{analytics.in30Days.count} <span className="text-xs font-normal text-amber-200">items</span></span>
            <div className="text-[11px] text-amber-200 mt-1">Cost: {formatCurrency(analytics.in30Days.costValue)}</div>
          </button>

          <button
            onClick={() => setActiveBucket('60')}
            className={`p-3 rounded-xl border text-left transition ${
              activeBucket === '60'
                ? 'bg-orange-600/40 border-orange-400 ring-2 ring-orange-400'
                : 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
            }`}
          >
            <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider block">Expires in &le; 60 Days</span>
            <span className="text-xl font-black text-white">{analytics.in60Days.count} <span className="text-xs font-normal text-orange-200">items</span></span>
            <div className="text-[11px] text-orange-200 mt-1">Cost: {formatCurrency(analytics.in60Days.costValue)}</div>
          </button>

          <button
            onClick={() => setActiveBucket('90')}
            className={`p-3 rounded-xl border text-left transition ${
              activeBucket === '90'
                ? 'bg-blue-600/40 border-blue-400 ring-2 ring-blue-400'
                : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
            }`}
          >
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Expires in &le; 90 Days</span>
            <span className="text-xl font-black text-white">{analytics.in90Days.count} <span className="text-xs font-normal text-blue-200">items</span></span>
            <div className="text-[11px] text-blue-200 mt-1">Cost: {formatCurrency(analytics.in90Days.costValue)}</div>
          </button>

          <button
            onClick={() => setActiveBucket('180')}
            className={`p-3 rounded-xl border text-left transition col-span-2 sm:col-span-1 ${
              activeBucket === '180'
                ? 'bg-indigo-600/40 border-indigo-400 ring-2 ring-indigo-400'
                : 'bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Expires in &le; 6 Months</span>
            <span className="text-xl font-black text-white">{(analytics as any).in180Days?.count || 0} <span className="text-xs font-normal text-indigo-200">items</span></span>
            <div className="text-[11px] text-indigo-200 mt-1">Cost: {formatCurrency((analytics as any).in180Days?.costValue || 0)}</div>
          </button>
        </div>
      </div>

      {/* Expiry Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {activeBucket === 'EXPIRED' ? 'Expired Medicines' : activeBucket === '180' ? 'Expiring within 6 Months (180 Days)' : `Expiring within ${activeBucket} Days`} ({currentList.length})
            </span>
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Medicine</th>
              <th className="py-3 px-4 font-bold">Batch #</th>
              <th className="py-3 px-4 font-bold">Expiry Date</th>
              <th className="py-3 px-4 font-bold text-center">Remaining Stock</th>
              <th className="py-3 px-4 font-bold text-right">Cost Loss</th>
              <th className="py-3 px-4 font-bold text-right">MRP Value</th>
              <th className="py-3 px-4 font-bold">Supplier / Brand</th>
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  No medicines found in this expiration range.
                </td>
              </tr>
            ) : (
              currentList.map((m) => {
                const isExpired = new Date(m.expiryDate).getTime() <= Date.now();
                return (
                  <tr key={m.id} className={`hover:bg-slate-50 transition ${isExpired ? 'bg-rose-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-500">{m.category || 'General Pharma'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{m.batchNumber || 'DEFAULT'}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        isExpired ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {formatDate(m.expiryDate)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {m.quantity} {m.unit || 'units'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-700">
                      {formatCurrency(m.quantity * m.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {formatCurrency(m.quantity * (m.mrp || m.sellingPrice))}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {m.manufacturer || 'Direct Supplier'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenTraceability(m)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded text-[11px] transition"
                        >
                          Trace
                        </button>
                        {isExpired && m.stockStatus !== 'Quarantined' && (
                          <button
                            onClick={() => onQuarantineExpired(m)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[11px] transition flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" /> Quarantine
                          </button>
                        )}
                        <button
                          onClick={() => onOpenRecall(m, m.batchNumber || 'DEFAULT')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[11px] transition"
                        >
                          Recall
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
