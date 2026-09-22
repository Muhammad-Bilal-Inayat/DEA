import React, { useState } from 'react';
import { CentralMedicine } from '../../../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, confirmedName: string) => void;
  medicine: CentralMedicine | null;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  medicine
}) => {
  const [typedName, setTypedName] = useState('');

  if (!isOpen || !medicine) return null;

  const isMatching = typedName.trim().toLowerCase() === medicine.name.trim().toLowerCase();

  const handleConfirm = () => {
    if (!isMatching) return;
    onConfirm(medicine.id, typedName);
    setTypedName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-rose-900/50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-200">Delete Central Medicine</h3>
              <p className="text-xs text-slate-400">Irreversible master catalog action</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300">
            You are about to permanently delete <strong className="text-white">{medicine.name}</strong> from the central master database.
          </p>

          {medicine.assignedTenantIds && medicine.assignedTenantIds.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
              ⚠️ This medicine is currently assigned to {medicine.assignedTenantIds.length} customer tenant accounts. Deleting it will remove the central reference.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Type <span className="text-rose-400 font-mono select-all">"{medicine.name}"</span> to confirm:
            </label>
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder="Enter exact medicine name"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isMatching}
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-lg shadow-rose-900/30"
            >
              <Trash2 className="w-4 h-4" />
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
