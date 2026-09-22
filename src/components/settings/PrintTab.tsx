import React, { useState, useRef } from 'react';
import { 
  Printer, CheckCircle2, ChevronRight, Palette, Layout as LayoutIcon, 
  FileText, Download, QrCode, Building, Phone, Mail, MapPin, 
  Check, Eye, Sparkles, X, Edit3, ShieldCheck, ZoomIn, ZoomOut, RotateCcw,
  Sliders, SlidersHorizontal, Table, DollarSign, Award, HelpCircle, Shield, Lock, AlertTriangle
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { printHtmlElement, captureElementAsPDF, triggerFileDownload } from '../../lib/invoiceExport';
import { PageSetupDialog } from './PageSetupDialog';
import { PrintPreviewModal } from '../sales/PrintPreviewModal';

const A4_TEMPLATES = [
  { 
    id: 'A4_CLASSIC_TAX', 
    name: 'Classic Tax Invoice', 
    style: 'Tax & GST Grid Banner', 
    description: 'Traditional invoice with full-width color header banner, structured tax columns, and dual party panels.'
  },
  { 
    id: 'A4_PHARMA_WHOLESALE', 
    name: 'Pharma Wholesale', 
    style: 'Batch, Expiry & Drug Lic', 
    description: 'Designed for pharmaceutical suppliers with Drug License badge, Batch/Exp highlight, and warranty clause.'
  },
  { 
    id: 'A4_MODERN_MINIMAL', 
    name: 'Modern Minimalist', 
    style: 'Clean Contemporary Lines', 
    description: 'Refined typography, elegant thin dividers, accent top line, and spacious aesthetic without heavy blocks.'
  },
  { 
    id: 'A4_CORPORATE_BOXED', 
    name: 'Corporate Boxed', 
    style: 'Structured Border Grid', 
    description: 'High-contrast architectural frame with bordered sections, corporate accounts, and double-line totals.'
  },
  { 
    id: 'A4_COMPACT_PROFESSIONAL', 
    name: 'Compact Professional', 
    style: 'High-Density Item Ledger', 
    description: 'Compact rows and condensed spacing to fit 20-40 line items on a single page without wasted paper.'
  },
];

const THERMAL_THEMES = [
  { 
    id: 'THERMAL_CLASSIC', 
    name: 'Thermal Classic POS', 
    style: 'Standard 3-Inch POS Receipt', 
    description: 'Dashed line separators, centered store header, itemized list, and grand total.'
  },
  { 
    id: 'THERMAL_PHARMA', 
    name: 'Thermal Pharma Slip', 
    style: 'Batch & Expiry POS Ticket', 
    description: 'Pharmacy ticket with Rx badge, Drug License number, and Batch/Expiry under each item.'
  },
  { 
    id: 'THERMAL_MINIMAL', 
    name: 'Thermal Minimalist', 
    style: 'Fast 2-Inch / 3-Inch Slip', 
    description: 'Ultra-clean layout for high-speed thermal printers with clean condensed typography.'
  },
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

export interface ReadyMadePreset {
  id: string;
  name: string;
  urduName: string;
  badge: string;
  badgeColor: string;
  accentColor: string;
  description: string;
  theme: 'A4_PHARMA_WHOLESALE' | 'A4_CLASSIC_TAX' | 'A4_CORPORATE_BOXED' | 'A4_COMPACT_PROFESSIONAL' | 'A4_MODERN_MINIMAL';
  paperSize: 'A4';
  invoiceTextSize: 'Large' | 'Medium' | 'Small';
  companyNameSize: 'Large' | 'Medium' | 'Small';
  transactionTitle: string;
  printOriginalDuplicate: boolean;
  repeatHeader: boolean;
  tableColumns: {
    serialNo: boolean;
    itemName: boolean;
    hsnSac: boolean;
    batchNo: boolean;
    expDate: boolean;
    mfgDate: boolean;
    mrp: boolean;
    quantity: boolean;
    unit: boolean;
    price: boolean;
    discount: boolean;
    taxPercent: boolean;
    taxAmount: boolean;
    total: boolean;
  };
  taxDetails: boolean;
  youSaved: boolean;
  receivedAmount: boolean;
  balanceAmount: boolean;
  currentPartyBalance: boolean;
  printTerms: boolean;
  termsAndConditions: string;
  printSignatureText: boolean;
  signatureText: string;
  printBankDetails: boolean;
  bankDetailsText: string;
  printQrCode: boolean;
  features: string[];
}

export const A4_READY_MADE_PRESETS: ReadyMadePreset[] = [
  {
    id: 'A4_READY_PHARMA_WHOLESALE',
    name: '1. Pharma Wholesale & Drug Act',
    urduName: 'فارما ہول سیل و ڈرگ ایکٹ 1976 وارنٹی',
    badge: 'Wholesale B2B',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accentColor: '#059669',
    description: 'Designed for medicine distribution with Batch, Expiry, Form 2-A Drug Warranty (Section 23 of Drug Act 1976), Bank Details & Wholesale Trade Prices.',
    theme: 'A4_PHARMA_WHOLESALE',
    paperSize: 'A4',
    invoiceTextSize: 'Medium',
    companyNameSize: 'Large',
    transactionTitle: 'TAX & DRUG WARRANTY INVOICE',
    printOriginalDuplicate: true,
    repeatHeader: true,
    tableColumns: {
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
      taxAmount: false,
      total: true
    },
    taxDetails: true,
    youSaved: false,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    printTerms: true,
    termsAndConditions: '1. FORM 2-A DRUG WARRANTY: We hereby give warranty under Section 23 of the Drug Act, 1976 that the drugs sold under this invoice do not contravene any provisions of Section 23.\n2. Goods once sold will not be returned or exchanged without batch verification within 7 days.\n3. Payment strictly due within 15 days of invoice date.',
    printSignatureText: true,
    signatureText: 'Authorized Pharmacist / Distributor',
    printBankDetails: true,
    bankDetailsText: 'Bank: Meezan Bank Limited\nTitle: MBI Inventra Pharma Distributors\nIBAN: PK42MEZN00012345678901',
    printQrCode: false,
    features: ['Drug Act 1976 Form 2-A Clause', 'Batch & Expiry Highlight', 'Wholesale Trade Price & GST', 'Party Ledger Balance']
  },
  {
    id: 'A4_READY_RETAIL_CHEMIST',
    name: '2. Retail Pharmacy & Chemist Memo',
    urduName: 'میڈیکل اسٹور و کیمسٹ کیش میمو',
    badge: 'Retail Pharmacy',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    accentColor: '#2563eb',
    description: 'Patient-friendly retail bill featuring Retail MRP, Batch, Expiry, Customer Discount, "You Saved" highlight badge, and return rules.',
    theme: 'A4_CLASSIC_TAX',
    paperSize: 'A4',
    invoiceTextSize: 'Medium',
    companyNameSize: 'Large',
    transactionTitle: 'RETAIL CASH SALE MEMO',
    printOriginalDuplicate: true,
    repeatHeader: true,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: false,
      batchNo: true,
      expDate: true,
      mfgDate: false,
      mrp: true,
      quantity: true,
      unit: true,
      price: true,
      discount: true,
      taxPercent: false,
      taxAmount: false,
      total: true
    },
    taxDetails: false,
    youSaved: true,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: false,
    printTerms: true,
    termsAndConditions: '1. Medicines can be returned/exchanged within 3 days with original cash memo.\n2. Cut-strip blister packs, insulin, and refrigerated injections are non-returnable.\n3. Store medicines in a cool, dry place below 25°C.',
    printSignatureText: true,
    signatureText: 'Store Pharmacist / Cashier',
    printBankDetails: false,
    bankDetailsText: '',
    printQrCode: true,
    features: ['Retail MRP & Patient Savings', 'Batch/Expiry for Safety', 'Return Policy & QR Code', 'Cash Received & Change Returned']
  },
  {
    id: 'A4_READY_SURGICAL_HOSPITAL',
    name: '3. Surgical & Hospital Equipment',
    urduName: 'سرجیکل و ہسپتال کارپوریٹ سپلائی',
    badge: 'Hospital Supply',
    badgeColor: 'bg-slate-200 text-slate-800 border-slate-400',
    accentColor: '#334155',
    description: 'Institutional corporate supply invoice with HSN Code 9018, Lot/Batch, Sterility Expiry, Dual Party Box, itemized GST % & GST Amount.',
    theme: 'A4_CORPORATE_BOXED',
    paperSize: 'A4',
    invoiceTextSize: 'Medium',
    companyNameSize: 'Large',
    transactionTitle: 'COMMERCIAL TAX & INSTITUTIONAL SUPPLY INVOICE',
    printOriginalDuplicate: true,
    repeatHeader: true,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: true,
      batchNo: true,
      expDate: true,
      mfgDate: false,
      mrp: false,
      quantity: true,
      unit: true,
      price: true,
      discount: false,
      taxPercent: true,
      taxAmount: true,
      total: true
    },
    taxDetails: true,
    youSaved: false,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    printTerms: true,
    termsAndConditions: '1. Certified that goods supplied adhere to hospital procurement specifications and technical standards.\n2. All surgical instruments covered under 1-year sterilization replacement warranty.\n3. Institutional payment terms: 30 days against hospital inspection certificate.',
    printSignatureText: true,
    signatureText: 'Authorized Institutional Officer',
    printBankDetails: true,
    bankDetailsText: 'Bank: Habib Bank Limited (HBL)\nTitle: MBI Inventra Surgical Supply\nAccount #: 0123-4567890123\nNTN: 4928172-9 | STRN: 3277876123456',
    printQrCode: false,
    features: ['HSN Code 9018 for Surgical', 'Itemized GST % & GST Amount', 'Corporate Institutional Boxes', 'Official Hospital Seal & Stamp']
  },
  {
    id: 'A4_READY_COMPACT_LEDGER',
    name: '4. Compact 30+ Items Ledger',
    urduName: 'کمپیکٹ فل شیٹ ہائی ڈینسٹی',
    badge: 'High Density (30+ Items)',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    accentColor: '#0d9488',
    description: 'High-density compact layout engineered to fit 25 to 35+ items on a single A4 page with slim headers and zero wasted paper.',
    theme: 'A4_COMPACT_PROFESSIONAL',
    paperSize: 'A4',
    invoiceTextSize: 'Small',
    companyNameSize: 'Medium',
    transactionTitle: 'COMPACT SALE LEDGER',
    printOriginalDuplicate: false,
    repeatHeader: true,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: false,
      batchNo: true,
      expDate: false,
      mfgDate: false,
      mrp: false,
      quantity: true,
      unit: true,
      price: true,
      discount: true,
      taxPercent: false,
      taxAmount: false,
      total: true
    },
    taxDetails: false,
    youSaved: false,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    printTerms: true,
    termsAndConditions: 'Goods received in sound condition. Errors and omissions excepted (E.&O.E.).',
    printSignatureText: true,
    signatureText: 'Authorized Signature',
    printBankDetails: false,
    bankDetailsText: '',
    printQrCode: false,
    features: ['Fits 30+ items on 1 page', 'High-density condensed rows', 'Slim header ribbon', 'Zero wasted paper']
  },
  {
    id: 'A4_READY_MODERN_MINIMAL',
    name: '5. Modern Minimalist Clinic',
    urduName: 'ماڈرن کلینک و لیب انوائس',
    badge: 'Clean Contemporary',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    accentColor: '#4f46e5',
    description: 'Contemporary aesthetic with colored accent bar, spacious typography, physician signature block, and digital QR verification.',
    theme: 'A4_MODERN_MINIMAL',
    paperSize: 'A4',
    invoiceTextSize: 'Medium',
    companyNameSize: 'Large',
    transactionTitle: 'HEALTHCARE INVOICE & RECEIPT',
    printOriginalDuplicate: true,
    repeatHeader: true,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: false,
      batchNo: false,
      expDate: false,
      mfgDate: false,
      mrp: false,
      quantity: true,
      unit: true,
      price: true,
      discount: true,
      taxPercent: false,
      taxAmount: false,
      total: true
    },
    taxDetails: false,
    youSaved: false,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: false,
    printTerms: true,
    termsAndConditions: 'Thank you for consulting with us. For medical assistance and appointments, please contact our helpline.',
    printSignatureText: true,
    signatureText: 'Consultant Physician / In-Charge',
    printBankDetails: false,
    bankDetailsText: '',
    printQrCode: true,
    features: ['Top Colored Accent Stripe', 'Borderless Sleek Typography', 'Physician Signature Block', 'QR Code Verification']
  },
  {
    id: 'A4_READY_MONOCHROME_BW',
    name: '6. Pure Black & White (Zero Ink Waste / Laser / Thermal)',
    urduName: 'خالص بلیک اینڈ وائٹ (بغیر رنگین سیاہی ضیاع)',
    badge: '100% B&W / Zero Ink',
    badgeColor: 'bg-slate-100 text-slate-900 border-slate-400',
    accentColor: '#000000',
    description: '100% high-contrast monochrome invoice. Eliminates color ink consumption completely, razor-sharp on laser, inkjet, and thermal printers.',
    theme: 'A4_CLASSIC_TAX',
    paperSize: 'A4',
    invoiceTextSize: 'Medium',
    companyNameSize: 'Large',
    transactionTitle: 'TAX INVOICE / CASH MEMO',
    printOriginalDuplicate: true,
    repeatHeader: true,
    tableColumns: {
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
      taxAmount: false,
      total: true
    },
    taxDetails: true,
    youSaved: false,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    printTerms: true,
    termsAndConditions: '1. Goods once sold will not be returned without original cash receipt.\n2. Please check expiry date and pack integrity upon purchase.',
    printSignatureText: true,
    signatureText: 'Authorized Signatory',
    printBankDetails: true,
    bankDetailsText: 'Bank: Meezan Bank Limited\nTitle: MBI Inventra\nIBAN: PK42MEZN00012345678901',
    printQrCode: false,
    features: ['100% Black & White', 'Zero Color Ink Consumption', 'Ultra-sharp text & borders', 'Thermal & Laser Friendly']
  }
];

