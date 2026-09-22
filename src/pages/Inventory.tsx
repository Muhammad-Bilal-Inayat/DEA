import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, Download, Upload, FileSpreadsheet, 
  Package, AlertTriangle, CheckCircle2, Trash2, Edit, Check, Sparkles, RefreshCw,
  Sliders, Share2, MoreVertical, ChevronDown, ArrowUpDown, ArrowUpRight, ArrowDownLeft,
  X, Layers, Briefcase, Scale, Calendar, Eye, ExternalLink, Printer, ArrowLeft, Scan
} from 'lucide-react';
import { dbMedicines, dbAuditLogs, dbInvoices, dbPurchaseOrders, dbSuppliers } from '../lib/db';
import { Medicine, AuditLog, Invoice, PurchaseOrder, Supplier, Party } from '../types';
import { forceSeedDemoProducts } from '../lib/seedData';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  downloadProductTemplateExcel, 
  exportProductsToExcel 
} from '../lib/excelUtils';
import { exportInventoryToCSV } from '../lib/csvExport';
import * as XLSX from 'xlsx';
import { ImportProductsModal } from '../components/inventory/ImportProductsModal';
import { AdjustItemModal } from '../components/inventory/AdjustItemModal';
import { CategoryView } from '../components/inventory/CategoryView';
import { UnitsView } from '../components/inventory/UnitsView';
import { BatchTraceabilityModal } from '../components/inventory/BatchTraceabilityModal';
import { ProductRecallModal } from '../components/inventory/ProductRecallModal';
import { DemandForecastView } from '../components/inventory/DemandForecastView';
import { ExpiryManagementView } from '../components/inventory/ExpiryManagementView';
import { SupplierIntelligenceView } from '../components/inventory/SupplierIntelligenceView';
import { CashierShiftModal } from '../components/inventory/CashierShiftModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { BarcodeScannerModal } from '../components/common/BarcodeScannerModal';
import { BulkEditModal } from '../components/inventory/BulkEditModal';
import { GenericQuickViewModal } from '../components/inventory/GenericQuickViewModal';
import { AddEditMedicineModal } from '../components/inventory/AddEditMedicineModal';
import { buildGenericSummaries, GenericGroupSummary, DEFAULT_GENERIC_MASTERS, getGenericMasterById } from '../lib/genericMaster';
import { getFEFOSortedBatches, FEFOBatchItem } from '../lib/fefoEngine';
import { getStockRotationSortedBatches, StockRotationBatchItem } from '../lib/stockRotationEngine';
import { ProductRecallRecord, CashierShift } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { ShortageBookTab } from '../components/pharmacy/ShortageBookTab';
import { NarcoticsLogTab } from '../components/pharmacy/NarcoticsLogTab';
import { ChronicRefillsTab } from '../components/pharmacy/ChronicRefillsTab';
import { SupplierReturnTab } from '../components/pharmacy/SupplierReturnTab';
import { useHardwareBarcodeScanner } from '../hooks/useHardwareBarcodeScanner';
import { playScannerBeep } from '../lib/barcodeAudio';

// Transaction item structure for the selected product
interface ItemTransaction {
  id: string;
  type: 'Sale' | 'Purchase' | 'Adjustment' | 'Opening Stock' | 'Sale Return' | 'Purchase Return' | 'Stock Adjustment';
  name: string; // Party / Customer / Supplier name
  date: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Completed' | 'Pending';
  refNumber?: string;
  notes?: string;
}

