import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, X, ArrowRight, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export interface LossItemDetail {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  cost: number;
  lossPerUnit: number;
  totalLoss: number;
}

interface LossSaleHardPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  lossItems: LossItemDetail[];
  grandTotal: number;
  onConfirm: () => void;
  title?: string;
}

export const LossSaleHardPromptModal: React.FC<LossSaleHardPromptModalProps> = ({
  isOpen,
  onClose,
  lossItems,
  grandTotal,
  onConfirm,
  title = 'Critical Rate Alert: Sale Rate Below Purchase Cost'
}) => {
  const [step1Acknowledged, setStep1Acknowledged] = useState(false);
  const [step2Confirmed, setStep2Confirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep1Acknowledged(false);
      setStep2Confirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalInvoiceLoss = lossItems.reduce((acc, item) => acc + item.totalLoss, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-rose-500 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">{title}</h2>
              <p className="text-xs text-rose-100 font-medium">Dual-Authorization Required to Override Below-Cost Sale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-700/50 hover:bg-rose-700 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 text-sm">
          {/* Warning Banner */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                Rate Error / Loss Warning Detected ({lossItems.length} items)
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                The selling rate entered on this invoice is strictly lower than your wholesale purchase price. Saving this bill will cause an immediate financial loss to the business.
              </p>
            </div>
          </div>

          {/* Loss Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider flex justify-between">
              <span>Items Selling Below Purchase Rate</span>
              <span className="text-rose-600 dark:text-rose-400 font-black">Financial Loss</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
              {lossItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Qty: <b className="text-slate-700 dark:text-slate-300">{item.quantity}</b></span>
                      <span>•</span>
                      <span>Buy Rate: <b className="text-slate-700 dark:text-slate-300">Rs. {item.cost.toLocaleString()}</b></span>
                      <span>•</span>
                      <span>Sale Rate: <b className="text-rose-600 font-bold">Rs. {item.unitPrice.toLocaleString()}</b></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                      -Rs. {item.totalLoss.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      (-Rs. {item.lossPerUnit}/unit)
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 p-3 flex justify-between items-center border-t border-rose-200 dark:border-rose-900/50 font-bold text-xs">
              <span className="text-slate-700 dark:text-slate-300">Total Loss on this Transaction:</span>
              <span className="font-mono text-base font-black text-rose-600 dark:text-rose-400">
                -Rs. {totalInvoiceLoss.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Dual Confirmation Hard Prompt */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Dual-Confirmation Override (Mandatory)</span>
            </div>

            {/* Step 1 Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-slate-700 cursor-pointer select-none hover:bg-amber-50/50 transition">
              <input
                type="checkbox"
                checked={step1Acknowledged}
                onChange={(e) => setStep1Acknowledged(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
              />
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Step 1: Acknowledge Below-Cost Pricing
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  I explicitly verify that the selling rate (less than purchase cost) is deliberate and authorized by the pharmacy manager or administrator.
                </p>
              </div>
            </label>

            {/* Step 2 Checkbox */}
            <label className={`flex items-start gap-3 p-3 rounded-lg border transition select-none ${
              step1Acknowledged 
                ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-slate-700 cursor-pointer hover:bg-amber-50/50' 
                : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
            }`}>
              <input
                type="checkbox"
                disabled={!step1Acknowledged}
                checked={step2Confirmed}
                onChange={(e) => setStep2Confirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  Step 2: Grant Loss Override Authorization
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  I accept responsibility for recording this invoice with a negative profit margin and authorize saving.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            ← Cancel & Adjust Rates
          </button>

          <button
            type="button"
            disabled={!step1Acknowledged || !step2Confirmed}
            onClick={() => {
              if (step1Acknowledged && step2Confirmed) {
                onConfirm();
              }
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Confirm & Authorize Sale at Loss</span>
          </button>
        </div>
      </div>
    </div>
  );
};