export const PrintTab: React.FC = () => {
  const { settings, updatePrint, updateItem } = useSettings();
  const { business } = useAuth();

  const [activeTab, setActiveTab] = useState<'presets' | 'theme' | 'header' | 'columns' | 'totals' | 'footer'>('presets');
  const [zoom, setZoom] = useState<number>(90);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [guardNotice, setGuardNotice] = useState<string | null>(null);

  const MANDATORY_CREDIT = "DEVELOPED BY MBI INVENTRA - M BILAL INAYAT 0328-1302636";

  const handleDeveloperCreditChange = (val: string) => {
    const requiredTokens = ["MBI INVENTRA", "M BILAL INAYAT", "0328-1302636"];
    const isMissingToken = requiredTokens.some(token => !val.toUpperCase().includes(token.toUpperCase()));

    if (isMissingToken || !val.trim()) {
      updatePrint({ developerCreditText: MANDATORY_CREDIT });
      setGuardNotice("🔒 Logic Guard Active: Mandatory 'DEVELOPED BY MBI INVENTRA' credit is protected and cannot be deleted.");
      setTimeout(() => setGuardNotice(null), 4000);
    } else {
      updatePrint({ developerCreditText: val });
    }
  };

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const printConf = settings.print;
  const billPrintRef = useRef<HTMLDivElement>(null);

  const activeThemeColor = printConf.themeColor || '#2563eb';
  const curr = settings.general?.currencySymbol || 'Rs.';

  const isMonochromeOrWhite = 
    activeThemeColor.toLowerCase() === '#ffffff' || 
    activeThemeColor.toLowerCase() === '#fff' || 
    activeThemeColor.toLowerCase() === 'white' || 
    activeThemeColor.toLowerCase() === '#000000' || 
    activeThemeColor.toLowerCase() === '#000' || 
    activeThemeColor.toLowerCase() === 'black' ||
    printConf.theme === ('A4_READY_MONOCHROME_BW' as any);

  // 1-Click Apply Ready-Made Preset
  const applyReadyMadePreset = (preset: ReadyMadePreset) => {
    updatePrint({
      printerType: 'REGULAR',
      paperSize: 'A4',
      theme: preset.theme,
      themeColor: preset.accentColor,
      companyNameSize: preset.companyNameSize,
      invoiceTextSize: preset.invoiceTextSize,
      transactionTitle: preset.transactionTitle,
      printOriginalDuplicate: preset.printOriginalDuplicate,
      repeatHeader: preset.repeatHeader,
      tableColumns: { ...preset.tableColumns },
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
    showToast(`Template "${preset.name}" applied successfully!`);
  };

  // Print Sample Bill only (isolated from the UI)
  const handlePrintSample = () => {
    if (billPrintRef.current) {
      printHtmlElement(
        billPrintRef.current, 
        `Sample_Invoice_${printConf.theme}`, 
        printConf.printerType === 'THERMAL',
        isMonochromeOrWhite
      );
      showToast('Clean print window opened!');
    } else {
      window.print();
    }
  };

  // Download high-resolution sample PDF
  const handleDownloadSample = async () => {
    if (!billPrintRef.current) return;
    setIsExporting(true);
    try {
      const fileName = `Sample_Invoice_${printConf.theme}.pdf`;
      const { blob } = await captureElementAsPDF(
        billPrintRef.current, 
        fileName, 
        printConf.printerType === 'THERMAL'
      );
      triggerFileDownload(blob, fileName);
      showToast('Sample PDF invoice downloaded!');
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Quick Preset Handlers for Table Columns
  const handleSetColumnsPreset = (type: 'all' | 'pharma' | 'retail') => {
    if (type === 'all') {
      updatePrint({
        tableColumns: {
          serialNo: true,
          itemName: true,
          hsnSac: true,
          batchNo: true,
          expDate: true,
          mfgDate: true,
          mrp: true,
          quantity: true,
          unit: true,
          price: true,
          discount: true,
          taxPercent: true,
          taxAmount: true,
          total: true,
        }
      });
      showToast('All columns enabled');
    } else if (type === 'pharma') {
      updatePrint({
        tableColumns: {
          serialNo: true,
          itemName: true,
          hsnSac: true,
          batchNo: true,
          expDate: true,
          mfgDate: false,
          mrp: true,
          quantity: true,
          unit: true,
          price: true,
          discount: true,
          taxPercent: true,
          taxAmount: false,
          total: true,
        }
      });
      showToast('Pharma Wholesale columns preset applied');
    } else {
      updatePrint({
        tableColumns: {
          serialNo: true,
          itemName: true,
          hsnSac: false,
          batchNo: false,
          expDate: false,
          mfgDate: false,
          mrp: false,
          quantity: true,
          unit: true,
          price: true,
          discount: true,
          taxPercent: true,
          taxAmount: false,
          total: true,
        }
      });
      showToast('Standard Retail columns preset applied');
    }
  };

  return (
    <div className="space-y-4 text-slate-800 text-[13px] relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Printer Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Printer Type:</span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                updatePrint({ 
                  printerType: 'REGULAR',
                  theme: printConf.theme.startsWith('THERMAL') ? 'A4_CLASSIC_TAX' : printConf.theme,
                  paperSize: 'A4'
                });
                showToast('Switched to Standard Regular (A4 / A5) Printer');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printConf.printerType === 'REGULAR' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>A4 / Regular Printer</span>
            </button>

            <button
              onClick={() => {
                updatePrint({ 
                  printerType: 'THERMAL',
                  theme: !printConf.theme.startsWith('THERMAL') ? 'THERMAL_CLASSIC' : printConf.theme,
                  paperSize: 'Thermal 80mm'
                });
                showToast('Switched to POS Thermal Receipt Printer');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                printConf.printerType === 'THERMAL' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Thermal POS (80mm / 58mm)</span>
            </button>
          </div>
        </div>

        {/* Current Active Indicator & Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Zoom controls for Preview */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-xl border border-slate-200 p-0.5 text-xs text-slate-600">
            <button
              onClick={() => setZoom(z => Math.max(60, z - 10))}
              className="p-1.5 hover:bg-white rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(140, z + 10))}
              className="p-1.5 hover:bg-white rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(85)}
              className="px-2 py-1 hover:bg-white rounded-lg transition text-slate-600 hover:text-slate-900 border-l border-slate-200 text-[10px] font-bold cursor-pointer"
              title="Fit to screen (85%)"
            >
              Fit
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 hover:bg-white rounded-lg transition text-slate-400 hover:text-slate-700 border-l border-slate-200 cursor-pointer"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setIsPageSetupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer border border-slate-300"
            title="Configure print margins, page breaks and scale to fit"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>Page Setup</span>
          </button>

          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Open simulated A4 viewport print preview modal with drag-and-drop sections"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>A4 Viewport Preview</span>
          </button>

          <button
            onClick={handleDownloadSample}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Download high-resolution sample PDF"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{isExporting ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrintSample}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
            title="Print clean invoice without page UI"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sample Bill</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace:
          LEFT COLUMN: Live Real-time Interactive Bill Preview (Requested by user)
          RIGHT COLUMN: Customization Bar / Settings Options (Direct live changes)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================================
            LEFT COLUMN (7 cols): LIVE REAL-TIME BILL PREVIEW
            ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-2">
          
          {/* Document Preview Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white rounded-t-2xl shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Live Invoice Preview (Left Side)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-mono bg-slate-700 text-slate-200 border border-slate-600">
                {printConf.printerType === 'REGULAR' ? printConf.paperSize : 'Thermal Roll'} • {printConf.theme.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Simulated Workspace Canvas */}
          <div className="bg-slate-200/80 rounded-b-2xl border border-slate-300 shadow-inner p-3 sm:p-6 overflow-x-auto min-h-[680px] flex justify-center items-start">
            
            {/* Zoom Transform Wrapper */}
            <div 
              style={{ 
                transform: `scale(${zoom / 100})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out' 
              }}
              className="w-full flex justify-center"
            >
              
              {/* =========================================================
                  PRINTABLE BILL ROOT (Target of printHtmlElement & captureElementAsPDF)
                  ========================================================= */}
              <div 
                ref={billPrintRef}
                id="invoice-sample-document"
                data-print-theme={isMonochromeOrWhite ? 'white' : activeThemeColor}
                data-monochrome={isMonochromeOrWhite ? 'true' : 'false'}
                className={`printable-bill-root bg-white shadow-2xl transition-all duration-200 select-text ${
                  printConf.printerType === 'THERMAL'
                    ? 'w-[320px] p-4 text-slate-900 font-mono text-[11px] border border-slate-300 rounded-sm'
                    : printConf.paperSize === 'A5'
                    ? 'w-full max-w-[560px] p-4 sm:p-6 text-slate-900 font-sans text-xs border border-slate-300 rounded-sm'
                    : 'w-full max-w-[800px] p-4 sm:p-7 text-slate-900 font-sans text-xs border border-slate-300 rounded-sm'
                }`}
                style={{
                  fontSize: printConf.invoiceTextSize === 'Large' ? '13px' : printConf.invoiceTextSize === 'Small' ? '11px' : '12px'
                }}
              >
                
                {/* -------------------------------------------------------------
                    A. THERMAL RECEIPT LAYOUTS (3 Themes)
                    ------------------------------------------------------------- */}
                {printConf.printerType === 'THERMAL' ? (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
                      {printConf.showCompanyName && (
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                          {printConf.companyName || business?.name || 'MBI INVENTRA PHARMA'}
                        </h2>
                      )}
                      {printConf.showAddress && (
                        <p className="text-[10px] text-slate-600 leading-tight">
                          {printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}
                        </p>
                      )}
                      <div className="flex justify-center gap-2 text-[10px] text-slate-600">
                        {printConf.showPhone && <span>Tel: {printConf.phone || '03364585863'}</span>}
                      </div>

                      {/* Pharma specific header badge */}
                      {printConf.theme === 'THERMAL_PHARMA' && (
                        <div className="mt-1 pt-1 border-t border-dashed border-slate-300">
                          <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            Rx PHARMACY POS • LIC #{business?.drugLicenseNo || 'DL-09-2024-MBI'}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 pt-0.5">
                        *** {printConf.transactionTitle || 'CASH SALE MEMO'} ***
                      </p>
                      <p className="text-[9.5px] text-slate-500">
                        Inv #: <strong className="text-slate-800">INV-2026-0042</strong> | Date: 13/09/2026
                      </p>
                      <p className="text-[9.5px] text-slate-600">Customer: <strong>Cash Customer (واک ان گاہک)</strong></p>
                    </div>

                    {/* Items Table */}
                    <div className="py-1 border-b border-dashed border-slate-400">
                      <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-slate-200">
                        <span className="w-1/2">ITEM</span>
                        <span className="w-1/4 text-center">QTY x RATE</span>
                        <span className="w-1/4 text-right">AMOUNT</span>
                      </div>

                      <div className="divide-y divide-slate-100 py-1 space-y-1">
                        <div>
                          <div className="flex justify-between font-bold text-slate-900 pt-1">
                            <span className="w-1/2 truncate">1. Panadol Extra 500mg</span>
                            <span className="w-1/4 text-center font-mono">10 x 45</span>
                            <span className="w-1/4 text-right font-mono">Rs. 450</span>
                          </div>
                          {printConf.theme === 'THERMAL_PHARMA' && (
                            <p className="text-[9px] text-emerald-700 pl-3">Batch: PE-8821 | Exp: 12/28</p>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-900 pt-1">
                            <span className="w-1/2 truncate">2. Augmentin 625mg Tab</span>
                            <span className="w-1/4 text-center font-mono">2 x 350</span>
                            <span className="w-1/4 text-right font-mono">Rs. 700</span>
                          </div>
                          {printConf.theme === 'THERMAL_PHARMA' && (
                            <p className="text-[9px] text-emerald-700 pl-3">Batch: AG-3301 | Exp: 09/27</p>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between font-bold text-slate-900 pt-1">
                            <span className="w-1/2 truncate">3. Surgical Cotton Roll</span>
                            <span className="w-1/4 text-center font-mono">1 x 250</span>
                            <span className="w-1/4 text-right font-mono">Rs. 250</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="space-y-1 text-[11px] pt-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">Rs. 1,400.00</span>
                      </div>
                      {printConf.taxDetails && (
                        <div className="flex justify-between text-slate-600 text-[10px]">
                          <span>GST / Sales Tax (18%):</span>
                          <span className="font-mono">Rs. 252.00</span>
                        </div>
                      )}
                      {printConf.youSaved && (
                        <div className="flex justify-between text-emerald-700 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                          <span>🎉 You Saved:</span>
                          <span className="font-mono font-bold">Rs. 70.00</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-xs pt-1 border-t-2 border-slate-900 text-slate-900">
                        <span>NET TOTAL:</span>
                        <span className="font-mono text-sm">Rs. 1,582.00</span>
                      </div>
                      {printConf.receivedAmount && (
                        <div className="flex justify-between text-[10px] text-slate-700 pt-0.5">
                          <span>Cash Received:</span>
                          <span className="font-mono font-bold text-emerald-700">Rs. 2,000.00</span>
                        </div>
                      )}
                      {printConf.balanceAmount && (
                        <div className="flex justify-between text-[10px] text-slate-700">
                          <span>Change Returned:</span>
                          <span className="font-mono font-bold text-slate-900">Rs. 418.00</span>
                        </div>
                      )}
                      {printConf.currentPartyBalance && (
                        <div className="flex justify-between text-[9.5px] text-slate-500 pt-1 border-t border-slate-200">
                          <span>Ledger Balance:</span>
                          <span className="font-mono font-bold">Rs. 0.00 (Nil)</span>
                        </div>
                      )}
                    </div>

                    {/* Bank & Terms */}
                    {printConf.printBankDetails && (
                      <div className="p-1.5 bg-slate-50 rounded border border-dashed border-slate-300 text-[9.5px] text-slate-600">
                        <p className="font-bold text-slate-800">Bank Details:</p>
                        <p className="whitespace-pre-line leading-tight font-mono">{printConf.bankDetailsText}</p>
                      </div>
                    )}

                    {printConf.printQrCode && (
                      <div className="flex justify-center items-center gap-2 py-1">
                        <div className="p-1 border border-slate-300 bg-white rounded">
                          <QrCode className="w-10 h-10 text-slate-900" />
                        </div>
                        <span className="text-[9px] text-slate-500">Scan to verify invoice / digital receipt</span>
                      </div>
                    )}

                    {printConf.printTerms && (
                      <div className="text-[9px] text-slate-500 pt-1 border-t border-dashed border-slate-300 text-center leading-tight">
                        <p className="font-bold">Terms:</p>
                        <p>{printConf.termsAndConditions}</p>
                      </div>
                    )}

                    {/* Mandatory Permanent Footer */}
                    <div className="text-center pt-2.5 mt-2 border-t-2 border-slate-900 text-[10px] text-slate-900 font-bold uppercase tracking-wider space-y-0.5">
                      <p className="font-black text-[11px] text-slate-900">THANKS FOR SHOPPING!</p>
                      <p className="font-extrabold text-[9.5px] text-slate-800">DEVELOPED BY MBI INVENTRA</p>
                      <p className="font-extrabold text-[9.5px] text-slate-800">M BILAL INAYAT 0328-1302636</p>
                    </div>
                  </div>
                ) : (
                  /* -------------------------------------------------------------
                      B. STANDARD A4 / A5 LAYOUTS (5 Dedicated Themes)
                      ------------------------------------------------------------- */
                  <div className="space-y-4">
                    
                    {/* Top Watermark / Original Stamp without template name */}
                    {printConf.printOriginalDuplicate && (
                      <div className="flex justify-end items-center text-xs pb-1 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 border border-slate-300 rounded text-slate-700 bg-slate-50">
                          Original For Recipient (اصل کاپی)
                        </span>
                      </div>
                    )}

                    {/* THEME 1: A4_CLASSIC_TAX (Rich Color Banner & Structured Tax Grid) */}
                    {printConf.theme === 'A4_CLASSIC_TAX' && (
                      <div className="space-y-4">
                        <div 
                          className={`p-5 rounded-2xl flex items-start justify-between gap-4 shadow-sm ${
                            isMonochromeOrWhite 
                              ? 'bg-white border-2 border-black text-black' 
                              : 'text-white'
                          }`}
                          style={isMonochromeOrWhite ? undefined : { backgroundColor: activeThemeColor }}
                        >
                          <div className="space-y-1 min-w-0">
                            {printConf.showCompanyName && (
                              <h1 className={`font-black uppercase tracking-wide truncate ${
                                isMonochromeOrWhite ? 'text-black' : ''
                              } ${
                                printConf.companyNameSize === 'Large' ? 'text-2xl' : 
                                printConf.companyNameSize === 'Small' ? 'text-base' : 'text-xl'
                              }`}>
                                {printConf.companyName || business?.name || 'MBI INVENTRA PHARMA'}
                              </h1>
                            )}
                            {printConf.showAddress && (
                              <p className={`text-[11px] leading-relaxed ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-95'}`}>
                                {printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}
                              </p>
                            )}
                            <div className={`flex flex-wrap gap-3 text-[10.5px] pt-0.5 ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-90'}`}>
                              {printConf.showPhone && <span>Phone: {printConf.phone || '03364585863'}</span>}
                              {printConf.showEmail && <span>Email: {printConf.email || 'info@mbiinventra.com'}</span>}
                            </div>
                            <p className={`text-[10px] font-mono ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-90'}`}>
                              NTN/GST: {business?.taxNumber || '4928172-9'} | Drug Lic: {business?.drugLicenseNo || 'DL-09-2024-MBI'}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0 space-y-1">
                            <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider block text-center border ${
                              isMonochromeOrWhite 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white/20 backdrop-blur-xs px-3 py-1 rounded-lg border-white/30'
                            }`}>
                              {printConf.transactionTitle || 'TAX INVOICE'}
                            </span>
                            <p className={`text-[11px] font-mono font-bold ${isMonochromeOrWhite ? 'text-black' : 'opacity-95'}`}>Inv #: INV-2026-0042</p>
                            <p className={`text-[10.5px] ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-85'}`}>Date: 13/09/2026</p>
                            <p className={`text-[10px] ${isMonochromeOrWhite ? 'text-slate-800' : 'opacity-85'}`}>Payment: Credit (30 Days)</p>
                          </div>
                        </div>

                        {/* Classic Billed To & Shipped To Box */}
                        <div 
                          className={`grid grid-cols-2 gap-4 p-4 rounded-xl border text-xs ${
                            isMonochromeOrWhite ? 'border-2 border-black bg-white text-black' : ''
                          }`}
                          style={isMonochromeOrWhite ? undefined : { borderColor: `${activeThemeColor}40`, backgroundColor: `${activeThemeColor}08` }}
                        >
                          <div>
                            <span 
                              className="font-bold uppercase text-[10px] tracking-wider block mb-1" 
                              style={{ color: isMonochromeOrWhite ? '#000000' : activeThemeColor }}
                            >
                              Billed To (خریدار تفصیل):
                            </span>
                            <div className="font-bold text-slate-900 text-sm">CLASSIC MEDICAL & SURGICAL STORE</div>
                            <p className="text-slate-600 text-[11px] mt-0.5">Shop #14, Al-Razi Medical Complex, Sargodha</p>
                            <p className="text-slate-600 text-[10.5px]">Phone: 0300-1234567 | NTN: 3277876-1</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-slate-600"><span className="font-semibold">Payment Status:</span> <strong className="text-emerald-700">Verified Credit</strong></p>
                            <p className="text-slate-600"><span className="font-semibold">Invoice Due Date:</span> 28/09/2026</p>
                            <p className="text-slate-600"><span className="font-semibold">Place of Supply:</span> Punjab (04)</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THEME 2: A4_PHARMA_WHOLESALE (Pharmaceutical License Focus & Left Border Accent) */}
                    {printConf.theme === 'A4_PHARMA_WHOLESALE' && (
                      <div className="space-y-4">
                        <div 
                          className="p-5 rounded-2xl bg-white border-2 flex items-start justify-between gap-4 shadow-sm border-l-8"
                          style={{ 
                            borderLeftColor: activeThemeColor,
                            borderColor: `${activeThemeColor}30`
                          }}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white"
                                style={{ backgroundColor: activeThemeColor }}
                              >
                                WHOLESALE PHARMACEUTICAL DISTRIBUTOR
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                DRUG ACT 1976 COMPLIANT
                              </span>
                            </div>

                            {printConf.showCompanyName && (
                              <h1 className={`font-black uppercase tracking-wide truncate text-slate-900 ${
                                printConf.companyNameSize === 'Large' ? 'text-2xl' : 
                                printConf.companyNameSize === 'Small' ? 'text-base' : 'text-xl'
                              }`}>
                                {printConf.companyName || business?.name || 'MBI PHARMA DISTRIBUTORS (PVT) LTD'}
                              </h1>
                            )}
                            {printConf.showAddress && (
                              <p className="text-[11px] text-slate-600">{printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}</p>
                            )}
                            <div className="flex flex-wrap gap-3 text-[10.5px] text-slate-700 pt-0.5">
                              {printConf.showPhone && <span>Ph: {printConf.phone || '03364585863'}</span>}
                              {printConf.showEmail && <span>Email: {printConf.email || 'pharma@mbiinventra.com'}</span>}
                            </div>
                            <p className="text-[10.5px] font-bold font-mono text-emerald-800">
                              Drug Lic #: {business?.drugLicenseNo || 'DL-09-2024-MBI'} | NTN: {business?.taxNumber || '4928172-9'}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0 space-y-1">
                            <span 
                              className="text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider block text-center text-white shadow-xs"
                              style={{ backgroundColor: activeThemeColor }}
                            >
                              {printConf.transactionTitle || 'SALE TAX INVOICE'}
                            </span>
                            <p className="text-[11px] font-mono font-bold text-slate-900">Batch Inv: PH-2026-0042</p>
                            <p className="text-[10px] text-slate-500">Date: 13/09/2026</p>
                          </div>
                        </div>

                        {/* Chemist / Hospital Box */}
                        <div 
                          className="p-3.5 rounded-xl border grid grid-cols-2 text-xs"
                          style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
                        >
                          <div>
                            <span className="font-bold text-[10px] uppercase tracking-wider block" style={{ color: activeThemeColor }}>
                              Hospital / Chemist Buyer:
                            </span>
                            <div className="font-bold text-slate-900 text-sm">CLASSIC MEDICAL & SURGICAL STORE</div>
                            <p className="text-slate-600 text-[11px]">Al-Razi Hospital Complex, Sargodha</p>
                            <p className="text-slate-600 text-[10.5px]">Buyer Drug Lic: DL-39281-SGA</p>
                          </div>
                          <div className="text-right flex flex-col justify-between">
                            <div>
                              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                                ✓ Chemist Drug License Verified
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">Supply Route: Direct Cold-Chain Van</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THEME 3: A4_MODERN_MINIMAL (Contemporary Typography, Clean Accent Border) */}
                    {printConf.theme === 'A4_MODERN_MINIMAL' && (
                      <div className="space-y-4">
                        {/* Top Accent Strip */}
                        <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: activeThemeColor }}></div>

                        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
                          <div className="space-y-1 min-w-0">
                            {printConf.showCompanyName && (
                              <h1 className={`font-light tracking-wider uppercase text-slate-900 ${
                                printConf.companyNameSize === 'Large' ? 'text-2xl' : 
                                printConf.companyNameSize === 'Small' ? 'text-base' : 'text-xl'
                              }`}>
                                {printConf.companyName || business?.name || 'MBI INVENTRA'}
                              </h1>
                            )}
                            {printConf.showAddress && (
                              <p className="text-[11px] text-slate-500 font-light">{printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}</p>
                            )}
                            <div className="flex gap-3 text-[10.5px] text-slate-500 font-light">
                              {printConf.showPhone && <span>{printConf.phone || '03364585863'}</span>}
                              {printConf.showEmail && <span>{printConf.email || 'info@mbiinventra.com'}</span>}
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <span 
                              className="text-xs font-mono font-bold tracking-widest uppercase block"
                              style={{ color: activeThemeColor }}
                            >
                              {printConf.transactionTitle || 'INVOICE'}
                            </span>
                            <p className="text-[11px] font-mono font-bold text-slate-800"># INV-2026-0042</p>
                            <p className="text-[10px] text-slate-400">13 Sep 2026</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pb-1">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Billed To</span>
                            <span className="font-bold text-slate-800 text-sm">CLASSIC MEDICAL & SURGICAL STORE</span>
                            <p className="text-slate-500 text-[11px]">Al-Razi Complex, Sargodha</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Due Date</span>
                            <span className="font-medium text-slate-800">28 Sep 2026</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THEME 4: A4_CORPORATE_BOXED (Structured Architectural Panels) */}
                    {printConf.theme === 'A4_CORPORATE_BOXED' && (
                      <div className="space-y-4">
                        <div 
                          className="p-5 rounded-xl border-2 flex items-start justify-between gap-4 shadow-sm"
                          style={{ borderColor: activeThemeColor }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white"
                                style={{ backgroundColor: activeThemeColor }}
                              >
                                ENTERPRISE ACCOUNT
                              </span>
                            </div>
                            {printConf.showCompanyName && (
                              <h1 className={`font-black uppercase tracking-wider text-slate-900 ${
                                printConf.companyNameSize === 'Large' ? 'text-2xl' : 
                                printConf.companyNameSize === 'Small' ? 'text-base' : 'text-xl'
                              }`}>
                                {printConf.companyName || business?.name || 'MBI CORPORATE PHARMA'}
                              </h1>
                            )}
                            <p className="text-[11px] text-slate-600">{printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'}</p>
                            <p className="text-[10px] text-slate-500">Corporate & Institutional Sales Division</p>
                          </div>

                          <div 
                            className="p-3 rounded-lg border text-right space-y-0.5"
                            style={{ borderColor: `${activeThemeColor}40`, backgroundColor: `${activeThemeColor}0a` }}
                          >
                            <span className="text-xs font-black uppercase block" style={{ color: activeThemeColor }}>
                              {printConf.transactionTitle || 'CORPORATE INVOICE'}
                            </span>
                            <p className="text-xs font-mono font-bold text-slate-900">INV-2026-0042</p>
                            <p className="text-[10px] text-slate-600">PO Ref: PO-8912</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="p-3 border-2 border-slate-300 rounded-xl">
                            <span className="font-bold uppercase text-[10px] text-slate-500 block mb-1">Client Institution:</span>
                            <p className="font-bold text-slate-900">CLASSIC MEDICAL & SURGICAL STORE</p>
                            <p className="text-slate-600 text-[11px]">Sargodha Medical District</p>
                          </div>
                          <div className="p-3 border-2 border-slate-300 rounded-xl text-right">
                            <span className="font-bold uppercase text-[10px] text-slate-500 block mb-1">Payment Schedule:</span>
                            <p className="font-bold text-slate-900">Net 30 Days Institutional</p>
                            <p className="text-slate-600 text-[11px]">Payment Due: 28/09/2026</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* THEME 5: A4_COMPACT_PROFESSIONAL (High Density Item Ledger) */}
                    {printConf.theme === 'A4_COMPACT_PROFESSIONAL' && (
                      <div className="space-y-2">
                        <div 
                          className="p-3 rounded-xl text-white flex items-center justify-between gap-4 shadow-xs"
                          style={{ backgroundColor: activeThemeColor }}
                        >
                          <div className="space-y-0.5 min-w-0">
                            {printConf.showCompanyName && (
                              <h1 className="text-base font-black uppercase tracking-wide truncate">
                                {printConf.companyName || business?.name || 'MBI INVENTRA PHARMA'}
                              </h1>
                            )}
                            <p className="text-[10.5px] opacity-90 leading-none">
                              {printConf.address || 'MBI Corporate Plaza, Commercial Center, Lahore'} | Ph: {printConf.phone || '03364585863'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-[11px] font-black bg-white/20 px-2.5 py-0.5 rounded uppercase block">
                              {printConf.transactionTitle || 'COMPACT LEDGER'}
                            </span>
                            <span className="text-[10px] font-mono opacity-90">#INV-2026-0042</span>
                          </div>
                        </div>

                        <div className="p-2 bg-slate-100 rounded-lg text-xs flex justify-between border border-slate-200">
                          <div><strong className="text-slate-700">Party:</strong> CLASSIC MEDICAL & SURGICAL STORE (Sargodha)</div>
                          <div><strong className="text-slate-700">Date:</strong> 13/09/2026 | <strong className="text-slate-700">Terms:</strong> Credit</div>
                        </div>
                      </div>
                    )}

                    {/* =========================================================
                        DYNAMIC ITEMS TABLE (Reflects tableColumns in real-time)
                        ========================================================= */}
                    <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse min-w-full">
                        <thead>
                          <tr 
                            className="font-bold border-b border-slate-300 text-slate-800"
                            style={{ 
                              backgroundColor: printConf.theme === 'A4_MODERN_MINIMAL' 
                                ? '#f8fafc' 
                                : `${activeThemeColor}14`
                            }}
                          >
                            {printConf.tableColumns.serialNo && <th className="px-2 py-1.5 text-center w-8 whitespace-nowrap">#</th>}
                            {printConf.tableColumns.itemName && <th className="px-2 py-1.5 min-w-[130px]">Item Description</th>}
                            {printConf.tableColumns.hsnSac && <th className="px-2 py-1.5 whitespace-nowrap">HSN</th>}
                            {printConf.tableColumns.batchNo && <th className="px-2 py-1.5 whitespace-nowrap">Batch</th>}
                            {printConf.tableColumns.expDate && <th className="px-2 py-1.5 whitespace-nowrap">Exp</th>}
                            {printConf.tableColumns.mfgDate && <th className="px-2 py-1.5 whitespace-nowrap">Mfg</th>}
                            {printConf.tableColumns.mrp && <th className="px-2 py-1.5 text-right whitespace-nowrap">MRP</th>}
                            {printConf.tableColumns.unit && <th className="px-2 py-1.5 text-center whitespace-nowrap">Unit</th>}
                            {printConf.tableColumns.quantity && <th className="px-2 py-1.5 text-right whitespace-nowrap">Qty</th>}
                            {printConf.tableColumns.price && <th className="px-2 py-1.5 text-right whitespace-nowrap">Rate</th>}
                            {printConf.tableColumns.discount && <th className="px-2 py-1.5 text-right whitespace-nowrap">Disc %</th>}
                            {printConf.tableColumns.taxPercent && <th className="px-2 py-1.5 text-right whitespace-nowrap">GST %</th>}
                            {printConf.tableColumns.taxAmount && <th className="px-2 py-1.5 text-right whitespace-nowrap">GST Amt</th>}
                            {printConf.tableColumns.total && <th className="px-2 py-1.5 text-right whitespace-nowrap">Total ({curr})</th>}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                          {/* Row 1 */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            {printConf.tableColumns.serialNo && <td className="px-2 py-1.5 text-center font-mono text-slate-500 whitespace-nowrap">1</td>}
                            {printConf.tableColumns.itemName && (
                              <td className="px-2 py-1.5 font-bold text-slate-900 min-w-[130px]">
                                Surgical Scalpel Handle #4 (Carbon Steel)
                                <span className="block text-[9.5px] font-normal text-slate-400">Box of 100 sterile units</span>
                              </td>
                            )}
                            {printConf.tableColumns.hsnSac && <td className="px-2 py-1.5 font-mono whitespace-nowrap">9018</td>}
                            {printConf.tableColumns.batchNo && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">SC-2409</td>}
                            {printConf.tableColumns.expDate && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">08/29</td>}
                            {printConf.tableColumns.mfgDate && <td className="px-2 py-1.5 font-mono text-slate-500 whitespace-nowrap">09/24</td>}
                            {printConf.tableColumns.mrp && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">550.00</td>}
                            {printConf.tableColumns.unit && <td className="px-2 py-1.5 text-center text-slate-600 whitespace-nowrap">Box</td>}
                            {printConf.tableColumns.quantity && <td className="px-2 py-1.5 text-right font-bold text-slate-900 whitespace-nowrap">10</td>}
                            {printConf.tableColumns.price && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">450.00</td>}
                            {printConf.tableColumns.discount && <td className="px-2 py-1.5 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">5%</td>}
                            {printConf.tableColumns.taxPercent && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">18%</td>}
                            {printConf.tableColumns.taxAmount && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">769.50</td>}
                            {printConf.tableColumns.total && <td className="px-2 py-1.5 text-right font-bold font-mono text-slate-900 whitespace-nowrap">5,044.50</td>}
                          </tr>

                          {/* Row 2 */}
                          <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            {printConf.tableColumns.serialNo && <td className="px-2 py-1.5 text-center font-mono text-slate-500 whitespace-nowrap">2</td>}
                            {printConf.tableColumns.itemName && (
                              <td className="px-2 py-1.5 font-bold text-slate-900 min-w-[130px]">
                                Artery Forceps Straight 6" Stainless
                                <span className="block text-[9.5px] font-normal text-slate-400">German grade autoclavable</span>
                              </td>
                            )}
                            {printConf.tableColumns.hsnSac && <td className="px-2 py-1.5 font-mono whitespace-nowrap">9018</td>}
                            {printConf.tableColumns.batchNo && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">AF-1102</td>}
                            {printConf.tableColumns.expDate && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">12/30</td>}
                            {printConf.tableColumns.mfgDate && <td className="px-2 py-1.5 font-mono text-slate-500 whitespace-nowrap">01/25</td>}
                            {printConf.tableColumns.mrp && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">1,000.00</td>}
                            {printConf.tableColumns.unit && <td className="px-2 py-1.5 text-center text-slate-600 whitespace-nowrap">Pcs</td>}
                            {printConf.tableColumns.quantity && <td className="px-2 py-1.5 text-right font-bold text-slate-900 whitespace-nowrap">5</td>}
                            {printConf.tableColumns.price && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">850.00</td>}
                            {printConf.tableColumns.discount && <td className="px-2 py-1.5 text-right font-mono text-slate-400 whitespace-nowrap">0%</td>}
                            {printConf.tableColumns.taxPercent && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">18%</td>}
                            {printConf.tableColumns.taxAmount && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">765.00</td>}
                            {printConf.tableColumns.total && <td className="px-2 py-1.5 text-right font-bold font-mono text-slate-900 whitespace-nowrap">5,015.00</td>}
                          </tr>

                          {/* Row 3 */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            {printConf.tableColumns.serialNo && <td className="px-2 py-1.5 text-center font-mono text-slate-500 whitespace-nowrap">3</td>}
                            {printConf.tableColumns.itemName && (
                              <td className="px-2 py-1.5 font-bold text-slate-900 min-w-[130px]">
                                Sterile Disposable Examination Gloves (M)
                                <span className="block text-[9.5px] font-normal text-slate-400">Nitrile powder-free pack of 100</span>
                              </td>
                            )}
                            {printConf.tableColumns.hsnSac && <td className="px-2 py-1.5 font-mono whitespace-nowrap">4015</td>}
                            {printConf.tableColumns.batchNo && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">GL-9932</td>}
                            {printConf.tableColumns.expDate && <td className="px-2 py-1.5 font-mono text-slate-600 whitespace-nowrap">05/29</td>}
                            {printConf.tableColumns.mfgDate && <td className="px-2 py-1.5 font-mono text-slate-500 whitespace-nowrap">06/24</td>}
                            {printConf.tableColumns.mrp && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">1,400.00</td>}
                            {printConf.tableColumns.unit && <td className="px-2 py-1.5 text-center text-slate-600 whitespace-nowrap">Box</td>}
                            {printConf.tableColumns.quantity && <td className="px-2 py-1.5 text-right font-bold text-slate-900 whitespace-nowrap">2</td>}
                            {printConf.tableColumns.price && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">1,200.00</td>}
                            {printConf.tableColumns.discount && <td className="px-2 py-1.5 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">10%</td>}
                            {printConf.tableColumns.taxPercent && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">18%</td>}
                            {printConf.tableColumns.taxAmount && <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">388.80</td>}
                            {printConf.tableColumns.total && <td className="px-2 py-1.5 text-right font-bold font-mono text-slate-900 whitespace-nowrap">2,548.80</td>}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* =========================================================
                        SUMMARY, TOTALS, BANK & LEGAL FOOTER
                        ========================================================= */}
                    <div className="grid grid-cols-2 gap-6 pt-3">
                      
                      {/* Left Side: Bank Details, Terms & QR */}
                      <div className="space-y-3 text-[11px]">
                        
                        {/* Bank Details */}
                        {printConf.printBankDetails && (
                          <div 
                            className="p-3 rounded-xl border space-y-1"
                            style={{ borderColor: `${activeThemeColor}30`, backgroundColor: `${activeThemeColor}06` }}
                          >
                            <p className="font-bold flex items-center gap-1.5" style={{ color: activeThemeColor }}>
                              <Building className="w-3.5 h-3.5" />
                              Bank Account Details For Remittance:
                            </p>
                            <p className="text-slate-700 font-mono text-[10.5px] whitespace-pre-line leading-relaxed">
                              {printConf.bankDetailsText || 'Bank: Meezan Bank Ltd\nAccount: 0214-01039847291\nTitle: MBI Corporate Pvt Ltd'}
                            </p>
                          </div>
                        )}

                        {/* Terms & Conditions */}
                        {printConf.printTerms && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                            <p className="font-bold text-slate-800">Terms & Conditions:</p>
                            <p className="text-[10px] whitespace-pre-line leading-relaxed">
                              {printConf.termsAndConditions || '1. Goods once sold will not be returned without original cash memo.\n2. Warranty claims require serial number and original box.\n3. Dispute jurisdiction: Local courts only.'}
                            </p>
                          </div>
                        )}

                        {/* QR Code Stamp */}
                        {printConf.printQrCode && (
                          <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="p-1 bg-white border border-slate-300 rounded-lg">
                              <QrCode className="w-10 h-10 text-slate-900" />
                            </div>
                            <div className="text-[10px] text-slate-500">
                              <p className="font-bold text-slate-800">FBR / Digital Verification QR</p>
                              <p>Scan to verify invoice authenticity</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Totals Calculation */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Sub Total:</span>
                          <span className="font-mono font-bold text-slate-800">Rs. 10,925.00</span>
                        </div>

                        {printConf.taxDetails && (
                          <div className="flex justify-between text-slate-600">
                            <span>Total GST / Sales Tax (18%):</span>
                            <span className="font-mono font-bold text-slate-800">Rs. 1,683.30</span>
                          </div>
                        )}

                        {printConf.youSaved && (
                          <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <span>🎉 Total Savings / Discount:</span>
                            <span className="font-mono font-bold">Rs. 465.00</span>
                          </div>
                        )}

                        {/* Grand Total Box (Uses active theme color or pure B&W) */}
                        <div 
                          className={`flex justify-between text-sm font-black p-3 rounded-xl shadow-xs ${
                            isMonochromeOrWhite 
                              ? 'border-2 border-black bg-white text-black' 
                              : 'text-white'
                          }`}
                          style={isMonochromeOrWhite ? undefined : { backgroundColor: activeThemeColor }}
                        >
                          <span>Grand Total (کل رقم):</span>
                          <span className="font-mono text-base">Rs. 12,608.30</span>
                        </div>

                        {printConf.receivedAmount && (
                          <div className="flex justify-between text-slate-700 font-semibold pt-1">
                            <span>Received Amount:</span>
                            <span className="font-mono text-emerald-700 font-bold">Rs. 12,000.00</span>
                          </div>
                        )}

                        {printConf.balanceAmount && (
                          <div className="flex justify-between text-slate-700 font-semibold">
                            <span>Balance Due:</span>
                            <span className="font-mono text-rose-600 font-bold">Rs. 608.30</span>
                          </div>
                        )}

                        {printConf.currentPartyBalance && (
                          <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                            <span>Party Current Ledger Balance:</span>
                            <span className="font-mono font-bold text-slate-800">Rs. 15,608.30</span>
                          </div>
                        )}

                        {/* Signatures */}
                        {printConf.printSignatureText && (
                          <div className="pt-8 text-right">
                            <div className="inline-block border-t-2 border-slate-700 pt-1 text-center min-w-[160px]">
                              <p className="font-bold text-slate-900 text-xs">
                                {printConf.signatureText || 'Authorized Signatory'}
                              </p>
                              <p className="text-[9.5px] text-slate-500">
                                For {printConf.companyName || business?.name || 'MBI Inventra'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mandatory Permanent System Branding Footer */}
                      <div className="mt-6 pt-3 border-t-2 border-slate-300 text-center font-bold text-slate-900 text-xs space-y-0.5 tracking-wide uppercase">
                        <p className="text-sm font-black text-slate-900">THANKS FOR SHOPPING!</p>
                        <p className="text-xs font-black text-slate-800">DEVELOPED BY MBI INVENTRA</p>
                        <p className="text-xs font-black text-slate-800">M BILAL INAYAT 0328-1302636</p>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (5 cols): PRINT CUSTOMIZATION BAR
            User: "me print ke is baar me chagnig karta ho ro left side bill me live change ho"
            ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4 sticky top-4">
          
          {/* Customization Bar Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            
            {/* Header & Tabs */}
            <div className="space-y-3 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h3 className="font-black text-slate-900 text-sm">Print Customization Bar</h3>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  Live Sync
                </span>
              </div>

              {/* Navigation Tabs for Customization Bar */}
              <div className="grid grid-cols-6 gap-1 p-1 bg-slate-100 rounded-xl text-center text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab('presets')}
                  className={`py-1.5 px-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'presets' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                  title="5 Ready-Made Templates"
                >
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  <span className="truncate">Ready (5)</span>
                </button>
                <button
                  onClick={() => setActiveTab('theme')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'theme' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theme
                </button>
                <button
                  onClick={() => setActiveTab('header')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'header' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Header
                </button>
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'columns' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Columns
                </button>
                <button
                  onClick={() => setActiveTab('totals')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'totals' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Totals
                </button>
                <button
                  onClick={() => setActiveTab('footer')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'footer' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Footer
                </button>
              </div>
            </div>

            {/* TAB 0: 5 READY-MADE A4 TEMPLATES (1-CLICK SETUP) */}
            {activeTab === 'presets' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3 bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>5 Ready-Made A4 Templates (تیار شدہ ٹیمپلیٹس)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Select any pre-configured template below to instantly load its layout theme, colors, columns, return policy, and warranty clauses.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {A4_READY_MADE_PRESETS.map((preset) => {
                    const isCurrentActive = printConf.theme === preset.theme;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => applyReadyMadePreset(preset)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                          isCurrentActive 
                            ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20' 
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{preset.name}</span>
                              <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${preset.badgeColor}`}>
                                {preset.badge}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500 font-urdu mt-0.5">
                              {preset.urduName}
                            </div>
                          </div>
                          <div 
                            className="w-4 h-4 rounded-full border border-white shadow-xs shrink-0 mt-0.5"
                            style={{ backgroundColor: preset.accentColor }}
                            title={`Color: ${preset.accentColor}`}
                          />
                        </div>

                        <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                          {preset.description}
                        </p>

                        {/* Features Tags */}
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {preset.features.map((feat, i) => (
                            <span key={i} className="text-[9.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              ✓ {feat}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            applyReadyMadePreset(preset);
                          }}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isCurrentActive 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                          }`}
                        >
                          {isCurrentActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active Template (یہ لاگو ہے)</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Apply Template (سیٹ کریں)</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 1: THEMES & APPEARANCE */}
            {activeTab === 'theme' && (
              <div className="space-y-4 animate-in fade-in">
                
                {/* Template Selection List */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Select Invoice Template ({printConf.printerType === 'REGULAR' ? '5 A4 Themes' : '3 POS Themes'}):
                  </label>
                  
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {(printConf.printerType === 'REGULAR' ? A4_TEMPLATES : THERMAL_THEMES).map(tmpl => {
                      const isSelected = printConf.theme === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => {
                            updatePrint({ theme: tmpl.id });
                            showToast(`Template changed to ${tmpl.name}`);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{tmpl.name}</span>
                              {isSelected && (
                                <span className="p-0.5 bg-blue-600 text-white rounded-full">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-blue-700 block">{tmpl.style}</span>
                            <p className="text-[10.5px] text-slate-500 leading-snug">{tmpl.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette (Applied Live to Left Bill) */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-blue-600" />
                      Theme Color Accent:
                    </label>
                    <span className="text-[10.5px] font-mono font-bold text-slate-500">
                      {activeThemeColor}
                    </span>
                  </div>

                  {/* 1-Click Black & White Mode Toggle Button */}
                  <div className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      <strong className="text-slate-900 block font-bold">100% Black & White Print Mode</strong>
                      <span className="text-[11px] text-slate-600">Save color ink, high contrast monochrome for laser & thermal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        updatePrint({ themeColor: '#000000' });
                        showToast('Pure Black & White print mode activated!');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isMonochromeOrWhite 
                          ? 'bg-black text-white shadow-xs ring-2 ring-slate-400' 
                          : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      {isMonochromeOrWhite ? '✓ B&W Active' : 'Enable B&W'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map(c => {
                      const isSelected = activeThemeColor.toLowerCase() === c.hex.toLowerCase();
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            updatePrint({ themeColor: c.hex });
                            showToast(`Color changed to ${c.name}`);
                          }}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-slate-900 ring-2 ring-slate-400 bg-slate-50 font-bold' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span 
                            className="w-4 h-4 rounded-full flex-shrink-0 shadow-2xs" 
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[10.5px] truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Hex Color Picker */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500">Custom Color:</span>
                    <input
                      type="color"
                      value={activeThemeColor}
                      onChange={(e) => updatePrint({ themeColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={activeThemeColor}
                      onChange={(e) => updatePrint({ themeColor: e.target.value })}
                      placeholder="#2563eb"
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Paper Size & Font Scale */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Paper Format</label>
                    <select
                      value={printConf.paperSize}
                      onChange={(e: any) => updatePrint({ paperSize: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="A4">A4 Standard (210 × 297 mm)</option>
                      <option value="A5">A5 Half Sheet (148 × 210 mm)</option>
                      <option value="Letter">Letter Format (8.5 × 11 in)</option>
                      <option value="Thermal 80mm">Thermal 80mm (3-Inch Roll)</option>
                      <option value="Thermal 58mm">Thermal 58mm (2-Inch Roll)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Font Size Scale</label>
                    <select
                      value={printConf.invoiceTextSize}
                      onChange={(e: any) => updatePrint({ invoiceTextSize: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="Small">Small (Compact 11px)</option>
                      <option value="Medium">Medium (Standard 12px)</option>
                      <option value="Large">Large (High Legibility 13px)</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: HEADER & BUSINESS DETAILS */}
            {activeTab === 'header' && (
              <div className="space-y-3.5 animate-in fade-in text-xs">
                
                {/* Business Name */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printConf.showCompanyName}
                      onChange={(e) => updatePrint({ showCompanyName: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Show Business Name on Bill</span>
                  </label>
                  {printConf.showCompanyName && (
                    <input
                      type="text"
                      value={printConf.companyName}
                      onChange={(e) => updatePrint({ companyName: e.target.value })}
                      placeholder="e.g. MBI Inventra Pharma Distributors"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  )}
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printConf.showAddress}
                      onChange={(e) => updatePrint({ showAddress: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Show Business Address</span>
                  </label>
                  {printConf.showAddress && (
                    <textarea
                      rows={2}
                      value={printConf.address}
                      onChange={(e) => updatePrint({ address: e.target.value })}
                      placeholder="Shop/Office Address..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  )}
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={printConf.showPhone}
                        onChange={(e) => updatePrint({ showPhone: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span>Print Phone</span>
                    </label>
                    {printConf.showPhone && (
                      <input
                        type="text"
                        value={printConf.phone}
                        onChange={(e) => updatePrint({ phone: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={printConf.showEmail}
                        onChange={(e) => updatePrint({ showEmail: e.target.checked })}
                        className="w-3.5 h-3.5 text-blue-600 rounded"
                      />
                      <span>Print Email</span>
                    </label>
                    {printConf.showEmail && (
                      <input
                        type="text"
                        value={printConf.email}
                        onChange={(e) => updatePrint({ email: e.target.value })}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    )}
                  </div>
                </div>

                {/* Transaction Title */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Invoice Heading Title (e.g. Tax Invoice, Cash Memo, Sale Bill):
                  </label>
                  <input
                    type="text"
                    value={printConf.transactionTitle}
                    onChange={(e) => updatePrint({ transactionTitle: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-900"
                  />
                </div>

                {/* Additional Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={printConf.printOriginalDuplicate}
                      onChange={(e) => updatePrint({ printOriginalDuplicate: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Print "Original For Recipient" Watermark Stamp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={printConf.repeatHeader}
                      onChange={(e) => updatePrint({ repeatHeader: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span>Repeat Header On Every Page (Multi-page Invoices)</span>
                  </label>
                </div>

              </div>
            )}

            {/* TAB 3: TABLE COLUMNS */}
            {activeTab === 'columns' && (
              <div className="space-y-3 animate-in fade-in text-xs">
                
                {/* Preset Actions */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                    Item Columns Visibility
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleSetColumnsPreset('pharma')}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[10.5px]"
                    >
                      Pharma Preset
                    </button>
                    <button
                      onClick={() => handleSetColumnsPreset('retail')}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold text-[10.5px]"
                    >
                      Retail Preset
                    </button>
                    <button
                      onClick={() => handleSetColumnsPreset('all')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10.5px]"
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* Checkbox Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { key: 'serialNo', label: 'Sr. No. (#)' },
                    { key: 'itemName', label: 'Item Description' },
                    { key: 'hsnSac', label: 'HSN / SAC Code' },
                    { key: 'batchNo', label: 'Batch Number' },
                    { key: 'expDate', label: 'Expiry Date' },
                    { key: 'mfgDate', label: 'Mfg Date' },
                    { key: 'mrp', label: 'MRP Price' },
                    { key: 'unit', label: 'Unit (Box/Pcs)' },
                    { key: 'quantity', label: 'Quantity (Qty)' },
                    { key: 'price', label: 'Unit Rate / Price' },
                    { key: 'discount', label: 'Discount %' },
                    { key: 'taxPercent', label: 'Tax Rate % (GST)' },
                    { key: 'taxAmount', label: 'Tax Amount' },
                    { key: 'total', label: 'Total Amount' },
                  ].map(col => {
                    const isChecked = col.key === 'discount'
                      ? ((printConf.tableColumns as any).discount !== false && settings.item?.itemWiseDiscount !== false)
                      : ((printConf.tableColumns as any)[col.key] ?? true);
                    return (
                    <label 
                      key={col.key} 
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-200 text-slate-900 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const val = e.target.checked;
                          updatePrint({
                            tableColumns: {
                              ...printConf.tableColumns,
                              [col.key]: val,
                            },
                          });
                          if (col.key === 'discount') {
                            updateItem({ itemWiseDiscount: val });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-[11px] truncate">{col.label}</span>
                    </label>
                  );})}
                </div>

              </div>
            )}

            {/* TAB 4: TOTALS & TAX */}
            {activeTab === 'totals' && (
              <div className="space-y-3 animate-in fade-in text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[11px] block pb-1 border-b border-slate-100">
                  Financial Totals & Badges
                </span>

                {[
                  { key: 'taxDetails', label: 'Print GST / Tax Breakdown Summary' },
                  { key: 'youSaved', label: 'Print "🎉 You Saved" Discount Savings Banner' },
                  { key: 'receivedAmount', label: 'Print Cash / Online Received Amount' },
                  { key: 'balanceAmount', label: 'Print Balance Amount Due' },
                  { key: 'currentPartyBalance', label: 'Print Party Total Ledger Current Balance' },
                  { key: 'amountWithDecimal', label: 'Display Currency with Decimals (.00)' },
                ].map(item => (
                  <label 
                    key={item.key} 
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-200 transition"
                  >
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={(printConf as any)[item.key]}
                      onChange={(e) => updatePrint({ [item.key]: e.target.checked } as any)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* TAB 5: FOOTER, BANK & LEGAL */}
            {activeTab === 'footer' && (
              <div className="space-y-3.5 animate-in fade-in text-xs">
                
                {/* Bank Details */}
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Bank Account Remittance Details</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printConf.printBankDetails}
                        onChange={(e) => updatePrint({ printBankDetails: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {printConf.printBankDetails && (
                    <textarea
                      rows={3}
                      value={printConf.bankDetailsText}
                      onChange={(e) => updatePrint({ bankDetailsText: e.target.value })}
                      placeholder="Bank Name, Account Number, IBAN..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                    />
                  )}
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Terms & Conditions</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printConf.printTerms}
                        onChange={(e) => updatePrint({ printTerms: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {printConf.printTerms && (
                    <textarea
                      rows={3}
                      value={printConf.termsAndConditions}
                      onChange={(e) => updatePrint({ termsAndConditions: e.target.value })}
                      placeholder="Return policy, warranty rules, jurisdiction..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  )}
                </div>

                {/* QR Code & Signatures */}
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl cursor-pointer border border-slate-200">
                    <span className="font-semibold text-slate-800">Print QR Code / Digital Verification Stamp</span>
                    <input
                      type="checkbox"
                      checked={printConf.printQrCode}
                      onChange={(e) => updatePrint({ printQrCode: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800">Print Signature Line</span>
                      <input
                        type="checkbox"
                        checked={printConf.printSignatureText}
                        onChange={(e) => updatePrint({ printSignatureText: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                    {printConf.printSignatureText && (
                      <input
                        type="text"
                        value={printConf.signatureText}
                        onChange={(e) => updatePrint({ signatureText: e.target.value })}
                        placeholder="Authorized Signatory"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs"
                      />
                    )}
                  </div>

                  {/* Custom Shop Greeting / Note */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Shop Custom Footer Note / Thank You Message
                    </label>
                    <input
                      type="text"
                      value={printConf.customFooterShopNote || 'THANKS FOR SHOPPING!'}
                      onChange={(e) => updatePrint({ customFooterShopNote: e.target.value })}
                      placeholder="e.g. THANKS FOR SHOPPING! / THANK YOU FOR VISITING!"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs uppercase text-amber-600 tracking-wide"
                    />
                  </div>

                  {/* Mandatory Permanent Developer Branding Footer with Logic Guard */}
                  <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Footer Configuration & Developer Credit</span>
                      </div>
                      <span className="text-[9.5px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-black border border-amber-500/30 uppercase tracking-wide flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Protected
                      </span>
                    </div>

                    {guardNotice && (
                      <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{guardNotice}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-[11px] text-slate-300 font-medium">
                        Developer Credit Text (Logic Guard Protected):
                      </label>
                      <input
                        type="text"
                        value={printConf.developerCreditText || MANDATORY_CREDIT}
                        onChange={(e) => handleDeveloperCreditChange(e.target.value)}
                        onBlur={(e) => handleDeveloperCreditChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg font-mono text-xs text-amber-300 font-bold tracking-wide"
                      />
                      <p className="text-[10px] text-slate-400 italic">
                        🛡️ Logic Guard active: Customizing text is allowed, but total deletion of 'DEVELOPED BY MBI INVENTRA - M BILAL INAYAT 0328-1302636' is automatically blocked.
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-center font-bold text-slate-100 text-[11px] space-y-0.5 uppercase tracking-wide">
                      <p className="text-amber-400 font-black">{printConf.customFooterShopNote || 'THANKS FOR SHOPPING!'}</p>
                      <p className="text-slate-200">{printConf.developerCreditText || MANDATORY_CREDIT}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Quick Info Card */}
          <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Real-time High-Resolution Printing
            </p>
            <p className="text-[11px] text-blue-800/90 leading-relaxed">
              Any changes made in this bar are instantly applied to your live invoice preview on the left and saved for all sales, purchases, and party ledger invoices.
            </p>
          </div>

        </div>

      </div>

      {/* Page Setup Dialog */}
      <PageSetupDialog 
        isOpen={isPageSetupOpen} 
        onClose={() => setIsPageSetupOpen(false)} 
      />

      {/* Simulated A4 Viewport Print Preview Modal */}
      {isPreviewModalOpen && (
        <PrintPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          invoice={{
            id: 'sample-inv-preview',
            invoiceNumber: 'INV-2026-0042',
            date: new Date().toISOString(),
            customerName: 'CLASSIC MEDICAL & SURGICAL STORE',
            customerPhone: '0300-1234567',
            customerAddress: 'Al-Razi Complex, Sargodha',
            items: [
              { id: '1', name: 'Panadol Extra 500mg (Paracetamol)', quantity: 10, sellingPrice: 350, pricePerUnit: 350, total: 3500, batchNumber: 'PND-9921', expiryDate: '2028-12-31', unit: 'Box', discountPercentage: 5, taxPercentage: 18 },
              { id: '2', name: 'Augmentin 625mg Tablets (Amoxicillin)', quantity: 5, sellingPrice: 1250, pricePerUnit: 1250, total: 6250, batchNumber: 'AUG-4012', expiryDate: '2027-08-30', unit: 'Box', discountPercentage: 0, taxPercentage: 18 },
              { id: '3', name: 'Surgical Gloves Sterile Powdered (Latex)', quantity: 20, sellingPrice: 180, pricePerUnit: 180, total: 3600, batchNumber: 'GLV-1102', expiryDate: '2029-05-15', unit: 'Pack', discountPercentage: 10, taxPercentage: 18 },
              { id: '4', name: 'Digital Blood Pressure Monitor (Arm Type)', quantity: 2, sellingPrice: 4500, pricePerUnit: 4500, total: 9000, batchNumber: 'BPM-8821', expiryDate: '2030-01-01', unit: 'Unit', discountPercentage: 0, taxPercentage: 18 }
            ],
            subTotal: 22350,
            discountAmount: 535,
            discountPercentage: 2.4,
            taxAmount: 3926,
            taxPercentage: 18,
            grandTotal: 25741,
            receivedAmount: 25741,
            balanceDue: 0,
            paymentType: 'Cash',
            transactionType: 'TAX INVOICE',
            description: '1. Certified adhering to procurement specifications.\n2. Warranty valid with original cash receipt.'
          }}
        />
      )}

    </div>
  );
};
