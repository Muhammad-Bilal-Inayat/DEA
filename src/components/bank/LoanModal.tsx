import React, { useState, useEffect } from 'react';
import { X, Check, Building2, Landmark, DollarSign } from 'lucide-react';
import { LoanAccount, BankAccount } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (loan: LoanAccount) => void;
  editingLoan?: LoanAccount | null;
  bankAccounts: BankAccount[];
}

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLoan,
  bankAccounts
}) => {
  const [accountName, setAccountName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [loanType, setLoanType] = useState<'BORROWED' | 'LENT'>('BORROWED');
  const [loanAmount, setLoanAmount] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [tenureMonths, setTenureMonths] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankAccountId, setBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'CLOSED'>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingLoan) {
      setAccountName(editingLoan.accountName || '');
      setLenderName(editingLoan.lenderName || '');
      setLoanType(editingLoan.loanType || 'BORROWED');
      setLoanAmount(editingLoan.loanAmount || '');
      setInterestRate(editingLoan.interestRate || '');
      setTenureMonths(editingLoan.tenureMonths || '');
      setStartDate(editingLoan.startDate ? editingLoan.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setBankAccountId(editingLoan.bankAccountId || '');
      setDescription(editingLoan.description || '');
      setStatus(editingLoan.status || 'ACTIVE');
    } else {
      setAccountName('');
      setLenderName('');
      setLoanType('BORROWED');
      setLoanAmount('');
      setInterestRate('');
      setTenureMonths('');
      setStartDate(new Date().toISOString().slice(0, 10));
      setBankAccountId(bankAccounts[0]?.id || '');
      setDescription('');
      setStatus('ACTIVE');
    }
    setErrors({});
  }, [editingLoan, isOpen, bankAccounts]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!accountName.trim()) errs.accountName = 'Loan account title is required';
    if (!lenderName.trim()) errs.lenderName = 'Lender / Borrower name is required';
    if (!loanAmount || Number(loanAmount) <= 0) errs.loanAmount = 'Valid loan amount is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const loanData: LoanAccount = {
      id: editingLoan ? editingLoan.id : `loan-${uuidv4().slice(0, 8)}`,
      accountName: accountName.trim(),
      lenderName: lenderName.trim(),
      loanType,
      loanAmount: Number(loanAmount),
      currentBalance: editingLoan ? editingLoan.currentBalance : Number(loanAmount),
      interestRate: interestRate === '' ? undefined : Number(interestRate),
      tenureMonths: tenureMonths === '' ? undefined : Number(tenureMonths),
      startDate,
      bankAccountId: bankAccountId || undefined,
      description: description.trim(),
      status,
      createdAt: editingLoan ? editingLoan.createdAt : new Date().toISOString(),
    };

    onSave(loanData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e293b] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-400/30 rounded-lg text-amber-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingLoan ? 'Edit Loan Account' : 'Add Loan Account'}
              </h2>
              <p className="text-xs text-slate-300">
                Track bank SME financing, partner borrowings or loans given
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Loan Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLoanType('BORROWED')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                  loanType === 'BORROWED'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📥 Loan Borrowed (Liability)
              </button>
              <button
                type="button"
                onClick={() => setLoanType('LENT')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                  loanType === 'LENT'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📤 Loan Given (Asset)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Account / Loan Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Meezan SME Working Capital or Partner Loan (Ali)"
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                errors.accountName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Lender / Borrower Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g. Meezan Bank / Mr. Ali"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  errors.lenderName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loan Principal (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm rounded-lg border font-bold ${
                  errors.loanAmount ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Interest Rate (%)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.0 %"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tenure (Months)
              </label>
              <input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="12"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Disbursed / Linked Bank Account
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-semibold"
            >
              <option value="">No linked bank</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.accountDisplayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Terms
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Terms, collateral or repayment schedule notes..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {editingLoan ? 'Update Loan' : 'Save Loan Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
