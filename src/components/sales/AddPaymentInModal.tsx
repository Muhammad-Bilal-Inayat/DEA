import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, UserPlus, CreditCard, DollarSign, Calendar, FileText, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Party, PartyPayment, Invoice } from '../../types';
import { dbSuppliers, dbPartyPayments, dbInvoices } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../../lib/utils';
import { AddPartyModal } from '../parties/AddPartyModal';

interface AddPaymentInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (payment: PartyPayment) => void;
  initialPartyId?: string;
  initialPartyName?: string;
  initialAmount?: number;
}

export const AddPaymentInModal: React.FC<AddPaymentInModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialPartyId,
  initialPartyName,
  initialAmount
}) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearchQuery, setPartySearchQuery] = useState('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);

  const [amount, setAmount] = useState<number>(initialAmount || 0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadParties();
      if (initialAmount) setAmount(initialAmount);
      if (initialPartyName) setPartySearchQuery(initialPartyName);
    }
  }, [isOpen, initialPartyId, initialPartyName, initialAmount]);

  const loadParties = async () => {
    const data = await dbSuppliers.getAll();
    setParties(data);
    if (initialPartyId) {
      const found = data.find(p => p.id === initialPartyId);
      if (found) {
        setSelectedParty(found);
        setPartySearchQuery(found.name);
        loadPartyInvoices(found.name);
      }
    }
  };

  const loadPartyInvoices = async (partyName: string) => {
    const allInvoices = await dbInvoices.getAll();
    const unpaid = allInvoices.filter(
      inv => inv.customerName.toLowerCase() === partyName.toLowerCase() && inv.balanceDue > 0
    );
    setUnpaidInvoices(unpaid);
  };

  const handleSelectParty = (p: Party) => {
    setSelectedParty(p);
    setPartySearchQuery(p.name);
    setIsPartyDropdownOpen(false);
    loadPartyInvoices(p.name);
  };

  const handleSave = async () => {
    if (!selectedParty && !partySearchQuery.trim()) {
      alert('Please select or enter a party / customer name.');
      return;
    }

    if (!amount || amount <= 0) {
      alert('Please enter a valid received payment amount.');
      return;
    }

    const partyName = selectedParty ? selectedParty.name : partySearchQuery.trim();
    const partyId = selectedParty ? selectedParty.id : 'cust-custom';

    const newPayment: PartyPayment = {
      id: uuidv4(),
      partyId: partyId,
      partyName: partyName,
      type: 'PAYMENT_IN',
      amount: amount,
      date: new Date(date).toISOString(),
      paymentMode: paymentMode,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      imageAttachment: imageAttachment || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save payment record
      await dbPartyPayments.save(newPayment);

      // 2. Reduce party outstanding balance
      if (selectedParty) {
        const currentBal = selectedParty.balance || 0;
        const newBal = Math.max(0, currentBal - amount);
        await dbSuppliers.save({ ...selectedParty, balance: newBal });
      }

      // 3. Auto settle unpaid invoices (oldest first)
      let remainingPayment = amount;
      for (const inv of unpaidInvoices) {
        if (remainingPayment <= 0) break;
        const settleAmount = Math.min(inv.balanceDue, remainingPayment);
        const updatedReceived = (inv.receivedAmount || 0) + settleAmount;
        const updatedBalance = inv.balanceDue - settleAmount;
        await dbInvoices.save({
          ...inv,
          receivedAmount: updatedReceived,
          balanceDue: updatedBalance
        });
        remainingPayment -= settleAmount;
      }

      onSaveSuccess(newPayment);
      onClose();
    } catch (err) {
      console.error('Failed to save Payment In:', err);
      alert('Error saving payment. Please check console.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-emerald-700 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">Payment In (وصولی)</h2>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">Record money received from party / customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          
          {/* Party Selection */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Party / Customer <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or enter party name..."
                value={partySearchQuery}
                onChange={(e) => {
                  setPartySearchQuery(e.target.value);
                  setIsPartyDropdownOpen(true);
                }}
                onFocus={() => setIsPartyDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsPartyDropdownOpen(false);
                  }, 200);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>

            {/* Dropdown Results */}
            {isPartyDropdownOpen && (
              <div 
                onMouseDown={(e) => e.preventDefault()}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100"
              >
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setIsAddPartyOpen(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  + Add New Party
                </button>
                {parties
                  .filter(p => p.name.toLowerCase().includes(partySearchQuery.toLowerCase()))
                  .map(p => (
                    <div
                      key={p.id}
                      tabIndex={0}
                      role="option"
                      onClick={() => handleSelectParty(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectParty(p);
                        }
                      }}
                      className="px-4 py-2.5 hover:bg-slate-50 focus:bg-emerald-50 focus:outline-none cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.city || p.phone || 'No contact info'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-slate-400">Current Balance</div>
                        <div className={`text-xs font-mono font-bold ${(p.balance || 0) > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {formatCurrency(p.balance || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Selected Party Balance Pill */}
          {selectedParty && (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="font-semibold text-slate-600">Current Outstanding Dues:</span>
              <span className="font-mono font-black text-rose-600 text-sm">
                {formatCurrency(selectedParty.balance || 0)}
              </span>
            </div>
          )}

          {/* Amount and Date Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Received Amount (Rs) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rs</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm font-mono font-bold text-emerald-700 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['Cash', 'Bank Transfer', 'EasyPaisa', 'JazzCash', 'Cheque'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reference / Receipt Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reference / Receipt / Cheque #
            </label>
            <input
              type="text"
              placeholder="e.g. RCT-1004, Cheque # 99281, HBL App Txn..."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Description
            </label>
            <textarea
              rows={2}
              placeholder="Payment remarks or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Receipt / Slip Image Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Attach Payment Slip / Cheque Image</span>
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
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">Payment Proof Attached</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-3 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Click to upload deposit slip or cheque image</p>
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

          {/* Unpaid Invoices Notice */}
          {unpaidInvoices.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Unpaid Invoices Available ({unpaidInvoices.length})</span>
              </div>
              <p className="text-[11px] text-blue-700">
                This payment will automatically settle the oldest unpaid balances for this party.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            Save Payment In
          </button>
        </div>

      </div>

      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        onSave={async (newParty) => {
          await dbSuppliers.save(newParty as any);
          const updated = await dbSuppliers.getAll();
          setParties(updated);
          handleSelectParty(newParty);
          setIsAddPartyOpen(false);
        }}
      />
    </div>
  );
};
