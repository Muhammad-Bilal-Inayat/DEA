import React, { useState, useRef } from 'react';
import { 
  X, MessageCircle, Copy, Check, FileText, Image as ImageIcon, 
  Download, Share2, Send, CheckCircle2, Loader2, Sparkles, Phone,
  Building2, Printer
} from 'lucide-react';
import { Invoice } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  captureElementAsPDF, 
  captureElementAsJPG, 
  triggerFileDownload, 
  shareFileOrFallback 
} from '../../lib/invoiceExport';
import { downloadSaleInvoicePDF } from '../../lib/pdfGenerator';
import { emitToast } from '../../contexts/ToastContext';

interface InvoiceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const InvoiceShareModal: React.FC<InvoiceShareModalProps> = ({
  isOpen,
  onClose,
  invoice
}) => {
  const { business } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'pdf' | 'jpg' | 'text'>('pdf');
  const [template, setTemplate] = useState<'english' | 'urdu'>('english');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (invoice?.customerPhone) {
      setPhoneNumber(invoice.customerPhone);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const businessName = business?.name || 'MBI INVENTRA';
  const businessAddress = business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore';
  const businessPhone = business?.phone || '03364585863';
  const businessTaxNo = business?.taxNumber || '4928172-9';
  const drugLicenseNo = business?.drugLicenseNo || 'DL-09-2024-MBI';

  const itemsList = invoice.items
    .map((item, idx) => `${idx + 1}. ${item.name} (${item.quantity} ${item.unit || 'Box'}) = Rs ${item.total.toLocaleString()}`)
    .join('\n');

  const englishMessage = `*Invoice #${invoice.invoiceNumber} from ${businessName}*
Date: ${invoice.date.slice(0, 10)}
Customer: ${invoice.customerName}

*Items:*
${itemsList}

*Subtotal:* Rs ${invoice.subTotal.toLocaleString()}
${invoice.discountAmount ? `*Discount:* -Rs ${invoice.discountAmount.toLocaleString()}\n` : ''}*Grand Total:* Rs ${invoice.grandTotal.toLocaleString()}
*Paid Amount:* Rs ${invoice.receivedAmount.toLocaleString()}
*Balance Due:* Rs ${invoice.balanceDue.toLocaleString()}

Thank you for choosing ${businessName}! For queries call: ${businessPhone}`;

  const urduMessage = `*سیلز بل نمبر #${invoice.invoiceNumber} - ${businessName}*
تاریخ: ${invoice.date.slice(0, 10)}
گاہک کا نام: ${invoice.customerName}

*تفصیل اشیاء:*
${itemsList}

*کل رقم (Total):* Rs ${invoice.grandTotal.toLocaleString()}
*وصول شدہ (Paid):* Rs ${invoice.receivedAmount.toLocaleString()}
*بقایا رقم (Balance Due):* Rs ${invoice.balanceDue.toLocaleString()}

شکریہ! ${businessName} - رابطہ: ${businessPhone}`;

  const messageText = template === 'english' ? englishMessage : urduMessage;

  const showStatus = (msg: string) => {
    setSuccessStatus(msg);
    setTimeout(() => setSuccessStatus(null), 4000);
  };

  // 1. Share as PDF (Native Web Share or WhatsApp with Download)
  const handleSharePDF = async () => {
    if (!invoicePreviewRef.current) return;
    setGenerating(true);
    try {
      const fileName = `Invoice_${invoice.invoiceNumber}_${invoice.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const { blob } = await captureElementAsPDF(invoicePreviewRef.current, fileName);
      
      const { sharedNatively } = await shareFileOrFallback(
        blob,
        fileName,
        `Invoice #${invoice.invoiceNumber} - ${businessName}`,
        messageText,
        phoneNumber
      );

      if (sharedNatively) {
        showStatus('PDF shared successfully!');
      } else {
        showStatus('PDF downloaded! Opening WhatsApp to share with recipient.');
      }
    } catch (err) {
      console.error('Failed to generate/share PDF:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // 2. Download PDF directly
  const handleDownloadPDF = async () => {
    if (!invoicePreviewRef.current) return;
    setGenerating(true);
    try {
      const cleanCust = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCust}.pdf`;
      const { blob } = await captureElementAsPDF(invoicePreviewRef.current, fileName, false);
      triggerFileDownload(blob, fileName);
      showStatus('PDF downloaded to your device!');
      emitToast('PDF Invoice downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download visual PDF, attempting vector PDF fallback:', err);
      try {
        downloadSaleInvoicePDF(invoice, {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
          taxNumber: businessTaxNo,
          drugLicenseNo: drugLicenseNo
        });
        showStatus('Vector PDF invoice downloaded!');
        emitToast('PDF Invoice downloaded successfully', 'success');
      } catch (fallbackErr) {
        console.error('Failed to generate fallback PDF:', fallbackErr);
        emitToast('Error downloading PDF', 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  // 3. Share as JPG Image (Native Web Share or WhatsApp with Download)
  const handleShareJPG = async () => {
    if (!invoicePreviewRef.current) return;
    setGenerating(true);
    try {
      const cleanCust = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCust}.jpg`;
      const blob = await captureElementAsJPG(invoicePreviewRef.current);
      
      const { sharedNatively } = await shareFileOrFallback(
        blob,
        fileName,
        `Invoice #${invoice.invoiceNumber} Image - ${businessName}`,
        messageText,
        phoneNumber
      );

      if (sharedNatively) {
        showStatus('Invoice image shared successfully!');
        emitToast('Invoice image shared', 'success');
      } else {
        showStatus('JPG image downloaded! Opening WhatsApp to share with recipient.');
        emitToast('JPG downloaded & WhatsApp opened', 'info');
      }
    } catch (err) {
      console.error('Failed to generate/share JPG:', err);
      emitToast('Error generating JPG image', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // 4. Download JPG directly
  const handleDownloadJPG = async () => {
    if (!invoicePreviewRef.current) return;
    setGenerating(true);
    try {
      const cleanCust = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCust}.jpg`;
      const blob = await captureElementAsJPG(invoicePreviewRef.current);
      triggerFileDownload(blob, fileName);
      showStatus('JPG image downloaded to your device!');
      emitToast('JPG Image downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download JPG:', err);
      emitToast('Error downloading JPG image', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // 5. Send Plain WhatsApp Text
  const handleSendWhatsAppText = () => {
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }
    const encoded = encodeURIComponent(messageText);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-black text-sm">Share Invoice #{invoice.invoiceNumber}</span>
              <span className="block text-[11px] text-slate-400">PDF & JPG high-definition sharing for WhatsApp & Mobile</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successStatus && (
          <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 justify-center animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successStatus}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50">
          
          {/* Left Column: Share Controls & Format Selection */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Recipient Phone Number */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Recipient WhatsApp / Mobile Number:</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 03216549608 or 03001234567"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Customer: {invoice.customerName}
                </span>
              </div>

              {/* Format Tabs (PDF / JPG / Text) */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    activeTab === 'pdf'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Document</span>
                </button>

                <button
                  onClick={() => setActiveTab('jpg')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    activeTab === 'jpg'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>JPG Image</span>
                </button>

                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                    activeTab === 'text'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Text Message</span>
                </button>
              </div>

              {/* PDF Format Actions */}
              {activeTab === 'pdf' && (
                <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-rose-800">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-xs">A4 PDF Tax Invoice</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Generates a high-quality, printable PDF file containing business branding, items list, tax/discount breakup, and signature footer.
                  </p>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleSharePDF}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing PDF...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Share PDF via WhatsApp / Apps</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl font-bold text-xs border border-slate-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download PDF File (.pdf)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* JPG Format Actions */}
              {activeTab === 'jpg' && (
                <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs">High-Res JPG Bill Image</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Captures a crystal-clear image of the bill. Perfect for customers who open images instantly on WhatsApp without downloading document files.
                  </p>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleShareJPG}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition-all"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Rendering High-Res JPG...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Share JPG via WhatsApp / Apps</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadJPG}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl font-bold text-xs border border-slate-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download JPG Image (.jpg)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Text Format Actions */}
              {activeTab === 'text' && (
                <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTemplate('english')}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border ${
                        template === 'english'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setTemplate('urdu')}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border ${
                        template === 'urdu'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      اردو / Roman
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <textarea
                      readOnly
                      rows={6}
                      value={messageText}
                      className="w-full bg-transparent text-[11px] text-slate-700 font-mono resize-none focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyText}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    <button
                      onClick={handleSendWhatsAppText}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Tip */}
            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip:</strong> Selecting <strong>JPG Image</strong> or <strong>PDF</strong> creates a high-resolution branded copy with your pharmacy name & license.
              </span>
            </div>
          </div>

          {/* Right Column: Live Printable & Capturable Invoice Layout */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 mb-2 self-start flex items-center gap-1.5">
              <span>Invoice Preview (Export Target):</span>
            </span>

            {/* THIS IS THE DOM ELEMENT CAPTURED FOR PDF AND JPG EXPORT */}
            <div className="w-full overflow-x-auto p-1 flex justify-center">
              <div 
                ref={invoicePreviewRef}
                id="printable-invoice-capture"
                className="bg-white border border-slate-300 p-6 sm:p-7 rounded-xl shadow-xs w-full max-w-[540px] text-slate-900 text-xs font-sans select-none"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                      {businessName}
                    </h1>
                    <p className="text-[10px] text-slate-600 mt-1 leading-tight">{businessAddress}</p>
                    <p className="text-[10px] text-slate-600">
                      Phone: <span className="font-semibold">{businessPhone}</span>
                      {businessTaxNo && <span className="ml-2">NTN: <span className="font-semibold">{businessTaxNo}</span></span>}
                    </p>
                    {drugLicenseNo && (
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">Drug Lic #: {drugLicenseNo}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-900 mb-1">
                      {invoice.transactionType === 'Estimate' ? 'Estimate / Quotation' :
                       invoice.transactionType === 'Sale Order' ? 'Sale Order' :
                       invoice.transactionType === 'Delivery Challan' ? 'Delivery Challan' :
                       invoice.transactionType === 'Sale Return' ? 'Sale Return / Cr. Note' :
                       'Tax Invoice (سیلز بل)'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-800">
                      Doc #: <span className="font-mono text-slate-950 font-black">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Date: {invoice.date.slice(0, 10)}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Payment: <span className="font-semibold text-blue-700">{invoice.paymentType || 'Cash'}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200 text-[11px]">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[9px] block">
                      Billed To (خریدار):
                    </span>
                    <div className="font-bold text-slate-900">{invoice.customerName}</div>
                    {invoice.customerPhone && (
                      <div className="text-slate-600 text-[10px]">Phone: {invoice.customerPhone}</div>
                    )}
                    {invoice.customerAddress && (
                      <div className="text-slate-500 text-[10px] truncate">{invoice.customerAddress}</div>
                    )}
                  </div>

                  <div className="text-right flex flex-col justify-end">
                    <div className="text-[10px] text-slate-600">
                      Status: <strong className={invoice.balanceDue > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {invoice.balanceDue > 0 ? 'Unpaid / Credit' : 'Paid in Full'}
                      </strong>
                    </div>
                    {invoice.balanceDue > 0 && (
                      <div className="text-[10px] text-slate-600">
                        Balance Due: <strong className="text-rose-700 font-mono font-bold">Rs {invoice.balanceDue.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="mt-3">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-[10px] font-bold text-slate-700">
                        <th className="py-1 px-1.5 w-6">#</th>
                        <th className="py-1 px-1.5">Item Description</th>
                        <th className="py-1 px-1.5 text-center">Batch</th>
                        <th className="py-1 px-1.5 text-right">Qty</th>
                        <th className="py-1 px-1.5 text-right">Rate</th>
                        <th className="py-1 px-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1 px-1.5 text-slate-500 text-[10px]">{idx + 1}</td>
                          <td className="py-1 px-1.5 font-semibold text-slate-900">
                            {item.name}
                          </td>
                          <td className="py-1 px-1.5 text-center text-slate-500 font-mono text-[10px]">
                            {item.batchNumber || '-'}
                          </td>
                          <td className="py-1 px-1.5 text-right font-mono font-semibold">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-1 px-1.5 text-right font-mono text-slate-600">
                            {(item.sellingPrice || item.pricePerUnit || 0).toLocaleString()}
                          </td>
                          <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-900">
                            {item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Totals */}
                <div className="border-t-2 border-slate-900 mt-4 pt-3 flex justify-between items-start text-[11px]">
                  <div className="text-[10px] text-slate-500 max-w-[200px]">
                    {invoice.description && (
                      <p className="italic text-slate-600 mb-1">Notes: {invoice.description}</p>
                    )}
                    <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                    <p>1. Goods once sold will not be returned without bill.</p>
                    <p>2. Keep medicines below 25°C in dry place.</p>
                  </div>

                  <div className="w-48 space-y-1 text-right">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-semibold">Rs {invoice.subTotal.toLocaleString()}</span>
                    </div>

                    {invoice.discountAmount ? (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount ({invoice.discountPercentage || 0}%):</span>
                        <span className="font-mono font-semibold">-Rs {invoice.discountAmount.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {invoice.taxAmount ? (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / GST:</span>
                        <span className="font-mono font-semibold">+Rs {invoice.taxAmount.toLocaleString()}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-300 pt-1">
                      <span>Grand Total:</span>
                      <span className="font-mono text-sm font-black">Rs {invoice.grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-emerald-800 text-[10px] font-semibold">
                      <span>Amount Paid:</span>
                      <span className="font-mono font-bold">Rs {(invoice.receivedAmount || 0).toLocaleString()}</span>
                    </div>

                    {invoice.balanceDue > 0 && (
                      <div className="flex justify-between text-rose-700 text-xs font-black border-t border-rose-200 pt-1">
                        <span>Balance Due:</span>
                        <span className="font-mono font-black">Rs {invoice.balanceDue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="flex justify-between items-end mt-6 pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-400">
                  <div>
                    <span>Thank you for your business!</span>
                  </div>
                  <div className="text-center">
                    <div className="w-28 border-b border-slate-400 mb-1"></div>
                    <span>Authorized Signature</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
