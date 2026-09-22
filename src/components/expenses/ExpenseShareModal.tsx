import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Mail } from 'lucide-react';
import { Expense } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
}

export const ExpenseShareModal: React.FC<Props> = ({ isOpen, onClose, expense }) => {
  const { business } = useAuth();
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  if (!isOpen || !expense) return null;

  const shareText = `*EXPENSE VOUCHER #${expense.expenseNumber || 'EXP'}*
🏢 *${business?.name || 'MBI INVENTRA'}*
📅 Date: ${expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
📁 Category: *${expense.category}* (${expense.expenseType || 'Direct Expense'})
💳 Payment Mode: *${expense.paymentType || 'Cash'}*
${expense.partyName ? `👤 Paid To: ${expense.partyName}\n` : ''}💰 *Total Amount: ${formatCurrency(expense.amount)}*
${expense.description ? `📝 Remarks: ${expense.description}\n` : ''}
_Generated from MBI Inventra ERP_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Expense Voucher #${expense.expenseNumber || 'EXP'} - ${expense.category}`);
    const body = encodeURIComponent(shareText);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#1e293b] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Share Expense Voucher</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              WhatsApp Mobile Number (Optional):
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 03001234567 or 923001234567"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Voucher Summary Text:
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-700">
              {shareText}
            </div>
          </div>

          <button
            onClick={handleCopy}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Voucher Text'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
