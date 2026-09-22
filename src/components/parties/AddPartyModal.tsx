import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Building, Phone, Mail, MapPin, DollarSign, 
  ShieldAlert, FileText, Check, Landmark, CreditCard, AlignLeft 
} from 'lucide-react';
import { Party } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (party: Party) => Promise<void> | void;
  onSaveSuccess?: (party: Party) => void;
  editingParty?: Party | null;
  initialType?: string;
}

export const AddPartyModal: React.FC<AddPartyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveSuccess,
  editingParty,
  initialType
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'financial' | 'bank'>('basic');
  const [formData, setFormData] = useState<Partial<Party>>({
    name: '',
    partyType: 'Customer',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: 'Kot Momin',
    openingBalance: 0,
    creditLimit: 0,
    taxNumber: '',
    paymentTerms: 'Due on Receipt',
    bankName: '',
    bankAccountTitle: '',
    bankAccountNumber: '',
    notes: '',
  });

  const [balanceDirection, setBalanceDirection] = useState<'To Receive' | 'To Pay'>('To Receive');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingParty) {
      setFormData({
        ...editingParty,
      });
      setBalanceDirection((editingParty.balance || 0) < 0 ? 'To Pay' : 'To Receive');
    } else {
      setFormData({
        name: '',
        partyType: initialType && initialType.toLowerCase() === 'supplier' ? 'Supplier' : 'Customer',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        city: 'Kot Momin',
        openingBalance: 0,
        creditLimit: 0,
        taxNumber: '',
        paymentTerms: 'Due on Receipt',
        bankName: '',
        bankAccountTitle: '',
        bankAccountNumber: '',
        notes: '',
      });
      setBalanceDirection('To Receive');
    }
    setActiveTab('basic');
    setError(null);
  }, [editingParty, isOpen, initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setActiveTab('basic');
      setError('Party / Business Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const rawBal = Number(formData.openingBalance) || 0;
      const finalBal = balanceDirection === 'To Pay' ? -Math.abs(rawBal) : Math.abs(rawBal);

      const partyToSave: Party = {
        id: editingParty ? editingParty.id : uuidv4(),
        name: formData.name.trim(),
        partyType: formData.partyType || 'Customer',
        contactPerson: formData.contactPerson?.trim() || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        address: formData.address?.trim() || '',
        city: formData.city?.trim() || 'Kot Momin',
        openingBalance: finalBal,
        balance: editingParty?.balance !== undefined ? editingParty.balance : finalBal,
        creditLimit: Number(formData.creditLimit) || 0,
        taxNumber: formData.taxNumber?.trim() || '',
        paymentTerms: formData.paymentTerms || 'Due on Receipt',
        bankName: formData.bankName?.trim() || '',
        bankAccountTitle: formData.bankAccountTitle?.trim() || '',
        bankAccountNumber: formData.bankAccountNumber?.trim() || '',
        notes: formData.notes?.trim() || '',
        createdAt: editingParty ? editingParty.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(partyToSave);
      }
      if (onSaveSuccess) {
        onSaveSuccess(partyToSave);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save party details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
              formData.partyType === 'Supplier' 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-orange-100 text-orange-600'
            }`}>
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingParty ? 'Edit Party Account' : 'Register New Party (Customer / Supplier)'}
              </h2>
              <p className="text-xs text-slate-500">Add contact details, opening ledger balance, and credit terms</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'basic'
                ? 'bg-white text-slate-900 border-orange-500 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            1. Profile & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'financial'
                ? 'bg-white text-slate-900 border-orange-500 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            2. Balance & Credit Limit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'bank'
                ? 'bg-white text-slate-900 border-orange-500 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            3. Bank & Notes
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC PROFILE */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Party Type Radio Selection */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Account Type:</span>
                <div className="flex items-center gap-4">
                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    formData.partyType === 'Customer'
                      ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="partyType"
                      value="Customer"
                      checked={formData.partyType === 'Customer'}
                      onChange={() => setFormData({ ...formData, partyType: 'Customer' })}
                      className="hidden"
                    />
                    <span>Customer / Clinic / Pharmacy (گاہک)</span>
                  </label>

                  <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                    formData.partyType === 'Supplier'
                      ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="partyType"
                      value="Supplier"
                      checked={formData.partyType === 'Supplier'}
                      onChange={() => setFormData({ ...formData, partyType: 'Supplier' })}
                      className="hidden"
                    />
                    <span>Supplier / Distributor (سپلائر)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Party Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Party / Business Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Saleem Medical Store / Shifa Hospital"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Person Name
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Dr. Tariq / Muhammad Saleem"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="03216549608"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="email"
                      placeholder="pharmacy@domain.com"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City / Tehsil
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Kot Momin, Sargodha, Bhalwal"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Street Address / Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="Main Bazar, Opposite DHQ Hospital, Kot Momin"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: FINANCIALS & CREDIT */}
          {activeTab === 'financial' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Opening Balance */}
                <div className="md:col-span-2 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Opening Ledger Balance (ابتدائی بقایا رقم)
                  </label>
                  <p className="text-[11px] text-amber-700 mb-2">
                    Set the starting amount when registering existing accounts.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">Rs</span>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0.00"
                        value={formData.openingBalance ?? ''}
                        onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <select
                      value={balanceDirection}
                      onChange={(e: any) => setBalanceDirection(e.target.value)}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-800 focus:outline-none"
                    >
                      <option value="To Receive">You'll Receive (آپ نے لینا ہے)</option>
                      <option value="To Pay">You'll Pay (آپ نے دینا ہے)</option>
                    </select>
                  </div>
                </div>

                {/* Credit Limit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Credit Limit (ادھار کی حد) PKR
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 font-mono">Rs</span>
                    <input 
                      type="number"
                      min="0"
                      placeholder="e.g. 150000"
                      value={formData.creditLimit ?? ''}
                      onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Maximum allowed credit before warning is triggered.</p>
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Terms / Credit Period
                  </label>
                  <select
                    value={formData.paymentTerms || 'Due on Receipt'}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Due on Receipt">Due on Receipt (Cash)</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days (Monthly)</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                {/* NTN / GST */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    FBR NTN / GST Registration Number
                  </label>
                  <input 
                    type="text"
                    placeholder="4012398-7"
                    value={formData.taxNumber || ''}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: BANK & NOTES */}
          {activeTab === 'bank' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <div className="relative">
                    <Landmark className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="e.g. Meezan Bank / HBL / MCB"
                      value={formData.bankName || ''}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Bank Account Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Title / Beneficiary
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Saleem Medical Store"
                    value={formData.bankAccountTitle || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccountTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Account Number / IBAN */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Account Number / IBAN
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="PK36MEZN0001092837461902"
                      value={formData.bankAccountNumber || ''}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Internal Remarks & Special Notes
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. Delivers every Tuesday morning, 5% institutional discount applies"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
              {activeTab !== 'basic' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'bank' ? 'financial' : 'basic')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ← Back
                </button>
              )}
              {activeTab !== 'bank' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'basic' ? 'financial' : 'bank')}
                  className="px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                >
                  Next Step →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 bg-[#f97316] hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : (editingParty ? 'Update Party' : 'Save Account')}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
