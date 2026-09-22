import React, { useState, useMemo } from 'react';
import { CentralMedicine } from '../../../types';
import { Sparkles, Search, Send, Building2, ShieldCheck, CheckCircle2, Lock, Tag, Layers } from 'lucide-react';

interface SyncedItemsTabProps {
  medicines: CentralMedicine[];
  onAssignToOthers: (medIds: string[]) => void;
}

export const SyncedItemsTab: React.FC<SyncedItemsTabProps> = ({
  medicines,
  onAssignToOthers
}) => {
  const [search, setSearch] = useState('');

  const syncedItems = useMemo(() => {
    return medicines.filter(m => m.source === 'CUSTOMER_SYNC' || m.isCustomerSynced);
  }, [medicines]);

  const filtered = useMemo(() => {
    if (!search.trim()) return syncedItems;
    const q = search.toLowerCase().trim();
    return syncedItems.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.sourceTenantId?.toLowerCase().includes(q) ||
      m.sourceTenantName?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  }, [syncedItems, search]);

  return (
    <div className="space-y-4">
      {/* Information Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Customer-Synced Medicine Templates ({syncedItems.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically synced catalog records created by clients. Strictly sanitized to preserve privacy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-950/30 border border-emerald-800/40 px-3 py-1.5 rounded-lg text-emerald-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Financial & Stock Data Excluded</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span>
            Privacy Guarantee: Only Item Name, Brand Name, Company, Category, and Formula are synced to the central master directory.
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer-synced medicines or originating customer..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Table of Synced Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Brand / Company</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Origin Customer / Tenant</th>
                <th className="py-3 px-3 text-center">Assigned Tenants</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-sm">No customer-synced medicines found.</p>
                    <p className="text-xs mt-1 text-slate-600">
                      When customers create new custom medicines in their POS, sanitized templates will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div>{item.name}</div>
                      {item.genericName && (
                        <div className="text-[11px] text-slate-400 font-mono">{item.genericName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {item.brandName || item.company || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{item.sourceTenantName || item.sourceTenantId || 'Customer'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{item.sourceTenantId}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {item.assignedTenantIds?.length || 1} Tenants
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onAssignToOthers([item.id])}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        Assign to Others
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
