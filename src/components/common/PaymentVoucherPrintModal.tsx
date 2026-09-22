import React, { useRef, useEffect } from 'react';
import { 
  X, Printer, Share2, Building2, Phone, Calendar, 
  CreditCard, CheckCircle2, ArrowDownLeft, ArrowUpRight, 
  MapPin, FileText, UserCheck, ShieldCheck
} from 'lucide-react';
import { PartyPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../lib/utils';

// Helper to convert numbers to words (Rupees)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const rounded = Math.round(num);
  return inWords(rounded) + ' Rupees Only';
}

interface PaymentVoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PartyPayment | null;
  partyPhone?: string;
  partyAddress?: string;
}

export const PaymentVoucherPrintModal: React.FC<PaymentVoucherPrintModalProps> = ({
  isOpen,
  onClose,
  payment,
  partyPhone,
  partyAddress
}) => {
  const { business } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payment) return null;

  const isPaymentIn = payment.type === 'PAYMENT_IN' || (payment as any).paymentType === 'In' || (payment as any).type === 'Payment Received';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const phone = partyPhone || (payment as any).phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const voucherNo = payment.referenceNumber || `RCT-${payment.id.slice(0, 6).toUpperCase()}`;
    const dateStr = formatDate(payment.date);
    const amountStr = `Rs ${payment.amount.toLocaleString()}`;

    const text = isPaymentIn
      ? `*${business?.name || 'MBI PHARMACY & HEALTHCARE'}*\n` +
        `*Official Payment Receipt (وصولی رسید)*\n` +
        `--------------------------------\n` +
        `*Receipt #:* ${voucherNo}\n` +
        `*Date:* ${dateStr}\n` +
        `*Received From:* ${payment.partyName}\n` +
        `*Amount Received:* ${amountStr}\n` +
        `*Payment Mode:* ${payment.paymentMode || 'Cash'}\n` +
        (payment.notes ? `*Remarks:* ${payment.notes}\n` : '') +
        `--------------------------------\n` +
        `Thank you for your valued business!\n` +
        `*Support:* ${business?.phone || '0336-4585863'}`
      : `*${business?.name || 'MBI PHARMACY & HEALTHCARE'}*\n` +
        `*Payment Voucher (ادائیگی واؤچر)*\n` +
        `--------------------------------\n` +
        `*Voucher #:* ${voucherNo}\n` +
        `*Date:* ${dateStr}\n` +
        `*Paid To:* ${payment.partyName}\n` +
        `*Amount Paid:* ${amountStr}\n` +
        `*Payment Mode:* ${payment.paymentMode || 'Cash'}\n` +
        (payment.notes ? `*Remarks:* ${payment.notes}\n` : '') +
        `--------------------------------\n` +
        `Payment processed successfully.\n` +
        `*Contact:* ${business?.phone || '0336-4585863'}`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const businessName = business?.name || 'MBI INVENTRA PHARMACY';
  const businessAddress = business?.address || 'Main Commercial Market, Kot Momin / Sargodha';
  const businessPhone = business?.phone || '0336-4585863';
  const voucherNumber = payment.referenceNumber || (isPaymentIn ? `RCT-${payment.id.slice(0, 6).toUpperCase()}` : `PV-${payment.id.slice(0, 6).toUpperCase()}`);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (Hidden on print) */}
        <div className={`p-4 text-white flex justify-between items-center print:hidden flex-shrink-0 ${
          isPaymentIn ? 'bg-emerald-800' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${
              isPaymentIn ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {isPaymentIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight">
                {isPaymentIn ? 'Payment Received Receipt (وصولی رسید)' : 'Payment Out Voucher (ادائیگی واؤچر)'}
              </h2>
              <p className="text-[11px] text-emerald-200/90 font-mono">
                Voucher #{voucherNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Share receipt on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans text-xs">
          
          {/* Business Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                {businessName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">{businessAddress}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Contact: {businessPhone}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                isPaymentIn 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {isPaymentIn ? 'Receipt Voucher (وصولی)' : 'Payment Voucher (ادائیگی)'}
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 mt-1.5">
                Voucher #: <span className="text-slate-900">{voucherNumber}</span>
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Date: {formatDate(payment.date)}
              </p>
            </div>
          </div>

          {/* Party & Voucher Metadata Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                {isPaymentIn ? 'Received With Thanks From:' : 'Paid To / Beneficiary:'}
              </span>
              <h3 className="text-sm font-black text-slate-900">{payment.partyName}</h3>
              {partyPhone && (
                <p className="text-xs text-slate-600 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {partyPhone}
                </p>
              )}
              {partyAddress && (
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {partyAddress}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:text-right">
              <div>
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Payment Mode:</span>
                <span className="ml-2 font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {payment.paymentMode || 'Cash'}
                </span>
              </div>
              {payment.referenceNumber && (
                <div>
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Ref / Cheque #:</span>
                  <span className="ml-2 font-mono font-bold text-slate-800">{payment.referenceNumber}</span>
                </div>
              )}
              <div className="text-[11px] text-slate-500">
                Created: {new Date(payment.createdAt || payment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className={`p-5 rounded-2xl border-2 mb-6 ${
            isPaymentIn 
              ? 'bg-emerald-50/60 border-emerald-300' 
              : 'bg-rose-50/60 border-rose-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                  {isPaymentIn ? 'Total Amount Received' : 'Total Amount Disbursed'}
                </span>
                <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5 ${
                  isPaymentIn ? 'text-emerald-800' : 'text-rose-800'
                }`}>
                  Rs {payment.amount.toLocaleString()}
                </div>
              </div>
              <div className="sm:text-right max-w-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Words:</span>
                <p className="text-xs font-bold text-slate-800 italic">
                  {numberToWords(payment.amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Remarks / Notes */}
          {payment.notes && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-6">
              <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                Remarks / Narration:
              </span>
              <p className="text-xs text-slate-700 italic font-medium">"{payment.notes}"</p>
            </div>
          )}

          {/* Attached Slip / Proof / Cheque */}
          {payment.imageAttachment && (
            <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                Attached Receipt / Cheque / Slip:
              </span>
              <div className="flex items-center justify-center bg-white p-2 border border-slate-200 rounded-xl overflow-hidden">
                <img 
                  src={payment.imageAttachment} 
                  alt="Receipt / Cheque Proof" 
                  referrerPolicy="no-referrer"
                  className="max-h-56 object-contain rounded-lg shadow-2xs" 
                />
              </div>
            </div>
          )}

          {/* Signatures & Stamp */}
          <div className="pt-10 grid grid-cols-2 gap-8 border-t border-slate-200 text-center mt-8">
            <div>
              <div className="w-36 h-10 border-b border-dashed border-slate-400 mx-auto"></div>
              <p className="text-[11px] font-bold text-slate-700 mt-1.5 uppercase">Prepared / Cashier By</p>
            </div>
            <div>
              <div className="w-36 h-10 border-b border-dashed border-slate-400 mx-auto"></div>
              <p className="text-[11px] font-bold text-slate-700 mt-1.5 uppercase">
                {isPaymentIn ? 'Customer Signature' : 'Authorized Signatory / Stamp'}
              </p>
            </div>
          </div>

          {/* Permanent Mandatory System Branding Footer */}
          <div className="mt-6 pt-3 border-t-2 border-slate-300 text-center font-bold text-slate-900 text-xs space-y-0.5 tracking-wide uppercase">
            <p className="text-sm font-black text-slate-900">THANKS FOR SHOPPING!</p>
            <p className="text-xs font-black text-slate-800">DEVELOPED BY MBI INVENTRA</p>
            <p className="text-xs font-black text-slate-800">M BILAL INAYAT 0328-1302636</p>
          </div>

        </div>
      </div>
    </div>
  );
};
