import React, { useState, useEffect } from 'react';
import { X, Building2, Landmark, Check, QrCode, CreditCard, ShieldCheck } from 'lucide-react';
import { BankAccount } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bank: BankAccount, saveAndNew?: boolean) => void;
  editingBank?: BankAccount | null;
}

const POPULAR_BANKS = [
  { name: 'Meezan Bank', code: 'MEEZAN', ifsc: 'MEZN0001' },
  { name: 'Habib Bank Limited (HBL)', code: 'HBL', ifsc: 'HABB0001' },
  { name: 'Bank Alfalah', code: 'ALFALAH', ifsc: 'ALFH0001' },
  { name: 'United Bank Limited (UBL)', code: 'UBL', ifsc: 'UNIL0001' },
  { name: 'MCB Bank', code: 'MCB', ifsc: 'MUCB0001' },
  { name: 'Allied Bank Limited (ABL)', code: 'ALLIED', ifsc: 'ABPA0001' },
  { name: 'EasyPaisa / Telenor Microfinance', code: 'EASYPAISA', ifsc: 'EP0001' },
  { name: 'JazzCash / Mobilink Bank', code: 'JAZZCASH', ifsc: 'JC0001' },
  { name: 'Nayapay', code: 'NAYAPAY', ifsc: 'NP0001' },
  { name: 'Sadapay', code: 'SADAPAY', ifsc: 'SP0001' },
];

export const AddBankAccountModal: React.FC<AddBankAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBank
}) => {
  const [accountDisplayName, setAccountDisplayName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [printOnInvoice, setPrintOnInvoice] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingBank) {
      setAccountDisplayName(editingBank.accountDisplayName || '');
      setBankName(editingBank.bankName || '');
      setAccountHolderName(editingBank.accountHolderName || '');
      setAccountNumber(editingBank.accountNumber || '');
      setIfscCode(editingBank.ifscCode || '');
      setBranchName(editingBank.branchName || '');
      setUpiId(editingBank.upiId || '');
      setOpeningBalance(editingBank.openingBalance || 0);
      setAsOfDate(editingBank.asOfDate ? editingBank.asOfDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setPrintOnInvoice(editingBank.printOnInvoice ?? true);
    } else {
      resetForm();
    }
    setErrors({});
  }, [editingBank, isOpen]);

  const resetForm = () => {
    setAccountDisplayName('');
    setBankName('');
    setAccountHolderName('');
    setAccountNumber('');
    setIfscCode('');
    setBranchName('');
    setUpiId('');
    setOpeningBalance(0);
    setAsOfDate(new Date().toISOString().slice(0, 10));
    setPrintOnInvoice(true);
    setErrors({});
  };

  const handleSelectPopularBank = (bank: { name: string; code: string; ifsc: string }) => {
    if (!accountDisplayName) setAccountDisplayName(bank.code);
    setBankName(bank.name);
    if (!ifscCode) setIfscCode(bank.ifsc);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!accountDisplayName.trim()) {
      errs.accountDisplayName = 'Account display name is required';
    }
    if (!accountNumber.trim()) {
      errs.accountNumber = 'Account number is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (saveAndNew: boolean = false) => {
    if (!validate()) return;

    const opBal = Number(openingBalance) || 0;
    const bankData: BankAccount = {
      id: editingBank ? editingBank.id : `bank-${uuidv4().slice(0, 8)}`,
      accountDisplayName: accountDisplayName.trim().toUpperCase(),
      bankName: bankName.trim() || accountDisplayName.trim(),
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      branchName: branchName.trim(),
      upiId: upiId.trim(),
      openingBalance: opBal,
      asOfDate: asOfDate,
      currentBalance: editingBank 
        ? (editingBank.currentBalance - (editingBank.openingBalance || 0) + opBal)
        : opBal,
      printOnInvoice,
      isDefault: editingBank ? editingBank.isDefault : false,
      createdAt: editingBank ? editingBank.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(bankData, saveAndNew);
    if (saveAndNew) {
      resetForm();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 transition-all my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-[#1a2235] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-400">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
              </h2>
              <p className="text-xs text-slate-300">
                Manage your company's bank accounts, cash registers & online payment gateways
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

        {/* Modal Body */}
        <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto space-y-5">
          {/* Quick Bank Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Popular Banks & Wallets (Click to Auto-fill)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_BANKS.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => handleSelectPopularBank(b)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors cursor-pointer ${
                    accountDisplayName === b.code
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {b.code}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account Display Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountDisplayName}
                onChange={(e) => setAccountDisplayName(e.target.value.toUpperCase())}
                placeholder="e.g. MEEZAN, HBL MAIN, RAWH"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 uppercase font-medium ${
                  errors.accountDisplayName 
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/30' 
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.accountDisplayName && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.accountDisplayName}</p>
              )}
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Meezan Bank Limited"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 0214-0103498212"
                className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 font-mono ${
                  errors.accountNumber 
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/30' 
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />
              {errors.accountNumber && (
                <p className="text-[11px] text-red-500 mt-0.5">{errors.accountNumber}</p>
              )}
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Account Holder Title
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="e.g. MBI Inventra"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            {/* IFSC Code / IBAN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                IFSC Code / Branch Code / IBAN
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. MEZN0001 or PK65MEZN..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono uppercase"
              />
            </div>

            {/* Branch Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Branch Name / City
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Medicine Market Branch"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </div>

            {/* UPI ID / Raast ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                UPI ID / Raast ID (For QR Payment)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. 03001234567@raast or pharmacy@meezan"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-mono"
              />
            </div>

            {/* Opening Balance & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Opening Balance
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs</span>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  As of Date
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Print on Invoices Checkbox */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-3">
            <input
              type="checkbox"
              id="printOnInvoice"
              checked={printOnInvoice}
              onChange={(e) => setPrintOnInvoice(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="printOnInvoice" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-bold text-slate-900 block">Print bank account & UPI/Raast details on Sale Invoices</span>
              Customers will see this account number & Raast QR code on bills for instant electronic payments.
            </label>
          </div>
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

          <div className="flex items-center gap-2">
            {!editingBank && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Save & New
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {editingBank ? 'Update Account' : 'Save Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
