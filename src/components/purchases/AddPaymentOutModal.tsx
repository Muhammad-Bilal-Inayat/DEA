import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, UserPlus, CreditCard, DollarSign, Calendar, FileText, ArrowDownRight, Building2, Receipt, AlertCircle, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Party, PartyPayment, PurchaseOrder, AuditLog } from '../../types';
import { dbSuppliers, dbPartyPayments, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../../lib/utils';
import { AddPartyModal } from '../parties/AddPartyModal';

interface AddPaymentOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (payment: PartyPayment) => void;
  initialSupplierId?: string;
  initialSupplierName?: string;
  initialAmount?: number;
  initialPurchaseOrderId?: string;
}

export const AddPaymentOutModal: React.FC<AddPaymentOutModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialSupplierId,
  initialSupplierName,
  initialAmount,
  initialPurchaseOrderId
}) => {
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  const [amount, setAmount] = useState<number>(initialAmount || 0);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PV-${today}-${rand}`;
  });
  const [notes, setNotes] = useState<string>('');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [unpaidPurchaseOrders, setUnpaidPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAddPartyOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isAddPartyOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      if (initialAmount) setAmount(initialAmount);
      if (initialSupplierName) setSupplierSearchQuery(initialSupplierName);
    }
  }, [isOpen, initialSupplierId, initialSupplierName, initialAmount]);

  const loadSuppliers = async () => {
    try {
      const data = await dbSuppliers.getAll();
      setSuppliers(data);
      if (initialSupplierId) {
        const found = data.find(p => p.id === initialSupplierId);
        if (found) {
          setSelectedSupplier(found);
          setSupplierSearchQuery(found.name);
          loadSupplierOrders(found.name);
        }
      } else if (initialSupplierName) {
        const found = data.find(p => p.name.toLowerCase() === initialSupplierName.toLowerCase());
        if (found) {
          setSelectedSupplier(found);
          loadSupplierOrders(found.name);
        }
      }
    } catch (e) {
      console.error('Error loading suppliers:', e);
    }
  };

  const loadSupplierOrders = async (supplierName: string) => {
    try {
      const allOrders = await dbPurchaseOrders.getAll();
      const unpaid = allOrders.filter(
        po => po.supplierName.toLowerCase() === supplierName.toLowerCase() && 
             ((po.balanceDue !== undefined && po.balanceDue > 0) || po.status !== 'Paid')
      );
      setUnpaidPurchaseOrders(unpaid);
    } catch (e) {
      console.error('Error loading supplier orders:', e);
    }
  };

  const handleSelectSupplier = (s: Party) => {
    setSelectedSupplier(s);
    setSupplierSearchQuery(s.name);
    setIsSupplierDropdownOpen(false);
    loadSupplierOrders(s.name);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(supplierSearchQuery)) ||
    (s.company && s.company.toLowerCase().includes(supplierSearchQuery.toLowerCase()))
  );

  const totalOutstanding = unpaidPurchaseOrders.reduce((sum, po) => {
    const due = po.balanceDue !== undefined ? po.balanceDue : (po.totalAmount - (po.paidAmount || 0));
    return sum + (due > 0 ? due : 0);
  }, 0);

  const handleSave = async () => {
    if (!selectedSupplier && !supplierSearchQuery.trim()) {
      alert('Please select or specify a Supplier / Vendor name.');
      return;
    }

    if (!amount || amount <= 0) {
      alert('Please enter a valid Payment Out amount greater than 0.');
      return;
    }

    setIsSaving(true);
    const supplierName = selectedSupplier ? selectedSupplier.name : supplierSearchQuery.trim();
    const supplierId = selectedSupplier ? selectedSupplier.id : `sup-${Date.now()}`;

    const newPayment: PartyPayment = {
      id: uuidv4(),
      partyId: supplierId,
      partyName: supplierName,
      type: 'PAYMENT_OUT',
      amount: Number(amount),
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

      // 2. Reduce supplier outstanding balance if exists
      if (selectedSupplier) {
        const currentBal = selectedSupplier.balance || 0;
        const newBal = Math.max(0, currentBal - amount);
        await dbSuppliers.save({ ...selectedSupplier, balance: newBal });
      }

      // 3. Auto-settle unpaid purchase orders starting from oldest
      let remainingPayment = amount;
      for (const po of unpaidPurchaseOrders) {
        if (remainingPayment <= 0) break;
        const due = po.balanceDue !== undefined ? po.balanceDue : (po.totalAmount - (po.paidAmount || 0));
        if (due <= 0) continue;

        const settleAmount = Math.min(due, remainingPayment);
        const updatedPaid = (po.paidAmount || 0) + settleAmount;
        const updatedDue = Math.max(0, due - settleAmount);
        const updatedStatus = updatedDue === 0 ? 'Paid' : 'Partially Paid';

        await dbPurchaseOrders.save({
          ...po,
          paidAmount: updatedPaid,
          balanceDue: updatedDue,
          status: updatedStatus as any
        });

        remainingPayment -= settleAmount;
      }

      // 4. Record audit log
      const auditLog: AuditLog = {
        id: uuidv4(),
        date: new Date().toISOString(),
        action: 'PAYMENT_OUT_RECORDED',
        userId: '1',
        notes: `Payment Out of ${formatCurrency(amount)} recorded to supplier ${supplierName} via ${paymentMode}. Ref: ${referenceNumber}`
      };
      await dbAuditLogs.save(auditLog);

      onSaveSuccess(newPayment);
      onClose();
    } catch (err) {
      console.error('Failed to save Payment Out voucher:', err);
      alert('Failed to save Payment Out voucher. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200 select-none cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh] text-slate-800 animate-in fade-in zoom-in-95 animate-fade-scale duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header with red/amber theme for Outflow */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl shrink-0">
              <ArrowDownRight className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>Payment Out (Supplier Voucher)</span>
                <span className="hidden sm:inline-block bg-rose-500/30 text-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-400/30">
                  Outgoing Cashflow
                </span>
              </h2>
              <p className="text-[11px] text-rose-200">
                Record payment made to a vendor or distributor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with overflow-y-auto */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 bg-slate-50/50">
          
          {/* Supplier Selector */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Supplier / Vendor *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddPartyOpen(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add New Supplier</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={supplierSearchQuery}
                onChange={(e) => {
                  setSupplierSearchQuery(e.target.value);
                  setIsSupplierDropdownOpen(true);
                  if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                    setSelectedSupplier(null);
                    setUnpaidPurchaseOrders([]);
                  }
                }}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsSupplierDropdownOpen(false);
                  }, 200);
                }}
                placeholder="Search supplier by name, company, or phone..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

              {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                <div 
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
                >
                  {filteredSuppliers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      tabIndex={0}
                      role="option"
                      onClick={() => handleSelectSupplier(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSupplier(s);
                        }
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-50/70 focus:bg-rose-50 focus:outline-none text-xs border-b border-slate-100 last:border-b-0 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.company || 'Distributor'} {s.phone ? `• ${s.phone}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Balance Payable:</div>
                        <div className="font-bold text-rose-600 font-mono text-xs">
                          {formatCurrency(s.balance || 0)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Supplier Payable Details Banner */}
          {selectedSupplier && (
            <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Selected Supplier:</span>{' '}
                <strong className="text-slate-900 font-bold">{selectedSupplier.name}</strong>
                {selectedSupplier.company && (
                  <span className="text-slate-400 text-[11px] block">{selectedSupplier.company}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-rose-700 font-medium">Current Payable: </span>
                <strong className="text-rose-700 font-black font-mono text-sm ml-1">
                  {formatCurrency(selectedSupplier.balance || totalOutstanding || 0)}
                </strong>
              </div>
            </div>
          )}

          {/* Unpaid Purchase Bills Summary if any */}
          {unpaidPurchaseOrders.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-3.5 bg-white space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-rose-600" />
                  <span>Unpaid Purchase Bills ({unpaidPurchaseOrders.length})</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Auto-settled oldest bill first
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto divide-y divide-slate-100 text-xs">
                {unpaidPurchaseOrders.map((po) => {
                  const due = po.balanceDue !== undefined ? po.balanceDue : (po.totalAmount - (po.paidAmount || 0));
                  return (
                    <div key={po.id} className="py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">{po.orderNumber}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(po.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">Total: {formatCurrency(po.totalAmount)}</span>
                        <span className="font-mono font-bold text-rose-600">
                          Due: {formatCurrency(due)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                <span>Amount Paid (PKR) *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black font-mono text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Payment Mode</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['Cash', 'Bank Transfer', 'EasyPaisa', 'JazzCash', 'Cheque'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reference # and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Voucher / Ref #</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PV-2026-001 or Cheque # 8291"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Remarks / Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid against Inv # 1042 / Batch delivery"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Receipt / Cheque / Slip Image Attachment */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Attach Payment Receipt / Cheque Image</span>
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
                  <p className="font-bold text-slate-800">Receipt / Proof Attached</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Change Image</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/20 rounded-xl p-3 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">Click to attach photo of cheque or payment voucher</p>
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

        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            {amount > 0 ? (
              <span>Outflow of <strong className="text-rose-600 font-mono">{formatCurrency(amount)}</strong></span>
            ) : (
              <span>Enter voucher payment amount</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving || !amount || amount <= 0}
              onClick={handleSave}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-98 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Payment Out'}</span>
            </button>
          </div>
        </div>

      </div>

      {isAddPartyOpen && (
        <AddPartyModal
          isOpen={isAddPartyOpen}
          onClose={() => setIsAddPartyOpen(false)}
          onSaveSuccess={(newParty) => {
            setSuppliers(prev => [newParty, ...prev]);
            setSelectedSupplier(newParty);
            setSupplierSearchQuery(newParty.name);
            setIsAddPartyOpen(false);
          }}
          initialType="supplier"
        />
      )}
    </div>
  );
};
