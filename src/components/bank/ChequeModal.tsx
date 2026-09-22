import React, { useState, useEffect } from 'react';
import { X, Check, FileCheck, Landmark } from 'lucide-react';
import { ChequeRecord, BankAccount } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface ChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cheque: ChequeRecord) => void;
  editingCheque?: ChequeRecord | null;
  bankAccounts: BankAccount[];
}

export const ChequeModal: React.FC<ChequeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCheque,
  bankAccounts
}) => {
  const [chequeNumber, setChequeNumber] = useState('');
  const [type, setType] = useState<'RECEIVED' | 'ISSUED'>('RECEIVED');
  const [bankName, setBankName] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED'>('PENDING');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingCheque) {
      setChequeNumber(editingCheque.chequeNumber || '');
      setType(editingCheque.type || 'RECEIVED');
      setBankName(editingCheque.bankName || '');
      setPartyName(editingCheque.partyName || '');
      setAmount(editingCheque.amount || '');
      setIssueDate(editingCheque.issueDate ? editingCheque.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setDueDate(editingCheque.dueDate ? editingCheque.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setStatus(editingCheque.status || 'PENDING');
      setBankAccountId(editingCheque.bankAccountId || '');
      setNotes(editingCheque.notes || '');
    } else {
      setChequeNumber('');
      setType('RECEIVED');
      setBankName('');
      setPartyName('');
      setAmount('');
      setIssueDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date().toISOString().slice(0, 10));
      setStatus('PENDING');
      setBankAccountId(bankAccounts[0]?.id || '');
      setNotes('');
    }
    setErrors({});
  }, [editingCheque, isOpen, bankAccounts]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!chequeNumber.trim()) errs.chequeNumber = 'Cheque number is required';
    if (!partyName.trim()) errs.partyName = 'Party / Customer / Supplier name is required';
    if (!amount || Number(amount) <= 0) errs.amount = 'Valid amount is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const selectedBank = bankAccounts.find(b => b.id === bankAccountId);
    const chequeData: ChequeRecord = {
      id: editingCheque ? editingCheque.id : `chq-${uuidv4().slice(0, 8)}`,
      chequeNumber: chequeNumber.trim(),
      type,
      bankName: bankName.trim() || 'Bank Cheque',
      partyName: partyName.trim(),
      amount: Number(amount),
      issueDate,
      dueDate,
      status,
      bankAccountId: selectedBank?.id,
      bankAccountName: selectedBank?.accountDisplayName,
      clearanceDate: status === 'CLEARED' ? new Date().toISOString() : undefined,
      notes: notes.trim(),
      createdAt: editingCheque ? editingCheque.createdAt : new Date().toISOString(),
    };

    onSave(chequeData);
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
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {editingCheque ? 'Edit Cheque' : 'Record New Cheque'}
              </h2>
              <p className="text-xs text-slate-300">
                Track incoming & outgoing party bank cheques
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
          {/* Cheque Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cheque Flow
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('RECEIVED')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                  type === 'RECEIVED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📥 Received from Customer
              </button>
              <button
                type="button"
                onClick={() => setType('ISSUED')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                  type === 'ISSUED'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📤 Issued to Supplier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cheque Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="e.g. 00481920"
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono ${
                  errors.chequeNumber ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (Rs) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm rounded-lg border font-bold ${
                  errors.amount ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Party / Payee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="e.g. Shifa Pharmacy"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issuing Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Meezan Bank"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Due / Clearing Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-semibold"
              >
                <option value="PENDING">Pending Clearance</option>
                <option value="CLEARED">Cleared / Deposited</option>
                <option value="BOUNCED">Bounced / Returned</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deposit Into / Draw From Bank
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-semibold"
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.accountDisplayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remarks or memo..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
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
            {editingCheque ? 'Update Cheque' : 'Save Cheque'}
          </button>
        </div>
      </div>
    </div>
  );
};
