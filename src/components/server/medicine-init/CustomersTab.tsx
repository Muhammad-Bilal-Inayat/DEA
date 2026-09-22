import React, { useState, useMemo } from 'react';
import { Users, Search, Send, ShieldCheck, Eye, Trash2, CheckCircle2, Building2, Package, X } from 'lucide-react';
import { getCustomerAssignmentSummaries, getAssignedMedicinesForCustomer, bulkRemoveAssignments } from '../../../lib/centralMedicineDatabaseService';
import { CentralMedicine } from '../../../types';

interface CustomersTabProps {
  onOpenAssignForCustomer: (tenantId: string, tenantName: string) => void;
  onRefresh: () => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  onOpenAssignForCustomer,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [viewingTenant, setViewingTenant] = useState<{ tenantId: string; name: string } | null>(null);
  const [customerMeds, setCustomerMeds] = useState<CentralMedicine[]>([]);
  const [customerMedSearch, setCustomerMedSearch] = useState('');

  const summaries = useMemo(() => getCustomerAssignmentSummaries(), []);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.toLowerCase().trim();
    return summaries.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.tenantId.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q)
    );
  }, [summaries, search]);

  const handleViewAssigned = (tenantId: string, name: string) => {
    const meds = getAssignedMedicinesForCustomer(tenantId);
    setViewingTenant({ tenantId, name });
    setCustomerMeds(meds);
    setCustomerMedSearch('');
  };

  const handleUnassignSingle = (medicineId: string) => {
    if (!viewingTenant) return;
    if (!confirm(`Revoke assignment of this medicine for ${viewingTenant.name}?`)) return;

    bulkRemoveAssignments({
      tenantIds: [viewingTenant.tenantId],
      medicineIds: [medicineId]
    });

    const updated = getAssignedMedicinesForCustomer(viewingTenant.tenantId);
    setCustomerMeds(updated);
    onRefresh();
  };

  const filteredCustomerMeds = useMemo(() => {
    if (!customerMedSearch.trim()) return customerMeds;
    const q = customerMedSearch.toLowerCase().trim();
    return customerMeds.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.brandName?.toLowerCase().includes(q) ||
      m.company?.toLowerCase().includes(q)
    );
  }, [customerMeds, customerMedSearch]);

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer name, store title, or tenant ID..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Active Customer Accounts:</span>
          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {summaries.length}
          </span>
        </div>
      </div>

      {/* Customer List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(cust => (
          <div
            key={cust.tenantId}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{cust.name}</h4>
                    <p className="text-[11px] font-mono text-slate-500">{cust.tenantId}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                    cust.assignedCount > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {cust.assignedCount} items
                </span>
              </div>

              {/* Assigned Categories Badges */}
              <div className="my-3 space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Assigned Categories:</div>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {cust.assignedCategories.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No categories assigned yet</span>
                  ) : (
                    cust.assignedCategories.map(cat => (
                      <span
                        key={cat}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {cat}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => onOpenAssignForCustomer(cust.tenantId, cust.name)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm shadow-sky-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                Assign Medicines
              </button>

              <button
                onClick={() => handleViewAssigned(cust.tenantId, cust.name)}
                className="flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                title="View customer assigned inventory"
              >
                <Eye className="w-3.5 h-3.5" />
                View ({cust.assignedCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Assigned Items Modal */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Assigned Catalog for {viewingTenant.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Tenant ID: {viewingTenant.tenantId} • Total Assigned: {customerMeds.length}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Input */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerMedSearch}
                  onChange={e => setCustomerMedSearch(e.target.value)}
                  placeholder="Filter assigned medicines by name or category..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Medicine List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-800/60">
              {filteredCustomerMeds.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {customerMeds.length === 0
                    ? 'No medicines assigned to this customer yet. Use the Assign tab to allocate items.'
                    : 'No assigned items match your search filter.'}
                </div>
              ) : (
                filteredCustomerMeds.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.brandName || item.company || 'Standard'} • <span className="text-sky-400">{item.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnassignSingle(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
                      title="Unassign medicine from this customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Unassign</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingTenant(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
