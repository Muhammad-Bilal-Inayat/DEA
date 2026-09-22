import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Printer, Download, Share2, Building2, CheckCircle2, 
  FileText, Image as ImageIcon, Loader2, QrCode, Landmark,
  SlidersHorizontal, Palette, Check, Eye, Sliders, ChevronRight, Sparkles
} from 'lucide-react';
import { Invoice } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  captureElementAsPDF, 
  captureElementAsJPG, 
  triggerFileDownload,
  printHtmlElement
} from '../../lib/invoiceExport';
import { downloadSaleInvoicePDF } from '../../lib/pdfGenerator';
import { emitToast } from '../../contexts/ToastContext';
import { InvoiceShareModal } from './InvoiceShareModal';
import { PrintPreviewModal } from './PrintPreviewModal';
import { PageSetupDialog } from '../settings/PageSetupDialog';
import { A4_READY_MADE_PRESETS } from '../settings/PrintTab';

const A4_TEMPLATES = [
  { id: 'A4_CLASSIC_TAX', name: 'Classic Tax Banner', style: 'Traditional Tax Grid Banner' },
  { id: 'A4_PHARMA_WHOLESALE', name: 'Pharma Wholesale', style: 'Batch, Expiry & Drug Lic Focus' },
  { id: 'A4_MODERN_MINIMAL', name: 'Modern Minimalist', style: 'Clean Contemporary Lines' },
  { id: 'A4_CORPORATE_BOXED', name: 'Corporate Boxed', style: 'Structured Border Panels' },
  { id: 'A4_COMPACT_PROFESSIONAL', name: 'Compact Professional', style: 'High-Density Item Ledger' },
];

const THERMAL_THEMES = [
  { id: 'THERMAL_CLASSIC', name: 'Thermal Classic POS', style: 'Standard 3-Inch Receipt' },
  { id: 'THERMAL_PHARMA', name: 'Thermal Detailed Pharma', style: 'Batch & Expiry POS Ticket' },
  { id: 'THERMAL_MINIMAL', name: 'Thermal Minimalist', style: 'Ultra-Clean Receipt' },
];

