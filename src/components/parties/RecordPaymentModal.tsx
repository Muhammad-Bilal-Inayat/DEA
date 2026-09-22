import React, { useState, useRef } from 'react';
import { 
  X, DollarSign, ArrowDownLeft, ArrowUpRight, Calendar, 
  CreditCard, FileText, CheckCircle2, AlertCircle, Upload, Image as ImageIcon, Trash2
} from 'lucide-react';
import { Party, PartyPayment } from '../../types';
import { dbPartyPayments, dbSuppliers } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  onPaymentSaved: (payment: PartyPayment, updatedParty: Party) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  party,
  onPaymentSaved,
}) => {
  const isSupplier = party.partyType === 'Supplier';
  const defaultType = isSupplier ? 'PAYMENT_OUT' : 'PAYMENT_IN';

  const [paymentType, setPaymentType] = useState<'PAYMENT_IN' | 'PAYMENT_OUT'>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentBal = party.balance ?? party.openingBalance ?? 0;

  const handleQuickFill = (fullAmount: number) => {
    setAmount(Math.abs(fullAmount).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const paymentRecord: PartyPayment = {
        id: uuidv4(),
        partyId: party.id,
        partyName: party.name,
        type: paymentType,
        amount: numAmount,
        date: new Date(paymentDate).toISOString(),
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        imageAttachment: imageAttachment || undefined,
        createdAt: new Date().toISOString(),
      };

      await dbPartyPayments.save(paymentRecord);

      // Adjust Party Balance:
      // If PAYMENT_IN from Customer: customer balance decreases (they owe less) -> bal - numAmount
      // If PAYMENT_OUT to Supplier: supplier balance increases toward 0 -> bal + numAmount
      let newBalance = currentBal;
      if (paymentType === 'PAYMENT_IN') {
        newBalance = currentBal - numAmount;
      } else {
        newBalance = currentBal + numAmount;
      }

      const updatedParty: Party = {
        ...party,
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      };

      await dbSuppliers.save(updatedParty as any);

      onPaymentSaved(paymentRecord, updatedParty);
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setErrorMsg('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              paymentType === 'PAYMENT_IN' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {paymentType === 'PAYMENT_IN' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {paymentType === 'PAYMENT_IN' ? 'Record Payment In (رقم وصول)' : 'Record Payment Out (ادائیگی)'}
              </h2>
              <p className="text-xs text-slate-500">
                Party: <strong className="text-slate-800">{party.name}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Ribbon */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600">Current Outstanding Balance:</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold text-sm ${
              currentBal > 0 ? 'text-emerald-600' : currentBal < 0 ? 'text-rose-600' : 'text-slate-700'
            }`}>
              Rs {Math.abs(currentBal).toLocaleString()}
              <span className="text-[11px] font-normal text-slate-500 ml-1">
                {currentBal > 0 ? '(You\'ll Receive)' : currentBal < 0 ? '(You\'ll Pay)' : '(Settled)'}
              </span>
            </span>
            {Math.abs(currentBal) > 0 && (
              <button
                type="button"
                onClick={() => handleQuickFill(currentBal)}
                className="text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
              >
                Full Settle
              </button>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentType('PAYMENT_IN')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                paymentType === 'PAYMENT_IN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Payment In (Received)
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('PAYMENT_OUT')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                paymentType === 'PAYMENT_OUT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Payment Out (Paid)
            </button>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Amount (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono">Rs</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-xs"
              />
            </div>
          </div>

          {/* Date & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMode}
                onChange={(e: any) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Cash">Cash (نقد)</option>
                <option value="Bank Transfer">Bank Transfer / IBFT</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference / Cheque No */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reference / Transaction / Cheque No.
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-89210 or Chq #40921"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks / Payment Note
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cleared bill #INV-102 or partial recovery"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Receipt / Cheque / Proof Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Attach Cheque / Slip / Proof Image</span>
              </span>
              {imageAttachment && (
                <button
                  type="button"
                  onClick={() => setImageAttachment(null)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </label>

            {imageAttachment ? (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center gap-3">
                <img
                  src={imageAttachment}
                  alt="Payment Receipt"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">Slip / Proof Attached</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/20 rounded-xl p-3 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Click to attach photo of cheque or slip</p>
                <p className="text-[10.5px] text-slate-400">PNG, JPG, WEBP (Max 5MB)</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (ev) => setImageAttachment(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                paymentType === 'PAYMENT_IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : `Record PKR ${parseFloat(amount || '0').toLocaleString()}`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
