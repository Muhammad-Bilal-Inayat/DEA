import React, { useState } from 'react';
import { X, Printer, Download, Calendar, Building, FileSpreadsheet } from 'lucide-react';
import { Party, Invoice, PurchaseOrder, PartyPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface StatementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  payments: PartyPayment[];
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  isOpen,
  onClose,
  party,
  invoices,
  purchaseOrders,
  payments,
}) => {
  const { business } = useAuth();
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));

  if (!isOpen) return null;

  // Build Chronological Ledger Entries
  interface LedgerRow {
    id: string;
    date: string;
    type: string;
    refNo: string;
    description: string;
    debit: number;  // Increases customer receivable / purchase amount
    credit: number; // Reduces customer receivable (payment received)
  }

  const rows: LedgerRow[] = [];

  // 1. Invoices (Sales to Customer) -> Debit
  invoices.forEach(inv => {
    rows.push({
      id: inv.id,
      date: inv.date,
      type: 'Sale Invoice',
      refNo: inv.invoiceNumber,
      description: `${inv.items?.length || 0} item(s) sold via ${inv.paymentMethod || 'Cash'}`,
      debit: inv.grandTotal,
      credit: 0,
    });
  });

  // 2. Purchase Orders (from Supplier)
  purchaseOrders.forEach(po => {
    rows.push({
      id: po.id,
      date: po.date,
      type: 'Purchase Bill',
      refNo: po.poNumber,
      description: `Purchase order (${po.status})`,
      debit: 0,
      credit: po.totalAmount,
    });
  });

  // 3. Payments
  payments.forEach(pay => {
    if (pay.type === 'PAYMENT_IN') {
      rows.push({
        id: pay.id,
        date: pay.date,
        type: 'Payment Received',
        refNo: pay.referenceNumber || 'PAY-IN',
        description: `${pay.paymentMode}${pay.notes ? ` - ${pay.notes}` : ''}`,
        debit: 0,
        credit: pay.amount,
      });
    } else {
      rows.push({
        id: pay.id,
        date: pay.date,
        type: 'Payment Made',
        refNo: pay.referenceNumber || 'PAY-OUT',
        description: `${pay.paymentMode}${pay.notes ? ` - ${pay.notes}` : ''}`,
        debit: pay.amount,
        credit: 0,
      });
    }
  });

  // Sort rows chronologically
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter by selected range
  const filteredRows = rows.filter(r => {
    const rowDate = r.date.slice(0, 10);
    return rowDate >= fromDate && rowDate <= toDate;
  });

  // Calculate opening balance before `fromDate`
  const openingBalBase = party.openingBalance || 0;
  const preRangeDebit = rows
    .filter(r => r.date.slice(0, 10) < fromDate)
    .reduce((sum, r) => sum + r.debit, 0);
  const preRangeCredit = rows
    .filter(r => r.date.slice(0, 10) < fromDate)
    .reduce((sum, r) => sum + r.credit, 0);

  const calculatedOpening = openingBalBase + preRangeDebit - preRangeCredit;

  let currentRunning = calculatedOpening;
  const rowsWithBalance = filteredRows.map(r => {
    currentRunning = currentRunning + r.debit - r.credit;
    return {
      ...r,
      runningBalance: currentRunning,
    };
  });

  const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);
  const closingBalance = currentRunning;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-6 print:m-0 print:border-none print:shadow-none">
        
        {/* Controls Bar (Hidden in Print) */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Statement Period:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Sheet */}
        <div className="p-8 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-6 text-slate-800">
          
          {/* Statement Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                {business?.name || 'MBI INVENTRA'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}
              </p>
              <p className="text-xs text-slate-600">
                Phone: <strong>{business?.phone || '03364585863'}</strong> | Mobile: <strong>{business?.mobile || '03281302636'}</strong> | NTN: <strong>{business?.taxNumber || '4928172-9'}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded">
                ACCOUNT STATEMENT
              </span>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Date: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Party & Period Details */}
          <div className="grid grid-cols-2 gap-6 my-5 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement For:</span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">{party.name}</h3>
              {party.contactPerson && (
                <p className="text-xs text-slate-600">Attn: {party.contactPerson}</p>
              )}
              <p className="text-xs text-slate-600">{party.address || 'Kot Momin, Sargodha'}</p>
              <p className="text-xs text-slate-600 font-mono">Phone: {party.phone || 'N/A'}</p>
              {party.taxNumber && (
                <p className="text-xs text-slate-600 font-mono">NTN/GST: {party.taxNumber}</p>
              )}
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Period:</span>
                <p className="text-xs font-bold text-slate-800">
                  {new Date(fromDate).toLocaleDateString('en-GB')} — {new Date(toDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Type:</span>
                <p className="text-xs font-bold text-slate-800">{party.partyType || 'Customer'}</p>
              </div>
              <div className="pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Balance:</span>
                <p className={`text-base font-black font-mono ${
                  closingBalance > 0 ? 'text-emerald-700' : closingBalance < 0 ? 'text-rose-700' : 'text-slate-800'
                }`}>
                  Rs {Math.abs(closingBalance).toLocaleString()} {closingBalance >= 0 ? '(Dr / Receivable)' : '(Cr / Payable)'}
                </p>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-y-2 border-slate-300 bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Ref / Voucher</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Debit (+)</th>
                <th className="py-2.5 px-3 text-right">Credit (-)</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              
              {/* Opening Balance Line */}
              <tr className="bg-amber-50/50 font-semibold">
                <td className="py-2 px-3">{new Date(fromDate).toLocaleDateString('en-GB')}</td>
                <td className="py-2 px-3 text-amber-900">Opening Balance</td>
                <td className="py-2 px-3 font-mono">-</td>
                <td className="py-2 px-3 text-slate-500">Balance brought forward</td>
                <td className="py-2 px-3 text-right font-mono">{calculatedOpening > 0 ? `Rs ${calculatedOpening.toLocaleString()}` : '-'}</td>
                <td className="py-2 px-3 text-right font-mono">{calculatedOpening < 0 ? `Rs ${Math.abs(calculatedOpening).toLocaleString()}` : '-'}</td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                  Rs {Math.abs(calculatedOpening).toLocaleString()} {calculatedOpening >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>

              {rowsWithBalance.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-[11px]">
                    {new Date(r.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800">{r.type}</td>
                  <td className="py-2 px-3 font-mono text-slate-600">{r.refNo}</td>
                  <td className="py-2 px-3 text-slate-600">{r.description}</td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-slate-900">
                    {r.debit > 0 ? `Rs ${r.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium text-emerald-700">
                    {r.credit > 0 ? `Rs ${r.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    Rs {Math.abs(r.runningBalance).toLocaleString()} {r.runningBalance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}

              {rowsWithBalance.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions recorded during this period.
                  </td>
                </tr>
              )}
            </tbody>
            
            {/* Total Footer */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-900">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px]">
                  Period Totals:
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  Rs {totalDebit.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                  Rs {totalCredit.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                  Rs {Math.abs(closingBalance).toLocaleString()} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Statement Terms & Signatures */}
          <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div>
              <h4 className="font-bold text-slate-800">Terms & Payment Instructions:</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Please verify this statement upon receipt. Any discrepancy must be reported within 7 days.
                Payments can be made via Cash, Cheque, or Bank Transfer.
              </p>
            </div>
            <div className="flex justify-end items-end gap-12 text-center pt-8">
              <div>
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Customer Signature</span>
              </div>
              <div>
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Authorized Stamp</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