export const Inventory: React.FC = () => {
  const { userProfile } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  // Stock Rotation Mode View Toggle (defaults to user configured setting)
  const [activeRotationView, setActiveRotationView] = useState<'FIFO' | 'FEFO' | null>(null);

  // Top Tabs: PRODUCTS | SHORTAGE | NARCOTICS | CHRONIC | RETURNS | DEMAND_FORECAST | SMART_EXPIRY | SUPPLIER_SCORECARDS | CATEGORY | UNITS
  const [topTab, setTopTab] = useState<'PRODUCTS' | 'SHORTAGE' | 'NARCOTICS' | 'CHRONIC' | 'RETURNS' | 'DEMAND_FORECAST' | 'SMART_EXPIRY' | 'SUPPLIER_SCORECARDS' | 'CATEGORY' | 'UNITS'>('PRODUCTS');

  // Master State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [activeMedicineId, setActiveMedicineId] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search & Filters
  const [searchItem, setSearchItem] = useState('');
  const [searchTransaction, setSearchTransaction] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'Available' | 'Controlled' | 'Quarantined' | 'LowStock' | 'Expired'>('ALL');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'ADJUSTMENT'>('ALL');

  // Enterprise Modals & UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showMoreActionsDropdown, setShowMoreActionsDropdown] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [itemMenuOpenId, setItemMenuOpenId] = useState<string | null>(null);
  const [txMenuOpenId, setTxMenuOpenId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isScanningForSearch, setIsScanningForSearch] = useState(false);

  // Bulk Edit & Multi-Select State
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  // Generic / Salt Master Quick View State
  const [showGenericModal, setShowGenericModal] = useState(false);
  const [selectedGenericSummary, setSelectedGenericSummary] = useState<GenericGroupSummary | null>(null);

  const selectedMedicines = useMemo(() => {
    return medicines.filter((m) => selectedMedIds.includes(m.id));
  }, [medicines, selectedMedIds]);

  const handleToggleSelectMed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMeds = () => {
    if (selectedMedIds.length === filteredMeds.length) {
      setSelectedMedIds([]);
    } else {
      setSelectedMedIds(filteredMeds.map((m) => m.id));
    }
  };

  const handleOpenGenericModal = (med: Medicine) => {
    const summaries = buildGenericSummaries(medicines);
    // match by genericId, genericName or saltComposition
    const match = summaries.find(
      (s) =>
        (med.genericId && s.genericId.toLowerCase() === med.genericId.toLowerCase()) ||
        (med.genericName && s.genericName.toLowerCase() === med.genericName.toLowerCase()) ||
        (med.saltComposition && s.genericName.toLowerCase().includes(med.saltComposition.toLowerCase()))
    );

    if (match) {
      setSelectedGenericSummary(match);
      setShowGenericModal(true);
    } else if (med.genericName || med.saltComposition) {
      // Create on-the-fly summary
      const name = med.genericName || med.saltComposition || 'Unknown Generic';
      const onTheFly: GenericGroupSummary = {
        genericId: med.genericId || 'GEN-CUSTOM',
        genericName: name,
        alternateNames: med.alternateGenericNames || [],
        therapeuticClass: med.category || 'General',
        isControlled: Boolean(med.isControlled),
        totalBrands: 1,
        totalCompanies: 1,
        totalStock: med.quantity,
        availableProductsCount: med.quantity > 0 ? 1 : 0,
        controlledProductsCount: med.isControlled ? 1 : 0,
        products: [med],
        companies: [med.manufacturer || 'Unknown'],
        brands: [med.name]
      };
      setSelectedGenericSummary(onTheFly);
      setShowGenericModal(true);
    } else {
      showToast(`No generic / salt profile assigned to ${med.name}.`);
    }
  };

  const handleBarcodeSearchScanned = (scannedCode: string) => {
    setIsScanningForSearch(false);
    const clean = scannedCode.trim().toLowerCase();
    setSearchItem(scannedCode);
    const matched = medicines.find(m => 
      (m.barcode && m.barcode.trim().toLowerCase() === clean) ||
      m.id.toLowerCase() === clean ||
      (m.batchNumber && m.batchNumber.trim().toLowerCase() === clean)
    );
    if (matched) {
      setActiveMedicineId(matched.id);
      setMobileView('detail');
      playScannerBeep('success');
      setToastMsg(`Barcode matched: ${matched.name}`);
      setTimeout(() => setToastMsg(null), 3000);
    } else {
      playScannerBeep('error');
      setToastMsg(`Barcode "${scannedCode}" scanned. Filtered list below.`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  // Hardware barcode scanner listener for rapid scanning from USB/Wireless gun on inventory page
  useHardwareBarcodeScanner({
    enabled: !showAddForm && !editingMedicine && !showAdjustModal && !isScanningForSearch && !showGenericModal && !showBulkEditModal,
    onScan: (scannedBarcode) => {
      handleBarcodeSearchScanned(scannedBarcode);
    }
  });

  const handleExportCSV = () => {
    if (medicines.length === 0) {
      setToastMsg('No items in inventory to export.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    exportInventoryToCSV(medicines);
    setToastMsg(`Exported ${medicines.length} items to CSV successfully!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Check URL query parameters (e.g. /items?action=add)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setEditingMedicine(null);
      setShowAddForm(true);
    }
  }, [location.search]);

  useEffect(() => {
    loadAllData();
    const handleSync = () => loadAllData();
    window.addEventListener('mbi-data-synced', handleSync);
    window.addEventListener('mbi-local-db-change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('mbi-data-synced', handleSync);
      window.removeEventListener('mbi-local-db-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const loadAllData = async () => {
    const meds = await dbMedicines.getAll();
    setMedicines(meds || []);

    // If active medicine not in list or not set
    if (meds && meds.length > 0) {
      if (!activeMedicineId || !meds.find(m => m.id === activeMedicineId)) {
        setActiveMedicineId(meds[0].id);
      }
    } else {
      setActiveMedicineId(null);
    }

    const [allInvs, allPOs, allLogs, allSuppliers] = await Promise.all([
      dbInvoices.getAll(),
      dbPurchaseOrders.getAll(),
      dbAuditLogs.getAll(),
      dbSuppliers.getAll(),
    ]);

    setInvoices(allInvs || []);
    setPurchaseOrders(allPOs || []);
    setAuditLogs(allLogs || []);
    setSuppliers(allSuppliers || []);
  };

  const handleConfirmQuarantine = async (medicineId: string, batchNumber: string, recallRecord: ProductRecallRecord) => {
    const med = medicines.find(m => m.id === medicineId);
    if (!med) return;
    const updated: Medicine = {
      ...med,
      stockStatus: 'Quarantined',
      quarantineReason: recallRecord.reason,
      recallNotice: recallRecord.notes,
      recalledAt: recallRecord.recallDate,
      updatedAt: new Date().toISOString()
    };
    await dbMedicines.save(updated);
    const audit: AuditLog = {
      id: uuidv4(),
      date: new Date().toISOString(),
      action: 'ADJUST_STOCK',
      medicineId: med.id,
      medicineName: med.name,
      userId: 'pharmacist',
      notes: `DRAP Recall & Quarantine: Batch ${batchNumber} quarantined. Reason: ${recallRecord.reason}`
    };
    await dbAuditLogs.save(audit);
    await loadAllData();
    showToast(`Quarantined: ${med.name} (Batch ${batchNumber}) blocked from POS billing`);
  };

  const handleUnquarantineMedicine = async (med: Medicine) => {
    const updated: Medicine = {
      ...med,
      stockStatus: 'Available',
      quarantineReason: undefined,
      recallNotice: undefined,
      updatedAt: new Date().toISOString()
    };
    await dbMedicines.save(updated);
    const audit: AuditLog = {
      id: uuidv4(),
      date: new Date().toISOString(),
      action: 'ADJUST_STOCK',
      medicineId: med.id,
      medicineName: med.name,
      userId: 'pharmacist',
      notes: `Unquarantined: Stock status restored to Available.`
    };
    await dbAuditLogs.save(audit);
    await loadAllData();
    showToast(`Stock restored to Available for ${med.name}`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSeedDemoItems = async () => {
    await forceSeedDemoProducts();
    await loadAllData();
    showToast('Loaded 30+ items and transactions into inventory!');
    setShowAddDropdown(false);
  };

  const handleBulkSaveProducts = async (newMeds: Medicine[]) => {
    for (const med of newMeds) {
      await dbMedicines.save(med);
    }
    await loadAllData();
  };

  // Delete Medicine State
  const [deleteTargetMed, setDeleteTargetMed] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingMed, setIsDeletingMed] = useState(false);

  const handleDeleteMedicine = (id: string, name: string) => {
    setDeleteTargetMed({ id, name });
  };

  const handleConfirmDeleteMedicine = async () => {
    if (!deleteTargetMed) return;
    setIsDeletingMed(true);
    try {
      await dbMedicines.delete(deleteTargetMed.id);
      await loadAllData();
      showToast(`Deleted ${deleteTargetMed.name} from inventory.`);
      setDeleteTargetMed(null);
    } catch (err) {
      console.error('Failed to delete medicine:', err);
      showToast('Error deleting medicine.');
    } finally {
      setIsDeletingMed(false);
    }
  };

  // Active selected medicine
  const activeMedicine = useMemo(() => {
    return medicines.find((m) => m.id === activeMedicineId) || medicines[0] || null;
  }, [medicines, activeMedicineId]);

  // Incremental display limit for infinite / massive inventory catalogs without lag
  const [itemDisplayLimit, setItemDisplayLimit] = useState(100);

  // Filtered medicines for left list
  const filteredMeds = useMemo(() => {
    return medicines.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchItem.toLowerCase()) ||
        (m.barcode && m.barcode.includes(searchItem)) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(searchItem.toLowerCase())) ||
        (m.category && m.category.toLowerCase().includes(searchItem.toLowerCase()));

      if (!matchesSearch) return false;

      if (categoryFilter !== 'All' && m.category !== categoryFilter) {
        return false;
      }

      if (stockStatusFilter === 'Controlled' && !m.isControlled) {
        return false;
      }
      if (stockStatusFilter === 'Available' && m.stockStatus === 'Quarantined') {
        return false;
      }
      if (stockStatusFilter === 'Quarantined' && m.stockStatus !== 'Quarantined' && m.stockStatus !== 'Recalled') {
        return false;
      }
      if (stockStatusFilter === 'LowStock' && (m.quantity > (m.lowStockThreshold ?? 10))) {
        return false;
      }
      if (stockStatusFilter === 'Expired') {
        if (!m.expiryDate) return false;
        const expTime = new Date(m.expiryDate).getTime();
        if (expTime > Date.now()) return false;
      }

      return true;
    });
  }, [medicines, searchItem, categoryFilter, stockStatusFilter]);

  // Reset display limit when filtering or searching
  useEffect(() => {
    setItemDisplayLimit(100);
  }, [searchItem, categoryFilter, stockStatusFilter]);

  const displayedMeds = useMemo(() => {
    return filteredMeds.slice(0, itemDisplayLimit);
  }, [filteredMeds, itemDisplayLimit]);

  // Calculate transactions specifically for active selected medicine
  const itemTransactions: ItemTransaction[] = useMemo(() => {
    if (!activeMedicine) return [];

    const txs: ItemTransaction[] = [];
    const medNameLower = activeMedicine.name.trim().toLowerCase();
    const medId = activeMedicine.id;

    // 1. Sales from Invoices (showing which party/customer bought how much quantity)
    invoices.forEach((inv) => {
      if (!inv.items) return;
      inv.items.forEach((item, idx) => {
        const matchesId = item.medicineId && item.medicineId === medId;
        const matchesName = item.name && item.name.trim().toLowerCase() === medNameLower;
        const partialName = item.name && (item.name.toLowerCase().includes(medNameLower) || medNameLower.includes(item.name.toLowerCase()));

        if (matchesId || matchesName || (medNameLower.length > 4 && partialName)) {
          let status: 'Paid' | 'Partial' | 'Unpaid' = 'Paid';
          if (inv.balanceDue > 0 && inv.receivedAmount > 0) status = 'Partial';
          else if (inv.balanceDue > 0 && inv.receivedAmount === 0) status = 'Unpaid';

          txs.push({
            id: `inv-${inv.id}-${item.medicineId || item.name || 'item'}-${idx}`,
            type: inv.transactionType === 'Sale Return' ? 'Sale Return' : 'Sale',
            name: inv.customerName || inv.billingName || 'Walk-in Customer',
            date: inv.date || inv.createdAt || new Date().toISOString(),
            quantity: Number(item.quantity) || 0,
            pricePerUnit: Number(item.sellingPrice || item.pricePerUnit || activeMedicine.sellingPrice || 0),
            totalAmount: (Number(item.quantity) || 0) * Number(item.sellingPrice || item.pricePerUnit || 0),
            status: status,
            refNumber: inv.invoiceNumber ? `#${inv.invoiceNumber}` : '',
            notes: inv.description,
          });
        }
      });
    });

    // 2. Purchases from Purchase Orders
    purchaseOrders.forEach((po) => {
      if (!po.items) return;
      po.items.forEach((item, idx) => {
        const matchesId = item.medicineId && item.medicineId === medId;
        const matchesName = item.name && item.name.trim().toLowerCase() === medNameLower;
        const partialName = item.name && (item.name.toLowerCase().includes(medNameLower) || medNameLower.includes(item.name.toLowerCase()));

        if (matchesId || matchesName || (medNameLower.length > 4 && partialName)) {
          txs.push({
            id: `po-${po.id}-${item.medicineId || item.name || 'item'}-${idx}`,
            type: 'Purchase',
            name: po.supplierName || 'IMRAN PRESIDENT',
            date: po.date || new Date().toISOString(),
            quantity: Number(item.quantity) || 0,
            pricePerUnit: Number(item.purchasePrice || activeMedicine.purchasePrice || 0),
            totalAmount: Number(item.total || (item.quantity * item.purchasePrice) || 0),
            status: po.status === 'Completed' ? 'Completed' : 'Partial',
            refNumber: po.poNumber ? `${po.poNumber}` : '',
          });
        }
      });
    });

    // 3. Stock Adjustments & Opening Logs
    auditLogs.forEach((log) => {
      if (log.medicineId === medId || (log.medicineName && log.medicineName.toLowerCase() === medNameLower)) {
        txs.push({
          id: `log-${log.id}`,
          type: log.action === 'ADD_STOCK' ? 'Opening Stock' : 'Adjustment',
          name: log.notes || 'Manual Stock Adjustment',
          date: log.date || new Date().toISOString(),
          quantity: log.quantityChanged,
          pricePerUnit: activeMedicine.purchasePrice,
          totalAmount: Math.abs(log.quantityChanged) * activeMedicine.purchasePrice,
          status: 'Completed',
          notes: log.notes,
        });
      }
    });

    // If it's BLUE TEX PAD and no transactions are found yet, seed a default adjustment/opening record instead of a purchase
    if (txs.length === 0 && activeMedicine.name.toUpperCase().includes('BLUE TEX')) {
      txs.push({
        id: 'tx-blue-tex-demo-1',
        type: 'Adjustment',
        name: 'Stock Verification / Opening Adjustment',
        date: '2026-09-06T10:00:00.000Z',
        quantity: 40,
        pricePerUnit: 180.00,
        totalAmount: 7200.00,
        status: 'Completed',
        notes: 'Initial stock verification',
      });
    }

    // Sort transactions by date descending
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeMedicine, invoices, purchaseOrders, auditLogs]);

  // Filtered transactions based on search and type filter
  const filteredTransactions = useMemo(() => {
    return itemTransactions.filter((tx) => {
      const matchesSearch =
        tx.name.toLowerCase().includes(searchTransaction.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTransaction.toLowerCase()) ||
        (tx.refNumber && tx.refNumber.toLowerCase().includes(searchTransaction.toLowerCase()));

      if (!matchesSearch) return false;

      if (transactionTypeFilter === 'SALE') return tx.type === 'Sale' || tx.type === 'Sale Return';
      if (transactionTypeFilter === 'PURCHASE') return tx.type === 'Purchase' || tx.type === 'Purchase Return';
      if (transactionTypeFilter === 'ADJUSTMENT') return tx.type === 'Adjustment' || tx.type === 'Opening Stock' || tx.type === 'Stock Adjustment';

      return true;
    });
  }, [itemTransactions, searchTransaction, transactionTypeFilter]);

  // Export Selected Item Transactions to Excel
  const handleExportItemTransactionsExcel = () => {
    if (!activeMedicine) return;

    const dataToExport = filteredTransactions.map((tx) => ({
      Type: tx.type,
      'Party / Customer Name': tx.name,
      Date: formatDate(tx.date),
      Quantity: tx.quantity,
      'Price Per Unit (PKR)': tx.pricePerUnit,
      'Total Amount (PKR)': tx.totalAmount,
      Status: tx.status,
      'Ref Number': tx.refNumber || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeMedicine.name.slice(0, 20)} Ledger`);
    XLSX.writeFile(wb, `${activeMedicine.name.replace(/[^a-zA-Z0-9]/g, '_')}_Transactions.xlsx`);
    showToast(`Exported transactions for ${activeMedicine.name} to Excel.`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in select-none">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Window Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Items & Inventory Management</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Manage stock items, categories, units, and barcode tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f9]">
      {/* 1. TOP SUB-TABS BAR (PRODUCTS | DEMAND FORECAST | SMART EXPIRY | SUPPLIERS | CATEGORY | UNITS) */}
      <div className="bg-white border-b border-slate-300/80 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 sm:space-x-6 flex-shrink-0">
          
          {/* PRODUCTS TAB */}
          <button
            onClick={() => setTopTab('PRODUCTS')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap ${
              topTab === 'PRODUCTS'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            PRODUCTS
          </button>

          {/* SHORTAGE BOOK */}
          <button
            onClick={() => setTopTab('SHORTAGE')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'SHORTAGE'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>SHORTAGE REGISTER</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-black">LOST DEMAND</span>
          </button>

          {/* CONTROLLED DRUGS / NARCOTICS */}
          <button
            onClick={() => setTopTab('NARCOTICS')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'NARCOTICS'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>NARCOTICS LOG</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-black">FORM 8</span>
          </button>

          {/* CHRONIC REFILLS */}
          <button
            onClick={() => setTopTab('CHRONIC')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'CHRONIC'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>CHRONIC REFILLS</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black">WHATSAPP</span>
          </button>

          {/* SUPPLIER RETURNS */}
          <button
            onClick={() => setTopTab('RETURNS')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'RETURNS'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>EXPIRY RETURNS</span>
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-black">DEBIT NOTE</span>
          </button>

          {/* DEMAND FORECAST & REORDER */}
          <button
            onClick={() => setTopTab('DEMAND_FORECAST')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'DEMAND_FORECAST'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>DEMAND FORECAST</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black">AI/DRAP</span>
          </button>

          {/* SMART EXPIRY */}
          <button
            onClick={() => setTopTab('SMART_EXPIRY')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap flex items-center gap-1.5 ${
              topTab === 'SMART_EXPIRY'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>SMART EXPIRY</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-black">FEFO</span>
          </button>

          {/* SUPPLIER SCORECARDS */}
          <button
            onClick={() => setTopTab('SUPPLIER_SCORECARDS')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap ${
              topTab === 'SUPPLIER_SCORECARDS'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            SUPPLIER INTELLIGENCE
          </button>

          {/* CATEGORY TAB */}
          <button
            onClick={() => setTopTab('CATEGORY')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap ${
              topTab === 'CATEGORY'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            CATEGORY
          </button>

          {/* UNITS TAB */}
          <button
            onClick={() => setTopTab('UNITS')}
            className={`py-3 sm:py-3.5 text-xs sm:text-[13px] font-extrabold tracking-wider transition-all relative whitespace-nowrap ${
              topTab === 'UNITS'
                ? 'text-[#0284c7] border-b-[3px] border-[#0284c7]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            UNITS
          </button>

        </div>

        {/* Right Top Quick Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-scanner'))}
            title="Instant Camera Product & Batch Scanner"
            className="flex items-center gap-1.5 text-[11.5px] font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-3 py-1.5 rounded-lg border border-emerald-700 transition shadow-md cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 animate-pulse" />
            <span>Camera Scan</span>
          </button>

          {selectedMedIds.length > 0 && (
            <button
              onClick={() => setShowBulkEditModal(true)}
              title="Bulk Edit Selected Products"
              className="flex items-center gap-1.5 text-[11.5px] font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-3 py-1.5 rounded-lg border border-indigo-700 transition shadow-md cursor-pointer animate-in fade-in"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedMedIds.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowShiftModal(true)}
            title="Cashier Shift Reconciliation"
            className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-300 transition shadow-2xs"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>Shift & Drawer</span>
          </button>
          <button
            onClick={downloadProductTemplateExcel}
            title="Download Excel Template"
            className="hidden sm:flex items-center gap-1 text-[11.5px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
          <button
            onClick={handleExportCSV}
            title="Export Inventory as CSV (Tax Compliance & Records)"
            className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => exportProductsToExcel(medicines)}
            title="Export All Products as Excel"
            className="flex items-center gap-1 text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            title="Import Excel"
            className="hidden sm:flex items-center gap-1 text-[11.5px] font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden">
        
        {/* VIEW 1: PRODUCTS (Exact Dual-Pane Layout from User's Image) */}
        {topTab === 'PRODUCTS' && (
          <div className="flex h-full overflow-hidden bg-white">
            
            {/* ================= LEFT PANEL: ITEMS LIST ================= */}
            <div className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 flex-col h-full border-r border-slate-300 bg-white ${
              mobileView === 'list' ? 'flex' : 'hidden md:flex'
            }`}>
              
              {/* Left Top Search & Add Item Header */}
              <div className="p-2.5 border-b border-slate-200 flex items-center gap-2 bg-slate-50/70">
                
                {/* Search Box */}
                <div className="relative flex-1 flex items-center">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search item..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchItem ? (
                    <button onClick={() => setSearchItem('')} className="absolute right-2 top-1.5 text-slate-400 text-xs">✕</button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsScanningForSearch(true)}
                      title="Scan Barcode using Camera"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 rounded"
                    >
                      <Scan className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* + Add Item Button with Split Dropdown */}
                <div className="relative flex items-center shadow-xs rounded-lg">
                  <button
                    onClick={() => { setEditingMedicine(null); setShowAddForm(true); }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-l-lg flex items-center gap-1.5 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Item</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAddDropdown(!showAddDropdown);
                      setShowMoreActionsDropdown(false);
                    }}
                    className="bg-amber-700 hover:bg-amber-800 text-white p-2 rounded-r-lg border-l border-amber-600/60 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Add Dropdown Menu */}
                  {showAddDropdown && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowAddDropdown(false)} />
                      <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="py-1">
                          <button
                            onClick={() => { setShowAddDropdown(false); setEditingMedicine(null); setShowAddForm(true); }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Add New Product</span>
                          </button>
                          <button
                            onClick={() => { setShowAddDropdown(false); setShowImportModal(true); }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Import from Excel</span>
                          </button>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowAddDropdown(false);
                              handleSeedDemoItems();
                            }}
                            className="w-full px-3.5 py-2 text-left text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Restore 30 Demo Items</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 3 dots menu */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMoreActionsDropdown(!showMoreActionsDropdown);
                      setShowAddDropdown(false);
                    }}
                    title="More Inventory Actions"
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      showMoreActionsDropdown 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMoreActionsDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMoreActionsDropdown(false)} 
                      />
                      <div 
                        className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Inventory Actions</span>
                          <span className="text-[10px] text-slate-400 font-normal">{filteredMeds.length} items</span>
                        </div>

                        {/* Group 1: Batch & Import / Export */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              setShowBulkEditModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between font-medium cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>Bulk Edit Items</span>
                            </span>
                            {selectedMedIds.length > 0 && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-bold">
                                {selectedMedIds.length} sel
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              setShowImportModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Import from Excel</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              exportProductsToExcel(medicines);
                              setToastMsg('Inventory exported to Excel (.xlsx) successfully!');
                              setTimeout(() => setToastMsg(null), 3500);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span>Export to Excel (.xlsx)</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              exportInventoryToCSV(medicines);
                              setToastMsg('Inventory exported to CSV (.csv) successfully!');
                              setTimeout(() => setToastMsg(null), 3500);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                            <span>Export to CSV (.csv)</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              downloadProductTemplateExcel();
                              setToastMsg('Sample Excel import template downloaded!');
                              setTimeout(() => setToastMsg(null), 3500);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Download Sample Template</span>
                          </button>
                        </div>

                        {/* Group 2: Compliance & Registers */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              setShowTraceabilityModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Scan className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Batch & Serial Traceability</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              setShowRecallModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            <span>Product Recall / Quarantine</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              setShowShiftModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Cashier Shift & Register Log</span>
                          </button>
                        </div>

                        {/* Group 3: Quick Selection & Demo Seed */}
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              handleSelectAllMeds();
                            }}
                            className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>{selectedMedIds.length === filteredMeds.length && filteredMeds.length > 0 ? 'Deselect All Items' : `Select All (${filteredMeds.length})`}</span>
                          </button>

                          <button
                            onClick={() => {
                              setShowMoreActionsDropdown(false);
                              handleSeedDemoItems();
                            }}
                            className="w-full px-3.5 py-2 text-left text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center gap-2.5 font-medium cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Restore 30 Demo Products</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Items List Table Header */}
              <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filteredMeds.length > 0 && selectedMedIds.length === filteredMeds.length}
                    onChange={handleSelectAllMeds}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    title="Select All / Deselect All"
                  />
                  <span>ITEM</span>
                  <Filter className="w-3 h-3 text-red-500 fill-red-500" />
                </div>
                <div className="flex items-center gap-2">
                  {selectedMedIds.length > 0 && (
                    <span className="text-indigo-600 font-bold normal-case text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      {selectedMedIds.length} sel
                    </span>
                  )}
                  <div>QUANTITY</div>
                </div>
              </div>

              {/* Items Scrollable List */}
              <div 
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
                    setItemDisplayLimit(prev => Math.min(filteredMeds.length, prev + 100));
                  }
                }}
                className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin"
              >
                {displayedMeds.map((med) => {
                  const isSelected = med.id === activeMedicine?.id;
                  const isChecked = selectedMedIds.includes(med.id);
                  const isNegativeOrZero = med.quantity <= 0;

                  return (
                    <div
                      key={med.id}
                      onClick={() => {
                        setActiveMedicineId(med.id);
                        setMobileView('detail');
                      }}
                      onDoubleClick={() => {
                        setEditingMedicine(med);
                        setShowAddForm(true);
                      }}
                      title="Double click to edit/view product details"
                      className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-colors relative group ${
                        isSelected
                          ? 'bg-[#dbeafe] text-slate-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {/* Left: Checkbox + Item Name & Category */}
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => handleToggleSelectMed(med.id, e)}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold uppercase truncate flex items-center gap-1.5">
                            <span className="truncate">{med.name}</span>
                            {med.isControlled && (
                              <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-800 font-black rounded border border-purple-200 flex-shrink-0">
                                CTRL
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{med.category || 'General'}</span>
                            {med.genericName && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGenericModal(med);
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[120px]"
                                title={`Salt: ${med.genericName} - Click for Salt Group View`}
                              >
                                • {med.genericName}
                              </button>
                            )}
                            {med.unit && <span>• {med.unit}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity & Action Menu */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isNegativeOrZero ? 'text-[#ef4444]' : 'text-[#10b981]'
                          }`}
                        >
                          {med.quantity}
                        </span>

                        {/* 3 dots item menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemMenuOpenId(itemMenuOpenId === med.id ? null : med.id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {itemMenuOpenId === med.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemMenuOpenId(null);
                                  setEditingMedicine(med);
                                  setShowAddForm(true);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                              >
                                <Edit className="w-3.5 h-3.5 text-blue-600" />
                                Edit Item
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemMenuOpenId(null);
                                  setActiveMedicineId(med.id);
                                  setShowAdjustModal(true);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                              >
                                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                                Adjust Stock
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemMenuOpenId(null);
                                  handleDeleteMedicine(med.id, med.name);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredMeds.length > displayedMeds.length && (
                  <div className="p-2.5 text-center bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setItemDisplayLimit(prev => Math.min(filteredMeds.length, prev + 100))}
                      className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-xs font-bold transition cursor-pointer"
                    >
                      Load More (+100)
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemDisplayLimit(filteredMeds.length)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                    >
                      All ({filteredMeds.length})
                    </button>
                  </div>
                )}

                {filteredMeds.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No items found matching "{searchItem}".
                  </div>
                )}
              </div>

              {/* Items List Footer Count */}
              <div className="p-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex justify-between items-center px-3.5">
                <span>Total: <strong className="text-slate-800">{medicines.length}</strong> items</span>
                <button
                  onClick={handleSeedDemoItems}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Reload Demo
                </button>
              </div>

            </div>

            {/* ================= RIGHT MAIN WORKSPACE: SELECTED ITEM LEDGER ================= */}
            <div className={`flex-1 flex-col h-full bg-white overflow-y-auto ${
              mobileView === 'detail' ? 'flex' : 'hidden md:flex'
            }`}>
              
              {activeMedicine ? (
                <div className="p-4 sm:p-6 space-y-5">
                  
                  {/* Item Header & Compact Action Buttons */}
                  <div className="space-y-3 pb-3 border-b border-slate-200/80">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 flex-wrap">
                        <button
                          onClick={() => setMobileView('list')}
                          className="md:hidden flex items-center gap-1 text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0"
                          title="Back to Items List"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Items</span>
                        </button>
                        <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase break-words">
                          {activeMedicine.name}
                        </h1>
                        {activeMedicine.stockStatus === 'Quarantined' || activeMedicine.stockStatus === 'Recalled' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            {activeMedicine.stockStatus}
                          </span>
                        ) : activeMedicine.quantity <= (activeMedicine.lowStockThreshold ?? 10) ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            Low Stock ({activeMedicine.quantity})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Available
                          </span>
                        )}
                        <button
                          title="Share / Open item"
                          className="text-slate-400 hover:text-slate-700 p-1 flex-shrink-0 cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Compact Icon Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* GENERIC / SALT MASTER BUTTON */}
                      {(activeMedicine.genericName || activeMedicine.genericMasterId || activeMedicine.saltComposition) && (
                        <button
                          onClick={() => handleOpenGenericModal(activeMedicine)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-indigo-200 shadow-2xs transition active:scale-95 cursor-pointer"
                          title="View Generic Salt Master, Therapeutic Class & Brands"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[11px]">Salt Master</span>
                        </button>
                      )}

                      {/* BATCH TRACEABILITY BUTTON */}
                      <button
                        onClick={() => setShowTraceabilityModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                        title="View Complete Batch Lifecycle & Audit Trail"
                      >
                        <Package className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px]">Trace Batch</span>
                      </button>

                      {/* RECALL / QUARANTINE BUTTON */}
                      <button
                        onClick={() => setShowRecallModal(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                        title="DRAP Batch Recall & Quarantine Management"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Recall</span>
                      </button>

                      {/* EDIT MASTER BUTTON */}
                      <button
                        onClick={() => {
                          setEditingMedicine(activeMedicine);
                          setShowAddForm(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                        title="Edit Complete Product Master & Regulatory Settings"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Edit Master</span>
                      </button>

                      {/* ADJUST ITEM BUTTON */}
                      <button
                        onClick={() => setShowAdjustModal(true)}
                        className="bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                        title="Adjust Stock Quantity, Batch & Expiry"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Adjust Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Quarantined Warning Alert Banner */}
                  {(activeMedicine.stockStatus === 'Quarantined' || activeMedicine.stockStatus === 'Recalled') && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-rose-900">
                      <div className="flex items-start gap-2.5 text-xs">
                        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold text-rose-800 uppercase tracking-wide">
                            DRAP Quarantine Notice: Batch {activeMedicine.batchNumber || 'N/A'} is Blocked
                          </p>
                          <p className="text-[11.5px] text-rose-700 mt-0.5">
                            Reason: {activeMedicine.quarantineReason || 'Quarantined under DRAP / Batch quality advisory'}. Sales for this batch are strictly prohibited at POS.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnquarantineMedicine(activeMedicine)}
                        className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-lg flex-shrink-0 transition"
                      >
                        Restore to Stock
                      </button>
                    </div>
                  )}

                  {/* Summary Metric Strip (Matching exact screenshot metrics layout) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-3 border-b border-slate-200 text-xs font-semibold">
                    
                    {/* SALE PRICE */}
                    <div>
                      <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        SALE PRICE:
                      </div>
                      <div className="text-slate-800 font-bold text-sm mt-0.5 font-mono">
                        Rs {activeMedicine.sellingPrice ? activeMedicine.sellingPrice.toFixed(2) : '0.00'}
                      </div>
                    </div>

                    {/* PURCHASE PRICE */}
                    <div>
                      <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        PURCHASE PRICE:
                      </div>
                      <div className="text-slate-800 font-bold text-sm mt-0.5 font-mono">
                        Rs {activeMedicine.purchasePrice ? activeMedicine.purchasePrice.toFixed(2) : '67.00'}
                      </div>
                    </div>

                    {/* STOCK QUANTITY */}
                    <div>
                      <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        STOCK QUANTITY:
                      </div>
                      <div className={`text-sm mt-0.5 font-mono font-black ${
                        activeMedicine.quantity > 0 ? 'text-[#10b981]' : 'text-rose-600'
                      }`}>
                        {activeMedicine.quantity}
                      </div>
                    </div>

                    {/* STOCK VALUE */}
                    <div>
                      <div className="text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        STOCK VALUE:
                      </div>
                      <div className="text-[#10b981] font-bold text-sm mt-0.5 font-mono">
                        Rs {((activeMedicine.quantity > 0 ? activeMedicine.quantity : 0) * (activeMedicine.purchasePrice || 0)).toFixed(2)}
                      </div>
                    </div>

                  </div>

                  {/* STOCK ROTATION BATCHES & EXPIRY BREAKDOWN SECTION (FIFO / FEFO) */}
                  {(() => {
                    const defaultRotationMethod = settings?.item?.stockRotationMethod || 'FIFO';
                    const activeMethod = activeRotationView || defaultRotationMethod;
                    const allowExpired = !(settings?.item?.enforceExpiredBlock ?? true);
                    const rotationBatches = getStockRotationSortedBatches(activeMedicine, medicines, activeMethod, allowExpired);
                    return (
                      <div className="border border-blue-200 bg-blue-50/20 rounded-xl overflow-hidden shadow-2xs">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Layers className="w-4 h-4 text-blue-700" />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                              STOCK ROTATION QUEUE ({activeMethod})
                            </h3>
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.2 rounded-full">
                              {rotationBatches.length} {rotationBatches.length === 1 ? 'batch' : 'batches'}
                            </span>
                            {/* Method Toggle Buttons */}
                            <div className="flex items-center bg-white rounded-lg p-0.5 border border-blue-200 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setActiveRotationView('FIFO')}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  activeMethod === 'FIFO'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-blue-600'
                                }`}
                              >
                                FIFO (Oldest In)
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveRotationView('FEFO')}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  activeMethod === 'FEFO'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-600'
                                }`}
                              >
                                FEFO (Earliest Exp)
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-500 hidden md:inline">
                              {activeMethod === 'FIFO' ? 'Prioritized: Oldest Purchase First' : 'Prioritized: Earliest Expiry First'}
                            </span>
                            <button
                              onClick={() => setShowAdjustModal(true)}
                              className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Sliders className="w-3 h-3 text-blue-600" />
                              <span>Adjust Stock</span>
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                                <th className="py-2 px-3">{activeMethod} PRIORITY</th>
                                <th className="py-2 px-3">BATCH NO</th>
                                <th className="py-2 px-3">PURCHASE DATE</th>
                                <th className="py-2 px-3">EXPIRY DATE</th>
                                <th className="py-2 px-3 text-center">STATUS</th>
                                <th className="py-2 px-3 text-right">QUANTITY</th>
                                <th className="py-2 px-3 text-right">PUR. RATE</th>
                                <th className="py-2 px-3 text-right">SALE RATE</th>
                                <th className="py-2 px-3 text-right">MRP</th>
                                <th className="py-2 px-3">LOCATION</th>
                                <th className="py-2 px-3 text-center">ACTION</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium bg-white">
                              {rotationBatches.map((b) => {
                                const isSoonest = b.isPrimary;
                                const isExpired = b.isExpired;
                                const isNear = b.isNearExpiry;
                                const days = b.daysUntilExpiry;

                                return (
                                  <tr 
                                    key={b.batchNumber}
                                    className={`transition-colors ${
                                      isSoonest ? (activeMethod === 'FIFO' ? 'bg-blue-50/70 font-semibold' : 'bg-emerald-50/70 font-semibold') : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3">
                                      {isSoonest ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-2xs ${
                                          activeMethod === 'FIFO' ? 'bg-blue-600' : 'bg-emerald-600'
                                        }`}>
                                          <Check className="w-3 h-3" /> #1 FIRST OUT ({activeMethod})
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-bold text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-100">
                                          #{b.rank} Next in Queue
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                      {b.batchNumber}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-slate-700 text-xs">
                                      {b.purchaseDate ? b.purchaseDate.slice(0, 10) : 'Initial Stock'}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs font-semibold text-slate-800">
                                          {b.expiryDate ? b.expiryDate.slice(0, 10) : 'N/A'}
                                        </span>
                                        {isExpired ? (
                                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 font-bold rounded text-[10px]">
                                            Expired
                                          </span>
                                        ) : isNear ? (
                                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                                            {days}d left
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-medium rounded text-[10px]">
                                            {days > 365 ? `${(days / 365).toFixed(1)}y` : `${days}d`}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        b.status === 'Quarantined' || b.status === 'Recalled'
                                          ? 'bg-purple-100 text-purple-800'
                                          : isExpired
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {b.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                      {b.quantity} {activeMedicine.unit || 'Box'}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      Rs {b.purchasePrice.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                                      Rs {b.sellingPrice.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                      Rs {b.mrp.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                      {b.rackLocation || activeMedicine.rackLocation || 'Rack A-1'}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        onClick={() => setShowTraceabilityModal(true)}
                                        title="View Batch Traceability Report"
                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TRANSACTIONS SECTION */}
                  <div className="space-y-3 pt-2">
                    
                    {/* Transactions Header & Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                          TRANSACTIONS
                        </h2>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {filteredTransactions.length} records
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Transaction Search */}
                        <div className="relative w-48 sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTransaction}
                            onChange={(e) => setSearchTransaction(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Excel Export Icon (Green xlsx icon) */}
                        <button
                          onClick={handleExportItemTransactionsExcel}
                          title="Export Transactions to Excel (.xlsx)"
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition active:scale-95"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Filter Type Chips */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setTransactionTypeFilter('ALL')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                          transactionTypeFilter === 'ALL'
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setTransactionTypeFilter('SALE')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                          transactionTypeFilter === 'SALE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Sales
                      </button>
                      <button
                        onClick={() => setTransactionTypeFilter('PURCHASE')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                          transactionTypeFilter === 'PURCHASE'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Purchases
                      </button>
                      <button
                        onClick={() => setTransactionTypeFilter('ADJUSTMENT')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                          transactionTypeFilter === 'ADJUSTMENT'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Adjustments
                      </button>
                    </div>

                    {/* Transactions Table (Matching exact columns from screenshot) */}
                    <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1">
                                <span>TYPE</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1">
                                <span>NAME</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-3.5 py-2.5">
                              <div className="flex items-center gap-1">
                                <span>↓ DATE</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span>QUANTITY</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span>PRICE/ UNIT</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-3.5 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span>STATUS</span>
                                <Filter className="w-3 h-3 text-slate-400" />
                              </div>
                            </th>
                            <th className="px-2 py-2.5 text-right"></th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredTransactions.map((tx) => {
                            const isPurchase = tx.type === 'Purchase';
                            const isSale = tx.type === 'Sale';
                            const isAdjustment = tx.type === 'Adjustment' || tx.type === 'Opening Stock';

                            const dotColor = isPurchase
                              ? 'bg-rose-400'
                              : isSale
                              ? 'bg-blue-500'
                              : 'bg-amber-500';

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition">
                                
                                {/* TYPE */}
                                <td className="px-3.5 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                    <span className="font-bold text-slate-900">{tx.type}</span>
                                    {tx.refNumber && (
                                      <span className="text-[10px] text-slate-400 font-mono">({tx.refNumber})</span>
                                    )}
                                  </div>
                                </td>

                                {/* NAME (Party who bought or supplied) */}
                                <td className="px-3.5 py-3 font-semibold text-slate-800">
                                  <div className="truncate max-w-[220px] uppercase">
                                    {tx.name}
                                  </div>
                                </td>

                                {/* DATE */}
                                <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-600">
                                  {formatDate(tx.date)}
                                </td>

                                {/* QUANTITY */}
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {isSale ? (
                                    <span className="text-blue-700">{tx.quantity}</span>
                                  ) : (
                                    <span>{tx.quantity}</span>
                                  )}
                                </td>

                                {/* PRICE / UNIT */}
                                <td className="px-3.5 py-3 text-right font-mono text-slate-700 whitespace-nowrap">
                                  Rs {tx.pricePerUnit.toFixed(2)}
                                </td>

                                {/* STATUS */}
                                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      tx.status === 'Paid' || tx.status === 'Completed'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : tx.status === 'Partial'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </td>

                                {/* ACTIONS */}
                                <td className="px-2 py-3 text-right">
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      title="Transaction Options"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTxMenuOpenId(txMenuOpenId === tx.id ? null : tx.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {txMenuOpenId === tx.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-30" 
                                          onClick={(e) => { e.stopPropagation(); setTxMenuOpenId(null); }} 
                                        />
                                        <div 
                                          className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 py-1 text-xs text-left animate-in fade-in zoom-in-95 duration-100"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800">
                                            {tx.type} • {tx.refNumber || 'Ref'}
                                          </div>
                                          {tx.name && tx.name !== '-' && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSearchTransaction(tx.name);
                                                setTxMenuOpenId(null);
                                              }}
                                              className="w-full px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Filter className="w-3.5 h-3.5 text-blue-500" />
                                              <span>Filter by Party</span>
                                            </button>
                                          )}
                                          {tx.refNumber && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(tx.refNumber || '');
                                                setToastMsg(`Copied ${tx.refNumber} to clipboard!`);
                                                setTimeout(() => setToastMsg(null), 2500);
                                                setTxMenuOpenId(null);
                                              }}
                                              className="w-full px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                            >
                                              <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                                              <span>Copy Reference</span>
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              window.print();
                                              setTxMenuOpenId(null);
                                            }}
                                            className="w-full px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Printer className="w-3.5 h-3.5 text-purple-500" />
                                            <span>Print Statement</span>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            );
                          })}

                          {filteredTransactions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-xs text-slate-400">
                                No transactions recorded for this item yet. Click <strong>ADJUST ITEM</strong> or add a Sale/Purchase to create transactions.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-12 text-center text-slate-400 text-xs">
                  Select an item from the left panel to view its stock details and transactions history.
                </div>
              )}

            </div>

          </div>
        )}

        {/* PHARMACY TAB: SHORTAGE REGISTER */}
        {topTab === 'SHORTAGE' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <ShortageBookTab />
          </div>
        )}

        {/* PHARMACY TAB: NARCOTICS & CONTROLLED DRUGS REGISTER */}
        {topTab === 'NARCOTICS' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <NarcoticsLogTab />
          </div>
        )}

        {/* PHARMACY TAB: CHRONIC PATIENT REFILL REMINDERS */}
        {topTab === 'CHRONIC' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <ChronicRefillsTab />
          </div>
        )}

        {/* PHARMACY TAB: SUPPLIER NEAR-EXPIRY & DAMAGE RETURNS */}
        {topTab === 'RETURNS' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <SupplierReturnTab />
          </div>
        )}

        {/* VIEW 2: DEMAND FORECAST & REORDER (DRAP & AI Inventory Planning) */}
        {topTab === 'DEMAND_FORECAST' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <DemandForecastView
              medicines={medicines}
              invoices={invoices}
              onCreatePOFromForecast={(med, qty) => {
                showToast(`Created PO draft for ${qty} units of ${med.name}`);
                navigate('/purchases');
              }}
            />
          </div>
        )}

        {/* VIEW 3: SMART EXPIRY & BATCH RISK (FEFO Engine) */}
        {topTab === 'SMART_EXPIRY' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <ExpiryManagementView
              medicines={medicines}
              onOpenTraceability={(med) => {
                setActiveMedicineId(med.id);
                setShowTraceabilityModal(true);
              }}
              onOpenRecall={(med, batch) => {
                setActiveMedicineId(med.id);
                setShowRecallModal(true);
              }}
              onQuarantineExpired={async (med) => {
                await handleConfirmQuarantine(med.id, med.batchNumber || 'N/A', {
                  id: 'rec-' + Date.now(),
                  medicineId: med.id,
                  medicineName: med.name,
                  batchNumber: med.batchNumber || 'N/A',
                  recallDate: new Date().toISOString(),
                  reason: 'Expired stock quarantined under DRAP guidelines',
                  issuedBy: 'Pharmacy Manager',
                  affectedStockQty: med.quantity,
                  quarantinedQty: med.quantity,
                  status: 'ACTIVE_RECALL',
                  affectedInvoicesCount: 0,
                  affectedCustomersCount: 0,
                  notes: 'Quarantined directly from Expiry Management dashboard',
                  createdAt: new Date().toISOString()
                });
              }}
            />
          </div>
        )}

        {/* VIEW 4: SUPPLIER SCORECARDS & INTELLIGENCE */}
        {topTab === 'SUPPLIER_SCORECARDS' && (
          <div className="p-4 sm:p-6 overflow-y-auto h-full">
            <SupplierIntelligenceView
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              onNewPO={(sup) => {
                navigate('/purchases');
              }}
            />
          </div>
        )}

        {/* VIEW 5: CATEGORY VIEW (Highlighted in user's circle) */}
        {topTab === 'CATEGORY' && (
          <div className="p-5 sm:p-6 overflow-y-auto h-full">
            <CategoryView
              medicines={medicines}
              onSelectCategory={(catName) => {
                setCategoryFilter(catName);
                setTopTab('PRODUCTS');
              }}
              onAddMedicineInCategory={(catName) => {
                setEditingMedicine({
                  id: '',
                  barcode: '',
                  name: '',
                  batchNumber: '',
                  manufacturer: '',
                  category: catName,
                  unit: 'PCS',
                  quantity: 50,
                  lowStockThreshold: 10,
                  purchasePrice: 0,
                  mrp: 0,
                  sellingPrice: 0,
                  gstPercentage: 0,
                  expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                setShowAddForm(true);
              }}
            />
          </div>
        )}

        {/* VIEW 6: UNITS VIEW */}
        {topTab === 'UNITS' && (
          <div className="p-5 sm:p-6 overflow-y-auto h-full">
            <UnitsView />
          </div>
        )}

      </div>

      {/* MODAL 1: ADD / EDIT MEDICINE FORM */}
      {showAddForm && (
        <AddEditMedicineModal
          isOpen={showAddForm}
          medicine={editingMedicine}
          onClose={() => {
            setShowAddForm(false);
            setEditingMedicine(null);
          }}
          onSaved={(savedMed) => {
            loadAllData();
            setActiveMedicineId(savedMed.id);
            showToast('Saved product successfully.');
          }}
        />
      )}

      {/* MODAL 2: ADJUST ITEM STOCK MODAL */}
      <AdjustItemModal
        isOpen={showAdjustModal}
        medicine={activeMedicine}
        onClose={() => setShowAdjustModal(false)}
        onSuccess={(updated) => {
          loadAllData();
          showToast(`Stock updated for ${updated.name}.`);
        }}
      />

      {/* MODAL 3: BATCH TRACEABILITY & AUDIT TRAIL MODAL */}
      <BatchTraceabilityModal
        isOpen={showTraceabilityModal}
        medicine={activeMedicine}
        invoices={invoices}
        purchaseOrders={purchaseOrders}
        suppliers={suppliers}
        onClose={() => setShowTraceabilityModal(false)}
      />

      {/* MODAL 4: DRAP PRODUCT RECALL & QUARANTINE MODAL */}
      <ProductRecallModal
        isOpen={showRecallModal}
        medicine={activeMedicine}
        invoices={invoices}
        onClose={() => setShowRecallModal(false)}
        onConfirmQuarantine={handleConfirmQuarantine}
      />

      {/* MODAL 5: CASHIER SHIFT & DRAWER RECONCILIATION */}
      <CashierShiftModal
        isOpen={showShiftModal}
        currentShift={currentShift}
        cashierName={userProfile?.name || 'Admin'}
        invoicesToday={invoices}
        onClose={() => setShowShiftModal(false)}
        onOpenShift={(openingCash, notes, shiftType) => {
          const shift: CashierShift = {
            id: 'shift_' + Date.now(),
            shiftNumber: 'SH-' + Math.floor(1000 + Math.random() * 9000),
            cashierId: userProfile?.id || 'u1',
            cashierName: userProfile?.name || 'Admin',
            shiftType: shiftType || 'General',
            startTime: new Date().toISOString(),
            openingCash,
            cashSales: 0,
            cardSales: 0,
            bankSales: 0,
            creditSales: 0,
            totalSales: 0,
            invoicesCount: 0,
            cashIn: 0,
            cashOut: 0,
            notes,
            status: 'OPEN',
            createdAt: new Date().toISOString()
          };
          setCurrentShift(shift);
          showToast(`Shift ${shift.shiftNumber} opened with Rs ${openingCash.toLocaleString()} float.`);
        }}
        onCloseShift={(actualCash, diffReason, notes, denominations, supervisorName) => {
          if (currentShift) {
            const closed: CashierShift = {
              ...currentShift,
              endTime: new Date().toISOString(),
              actualCash,
              differenceReason: diffReason,
              notes,
              denominations,
              supervisorName,
              status: 'CLOSED',
              updatedAt: new Date().toISOString()
            };
            setCurrentShift(closed);
            showToast(`Shift ${closed.shiftNumber} closed and reconciled.`);
          }
        }}
      />

      {/* MODAL 6: EXCEL PRODUCT IMPORT MODAL */}
      <ImportProductsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(count) => {
          showToast(`Successfully imported ${count} medicines into inventory.`);
          loadAllData();
        }}
        onSaveProducts={handleBulkSaveProducts}
      />

      {/* Confirm Delete Product Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetMed)}
        title="Delete Medicine / Product?"
        message="Are you sure you want to delete this product from your inventory? This action cannot be undone."
        itemName={deleteTargetMed?.name}
        confirmLabel="Yes, Delete Product"
        isDeleting={isDeletingMed}
        onConfirm={handleConfirmDeleteMedicine}
        onClose={() => setDeleteTargetMed(null)}
      />

      {/* Barcode Search Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScanningForSearch}
        onClose={() => setIsScanningForSearch(false)}
        onScanSuccess={handleBarcodeSearchScanned}
        title="Scan Barcode (Inventory Search & Filter)"
      />

      {/* MODAL 7: BULK EDIT INVENTORY ITEMS MODAL */}
      {showBulkEditModal && selectedMedicines.length > 0 && (
        <BulkEditModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          selectedMedicines={selectedMedicines}
          onUpdated={async () => {
            await loadAllData();
            setSelectedMedIds([]);
            showToast(`Successfully updated ${selectedMedicines.length} products in batch.`);
          }}
        />
      )}

      {/* MODAL 8: GENERIC / SALT MASTER QUICK VIEW MODAL */}
      {showGenericModal && selectedGenericSummary && (
        <GenericQuickViewModal
          isOpen={showGenericModal}
          onClose={() => {
            setShowGenericModal(false);
            setSelectedGenericSummary(null);
          }}
          summary={selectedGenericSummary}
          onSelectMedicine={(med) => {
            setActiveMedicineId(med.id);
            setMobileView('detail');
            setShowGenericModal(false);
          }}
        />
      )}

      </div>
    </div>
  );
};

// ================= ADD / EDIT PRODUCT MODAL FORM (MULTI-PAGE & TABBED UI) =================
const AddMedicineForm: React.FC<{
  medicine?: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ medicine, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'IMAGES' | 'PRICING' | 'ONLINE_STORE'>('GENERAL');
  
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    genericName: '',
    barcode: '',
    batchNumber: '',
    manufacturer: '',
    category: 'Surgical Items',
    unit: 'PCS',
    rackLocation: 'Rack A-1',
    hsnCode: '3004.9090',
    description: '',
    quantity: 100,
    lowStockThreshold: 20,
    purchasePrice: 0,
    mrp: 0,
    sellingPrice: 0,
    gstPercentage: 0,
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
    // Online Store fields
    showOnline: true,
    onlineStatus: 'Published',
    onlinePrice: 0,
    compareAtPrice: 0,
    onlineDescription: '',
    onlineImages: [],
  });

  const [isScanningBarcode, setIsScanningBarcode] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'file'>('url');

  useEffect(() => {
    if (medicine) {
      setFormData({
        ...medicine,
        name: medicine.name || '',
        genericName: medicine.genericName || '',
        barcode: medicine.barcode || '',
        batchNumber: medicine.batchNumber || '',
        manufacturer: medicine.manufacturer || '',
        category: medicine.category || 'Surgical Items',
        unit: medicine.unit || 'PCS',
        rackLocation: medicine.rackLocation || 'Rack A-1',
        hsnCode: medicine.hsnCode || '3004.9090',
        description: medicine.description || '',
        quantity: medicine.quantity ?? 100,
        lowStockThreshold: medicine.lowStockThreshold ?? 20,
        purchasePrice: medicine.purchasePrice ?? 0,
        mrp: medicine.mrp ?? 0,
        sellingPrice: medicine.sellingPrice ?? 0,
        gstPercentage: medicine.gstPercentage ?? 0,
        expiryDate: medicine.expiryDate ? medicine.expiryDate.slice(0, 10) : '',
        showOnline: medicine.showOnline ?? true,
        onlineStatus: medicine.onlineStatus || 'Published',
        onlinePrice: medicine.onlinePrice ?? medicine.sellingPrice ?? 0,
        compareAtPrice: medicine.compareAtPrice ?? 0,
        onlineCategory: medicine.onlineCategory || medicine.category || '',
        onlineDescription: medicine.onlineDescription || '',
        onlineImages: medicine.onlineImages || (medicine.description ? [medicine.description] : []),
      });
    }
  }, [medicine]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const currentImages = formData.onlineImages || [];
      setFormData({
        ...formData,
        onlineImages: [result, ...currentImages],
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newMed: Medicine = {
      ...(formData as Medicine),
      id: medicine && medicine.id ? medicine.id : uuidv4(),
      barcode: formData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      category: formData.category || 'Surgical Items',
      unit: formData.unit || 'PCS',
      onlinePrice: formData.onlinePrice || formData.sellingPrice || 0,
      createdAt: medicine?.createdAt ? medicine.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dbMedicines.save(newMed);

    // Create Audit Log
    const audit: AuditLog = {
      id: uuidv4(),
      date: new Date().toISOString(),
      action: medicine?.id ? 'ADJUST_STOCK' : 'ADD_STOCK',
      medicineId: newMed.id,
      medicineName: newMed.name,
      quantityChanged: newMed.quantity,
      userId: 'admin',
      notes: `${medicine?.id ? 'Updated' : 'Created'} item with rich details & online store rate. Batch: ${newMed.batchNumber || 'N/A'}`,
    };
    await dbAuditLogs.save(audit);

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Inventory & E-Commerce Manager</span>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              {medicine?.id ? 'Edit Product & Online Rates' : 'Add New Product & Online Listing'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-lg font-bold transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation (Pages) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'GENERAL'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>1. General & Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMAGES')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'IMAGES'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>2. Product Images & Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ONLINE_STORE')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ONLINE_STORE'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>3. Online Store Rates</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <form id="add-med-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* ================= TAB 1: GENERAL & PRICING (MERGED) ================= */}
            {activeTab === 'GENERAL' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <strong>Page 1 of 3:</strong> Enter core product identity, pricing, stock levels, batch, expiry, and warehouse location.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product / Item Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. BLUE TEX PAD or INFUSION SET 10CC"
                      value={formData.name || ''}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs uppercase font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Generic Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Generic Formula / Composition</label>
                    <input
                      type="text"
                      placeholder="e.g. Paracetamol / Sodium Chloride"
                      value={formData.genericName || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category *</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.category || 'Surgical Items'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Surgical Items">Surgical Items</option>
                      <option value="Syringes">Syringes</option>
                      <option value="IV Infusions">IV Infusions</option>
                      <option value="Diagnostic Devices">Diagnostic Devices</option>
                      <option value="General Medicines">General Medicines</option>
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Bandages & Dressing">Bandages & Dressing</option>
                      <option value="Hospital Disposables">Hospital Disposables</option>
                      <option value="Orthopedic Support">Orthopedic Support</option>
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Unit of Measurement *</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={formData.unit || 'PCS'}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="PACK">PACK</option>
                      <option value="STRIP">STRIP</option>
                      <option value="BOTTLE">BOTTLE</option>
                      <option value="SET">SET</option>
                      <option value="VIAL">VIAL</option>
                      <option value="ROLL">ROLL</option>
                      <option value="KG">KG</option>
                      <option value="LITRE">LITRE</option>
                    </select>
                  </div>

                  {/* Barcode */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Barcode / SKU</label>
                      <button
                        type="button"
                        onClick={() => setIsScanningBarcode(true)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Scan className="w-3 h-3" />
                        <span>Scan Camera</span>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="8964000190059"
                        value={formData.barcode || ''}
                        className="w-full rounded-xl border border-slate-300 p-2 pr-9 text-xs font-mono"
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setIsScanningBarcode(true)}
                        className="absolute right-2 text-slate-400 hover:text-indigo-600 p-1"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Manufacturer */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Manufacturer / Company</label>
                    <input
                      type="text"
                      placeholder="Surgical Care Pakistan / Pfizer"
                      value={formData.manufacturer || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>

                  {/* Rack Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Warehouse Rack / Shelf Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Rack A-3, Shelf 2"
                      value={formData.rackLocation || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs uppercase"
                      onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    />
                  </div>
                </div>

                {/* Pricing & Stock Section Divider */}
                <div className="pt-3 border-t border-slate-200">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">
                    Pricing, Cost & Stock Levels
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Purchase Cost */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Purchase / Cost Price (Rs) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.purchasePrice ?? 0}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono"
                        onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    {/* MRP */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">MRP / Maximum Retail Price (Rs)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.mrp ?? 0}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono"
                        onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Standard Sale Price */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">POS / Retail Sale Price (Rs) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.sellingPrice ?? 0}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono text-emerald-600 bg-emerald-50/30"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData({ 
                            ...formData, 
                            sellingPrice: val,
                            onlinePrice: formData.onlinePrice || val 
                          });
                        }}
                      />
                    </div>

                    {/* GST / Tax Percentage */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">GST / Tax Percentage (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.gstPercentage ?? 0}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                        onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Initial Quantity */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Initial Stock Quantity *</label>
                      <input
                        required
                        type="number"
                        value={formData.quantity ?? 100}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono"
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Low Stock Threshold */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        value={formData.lowStockThreshold ?? 20}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                        onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Batch Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Batch Number</label>
                      <input
                        type="text"
                        placeholder="BATCH-990"
                        value={formData.batchNumber || ''}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs uppercase"
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      />
                    </div>

                    {/* Expiry Date */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiryDate ? formData.expiryDate.slice(0, 10) : ''}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-2 space-y-1 pt-2">
                      <label className="text-xs font-bold text-slate-700">Detailed Product Description & Usage Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Write specifications, dosage, material quality, or usage instructions..."
                        value={formData.description || ''}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('IMAGES')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: Product Images &rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 2: IMAGES & UPLOADING ================= */}
            {activeTab === 'IMAGES' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                  <strong>Page 2 of 3:</strong> Upload product photos or provide image URLs. These images will be displayed in POS invoices, inventory cards, and the online customer store.
                </div>

                {/* Primary Image Preview */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-28 h-28 rounded-xl bg-white border border-slate-300 flex items-center justify-center overflow-hidden shadow-inner shrink-0 bg-slate-100">
                    {formData.onlineImages && formData.onlineImages.length > 0 && formData.onlineImages[0] ? (
                      <img 
                        src={formData.onlineImages[0]} 
                        alt="Product Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80'; }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400 text-[11px]">
                        No Image Uploaded
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                          imageInputMode === 'url' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        Image URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('file')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                          imageInputMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        Upload File (Device)
                      </button>
                    </div>

                    {imageInputMode === 'url' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Primary Image URL</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={formData.onlineImages?.[0] || ''}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                          onChange={(e) => {
                            const val = e.target.value;
                            const imgs = [...(formData.onlineImages || [])];
                            imgs[0] = val;
                            setFormData({ ...formData, onlineImages: imgs });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Select Image File from Device</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Sample Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Or Pick a Professional Sample Photo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { name: 'Surgical Pad', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80' },
                      { name: 'Medical Syringe', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300&auto=format&fit=crop&q=80' },
                      { name: 'IV Infusion', url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=300&auto=format&fit=crop&q=80' },
                      { name: 'Pharmacy Pills', url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80' },
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const imgs = [sample.url, ...(formData.onlineImages || [])];
                          setFormData({ ...formData, onlineImages: imgs });
                        }}
                        className="p-2 border border-slate-200 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50 flex flex-col items-center gap-1.5 transition-all cursor-pointer group"
                      >
                        <img src={sample.url} alt={sample.name} className="w-14 h-14 rounded-lg object-cover shadow-2xs group-hover:scale-105 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-700">{sample.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('GENERAL')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    &larr; Back: General & Pricing
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ONLINE_STORE')}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: Online Store Rates &rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* ================= TAB 3: ONLINE STORE RATES & E-COMMERCE ================= */}
            {activeTab === 'ONLINE_STORE' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-purple-950">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                    <span>Page 3 of 3: Dedicated Online Storefront Rates & E-Commerce Control</span>
                  </div>
                  <p className="text-purple-800 leading-relaxed">
                    Set independent online store pricing, discount strike-through prices, online publishing status, and specialized e-commerce descriptions for customer browsing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                  {/* Publish Toggle */}
                  <div className="sm:col-span-2 flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Publish on Customer Online Store</span>
                      <span className="text-[11px] text-slate-500">Allow customers to view and order this item directly via your online portal</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showOnline ?? true}
                        onChange={(e) => setFormData({ ...formData, showOnline: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Online Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Publishing Status</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                      value={formData.onlineStatus || 'Published'}
                      onChange={(e) => setFormData({ ...formData, onlineStatus: e.target.value as any })}
                    >
                      <option value="Published">Published (Active)</option>
                      <option value="Draft">Draft (Hidden from Catalog)</option>
                      <option value="Hidden">Hidden</option>
                      <option value="Out of Stock">Mark Out of Stock Online</option>
                    </select>
                  </div>

                  {/* Online Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Store Price (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 190.00"
                      value={formData.onlinePrice ?? formData.sellingPrice ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold font-mono text-purple-700 bg-white"
                      onChange={(e) => setFormData({ ...formData, onlinePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Compare at Price (Strike-through discount) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Original / Compare-At Price (Rs) (For Discounts)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 250.00 (Shows as crossed out)"
                      value={formData.compareAtPrice ?? 0}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono"
                      onChange={(e) => setFormData({ ...formData, compareAtPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Online Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Store Display Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Medical Care & Emergency"
                      value={formData.onlineCategory || formData.category || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      onChange={(e) => setFormData({ ...formData, onlineCategory: e.target.value })}
                    />
                  </div>

                  {/* Online Description */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Online Store Rich Description</label>
                    <textarea
                      rows={2}
                      placeholder="Compelling promotional description for online buyers..."
                      value={formData.onlineDescription || ''}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      onChange={(e) => setFormData({ ...formData, onlineDescription: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('IMAGES')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    &larr; Back: Images
                  </button>
                  <button
                    type="submit"
                    form="add-med-form"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <span>{medicine?.id ? 'Save Product & Online Rates' : 'Publish Product & Save'}</span>
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Active Tab: <span className="font-bold uppercase text-blue-600">{activeTab}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-med-form"
              className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {medicine?.id ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>

      </div>

      <BarcodeScannerModal
        isOpen={isScanningBarcode}
        onClose={() => setIsScanningBarcode(false)}
        onScanSuccess={(scannedCode) => {
          setFormData((prev) => ({ ...prev, barcode: scannedCode }));
          setIsScanningBarcode(false);
        }}
        title="Scan Barcode for Product"
      />

    </div>
  );
};
