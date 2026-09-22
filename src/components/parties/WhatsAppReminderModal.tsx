import React, { useState } from 'react';
import { X, MessageCircle, Copy, Check, Send, Sparkles, Building, Phone } from 'lucide-react';
import { Party } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  party,
}) => {
  const { business } = useAuth();
  const [templateType, setTemplateType] = useState<'gentle' | 'urgent' | 'bank' | 'urdu'>('gentle');
  const [customMsg, setCustomMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentBal = party.balance ?? party.openingBalance ?? 0;
  const absBal = Math.abs(currentBal).toLocaleString();
  const partyName = party.contactPerson || party.name;
  const bizName = business?.name || 'MBI Inventra';
  const bizPhone = business?.phone || '03364585863';
  const bizMobile = business?.mobile || '03281302636';

  // Pre-configured reminder templates
  const templates = {
    gentle: `Dear ${partyName},

This is a gentle greeting from ${bizName}. 
We hope you are doing well. 

This is a friendly reminder that your current outstanding ledger balance is Rs. ${absBal}.
Kindly arrange for payment at your earliest convenience.

If you have already made the payment, please ignore this notice or share the transaction receipt.

Thank you for your valued business!
${bizName}
Ph: ${bizPhone} / ${bizMobile}`,

    urgent: `⚠️ PAYMENT REMINDER - OVERDUE NOTICE

To: ${partyName}
From: ${bizName}

Dear Sir/Madam,
Your account balance of Rs. ${absBal} has exceeded the agreed credit period (${party.paymentTerms || 'Due on Receipt'}).

We kindly request you to clear the outstanding balance today to ensure uninterrupted supply and dispatch of items.

Thank you for your prompt cooperation.
Accounts Dept - ${bizName}
Contact: ${bizPhone} | WhatsApp: ${bizMobile}`,

    bank: `Dear ${partyName},

Please find below our official bank account details for settling your outstanding balance of Rs. ${absBal}:

🏛️ Bank Name: Meezan Bank Ltd
👤 Account Title: ${bizName}
🔢 Account / IBAN: PK36MEZN0001092837461902
📱 EasyPaisa / JazzCash: ${bizPhone}

Kindly share the deposit slip / screenshot after transfer so we can update your ledger immediately.

Thank you!
${bizName}`,

    urdu: `محترم ${partyName} صاحب،
السلام علیکم!

امید ہے آپ خیریت سے ہوں گے۔
${bizName} کی طرف سے آپ کے کھاتے کی بقایا رقم Rs. ${absBal} ہے۔
برائے مہربانی یہ رقم جلد از جلد ادا فرما دیں۔

اگر آپ رقم ادا کر چکے ہیں تو رسید شیئر فرما دیں تاکہ لیجر اپڈیٹ کیا جا سکے۔

شکریہ!
${bizName}
فون: ${bizPhone} / ${bizMobile}`
  };

  const activeMessage = customMsg || templates[templateType];

  const handleSelectTemplate = (type: 'gentle' | 'urgent' | 'bank' | 'urdu') => {
    setTemplateType(type);
    setCustomMsg(templates[type]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    let phoneClean = (party.phone || '').replace(/[^\d]/g, '');
    if (phoneClean.startsWith('0')) {
      phoneClean = '92' + phoneClean.slice(1);
    }
    const encoded = encodeURIComponent(activeMessage);
    window.open(`https://wa.me/${phoneClean}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                Send WhatsApp Reminder
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  Quick Chat
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                To: <strong className="text-slate-900">{party.name}</strong> ({party.phone || 'No Phone'})
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

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Outstanding Banner */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold">Outstanding Amount:</span>
            <span className="font-mono font-black text-sm text-emerald-700">
              Rs {absBal} {currentBal >= 0 ? '(Receivable)' : '(Payable)'}
            </span>
          </div>

          {/* Template Selection Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Message Template:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectTemplate('gentle')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  templateType === 'gentle'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Gentle Friendly
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('urgent')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  templateType === 'urgent'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Urgent Notice
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('bank')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  templateType === 'bank'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Bank Details
              </button>
              <button
                type="button"
                onClick={() => handleSelectTemplate('urdu')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  templateType === 'urdu'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                اردو پیغام (Urdu)
              </button>
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Message Preview (Editable):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              rows={9}
              value={customMsg || templates[templateType]}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="w-full p-3.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed bg-slate-50/50"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!party.phone}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                party.phone
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Open WhatsApp Chat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