const COLORS = [
  { name: 'Pure B&W (Laser/Zero Ink)', hex: '#000000' },
  { name: 'Paper White & Black', hex: '#ffffff' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Teal Green', hex: '#0d9488' },
  { name: 'Ruby Red', hex: '#e11d48' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Amber Orange', hex: '#ea580c' },
  { name: 'Slate Charcoal', hex: '#334155' },
];

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  autoPrint?: boolean;
  onUpdateInvoice?: (inv: Invoice) => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  autoPrint = false,
  onUpdateInvoice
}) => {
  const { business } = useAuth();
  const { settings, updatePrint } = useSettings();

  const [printFormat, setPrintFormat] = useState<'A4' | 'Thermal'>(
    settings.print.paperSize?.includes('Thermal') ? 'Thermal' : 'A4'
  );
  const [showCustomizer, setShowCustomizer] = useState<boolean>(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Auto-print triggered via shortcut or quick print
  useEffect(() => {
    if (!isOpen || !invoice) return;
    if (autoPrint) {
      const timer = setTimeout(() => {
        if (printAreaRef.current) {
          const isMono = 
            (settings.print.themeColor || '').toLowerCase() === '#ffffff' || 
            (settings.print.themeColor || '').toLowerCase() === '#000000' ||
            (settings.print.themeColor || '').toLowerCase() === 'white' ||
            (settings.print.themeColor || '').toLowerCase() === 'black';
          printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal', isMono);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, invoice, autoPrint, printFormat, settings.print.themeColor]);

  // Keyboard shortcut listener within print modal
  useEffect(() => {
    if (!isOpen) return;
    const handlePrintKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        if (printAreaRef.current && invoice) {
          const isMono = 
            (settings.print.themeColor || '').toLowerCase() === '#ffffff' || 
            (settings.print.themeColor || '').toLowerCase() === '#000000' ||
            (settings.print.themeColor || '').toLowerCase() === 'white' ||
            (settings.print.themeColor || '').toLowerCase() === 'black';
          printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal', isMono);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handlePrintKeyDown);
    return () => window.removeEventListener('keydown', handlePrintKeyDown);
  }, [isOpen, invoice, printFormat, onClose, settings.print.themeColor]);

  if (!isOpen || !invoice) return null;

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const curr = settings.general.currencySymbol || 'Rs.';
  const printConf = settings.print;
  const activeThemeColor = printConf.themeColor || '#2563eb';

  const isMonochromeOrWhite = 
    activeThemeColor.toLowerCase() === '#ffffff' || 
    activeThemeColor.toLowerCase() === '#fff' || 
    activeThemeColor.toLowerCase() === 'white' || 
    activeThemeColor.toLowerCase() === '#000000' || 
    activeThemeColor.toLowerCase() === '#000' || 
    activeThemeColor.toLowerCase() === 'black';

  const businessName = (printConf.showCompanyName && printConf.companyName) 
    ? printConf.companyName 
    : (business?.name || 'MBI INVENTRA');
  const businessAddress = (printConf.showAddress && printConf.address)
    ? printConf.address
    : (business?.address || 'MBI Corporate Plaza, Commercial Center, Lahore');
  const businessPhone = (printConf.showPhone && printConf.phone)
    ? printConf.phone
    : (business?.phone || '03364585863');
  const businessEmail = (printConf.showEmail && printConf.email)
    ? printConf.email
    : (business?.email || '');
  const businessTaxNo = business?.taxNumber || '4928172-9';
  const drugLicenseNo = business?.drugLicenseNo || 'DL-09-2024-MBI';

  const cols = printConf.tableColumns || {
    serialNo: true,
    itemName: true,
    hsnSac: false,
    batchNo: true,
    expDate: true,
    mfgDate: false,
    mrp: false,
    quantity: true,
    unit: true,
    price: true,
    discount: true,
    taxPercent: true,
    taxAmount: true,
    total: true,
  };

  const handlePrint = () => {
    if (invoice.isWarrantyBill && !invoice.warrantyDetails?.isPrintingEnabled) {
      emitToast('Printing is disabled for this warranty bill', 'error');
      return;
    }
    if (printAreaRef.current) {
      printHtmlElement(printAreaRef.current, `Invoice_${invoice.invoiceNumber}`, printFormat === 'Thermal', isMonochromeOrWhite);
    } else {
      window.print();
    }
    emitToast('Print dialog opened', 'info');
  };

  const handleSavePDF = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const cleanCustomer = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCustomer}.pdf`;
      const { blob } = await captureElementAsPDF(printAreaRef.current, fileName, printFormat === 'Thermal');
      triggerFileDownload(blob, fileName);
      showStatus('PDF exported and downloaded!');
      emitToast('PDF invoice downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to export PDF visually, using direct vector PDF:', err);
      try {
        downloadSaleInvoicePDF(invoice, {
          name: businessName,
          address: businessAddress,
          phone: businessPhone,
          email: businessEmail,
          taxNumber: businessTaxNo,
          drugLicenseNo: drugLicenseNo,
          terms: printConf.termsAndConditions
        });
        showStatus('Vector PDF invoice downloaded!');
        emitToast('PDF invoice downloaded successfully', 'success');
      } catch (fallbackErr) {
        console.error('Fallback vector PDF failed:', fallbackErr);
        emitToast('Failed to export PDF. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveJPG = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);
    try {
      const cleanCustomer = (invoice.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Invoice_${invoice.invoiceNumber || 'INV'}_${cleanCustomer}.jpg`;
      const blob = await captureElementAsJPG(printAreaRef.current);
      triggerFileDownload(blob, fileName);
      showStatus('JPG image exported and downloaded!');
      emitToast('JPG invoice image downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to export JPG:', err);
      emitToast('Error exporting JPG image', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectJSPDF = () => {
    try {
      downloadSaleInvoicePDF(invoice, {
        name: businessName,
        address: businessAddress,
        phone: businessPhone,
        email: businessEmail,
        taxNumber: businessTaxNo,
        drugLicenseNo: drugLicenseNo,
        terms: printConf.termsAndConditions
      });
      showStatus('Professional jsPDF Invoice downloaded!');
      emitToast('Vector jsPDF invoice generated & downloaded', 'success');
    } catch (err) {
      console.error('Direct jsPDF error:', err);
      emitToast('Error generating jsPDF invoice', 'error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
          
          {/* Modal Header & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 text-white border-b border-slate-800 print:hidden flex-shrink-0 gap-2">
            
            {/* Title & Format Switcher */}
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-sm block">Invoice #{invoice.invoiceNumber}</span>
                <span className="text-[11px] text-slate-400">{invoice.customerName}</span>
              </div>
              
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setPrintFormat('A4');
                    if (printConf.theme.startsWith('THERMAL')) {
                      updatePrint({ theme: 'A4_CLASSIC_TAX' });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    printFormat === 'A4' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Standard A4
                </button>
                <button
                  onClick={() => {
                    setPrintFormat('Thermal');
                    if (!printConf.theme.startsWith('THERMAL')) {
                      updatePrint({ theme: 'THERMAL_CLASSIC' });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    printFormat === 'Thermal' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3-Inch Thermal
                </button>
              </div>
            </div>

            {/* Warranty Controls */}
            {invoice.isWarrantyBill && (
              <div className="flex gap-2 items-center bg-slate-800 p-1.5 rounded-lg border border-slate-700 text-[10px] font-bold text-white">
                <button onClick={() => onUpdateInvoice?.({ ...invoice, warrantyDetails: { ...invoice.warrantyDetails, isHeaderEnabled: !invoice.warrantyDetails?.isHeaderEnabled } })} className={`px-2 py-0.5 rounded ${invoice.warrantyDetails?.isHeaderEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>Header: {invoice.warrantyDetails?.isHeaderEnabled ? 'ON' : 'OFF'}</button>
                <button onClick={() => onUpdateInvoice?.({ ...invoice, warrantyDetails: { ...invoice.warrantyDetails, isFooterEnabled: !invoice.warrantyDetails?.isFooterEnabled } })} className={`px-2 py-0.5 rounded ${invoice.warrantyDetails?.isFooterEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}>Footer: {invoice.warrantyDetails?.isFooterEnabled ? 'ON' : 'OFF'}</button>
                <button onClick={() => onUpdateInvoice?.({ ...invoice, warrantyDetails: { ...invoice.warrantyDetails, isPrintingEnabled: !invoice.warrantyDetails?.isPrintingEnabled } })} className={`px-2 py-0.5 rounded ${invoice.warrantyDetails?.isPrintingEnabled ? 'bg-emerald-600' : 'bg-rose-600'}`}>Printing: {invoice.warrantyDetails?.isPrintingEnabled ? 'ON' : 'OFF'}</button>
              </div>
            )}
            
            {/* Actions: Customize Sidebar Toggle, jsPDF, Save PDF, JPG, Share, Print */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Page Setup Button */}
              <button
                onClick={() => setIsPageSetupOpen(true)}
                className="hidden sm:flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Page setup, margins & scale to fit"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Page Setup</span>
              </button>

              {/* Interactive Viewport Preview */}
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Open simulated A4 viewport with drag-and-drop sections"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Viewport Preview</span>
              </button>

              {/* Customize Bar Toggle */}
              <button
                onClick={() => setShowCustomizer(!showCustomizer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  showCustomizer 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Print Customization Bar"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showCustomizer ? 'Hide Customizer' : 'Customize'}</span>
              </button>

              {/* Direct Vector jsPDF */}
              <button
                onClick={handleDirectJSPDF}
                title="Download vector PDF invoice"
                className="hidden md:flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>jsPDF</span>
              </button>

              {/* Save PDF */}
              <button
                onClick={handleSavePDF}
                disabled={isExporting}
                title="Save document as PDF"
                className="flex items-center gap-1 bg-rose-700/90 hover:bg-rose-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Save PDF</span>
              </button>

              {/* Save JPG */}
              <button
                onClick={handleSaveJPG}
                disabled={isExporting}
                title="Save document as JPG image"
                className="hidden lg:flex items-center gap-1 bg-indigo-700/80 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                <span>Save JPG</span>
              </button>

              {/* Share PDF / JPG Modal */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                title="Share via WhatsApp or Email"
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>

              {/* Print Now */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors ml-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Toast */}
          {statusMsg && (
            <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Main Area: Split between Left Invoice Preview & Right Customization Bar */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100">
            
            {/* =========================================================================
                LEFT SIDE: Real Invoice Preview (Changes live as user tweaks right bar)
                ========================================================================= */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
              
              {printFormat === 'A4' ? (
                /* Standard A4 Formats */
                <div 
                  ref={printAreaRef}
                  id="invoice-a4-document"
                  data-print-theme={isMonochromeOrWhite ? 'white' : activeThemeColor}
                  data-monochrome={isMonochromeOrWhite ? 'true' : 'false'}
                  className={`printable-bill-root bg-white text-slate-900 w-full max-w-[760px] shadow-md border border-slate-300 rounded-sm select-text transition-all ${
                    printConf.theme === 'A4_MODERN_MINIMAL' ? 'p-8 sm:p-10 font-sans' :
                    printConf.theme === 'A4_CORPORATE_BOXED' ? 'p-6 sm:p-8 font-sans' :
                    printConf.theme === 'A4_COMPACT_PROFESSIONAL' ? 'p-5 sm:p-6 text-[11px] font-sans' :
                    'p-6 sm:p-8 font-sans'
                  }`}
                  style={{
                    fontSize: printConf.invoiceTextSize === 'Large' ? '13px' : printConf.invoiceTextSize === 'Small' ? '11px' : '12px'
                  }}
                >
                  
                  {/* Top Original Watermark - Clean print without template name */}
                  {printConf.printOriginalDuplicate && (
                    <div className="flex justify-end items-center text-xs pb-1.5 mb-2.5 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 border border-slate-300 rounded text-slate-700 bg-slate-50">
                        Original For Recipient (اصل کاپی)
                      </span>
                    </div>
                  )}

                  {/* =========================================================================
                      A4 THEME 1: CLASSIC TAX & GST INVOICE
                      Rich full-width color header banner, structured tax grid, colored totals
                      ========================================================================= */}
                  {printConf.theme === 'A4_CLASSIC_TAX' && (
                    <>
                      {/* Header Banner */}
                      <div 
                        className={`p-3.5 rounded-xl flex items-start justify-between gap-3 mb-3 shadow-2xs ${
                          isMonochromeOrWhite 
                            ? 'bg-white border-2 border-black text-black' 
                            : 'text-white'
                        }`}
                        style={isMonochromeOrWhite ? undefined : { backgroundColor: activeThemeColor }}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <h1 className={`text-lg font-black uppercase tracking-wide truncate ${
                            isMonochromeOrWhite ? 'text-black' : ''
                          }`}>
                            {businessName}
                          </h1>
                          <p className={`text-[11px] ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-95'}`}>{businessAddress}</p>
                          <div className={`flex flex-wrap gap-2.5 text-[11px] pt-0.5 ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-90'}`}>
                            {businessPhone && <span>Phone: {businessPhone}</span>}
                            {businessEmail && <span>Email: {businessEmail}</span>}
                          </div>
                          <p className={`text-[10px] font-mono ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-90'}`}>
                            NTN/GST: {businessTaxNo} | Drug Lic: {drugLicenseNo}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-0.5">
                          <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider block text-center border ${
                            isMonochromeOrWhite 
                              ? 'bg-black text-white border-black' 
                              : 'bg-white/20 border-white/30 text-white'
                          }`}>
                            {invoice.transactionType || printConf.transactionTitle || 'TAX INVOICE'}
                          </span>
                          <p className={`text-[11px] font-mono font-bold ${isMonochromeOrWhite ? 'text-black' : ''}`}>Inv #: {invoice.invoiceNumber}</p>
                          <p className={`text-[10.5px] ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-90'}`}>Date: {invoice.date.slice(0, 10)}</p>
                          <p className={`text-[9.5px] ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-85'}`}>Type: {invoice.paymentType || 'Cash'}</p>
                        </div>
                      </div>

                      {/* Classic Tinted Party Details */}
                      <div 
                        className={`grid grid-cols-2 gap-3 p-2.5 rounded-xl border text-xs mb-3 ${
                          isMonochromeOrWhite ? 'border-2 border-black bg-white text-black' : ''
                        }`}
                        style={isMonochromeOrWhite ? undefined : { backgroundColor: `${activeThemeColor}08`, borderColor: `${activeThemeColor}25` }}
                      >
                        <div>
                          <span 
                            className="font-bold uppercase tracking-wider text-[9.5px] block mb-0.5" 
                            style={{ color: isMonochromeOrWhite ? '#000000' : activeThemeColor }}
                          >
                            Billed To (خریدار تفصیل):
                          </span>
                          <div className="font-bold text-xs text-slate-900">{invoice.customerName}</div>
                          {invoice.billingName && invoice.billingName !== invoice.customerName && (
                            <div className="text-slate-600 text-[11px]">Attn: {invoice.billingName}</div>
                          )}
                          {invoice.customerPhone && (
                            <div className="text-slate-600 text-[11px]">Phone: {invoice.customerPhone}</div>
                          )}
                          {invoice.customerAddress && (
                            <div className="text-slate-600 text-[11px]">{invoice.customerAddress}</div>
                          )}
                        </div>

                        <div className="text-right flex flex-col justify-between text-[11px]">
                          <div>
                            <span className="text-slate-600">Payment Status: </span>
                            <strong className={invoice.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                              {invoice.balanceDue > 0 ? 'Unpaid / Credit' : 'Paid in Full'}
                            </strong>
                          </div>
                          {invoice.balanceDue > 0 && (
                            <div className="text-slate-600 text-[11px] mt-0.5">
                              Balance Due: <strong className="text-rose-700">{curr} {invoice.balanceDue.toLocaleString()}</strong>
                            </div>
                          )}
                          {printConf.currentPartyBalance && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Party Current Balance: <span className="font-mono font-bold text-slate-800">{curr} {(invoice.balanceDue || 0).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* =========================================================================
                      A4 THEME 2: PHARMA WHOLESALE DISTRIBUTOR
                      Thick left accent bar, Drug Act compliance badge, Chemist license focus
                      ========================================================================= */}
                  {printConf.theme === 'A4_PHARMA_WHOLESALE' && (
                    <>
                      {/* Wholesale Header */}
                      <div 
                        className="p-3.5 rounded-xl bg-white border-2 flex items-start justify-between gap-3 mb-3 shadow-2xs border-l-6"
                        style={{ borderLeftColor: activeThemeColor, borderColor: `${activeThemeColor}30` }}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.2 rounded text-white"
                              style={{ backgroundColor: activeThemeColor }}
                            >
                              PHARMACEUTICAL WHOLESALE DISTRIBUTOR
                            </span>
                            <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              DRUG ACT 1976 COMPLIANT
                            </span>
                          </div>
                          <h1 className="text-lg font-black uppercase tracking-wide text-slate-900">
                            {businessName}
                          </h1>
                          <p className="text-[11px] text-slate-600">{businessAddress}</p>
                          <div className="flex flex-wrap gap-2.5 text-[11px] text-slate-600 pt-0.5">
                            {businessPhone && <span>Ph: {businessPhone}</span>}
                            {businessEmail && <span>Email: {businessEmail}</span>}
                          </div>
                          <p className="text-[10.5px] font-bold font-mono text-emerald-800">
                            Drug Lic #: {drugLicenseNo} | NTN/STRN: {businessTaxNo}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-0.5">
                          <span 
                            className="text-[10.5px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider block text-center text-white shadow-2xs"
                            style={{ backgroundColor: activeThemeColor }}
                          >
                            {invoice.transactionType || 'SALE TAX INVOICE'}
                          </span>
                          <p className="text-[11px] font-mono font-bold text-slate-900">Inv #: {invoice.invoiceNumber}</p>
                          <p className="text-[10.5px] text-slate-500">Date: {invoice.date.slice(0, 10)}</p>
                          <p className="text-[9.5px] text-slate-500">Terms: {invoice.paymentType || 'Credit'}</p>
                        </div>
                      </div>

                      {/* Chemist / Hospital Buyer Panel */}
                      <div 
                        className="grid grid-cols-2 gap-3 p-2.5 rounded-xl border text-xs mb-3"
                        style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold uppercase tracking-wider text-[9.5px]" style={{ color: activeThemeColor }}>
                              Hospital / Chemist Buyer:
                            </span>
                            <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">
                              ✓ Verified Chemist
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-900">{invoice.customerName}</div>
                          {invoice.customerAddress && (
                            <div className="text-slate-600 text-[11px]">{invoice.customerAddress}</div>
                          )}
                          <div className="text-slate-600 text-[10.5px]">
                            Buyer Drug Lic: <strong className="font-mono text-slate-800">DL-REGISTERED-RETAIL</strong>
                          </div>
                        </div>

                        <div className="text-right flex flex-col justify-between text-[11px]">
                          <div>
                            <span className="text-slate-500">Supply Route: </span>
                            <strong className="text-slate-800">Direct Cold-Chain Van</strong>
                          </div>
                          <div>
                            <span className="text-slate-600">Payment Status: </span>
                            <strong className={invoice.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                              {invoice.balanceDue > 0 ? 'Credit Terms Active' : 'Account Cleared'}
                            </strong>
                          </div>
                          {invoice.balanceDue > 0 && (
                            <div className="text-slate-600 text-[11px]">
                              Receivable Balance: <strong className="text-rose-700">{curr} {invoice.balanceDue.toLocaleString()}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* =========================================================================
                      A4 THEME 3: MODERN MINIMALIST
                      Top colored accent bar, contemporary typography, borderless airy design
                      ========================================================================= */}
                  {printConf.theme === 'A4_MODERN_MINIMAL' && (
                    <>
                      {/* Top Accent Strip */}
                      <div className="h-1 rounded-full w-full mb-2" style={{ backgroundColor: activeThemeColor }}></div>

                      <div className="flex justify-between items-start pb-2 border-b border-slate-200 mb-3">
                        <div className="space-y-0.5">
                          <h1 className="text-xl font-light tracking-wider uppercase text-slate-900">{businessName}</h1>
                          <p className="text-[11px] text-slate-500 font-light">{businessAddress}</p>
                          <div className="flex gap-3 text-[11px] text-slate-500 font-light pt-0.5">
                            {businessPhone && <span>Phone: {businessPhone}</span>}
                            {businessEmail && <span>Email: {businessEmail}</span>}
                          </div>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="text-[11px] font-mono font-bold tracking-widest uppercase block" style={{ color: activeThemeColor }}>
                            {invoice.transactionType || 'INVOICE'}
                          </span>
                          <p className="text-xs font-mono font-bold text-slate-900">#{invoice.invoiceNumber}</p>
                          <p className="text-[10.5px] text-slate-400">{invoice.date.slice(0, 10)}</p>
                        </div>
                      </div>

                      {/* Modern Borderless Party Row */}
                      <div className="flex justify-between items-start text-xs pb-2 mb-3 border-b border-slate-100">
                        <div>
                          <span className="text-[9.5px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Billed To</span>
                          <div className="font-bold text-xs text-slate-900">{invoice.customerName}</div>
                          {invoice.customerPhone && <div className="text-slate-500 text-[11px]">{invoice.customerPhone}</div>}
                          {invoice.customerAddress && <div className="text-slate-500 text-[11px]">{invoice.customerAddress}</div>}
                        </div>

                        <div className="text-right text-[11px]">
                          <span className="text-[9.5px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Payment</span>
                          <div className="font-semibold text-slate-800">{invoice.paymentType || 'Standard'}</div>
                          <div className={`text-[11px] ${invoice.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {invoice.balanceDue > 0 ? `Due: ${curr} ${invoice.balanceDue.toLocaleString()}` : 'Fully Paid'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* =========================================================================
                      A4 THEME 4: CORPORATE BOXED
                      Architectural dual boxed panels, high-contrast grid, institutional format
                      ========================================================================= */}
                  {printConf.theme === 'A4_CORPORATE_BOXED' && (
                    <>
                      {/* Boxed Header */}
                      <div 
                        className="p-3 rounded-xl border-2 flex items-start justify-between gap-3 mb-3 shadow-2xs"
                        style={{ borderColor: activeThemeColor }}
                      >
                        <div className="space-y-0.5">
                          <span 
                            className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.2 rounded text-white inline-block"
                            style={{ backgroundColor: activeThemeColor }}
                          >
                            ENTERPRISE ACCOUNT
                          </span>
                          <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">{businessName}</h1>
                          <p className="text-[11px] text-slate-600">{businessAddress}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NTN: {businessTaxNo} | Lic: {drugLicenseNo}
                          </p>
                        </div>

                        <div 
                          className="p-2 rounded-lg border text-right space-y-0.5"
                          style={{ borderColor: `${activeThemeColor}40`, backgroundColor: `${activeThemeColor}0a` }}
                        >
                          <span className="text-[11px] font-black uppercase block tracking-wider" style={{ color: activeThemeColor }}>
                            {invoice.transactionType || 'CORPORATE INVOICE'}
                          </span>
                          <p className="text-[11px] font-mono font-bold text-slate-900">INV: #{invoice.invoiceNumber}</p>
                          <p className="text-[10px] text-slate-600">Date: {invoice.date.slice(0, 10)}</p>
                        </div>
                      </div>

                      {/* Dual Boxed Architectural Panels */}
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="p-2.5 border border-slate-300 rounded-lg">
                          <span className="font-bold uppercase text-[9.5px] text-slate-500 block mb-0.5">Client Institution / Buyer:</span>
                          <div className="font-bold text-xs text-slate-900">{invoice.customerName}</div>
                          {invoice.customerAddress && <p className="text-slate-600 text-[11px] mt-0.5">{invoice.customerAddress}</p>}
                          {invoice.customerPhone && <p className="text-slate-600 text-[11px]">Phone: {invoice.customerPhone}</p>}
                        </div>
                        <div className="p-2.5 border border-slate-300 rounded-lg text-right">
                          <span className="font-bold uppercase text-[9.5px] text-slate-500 block mb-0.5">Institutional Terms:</span>
                          <p className="font-bold text-slate-900 text-xs">{invoice.paymentType || 'Credit 30 Days'}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5">Status: <strong className={invoice.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>{invoice.balanceDue > 0 ? 'Payment Pending' : 'Settled'}</strong></p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* =========================================================================
                      A4 THEME 5: COMPACT PROFESSIONAL
                      Space-saving slim ribbon, high density, allows maximum items per page
                      ========================================================================= */}
                  {printConf.theme === 'A4_COMPACT_PROFESSIONAL' && (
                    <>
                      {/* Compact Ribbon Header */}
                      <div 
                        className="p-2 rounded-lg text-white flex items-center justify-between gap-3 mb-2 shadow-2xs"
                        style={{ backgroundColor: activeThemeColor }}
                      >
                        <div className="min-w-0">
                          <h1 className="text-xs font-black uppercase tracking-wide truncate">{businessName}</h1>
                          <p className="text-[9.5px] opacity-90 leading-tight">
                            {businessAddress} | Ph: {businessPhone} | Lic: {drugLicenseNo}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[9.5px] font-black bg-white/20 px-1.5 py-0.2 rounded uppercase block">
                            {invoice.transactionType || 'COMPACT LEDGER'}
                          </span>
                          <span className="text-[9.5px] font-mono opacity-90">#{invoice.invoiceNumber} | {invoice.date.slice(0, 10)}</span>
                        </div>
                      </div>

                      {/* Compact 1-Line Party Strip */}
                      <div className="p-1.5 bg-slate-100 rounded-md text-[11px] flex justify-between items-center border border-slate-200 mb-2">
                        <div className="truncate">
                          <strong className="text-slate-800">Party: </strong>
                          <span className="font-bold text-slate-900">{invoice.customerName}</span>
                          {invoice.customerPhone && <span className="text-slate-500 ml-1.5">({invoice.customerPhone})</span>}
                        </div>
                        <div className="flex-shrink-0">
                          <strong className="text-slate-700">Payment: </strong>
                          <span className={invoice.balanceDue > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                            {invoice.paymentType} {invoice.balanceDue > 0 ? `(Due: ${curr} ${invoice.balanceDue.toLocaleString()})` : '(Paid)'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* =========================================================================
                      DYNAMIC ITEMS TABLE - Styled According to Active Theme (Fits 100% Page Width)
                      ========================================================================= */}
                  <div className={`w-full mb-3 overflow-hidden ${
                    printConf.theme === 'A4_MODERN_MINIMAL' 
                      ? 'border-b border-slate-200' 
                      : printConf.theme === 'A4_CORPORATE_BOXED'
                      ? 'border-2 border-slate-300 rounded-lg'
                      : 'border border-slate-200 rounded-lg shadow-2xs'
                  }`}>
                    <table className="w-full text-left text-[11px] border-collapse table-auto">
                      <thead>
                        <tr 
                          className={`font-bold text-slate-800 ${
                            printConf.theme === 'A4_MODERN_MINIMAL'
                              ? 'border-b-2 border-slate-200 bg-slate-50'
                              : printConf.theme === 'A4_CORPORATE_BOXED'
                              ? 'border-b-2 border-slate-400 bg-slate-100 text-slate-900'
                              : 'border-b border-slate-300'
                          }`}
                          style={{ 
                            backgroundColor: printConf.theme === 'A4_MODERN_MINIMAL' 
                              ? '#f8fafc' 
                              : printConf.theme === 'A4_CORPORATE_BOXED'
                              ? '#f1f5f9'
                              : `${activeThemeColor}14`
                          }}
                        >
                          {cols.serialNo && <th className="px-1.5 py-1 text-center w-6">#</th>}
                          {cols.itemName && <th className="px-1.5 py-1">Item Description</th>}
                          {(cols.batchNo || invoice.isWarrantyBill) && <th className="px-1.5 py-1 text-center w-16">Batch</th>}
                          {(cols.expDate || invoice.isWarrantyBill) && <th className="px-1.5 py-1 text-center w-14">Exp</th>}
                          {cols.unit && <th className="px-1.5 py-1 text-center w-12">Unit</th>}
                          {cols.quantity && <th className="px-1.5 py-1 text-right w-10">Qty</th>}
                          {cols.price && <th className="px-1.5 py-1 text-right w-16">Rate</th>}
                          {cols.discount && <th className="px-1.5 py-1 text-right w-12">Disc %</th>}
                          {cols.taxPercent && <th className="px-1.5 py-1 text-right w-12">GST %</th>}
                          {cols.total && <th className="px-1.5 py-1 text-right w-20">Amount ({curr})</th>}
                        </tr>
                      </thead>

                      <tbody className={`divide-y text-slate-800 ${
                        printConf.theme === 'A4_MODERN_MINIMAL' ? 'divide-slate-100' : 'divide-slate-200'
                      }`}>
                        {invoice.items.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className={`transition-colors ${
                              printConf.theme === 'A4_CLASSIC_TAX' && idx % 2 === 1 
                                ? 'bg-slate-50/70' 
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {cols.serialNo && <td className="px-1.5 py-1 text-center font-mono text-slate-500 text-[10px]">{idx + 1}</td>}
                            {cols.itemName && (
                              <td className="px-1.5 py-1 font-bold text-slate-900 leading-tight min-w-[90px] break-words">
                                <div className="break-words">{item.name}</div>
                                {item.batchNumber && !cols.batchNo && (
                                  <span className="block text-[9px] font-mono text-slate-400 font-normal break-words">
                                    Batch: {item.batchNumber} {item.expiryDate ? `| Exp: ${item.expiryDate}` : ''}
                                  </span>
                                )}
                              </td>
                            )}
                            {(cols.batchNo || invoice.isWarrantyBill) && (
                              <td className="px-1.5 py-1 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                {printConf.theme === 'A4_PHARMA_WHOLESALE' ? (
                                  <span className="bg-slate-100 px-1 py-0.2 rounded border border-slate-200 font-bold">
                                    {item.batchNumber || '-'}
                                  </span>
                                ) : (
                                  item.batchNumber || '-'
                                )}
                              </td>
                            )}
                            {(cols.expDate || invoice.isWarrantyBill) && (
                              <td className="px-1.5 py-1 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                {item.expiryDate ? item.expiryDate.slice(0, 7) : '-'}
                              </td>
                            )}
                            {cols.unit && <td className="px-1.5 py-1 text-center text-slate-600 text-[10px] whitespace-nowrap">{item.unit || 'Box'}</td>}
                            {cols.quantity && <td className="px-1.5 py-1 text-right font-bold text-slate-900 whitespace-nowrap">{item.quantity}</td>}
                            {cols.price && <td className="px-1.5 py-1 text-right font-mono text-[10.5px] whitespace-nowrap">{(item.sellingPrice || item.pricePerUnit || 0).toLocaleString()}</td>}
                            {cols.discount && <td className="px-1.5 py-1 text-right font-mono text-[10px] text-emerald-700 whitespace-nowrap">{item.discountPercentage || 0}%</td>}
                            {cols.taxPercent && <td className="px-1.5 py-1 text-right font-mono text-[10px] whitespace-nowrap">{item.taxPercentage || item.gstPercentage || 0}%</td>}
                            {cols.total && <td className="px-1.5 py-1 text-right font-bold font-mono text-slate-900 text-[11px] whitespace-nowrap">{item.total.toLocaleString()}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pharma Wholesale Statutory Warranty Box */}
                  {printConf.theme === 'A4_PHARMA_WHOLESALE' && (
                    <div className="p-2 bg-emerald-50/80 border border-emerald-300 rounded-lg text-[10px] text-emerald-950 mb-3 leading-tight">
                      <span className="font-bold block text-emerald-900">Form 2-A Statutory Drug Warranty (Section 23 of Drug Act 1976):</span>
                      We hereby certify and warrant that the drugs and pharmaceutical preparations specified in this sale invoice do not contravene in any manner the provisions of Section 23 of the Drug Act, 1976 and the rules framed thereunder.
                    </div>
                  )}

                  {/* Summary & Financial Calculation */}
                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                    
                    {/* Left Notes, Bank Details & QR */}
                    <div className="space-y-2">
                      {printConf.printTerms && (
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-0.5">
                          <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
                          <p className="text-slate-600 whitespace-pre-line leading-tight">
                            {printConf.termsAndConditions || invoice.description || 'Goods once sold will not be returned without original cash receipt.'}
                          </p>
                        </div>
                      )}

                      {printConf.printBankDetails && printConf.bankDetailsText && (
                        <div 
                          className="p-2 rounded-lg border text-[10px] space-y-0.5"
                          style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
                        >
                          <span className="font-bold flex items-center gap-1" style={{ color: activeThemeColor }}>
                            <Landmark className="w-3 h-3" /> Bank Account Details For Remittance:
                          </span>
                          <p className="whitespace-pre-line font-mono text-[9.5px] text-slate-700 leading-tight">
                            {printConf.bankDetailsText}
                          </p>
                        </div>
                      )}

                      {printConf.printQrCode && (
                        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="w-10 h-10 bg-white border border-slate-300 rounded flex items-center justify-center flex-shrink-0">
                            <QrCode className="w-8 h-8 text-slate-900" />
                          </div>
                          <div className="text-[9.5px] text-slate-500 leading-tight">
                            Scan to Pay / Verify Invoice #{invoice.invoiceNumber}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Financial Calculation */}
                    <div className={`space-y-1 font-medium ${
                      printConf.theme === 'A4_CORPORATE_BOXED' ? 'p-2.5 border-2 border-slate-300 rounded-xl' : ''
                    }`}>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Sub Total:</span>
                        <span className="font-mono">{curr} {invoice.subTotal.toLocaleString()}</span>
                      </div>

                      {invoice.discountAmount && invoice.discountAmount > 0 ? (
                        <div className="flex justify-between text-emerald-700 text-[11px]">
                          <span>Discount ({invoice.discountPercentage || 0}%):</span>
                          <span className="font-mono">- {curr} {invoice.discountAmount.toLocaleString()}</span>
                        </div>
                      ) : null}

                      {invoice.taxAmount && invoice.taxAmount > 0 ? (
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Total GST / Sales Tax ({invoice.taxPercentage || 18}%):</span>
                          <span className="font-mono">+ {curr} {invoice.taxAmount.toLocaleString()}</span>
                        </div>
                      ) : null}

                      {/* Grand Total Box (Theme Styled) */}
                      {printConf.theme === 'A4_MODERN_MINIMAL' ? (
                        <div className="flex justify-between text-sm font-black text-slate-900 py-1.5 border-t-2 border-b-2 border-slate-900">
                          <span>Grand Total:</span>
                          <span className="font-mono">{curr} {invoice.grandTotal.toLocaleString()}</span>
                        </div>
                      ) : printConf.theme === 'A4_CORPORATE_BOXED' ? (
                        <div className="flex justify-between text-xs font-black text-slate-900 p-1.5 bg-slate-100 rounded border border-slate-300">
                          <span>NET PAYABLE:</span>
                          <span className="font-mono text-sm">{curr} {invoice.grandTotal.toLocaleString()}</span>
                        </div>
                      ) : (
                        <div 
                          className={`flex justify-between text-xs font-black p-2 rounded-lg shadow-2xs ${
                            isMonochromeOrWhite 
                              ? 'border-2 border-black bg-white text-black' 
                              : 'text-white'
                          }`}
                          style={isMonochromeOrWhite ? undefined : { backgroundColor: activeThemeColor }}
                        >
                          <span>Grand Total (کل رقم):</span>
                          <span className="font-mono text-sm">{curr} {invoice.grandTotal.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-[11px] pt-0.5">
                        <span className="text-slate-600">Received Amount:</span>
                        <span className="font-mono font-bold text-emerald-700">{curr} {invoice.receivedAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-[11px] border-t border-slate-200 pt-0.5 font-bold">
                        <span className="text-slate-700">Balance Due:</span>
                        <span className={`font-mono ${invoice.balanceDue > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                          {curr} {invoice.balanceDue.toLocaleString()}
                        </span>
                      </div>

                      {printConf.currentPartyBalance && (
                        <div className="flex justify-between text-[10.5px] text-slate-500 pt-0.5">
                          <span>Party Current Ledger Balance:</span>
                          <span className="font-mono font-bold text-slate-800">{curr} {(invoice.balanceDue || 0).toLocaleString()}</span>
                        </div>
                      )}

                      {printConf.youSaved && invoice.discountAmount && invoice.discountAmount > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-1 rounded text-center font-bold text-[10px] mt-1">
                          🎉 Total Savings: {curr} {invoice.discountAmount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signatures */}
                  {printConf.printSignatureText && (
                    <div className="grid grid-cols-2 gap-6 mt-4 pt-3 border-t border-slate-200 text-center text-[10.5px] text-slate-500">
                      <div>
                        <div className="h-6 border-b border-dashed border-slate-400 mx-auto w-32"></div>
                        <span className="mt-0.5 block font-medium">Customer's Signature</span>
                      </div>
                      <div>
                        <div className="h-6 border-b border-dashed border-slate-400 mx-auto w-32"></div>
                        <span className="mt-0.5 block font-medium">
                          {printConf.signatureText || `Authorized Pharmacist / Distributor`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Permanent Mandatory System Branding Footer */}
                  <div className="mt-3 pt-2 border-t-2 border-slate-300 text-center font-bold text-slate-900 text-[10px] space-y-0.5 tracking-wide uppercase">
                    <p className="text-xs font-black text-slate-900">{printConf.customFooterShopNote || 'THANKS FOR SHOPPING!'}</p>
                    <p className="text-[10px] font-black text-slate-800">{printConf.developerCreditText || 'DEVELOPED BY MBI INVENTRA - M BILAL INAYAT 0328-1302636'}</p>
                  </div>

                </div>
              ) : (
                /* -------------------------------------------------------------
                    3 DISTINCT THERMAL RECEIPT FORMATS
                    1. THERMAL_CLASSIC: Traditional 3-Inch POS Receipt (Dashed)
                    2. THERMAL_PHARMA: Pharmacy Rx Dispensing Slip (Clinical)
                    3. THERMAL_MINIMAL: Fast High-Speed Compact Slip (Clean Modern)
                    (No template name printed anywhere on document)
                    ------------------------------------------------------------- */
                <div 
                  ref={printAreaRef}
                  id="invoice-thermal-document"
                  data-print-theme={isMonochromeOrWhite ? 'white' : activeThemeColor}
                  data-monochrome={isMonochromeOrWhite ? 'true' : 'false'}
                  className="printable-bill-root bg-white border border-slate-300 p-4 rounded-sm shadow-sm w-[320px] text-slate-900 text-xs font-mono select-text"
                >
                  {/* THERMAL 1: CLASSIC POS RECEIPT */}
                  {printConf.theme === 'THERMAL_CLASSIC' && (
                    <div>
                      <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                        <div className="font-black text-sm uppercase">{businessName}</div>
                        <div className="text-[10px] text-slate-600">{businessAddress}</div>
                        <div className="text-[10px] text-slate-600">Tel: {businessPhone}</div>
                        {drugLicenseNo && (
                          <div className="text-[9.5px] text-emerald-800 font-bold mt-0.5">Drug Lic: {drugLicenseNo}</div>
                        )}
                        <div className="text-[10px] font-bold mt-1 tracking-wider">*** SALE INVOICE ***</div>
                      </div>

                      <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                        <div>Inv #: {invoice.invoiceNumber}</div>
                        <div>Date: {invoice.date.slice(0, 10)}</div>
                        <div>Customer: {invoice.customerName}</div>
                        <div>Payment: {invoice.paymentType}</div>
                      </div>

                      <div className="py-2 border-b border-dashed border-slate-400">
                        <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-dashed border-slate-300">
                          <span>ITEM / DESCRIPTION</span>
                          <span>AMOUNT</span>
                        </div>
                        <div className="divide-y divide-dashed divide-slate-200 py-1 space-y-1.5">
                          {invoice.items.map((it, idx) => (
                            <div key={idx} className="pt-1 space-y-0.5 text-[10px]">
                              {/* Line 1: Item description full width, zero overlap, word-break */}
                              <div className="font-bold text-slate-900 break-words leading-tight">
                                {idx + 1}. {it.name}
                              </div>
                              {it.batchNumber && (
                                <div className="text-[9px] text-slate-500 font-mono pl-2">
                                  Batch: {it.batchNumber} {it.expiryDate ? `| Exp: ${it.expiryDate.slice(0, 7)}` : ''}
                                </div>
                              )}
                              {/* Line 2: 2nd line text with quantity x price on left, amount on right */}
                              <div className="flex justify-between items-center text-slate-700 pl-2 font-mono text-[9.5px]">
                                <span>{it.quantity} {it.unit || 'Pcs'} x {(it.sellingPrice || it.pricePerUnit || 0)}</span>
                                <span className="font-bold text-slate-900">{curr} {it.total}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400 font-bold">
                        <div className="flex justify-between">
                          <span>TOTAL:</span>
                          <span>{curr} {invoice.grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>PAID:</span>
                          <span>{curr} {invoice.receivedAmount.toLocaleString()}</span>
                        </div>
                        {invoice.balanceDue > 0 && (
                          <div className="flex justify-between text-rose-700">
                            <span>DUE:</span>
                            <span>{curr} {invoice.balanceDue.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {printConf.printBankDetails && printConf.bankDetailsText && (
                        <div className="py-1.5 border-b border-dashed border-slate-400 text-[9.5px]">
                          <div className="font-bold">Bank Details:</div>
                          <div className="text-slate-600 whitespace-pre-line">{printConf.bankDetailsText}</div>
                        </div>
                      )}

                      <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
                        <div>{printConf.termsAndConditions || 'Thank you for your business!'}</div>
                        <div className="text-[8.5px] text-slate-400 border-t border-dashed border-slate-300 pt-1">
                          *** THANK YOU FOR VISITING ***
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THERMAL 2: PHARMACY RX DISPENSING SLIP */}
                  {printConf.theme === 'THERMAL_PHARMA' && (
                    <div className="space-y-2">
                      <div className="text-center pb-2 border-b-2 border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                          ⚕ Rx PHARMACY DISPENSING SLIP
                        </div>
                        <div className="font-black text-sm uppercase">{businessName}</div>
                        <div className="text-[9.5px] text-slate-600">{businessAddress}</div>
                        <div className="text-[9.5px] font-bold text-emerald-800">
                          Drug Lic: {drugLicenseNo || 'DL-REGISTERED'}
                        </div>
                        <div className="text-[9px] text-slate-500">Qualified Pharmacist On Duty</div>
                      </div>

                      <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[10px] space-y-0.5">
                        <div className="flex justify-between">
                          <span><strong>Patient:</strong> {invoice.customerName}</span>
                          <span>#{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span><strong>Dr:</strong> Consultant / Walk-in</span>
                          <span>{invoice.date.slice(0, 10)}</span>
                        </div>
                      </div>

                      {/* Medicine items with 2-line layout, zero text merging */}
                      <div className="py-1 space-y-1.5 border-b border-slate-300">
                        <div className="text-[9.5px] font-bold uppercase text-slate-700 flex justify-between">
                          <span>Prescribed Medicine</span>
                          <span>Amount</span>
                        </div>
                        {invoice.items.map((it, idx) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[10px] space-y-1">
                            {/* Line 1: Item name, word break */}
                            <div className="font-bold text-slate-900 break-words leading-tight">
                              {idx + 1}. {it.name}
                            </div>
                            {(it.batchNumber || it.expiryDate) && (
                              <div className="text-[9px] text-emerald-800 font-mono">
                                Batch: {it.batchNumber || 'N/A'} | Exp: {it.expiryDate ? it.expiryDate.slice(0, 7) : 'N/A'}
                              </div>
                            )}
                            {/* Line 2: Qty x Rate on left, amount on right */}
                            <div className="flex justify-between items-center text-[9.5px] text-slate-700 font-mono pl-1">
                              <span>{it.quantity} {it.unit || 'Pcs'} x {(it.sellingPrice || it.pricePerUnit || 0)}</span>
                              <span className="font-bold text-slate-900">{curr} {it.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="py-1.5 space-y-0.5 text-[11px] border-b border-slate-300">
                        <div className="flex justify-between font-black">
                          <span>TOTAL CHARGES:</span>
                          <span>{curr} {invoice.grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 text-[10px]">
                          <span>Paid: {curr} {invoice.receivedAmount.toLocaleString()}</span>
                          {invoice.balanceDue > 0 && <span className="text-rose-700 font-bold">Due: {curr} {invoice.balanceDue.toLocaleString()}</span>}
                        </div>
                      </div>

                      {/* Pharmacist Dispensing Signature */}
                      <div className="pt-2 text-[9px] text-slate-600 space-y-2">
                        <div className="flex justify-between items-end">
                          <span>Dispensed By: ________________</span>
                          <span className="text-center">Pharmacist Seal</span>
                        </div>
                        <div className="text-center text-[8.5px] text-slate-500 italic">
                          * Keep medicines below 25°C. Check expiry & packaging before leaving counter.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THERMAL 3: FAST HIGH-SPEED COMPACT SLIP */}
                  {printConf.theme === 'THERMAL_MINIMAL' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-300">
                        <div>
                          <div className="font-black text-xs uppercase">{businessName}</div>
                          <div className="text-[9px] text-slate-500">Ph: {businessPhone}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-[10px]">#{invoice.invoiceNumber}</div>
                          <div className="text-[9px] text-slate-400">{invoice.date.slice(0, 10)}</div>
                        </div>
                      </div>

                      {/* Compact items list with 2-line layout */}
                      <div className="py-1 border-b border-slate-200 text-[10px] space-y-1.5">
                        {invoice.items.map((it, idx) => (
                          <div key={idx} className="space-y-0.5 border-b border-slate-100 last:border-0 pb-1">
                            <div className="font-bold text-slate-900 break-words leading-tight">
                              {idx + 1}. {it.name}
                            </div>
                            <div className="flex justify-between items-center text-slate-600 pl-2 font-mono text-[9.5px]">
                              <span>{it.quantity} {it.unit || 'Pcs'} x {(it.sellingPrice || it.pricePerUnit || 0)}</span>
                              <span className="font-bold text-slate-900">{curr} {it.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Inverted Black Box for Grand Total */}
                      <div className="bg-slate-900 text-white p-2 rounded-sm text-center">
                        <div className="text-[9px] tracking-widest uppercase opacity-80">NET AMOUNT</div>
                        <div className="text-sm font-black font-mono">{curr} {invoice.grandTotal.toLocaleString()}</div>
                      </div>

                      <div className="flex justify-between text-[10px] pt-1 text-slate-600">
                        <span>Paid: {curr} {invoice.receivedAmount.toLocaleString()}</span>
                        <span>{invoice.paymentType}</span>
                      </div>

                      <div className="text-center pt-2 text-[8.5px] text-slate-400">
                        Fast Checkout • Thank You!
                      </div>
                    </div>
                  )}

                  {/* Fallback for other thermal themes */}
                  {printConf.theme !== 'THERMAL_CLASSIC' && printConf.theme !== 'THERMAL_PHARMA' && printConf.theme !== 'THERMAL_MINIMAL' && (
                    <div>
                      <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                        <div className="font-black text-sm uppercase">{businessName}</div>
                        <div className="text-[10px] text-slate-600">{businessAddress}</div>
                        <div className="text-[10px] font-bold mt-1">*** SALE INVOICE ***</div>
                      </div>
                      <div className="py-2 border-b border-dashed border-slate-400 text-[11px]">
                        <div>Inv #: {invoice.invoiceNumber}</div>
                        <div>Date: {invoice.date.slice(0, 10)}</div>
                        <div>Customer: {invoice.customerName}</div>
                      </div>
                      <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5">
                        {invoice.items.map((it, idx) => (
                          <div key={idx} className="text-[10px] space-y-0.5 border-b border-dashed border-slate-100 last:border-0 pb-1">
                            <div className="font-bold text-slate-900 break-words leading-tight">{idx + 1}. {it.name}</div>
                            <div className="flex justify-between text-slate-700 pl-2 font-mono text-[9.5px]">
                              <span>{it.quantity} x {(it.sellingPrice || it.pricePerUnit || 0)}</span>
                              <span className="font-bold text-slate-900">{curr} {it.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="py-2 font-bold text-xs flex justify-between border-b border-dashed border-slate-400">
                        <span>TOTAL:</span>
                        <span>{curr} {invoice.grandTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-center pt-2 text-[9px] text-slate-500">
                        Thank you for your business!
                      </div>
                    </div>
                  )}

                  {/* Permanent Mandatory System Branding Footer */}
                  <div className="text-center pt-2.5 mt-2.5 border-t-2 border-slate-900 text-[10px] text-slate-900 font-bold uppercase tracking-wider space-y-0.5">
                    <p className="font-black text-[11px] text-slate-900">THANKS FOR SHOPPING!</p>
                    <p className="font-extrabold text-[9.5px] text-slate-800">DEVELOPED BY MBI INVENTRA</p>
                    <p className="font-extrabold text-[9.5px] text-slate-800">M BILAL INAYAT 0328-1302636</p>
                  </div>
                </div>
              )}

            </div>

            {/* =========================================================================
                RIGHT SIDE: Customization Bar (When Toggled Open)
                Allows on-the-fly theme, color, and column adjustments with LIVE updates!
                ========================================================================= */}
            {showCustomizer && (
              <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 overflow-y-auto space-y-4 flex-shrink-0 animate-in slide-in-from-right-4 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Quick Customize Bar</span>
                  </div>
                  <button 
                    onClick={() => setShowCustomizer(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>

                {/* 5 Ready-Made Templates */}
                {printFormat === 'A4' && (
                  <div className="space-y-1.5 pb-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>5 Ready-Made Presets:</span>
                      </label>
                    </div>
                    <div className="space-y-1">
                      {A4_READY_MADE_PRESETS.map((preset) => {
                        const isSelected = printConf.theme === preset.theme;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              updatePrint({
                                theme: preset.theme,
                                themeColor: preset.accentColor,
                                paperSize: preset.paperSize,
                                invoiceTextSize: preset.invoiceTextSize,
                                companyNameSize: preset.companyNameSize,
                                transactionTitle: preset.transactionTitle,
                                printOriginalDuplicate: preset.printOriginalDuplicate,
                                repeatHeader: preset.repeatHeader,
                                tableColumns: { ...printConf.tableColumns, ...preset.tableColumns },
                                taxDetails: preset.taxDetails,
                                youSaved: preset.youSaved,
                                receivedAmount: preset.receivedAmount,
                                balanceAmount: preset.balanceAmount,
                                currentPartyBalance: preset.currentPartyBalance,
                                printTerms: preset.printTerms,
                                termsAndConditions: preset.termsAndConditions,
                                printSignatureText: preset.printSignatureText,
                                signatureText: preset.signatureText,
                                printBankDetails: preset.printBankDetails,
                                bankDetailsText: preset.bankDetailsText,
                                printQrCode: preset.printQrCode,
                              });
                              emitToast(`Applied ${preset.name} Preset`);
                            }}
                            className={`w-full p-2 rounded-lg border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 font-bold text-amber-950 ring-1 ring-amber-400/30'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="truncate">{preset.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0 ${preset.badgeColor}`}>
                                  {preset.badge}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal block truncate">{preset.urduName}</span>
                            </div>
                            <div 
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-xs"
                              style={{ backgroundColor: preset.accentColor }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Templates Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Template Design:</label>
                  <div className="space-y-1.5">
                    {(printFormat === 'A4' ? A4_TEMPLATES : THERMAL_THEMES).map(t => (
                      <button
                        key={t.id}
                        onClick={() => updatePrint({ theme: t.id })}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                          printConf.theme === t.id 
                            ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900 ring-1 ring-blue-500/20' 
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t.name}</span>
                          {printConf.theme === t.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 block">{t.style}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Color Palette */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">Color Theme:</label>
                    <button
                      type="button"
                      onClick={() => updatePrint({ themeColor: isMonochromeOrWhite ? '#2563eb' : '#000000' })}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition flex items-center gap-1 cursor-pointer border ${
                        isMonochromeOrWhite 
                          ? 'bg-black text-white border-black shadow-2xs' 
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Printer className="w-3 h-3" />
                      {isMonochromeOrWhite ? '✓ B&W Mode Active' : 'Zero Ink B&W'}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => updatePrint({ themeColor: c.hex })}
                        className={`h-7 rounded-md border transition-all flex items-center justify-center cursor-pointer ${
                          activeThemeColor.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-slate-900 border-white'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {activeThemeColor.toLowerCase() === c.hex.toLowerCase() && (
                          <Check className={`w-3.5 h-3.5 stroke-[3] ${c.hex.toLowerCase() === '#ffffff' ? 'text-black' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Toggles */}
                {printFormat === 'A4' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">Table Columns:</label>
                    <div className="space-y-1 text-xs">
                      {[
                        { key: 'batchNo', label: 'Batch Number' },
                        { key: 'expDate', label: 'Expiry Date' },
                        { key: 'unit', label: 'Unit (Box/Pcs)' },
                        { key: 'discount', label: 'Discount %' },
                        { key: 'taxPercent', label: 'GST Tax %' },
                      ].map(col => (
                        <label key={col.key} className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                          <span className="text-[11px] text-slate-700">{col.label}</span>
                          <input
                            type="checkbox"
                            checked={(cols as any)[col.key]}
                            onChange={(e) => updatePrint({
                              tableColumns: {
                                ...printConf.tableColumns,
                                [col.key]: e.target.checked
                              }
                            })}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Toggles */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <label className="text-xs font-bold text-slate-700 block">Print Elements:</label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Bank Details</span>
                    <input
                      type="checkbox"
                      checked={printConf.printBankDetails}
                      onChange={(e) => updatePrint({ printBankDetails: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">QR Code Stamp</span>
                    <input
                      type="checkbox"
                      checked={printConf.printQrCode}
                      onChange={(e) => updatePrint({ printQrCode: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Terms & Conditions</span>
                    <input
                      type="checkbox"
                      checked={printConf.printTerms}
                      onChange={(e) => updatePrint({ printTerms: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer">
                    <span className="text-[11px] text-slate-700">Authorized Signature</span>
                    <input
                      type="checkbox"
                      checked={printConf.printSignatureText}
                      onChange={(e) => updatePrint({ printSignatureText: e.target.checked })}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                  </label>
                </div>

                <div className="pt-2 text-center">
                  <span className="text-[10px] text-slate-400">Settings save automatically as defaults</span>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Share Modal child */}
      <InvoiceShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        invoice={invoice}
      />

      {/* Page Setup Dialog */}
      <PageSetupDialog
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
      />

      {/* Print Preview Viewport Modal */}
      {isPreviewModalOpen && invoice && (
        <PrintPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          invoice={invoice}
        />
      )}
    </>
  );
};
