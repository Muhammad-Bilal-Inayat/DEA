import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Printer, GripVertical, ArrowUp, ArrowDown, Lock, CheckCircle2, 
  Sparkles, ZoomIn, ZoomOut, RotateCcw, Sliders, Shield, Download, FileText
} from 'lucide-react';
import { printHtmlElement } from '../../lib/invoiceExport';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  printConf?: any;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessTaxNo?: string;
  drugLicenseNo?: string;
  currencySymbol?: string;
  onConfirmPrint?: () => void;
}

const DEFAULT_SECTION_ORDER = [
  'HEADER',
  'CUSTOMER',
  'ITEMS',
  'WARRANTY_TERMS',
  'TOTALS_BANK',
  'SIGNATURES'
];

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  printConf = {},
  businessName = 'MBI Inventory & Pharmacy',
  businessAddress = 'Main Pharma Market, Pakistan',
  businessPhone = '0328-1302636',
  businessEmail = 'info@mbi-inventra.com',
  businessTaxNo = 'NTN-992120-1',
  drugLicenseNo = 'DRUG-LIC-2026/881',
  currencySymbol = 'Rs.',
  onConfirmPrint
}) => {
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    printConf?.sectionOrder && printConf.sectionOrder.length > 0 
      ? printConf.sectionOrder 
      : DEFAULT_SECTION_ORDER
  );

  const [scaleFactor, setScaleFactor] = useState<number>(
    printConf?.manualScalePercentage ? printConf.manualScalePercentage / 100 : 1.0
  );
  const [autoScale, setAutoScale] = useState<boolean>(
    printConf?.scaleToFitEnabled ?? true
  );

  const a4PageRef = useRef<HTMLDivElement>(null);

  // Auto-Scale calculation effect
  useEffect(() => {
    if (!autoScale || !a4PageRef.current) return;
    
    const pageEl = a4PageRef.current;
    // Standard A4 simulated viewport height is approx 1120px
    const targetMaxHeight = 1050;
    const contentHeight = pageEl.scrollHeight;

    if (contentHeight > targetMaxHeight) {
      const computedScale = Math.max(0.65, Math.min(1.0, targetMaxHeight / contentHeight));
      setScaleFactor(Number(computedScale.toFixed(2)));
    } else {
      setScaleFactor(1.0);
    }
  }, [autoScale, sectionOrder, invoice]);

  if (!isOpen) return null;

  const curr = currencySymbol;
  const activeThemeColor = printConf.themeColor || '#2563eb';
  const cols = printConf.tableColumns || {};

  const moveSection = (idx: number, dir: 'UP' | 'DOWN') => {
    const newOrder = [...sectionOrder];
    const targetIdx = dir === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newOrder.length) return;
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setSectionOrder(newOrder);
  };

  const handleSendToPrinter = () => {
    if (onConfirmPrint) {
      onConfirmPrint();
    } else if (a4PageRef.current) {
      printHtmlElement(a4PageRef.current, `Invoice_${invoice?.invoiceNumber || 'Print'}`);
    }
    onClose();
  };

  // Section Renderers
  const renderHeader = () => (
    <div key="HEADER" className="mb-3">
      <div 
        className="p-3.5 rounded-xl text-white flex items-start justify-between gap-3 shadow-2xs"
        style={{ backgroundColor: activeThemeColor }}
      >
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-lg font-black uppercase tracking-wide truncate">
            {businessName}
          </h1>
          <p className="text-[11px] opacity-95">{businessAddress}</p>
          <div className="flex flex-wrap gap-2.5 text-[11px] opacity-90 pt-0.5">
            {businessPhone && <span>Phone: {businessPhone}</span>}
            {businessEmail && <span>Email: {businessEmail}</span>}
          </div>
          <p className="text-[10px] opacity-90 font-mono">
            NTN/GST: {businessTaxNo} | Drug Lic: {drugLicenseNo}
          </p>
        </div>

        <div className="text-right flex-shrink-0 space-y-0.5">
          <span className="text-[10.5px] font-black bg-white/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider block text-center border border-white/30">
            {invoice.transactionType || printConf.transactionTitle || 'TAX INVOICE'}
          </span>
          <p className="text-[11px] font-mono font-bold">Inv #: {invoice.invoiceNumber}</p>
          <p className="text-[10.5px] opacity-90">Date: {invoice.date ? invoice.date.slice(0, 10) : ''}</p>
          <p className="text-[9.5px] opacity-85">Type: {invoice.paymentType || 'Cash'}</p>
        </div>
      </div>
    </div>
  );

  const renderCustomer = () => (
    <div key="CUSTOMER" className="mb-3">
      <div 
        className="grid grid-cols-2 gap-3 p-2.5 rounded-xl border text-xs"
        style={{ backgroundColor: `${activeThemeColor}08`, borderColor: `${activeThemeColor}25` }}
      >
        <div>
          <span className="font-bold uppercase tracking-wider text-[9.5px] block mb-0.5" style={{ color: activeThemeColor }}>
            Billed To (خریدار تفصیل):
          </span>
          <div className="font-bold text-xs text-slate-900">{invoice.customerName}</div>
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
              {invoice.balanceDue > 0 ? 'Pending' : 'Settled'}
            </strong>
          </div>
          {invoice.balanceDue > 0 && (
            <div className="text-slate-600 text-[11px] mt-0.5">
              Balance Due: <strong className="text-rose-700">{curr} {invoice.balanceDue.toLocaleString()}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderItems = () => (
    <div key="ITEMS" className="mb-3">
      <div className="w-full overflow-hidden border border-slate-200 rounded-lg">
        <table className="w-full text-left text-[11px] border-collapse table-auto">
          <thead>
            <tr 
              className="font-bold text-slate-800"
              style={{ backgroundColor: `${activeThemeColor}14` }}
            >
              {cols.serialNo !== false && <th className="px-1.5 py-1 text-center w-6">#</th>}
              <th className="px-1.5 py-1">Item Description</th>
              <th className="px-1.5 py-1 text-center w-16">Batch</th>
              <th className="px-1.5 py-1 text-center w-14">Exp</th>
              <th className="px-1.5 py-1 text-right w-10">Qty</th>
              <th className="px-1.5 py-1 text-right w-16">Rate</th>
              <th className="px-1.5 py-1 text-right w-20">Amount ({curr})</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-slate-100">
                {cols.serialNo !== false && <td className="px-1.5 py-1 text-center font-mono text-slate-500 text-[10px]">{idx + 1}</td>}
                <td className="px-1.5 py-1 font-bold text-slate-900 leading-tight">{item.name}</td>
                <td className="px-1.5 py-1 text-center font-mono text-[10px] text-slate-600">{item.batchNumber || '-'}</td>
                <td className="px-1.5 py-1 text-center font-mono text-[10px] text-slate-600">{item.expiryDate ? item.expiryDate.slice(0, 7) : '-'}</td>
                <td className="px-1.5 py-1 text-right font-bold text-slate-900">{item.quantity}</td>
                <td className="px-1.5 py-1 text-right font-mono text-[10.5px]">{(item.sellingPrice || item.pricePerUnit || 0).toLocaleString()}</td>
                <td className="px-1.5 py-1 text-right font-bold font-mono text-[11px]">{(item.total || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWarrantyTerms = () => (
    <div key="WARRANTY_TERMS" className="mb-3 space-y-1.5">
      {printConf.theme === 'A4_PHARMA_WHOLESALE' && (
        <div className="p-2 bg-emerald-50/80 border border-emerald-300 rounded-lg text-[10px] text-emerald-950 leading-tight">
          <span className="font-bold block text-emerald-900">Form 2-A Statutory Drug Warranty (Section 23 of Drug Act 1976):</span>
          We hereby certify and warrant that the drugs and pharmaceutical preparations specified in this sale invoice do not contravene Section 23 of the Drug Act, 1976.
        </div>
      )}
      {printConf.printTerms && (
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-0.5">
          <span className="font-bold text-slate-700 block">Terms & Conditions:</span>
          <p className="text-slate-600 whitespace-pre-line leading-tight">
            {printConf.termsAndConditions || 'Goods once sold will not be returned without original cash receipt.'}
          </p>
        </div>
      )}
    </div>
  );

  const renderTotalsBank = () => (
    <div key="TOTALS_BANK" className="mb-3 grid grid-cols-2 gap-3 text-xs">
      <div>
        {printConf.printBankDetails && printConf.bankDetailsText && (
          <div 
            className="p-2 rounded-lg border text-[10px] space-y-0.5"
            style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
          >
            <span className="font-bold block" style={{ color: activeThemeColor }}>
              Bank Details for Remittance:
            </span>
            <p className="whitespace-pre-line font-mono text-[9.5px] text-slate-700 leading-tight">
              {printConf.bankDetailsText}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1 font-medium text-right">
        <div className="flex justify-between text-slate-600 text-[11px]">
          <span>Sub Total:</span>
          <span className="font-mono">{curr} {(invoice.subTotal || 0).toLocaleString()}</span>
        </div>
        <div 
          className="flex justify-between text-xs font-black text-white p-2 rounded-lg shadow-2xs"
          style={{ backgroundColor: activeThemeColor }}
        >
          <span>Grand Total:</span>
          <span className="font-mono text-sm">{curr} {(invoice.grandTotal || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[11px] pt-0.5">
          <span className="text-slate-600">Received Amount:</span>
          <span className="font-mono font-bold text-emerald-700">{curr} {(invoice.receivedAmount || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div key="SIGNATURES" className="mb-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-[10.5px] text-slate-500">
      <div>
        <div className="h-6 border-b border-dashed border-slate-400 mx-auto w-28"></div>
        <span className="mt-0.5 block font-medium">Customer's Signature</span>
      </div>
      <div>
        <div className="h-6 border-b border-dashed border-slate-400 mx-auto w-28"></div>
        <span className="mt-0.5 block font-medium">For {businessName}</span>
      </div>
    </div>
  );

  const renderSectionById = (secId: string) => {
    switch (secId) {
      case 'HEADER': return renderHeader();
      case 'CUSTOMER': return renderCustomer();
      case 'ITEMS': return renderItems();
      case 'WARRANTY_TERMS': return renderWarrantyTerms();
      case 'TOTALS_BANK': return renderTotalsBank();
      case 'SIGNATURES': return renderSignatures();
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-6xl w-full h-[92vh] border border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide">A4 Print Preview & Viewport</h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Lock Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">Simulated A4 viewport — drag dynamic sections and verify layout</p>
            </div>
          </div>

          {/* Scale & Actions Toolbar */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-bold px-1">Scale:</span>
              <button
                onClick={() => setAutoScale(!autoScale)}
                className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                  autoScale ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto-Fit
              </button>
              <button
                onClick={() => { setAutoScale(false); setScaleFactor(s => Math.max(0.65, Number((s - 0.05).toFixed(2)))); }}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-blue-400 w-12 text-center">
                {Math.round(scaleFactor * 100)}%
              </span>
              <button
                onClick={() => { setAutoScale(false); setScaleFactor(s => Math.min(1.0, Number((s + 0.05).toFixed(2)))); }}
                className="p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleSendToPrinter}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Confirm & Print</span>
            </button>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body Split: Left Viewport (A4 Sheet) & Right Section Manager */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
          
          {/* LEFT: Simulated A4 Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start bg-slate-950/80">
            
            {/* Simulated A4 Paper Frame */}
            <div 
              ref={a4PageRef}
              id="a4-simulated-viewport"
              className="bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-300 p-6 sm:p-8 w-full max-w-[794px] min-h-[1080px] relative flex flex-col justify-between transition-all duration-200"
              style={{
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Printable Page Content */}
              <div>
                {sectionOrder.map(secId => renderSectionById(secId))}
              </div>

              {/* LOCKED DEVELOPER CREDIT FOOTER (MANDATORY & GUARANTEED AT BOTTOM) */}
              <div className="mt-auto pt-4 border-t-2 border-slate-300 text-center font-bold text-slate-900 text-[11px] space-y-0.5 uppercase tracking-wide bg-slate-50/50 p-2.5 rounded-lg relative group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1 shadow-2xs">
                  <Lock className="w-2.5 h-2.5" /> LOCKED SYSTEM BRANDING
                </div>
                <p className="text-xs font-black text-slate-900 pt-1">
                  {printConf.customFooterShopNote || 'THANKS FOR SHOPPING!'}
                </p>
                <p className="text-[11px] font-black text-slate-800">
                  {printConf.developerCreditText || 'DEVELOPED BY MBI INVENTRA - M BILAL INAYAT 0328-1302636'}
                </p>
              </div>

            </div>
          </div>

          {/* RIGHT: Dynamic Section Manager Sidebar */}
          <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 overflow-y-auto flex-shrink-0 text-white space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-blue-400 tracking-wider mb-1">
                Dynamic Section Layout
              </h3>
              <p className="text-[11px] text-slate-400">
                Move layout blocks up or down to customize invoice structure.
              </p>
            </div>

            <div className="space-y-2">
              {sectionOrder.map((secId, idx) => {
                const names: Record<string, string> = {
                  HEADER: '1. Header Banner & Store Info',
                  CUSTOMER: '2. Billed To Customer Details',
                  ITEMS: '3. Itemized Product Table',
                  WARRANTY_TERMS: '4. Statutory Warranty & Terms',
                  TOTALS_BANK: '5. Totals & Bank Accounts',
                  SIGNATURES: '6. Signatures Block',
                };
                return (
                  <div 
                    key={secId}
                    className="flex items-center justify-between p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/80 text-xs font-bold"
                  >
                    <div className="flex items-center gap-2 text-slate-200 truncate">
                      <GripVertical className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{names[secId] || secId}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'UP')}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={idx === sectionOrder.length - 1}
                        onClick={() => moveSection(idx, 'DOWN')}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Permanent Footer Guard Box */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-amber-200 text-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-400">
                <Shield className="w-4 h-4" /> System Footer Lock Active
              </div>
              <p className="text-[11px] leading-tight text-amber-200/80">
                The mandatory footer signature <strong className="text-white">Developed by MBI Inventra</strong> remains pinned at the bottom of the A4 page regardless of section reordering.
              </p>
            </div>

            <button
              onClick={() => setSectionOrder(DEFAULT_SECTION_ORDER)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Section Order
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
