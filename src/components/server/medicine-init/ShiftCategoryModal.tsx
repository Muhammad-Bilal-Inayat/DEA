import React, { useState } from 'react';
import { Layers, ArrowRight, X, Check } from 'lucide-react';

interface ShiftCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShift: (targetCategory: string) => void;
  selectedCount: number;
  categories: string[];
}

export const ShiftCategoryModal: React.FC<ShiftCategoryModalProps> = ({
  isOpen,
  onClose,
  onShift,
  selectedCount,
  categories
}) => {
  const [targetCategory, setTargetCategory] = useState(categories[0] || 'General Pharmacy');
  const [customCategory, setCustomCategory] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCat = targetCategory === '__NEW__' ? customCategory.trim() : targetCategory.trim();
    if (!finalCat) {
      alert('Please select or specify a category name.');
      return;
    }
    onShift(finalCat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Shift Category</h3>
              <p className="text-xs text-slate-400">Reassign {selectedCount} items to a different category</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Category</label>
            <select
              value={targetCategory}
              onChange={e => setTargetCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__NEW__">+ Create New Category...</option>
            </select>
          </div>

          {targetCategory === '__NEW__' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Category Title</label>
              <input
                type="text"
                required
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="e.g. Spinal Implants, Pediatric Oncology"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-md shadow-indigo-600/20"
            >
              <ArrowRight className="w-4 h-4" />
              Apply Shift ({selectedCount})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
