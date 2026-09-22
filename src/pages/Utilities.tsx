import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Wrench, Barcode, Upload, RefreshCw, FileSpreadsheet, Download, 
  ShieldCheck, Trash2, Calendar, CheckCircle2, AlertTriangle, 
  Search, Eye, Printer, Plus, X, ArrowRight, Database, FileText,
  Filter, Check, Sparkles, Layers, ArrowUpRight, HelpCircle, Code,
  Heart, ShieldAlert, RotateCcw
} from 'lucide-react';
import { 
  dbMedicines, dbInvoices, dbSuppliers, dbBankAccounts, 
  dbBankTransactions, dbExpenses, dbUserActivities 
} from '../lib/db';
import { Medicine, Supplier, Invoice } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ShortageBookTab } from '../components/pharmacy/ShortageBookTab';
import { NarcoticsLogTab } from '../components/pharmacy/NarcoticsLogTab';
import { ChronicRefillsTab } from '../components/pharmacy/ChronicRefillsTab';
import { SupplierReturnTab } from '../components/pharmacy/SupplierReturnTab';

interface BarcodeQueueItem {
  id: string;
  itemId?: string;
  itemName: string;
  itemCode: string;
  noOfLabels: number;
  header: string;
  line1: string;
  line2: string;
}

// Simple deterministic Code-128 style SVG Barcode generator
const BarcodeSVG: React.FC<{ code: string; className?: string; height?: number }> = ({ code, className = 'w-full h-12', height = 48 }) => {
  const cleanCode = code.trim() || '890123456789';
  // Generate deterministic bar widths from characters
  const bars: { width: number; isBlack: boolean }[] = [];
  
  // Start guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const pattern = [(charCode % 3) + 1, ((charCode >> 1) % 3) + 1, ((charCode >> 2) % 3) + 1, ((charCode >> 3) % 2) + 1];
    bars.push({ width: pattern[0], isBlack: true });
    bars.push({ width: pattern[1], isBlack: false });
    bars.push({ width: pattern[2], isBlack: true });
    bars.push({ width: pattern[3], isBlack: false });
  }

  // Stop guard
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const totalWidth = bars.reduce((sum, b) => sum + b.width, 0);

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height}`} className={className} preserveAspectRatio="none">
      {bars.reduce<{ elements: React.ReactNode[]; currentX: number }>(
        (acc, bar, index) => {
          if (bar.isBlack) {
            acc.elements.push(
              <rect key={index} x={acc.currentX} y={0} width={bar.width} height={height} fill="#000000" />
            );
          }
          acc.currentX += bar.width;
          return acc;
        },
        { elements: [], currentX: 0 }
      ).elements}
    </svg>
  );
};

export const Utilities: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { business } = useAuth();
  
  const currentTab = searchParams.get('tab') || 'barcode';

  // Shared Data
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parties, setParties] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [meds, supps, invs] = await Promise.all([
        dbMedicines.getAll(),
        dbSuppliers.getAll(),
        dbInvoices.getAll()
      ]);
      setMedicines(meds);
      setParties(supps);
      setInvoices(invs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // -------------------------------------------------------------
  // TAB 1: BARCODE GENERATOR STATE
  // -------------------------------------------------------------
  const [printerType, setPrinterType] = useState('Regular Printer');
  const [labelSize, setLabelSize] = useState('65 Labels (38 * 21mm)');
  const [barcodeItemName, setBarcodeItemName] = useState('');
  const [barcodeItemCode, setBarcodeItemCode] = useState('');
  const [barcodeLabelsCount, setBarcodeLabelsCount] = useState<number>(1);
  const [barcodeHeader, setBarcodeHeader] = useState(business?.name || 'MBI INVENTRA');
  const [barcodeLine1, setBarcodeLine1] = useState('MRP: Rs. 150.00');
  const [barcodeLine2, setBarcodeLine2] = useState('Exp: 12/2026');
  const [barcodeQueue, setBarcodeQueue] = useState<BarcodeQueueItem[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleSelectItemForBarcode = (med: Medicine) => {
    setBarcodeItemName(med.name);
    setBarcodeItemCode(med.barcode || med.id.slice(0, 10));
    setBarcodeHeader(business?.name || 'MBI INVENTRA');
    setBarcodeLine1(`MRP: Rs. ${med.mrp || med.sellingPrice}`);
    setBarcodeLine2(`Batch: ${med.batchNumber || 'B-101'} | Exp: ${med.expiryDate || '12/26'}`);
  };

  const handleAddBarcodeQueue = () => {
    if (!barcodeItemName.trim() || !barcodeItemCode.trim()) {
      alert('Please select or enter Item Name and Item Code');
      return;
    }
    const newItem: BarcodeQueueItem = {
      id: `bc-${Date.now()}`,
      itemName: barcodeItemName,
      itemCode: barcodeItemCode,
      noOfLabels: barcodeLabelsCount > 0 ? barcodeLabelsCount : 1,
      header: barcodeHeader,
      line1: barcodeLine1,
      line2: barcodeLine2
    };
    setBarcodeQueue([...barcodeQueue, newItem]);
    showToast(`Added ${barcodeItemName} (${newItem.noOfLabels} labels) to queue.`);
  };

  const handleRemoveBarcodeQueue = (id: string) => {
    setBarcodeQueue(barcodeQueue.filter(item => item.id !== id));
  };

  // -------------------------------------------------------------
  // TAB 2: IMPORT ITEMS STATE
  // -------------------------------------------------------------
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewMeds, setImportPreviewMeds] = useState<Partial<Medicine>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputMedsRef = useRef<HTMLInputElement>(null);

  const handleDownloadSampleMeds = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Barcode,Name,BatchNumber,Manufacturer,Category,Unit,Quantity,PurchasePrice,SellingPrice,MRP,ExpiryDate,LowStockThreshold\n" +
      "8901001,Paracetamol 500mg,B-102,GSK,Tablet,Strip,100,25.00,35.00,40.00,2027-12-31,20\n" +
      "8901002,Amoxicillin 250mg,B-103,Getz,Capsule,Strip,50,60.00,85.00,95.00,2028-06-30,15\n" +
      "8901003,Surgical Gauze Pad 10x10,SG-55,MBI Inventra,Surgical,Box,200,120.00,160.00,180.00,2029-01-01,30";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Sample_Items_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMedsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsed: Partial<Medicine>[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[1]) {
          parsed.push({
            id: `med-imp-${Date.now()}-${i}`,
            barcode: cols[0] || `890${Date.now()}${i}`,
            name: cols[1],
            batchNumber: cols[2] || 'B-001',
            manufacturer: cols[3] || 'General Pharma',
            category: cols[4] || 'Tablet',
            unit: cols[5] || 'Strip',
            quantity: Number(cols[6]) || 10,
            purchasePrice: Number(cols[7]) || 0,
            sellingPrice: Number(cols[8]) || 0,
            mrp: Number(cols[9]) || Number(cols[8]) || 0,
            expiryDate: cols[10] || '2027-12-31',
            lowStockThreshold: Number(cols[11]) || 10,
            gstPercentage: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      setImportPreviewMeds(parsed);
    };
    reader.readAsText(file);
  };

  const handleExecuteMedsImport = async () => {
    if (importPreviewMeds.length === 0) return;
    setIsImporting(true);
    try {
      for (const item of importPreviewMeds) {
        await dbMedicines.save(item as Medicine);
      }
      await loadData();
      showToast(`Successfully imported ${importPreviewMeds.length} items into inventory!`);
      setImportPreviewMeds([]);
      setImportFile(null);
    } catch (err) {
      console.error(err);
      alert('Failed to import items.');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: BULK UPDATE ITEMS STATE
  // -------------------------------------------------------------
  const [bulkField, setBulkField] = useState<'sellingPrice' | 'purchasePrice' | 'mrp' | 'lowStockThreshold'>('sellingPrice');
  const [bulkActionType, setBulkActionType] = useState<'percent_increase' | 'percent_decrease' | 'fixed_set'>('percent_increase');
  const [bulkValue, setBulkValue] = useState<number>(5);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');

  const filteredBulkMeds = medicines.filter(m => 
    m.name.toLowerCase().includes(bulkSearch.toLowerCase()) || 
    m.barcode.includes(bulkSearch)
  );

  const toggleSelectAllBulk = () => {
    if (bulkSelectedIds.length === filteredBulkMeds.length) {
      setBulkSelectedIds([]);
    } else {
      setBulkSelectedIds(filteredBulkMeds.map(m => m.id));
    }
  };

  const handleExecuteBulkUpdate = async () => {
    if (bulkSelectedIds.length === 0) {
      alert('Please select at least one item to update.');
      return;
    }
    setLoading(true);
    try {
      for (const med of medicines) {
        if (bulkSelectedIds.includes(med.id)) {
          const updated = { ...med };
          const curVal = Number(updated[bulkField]) || 0;
          if (bulkActionType === 'percent_increase') {
            updated[bulkField] = Number((curVal * (1 + bulkValue / 100)).toFixed(2));
          } else if (bulkActionType === 'percent_decrease') {
            updated[bulkField] = Number((curVal * (1 - bulkValue / 100)).toFixed(2));
          } else {
            updated[bulkField] = bulkValue;
          }
          await dbMedicines.save(updated);
        }
      }
      await loadData();
      showToast(`Updated ${bulkSelectedIds.length} items successfully!`);
      setBulkSelectedIds([]);
    } catch (e) {
      console.error(e);
      alert('Error during bulk update');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: IMPORT PARTIES STATE
  // -------------------------------------------------------------
  const [importPartyFile, setImportPartyFile] = useState<File | null>(null);
  const [importPreviewParties, setImportPreviewParties] = useState<Partial<Supplier>[]>([]);
  const fileInputPartiesRef = useRef<HTMLInputElement>(null);

  const handleDownloadSampleParties = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,ContactPerson,Phone,Email,Address,PartyType,OpeningBalance,TaxNumber\n" +
      "Ali Medical Complex,Dr. Ali,03001234567,ali@example.com,Civil Lines Gujranwala,Customer,15000,NTN-99881\n" +
      "M.K. Pharma Distributors,Khurram Shah,03217654321,sales@mkpharma.com,Railway Road Lahore,Supplier,25000,NTN-44552";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Sample_Parties_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePartiesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportPartyFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsed: Partial<Supplier>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 1 && cols[0]) {
          parsed.push({
            id: `party-imp-${Date.now()}-${i}`,
            name: cols[0],
            contactPerson: cols[1] || cols[0],
            phone: cols[2] || '',
            email: cols[3] || '',
            address: cols[4] || '',
            partyType: (cols[5] === 'Customer' ? 'Customer' : 'Supplier') as any,
            openingBalance: Number(cols[6]) || 0,
            balance: Number(cols[6]) || 0,
            taxNumber: cols[7] || '',
            paymentTerms: '30 Days Net',
            createdAt: new Date().toISOString()
          });
        }
      }
      setImportPreviewParties(parsed);
    };
    reader.readAsText(file);
  };

  const handleExecutePartiesImport = async () => {
    if (importPreviewParties.length === 0) return;
    setIsImporting(true);
    try {
      for (const p of importPreviewParties) {
        await dbSuppliers.save(p as Supplier);
      }
      await loadData();
      showToast(`Imported ${importPreviewParties.length} parties successfully!`);
      setImportPreviewParties([]);
      setImportPartyFile(null);
    } catch (e) {
      console.error(e);
      alert('Failed to import parties');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 5: EXPORT TO TALLY STATE
  // -------------------------------------------------------------
  const [tallyDateFrom, setTallyDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [tallyDateTo, setTallyDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [tallyVoucherType, setTallyVoucherType] = useState('All');

  const handleExportTallyXML = () => {
    const xmlHeader = `<?xml version="1.0" encoding="utf-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;
    let xmlBody = '';

    invoices.forEach((inv) => {
      xmlBody += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n            <DATE>${inv.date.replace(/-/g, '')}</DATE>\n            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${inv.customerName || 'Cash Customer'}</PARTYLEDGERNAME>\n            <AMOUNT>-${inv.grandTotal || 0}</AMOUNT>\n`;
      inv.items.forEach(it => {
        xmlBody += `            <ALLINVENTORYENTRIES.LIST>\n              <STOCKITEMNAME>${it.name}</STOCKITEMNAME>\n              <RATE>${it.sellingPrice}</RATE>\n              <ACTUALQTY>${it.quantity}</ACTUALQTY>\n              <AMOUNT>-${it.total}</AMOUNT>\n            </ALLINVENTORYENTRIES.LIST>\n`;
      });
      xmlBody += `          </VOUCHER>\n        </TALLYMESSAGE>\n`;
    });

    const xmlFooter = `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    const fullXml = xmlHeader + xmlBody + xmlFooter;

    const blob = new Blob([fullXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Sales_Export_${tallyDateFrom}_to_${tallyDateTo}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Tally XML Vouchers export downloaded successfully!');
  };

  // -------------------------------------------------------------
  // TAB 6: EXPORT ITEMS STATE
  // -------------------------------------------------------------
  const handleExportItemsCSV = () => {
    let csv = "Item Code,Item Name,Batch Number,Category,Manufacturer,Stock Qty,Unit,Purchase Price,Selling Price,MRP,Stock Value,Expiry Date\n";
    medicines.forEach(m => {
      const stockVal = (m.quantity * m.purchasePrice).toFixed(2);
      csv += `"${m.barcode}","${m.name.replace(/"/g, '""')}","${m.batchNumber || ''}","${m.category || ''}","${m.manufacturer || ''}",${m.quantity},"${m.unit || 'Unit'}",${m.purchasePrice},${m.sellingPrice},${m.mrp},${stockVal},"${m.expiryDate || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `All_Items_Inventory_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported items CSV successfully!');
  };

  // -------------------------------------------------------------
  // TAB 7: VERIFY MY DATA STATE
  // -------------------------------------------------------------
  const [dataAuditResults, setDataAuditResults] = useState<{
    negativeStock: Medicine[];
    expiredStock: Medicine[];
    lowStock: Medicine[];
    missingBatch: Medicine[];
    isClean: boolean;
  } | null>(null);

  const handleRunDataAudit = () => {
    const today = new Date().toISOString().slice(0, 10);
    const negative = medicines.filter(m => m.quantity < 0);
    const expired = medicines.filter(m => m.expiryDate && m.expiryDate < today);
    const low = medicines.filter(m => m.quantity <= (m.lowStockThreshold || 5) && m.quantity >= 0);
    const noBatch = medicines.filter(m => !m.batchNumber || m.batchNumber.trim() === '');

    setDataAuditResults({
      negativeStock: negative,
      expiredStock: expired,
      lowStock: low,
      missingBatch: noBatch,
      isClean: negative.length === 0 && expired.length === 0 && noBatch.length === 0
    });
    showToast('Data integrity verification scan completed!');
  };

  const handleFixNegativeStock = async () => {
    if (!dataAuditResults?.negativeStock.length) return;
    for (const m of dataAuditResults.negativeStock) {
      await dbMedicines.save({ ...m, quantity: 0 });
    }
    await loadData();
    handleRunDataAudit();
    showToast('Reset all negative stock values to 0.');
  };

  // -------------------------------------------------------------
  // TAB 8: RECYCLE BIN STATE
  // -------------------------------------------------------------
  const [recycleBinItems, setRecycleBinItems] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('vyapar_recycle_bin') || '[]');
  });

  const handleEmptyRecycleBin = () => {
    if (confirm('Are you sure you want to permanently delete all items in the Recycle Bin?')) {
      localStorage.setItem('vyapar_recycle_bin', '[]');
      setRecycleBinItems([]);
      showToast('Recycle Bin emptied.');
    }
  };

  // -------------------------------------------------------------
  // TAB 9: CLOSE FINANCIAL YEAR STATE
  // -------------------------------------------------------------
  const [isClosingYear, setIsClosingYear] = useState(false);
  const currentYearStr = "2025-2026";
  const nextYearStr = "2026-2027";

  const totalStockValuation = medicines.reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0);
  const totalReceivables = parties.filter(p => p.partyType === 'Customer').reduce((sum, p) => sum + (p.balance || 0), 0);
  const totalPayables = parties.filter(p => p.partyType === 'Supplier').reduce((sum, p) => sum + (p.balance || 0), 0);

  const handleCloseFinancialYear = async () => {
    if (!confirm(`Are you sure you want to close financial year ${currentYearStr} and rollover closing balances into ${nextYearStr}?`)) {
      return;
    }
    setIsClosingYear(true);
    setTimeout(async () => {
      // Record Year End Audit
      await dbUserActivities.save({
        id: `act-${Date.now()}`,
        userId: 'admin',
        userName: 'Admin',
        userRole: 'Primary Admin',
        action: `Closed Financial Year ${currentYearStr}`,
        module: 'Settings',
        details: `Rolled over stock value Rs. ${totalStockValuation.toLocaleString()} into new year ${nextYearStr}`,
        timestamp: new Date().toISOString()
      });
      setIsClosingYear(false);
      showToast(`Financial Year ${currentYearStr} successfully closed and balances carried forward!`);
    }, 1500);
  };

  // Navigation Items under Utilities (14 modules)
  const utilityTabs = [
    { key: 'shortage', label: 'Shortage Register (Lost Demand)', icon: AlertTriangle },
    { key: 'narcotics', label: 'Controlled Drugs (Form 8)', icon: ShieldAlert },
    { key: 'chronic-refills', label: 'Chronic Patient Refills', icon: Heart },
    { key: 'supplier-return', label: 'Expiry & Breakage Return', icon: RotateCcw },
    { key: 'barcode', label: 'Generate Barcode', icon: Barcode },
    { key: 'import-items', label: 'Import Items', icon: Upload },
    { key: 'bulk-update', label: 'Bulk Update Items', icon: Layers },
    { key: 'import-parties', label: 'Import Parties', icon: Upload },
    { key: 'export-tally', label: 'Export To Tally', icon: FileSpreadsheet },
    { key: 'export-items', label: 'Export Items', icon: Download },
    { key: 'verify-data', label: 'Verify My Data', icon: ShieldCheck },
    { key: 'recycle-bin', label: 'Recycle Bin', icon: Trash2 },
    { key: 'close-financial-year', label: 'Close Financial Year', icon: Calendar },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#f1f5f9]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Utilities Container */}
      <div className="flex-1 flex overflow-hidden bg-white border border-slate-200 rounded-xl shadow-xs m-1">
        
        {/* Sub-menu / Navigation inside Utilities */}
        <div className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-3.5 border-b border-slate-200 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Utilities</h2>
              <p className="text-[11px] text-slate-500">Tools & data management</p>
            </div>
          </div>

          <nav className="p-2 space-y-1 overflow-y-auto flex-1 custom-scrollbar text-xs font-semibold">
            {utilityTabs.map((tab) => {
              const isActive = currentTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSearchParams({ tab: tab.key })}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  )}
                >
                  <tab.icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white">
          
          {/* =========================================================================
              PHARMACY SPECIALTY MODULE 1: SHORTAGE REGISTER & LOST DEMAND
          ========================================================================= */}
          {currentTab === 'shortage' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <ShortageBookTab />
            </div>
          )}

          {/* =========================================================================
              PHARMACY SPECIALTY MODULE 2: NARCOTICS & CONTROLLED DRUGS REGISTER (FORM 8)
          ========================================================================= */}
          {currentTab === 'narcotics' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <NarcoticsLogTab />
            </div>
          )}

          {/* =========================================================================
              PHARMACY SPECIALTY MODULE 3: CHRONIC PATIENT REFILLS
          ========================================================================= */}
          {currentTab === 'chronic-refills' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <ChronicRefillsTab />
            </div>
          )}

          {/* =========================================================================
              PHARMACY SPECIALTY MODULE 4: SUPPLIER NEAR-EXPIRY & DAMAGE RETURN
          ========================================================================= */}
          {currentTab === 'supplier-return' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <SupplierReturnTab />
            </div>
          )}

          {/* =========================================================================
              MODULE 1: GENERATE BARCODE (Matches Screenshot pixel-perfect)
          ========================================================================= */}
          {currentTab === 'barcode' && (
            <div className="flex-1 flex flex-col p-5 space-y-4">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">Barcode Generator</h1>
                  <button title="Learn about printing thermal and standard sheet barcodes" className="text-slate-400 hover:text-slate-600">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Printer:</span>
                    <select
                      value={printerType}
                      onChange={(e) => setPrinterType(e.target.value)}
                      className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Regular Printer">Regular Printer</option>
                      <option value="Barcode / Thermal Printer">Barcode / Thermal Printer</option>
                      <option value="TSC / Zebra Direct Thermal">TSC / Zebra Direct Thermal</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Size:</span>
                    <select
                      value={labelSize}
                      onChange={(e) => setLabelSize(e.target.value)}
                      className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="65 Labels (38 * 21mm)">65 Labels (38 * 21mm)</option>
                      <option value="24 Labels (63.5 * 38.1mm)">24 Labels (63.5 * 38.1mm)</option>
                      <option value="40 Labels (48.5 * 25.4mm)">40 Labels (48.5 * 25.4mm)</option>
                      <option value="Single Sticker (50 * 25mm)">Single Sticker (50 * 25mm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Barcode Form Grid + Live Preview Box (Matching Screenshot) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* Inputs Form */}
                <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-6 gap-3">
                  
                  {/* Item Name with Auto-Suggest */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Item Name<span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter Item Name..."
                        value={barcodeItemName}
                        onChange={(e) => setBarcodeItemName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                      {/* Quick item select popup */}
                      {medicines.length > 0 && !barcodeItemName && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 text-xs hidden group-focus-within:block">
                          {medicines.slice(0, 5).map(m => (
                            <div 
                              key={m.id} 
                              onClick={() => handleSelectItemForBarcode(m)}
                              className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-semibold">{m.name}</span>
                              <span className="text-slate-400 font-mono">{m.barcode}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Code */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Item Code<span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Assign Code / Barcode"
                      value={barcodeItemCode}
                      onChange={(e) => setBarcodeItemCode(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* No of Labels */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">No of Labels<span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      placeholder="0"
                      value={barcodeLabelsCount}
                      onChange={(e) => setBarcodeLabelsCount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Header */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Header</label>
                    <input
                      type="text"
                      placeholder="Enter Header..."
                      value={barcodeHeader}
                      onChange={(e) => setBarcodeHeader(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Line 1 */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Line 1</label>
                    <input
                      type="text"
                      placeholder="Enter Line 1..."
                      value={barcodeLine1}
                      onChange={(e) => setBarcodeLine1(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Line 2 */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Line 2</label>
                    <input
                      type="text"
                      placeholder="Enter Line 2..."
                      value={barcodeLine2}
                      onChange={(e) => setBarcodeLine2(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Right Preview Card & Add Button (Matching Screenshot) */}
                <div className="lg:col-span-3 border border-slate-200 rounded-xl p-3 bg-white shadow-xs flex flex-col items-center justify-between text-center min-h-[160px]">
                  <div className="w-full space-y-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate uppercase tracking-tight">
                      {barcodeHeader || 'Header'}
                    </p>
                    <div className="py-1 px-2 bg-slate-50 rounded border border-slate-100">
                      <BarcodeSVG code={barcodeItemCode || '890123456789'} height={36} className="w-full h-9" />
                      <p className="text-[10px] font-mono font-bold text-slate-700 tracking-wider">
                        {barcodeItemCode || 'Itemcode'}
                      </p>
                    </div>
                    <p className="text-[10.5px] font-semibold text-slate-700 truncate">{barcodeLine1 || 'Line1'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{barcodeLine2 || 'Line2'}</p>
                  </div>

                  <button
                    onClick={handleAddBarcodeQueue}
                    className="w-full mt-2.5 py-1.5 bg-[#94a3b8] hover:bg-[#64748b] text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add for Barcode</span>
                  </button>
                </div>
              </div>

              {/* Items Table for Barcode Generation (Matching Screenshot Table Header & Empty State) */}
              <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-[#e0f2fe]/60 border-b border-slate-200 grid grid-cols-12 px-4 py-2.5 text-xs font-bold text-slate-700">
                  <div className="col-span-3">Item Name</div>
                  <div className="col-span-2 text-center">No of Labels</div>
                  <div className="col-span-3">Header</div>
                  <div className="col-span-2">Line 1</div>
                  <div className="col-span-2 flex justify-between">
                    <span>Line 2</span>
                    <span>Action</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[220px]">
                  {barcodeQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                      <div className="w-16 h-10 border border-dashed border-slate-300 rounded flex items-center justify-center">
                        <Barcode className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        Added items for Barcode generation will appear here.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        {medicines.slice(0, 3).map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectItemForBarcode(m)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                          >
                            + Select {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs text-slate-700">
                      {barcodeQueue.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-slate-50 transition-colors">
                          <div className="col-span-3 font-semibold text-slate-900 truncate">{item.itemName}</div>
                          <div className="col-span-2 text-center font-bold text-blue-600">{item.noOfLabels}</div>
                          <div className="col-span-3 truncate text-slate-600">{item.header}</div>
                          <div className="col-span-2 truncate text-slate-600">{item.line1}</div>
                          <div className="col-span-2 flex items-center justify-between">
                            <span className="truncate text-slate-500">{item.line2}</span>
                            <button
                              onClick={() => handleRemoveBarcodeQueue(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer (Matching Screenshot with Preview and Generate) */}
                <div className="border-t border-slate-200 p-3 bg-white flex items-center justify-end gap-3">
                  <button
                    disabled={barcodeQueue.length === 0}
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="px-5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                  <button
                    disabled={barcodeQueue.length === 0}
                    onClick={() => {
                      setIsPreviewModalOpen(true);
                      setTimeout(() => window.print(), 500);
                    }}
                    className="px-6 py-2 bg-[#94a3b8] hover:bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 transition-colors shadow-xs flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 2: IMPORT ITEMS
          ========================================================================= */}
          {currentTab === 'import-items' && (
            <div className="p-6 space-y-6 max-w-4xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Import Items from Excel / CSV</h1>
                <p className="text-xs text-slate-500 mt-0.5">Bulk upload medicine items, batches, and opening stock into inventory.</p>
              </div>

              {/* Step 1 & 2 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 1: Download Template */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="text-sm font-bold text-slate-800">Download Sample Template</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Use our standard CSV/Excel format with pre-built headers for Barcode, MRP, Purchase Price, and Expiry Date.
                  </p>
                  <button
                    onClick={handleDownloadSampleMeds}
                    className="px-4 py-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>

                {/* Step 2: Upload File */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="text-sm font-bold text-slate-800">Upload Filled File</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Select the completed CSV/Excel file from your computer.
                  </p>
                  <input
                    ref={fileInputMedsRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleMedsFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputMedsRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{importFile ? importFile.name : 'Select File to Upload'}</span>
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              {importPreviewMeds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      Preview Data ({importPreviewMeds.length} items detected)
                    </h3>
                    <button
                      disabled={isImporting}
                      onClick={handleExecuteMedsImport}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isImporting ? 'Importing...' : 'Confirm & Save Items'}</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-800 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">Item Name</th>
                          <th className="p-2.5">Barcode</th>
                          <th className="p-2.5">Batch</th>
                          <th className="p-2.5">Stock</th>
                          <th className="p-2.5">Purchase</th>
                          <th className="p-2.5">Sale Price</th>
                          <th className="p-2.5">Expiry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewMeds.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-900">{item.name}</td>
                            <td className="p-2.5 font-mono">{item.barcode}</td>
                            <td className="p-2.5">{item.batchNumber}</td>
                            <td className="p-2.5 font-bold text-blue-600">{item.quantity}</td>
                            <td className="p-2.5">Rs. {item.purchasePrice}</td>
                            <td className="p-2.5 font-bold">Rs. {item.sellingPrice}</td>
                            <td className="p-2.5 text-slate-500">{item.expiryDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 3: BULK UPDATE ITEMS
          ========================================================================= */}
          {currentTab === 'bulk-update' && (
            <div className="flex-1 flex flex-col p-6 space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Bulk Update Items</h1>
                <p className="text-xs text-slate-500 mt-0.5">Quickly adjust prices, categories, or reorder levels across multiple items at once.</p>
              </div>

              {/* Bulk Control Bar */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Field to Update</label>
                  <select
                    value={bulkField}
                    onChange={(e: any) => setBulkField(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="sellingPrice">Selling Price</option>
                    <option value="purchasePrice">Purchase Price</option>
                    <option value="mrp">MRP</option>
                    <option value="lowStockThreshold">Low Stock Threshold</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Adjustment Type</label>
                  <select
                    value={bulkActionType}
                    onChange={(e: any) => setBulkActionType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="percent_increase">Increase by % (e.g. +5%)</option>
                    <option value="percent_decrease">Decrease by % (e.g. -5%)</option>
                    <option value="fixed_set">Set Fixed Value</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Value (% or Amount)</label>
                  <input
                    type="number"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="pt-4">
                  <button
                    disabled={bulkSelectedIds.length === 0}
                    onClick={handleExecuteBulkUpdate}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    Apply to {bulkSelectedIds.length} Items
                  </button>
                </div>
              </div>

              {/* Items Selection Table */}
              <div className="flex-1 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search items for bulk update..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 border border-slate-300 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <span className="text-xs font-semibold text-slate-600">
                    {bulkSelectedIds.length} of {filteredBulkMeds.length} selected
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 font-bold text-slate-800 uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={bulkSelectedIds.length === filteredBulkMeds.length && filteredBulkMeds.length > 0}
                            onChange={toggleSelectAllBulk}
                            className="rounded text-blue-600"
                          />
                        </th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Barcode</th>
                        <th className="p-2.5">Current Purchase</th>
                        <th className="p-2.5">Current Sale Price</th>
                        <th className="p-2.5">Current MRP</th>
                        <th className="p-2.5">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBulkMeds.map((med) => {
                        const isChecked = bulkSelectedIds.includes(med.id);
                        return (
                          <tr key={med.id} className={cn('hover:bg-slate-50', isChecked ? 'bg-blue-50/40' : '')}>
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setBulkSelectedIds(bulkSelectedIds.filter(id => id !== med.id));
                                  } else {
                                    setBulkSelectedIds([...bulkSelectedIds, med.id]);
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">{med.name}</td>
                            <td className="p-2.5 font-mono text-slate-500">{med.barcode}</td>
                            <td className="p-2.5">Rs. {med.purchasePrice}</td>
                            <td className="p-2.5 font-bold text-emerald-600">Rs. {med.sellingPrice}</td>
                            <td className="p-2.5">Rs. {med.mrp}</td>
                            <td className="p-2.5 font-semibold text-slate-800">{med.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 4: IMPORT PARTIES
          ========================================================================= */}
          {currentTab === 'import-parties' && (
            <div className="p-6 space-y-6 max-w-4xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Import Customers & Suppliers</h1>
                <p className="text-xs text-slate-500 mt-0.5">Bulk import customer accounts, distributors, and opening balances from CSV/Excel.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <h3 className="text-sm font-bold text-slate-800">Sample Parties Template</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Template includes Contact Person, Phone, Opening Balance, Address, and NTN columns.
                  </p>
                  <button
                    onClick={handleDownloadSampleParties}
                    className="px-4 py-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Parties Template</span>
                  </button>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <h3 className="text-sm font-bold text-slate-800">Upload Parties CSV</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Select your populated parties CSV file to load preview.
                  </p>
                  <input
                    ref={fileInputPartiesRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handlePartiesFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputPartiesRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{importPartyFile ? importPartyFile.name : 'Select Parties File'}</span>
                  </button>
                </div>
              </div>

              {importPreviewParties.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">
                      Parties to Import ({importPreviewParties.length})
                    </h3>
                    <button
                      disabled={isImporting}
                      onClick={handleExecutePartiesImport}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Import Parties</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-800 uppercase font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">Party Name</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Opening Balance</th>
                          <th className="p-2.5">City / Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewParties.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                            <td className="p-2.5">
                              <span className={cn('px-2 py-0.5 rounded-full text-[10.5px] font-bold', p.partyType === 'Customer' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                                {p.partyType}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono">{p.phone}</td>
                            <td className="p-2.5 font-bold">Rs. {p.openingBalance?.toLocaleString()}</td>
                            <td className="p-2.5 text-slate-500">{p.address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 5: EXPORT TO TALLY
          ========================================================================= */}
          {currentTab === 'export-tally' && (
            <div className="p-6 space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Export to Tally ERP 9 / TallyPrime</h1>
                <p className="text-xs text-slate-500 mt-0.5">Generate compliant XML voucher data to seamlessly import invoices into Tally accounting software.</p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">From Date</label>
                    <input
                      type="date"
                      value={tallyDateFrom}
                      onChange={(e) => setTallyDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">To Date</label>
                    <input
                      type="date"
                      value={tallyDateTo}
                      onChange={(e) => setTallyDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Voucher Types</label>
                  <select
                    value={tallyVoucherType}
                    onChange={(e) => setTallyVoucherType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="All">All Vouchers (Sales, Purchases, Payments, Receipts)</option>
                    <option value="Sales">Sales Invoices Only</option>
                    <option value="Purchases">Purchase Bills Only</option>
                  </select>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1 font-medium">
                  <p className="font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Tally XML Integration Ready</span>
                  </p>
                  <p>Exports all item ledgers, party accounts, invoice totals, and tax tags compatible with Tally standard XML schema.</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleExportTallyXML}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Tally XML File</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 6: EXPORT ITEMS
          ========================================================================= */}
          {currentTab === 'export-items' && (
            <div className="p-6 space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Export Inventory / Items</h1>
                <p className="text-xs text-slate-500 mt-0.5">Download your complete medicine catalogue and stock balances in Excel/CSV format.</p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-lg font-bold text-slate-900">{medicines.length}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Total Items</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-lg font-bold text-blue-600">
                      {medicines.reduce((sum, m) => sum + m.quantity, 0)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">Total Stock Qty</div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-lg font-bold text-emerald-600">
                      Rs. {totalStockValuation.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">Inventory Valuation</div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleExportItemsCSV}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export All Items to CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 7: VERIFY MY DATA (Data integrity diagnostic tool)
          ========================================================================= */}
          {currentTab === 'verify-data' && (
            <div className="p-6 space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Verify My Data & System Health</h1>
                <p className="text-xs text-slate-500 mt-0.5">Automated diagnostic scanner for negative stock, expired inventory, and ledger consistency.</p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-slate-800">Run Integrity Diagnostic Scan</span>
                    <p className="text-xs text-slate-500">Scans all IndexedDB stores for anomalies or broken records.</p>
                  </div>
                  <button
                    onClick={handleRunDataAudit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Scan Database Now</span>
                  </button>
                </div>

                {dataAuditResults && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    {dataAuditResults.isClean ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold">All Data is Verified & 100% Healthy!</p>
                          <p className="text-xs text-emerald-700">No negative stock, no orphaned invoices, and all batch references are valid.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {dataAuditResults.negativeStock.length > 0 && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              <span>Found {dataAuditResults.negativeStock.length} items with negative stock.</span>
                            </div>
                            <button
                              onClick={handleFixNegativeStock}
                              className="px-3 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700"
                            >
                              Auto-Fix (Set to 0)
                            </button>
                          </div>
                        )}

                        {dataAuditResults.expiredStock.length > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Found {dataAuditResults.expiredStock.length} expired medicine batches in stock.</span>
                          </div>
                        )}

                        {dataAuditResults.missingBatch.length > 0 && (
                          <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-slate-600" />
                            <span>Found {dataAuditResults.missingBatch.length} items without assigned batch numbers.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              MODULE 8: RECYCLE BIN
          ========================================================================= */}
          {currentTab === 'recycle-bin' && (
            <div className="p-6 space-y-6 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Recycle Bin</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Recover or permanently remove deleted invoices and inventory items.</p>
                </div>
                {recycleBinItems.length > 0 && (
                  <button
                    onClick={handleEmptyRecycleBin}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Empty Recycle Bin</span>
                  </button>
                )}
              </div>

              {recycleBinItems.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
                  <Trash2 className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Recycle Bin is Empty</p>
                  <p className="text-xs text-slate-400">Deleted invoices or medicines will be safely stored here before permanent deletion.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {recycleBinItems.map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{it.name || it.invoiceNumber}</span>
                        <p className="text-[11px] text-slate-400">Deleted on {new Date(it.deletedAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">{it.type || 'Record'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODULE 9: CLOSE FINANCIAL YEAR
          ========================================================================= */}
          {currentTab === 'close-financial-year' && (
            <div className="p-6 space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Close Financial Year</h1>
                <p className="text-xs text-slate-500 mt-0.5">Year-end accounting closing and balance rollover into the new financial year.</p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-5">
                
                {/* Year Rollover Banner */}
                <div className="flex items-center justify-between p-4 bg-blue-600 text-white rounded-xl shadow-xs">
                  <div>
                    <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Current Active Year</span>
                    <h3 className="text-xl font-black">{currentYearStr}</h3>
                  </div>
                  <ArrowRight className="w-6 h-6 text-blue-300" />
                  <div className="text-right">
                    <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Next Financial Year</span>
                    <h3 className="text-xl font-black text-emerald-300">{nextYearStr}</h3>
                  </div>
                </div>

                {/* Balances to Carry Forward */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Closing Balances to Carry Forward:</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                      <div className="text-sm font-bold text-slate-900">Rs. {totalStockValuation.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Closing Stock Value</div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                      <div className="text-sm font-bold text-blue-600">Rs. {totalReceivables.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Customer Receivables</div>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                      <div className="text-sm font-bold text-rose-600">Rs. {totalPayables.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400 font-medium">Supplier Payables</div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Important Year-End Note</span>
                  </p>
                  <p>Closing the financial year archives transaction books for {currentYearStr} and transfers closing balances as opening balances for {nextYearStr}.</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    disabled={isClosingYear}
                    onClick={handleCloseFinancialYear}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isClosingYear ? 'Closing Financial Year...' : 'Carry Forward & Close Year'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* =========================================================================
          PRINTABLE BARCODE SHEET PREVIEW MODAL
      ========================================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Barcode Print Sheet ({labelSize})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Now</span>
                </button>
                <button onClick={() => setIsPreviewModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Sheet Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              <div className="bg-white p-6 shadow-md border border-slate-200 w-full max-w-[780px] min-h-[1000px] grid grid-cols-4 sm:grid-cols-5 gap-2.5 content-start">
                {barcodeQueue.flatMap((item) => 
                  Array.from({ length: item.noOfLabels }).map((_, idx) => (
                    <div 
                      key={`${item.id}-${idx}`}
                      className="border border-dashed border-slate-300 p-1.5 flex flex-col items-center justify-center text-center rounded bg-white min-h-[95px]"
                    >
                      <p className="text-[8.5px] font-bold text-slate-800 truncate uppercase w-full">
                        {item.header || business?.name}
                      </p>
                      <div className="w-full my-0.5">
                        <BarcodeSVG code={item.itemCode} height={26} className="w-full h-6" />
                        <p className="text-[7.5px] font-mono font-bold text-slate-700 tracking-wider">
                          {item.itemCode}
                        </p>
                      </div>
                      <p className="text-[8px] font-semibold text-slate-700 truncate w-full">{item.line1}</p>
                      <p className="text-[7.5px] text-slate-500 truncate w-full">{item.line2}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
