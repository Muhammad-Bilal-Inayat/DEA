import React, { useState, useEffect } from 'react';
import { X, Tag, FolderPlus, Info } from 'lucide-react';
import { ExpenseCategory } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cat: ExpenseCategory) => void;
  editCategory?: ExpenseCategory | null;
}

export const AddCategoryModal: React.FC<Props> = ({ isOpen, onClose, onSave, editCategory }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Direct Expense' | 'Indirect Expense'>('Direct Expense');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setType(editCategory.type || 'Direct Expense');
      setDescription(editCategory.description || '');
    } else {
      setName('');
      setType('Direct Expense');
      setDescription('');
    }
  }, [editCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const category: ExpenseCategory = {
      id: editCategory ? editCategory.id : `cat-${uuidv4().slice(0, 8)}`,
      name: name.trim(),
      type,
      description: description.trim(),
      isDefault: editCategory ? editCategory.isDefault : false
    };

    onSave(category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#1e293b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm tracking-wide">
              {editCategory ? 'Edit Expense Category' : 'Add Expense Category'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Generator Fuel, AC Maintenance, Medical License Fee"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('Direct Expense')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${
                  type === 'Direct Expense'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 ${type === 'Direct Expense' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                <div>
                  <div>Direct Expense</div>
                  <div className="text-[10px] text-slate-500 font-normal">Fuel, Delivery, Supplies</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('Indirect Expense')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${
                  type === 'Indirect Expense'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 ${type === 'Indirect Expense' ? 'border-purple-600 bg-purple-600' : 'border-slate-300'}`} />
                <div>
                  <div>Indirect Expense</div>
                  <div className="text-[10px] text-slate-500 font-normal">Rent, Salaries, Electricity</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief details about what goes under this category..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Categories help categorize pharmacy expenditure and generate accurate profit & loss reports.</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              {editCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
