import React, { useRef } from 'react';
import { X, Printer, Download, Landmark, Calendar, ArrowDownRight, ArrowUpRight, Building2 } from 'lucide-react';
import { BankAccount, BankTransaction } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface BankStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount;
  transactions: BankTransaction[];
  startDate?: string;
  endDate?: string;
}

export const BankStatementModal: React.FC<BankStatementModalProps> = ({
  isOpen,
  onClose,
  bankAccount,
  transactions,
  startDate,
  endDate
}) => {
  const { business } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate opening and running balance
  let runningBalance = bankAccount.openingBalance || 0;
  const ledgerRows = sortedTx.map((tx) => {
    if (tx.flow === 'IN') {
      runningBalance += tx.amount;
    } else {
      runningBalance -= tx.amount;
    }
    return {
      ...tx,
      balanceAfter: runningBalance
    };
  });

  const totalInflow = sortedTx.filter(t => t.flow === 'IN').reduce((acc, t) => acc + t.amount, 0);
  const totalOutflow = sortedTx.filter(t => t.flow === 'OUT').reduce((acc, t) => acc + t.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const data = sortedTx.map((tx, idx) => ({
      'S.No': idx + 1,
      'Date': new Date(tx.date).toLocaleDateString(),
      'Type': tx.type,
      'Particulars / Name': tx.name,
      'Ref / Cheque No': tx.referenceNumber || '-',
      'Debit (Outflow)': tx.flow === 'OUT' ? tx.amount : 0,
      'Credit (Inflow)': tx.flow === 'IN' ? tx.amount : 0,
      'Description': tx.description || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement');
    XLSX.writeFile(wb, `${bankAccount.accountDisplayName}_Statement.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 transition-all my-6 print:border-none print:shadow-none print:m-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar (hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Bank Statement Preview & Print</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Statement Content */}
        <div ref={printRef} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {business?.name || 'MBI INVENTRA'}
              </h1>
              <p className="text-xs text-slate-500 max-w-md">
                {business?.address || 'Main Commercial Area'}, {business?.city || 'Pakistan'}
              </p>
              <p className="text-xs text-slate-500">
                Phone: {business?.phone || '03364585863 / 03281302636'} | NTN: {business?.taxNumber || '-'}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-md border border-blue-200 uppercase tracking-wider mb-1">
                Bank Statement
              </span>
              <p className="text-xs text-slate-500">
                Statement Date: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Account Details Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold">Account Display:</span>
              <span className="font-bold text-slate-800 text-sm">{bankAccount.accountDisplayName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Bank Name:</span>
              <span className="font-bold text-slate-800">{bankAccount.bankName || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Account Number:</span>
              <span className="font-mono font-bold text-slate-800">{bankAccount.accountNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Branch Code / IBAN:</span>
              <span className="font-mono font-bold text-slate-800">{bankAccount.ifscCode || '-'}</span>
            </div>
          </div>

          {/* Balance Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
              <span className="text-xs font-semibold text-emerald-700 block">Total Inflow / Deposits</span>
              <span className="text-base font-black text-emerald-800">+Rs {totalInflow.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-center">
              <span className="text-xs font-semibold text-rose-700 block">Total Outflow / Withdrawals</span>
              <span className="text-base font-black text-rose-800">-Rs {totalOutflow.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
              <span className="text-xs font-semibold text-blue-700 block">Current Closing Balance</span>
              <span className="text-base font-black text-blue-900">Rs {(bankAccount.currentBalance || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Particulars / Party</th>
                  <th className="py-2.5 px-3">Ref No</th>
                  <th className="py-2.5 px-3 text-right">Debit (Out)</th>
                  <th className="py-2.5 px-3 text-right">Credit (In)</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {/* Opening Balance Row */}
                <tr className="bg-slate-50/70 italic text-slate-600">
                  <td className="py-2 px-3">{bankAccount.asOfDate || '-'}</td>
                  <td className="py-2 px-3">Opening Balance</td>
                  <td className="py-2 px-3">As of {bankAccount.asOfDate}</td>
                  <td className="py-2 px-3">-</td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right">
                    {bankAccount.openingBalance ? `Rs ${bankAccount.openingBalance.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    Rs {(bankAccount.openingBalance || 0).toLocaleString()}
                  </td>
                </tr>

                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-normal">
                      No transactions recorded for this account yet.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                        {tx.type}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {tx.name}
                        {tx.description && <span className="block text-[11px] font-normal text-slate-400">{tx.description}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {tx.referenceNumber || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 font-bold whitespace-nowrap">
                        {tx.flow === 'OUT' ? `Rs ${tx.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold whitespace-nowrap">
                        {tx.flow === 'IN' ? `Rs ${tx.amount.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        Rs {tx.balanceAfter.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-400 flex justify-between">
            <span>Generated from MBI Inventra Bank Management System</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
