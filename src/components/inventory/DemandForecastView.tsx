import React, { useState, useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Package, ArrowRight, ShoppingCart, RefreshCw, Filter, Sparkles, Plus } from 'lucide-react';
import { Medicine, Invoice, PurchaseOrder, DemandForecast } from '../../types';
import { calculateDemandForecasts } from '../../lib/enterprisePharma';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface DemandForecastViewProps {
  medicines: Medicine[];
  invoices: Invoice[];
  onCreatePOFromForecast: (medicine: Medicine, suggestedQty: number) => void;
}

export const DemandForecastView: React.FC<DemandForecastViewProps> = ({
  medicines,
  invoices,
  onCreatePOFromForecast
}) => {
  const [analysisDays, setAnalysisDays] = useState<number>(30);
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const forecasts = useMemo(() => {
    return calculateDemandForecasts(medicines, invoices, analysisDays);
  }, [medicines, invoices, analysisDays]);

  const filteredForecasts = useMemo(() => {
    return forecasts.filter(f => {
      const matchUrgency = urgencyFilter === 'ALL' || f.reorderUrgency === urgencyFilter;
      const matchSearch = f.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.supplierName && f.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchUrgency && matchSearch;
    });
  }, [forecasts, urgencyFilter, searchQuery]);

  const criticalCount = forecasts.filter(f => f.reorderUrgency === 'CRITICAL').length;
  const warningCount = forecasts.filter(f => f.reorderUrgency === 'WARNING').length;
  const optimalCount = forecasts.filter(f => f.reorderUrgency === 'OPTIMAL').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Analytics Summary */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI & Algorithmic Inventory Planning
            </div>
            <h2 className="text-xl font-black text-white">
              Demand Forecast & Auto-Reorder Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Calculates daily sales velocity over the past {analysisDays} days, predicts days until stockout, and suggests replenishment purchase orders.
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
            <span className="text-slate-300 font-medium">Sales Window:</span>
            <select
              value={analysisDays}
              onChange={(e) => setAnalysisDays(Number(e.target.value))}
              className="bg-slate-800 text-white font-bold rounded px-2 py-1 focus:outline-none"
            >
              <option value={7}>Last 7 Days</option>
              <option value={15}>Last 15 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-rose-500/20 border border-rose-400/30 rounded-xl p-3">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider block">Stockout / Critical (&lt;2 Days)</span>
            <span className="text-2xl font-black text-white">{criticalCount} <span className="text-xs font-normal text-rose-200">items</span></span>
          </div>
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">Reorder Suggested</span>
            <span className="text-2xl font-black text-white">{warningCount} <span className="text-xs font-normal text-amber-200">items</span></span>
          </div>
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">Optimal Buffer</span>
            <span className="text-2xl font-black text-white">{optimalCount} <span className="text-xs font-normal text-emerald-200">items</span></span>
          </div>
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-3">
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block">Monitored SKU Base</span>
            <span className="text-2xl font-black text-white">{medicines.length} <span className="text-xs font-normal text-blue-200">medicines</span></span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setUrgencyFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              urgencyFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({forecasts.length})
          </button>
          <button
            onClick={() => setUrgencyFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              urgencyFilter === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Critical Stockout ({criticalCount})
          </button>
          <button
            onClick={() => setUrgencyFilter('WARNING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              urgencyFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Reorder Needed ({warningCount})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search medicine or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Forecast Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold">Medicine / Brand</th>
              <th className="py-3 px-4 font-bold text-center">Current Stock</th>
              <th className="py-3 px-4 font-bold text-center">Avg Velocity</th>
              <th className="py-3 px-4 font-bold text-center">Days to Stockout</th>
              <th className="py-3 px-4 font-bold text-center">Suggested PO</th>
              <th className="py-3 px-4 font-bold text-center">Status</th>
              <th className="py-3 px-4 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredForecasts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  No medicines match the selected filter.
                </td>
              </tr>
            ) : (
              filteredForecasts.map((f) => {
                const med = medicines.find(m => m.id === f.medicineId);
                return (
                  <tr key={f.medicineId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{f.medicineName}</div>
                      <div className="text-[11px] text-slate-500">{f.supplierName || 'Standard Supplier'}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                        f.currentStock <= 5 ? 'bg-rose-100 text-rose-800' : 'text-slate-800'
                      }`}>
                        {f.currentStock} {med?.unit || 'units'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {f.avgDailySales} /day
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                        f.estimatedStockoutDays <= 2 
                          ? 'bg-rose-100 text-rose-700 font-black' 
                          : f.estimatedStockoutDays <= 7 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {f.estimatedStockoutDays === 999 ? '∞' : `${f.estimatedStockoutDays} days`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {f.suggestedReorderQty > 0 ? `+${f.suggestedReorderQty}` : '0'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {f.reorderUrgency === 'CRITICAL' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[10px]">
                          CRITICAL
                        </span>
                      )}
                      {f.reorderUrgency === 'WARNING' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                          REORDER
                        </span>
                      )}
                      {f.reorderUrgency === 'OPTIMAL' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                          OPTIMAL
                        </span>
                      )}
                      {f.reorderUrgency === 'OVERSTOCKED' && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full text-[10px]">
                          OVERSTOCKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {med && (
                        <button
                          onClick={() => onCreatePOFromForecast(med, f.suggestedReorderQty || 20)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 transition shadow-sm"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Draft PO
                        </button>
                      )}
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
