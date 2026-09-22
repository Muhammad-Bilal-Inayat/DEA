import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Printer, PlusCircle, ArrowLeft, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';

interface TransactionSaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveAndPrint?: () => void;
  onSaveAndNew?: () => void;
  type: 'sale' | 'purchase';
  transactionTitle: string;
  partyLabel: string;
  partyName: string;
  partyContact?: string;
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  additionalCharges?: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentType?: string;
  isSaving?: boolean;
}

export const TransactionSaveConfirmModal: React.FC<TransactionSaveConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSaveAndPrint,
  onSaveAndNew,
  type,
  transactionTitle,
  partyLabel,
  partyName,
  partyContact,
  itemCount,
  totalQuantity,
  subtotal,
  discountAmount = 0,
  taxAmount = 0,
  additionalCharges = 0,
  roundOff = 0,
  grandTotal,
  paidAmount,
  balanceDue,
  paymentType = 'Cash',
  isSaving = false,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus primary confirm button on mount
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation inside confirmation dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only trigger confirm if not inside another interactive button
        if (document.activeElement?.tagName !== 'BUTTON' || document.activeElement === confirmBtnRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onConfirm();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P') && onSaveAndPrint) {
        e.preventDefault();
        e.stopPropagation();
        onSaveAndPrint();
        return;
      }
      if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || (e.altKey && (e.key === 'n' || e.key === 'N'))) {
        if (onSaveAndNew) {
          e.preventDefault();
          e.stopPropagation();
          onSaveAndNew();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [isOpen, onConfirm, onClose, onSaveAndPrint, onSaveAndNew]);

  if (!isOpen) return null;

  const changeToReturn = paidAmount > grandTotal ? paidAmount - grandTotal : 0;
  const isSale = type === 'sale';

  return (
    <div
      id="save-confirmation-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        id="save-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col scale-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 id="confirm-modal-title" className="text-base font-bold text-white leading-tight">
                Confirm & Save {isSale ? 'Sale Invoice' : 'Purchase Bill'}
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                {transactionTitle} • {paymentType}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-lg text-[11px] font-bold tracking-wide uppercase">
            Final Review
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Party & Item Count Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {partyLabel}
              </div>
              <div className="text-sm font-black text-slate-900">
                {partyName || (isSale ? 'Walk-in Customer (Cash)' : 'General Supplier')}
              </div>
              {partyContact && (
                <div className="text-xs text-slate-500 font-mono mt-0.5">{partyContact}</div>
              )}
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items / Qty</div>
              <div className="text-sm font-black text-slate-900 font-mono">
                {itemCount} <span className="text-xs font-medium text-slate-500">items</span>
              </div>
              <div className="text-xs text-blue-600 font-bold font-mono">
                {totalQuantity} <span className="font-normal text-slate-500">total units</span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white text-xs">
            <div className="flex justify-between items-center px-3.5 py-2 text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-mono font-bold text-slate-900">Rs {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between items-center px-3.5 py-2 text-slate-600">
                <span>Discount</span>
                <span className="font-mono font-bold text-emerald-600">- Rs {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between items-center px-3.5 py-2 text-slate-600">
                <span>Tax / GST</span>
                <span className="font-mono font-bold text-slate-800">+ Rs {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {additionalCharges > 0 && (
              <div className="flex justify-between items-center px-3.5 py-2 text-slate-600">
                <span>Additional Expenses</span>
                <span className="font-mono font-bold text-slate-800">+ Rs {additionalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            {roundOff !== 0 && (
              <div className="flex justify-between items-center px-3.5 py-2 text-slate-500">
                <span>Round Off</span>
                <span className="font-mono">{roundOff >= 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}

            {/* Prominent Grand Total Row */}
            <div className="flex justify-between items-center px-3.5 py-3 bg-blue-50/70 border-t-2 border-blue-200 text-sm font-black">
              <span className="text-blue-950 font-black">Grand Total:</span>
              <span className="font-mono text-lg text-blue-700">
                Rs {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment & Balance Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isSale ? 'Received Amount' : 'Paid Amount'}
              </div>
              <div className="text-base font-black font-mono text-emerald-600 mt-0.5">
                Rs {paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                via {paymentType}
              </div>
            </div>

            <div className={`border rounded-xl p-3 ${
              balanceDue > 0
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : changeToReturn > 0
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {balanceDue > 0 ? (isSale ? 'Balance Due (Udhaar)' : 'Payable to Supplier') : changeToReturn > 0 ? 'Change to Return' : 'Payment Status'}
              </div>
              <div className="text-base font-black font-mono mt-0.5">
                {balanceDue > 0
                  ? `Rs ${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : changeToReturn > 0
                  ? `Rs ${changeToReturn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Paid in Full (Rs 0.00)'}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">
                {balanceDue > 0 ? 'Unpaid balance will be added to ledger' : changeToReturn > 0 ? 'Cash return to customer' : 'No balance outstanding'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2.5">
          <button
            id="confirm-modal-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Return to editing form (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Form</span>
            <kbd className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-mono">Esc</kbd>
          </button>

          <div className="flex items-center gap-2">
            {onSaveAndNew && (
              <button
                id="confirm-modal-save-new-btn"
                type="button"
                disabled={isSaving}
                onClick={onSaveAndNew}
                className="hidden sm:inline-flex px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Save and open fresh bill"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Save & New</span>
              </button>
            )}

            {onSaveAndPrint && (
              <button
                id="confirm-modal-save-print-btn"
                type="button"
                disabled={isSaving}
                onClick={onSaveAndPrint}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Save and trigger print (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save & Print</span>
                <kbd className="hidden md:inline text-[10px] bg-emerald-700/80 px-1 py-0.5 rounded font-mono">Ctrl+P</kbd>
              </button>
            )}

            <button
              id="confirm-modal-submit-btn"
              ref={confirmBtnRef}
              type="button"
              disabled={isSaving}
              onClick={onConfirm}
              className="px-5 py-2.5 bg-[#0070f3] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Confirm and commit to database (Enter)"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Confirm & Save'}</span>
              <kbd className="text-[10px] bg-blue-800/80 px-1.5 py-0.5 rounded font-mono font-bold">Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
