import React from 'react';
import { 
  X, Pill, Building2, Package, ShieldAlert, CheckCircle2, 
  ExternalLink, Layers, Sparkles, AlertCircle, ShoppingCart 
} from 'lucide-react';
import { GenericGroupSummary } from '../../lib/genericMaster';
import { Medicine } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface GenericQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  genericSummary?: GenericGroupSummary | null;
  summary?: GenericGroupSummary | null;
  onSelectMedicine?: (med: Medicine) => void;
}

export const GenericQuickViewModal: React.FC<GenericQuickViewModalProps> = ({
  isOpen,
  onClose,
  genericSummary,
  summary,
  onSelectMedicine,
}) => {
  const activeSummary = genericSummary || summary;
  if (!isOpen || !activeSummary) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
              activeSummary.isControlled 
                ? 'bg-amber-600/10 text-amber-600 border border-amber-200 dark:border-amber-800/50'
                : 'bg-emerald-600/10 text-emerald-600 border border-emerald-200 dark:border-emerald-800/50'
            }`}>
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeSummary.genericName}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {activeSummary.genericId}
                </span>
                {activeSummary.isControlled && (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                    <ShieldAlert className="w-3 h-3" />
                    Controlled / Restricted
                  </span>
                )}
              </div>
              {activeSummary.alternateNames && activeSummary.alternateNames.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Alternate Salt Names: <span className="font-medium text-slate-700 dark:text-slate-300">{activeSummary.alternateNames.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-4 gap-3 p-6 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Brands</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeSummary.totalBrands}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manufacturers</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{activeSummary.totalCompanies}</div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock in Inventory</div>
            <div className={`text-xl font-bold mt-1 ${activeSummary.totalStock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
              {activeSummary.totalStock} units
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Available Products</div>
            <div className="text-xl font-bold text-blue-600 mt-1">{activeSummary.availableProductsCount} / {activeSummary.products.length}</div>
          </div>
        </div>

        {/* Linked Products Table */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              All Formulations & Brands Linked to this Generic ({activeSummary.products.length})
            </h3>
            <span className="text-xs text-slate-500">
              Multi-Brand Comparison
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Brand / Item Name</th>
                  <th className="py-2.5 px-3">Manufacturer / Company</th>
                  <th className="py-2.5 px-3">Strength & Form</th>
                  <th className="py-2.5 px-3 text-right">Available Stock</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">Sale Price</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {activeSummary.products.map(med => (
                  <tr key={med.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {med.name}
                        {med.isControlled && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold">
                            Controlled
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {med.batchNumber || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {med.manufacturer}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                        {med.strength || med.dosageForm || 'Standard'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={med.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {med.quantity} {med.unit || 'PCS'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(med.mrp || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(med.sellingPrice || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {onSelectMedicine && (
                        <button
                          onClick={() => {
                            onSelectMedicine(med);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 dark:border-blue-800 rounded-lg transition"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500">
            Generic / Salt System • MBI INVENTRA
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
