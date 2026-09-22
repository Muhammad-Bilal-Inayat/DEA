import React, { useState } from 'react';
import { X, Check, Wallet, ArrowDownRight, ArrowUpRight, ArrowRight, DollarSign, Calendar } from 'lucide-react';
import { BankAccount } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export type CashActionType = 'ADD_CASH' | 'REDUCE_CASH' | 'DEPOSIT_TO_BANK' | 'WITHDRAW_FROM_BANK';

interface AdjustCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  currentCashInHand: number;
  onSaveCashAdjustment: (
    type: CashActionType,
    amount: number,
    date: string,
    remarks: string,
    selectedBankId?: string
  ) => Promise<void>;
}

export const AdjustCashModal: React.FC<AdjustCashModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  currentCashInHand,
  onSaveCashAdjustment,
}) => {
  const [actionType, setActionType] = useState<CashActionType>('ADD_CASH');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccounts[0]?.id || '');
  const [remarks, setRemarks] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if ((actionType === 'DEPOSIT_TO_BANK' || actionType === 'WITHDRAW_FROM_BANK') && !selectedBankId) {
      setError('Please select a bank account');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveCashAdjustment(actionType, numAmount, date, remarks, selectedBankId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process cash adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cash In Hand Adjustment</h3>
              <p className="text-xs text-slate-300">Add, withdraw, or transfer physical cash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Cash Info Banner */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Current Cash In Hand:</span>
          <span className={`text-sm font-black ${currentCashInHand >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            Rs {currentCashInHand.toLocaleString()}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Action Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Cash Operation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('ADD_CASH')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  actionType === 'ADD_CASH'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Add Cash (Inflow)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('REDUCE_CASH')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  actionType === 'REDUCE_CASH'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Reduce Cash (Outflow)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('DEPOSIT_TO_BANK')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  actionType === 'DEPOSIT_TO_BANK'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowRight className="w-4 h-4 text-blue-600" />
                <span>Deposit to Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('WITHDRAW_FROM_BANK')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  actionType === 'WITHDRAW_FROM_BANK'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-blue-600" />
                <span>Withdraw from Bank</span>
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Amount (Rs) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rs</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Selection (Only for Deposit to Bank or Withdraw from Bank) */}
          {(actionType === 'DEPOSIT_TO_BANK' || actionType === 'WITHDRAW_FROM_BANK') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Bank Account <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">No bank accounts available</option>
                ) : (
                  bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountDisplayName} ({b.bankName}) - Balance: Rs {(b.currentBalance || 0).toLocaleString()}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Description / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason / Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Opening cash balance, Petty cash addition, Counter drawer sync"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Cash Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
