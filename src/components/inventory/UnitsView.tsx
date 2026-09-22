import React, { useState } from 'react';
import { Scale, Plus, Search, Trash2, Edit, Check, X } from 'lucide-react';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface UnitItem {
  id: string;
  shortName: string;
  fullName: string;
  secondaryUnit?: string;
  conversionRate?: number;
}

const DEFAULT_UNITS: UnitItem[] = [
  { id: 'u-1', shortName: 'PCS', fullName: 'Pieces', secondaryUnit: '', conversionRate: 1 },
  { id: 'u-2', shortName: 'BOX', fullName: 'Box / Carton', secondaryUnit: 'PCS', conversionRate: 100 },
  { id: 'u-3', shortName: 'STRIP', fullName: 'Strip', secondaryUnit: 'PCS', conversionRate: 10 },
  { id: 'u-4', shortName: 'PACK', fullName: 'Pack', secondaryUnit: 'PCS', conversionRate: 50 },
  { id: 'u-5', shortName: 'BOTTLE', fullName: 'Bottle / Infusion', secondaryUnit: 'ML', conversionRate: 1000 },
  { id: 'u-6', shortName: 'VIAL', fullName: 'Vial / Ampoule', secondaryUnit: 'PCS', conversionRate: 1 },
  { id: 'u-7', shortName: 'SET', fullName: 'Set / Kit', secondaryUnit: 'PCS', conversionRate: 1 },
  { id: 'u-8', shortName: 'ROLL', fullName: 'Roll', secondaryUnit: 'METER', conversionRate: 5 },
  { id: 'u-9', shortName: 'KG', fullName: 'Kilogram', secondaryUnit: 'GM', conversionRate: 1000 },
];

export const UnitsView: React.FC = () => {
  const [units, setUnits] = useState<UnitItem[]>(DEFAULT_UNITS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<UnitItem>>({
    shortName: '',
    fullName: '',
    secondaryUnit: '',
    conversionRate: 1,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shortName) return;

    const newUnit: UnitItem = {
      id: `u-${Date.now()}`,
      shortName: formData.shortName.toUpperCase(),
      fullName: formData.fullName || formData.shortName,
      secondaryUnit: formData.secondaryUnit?.toUpperCase() || '',
      conversionRate: Number(formData.conversionRate || 1),
    };
    setUnits(prev => [...prev, newUnit]);
    setShowAddModal(false);
    setFormData({ shortName: '', fullName: '', secondaryUnit: '', conversionRate: 1 });
  };

  const [deleteTargetUnit, setDeleteTargetUnit] = useState<UnitItem | null>(null);

  const handleDelete = (id: string) => {
    const target = units.find(u => u.id === id);
    if (target) setDeleteTargetUnit(target);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetUnit) return;
    setUnits(prev => prev.filter(u => u.id !== deleteTargetUnit.id));
    setDeleteTargetUnit(null);
  };

  const filtered = units.filter(
    u => u.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Units of Measurement</h2>
            <p className="text-xs text-slate-500">Define base units & secondary conversion ratios</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Unit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-emerald-300 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-mono font-bold text-xs">
                {u.shortName}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{u.fullName}</h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {u.secondaryUnit ? `1 ${u.shortName} = ${u.conversionRate} ${u.secondaryUnit}` : 'Primary unit'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDelete(u.id)}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Add Unit</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Short Name (Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMP"
                  value={formData.shortName || ''}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ampoule"
                  value={formData.fullName || ''}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Secondary Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. PCS"
                    value={formData.secondaryUnit || ''}
                    onChange={(e) => setFormData({ ...formData, secondaryUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Conversion Rate</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.conversionRate ?? 1}
                    onChange={(e) => setFormData({ ...formData, conversionRate: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Unit Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetUnit)}
        title="Delete Measurement Unit?"
        message="Are you sure you want to delete this measurement unit?"
        itemName={deleteTargetUnit ? `${deleteTargetUnit.fullName} (${deleteTargetUnit.shortName})` : undefined}
        confirmLabel="Yes, Delete Unit"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTargetUnit(null)}
      />
    </div>
  );
};
