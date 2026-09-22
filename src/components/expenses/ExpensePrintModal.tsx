import React, { useRef } from 'react';
import { X, Printer, Download, Receipt, CheckCircle } from 'lucide-react';
import { Expense } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export const ExpensePrintModal: React.FC<Props> = ({ isOpen, onClose, expense }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { business } = useAuth();

  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Expense Voucher #${expense.expenseNumber || 'EXP'}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 20px; font-size: 13px; line-height: 1.4; }
            .voucher-box { border: 2px solid #0f172a; padding: 20px; border-radius: 8px; max-width: 750px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
            .title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
            .badge { display: inline-block; background: #e2e8f0; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size: 12px; }
            .meta-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #cbd5e1; }
            .meta-label { font-weight: bold; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #cbd5e1; font-size: 12px; }
            td { padding: 8px; border: 1px solid #cbd5e1; font-size: 12px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-section { display: flex; justify-content: flex-end; margin-top: 10px; }
            .total-box { width: 280px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .grand-total { font-weight: 800; font-size: 15px; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 4px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 50px; text-align: center; font-size: 11px; font-weight: bold; }
            .sign-line { border-top: 1px solid #64748b; padding-top: 6px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const totalAmount = expense.amount || 0;
  const items = expense.items && expense.items.length > 0 ? expense.items : [
    { name: expense.category + ' Expense', quantity: 1, pricePerUnit: totalAmount, amount: totalAmount }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm">Expense Voucher Preview</h3>
              <p className="text-[11px] text-slate-400">Voucher #{expense.expenseNumber || 'EXP'} • {expense.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Voucher</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 bg-slate-100 max-h-[75vh] overflow-y-auto flex justify-center">
          <div ref={printRef} className="bg-white p-8 rounded-xl shadow-md border border-slate-300 w-full max-w-2xl text-slate-800">
            
            <div className="voucher-box border-2 border-slate-900 p-6 rounded-xl">
              {/* Header */}
              <div className="header text-center border-b-2 border-slate-200 pb-4 mb-4">
                <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Inventory & Accounts Management</div>
                <div className="title text-2xl font-black text-slate-900 tracking-tight mt-0.5">{business?.name || 'MBI INVENTRA'}</div>
                <div className="subtitle text-xs text-slate-600">{business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore'} • Ph: {business?.phone || '03364585863'} / {business?.mobile || '03281302636'}</div>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-md tracking-wider uppercase">
                  PAYMENT / EXPENSE VOUCHER
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span className="font-bold text-slate-600">Voucher No:</span>
                    <span className="font-mono font-bold text-slate-900">{expense.expenseNumber || 'EXP-1'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span className="font-bold text-slate-600">Date:</span>
                    <span className="font-semibold text-slate-900">{expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span className="font-bold text-slate-600">Payment Mode:</span>
                    <span className="font-bold text-blue-700">{expense.paymentType || 'Cash'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span className="font-bold text-slate-600">Category:</span>
                    <span className="font-black text-slate-900">{expense.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                    <span className="font-bold text-slate-600">Expense Type:</span>
                    <span className="font-semibold text-slate-700">{expense.expenseType || 'Direct Expense'}</span>
                  </div>
                  {expense.partyName && (
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                      <span className="font-bold text-slate-600">Paid To / Party:</span>
                      <span className="font-bold text-slate-900">{expense.partyName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-300 text-xs mb-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-2 text-center w-10 font-bold">#</th>
                    <th className="border border-slate-300 p-2 text-left font-bold">Item / Description</th>
                    <th className="border border-slate-300 p-2 text-center w-16 font-bold">Qty</th>
                    <th className="border border-slate-300 p-2 text-right w-24 font-bold">Price / Unit</th>
                    <th className="border border-slate-300 p-2 text-right w-28 font-bold">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium">{it.name || expense.category}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">{it.quantity || 1}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono">{formatCurrency(it.pricePerUnit || it.amount)}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary and Notes */}
              <div className="flex items-start justify-between gap-4 mt-2">
                <div className="flex-1 text-xs">
                  {expense.description && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                      <span className="font-bold block text-slate-900 mb-0.5">Remarks / Details:</span>
                      {expense.description}
                    </div>
                  )}
                </div>

                <div className="w-64 bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">{formatCurrency(expense.subTotal || expense.amount)}</span>
                  </div>
                  {expense.roundOff !== undefined && expense.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Round Off:</span>
                      <span className="font-mono">{formatCurrency(expense.roundOff)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-900 pt-1.5 mt-1">
                    <span>TOTAL AMOUNT:</span>
                    <span className="font-mono text-emerald-700">{formatCurrency(expense.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 mt-12 pt-6 text-center text-[11px] font-bold text-slate-700">
                <div>
                  <div className="border-t border-slate-400 pt-1">Prepared By</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Received By / Signature</div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1">Authorized Approval</div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Printed vouchers comply with standard pharmacy accounting audits.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
