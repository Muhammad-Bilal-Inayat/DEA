import React, { useState, useEffect } from 'react';
import { 
  X, Phone, MessageSquare, Mail, Globe, ShieldCheck, 
  Clock, MapPin, Copy, Check, Headphones, Laptop, 
  HelpCircle, ChevronRight, FileText, Video, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBrandContact } from '../../lib/siteCmsService';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const { business } = useAuth();
  const [copiedNum, setCopiedNum] = useState<string | null>(null);
  const [contact, setContact] = useState(getBrandContact);

  useEffect(() => {
    const handleUpdate = () => {
      setContact(getBrandContact());
    };
    window.addEventListener('mbi-site-cms-updated', handleUpdate);
    return () => {
      window.removeEventListener('mbi-site-cms-updated', handleUpdate);
    };
  }, []);

  if (!isOpen) return null;

  const phone1 = contact.phone1;
  const phone2 = contact.phone2;
  const email = contact.email;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNum(key);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  const faqs = [
    {
      q: 'How to setup thermal or A4 printer for sales invoices?',
      a: 'Go to Settings > Print tab. Choose between Thermal (2"/3" 80mm) or Standard A4 formats, customize header titles, company logo, footer signature and print preview.'
    },
    {
      q: 'How do I take offline backup and export my data?',
      a: 'Click on Backup & Restore from the sidebar or settings. Click "Download Backup (.json)" to save an encrypted copy of all invoices, parties, items, and accounts to your device.'
    },
    {
      q: 'How to add multi-user access and assign roles?',
      a: 'Open Sync & Share or Settings > User Management. You can invite staff members and assign roles like Cashier, Salesman, Accountant, or Stock Manager with strict module permissions.'
    },
    {
      q: 'How does barcode scanning work during billing?',
      a: 'In the Add Sale modal, simply scan any product barcode using a handheld USB/Bluetooth scanner or enter the item code. The item will automatically add to the active cart.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in select-none">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-[#0f172a] text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide uppercase">MBI Inventra Help & Support</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Live Helpline
                </span>
              </div>
              <p className="text-xs text-slate-300">Official Customer Care & Technical Assistance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto bg-[#f8fafc]">
          
          {/* Main Direct Call Numbers Banner */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              Direct Official Helplines
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Phone 1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Primary Helpline</span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-black">24/7 Available</span>
                </div>
                <div className="text-lg font-black text-slate-900 tracking-tight mb-3">
                  {phone1}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${phone1}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Support
                  </a>
                  <a
                    href={`https://wa.me/92${phone1.slice(1)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    title="Open WhatsApp Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <button
                    onClick={() => copyToClipboard(phone1, 'p1')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                    title="Copy Number"
                  >
                    {copiedNum === 'p1' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone 2 */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Secondary Helpline / WhatsApp</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">Fast Reply</span>
                </div>
                <div className="text-lg font-black text-slate-900 tracking-tight mb-3">
                  {phone2}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${phone2}`}
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Support
                  </a>
                  <a
                    href={`https://wa.me/92${phone2.slice(1)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    title="Open WhatsApp Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                  <button
                    onClick={() => copyToClipboard(phone2, 'p2')}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors"
                    title="Copy Number"
                  >
                    {copiedNum === 'p2' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={`mailto:${email}`}
              className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-slate-700"
            >
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Email Support</div>
                <div className="text-xs font-bold text-slate-800 truncate">{email}</div>
              </div>
            </a>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-700">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Working Hours</div>
                <div className="text-xs font-bold text-slate-800">{contact.officeHours}</div>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-700">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Laptop className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase">Remote Support</div>
                <div className="text-xs font-bold text-slate-800">AnyDesk / TeamViewer</div>
              </div>
            </div>
          </div>

          {/* Quick FAQs */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              Frequently Asked Questions
            </h3>

            <div className="space-y-2.5">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    {faq.q}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>MBI Inventra Verified Technical Support</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
