import React, { useState } from 'react';
import { 
  Headphones, Phone, MessageSquare, Mail, Copy, Check, 
  Laptop, Clock, ShieldCheck, HelpCircle, FileText, ChevronRight,
  ExternalLink, Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const HelpSupportTab: React.FC = () => {
  const { business } = useAuth();
  const [copiedNum, setCopiedNum] = useState<string | null>(null);

  const phone1 = '03364585863';
  const phone2 = '03281302636';
  const email = 'support@mbinventra.com';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNum(key);
    setTimeout(() => setCopiedNum(null), 2000);
  };

  const guides = [
    {
      title: 'Printing Invoices & Thermal Receipts',
      desc: 'Set paper size to 80mm or A4, configure headers, company tax details, and terms.',
      tag: 'Print Setup'
    },
    {
      title: 'Multi-User Roles & Permissions',
      desc: 'Control staff access to Sales, Purchase, Financial Ledgers, and Reports.',
      tag: 'Security'
    },
    {
      title: 'Cloud & Offline Data Backups',
      desc: 'Download automated JSON snapshots or sync securely with your remote workstation.',
      tag: 'Data Safety'
    },
    {
      title: 'Barcode & SKU Generation',
      desc: 'Print professional custom labels for pharmaceutical items and surgical supplies.',
      tag: 'Inventory'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-12 animate-in fade-in select-none">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide uppercase">MBI Inventra Help & Support Desk</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Priority Care
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Direct hotline support for installation, billing queries, data recovery, and training.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${phone1}`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call Support
            </a>
            <a
              href={`https://wa.me/92${phone2.slice(1)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Official Helplines Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          Official Contact Numbers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Primary Helpline</span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-black">24/7 Helpline</span>
            </div>
            
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {phone1}
            </div>
            
            <p className="text-xs text-slate-500">
              Direct voice call for urgent technical assistance, setup & account queries.
            </p>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <a
                href={`tel:${phone1}`}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call Now
              </a>
              <a
                href={`https://wa.me/92${phone1.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <button
                onClick={() => copyToClipboard(phone1, 'p1')}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                title="Copy Number"
              >
                {copiedNum === 'p1' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Secondary Helpline / WhatsApp</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">Fast WhatsApp Response</span>
            </div>
            
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {phone2}
            </div>
            
            <p className="text-xs text-slate-500">
              Instant WhatsApp support for screenshots, database restores & training videos.
            </p>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <a
                href={`tel:${phone2}`}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call Now
              </a>
              <a
                href={`https://wa.me/92${phone2.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <button
                onClick={() => copyToClipboard(phone2, 'p2')}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                title="Copy Number"
              >
                {copiedNum === 'p2' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href={`mailto:${email}`}
          className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-slate-700"
        >
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Email Support</div>
            <div className="text-xs font-bold text-slate-900 truncate">{email}</div>
          </div>
        </a>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 text-slate-700">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Support Hours</div>
            <div className="text-xs font-bold text-slate-900">Mon - Sat: 9:00 AM - 9:00 PM</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 text-slate-700">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Laptop className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Remote Support</div>
            <div className="text-xs font-bold text-slate-900">AnyDesk / TeamViewer Ready</div>
          </div>
        </div>
      </div>

      {/* Quick Documentation & Guides */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          Quick Feature Guides & Documentation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {guides.map((g, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-200 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {g.tag}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">{g.title}</h4>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Authenticity badge */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">MBI Inventra Genuine Enterprise Suite</span> • Licensed for {business?.name || 'MBI Inventra Client'}
          </div>
        </div>
        <div className="text-[11px] font-semibold text-slate-400">
          v4.2.0 Stable
        </div>
      </div>

    </div>
  );
};
