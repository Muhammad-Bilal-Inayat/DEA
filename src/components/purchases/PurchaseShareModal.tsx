import React, { useState, useRef } from 'react';
import { 
  X, MessageCircle, Copy, Check, FileText, Image as ImageIcon, 
  Download, Share2, Send, CheckCircle2, Loader2, Phone,
  Building2, Printer
} from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  captureElementAsPDF, 
  captureElementAsJPG, 
  triggerFileDownload, 
  shareFileOrFallback 
} from '../../lib/invoiceExport';
import { downloadPurchaseBillPDF } from '../../lib/pdfGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';

interface PurchaseShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
}

export const PurchaseShareModal: React.FC<PurchaseShareModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { business } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'pdf' | 'jpg' | 'text'>('pdf');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const businessName = business?.name || 'MBI INVENTRA';
  const businessAddress = business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore';
  const businessPhone = business?.phone || '03364585863';
  const businessTaxNo = business?.taxNumber || '4928172-9';

  const itemsList = order.items
    .map((item, idx) => `${idx + 1}. ${item.name} (${item.quantity} ${item.unit || 'PCS'}) = Rs ${item.total.toLocaleString()}`)
    .join('\n');

  const shareTextMessage = `*Purchase Bill #${order.billNumber || order.poNumber} - ${businessName}*
Date: ${formatDate(order.date)}
Supplier: ${order.supplierName || order.partyName}

*Items:*
${itemsList}

*Grand Total:* Rs ${order.totalAmount.toLocaleString()}
*Paid Amount:* Rs ${(order.paidAmount !== undefined ? order.paidAmount : order.totalAmount).toLocaleString()}
*Balance Due:* Rs ${(order.balanceDue || 0).toLocaleString()}

${businessName} - Contact: ${businessPhone}`;

  const showStatus = (msg: string) => {
    setSuccessStatus(msg);
    setTimeout(() => setSuccessStatus(null), 4000);
  };

  // 1. Share as PDF
  const handleSharePDF = async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      const fileName = `Purchase_Bill_${order.billNumber || order.poNumber}_${(order.supplierName || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const { blob } = await captureElementAsPDF(previewRef.current, fileName);
      
      const { sharedNatively } = await shareFileOrFallback(
        blob,
        fileName,
        `Purchase Bill #${order.billNumber || order.poNumber} - ${businessName}`,
        shareTextMessage,
        phoneNumber
      );

      showStatus(sharedNatively ? 'Shared via device menu!' : 'PDF downloaded! Opening WhatsApp...');
    } catch (err) {
      console.error('Failed to generate visual PDF, falling back to vector PDF:', err);
      try {
        downloadPurchaseBillPDF(order, {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
        });
        showStatus('Vector PDF downloaded to your device!');
      } catch (fallbackErr) {
        console.error('Fallback PDF failed:', fallbackErr);
        alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // 2. Share as JPG
  const handleShareJPG = async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      const fileName = `Purchase_Bill_${order.billNumber || order.poNumber}_${(order.supplierName || 'Supplier').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      const blob = await captureElementAsJPG(previewRef.current);

      const { sharedNatively } = await shareFileOrFallback(
        blob,
        fileName,
        `Purchase Bill #${order.billNumber || order.poNumber} - ${businessName}`,
        shareTextMessage,
        phoneNumber
      );

      showStatus(sharedNatively ? 'Image shared via device menu!' : 'JPG image downloaded! Opening WhatsApp...');
    } catch (err) {
      console.error(err);
      alert('Failed to generate JPG image.');
    } finally {
      setGenerating(false);
    }
  };

  // 3. Copy Text Summary
  const handleCopyText = () => {
    navigator.clipboard.writeText(shareTextMessage);
    setCopied(true);
    showStatus('Text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // 4. Direct WhatsApp Message
  const handleSendWhatsAppText = () => {
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareTextMessage)}` 
      : `https://wa.me/?text=${encodeURIComponent(shareTextMessage)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Share Purchase Bill #{order.billNumber || order.poNumber}
              </h2>
              <p className="text-xs text-slate-500">Export as PDF, JPG, or send to WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'pdf' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>PDF Document</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jpg')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'jpg' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span>JPG Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'text' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-green-500" />
            <span>WhatsApp Text</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50 flex-1">
          
          {/* Status Message */}
          {successStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successStatus}</span>
            </div>
          )}

          {/* WhatsApp Phone Number Input */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier / WhatsApp Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 0300-1234567"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSendWhatsAppText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Visual Bill Preview (The DOM element captured for PDF / JPG) */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4" ref={previewRef}>
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{businessName}</h3>
                <p className="text-[11px] text-slate-500">{businessAddress}</p>
                <p className="text-[11px] text-slate-500">Phone: {businessPhone}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded uppercase">
                  Purchase Bill
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  #{order.billNumber || order.poNumber}
                </p>
                <p className="text-[11px] text-slate-500">{formatDate(order.date)}</p>
              </div>
            </div>

            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-100 flex justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Supplier</span>
                <div className="font-bold text-slate-800">{order.supplierName || order.partyName}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Payment</span>
                <div className="font-semibold text-slate-700">{order.paymentType || 'Cash'}</div>
              </div>
            </div>

            {/* Items */}
            <div className="border border-slate-100 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="px-2 py-1.5">Item</th>
                    <th className="px-2 py-1.5 text-center">Qty</th>
                    <th className="px-2 py-1.5 text-right">Price</th>
                    <th className="px-2 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5 font-medium text-slate-800">{it.name}</td>
                      <td className="px-2 py-1.5 text-center">{it.quantity} {it.unit || ''}</td>
                      <td className="px-2 py-1.5 text-right">{formatCurrency(it.purchasePrice)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <div className="w-56 space-y-1 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid:</span>
                  <span>{formatCurrency(order.paidAmount !== undefined ? order.paidAmount : order.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 border-t border-slate-100 pt-0.5">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(order.balanceDue || 0)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <div className="flex items-center gap-2">
            {activeTab === 'pdf' && (
              <button
                type="button"
                disabled={generating}
                onClick={handleSharePDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Share / Download PDF</span>
              </button>
            )}

            {activeTab === 'jpg' && (
              <button
                type="button"
                disabled={generating}
                onClick={handleShareJPG}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <span>Share / Download JPG</span>
              </button>
            )}

            {activeTab === 'text' && (
              <button
                type="button"
                onClick={handleSendWhatsAppText}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send to WhatsApp</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
