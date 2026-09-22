import React, { useState, useMemo } from 'react';
import { Truck, Star, Award, TrendingUp, DollarSign, Calendar, Clock, ShoppingCart, ArrowUpRight, Search } from 'lucide-react';
import { Supplier, PurchaseOrder } from '../../types';
import { calculateSupplierScorecards } from '../../lib/enterprisePharma';
import { formatCurrency, formatDate } from '../../lib/utils';

interface SupplierIntelligenceViewProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onNewPO: (supplier: Supplier) => void;
}

export const SupplierIntelligenceView: React.FC<SupplierIntelligenceViewProps> = ({
  suppliers,
  purchaseOrders,
  onNewPO
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const scorecards = useMemo(() => {
    return calculateSupplierScorecards(suppliers, purchaseOrders);
  }, [suppliers, purchaseOrders]);

  const filteredScorecards = useMemo(() => {
    return scorecards.filter(s => 
      s.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [scorecards, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              Vendor Performance & Procurement Analytics
            </div>
            <h2 className="text-xl font-black text-white">
              Supplier Intelligence & Scorecards
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Monitor procurement volume, fulfillment lead times, price competitiveness, and delivery reliability.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">Total Active Vendors</span>
            <span className="text-2xl font-black text-white">{suppliers.length}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search supplier name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScorecards.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-200">
            No supplier scorecards found.
          </div>
        ) : (
          filteredScorecards.map((s) => {
            const sup = suppliers.find(su => su.id === s.supplierId);
            return (
              <div key={s.supplierId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{s.supplierName}</h3>
                    <p className="text-[11px] text-slate-500">{sup?.phone || 'No phone'}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800 font-black text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {s.ratingScore} / 5.0
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Procurement Vol</span>
                    <span className="font-black text-slate-900">{formatCurrency(s.totalPurchasesAmount)}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Purchase Orders</span>
                    <span className="font-black text-slate-900">{s.totalOrdersCount} POs</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase block">On-Time Rate</span>
                    <span className="font-black text-emerald-900">{s.onTimeDeliveryRate}%</span>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-blue-700 font-semibold uppercase block">Avg Lead Time</span>
                    <span className="font-black text-blue-900">{s.avgDeliveryDays} Days</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Last PO: {s.lastPurchaseDate ? formatDate(s.lastPurchaseDate) : 'N/A'}
                  </span>
                  {sup && (
                    <button
                      onClick={() => onNewPO(sup)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Create PO
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
