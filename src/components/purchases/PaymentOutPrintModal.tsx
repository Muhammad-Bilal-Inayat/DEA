import React, { useRef, useEffect } from 'react';
import { X, Printer, Building2, Phone, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { PartyPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../lib/utils';

interface PaymentOutPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PartyPayment | null;
}

export const PaymentOutPrintModal: React.FC<PaymentOutPrintModalProps> = ({
  isOpen,
  onClose,
  payment
}) => {
  const { business } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const businessName = business?.name || 'MBI INVENTRA';
  const businessAddress = business?.address || 'Commercial Center, Lahore';
  const businessPhone = business?.phone || '03364585863';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] h-full animate-in fade-in zoom-in-95 animate-fade-scale duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Controls (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Payment Out Voucher Preview</h2>
              <p className="text-[10px] text-slate-300">Official Supplier Outflow Receipt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto h-full flex-1 bg-white text-slate-800 font-sans">
          
          {/* Top Organization Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">{businessName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{businessAddress}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {businessPhone}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-rose-100 text-rose-800 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-1">
                Payment Out Voucher
              </div>
              <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                Voucher #: {payment.referenceNumber || `PV-${payment.id.slice(0, 8).toUpperCase()}`}
              </p>
              <p className="text-xs text-slate-500">Date: {formatDate(payment.date)}</p>
            </div>
          </div>

          {/* Supplier Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Paid To (Supplier / Creditor):</span>
              <strong className="text-base font-black text-slate-900">{payment.partyName}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Payment Method:</span>
              <span className="inline-block bg-white border border-slate-300 px-2.5 py-1 rounded-md font-bold text-slate-800">
                {payment.paymentMode || 'Cash'}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="border-2 border-dashed border-rose-300 bg-rose-50/50 rounded-2xl p-5 mb-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block mb-1">
              Net Outflow Amount Paid
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-rose-700">
              {formatCurrency(payment.amount)}
            </div>
          </div>

          {/* Remarks & Settlement Note */}
          <div className="border border-slate-200 rounded-xl p-3.5 mb-8 text-xs">
            <span className="font-bold text-slate-700 block mb-1">Payment Remarks & Description:</span>
            <p className="text-slate-600 italic">{payment.notes || 'Payment made to supplier against purchases / pending liabilities.'}</p>
          </div>

          {/* Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs font-bold text-slate-600">
            <div>
              <div className="border-t border-slate-400 pt-2">Authorized Signature / Cashier</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2">Receiver's Signature & Stamp</div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-8 text-center text-[10px] text-slate-400 print:block">
            Generated via MBI Inventra Pharmacy Management System. Computer generated voucher.
          </div>

        </div>

      </div>
    </div>
  );
};
