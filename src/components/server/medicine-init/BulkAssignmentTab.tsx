import React, { useState, useMemo } from 'react';
import { CentralMedicine } from '../../../types';
import {
  Users,
  Layers,
  Send,
  Trash2,
  CheckSquare,
  Square,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { bulkAssignMedicines, bulkRemoveAssignments } from '../../../lib/centralMedicineDatabaseService';

interface BulkAssignmentTabProps {
  medicines: CentralMedicine[];
  categories: string[];
  tenants: any[];
  onComplete: () => void;
  showToast?: (msg: string) => void;
}

export const BulkAssignmentTab: React.FC<BulkAssignmentTabProps> = ({
  medicines,
  categories,
  tenants,
  onComplete,
  showToast
}) => {
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [initialStock, setInitialStock] = useState<number>(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleSelectAllTenants = () => {
    if (selectedTenantIds.length === tenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(tenants.map(t => t.tenantId || t.id));
    }
  };

  const toggleTenant = (id: string) => {
    setSelectedTenantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...categories]);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
    );
  };

  // Estimate total items
  const affectedItemsCount = useMemo(() => {
    if (selectedCategories.length === 0) return 0;
    const cleanCats = selectedCategories.map(c => c.toLowerCase());
    return medicines.filter(m => m.category && cleanCats.includes(m.category.toLowerCase())).length;
  }, [medicines, selectedCategories]);

  const handleExecuteBulkAssign = async () => {
    if (selectedTenantIds.length === 0) {
      alert('Please select at least one customer account.');
      return;
    }
    if (selectedCategories.length === 0) {
      alert('Please select at least one medicine category.');
      return;
    }

    const confirmMsg = `Are you sure you want to BULK ASSIGN ${selectedCategories.length} categories (${affectedItemsCount} medicines) to ${selectedTenantIds.length} customer accounts?`;
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    setResultMsg(null);

    const res = await bulkAssignMedicines({
      tenantIds: selectedTenantIds,
      categories: selectedCategories,
      initialStock,
      adminName: 'Master Admin'
    });

    setIsProcessing(false);

    if (res.success) {
      setResultMsg({ type: 'success', text: res.message });
      if (showToast) showToast(res.message);
      onComplete();
    } else {
      setResultMsg({ type: 'error', text: res.message });
    }
  };

  const handleExecuteBulkRemove = () => {
    if (selectedTenantIds.length === 0) {
      alert('Please select at least one customer account.');
      return;
    }
    if (selectedCategories.length === 0) {
      alert('Please select at least one category to unassign.');
      return;
    }

    const cleanCats = selectedCategories.map(c => c.toLowerCase());
    const targetMeds = medicines.filter(m => m.category && cleanCats.includes(m.category.toLowerCase()));
    const medIds = targetMeds.map(m => m.id);

    const confirmMsg = `⚠️ CAUTION: Are you sure you want to REMOVE / REVOKE assignment of ${targetMeds.length} medicines in ${selectedCategories.length} categories from ${selectedTenantIds.length} customer accounts?`;
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    setResultMsg(null);

    const res = bulkRemoveAssignments({
      tenantIds: selectedTenantIds,
      medicineIds: medIds
    });

    setIsProcessing(false);

    if (res.success) {
      setResultMsg({ type: 'success', text: res.message });
      if (showToast) showToast(res.message);
      onComplete();
    } else {
      setResultMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Bulk Customer Medicine Provisioning & Revocation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Quickly assign or remove multiple product lines across dozens of customer accounts in a single operation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-right">
            <div className="text-slate-400">Total Selected:</div>
            <div className="font-semibold text-white">
              {selectedTenantIds.length} Customers • {selectedCategories.length} Categories ({affectedItemsCount} Items)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Select Target Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <Building2 className="w-4 h-4" />
              <span>1. Select Customers ({selectedTenantIds.length}/{tenants.length})</span>
            </div>
            <button
              onClick={toggleSelectAllTenants}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              {selectedTenantIds.length === tenants.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1 pr-1">
            {tenants.map(t => {
              const id = t.tenantId || t.id;
              const isSelected = selectedTenantIds.includes(id);

              return (
                <div
                  key={id}
                  onClick={() => toggleTenant(id)}
                  className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-950/20 border-sky-800/80 text-white'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{t.name || (t as any).storeName || 'Pharmacy'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{id}</div>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {t.plan || 'Standard'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Categories */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Layers className="w-4 h-4" />
              <span>2. Select Categories ({selectedCategories.length}/{categories.length})</span>
            </div>
            <button
              onClick={toggleSelectAllCategories}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              {selectedCategories.length === categories.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1 pr-1">
            {categories.map(cat => {
              const isSelected = selectedCategories.includes(cat);
              const itemCount = medicines.filter(m => m.category === cat).length;

              return (
                <div
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-950/20 border-indigo-800/80 text-white'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-xs font-semibold">{cat}</div>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-slate-900 text-slate-400 border border-slate-800">
                    {itemCount} items
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Execution Actions Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Initial Stock per Assigned Item:
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                value={initialStock}
                onChange={e => setInitialStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mt-4">
              Will populate initial stock inventory in each recipient tenant database.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isProcessing || selectedTenantIds.length === 0 || selectedCategories.length === 0}
              onClick={handleExecuteBulkRemove}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Bulk Revoke / Remove
            </button>

            <button
              disabled={isProcessing || selectedTenantIds.length === 0 || selectedCategories.length === 0}
              onClick={handleExecuteBulkAssign}
              className="flex items-center gap-1.5 py-2.5 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-colors"
            >
              <Send className="w-4 h-4" />
              {isProcessing ? 'Processing Operations...' : 'Execute Bulk Assignment'}
            </button>
          </div>
        </div>

        {resultMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              resultMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {resultMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{resultMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
