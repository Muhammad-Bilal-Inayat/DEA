import React, { useState, useMemo, useEffect } from 'react';
import { CentralMedicine } from '../../../types';
import {
  Send,
  Building2,
  Layers,
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  PackageCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { assignMedicinesToCustomer } from '../../../lib/centralMedicineDatabaseService';

interface AssignMedicinesTabProps {
  medicines: CentralMedicine[];
  categories: string[];
  tenants: any[];
  preselectedTenantId?: string;
  preselectedMedicineIds?: string[];
  onComplete: () => void;
  showToast?: (msg: string) => void;
}

export const AssignMedicinesTab: React.FC<AssignMedicinesTabProps> = ({
  medicines,
  categories,
  tenants,
  preselectedTenantId,
  preselectedMedicineIds,
  onComplete,
  showToast
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState<number>(20);
  const [isAssigning, setIsAssigning] = useState(false);
  const [successResult, setSuccessResult] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedTenantId) {
      setSelectedTenantId(preselectedTenantId);
    } else if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].tenantId || tenants[0].id);
    }
  }, [preselectedTenantId, tenants]);

  useEffect(() => {
    if (preselectedMedicineIds && preselectedMedicineIds.length > 0) {
      setSelectedMedIds(preselectedMedicineIds);
    }
  }, [preselectedMedicineIds]);

  const selectedTenantObj = useMemo(() => {
    return tenants.find(t => (t.tenantId || t.id) === selectedTenantId);
  }, [tenants, selectedTenantId]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = m.name.toLowerCase().includes(q);
        const matchBrand = m.brandName?.toLowerCase().includes(q);
        const matchCompany = m.company?.toLowerCase().includes(q);
        const matchGeneric = m.genericName?.toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCompany && !matchGeneric) return false;
      }
      return true;
    });
  }, [medicines, selectedCategory, search]);

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredMedicines.map(m => m.id);
    const allInFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedMedIds.includes(id));

    if (allInFilteredSelected) {
      setSelectedMedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedMedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedMedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExecuteAssignment = async () => {
    if (!selectedTenantId) {
      alert('Please select a customer / tenant.');
      return;
    }

    if (selectedMedIds.length === 0) {
      alert('Please select at least one medicine to assign.');
      return;
    }

    const tenantName = selectedTenantObj?.name || (selectedTenantObj as any)?.storeName || selectedTenantId;

    setIsAssigning(true);
    setSuccessResult(null);

    const res = await assignMedicinesToCustomer({
      tenantId: selectedTenantId,
      tenantName,
      medicineIds: selectedMedIds,
      initialStock,
      adminName: 'Master Admin'
    });

    setIsAssigning(false);

    if (res.success) {
      setSuccessResult(res.message);
      if (showToast) showToast(res.message);
      onComplete();
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Customer & Provisioning Settings */}
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            <Building2 className="w-4 h-4" />
            <span>Target Customer / Tenant</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Customer Account</label>
            <select
              value={selectedTenantId}
              onChange={e => setSelectedTenantId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            >
              {tenants.map(t => {
                const id = t.tenantId || t.id;
                const name = t.name || (t as any).storeName || 'Pharmacy';
                return (
                  <option key={id} value={id}>
                    {name} ({id})
                  </option>
                );
              })}
            </select>
          </div>

          {selectedTenantObj && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs">
              <div className="text-slate-300 font-semibold">{selectedTenantObj.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">ID: {selectedTenantId}</div>
              <div className="text-slate-400">Plan: <span className="text-sky-400 font-medium">{selectedTenantObj.plan || 'Standard'}</span></div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Initial Stock Allocation per Item
            </label>
            <input
              type="number"
              min={0}
              max={10000}
              value={initialStock}
              onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Stock quantity will be loaded into the customer's active POS inventory.
            </p>
          </div>

          <div className="pt-2">
            <button
              disabled={isAssigning || selectedMedIds.length === 0 || !selectedTenantId}
              onClick={handleExecuteAssignment}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm shadow-md shadow-emerald-900/30 transition-colors"
            >
              <Send className="w-4 h-4" />
              {isAssigning ? 'Provisioning...' : `Assign ${selectedMedIds.length} Medicines`}
            </button>
          </div>

          {successResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Medicine Catalog Selection Picker */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter central catalog medicines..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={toggleSelectAllFiltered}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Select All ({filteredMedicines.length})
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>
              Showing {filteredMedicines.length} of {medicines.length} medicines
            </span>
            <span className="text-sky-400 font-semibold">
              {selectedMedIds.length} currently selected
            </span>
          </div>
        </div>

        {/* Medicines Checkbox List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm max-h-[550px] overflow-y-auto divide-y divide-slate-800/60">
          {filteredMedicines.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No central medicines found matching your criteria.
            </div>
          ) : (
            filteredMedicines.map(med => {
              const isSelected = selectedMedIds.includes(med.id);
              const isAlreadyAssigned = selectedTenantId && med.assignedTenantIds?.includes(selectedTenantId);

              return (
                <div
                  key={med.id}
                  onClick={() => toggleSelectOne(med.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    isSelected ? 'bg-sky-950/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleSelectOne(med.id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{med.name}</span>
                        {isAlreadyAssigned && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Already Assigned
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{med.brandName || med.company || 'Standard'}</span>
                        <span>•</span>
                        <span className="text-sky-400 font-medium">{med.category}</span>
                        {med.genericName && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{med.genericName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {med.unit || 'Strip'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
