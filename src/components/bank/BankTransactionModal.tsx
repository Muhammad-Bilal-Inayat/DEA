import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, Landmark, Wallet, Check, AlertCircle } from 'lucide-react';
import { BankAccount, BankTransaction, BankTransactionType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export type ModalTransactionAction = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'ADJUST';

interface BankTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAction?: ModalTransactionAction;
  selectedBank?: BankAccount | null;
  bankAccounts: BankAccount[];
  onSaveTransaction: (
    tx: BankTransaction, 
    updatedSourceBank: BankAccount, 
    updatedDestBank?: BankAccount
  ) => void;
}

export const BankTransactionModal: React.FC<BankTransactionModalProps> = ({
  isOpen,
  onClose,
  initialAction = 'DEPOSIT',
  selectedBank,
  bankAccounts,
  onSaveTransaction
}) => {
  const [action, setAction] = useState<ModalTransactionAction>(initialAction);
  const [sourceBankId, setSourceBankId] = useState<string>('');
  const [destBankId, setDestBankId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [partyOrName, setPartyOrName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REDUCE'>('ADD');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setAction(initialAction);
      if (selectedBank) {
        setSourceBankId(selectedBank.id);
      } else if (bankAccounts.length > 0) {
        setSourceBankId(bankAccounts[0].id);
      }
      
      const otherBank = bankAccounts.find(b => b.id !== (selectedBank?.id || (bankAccounts[0]?.id)));
      if (otherBank) {
        setDestBankId(otherBank.id);
      } else {
        setDestBankId('');
      }

      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setPartyOrName('');
      setReferenceNumber('');
      setDescription('');
      setAdjustmentType('ADD');
      setErrors({});
    }
  }, [isOpen, initialAction, selectedBank, bankAccounts]);

  const currentSourceBank = bankAccounts.find(b => b.id === sourceBankId) || selectedBank || bankAccounts[0];
  const currentDestBank = bankAccounts.find(b => b.id === destBankId);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!sourceBankId) {
      errs.sourceBankId = 'Please select a bank account';
    }
    if (!amount || Number(amount) <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }
    if (action === 'TRANSFER') {
      if (!destBankId) {
        errs.destBankId = 'Please select destination bank account';
      } else if (destBankId === sourceBankId) {
        errs.destBankId = 'Source and Destination accounts cannot be the same';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !currentSourceBank) return;

    const numAmount = Number(amount);
    const now = new Date().toISOString();

    if (action === 'DEPOSIT') {
      const updatedBank: BankAccount = {
        ...currentSourceBank,
        currentBalance: (currentSourceBank.currentBalance || 0) + numAmount,
        updatedAt: now,
      };

      const tx: BankTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        bankAccountId: currentSourceBank.id,
        bankAccountName: currentSourceBank.accountDisplayName,
        type: 'Deposit',
        flow: 'IN',
        amount: numAmount,
        date: `${date}T12:00:00.000Z`,
        name: partyOrName.trim() || 'Cash Deposit / Inflow',
        referenceNumber: referenceNumber.trim(),
        description: description.trim() || 'Cash deposited into bank',
        createdAt: now,
        updatedAt: now,
      };

      onSaveTransaction(tx, updatedBank);
    } else if (action === 'WITHDRAW') {
      const updatedBank: BankAccount = {
        ...currentSourceBank,
        currentBalance: (currentSourceBank.currentBalance || 0) - numAmount,
        updatedAt: now,
      };

      const tx: BankTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        bankAccountId: currentSourceBank.id,
        bankAccountName: currentSourceBank.accountDisplayName,
        type: 'Withdrawal',
        flow: 'OUT',
        amount: numAmount,
        date: `${date}T12:00:00.000Z`,
        name: partyOrName.trim() || 'Cash Withdrawal / Cash in Hand',
        referenceNumber: referenceNumber.trim(),
        description: description.trim() || 'Cash withdrawn from bank',
        createdAt: now,
        updatedAt: now,
      };

      onSaveTransaction(tx, updatedBank);
    } else if (action === 'TRANSFER') {
      if (!currentDestBank) return;

      const updatedSource: BankAccount = {
        ...currentSourceBank,
        currentBalance: (currentSourceBank.currentBalance || 0) - numAmount,
        updatedAt: now,
      };

      const updatedDest: BankAccount = {
        ...currentDestBank,
        currentBalance: (currentDestBank.currentBalance || 0) + numAmount,
        updatedAt: now,
      };

      const txSource: BankTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        bankAccountId: currentSourceBank.id,
        bankAccountName: currentSourceBank.accountDisplayName,
        type: 'Bank Transfer Out',
        flow: 'OUT',
        amount: numAmount,
        date: `${date}T12:00:00.000Z`,
        name: `Transfer to ${currentDestBank.accountDisplayName}`,
        transferToBankAccountId: currentDestBank.id,
        transferToBankAccountName: currentDestBank.accountDisplayName,
        referenceNumber: referenceNumber.trim(),
        description: description.trim() || `Fund transfer to ${currentDestBank.accountDisplayName}`,
        createdAt: now,
        updatedAt: now,
      };

      onSaveTransaction(txSource, updatedSource, updatedDest);
    } else if (action === 'ADJUST') {
      const isAdd = adjustmentType === 'ADD';
      const balanceChange = isAdd ? numAmount : -numAmount;

      const updatedBank: BankAccount = {
        ...currentSourceBank,
        currentBalance: (currentSourceBank.currentBalance || 0) + balanceChange,
        updatedAt: now,
      };

      const tx: BankTransaction = {
        id: `btx-${uuidv4().slice(0, 8)}`,
        bankAccountId: currentSourceBank.id,
        bankAccountName: currentSourceBank.accountDisplayName,
        type: 'Adjustment',
        flow: isAdd ? 'IN' : 'OUT',
        amount: numAmount,
        date: `${date}T12:00:00.000Z`,
        name: partyOrName.trim() || (isAdd ? 'Balance Increase Adjustment' : 'Balance Reduction Adjustment'),
        referenceNumber: referenceNumber.trim(),
        description: description.trim() || 'Manual balance adjustment',
        createdAt: now,
        updatedAt: now,
      };

      onSaveTransaction(tx, updatedBank);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e293b] text-white">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              action === 'DEPOSIT' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
                : action === 'WITHDRAW'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
                : action === 'TRANSFER'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
            }`}>
              {action === 'DEPOSIT' && <ArrowDownRight className="w-5 h-5" />}
              {action === 'WITHDRAW' && <ArrowUpRight className="w-5 h-5" />}
              {action === 'TRANSFER' && <ArrowLeftRight className="w-5 h-5" />}
              {action === 'ADJUST' && <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {action === 'DEPOSIT' && 'Deposit to Bank'}
                {action === 'WITHDRAW' && 'Withdraw from Bank'}
                {action === 'TRANSFER' && 'Bank to Bank Transfer'}
                {action === 'ADJUST' && 'Adjust Bank Balance'}
              </h2>
              <p className="text-xs text-slate-300">
                {action === 'DEPOSIT' && 'Add cash or transfer funds into this bank account'}
                {action === 'WITHDRAW' && 'Withdraw cash from this bank account to shop counter'}
                {action === 'TRANSFER' && 'Transfer funds between two business accounts'}
                {action === 'ADJUST' && 'Manually adjust the ledger balance for reconciliation'}
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setAction('DEPOSIT')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              action === 'DEPOSIT'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setAction('WITHDRAW')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              action === 'WITHDRAW'
                ? 'border-rose-600 text-rose-700 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => setAction('TRANSFER')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              action === 'TRANSFER'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            Bank Transfer
          </button>
          <button
            type="button"
            onClick={() => setAction('ADJUST')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              action === 'ADJUST'
                ? 'border-amber-600 text-amber-700 bg-white rounded-t-lg border-t border-x border-slate-200 -mb-[1px]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            Adjust Balance
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 space-y-4">
          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {action === 'TRANSFER' ? 'Source Bank (From)' : 'Bank Account'} <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceBankId}
                onChange={(e) => setSourceBankId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-semibold text-slate-800"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.accountDisplayName} (Bal: Rs {(b.currentBalance || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            {action === 'TRANSFER' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Bank (To) <span className="text-red-500">*</span>
                </label>
                <select
                  value={destBankId}
                  onChange={(e) => setDestBankId(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none font-semibold text-slate-800 ${
                    errors.destBankId 
                      ? 'border-red-400 focus:ring-red-200 bg-red-50/30' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                  }`}
                >
                  <option value="">Select Destination Bank</option>
                  {bankAccounts
                    .filter((b) => b.id !== sourceBankId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountDisplayName} (Bal: Rs {(b.currentBalance || 0).toLocaleString()})
                      </option>
                    ))}
                </select>
                {errors.destBankId && (
                  <p className="text-[11px] text-red-500 mt-0.5">{errors.destBankId}</p>
                )}
              </div>
            )}

            {action === 'ADJUST' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Adjustment Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('ADD')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      adjustmentType === 'ADD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + Increase Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('REDUCE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      adjustmentType === 'REDUCE'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    - Reduce Balance
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (Rs) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className={`w-full pl-9 pr-3 py-2 text-base font-bold rounded-lg border focus:outline-none ${
                    errors.amount 
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50/30' 
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>
              {errors.amount && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Transaction Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Party / Depositor / Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {action === 'DEPOSIT' && 'Depositor / Received From / Party'}
                {action === 'WITHDRAW' && 'Withdrawn By / Purpose / Party'}
                {action === 'TRANSFER' && 'Purpose / Memo'}
                {action === 'ADJUST' && 'Adjustment Reason / Reference'}
              </label>
              <input
                type="text"
                value={partyOrName}
                onChange={(e) => setPartyOrName(e.target.value)}
                placeholder={
                  action === 'DEPOSIT' ? 'e.g. Counter Cash Deposit / Ali Pharmacy' :
                  action === 'WITHDRAW' ? 'e.g. Shop Petty Cash / Owner Drawing' :
                  action === 'TRANSFER' ? 'e.g. Monthly Supplier Settlement Fund' :
                  'e.g. Bank Profit / SMS Charges / Reconciliation'
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ref / Cheque / RRN No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. CHQ-948201 / TXN-83921"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about this transaction..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none"
            />
          </div>

          {/* Balance Preview Box */}
          {currentSourceBank && amount && Number(amount) > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Current Balance ({currentSourceBank.accountDisplayName}):</span>
                <span className="font-semibold">Rs {(currentSourceBank.currentBalance || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                <span>New Expected Balance:</span>
                <span className={
                  action === 'DEPOSIT' || (action === 'ADJUST' && adjustmentType === 'ADD')
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }>
                  Rs {(
                    action === 'DEPOSIT' || (action === 'ADJUST' && adjustmentType === 'ADD')
                      ? (currentSourceBank.currentBalance || 0) + Number(amount)
                      : (currentSourceBank.currentBalance || 0) - Number(amount)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 ${
              action === 'DEPOSIT'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : action === 'WITHDRAW'
                ? 'bg-rose-600 hover:bg-rose-700'
                : action === 'TRANSFER'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <Check className="w-4 h-4" />
            {action === 'DEPOSIT' && 'Record Deposit'}
            {action === 'WITHDRAW' && 'Record Withdrawal'}
            {action === 'TRANSFER' && 'Complete Transfer'}
            {action === 'ADJUST' && 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
};
