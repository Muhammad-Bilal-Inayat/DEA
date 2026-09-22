import React, { useState, useEffect, useRef } from 'react';
import { 
  X, DollarSign, ArrowDownLeft, ArrowUpRight, Calendar, 
  CreditCard, FileText, CheckCircle2, AlertCircle, Save,
  Building2, Hash, Upload, Image as ImageIcon, Trash2
} from 'lucide-react';
import { Party, PartyPayment } from '../../types';
import { dbPartyPayments, dbSuppliers } from '../../lib/db';
import { formatCurrency } from '../../lib/utils';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PartyPayment | null;
  party?: Party | null;
  onPaymentUpdated: (updatedPayment: PartyPayment, updatedParty?: Party) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  party: propParty,
  onPaymentUpdated,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && payment) {
      setAmount(payment.amount.toString());
      setPaymentDate(payment.date ? new Date(payment.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setPaymentMode((payment.paymentMode as any) || 'Cash');
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
      setImageAttachment(payment.imageAttachment || null);
      setErrorMsg(null);

      // Fetch party if not supplied
      if (propParty) {
        setActiveParty(propParty);
      } else if (payment.partyId) {
        dbSuppliers.getById(payment.partyId).then(p => {
          if (p) setActiveParty(p);
        }).catch(() => {});
      }
    }
  }, [isOpen, payment, propParty]);

  if (!isOpen || !payment) return null;

  const isPaymentIn = payment.type === 'PAYMENT_IN' || (payment as any).paymentType === 'In' || (payment as any).type === 'Payment Received';

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageAttachment(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
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
      const oldAmount = payment.amount;
      const updatedPaymentRecord: PartyPayment = {
        ...payment,
        amount: numAmount,
        date: new Date(paymentDate).toISOString(),
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        imageAttachment: imageAttachment || undefined,
        updatedAt: new Date().toISOString()
      };

      await dbPartyPayments.save(updatedPaymentRecord);

      let updatedPartyObj: Party | undefined = undefined;

      // Adjust party balance if party exists
      const targetParty = activeParty || (payment.partyId ? await dbSuppliers.getById(payment.partyId) : null);
      if (targetParty) {
        const currentBal = targetParty.balance ?? targetParty.openingBalance ?? 0;
        let newBalance = currentBal;

        if (isPaymentIn) {
          // Previously reduced balance by oldAmount. Revert old amount, then apply new amount.
          // Example: Customer owed 1000. Paid 200 -> balance was 800.
          // Changed payment to 300: balance should be 800 + 200 - 300 = 700.
          newBalance = currentBal + oldAmount - numAmount;
        } else {
          // PAYMENT_OUT: Previously increased balance toward 0 by oldAmount (or reduced payable).
          // Example: Supplier was owed -1000. Paid 200 -> balance was -800.
          // Changed payment to 300: balance should be -800 - 200 + 300 = -700.
          newBalance = currentBal - oldAmount + numAmount;
        }

        updatedPartyObj = {
          ...targetParty,
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        };

        await dbSuppliers.save(updatedPartyObj as any);
      }

      onPaymentUpdated(updatedPaymentRecord, updatedPartyObj);
      onClose();
    } catch (err: any) {
      console.error('Failed to update payment:', err);
      setErrorMsg('Failed to save updated payment voucher. Please check inputs.');
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
              isPaymentIn ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {isPaymentIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isPaymentIn ? 'Edit Payment In (وصولی بل میں ترمیم)' : 'Edit Payment Out (ادائیگی واؤچر میں ترمیم)'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Party: <span className="font-bold text-slate-800">{payment.partyName}</span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Payment Amount (رقم) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                Rs
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-black text-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Date & Mode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date (تاریخ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Mode (طریقہ کار)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash (نقد)</option>
                  <option value="Bank Transfer">Bank Transfer (بینک ٹرانسفر)</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Cheque">Cheque (چیک)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reference / Cheque # */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reference / Cheque # / Slip # (اختیاری)
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. CHQ-98124 or Trx #87236"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Narration (تفصیل یا ریمارکس)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment description or invoice references..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Receipt / Cheque / Slip Image Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Attach Cheque / Receipt / Slip Image (رسید یا چیک کی تصویر)</span>
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
              <div className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 flex items-center gap-3">
                <img
                  src={imageAttachment}
                  alt="Payment Receipt"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">Receipt / Proof Attached</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Will be saved with this transaction voucher</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Replace Image</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Click or Drag & Drop to upload receipt/cheque photo</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, WEBP (Max 5MB)</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
              className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                isPaymentIn 
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400' 
                  : 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-400'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Update Payment'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
