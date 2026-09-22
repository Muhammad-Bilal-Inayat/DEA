import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Trash2, Check, Zap, Calculator, Settings, 
  Search, Calendar, Camera, Upload, Image as ImageIcon,
  ChevronDown, FileText, CheckCircle2, AlertCircle, AlertTriangle, ShoppingBag, 
  ArrowRight, Sparkles, Building2, User, Minus, Maximize2, Minimize2,
  MoreVertical, Clock, Keyboard, Scan
} from 'lucide-react';
import { dbMedicines, dbSuppliers, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { Medicine, Supplier, PurchaseOrder, PurchaseOrderItem, AuditLog, PurchaseBillItem } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { InvoiceSettingsModal } from '../sales/InvoiceSettingsModal';
import { KeyboardShortcutsCheatSheetModal } from '../common/KeyboardShortcutsCheatSheetModal';
import { v4 as uuidv4 } from 'uuid';
import { getRecentPurchasePrices, calculateProportionalExpenses, calculateWeightedAverageCost, calculateCostChangePercentage } from '../../lib/inventoryCosting';
import { deductPurchaseReturnFromMedicine } from '../../lib/fefoEngine';
import { addPurchaseStockToMedicine } from '../../lib/stockRotationEngine';
import { HistoricalPriceDropdown } from '../common/HistoricalPriceDropdown';
import { emitToast } from '../../contexts/ToastContext';
import { TransactionSaveConfirmModal } from '../common/TransactionSaveConfirmModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { playScannerBeep } from '../../lib/barcodeAudio';

interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedOrder?: PurchaseOrder) => void;
  transactionType?: 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return';
  initialOrder?: PurchaseOrder | null;
  dockDraftId?: string;
  isDockMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
  onSummaryChange?: (summary: { partyName: string; amount: number; itemCount: number; title?: string }) => void;
}

const COMMON_UNITS = ['NONE', 'PCS', 'BOX', 'STRIP', 'BOTTLE', 'PACK', 'SET', 'VIAL', 'ROLL', 'BAG'];

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  transactionType = 'Purchase',
  initialOrder,
  dockDraftId,
  isDockMinimized,
  onMinimizeChange,
  onSummaryChange
}) => {
  const { business } = useAuth();
  const { settings } = useSettings();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  
  // Tabs & Bill Identification
  const [activeTabNumber, setActiveTabNumber] = useState(1);
  const [billNumber, setBillNumber] = useState('1');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));

  // Additional Form Fields configured via Settings
  const [billingName, setBillingName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Due on Receipt');
  const [dueDate, setDueDate] = useState('');

  // Selected Party
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Items State
  const [items, setItems] = useState<PurchaseBillItem[]>([
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, total: 0 },
    { id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, total: 0 }
  ]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [medicineDropdownRow, setMedicineDropdownRow] = useState<number | null>(null);
  const [tableMedSelectedIndex, setTableMedSelectedIndex] = useState(0);
  const [supplierSelectedIndex, setSupplierSelectedIndex] = useState(0);
  const [lightningSelectedIndex, setLightningSelectedIndex] = useState(0);

  // Helper to focus any table cell by column name and row index or bottom controls
  const focusTableCell = (row: number, col: string) => {
    requestAnimationFrame(() => {
      if (col === 'paidAmount') {
        paidAmountInputRef.current?.focus();
        paidAmountInputRef.current?.select();
        return;
      }
      if (col === 'saveButton') {
        saveButtonRef.current?.focus();
        return;
      }
      const el = document.querySelector(`[data-pcell="${col}-${row}"]`) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        el.focus();
        if ('select' in el && typeof (el as any).select === 'function') {
          (el as HTMLInputElement).select();
        }
      }
    });
  };

  // Quick / Rapid Entry Bar
  const lightningInputRef = useRef<HTMLInputElement>(null);
  const lightningQtyInputRef = useRef<HTMLInputElement>(null);
  const lightningPriceInputRef = useRef<HTMLInputElement>(null);
  const paidAmountInputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState<'save' | 'save_and_new'>('save');

  // Open Save Confirmation Dialog with validation
  const handleInitiateSave = (mode: 'save' | 'save_and_new' = 'save') => {
    const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one medicine item before saving.');
      emitToast('Please add at least one medicine item to the purchase bill.', 'error');
      if (settings.transaction?.quickEntry !== false) {
        lightningInputRef.current?.focus();
      } else {
        focusTableCell(0, 'name');
      }
      return;
    }
    setPendingSaveMode(mode);
    setShowSaveConfirmModal(true);
  };
  const [lightningQuery, setLightningQuery] = useState('');
  const [lightningShowDropdown, setLightningShowDropdown] = useState(false);
  const [lightningSelectedMed, setLightningSelectedMed] = useState<Medicine | null>(null);
  const [lightningQty, setLightningQty] = useState(1);
  const [lightningFreeQty, setLightningFreeQty] = useState(0);
  const [lightningPrice, setLightningPrice] = useState(0);
  const [lightningUnit, setLightningUnit] = useState('Box');
  const [lightningDiscount, setLightningDiscount] = useState<number>(0);
  const [lightningTax, setLightningTax] = useState<number>(0);
  const [lightningBatch, setLightningBatch] = useState<string>('');
  const [lightningExpDate, setLightningExpDate] = useState<string>('');
  const [lightningMfgDate, setLightningMfgDate] = useState<string>('');
  const [lightningHsn, setLightningHsn] = useState<string>('');
  const [lightningMrp, setLightningMrp] = useState<number>(0);
  const [quickBarPriceDropdownOpen, setQuickBarPriceDropdownOpen] = useState(false);

  // Active price field tracking for recent rates popover
  const [activePriceFieldIdx, setActivePriceFieldIdx] = useState<number | null>(null);
  const [showPriceDropdownManual, setShowPriceDropdownManual] = useState<number | null>(null);

  // Bottom Settings & Totals
  const [paymentType, setPaymentType] = useState<'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [roundOff, setRoundOff] = useState(true);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [hasCustomPaidAmount, setHasCustomPaidAmount] = useState(false);
  
  // Expandable Description & Image
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Calculator Popup
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  // Mobile 2-Step View State
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [mobileMedicineSearch, setMobileMedicineSearch] = useState('');

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Window Controls: Fullscreen Overlay, Minimize, Maximize
  const [isMaximized, setIsMaximized] = useState(true);
  const [internalMinimized, setInternalMinimized] = useState(false);
  const isMinimized = isDockMinimized !== undefined ? isDockMinimized : internalMinimized;

  const handleSetMinimized = (val: boolean) => {
    setInternalMinimized(val);
    if (onMinimizeChange) {
      onMinimizeChange(val);
    }
  };

  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus Supplier Search immediately when modal opens so Tab/Keyboard works without mouse
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const timer = setTimeout(() => {
        supplierInputRef.current?.focus();
        supplierInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  // Check if active transaction has unsaved content before closing
  const hasUnsavedChanges = useMemo(() => {
    const hasItems = items.some(i => i.name && i.name.trim().length > 0);
    const hasSupplier = Boolean(selectedSupplierId || (supplierSearchQuery && supplierSearchQuery.trim().length > 0));
    const hasPaid = paidAmount > 0;
    return hasItems || hasSupplier || hasPaid;
  }, [items, selectedSupplierId, supplierSearchQuery, paidAmount]);

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Historical & Additional Expenses State
  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState({
    transport: 0,
    shipping: 0,
    handling: 0,
    loading: 0,
    unloading: 0,
    delivery: 0,
    other: 0
  });

  // Dedicated Discount column flag (controlled by Settings > Item-wise Discount & Print/Invoice Table Columns)
  const showDiscountCol = settings.print?.tableColumns?.discount !== false && settings.item?.itemWiseDiscount !== false;

  const getPrefix = () => {
    const prefixes = (settings.transaction?.prefixes as any) || {};
    if (transactionType === 'Purchase Return') return prefixes.debitNote || 'DN-';
    if (transactionType === 'Purchase Order') return prefixes.purchaseOrder || 'PO-';
    return prefixes.purchaseBill || 'BILL-';
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const [suppList, medList, poList] = await Promise.all([
      dbSuppliers.getAll(),
      dbMedicines.getAll(),
      dbPurchaseOrders.getAll()
    ]);
    
    setSuppliers(suppList);
    setMedicines(medList);
    setAllPurchaseOrders(poList);

    const prefix = getPrefix();

    if (initialOrder) {
      setBillNumber(initialOrder.billNumber || initialOrder.poNumber || `${prefix}1`);
      setBillDate(initialOrder.date ? initialOrder.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setSelectedSupplierId(initialOrder.supplierId || initialOrder.partyId || '');
      setSupplierSearchQuery(initialOrder.supplierName || initialOrder.partyName || '');
      setPaymentType(initialOrder.paymentType || 'Cash');
      
      if (initialOrder.items && initialOrder.items.length > 0) {
        setItems(initialOrder.items.map(it => ({
          id: uuidv4(),
          medicineId: it.medicineId,
          name: it.name,
          quantity: it.quantity || 1,
          freeQuantity: it.freeQuantity || 0,
          unit: it.unit || 'NONE',
          purchasePrice: it.purchasePrice || 0,
          mrp: it.mrp || 0,
          batchNumber: it.batchNumber || '',
          expiryDate: it.expiryDate || '',
          mfgDate: it.mfgDate || '',
          hsnCode: it.hsnCode || '',
          discountPercentage: it.discountPercentage || 0,
          taxPercentage: it.taxPercentage || 0,
          total: it.total || ((it.quantity || 1) * (it.purchasePrice || 0))
        })));
      }
      setPaidAmount(initialOrder.paidAmount !== undefined ? initialOrder.paidAmount : (initialOrder.totalAmount || 0));
      setHasCustomPaidAmount(true);
      setDescription(initialOrder.description || '');
      if (initialOrder.description) setShowDescription(true);
      if (initialOrder.imageAttachment) {
        setImageAttachment(initialOrder.imageAttachment);
        setShowImageUpload(true);
      }
    } else {
      // Auto-assign next bill number with prefix
      const nextNum = poList.length + 1;
      const formatted = `${prefix}${nextNum}`;
      setBillNumber(formatted);
      setActiveTabNumber(nextNum);
      resetForm(formatted);
    }
  };

  const resetForm = (newBillNo?: string) => {
    const prefix = getPrefix();
    const formatted = newBillNo || `${prefix}${activeTabNumber + 1}`;
    setBillNumber(formatted);
    setBillDate(new Date().toISOString().slice(0, 10));
    setSelectedSupplierId('');
    setSupplierSearchQuery('');
    setBillingName('');
    setPoNumber('');
    setPoDate('');
    setPaymentTerms('Due on Receipt');
    setDueDate('');
    setItems(Array.from({ length: 5 }).map(() => ({
      id: uuidv4(),
      name: '',
      quantity: 1,
      unit: 'BOX',
      purchasePrice: 0,
      total: 0
    })));
    setActiveRowIndex(0);
    setMedicineDropdownRow(null);
    setPaymentType('Cash');
    setPaidAmount(0);
    setHasCustomPaidAmount(false);
    setDescription('');
    setImageAttachment(null);
    setShowDescription(false);
    setShowImageUpload(false);
    setErrorMessage(null);
  };

  // Find currently selected supplier object
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Calculations
  const rawSubTotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
  // Calculate round off respecting settings.transaction.roundOffType
  const roundOffType = settings.transaction?.roundOffType || 'Nearest';
  const calculatedGrandTotal = roundOff ? (
    roundOffType === 'Up' ? Math.ceil(rawSubTotal) :
    roundOffType === 'Down' ? Math.floor(rawSubTotal) :
    roundOffType === 'None' ? rawSubTotal :
    Math.round(rawSubTotal)
  ) : rawSubTotal;

  const roundOffAmount = Number((calculatedGrandTotal - rawSubTotal).toFixed(2));
  const grandTotal = calculatedGrandTotal;

  // Sync draft summary for docking with stable dependencies
  const onSummaryChangeRef = useRef(onSummaryChange);
  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  const validItemsCount = (items || []).filter(i => i.name && i.name.trim() !== '').length;
  const supplierObj = suppliers.find(s => s.id === selectedSupplierId);
  const supplierName = supplierObj ? supplierObj.name : (supplierSearchQuery.trim() || 'Cash Purchase');

  useEffect(() => {
    if (onSummaryChangeRef.current) {
      onSummaryChangeRef.current({
        partyName: supplierName,
        amount: grandTotal || 0,
        itemCount: validItemsCount,
        title: `${transactionType === 'Purchase Return' ? 'Purchase Return' : 'Purchase Bill'} #${billNumber}`
      });
    }
  }, [supplierName, validItemsCount, grandTotal, billNumber, transactionType]);

  const effectivePaidAmount = hasCustomPaidAmount 
    ? paidAmount 
    : (paymentType === 'Credit' ? 0 : grandTotal);
  const balanceDue = Math.max(0, grandTotal - effectivePaidAmount);
  const totalQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const itemsSubtotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)), 0);
  const totalDiscountAmount = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
    return sum + (base * (Number(item.discountPercentage) || 0)) / 100;
  }, 0);
  const totalTaxAmount = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
    const disc = (base * (Number(item.discountPercentage) || 0)) / 100;
    return sum + ((base - disc) * (Number(item.taxPercentage) || 0)) / 100;
  }, 0);
  const totalExpenses = (Object.values(additionalExpenses) as number[]).reduce((a, b) => a + (b || 0), 0);

  // Update item row
  const handleItemChange = (index: number, field: keyof PurchaseBillItem, val: any) => {
    const newItems = [...items];
    const current = { ...newItems[index], [field]: val };
    
    // Auto calculate row total with discount and tax
    const qty = field === 'quantity' ? (val === '' ? 0 : Number(val)) : Number(current.quantity || 0);
    const price = field === 'purchasePrice' ? Number(val) : Number(current.purchasePrice || 0);
    const disc = field === 'discountPercentage' ? Number(val) : Number(current.discountPercentage || 0);
    const tax = field === 'taxPercentage' ? Number(val) : Number(current.taxPercentage || 0);

    const base = qty * price;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const taxAmt = (taxable * tax) / 100;
    current.total = Math.round(taxable + taxAmt);
    
    newItems[index] = current;
    setItems(newItems);
  };

  // Select medicine from autocomplete
  const handleSelectMedicine = (index: number, med: Medicine) => {
    const newItems = [...items];
    const current = newItems[index];
    const qty = (current.quantity !== undefined && current.quantity >= 0) ? current.quantity : 1;
    const price = med.purchasePrice || current.purchasePrice || 0;
    const disc = current.discountPercentage || 0;
    const tax = med.gstPercentage || current.taxPercentage || 0;

    const base = qty * price;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const taxAmt = (taxable * tax) / 100;
    const total = Math.round(taxable + taxAmt);

    newItems[index] = {
      ...current,
      medicineId: med.id,
      name: med.name,
      quantity: qty,
      unit: med.unit && med.unit !== 'NONE' ? med.unit : (current.unit && current.unit !== 'NONE' ? current.unit : 'BOX'),
      purchasePrice: price,
      mrp: med.mrp || price,
      batchNumber: med.batchNumber || current.batchNumber || '',
      expiryDate: med.expiryDate ? med.expiryDate.slice(0, 10) : (current.expiryDate || ''),
      hsnCode: med.hsnCode || (med as any).hsn || current.hsnCode || '',
      taxPercentage: tax,
      total: total
    };
    setItems(newItems);
    setMedicineDropdownRow(null);
  };

  // Quick Lightning Entry Handler
  const commitPurchaseLightningItem = (medOrName: Medicine | string, qty: number, price: number) => {
    const isMedObj = typeof medOrName !== 'string';
    const med = isMedObj ? (medOrName as Medicine) : null;
    const name = med ? med.name : (medOrName as string).trim();
    if (!name) return;

    const unit = lightningUnit || med?.unit || 'Box';
    const effectivePrice = price || med?.purchasePrice || 0;
    const effectiveQty = qty > 0 ? qty : 1;
    const discount = lightningDiscount || 0;
    const tax = lightningTax || 0;
    const base = effectiveQty * effectivePrice;
    const discounted = base - (base * discount) / 100;
    const total = discounted + (discounted * tax) / 100;

    const newItem: PurchaseBillItem = {
      id: uuidv4(),
      medicineId: med?.id,
      name,
      quantity: effectiveQty,
      freeQuantity: lightningFreeQty || 0,
      unit,
      purchasePrice: effectivePrice,
      mrp: lightningMrp || med?.mrp || effectivePrice,
      batchNumber: lightningBatch || med?.batchNumber || '',
      expiryDate: lightningExpDate || med?.expiryDate || '',
      mfgDate: lightningMfgDate || '',
      hsnCode: lightningHsn || '',
      discountPercentage: discount,
      taxPercentage: tax,
      total: Number(total.toFixed(2))
    };

    const firstEmptyIndex = items.findIndex(it => !it.name.trim());
    if (firstEmptyIndex !== -1) {
      const updated = [...items];
      updated[firstEmptyIndex] = newItem;
      setItems(updated);
      setActiveRowIndex(firstEmptyIndex);
    } else {
      setItems([newItem, ...items]);
      setActiveRowIndex(0);
    }

    setLightningQuery('');
    setLightningSelectedMed(null);
    setLightningQty(1);
    setLightningFreeQty(0);
    setLightningPrice(0);
    setLightningDiscount(0);
    setLightningTax(0);
    setLightningBatch('');
    setLightningExpDate('');
    setLightningMfgDate('');
    setLightningHsn('');
    setLightningMrp(0);
    setLightningShowDropdown(false);
    setQuickBarPriceDropdownOpen(false);

    // Refocus lightning search for next item
    setTimeout(() => {
      lightningInputRef.current?.focus();
    }, 50);
  };

  const handleConfirmLightningItem = () => {
    const target = lightningSelectedMed || lightningQuery;
    if (!target || (typeof target === 'string' && !target.trim())) {
      const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);
      if (validItems.length > 0) {
        paidAmountInputRef.current?.focus();
        paidAmountInputRef.current?.select();
      } else {
        focusTableCell(0, 'name');
      }
      return;
    }
    const price = lightningPrice || (lightningSelectedMed ? lightningSelectedMed.purchasePrice : 0);
    commitPurchaseLightningItem(target, lightningQty, price);
  };

  // Hardware Barcode Scanner & Modal Scanner Lookup Handler
  const handleBarcodeScanned = (scannedBarcode: string, source: string = 'Hardware Scanner Gun') => {
    const cleanBarcode = scannedBarcode.trim().toLowerCase();
    if (!cleanBarcode) return;

    // Match by barcode, id, or code
    const matchedMed = medicines.find(m => 
      (m.barcode && m.barcode.trim().toLowerCase() === cleanBarcode) ||
      m.id.toLowerCase() === cleanBarcode ||
      ((m as any).code && (m as any).code.toLowerCase() === cleanBarcode)
    );

    if (matchedMed) {
      // Check if medicine already exists in purchase items
      const existingIdx = items.findIndex(item => 
        (item.medicineId && item.medicineId === matchedMed.id) ||
        (item.name && item.name.trim().toLowerCase() === matchedMed.name.trim().toLowerCase())
      );

      if (existingIdx >= 0) {
        const currentQty = Number(items[existingIdx].quantity) || 0;
        const newQty = currentQty + 1;
        handleItemChange(existingIdx, 'quantity', newQty);
        playScannerBeep('duplicate');
        emitToast(`Incremented Qty to ${newQty} for: ${matchedMed.name}`, 'info');
      } else {
        const rate = matchedMed.purchasePrice || 0;
        const newItem: PurchaseBillItem = {
          id: uuidv4(),
          medicineId: matchedMed.id,
          name: matchedMed.name,
          quantity: 1,
          freeQuantity: 0,
          unit: matchedMed.unit || 'BOX',
          purchasePrice: rate,
          mrp: matchedMed.mrp || (matchedMed.sellingPrice ? matchedMed.sellingPrice * 1.2 : rate),
          batchNumber: matchedMed.batchNumber || '',
          expiryDate: matchedMed.expiryDate || '',
          mfgDate: (matchedMed as any).mfgDate || '',
          hsnCode: (matchedMed as any).hsnCode || '',
          discountPercentage: 0,
          taxPercentage: matchedMed.gstPercentage || (matchedMed as any).taxRate || 0,
          total: rate
        };

        const firstEmptyIndex = items.findIndex(it => !it.name.trim());
        if (firstEmptyIndex !== -1) {
          const updated = [...items];
          updated[firstEmptyIndex] = newItem;
          setItems(updated);
          setActiveRowIndex(firstEmptyIndex);
        } else {
          setItems([newItem, ...items]);
          setActiveRowIndex(0);
        }

        playScannerBeep('success');
        emitToast(`Scanned & Added: ${matchedMed.name} (${source})`, 'success');
      }

      setLightningQuery('');
      setLightningShowDropdown(false);
    } else {
      playScannerBeep('error');
      emitToast(`Barcode "${scannedBarcode}" not recognized in medicines catalog`, 'error');
    }
  };

  // Hardware barcode scanner hook for instant scanning with USB/Bluetooth barcode guns
  useHardwareBarcodeScanner({
    enabled: isOpen && !isBarcodeScannerOpen && !showCloseConfirm && !showSaveConfirmModal,
    onScan: (scannedBarcode) => {
      handleBarcodeScanned(scannedBarcode, 'Hardware Scanner Gun');
    }
  });

  // Add new item row
  const handleAddRow = () => {
    const newRow: PurchaseBillItem = {
      id: uuidv4(),
      name: '',
      quantity: 1,
      unit: 'BOX',
      purchasePrice: 0,
      total: 0
    };
    setItems([...items, newRow]);
    setActiveRowIndex(items.length);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([{ id: uuidv4(), name: '', quantity: 1, unit: 'BOX', purchasePrice: 0, total: 0 }]);
      setActiveRowIndex(0);
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    setActiveRowIndex(Math.max(0, index - 1));
  };

  // Quick Add Supplier
  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupplierName.trim(),
      contactPerson: newSupplierName.trim(),
      phone: newSupplierPhone.trim() || '0300-0000000',
      email: '',
      address: 'Main Market',
      paymentTerms: 'Due on Receipt',
      openingBalance: 0,
      creditLimit: 200000,
      balance: 0,
      createdAt: new Date().toISOString()
    };
    await dbSuppliers.save(newSup);
    setSuppliers(prev => [...prev, newSup]);
    setSelectedSupplierId(newSup.id);
    setSupplierSearchQuery(newSup.name);
    setShowQuickAddSupplier(false);
    setNewSupplierName('');
    setNewSupplierPhone('');
  };

  // Handle Image Upload
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Validate and construct PurchaseOrder object synchronously
  const buildValidatedPurchase = (): PurchaseOrder | null => {
    setErrorMessage(null);

    // 1. Validation
    const partyName = selectedSupplier?.name || supplierSearchQuery.trim() || (paymentType === 'Cash' ? 'Cash Supplier / Counter' : '');
    if (!partyName) {
      const msg = 'Please select or enter a Supplier / Party name for Credit transactions.';
      setErrorMessage(msg);
      emitToast(msg, 'error');
      return null;
    }

    const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);
    if (validItems.length === 0) {
      const msg = 'Please add at least one valid item with name.';
      setErrorMessage(msg);
      emitToast(msg, 'error');
      return null;
    }

    // Determine purchase status
    let status: 'Paid' | 'Partial' | 'Unpaid' | 'Completed' = 'Paid';
    if (balanceDue === 0) {
      status = 'Paid';
    } else if (effectivePaidAmount > 0 && balanceDue > 0) {
      status = 'Partial';
    } else {
      status = 'Unpaid';
    }

    const prefix = getPrefix();
    const orderId = initialOrder?.id || `po-${Date.now()}`;
    const formattedBillNo = billNumber.trim() || `${prefix}${Date.now().toString().slice(-5)}`;

    const now = new Date();
    let purchaseDateObj = billDate ? new Date(billDate) : now;
    if (billDate && billDate === now.toISOString().slice(0, 10)) {
      purchaseDateObj = now;
    } else if (billDate) {
      purchaseDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const newPurchase: PurchaseOrder = {
      id: orderId,
      poNumber: formattedBillNo,
      billNumber: formattedBillNo,
      supplierId: selectedSupplierId || 'sup-custom',
      partyId: selectedSupplierId || 'sup-custom',
      supplierName: partyName,
      partyName: partyName,
      date: purchaseDateObj.toISOString(),
      paymentType: paymentType,
      items: validItems.map(vi => ({
        medicineId: vi.medicineId || 'med-custom',
        name: vi.name,
        quantity: Number(vi.quantity),
        freeQuantity: Number(vi.freeQuantity) || 0,
        unit: vi.unit,
        batchNumber: vi.batchNumber,
        expiryDate: vi.expiryDate,
        mfgDate: vi.mfgDate,
        mrp: vi.mrp,
        hsnCode: vi.hsnCode,
        discountPercentage: vi.discountPercentage,
        taxPercentage: vi.taxPercentage,
        purchasePrice: Number(vi.purchasePrice),
        total: Number(vi.total)
      })),
      subTotal: rawSubTotal,
      totalAmount: grandTotal,
      paidAmount: effectivePaidAmount,
      balanceDue: balanceDue,
      description: description.trim() || undefined,
      imageAttachment: imageAttachment || undefined,
      firmName: business?.name || 'MBI INVENTRA',
      userName: 'Admin',
      status: status,
      transactionType: transactionType as 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return',
      createdAt: initialOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newPurchase;
  };

  // Background asynchronous persistence (non-blocking for instant speed)
  const persistPurchaseInBackground = async (newPurchase: PurchaseOrder, validItems: PurchaseBillItem[]) => {
    try {
      // 1. Save Purchase Record
      await dbPurchaseOrders.save(newPurchase);

      // 2. Apply Proportional Expenses & Update Medicine Inventory Stock with FEFO Batch Traceability
      const { adjustedItems } = calculateProportionalExpenses(validItems, additionalExpenses);
      await Promise.all(adjustedItems.map(async (item) => {
        const adjustedUnitCost = item.adjustedUnitCost || item.purchasePrice;
        let med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase()) || (item.medicineId ? await dbMedicines.getById(item.medicineId) : null);
        
        if (transactionType === 'Purchase Return') {
          if (med) {
            const updatedMedicine = deductPurchaseReturnFromMedicine(med, item.quantity, item.batchNumber);
            await dbMedicines.save(updatedMedicine);
          }
        } else {
          // Purchase, Payment Out, Purchase Order Receiving -> add/merge batch
          const updatedOrNewMed = addPurchaseStockToMedicine(
            med || null,
            {
              name: item.name,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              mfgDate: item.mfgDate,
              quantity: item.quantity,
              freeQuantity: item.freeQuantity,
              purchasePrice: adjustedUnitCost,
              sellingPrice: item.mrp ? item.mrp * 0.95 : (adjustedUnitCost * 1.25),
              mrp: item.mrp || (adjustedUnitCost * 1.3),
              unit: item.unit,
              taxPercentage: item.taxPercentage,
              hsnCode: item.hsnCode,
            },
            newPurchase.partyName || 'Supplier',
            newPurchase.date || new Date().toISOString(),
            {
              purchaseInvoiceNumber: newPurchase.billNumber,
              purchaseBillId: newPurchase.id,
              firmId: newPurchase.firmName
            }
          );
          await dbMedicines.save(updatedOrNewMed);
        }

        const audit: AuditLog = {
          id: uuidv4(),
          date: new Date().toISOString(),
          action: transactionType === 'Purchase Return' ? 'ADJUST_STOCK' : 'PO_RECEIVE',
          medicineId: item.medicineId || 'N/A',
          medicineName: item.name,
          quantityChanged: transactionType === 'Purchase Return' ? -item.quantity : item.quantity,
          userId: 'Admin',
          notes: `Purchase Bill #${newPurchase.billNumber} from ${newPurchase.partyName} (Batch: ${item.batchNumber || 'N/A'}, Adj. Cost: ${adjustedUnitCost})`
        };
        await dbAuditLogs.save(audit);
      }));

      // 3. Update Supplier Balance if credit / balance due
      if (selectedSupplierId && balanceDue > 0) {
        const sup = suppliers.find(s => s.id === selectedSupplierId);
        if (sup) {
          const updatedSup: Supplier = {
            ...sup,
            balance: (sup.balance || 0) + balanceDue,
            updatedAt: new Date().toISOString()
          };
          await dbSuppliers.save(updatedSup);
        }
      }

      window.dispatchEvent(new Event('mbi-local-db-change'));
    } catch (err: any) {
      console.error('Background purchase sync error:', err);
    }
  };

  // Button 1: INSTANT Save (0ms delay, closes immediately)
  const handleSave = () => {
    const newPurchase = buildValidatedPurchase();
    if (!newPurchase) return;

    const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);

    // 1. Instant optimistic callback & toast
    onSaved(newPurchase);
    emitToast(`Purchase #${newPurchase.billNumber || newPurchase.poNumber} saved successfully!`, 'success');
    onClose();

    // 2. Persist in background
    persistPurchaseInBackground(newPurchase, validItems);
  };

  // Button 2: INSTANT Save & New (0ms delay, resets form with next bill number immediately)
  const handleSaveAndNew = () => {
    const newPurchase = buildValidatedPurchase();
    if (!newPurchase) return;

    const validItems = items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0);

    // 1. Instant optimistic callback & toast
    onSaved(newPurchase);
    emitToast(`Purchase #${newPurchase.billNumber} saved!`, 'success');

    const prefix = getPrefix();
    const digits = (newPurchase.billNumber || '').match(/\d+/g);
    const lastNum = digits ? parseInt(digits[digits.length - 1], 10) : 1;
    const nextFormattedBillNo = `${prefix}${lastNum + 1}`;

    resetForm(nextFormattedBillNo);
    focusTableCell(0, 'name');

    // 2. Persist in background
    persistPurchaseInBackground(newPurchase, validItems);
  };

  // Global Keyboard Shortcuts (Ctrl+S, Ctrl+Enter, Alt+N, F2, Esc)
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If save confirmation modal is open, let it handle its own keys
      if (showSaveConfirmModal) return;

      // If discard confirmation dialog is open
      if (showCloseConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setShowCloseConfirm(false);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          setShowCloseConfirm(false);
          onClose();
          return;
        }
        return;
      }

      if (isSettingsOpen || showQuickAddSupplier) return;

      // F12 or ? (when not typing in an input) to open shortcuts cheat sheet
      if (e.key === 'F12' || (e.key === '?' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isSupplierDropdownOpen) {
          e.preventDefault();
          setIsSupplierDropdownOpen(false);
          return;
        }
        if (showCalculator) {
          e.preventDefault();
          setShowCalculator(false);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleRequestClose();
        return;
      }

      // F1: Jump to Supplier Search
      if (e.key === 'F1') {
        e.preventDefault();
        supplierInputRef.current?.focus();
        supplierInputRef.current?.select();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save_and_new');
        return;
      }

      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save_and_new');
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        if (settings.transaction?.quickEntry !== false) {
          lightningInputRef.current?.focus();
          lightningInputRef.current?.select();
        } else {
          focusTableCell(0, 'name');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isMinimized, isSettingsOpen, showQuickAddSupplier, showCloseConfirm, isSupplierDropdownOpen, showCalculator, hasUnsavedChanges, items, billNumber, billDate, selectedSupplierId, supplierSearchQuery, paymentType, paidAmount, roundOff, additionalExpenses]);

  if (!isOpen) return null;

  // If minimized in dock mode, don't render floating pill (the dock bar manages it)
  if (isMinimized && onMinimizeChange) {
    return null;
  }

  // Minimized floating pill docked at bottom right (fallback for non-dock standalone mode)
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">
            {transactionType === 'Purchase Return' ? 'Purchase Return' : 'Purchase Bill'} #{billNumber}
          </span>
          <span className="text-[10px] bg-blue-600/60 text-blue-200 px-1.5 py-0.5 rounded font-medium">Minimized</span>
        </div>
        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
          <button
            type="button"
            onClick={() => handleSetMinimized(false)}
            title="Restore Window"
            className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Form"
            className="p-1.5 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const filteredMedicines = (medicines || []).filter(m => {
    const activeItemName = items[activeRowIndex]?.name || '';
    if (!activeItemName) return true;
    return m.name.toLowerCase().includes(activeItemName.toLowerCase()) || 
           (m.barcode && m.barcode.includes(activeItemName));
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(supplierSearchQuery))
  );

  return (
    <div className={`fixed inset-0 z-50 flex ${
      isMaximized ? 'p-0 overflow-hidden' : 'items-center justify-center p-0 sm:p-4 overflow-y-auto'
    } bg-slate-900/75 backdrop-blur-md`}>
      <div className={`w-full bg-white flex flex-col overflow-hidden transition-all ${
        isMaximized 
          ? 'h-full max-h-screen rounded-none' 
          : 'h-[100dvh] sm:h-auto max-w-6xl sm:max-h-[96vh] rounded-none sm:rounded-xl shadow-2xl border-0 sm:border sm:border-slate-300'
      }`}>
        
        {/* Top Header Bar */}
        <div className="bg-[#1e293b] text-white px-3 sm:px-4 py-2 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
              {transactionType === 'Purchase Return' ? 'Purchase Return' :
               transactionType === 'Purchase Order' ? 'Purchase Order' : 'Purchase Bill'}
            </span>
            <span className="text-[11px] sm:text-xs bg-blue-600/60 text-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
              #{billNumber}
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5 text-slate-300">
            {/* Desktop Quick Calculator Button */}
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              title="Calculator"
              className="hidden sm:flex p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition items-center gap-1 text-xs"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Calculator</span>
            </button>

            {/* Desktop Shortcuts Button */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts Cheat Sheet (F12 / ?)"
              className="hidden sm:flex p-1.5 hover:bg-slate-700 rounded text-amber-300 hover:text-amber-200 transition items-center gap-1 text-xs"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Shortcuts</span>
              <kbd className="px-1 py-0.2 bg-slate-800 border border-slate-700 text-amber-300/80 rounded text-[10px] font-mono">F12</kbd>
            </button>

            {/* Desktop Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings & Table Columns"
              className="hidden sm:flex p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition items-center gap-1 text-xs"
            >
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Settings</span>
            </button>

            {/* Mobile Minimize */}
            <button
              type="button"
              onClick={() => handleSetMinimized(true)}
              title="Minimize Window"
              className="sm:hidden p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Mobile Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="sm:hidden p-1.5 hover:bg-slate-700 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Mobile Submenu Dropdown Trigger */}
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(!isMobileSubMenuOpen)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                title="More Actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileSubMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/20" 
                    onClick={() => setIsMobileSubMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCalculator(!showCalculator);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span>Calculator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800"
                    >
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span>Invoice Settings</span>
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        handleSetMinimized(true);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Minimize Window</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMaximized(!isMaximized);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span>{isMaximized ? 'Restore Size' : 'Maximize Window'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:block h-4 w-[1px] bg-slate-700 mx-1" />

            {/* Window Controls: Minimize, Maximize/Restore, Close */}
            <button
              type="button"
              onClick={() => handleSetMinimized(true)}
              title="Minimize Window"
              className="hidden sm:block p-1.5 hover:bg-slate-700 hover:text-white rounded transition-colors text-slate-300 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="hidden sm:block p-1.5 hover:bg-slate-700 hover:text-white rounded transition-colors text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleRequestClose}
              title="Close Window (Esc)"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Calculator Floating Window */}
        {showCalculator && (
          <div className="absolute top-12 right-6 z-50 w-52 bg-slate-900 text-white rounded-lg shadow-2xl border border-slate-700 p-2.5 text-xs">
            <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-800">
              <span className="font-bold text-[10px] text-slate-400">QUICK CALC</span>
              <button type="button" onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-slate-800 p-2 rounded text-right font-mono text-sm font-bold text-emerald-400 mb-2 min-h-[32px] break-all">
              {calcInput || '0'}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+','C'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') setCalcInput('');
                    else if (btn === '=') {
                      try {
                        // eslint-disable-next-line no-eval
                        setCalcInput(String(Function(`'use strict'; return (${calcInput})`)()));
                      } catch {
                        setCalcInput('Err');
                      }
                    } else {
                      setCalcInput(prev => prev + btn);
                    }
                  }}
                  className={`p-1.5 rounded font-semibold text-center ${
                    btn === '=' ? 'bg-blue-600 col-span-2' : 
                    btn === 'C' ? 'bg-rose-600 col-span-2' : 
                    ['/','*','-','+'].includes(btn) ? 'bg-slate-700 text-blue-300' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-[#f8fafc]">
          
          {/* Notification Toast */}
          {toastMessage && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{toastMessage}</span>
              </div>
              <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-lg shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Row: Search Party by Name/Phone & Bill Number/Date */}
          <div className="gap-4 items-start bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:grid md:grid-cols-12">
            
            {/* Supplier / Party Search Box */}
            <div className="w-full md:col-span-6 relative" ref={supplierDropdownRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supplier / Party <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={supplierInputRef}
                  type="text"
                  placeholder="Search Supplier Name / Phone (F1) *"
                  value={supplierSearchQuery}
                  onFocus={() => {
                    if (supplierSearchQuery.trim().length > 0) {
                      setIsSupplierDropdownOpen(true);
                      setSupplierSelectedIndex(0);
                    } else {
                      setIsSupplierDropdownOpen(false);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsSupplierDropdownOpen(false);
                    }, 200);
                  }}
                  onChange={(e) => {
                    setSupplierSearchQuery(e.target.value);
                    setIsSupplierDropdownOpen(e.target.value.trim().length > 0);
                    setSupplierSelectedIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (isSupplierDropdownOpen && filteredSuppliers.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSupplierSelectedIndex(prev => (prev + 1) % filteredSuppliers.length);
                        return;
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSupplierSelectedIndex(prev => (prev - 1 + filteredSuppliers.length) % filteredSuppliers.length);
                        return;
                      } else if (e.key === 'Enter' || e.key === 'Tab') {
                        const sup = filteredSuppliers[supplierSelectedIndex];
                        if (sup) {
                          if (e.key === 'Enter') e.preventDefault();
                          setSelectedSupplierId(sup.id);
                          setSupplierSearchQuery(sup.name);
                          setIsSupplierDropdownOpen(false);
                          focusTableCell(0, 'name');
                        }
                        return;
                      } else if (e.key === 'Escape') {
                        setIsSupplierDropdownOpen(false);
                        return;
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setIsSupplierDropdownOpen(true);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      focusTableCell(0, 'name');
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Selected Supplier Badge */}
              {selectedSupplier && (
                <div className="mt-1 text-xs text-slate-600 flex items-center gap-3">
                  <span>Phone: <strong className="text-slate-800">{selectedSupplier.phone}</strong></span>
                  <span>Balance: <strong className="text-rose-600">{formatCurrency(selectedSupplier.balance || 0)}</strong></span>
                </div>
              )}

              {/* Supplier Search Dropdown */}
              {isSupplierDropdownOpen && (
                <div 
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-40 max-h-56 overflow-y-auto"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500">Suppliers ({filteredSuppliers.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuickAddSupplier(true);
                        setIsSupplierDropdownOpen(false);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Supplier
                    </button>
                  </div>
                  
                  {filteredSuppliers.map((sup, sIdx) => (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => {
                        setSelectedSupplierId(sup.id);
                        setSupplierSearchQuery(sup.name);
                        setIsSupplierDropdownOpen(false);
                        focusTableCell(0, 'name');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-slate-100 flex justify-between items-center transition ${
                        supplierSelectedIndex === sIdx ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-blue-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{sup.name}</div>
                        <div className="text-[11px] text-slate-500">{sup.phone} • {sup.address}</div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600">
                        {formatCurrency(sup.balance || 0)}
                      </span>
                    </button>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No supplier found for "{supplierSearchQuery}"
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNewSupplierName(supplierSearchQuery);
                            setShowQuickAddSupplier(true);
                            setIsSupplierDropdownOpen(false);
                          }}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          + Create "{supplierSearchQuery}" as new Supplier
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Supplier Modal Popup */}
            {showQuickAddSupplier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Add New Supplier / Party</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        value={newSupplierName}
                        onChange={e => setNewSupplierName(e.target.value)}
                        placeholder="e.g. Ali Pharma Distributors"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={newSupplierPhone}
                        onChange={e => setNewSupplierPhone(e.target.value)}
                        placeholder="0300-xxxxxxx"
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowQuickAddSupplier(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={handleQuickAddSupplier}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                      >
                        Save Supplier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Number & Date on Right */}
            <div className="w-full md:col-span-6 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-40">
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Number</label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  placeholder="e.g. BILL-1"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold font-mono text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Optional Settings-driven Form Fields */}
            {(settings.transaction?.billingNameOfParties || settings.transaction?.customerPoDetails || settings.transaction?.dueDatesAndPaymentTerms) && (
              <div className="w-full md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                {settings.transaction?.billingNameOfParties && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Billing / Firm Name</label>
                    <input
                      type="text"
                      placeholder="Billing Name"
                      value={billingName}
                      onChange={e => setBillingName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {settings.transaction?.customerPoDetails && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">P.O. Number</label>
                      <input
                        type="text"
                        placeholder="PO-xxx"
                        value={poNumber}
                        onChange={e => setPoNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">P.O. Date</label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={e => setPoDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {settings.transaction?.dueDatesAndPaymentTerms && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Payment Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={e => setPaymentTerms(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="Net 7">Net 7 Days</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Items & Expenses Section (Unified view on mobile, always visible on desktop) */}
          <div className="space-y-4">
            
            {/* Mobile Dedicated Items Section */}
            <div className="sm:hidden space-y-3">
              {/* Header with counts and actions */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900 tracking-tight">Billed Items</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {items.filter(i => i.name?.trim()).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete/Clear all items from this bill?')) {
                        setItems([{
                          id: uuidv4(),
                          name: '',
                          quantity: 1,
                          unit: 'BOX',
                          purchasePrice: 0,
                          total: 0
                        }]);
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete Items
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Quick Search Medicine to Add directly */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search medicine to add (e.g. Panadol, Augmentin)..."
                    value={mobileMedicineSearch}
                    onChange={(e) => setMobileMedicineSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {mobileMedicineSearch && (
                    <button
                      type="button"
                      onClick={() => setMobileMedicineSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {mobileMedicineSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                    {medicines
                      .filter(m => 
                        m.name.toLowerCase().includes(mobileMedicineSearch.toLowerCase()) ||
                        (m.genericName && m.genericName.toLowerCase().includes(mobileMedicineSearch.toLowerCase()))
                      )
                      .slice(0, 15)
                      .map(med => (
                        <button
                          key={med.id}
                          type="button"
                          onClick={() => {
                            const existingEmptyIdx = items.findIndex(i => !i.name || !i.name.trim());
                            if (existingEmptyIdx !== -1) {
                              handleSelectMedicine(existingEmptyIdx, med);
                            } else {
                              const newRow: PurchaseBillItem = {
                                id: uuidv4(),
                                medicineId: med.id,
                                name: med.name,
                                quantity: 1,
                                unit: med.unit && med.unit !== 'NONE' ? med.unit : 'BOX',
                                purchasePrice: med.purchasePrice || 0,
                                mrp: med.mrp || med.purchasePrice || 0,
                                batchNumber: med.batchNumber || '',
                                expiryDate: med.expiryDate ? med.expiryDate.slice(0, 10) : '',
                                total: Math.round(med.purchasePrice || 0)
                              };
                              setItems(prev => [...prev, newRow]);
                            }
                            setMobileMedicineSearch('');
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{med.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {med.genericName || 'Medicine'} • Stock: <span className={med.quantity <= (med.lowStockThreshold || 10) ? 'text-amber-600 font-bold' : 'text-slate-600'}>{med.quantity || 0}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-blue-700">Rs {med.purchasePrice || 0}</div>
                            <span className="text-[10px] text-emerald-600 font-bold">+ Add</span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* 4-Column Mobile Items Table (Item Name | Qty | Rate | Amount) */}
              <div className="w-full">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead>
                    <tr className="text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-1 w-[40%]">Item Name</th>
                      <th className="py-2 px-1 text-center w-[18%]">Qty</th>
                      <th className="py-2 px-1 text-right w-[20%]">Rate</th>
                      <th className="py-2 px-1 text-right w-[22%]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const itemRate = Number(item.purchasePrice) || 0;
                      const itemQty = Number(item.quantity) || 0;
                      const itemAmt = Number(item.total) || (itemQty * itemRate);

                      return (
                        <tr key={item.id} className="border-b border-dashed border-slate-300">
                          {/* Item Name */}
                          <td className="py-2.5 px-1 align-top">
                            <div className="flex items-start gap-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="text-slate-300 hover:text-rose-600 p-0.5 mt-0.5 shrink-0"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="min-w-0 flex-1 relative">
                                <input
                                  type="text"
                                  placeholder="Medicine name..."
                                  value={item.name || ''}
                                  onClick={() => {
                                    setActiveRowIndex(idx);
                                    setMedicineDropdownRow(idx);
                                    setTableMedSelectedIndex(0);
                                  }}
                                  onFocus={() => {
                                    setActiveRowIndex(idx);
                                    setMedicineDropdownRow(idx);
                                    setTableMedSelectedIndex(0);
                                  }}
                                  onChange={(e) => {
                                    handleItemChange(idx, 'name', e.target.value);
                                    setActiveRowIndex(idx);
                                    setMedicineDropdownRow(idx);
                                    setTableMedSelectedIndex(0);
                                  }}
                                  className="w-full font-bold text-slate-900 bg-transparent text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1 truncate cursor-pointer"
                                />
                                {(item.batchNumber || item.expiryDate) && (
                                  <div className="text-[10px] text-slate-400 px-1 truncate">
                                    {item.batchNumber && <span>B:{item.batchNumber} </span>}
                                    {item.expiryDate && <span>Exp:{item.expiryDate}</span>}
                                  </div>
                                )}

                                {/* Mobile Row Medicine Selection Dropdown */}
                                {medicineDropdownRow === idx && (
                                  <div 
                                    className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white border-2 border-blue-500 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto ring-4 ring-blue-500/10"
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 flex justify-between items-center sticky top-0 z-10">
                                      <span className="flex items-center gap-1 text-blue-600">
                                        <Plus className="w-3 h-3" /> Select Inventory Item
                                      </span>
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setMedicineDropdownRow(null); }}
                                        className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {(() => {
                                      const query = (item.name || '').toLowerCase().trim();
                                      const matches = query
                                        ? medicines.filter(m => (m.name && m.name.toLowerCase().includes(query)) || (m.barcode && m.barcode.toLowerCase().includes(query))).slice(0, 15)
                                        : medicines.slice(0, 15);
                                        
                                      if (matches.length === 0) {
                                        return (
                                          <div className="p-3 text-center text-slate-400 text-xs">
                                            No matching items found.
                                          </div>
                                        );
                                      }
                                      
                                      return matches.map(med => (
                                        <button
                                          key={med.id}
                                          type="button"
                                          onClick={() => {
                                            handleSelectMedicine(idx, med);
                                            setMedicineDropdownRow(null);
                                          }}
                                          className="w-full px-2.5 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-0 cursor-pointer"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <div className="font-bold text-slate-900 text-xs truncate">{med.name}</div>
                                            <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                              <span>Stock: <strong className={med.quantity <= 5 ? 'text-rose-600' : 'text-slate-700'}>{med.quantity}</strong></span>
                                              {med.batchNumber && <span>• B: {med.batchNumber}</span>}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="font-mono font-bold text-blue-700 text-xs">Rs {med.purchasePrice || 0}</div>
                                            <span className="text-[10px] text-emerald-600 font-bold">+ Pick</span>
                                          </div>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Qty */}
                          <td className="py-2.5 px-1 align-top text-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity === 0 ? '' : item.quantity}
                              placeholder="1"
                              onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full max-w-[50px] mx-auto text-center font-bold text-xs py-1 px-0.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* Rate */}
                          <td className="py-2.5 px-1 align-top text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={itemRate === 0 ? '' : itemRate}
                              placeholder="0"
                              onChange={(e) => handleItemChange(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                              className="w-full max-w-[62px] ml-auto text-right font-bold text-xs py-1 px-1 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-1 align-top text-right font-black text-slate-900 text-xs">
                            Rs {itemAmt.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Total Summary Row matching reference image */}
                    <tr className="font-black text-slate-900 bg-slate-50/90 border-t-2 border-slate-300">
                      <td className="py-2.5 px-2 font-bold text-slate-700">Total</td>
                      <td className="py-2.5 px-1 text-center font-mono text-xs">{totalQuantity}</td>
                      <td className="py-2.5 px-1"></td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-blue-900">
                        Rs {rawSubTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Add item row button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 border border-dashed border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Item Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBarcodeScannerOpen(true)}
                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Scan className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scan (Gun / USB)</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              {/* Items Header Toolbar */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-300 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Items & Purchase Table</span>
                  <span className="text-[11px] text-slate-500 font-medium">({items.filter(i => i.name?.trim()).length} entered)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    title="Scan Barcode (Hardware USB/Wireless Scanner Gun or Camera)"
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scan Barcode</span>
                    <span className="text-[9.5px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-300">
                      Gun / USB
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => lightningInputRef.current?.focus()}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold text-xs ml-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rapid Add Mode (F2)</span>
                  </button>
                </div>
              </div>

          {/* Items Table (Synced with Print / Table Columns Settings) */}
          <div className="bg-white border border-t-0 border-slate-300 rounded-b-xl shadow-xs">
            <div className="overflow-x-auto min-h-[300px] pb-28">
              <table className="w-full text-left border-collapse text-xs">
                
                {/* Table Header */}
                <thead className="bg-[#f8fafc] border-b border-slate-300 text-slate-700 uppercase font-bold text-[11px] select-none">
                  <tr>
                    <th className="w-10 px-3 py-2.5 text-center border-r border-slate-200">#</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 min-w-[180px]">ITEM</th>
                    {settings.print?.tableColumns?.hsnSac && <th className="px-3 py-2.5 border-r border-slate-200 w-20">HSN/SAC</th>}
                    {settings.print?.tableColumns?.batchNo && <th className="px-3 py-2.5 border-r border-slate-200 w-22">BATCH NO.</th>}
                    {settings.print?.tableColumns?.expDate && <th className="px-3 py-2.5 border-r border-slate-200 w-22 text-center">EXP. DATE</th>}
                    {settings.print?.tableColumns?.mfgDate && <th className="px-3 py-2.5 border-r border-slate-200 w-22 text-center">MFG. DATE</th>}
                    {settings.print?.tableColumns?.mrp && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">MRP</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-16 text-center">QTY</th>
                    {settings.transaction?.freeItemQuantity && <th className="px-3 py-2.5 border-r border-slate-200 w-16 text-center">FREE QTY</th>}
                    {settings.print?.tableColumns?.unit !== false && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-center">UNIT</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-28 text-right">PURCHASE PRICE</th>
                    {showDiscountCol && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">DISC %</th>}
                    {settings.print?.tableColumns?.taxPercent && <th className="px-3 py-2.5 border-r border-slate-200 w-20 text-right">TAX %</th>}
                    <th className="px-3 py-2.5 border-r border-slate-200 w-24 text-right">AMOUNT</th>
                    <th className="w-10 px-2 py-2.5 text-center"></th>
                  </tr>
                </thead>

                {/* Quick Entry Row (100% Synced with Table Columns & Titles) */}
                {settings.transaction?.quickEntry !== false && (
                  <thead className="bg-blue-50/90 border-b-2 border-blue-200">
                    <tr>
                      <td className="py-2 px-1 text-center border-r border-slate-200 w-10 text-amber-500 font-bold text-sm select-none" title="Quick Lightning Entry">
                        ⚡
                      </td>
                      <td className="py-2 px-2 border-r border-slate-200 relative min-w-[180px]">
                        <div className="relative">
                          <input
                            ref={lightningInputRef}
                            type="text"
                            placeholder="Scan Barcode or Search Medicine (F2)..."
                            value={lightningQuery}
                            onChange={(e) => {
                              setLightningQuery(e.target.value);
                              setLightningShowDropdown(true);
                              setLightningSelectedIndex(0);
                            }}
                            onKeyDown={(e) => {
                              const matches = medicines
                                .filter(m => m.name.toLowerCase().includes(lightningQuery.toLowerCase()) || (m.barcode && m.barcode.includes(lightningQuery)))
                                .slice(0, 8);
                              
                              if (e.key === 'Tab' && !e.shiftKey && !lightningQuery.trim()) {
                                const validItems = items.filter(i => i.name?.trim());
                                if (validItems.length > 0) {
                                  e.preventDefault();
                                  paidAmountInputRef.current?.focus();
                                  paidAmountInputRef.current?.select();
                                  return;
                                }
                              }

                              if (lightningShowDropdown && matches.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev + 1) % matches.length);
                                  return;
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev - 1 + matches.length) % matches.length);
                                  return;
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const chosen = matches[lightningSelectedIndex] || matches[0];
                                  setLightningSelectedMed(chosen);
                                  setLightningQuery(chosen.name);
                                  setLightningPrice(chosen.purchasePrice || 0);
                                  if (chosen.batchNumber) setLightningBatch(chosen.batchNumber);
                                  if (chosen.expiryDate) setLightningExpDate(chosen.expiryDate);
                                  if (chosen.unit) setLightningUnit(chosen.unit);
                                  setLightningShowDropdown(false);
                                  setTimeout(() => {
                                    lightningQtyInputRef.current?.focus();
                                    lightningQtyInputRef.current?.select();
                                  }, 40);
                                  return;
                                } else if (e.key === 'Escape') {
                                  setLightningShowDropdown(false);
                                  return;
                                }
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!lightningQuery.trim()) {
                                  const validItems = items.filter(i => i.name?.trim());
                                  if (validItems.length > 0) {
                                    paidAmountInputRef.current?.focus();
                                    paidAmountInputRef.current?.select();
                                  } else {
                                    focusTableCell(0, 'name');
                                  }
                                } else {
                                  const cleanQ = lightningQuery.trim().toLowerCase();
                                  const exactBarcodeMatch = medicines.find(m => 
                                    (m.barcode && m.barcode.trim().toLowerCase() === cleanQ) ||
                                    m.id.toLowerCase() === cleanQ ||
                                    ((m as any).code && (m as any).code.toLowerCase() === cleanQ)
                                  );
                                  if (exactBarcodeMatch) {
                                    handleBarcodeScanned(lightningQuery.trim(), 'Barcode Scanner');
                                  } else {
                                    handleConfirmLightningItem();
                                  }
                                }
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setLightningShowDropdown(false);
                              }, 200);
                            }}
                            className="w-full pl-6 pr-2 py-1 bg-white border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded text-xs font-semibold text-slate-900 focus:outline-none transition-all shadow-2xs"
                          />
                          <Search className="w-3 h-3 text-blue-500 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Search Dropdown with Company Name & Pricing */}
                        {lightningShowDropdown && lightningQuery.trim() && (
                          <div className="absolute left-0 top-full mt-1 w-[480px] sm:w-[620px] max-w-[90vw] bg-white border-2 border-blue-400 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-y-auto ring-4 ring-blue-500/10">
                            {medicines
                              .filter(m => m.name.toLowerCase().includes(lightningQuery.toLowerCase()) || (m.barcode && m.barcode.includes(lightningQuery)))
                              .slice(0, 8)
                              .map((med, lIdx) => (
                                <div
                                  key={med.id}
                                  onClick={() => {
                                    commitPurchaseLightningItem(med, lightningQty > 0 ? lightningQty : 1, med.purchasePrice || 0);
                                  }}
                                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between border-b border-slate-50 transition ${
                                    lightningSelectedIndex === lIdx ? 'bg-blue-100 font-bold text-blue-900' : 'hover:bg-blue-50 text-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold">{med.name}</div>
                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                      {med.manufacturer && (
                                        <span className="text-slate-600 font-medium">Co: {med.manufacturer}</span>
                                      )}
                                      {med.batchNumber && <span>Batch: {med.batchNumber}</span>}
                                      {med.expiryDate && <span>Exp: {med.expiryDate}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-bold text-blue-700">{formatCurrency(med.purchasePrice || 0)}</span>
                                    <div className="text-[9px] text-slate-400">Pur. Rate</div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>

                      {/* HSN/SAC */}
                      {settings.print?.tableColumns?.hsnSac && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={lightningHsn}
                            onChange={(e) => setLightningHsn(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="HSN"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}

                      {/* BATCH NO. */}
                      {settings.print?.tableColumns?.batchNo && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={lightningBatch}
                            onChange={(e) => setLightningBatch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="Batch"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}

                      {/* EXP. DATE */}
                      {settings.print?.tableColumns?.expDate && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={lightningExpDate}
                            onChange={(e) => setLightningExpDate(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-24 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}

                      {/* MFG. DATE */}
                      {settings.print?.tableColumns?.mfgDate && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={lightningMfgDate}
                            onChange={(e) => setLightningMfgDate(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-24 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}

                      {/* MRP */}
                      {settings.print?.tableColumns?.mrp && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={lightningMrp || ''}
                            onChange={(e) => setLightningMrp(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}

                      {/* QTY */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          ref={lightningQtyInputRef}
                          type="number"
                          min="1"
                          value={lightningQty || ''}
                          onChange={(e) => setLightningQty(parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              lightningPriceInputRef.current?.focus();
                              lightningPriceInputRef.current?.select();
                            }
                          }}
                          placeholder="1"
                          className="w-full px-1 py-1 bg-white border border-blue-300 rounded text-xs text-center font-bold font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* FREE QTY */}
                      {settings.transaction?.freeItemQuantity && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            value={lightningFreeQty || ''}
                            onChange={(e) => setLightningFreeQty(parseInt(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}

                      {/* UNIT */}
                      {settings.print?.tableColumns?.unit !== false && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <select
                            value={lightningUnit}
                            onChange={(e) => setLightningUnit(e.target.value)}
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs uppercase font-medium text-center"
                          >
                            <option value="Box">Box</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Strip">Strip</option>
                            <option value="Bottle">Bottle</option>
                            <option value="Pack">Pack</option>
                            <option value="Tablet">Tablet</option>
                            <option value="Vial">Vial</option>
                            <option value="Ampoule">Ampoule</option>
                            <option value="Syrup">Syrup</option>
                            <option value="NONE">NONE</option>
                          </select>
                        </td>
                      )}

                      {/* PURCHASE PRICE with Last 5 Purchases History & Company */}
                      <td className="py-2 px-2 border-r border-slate-200 relative">
                        <div className="flex items-center justify-end">
                          <input
                            ref={lightningPriceInputRef}
                            type="number"
                            step="0.01"
                            value={lightningPrice || ''}
                            onChange={(e) => setLightningPrice(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => {
                              e.target.select();
                              if (settings.transaction?.showRecentRatesOnFocus !== false && (lightningSelectedMed || lightningQuery)) {
                                setQuickBarPriceDropdownOpen(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setQuickBarPriceDropdownOpen(false);
                                handleConfirmLightningItem();
                              }
                            }}
                            placeholder="0.00"
                            className="w-full px-1 py-1 bg-white border border-blue-300 rounded text-xs text-right font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          {(lightningSelectedMed || lightningQuery) && (
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickBarPriceDropdownOpen(prev => !prev);
                              }}
                              title="Show Last 5 Purchase Rates & Company"
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition shrink-0 ml-0.5"
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Quick Bar Historical Purchase Price Dropdown */}
                        <HistoricalPriceDropdown
                          medicineId={lightningSelectedMed?.id}
                          itemName={lightningSelectedMed?.name || lightningQuery}
                          companyName={lightningSelectedMed?.manufacturer || ''}
                          transactionType="Purchase"
                          currentPrice={Number(lightningPrice) || 0}
                          onSelectPrice={(p) => {
                            setLightningPrice(p);
                            setQuickBarPriceDropdownOpen(false);
                          }}
                          isOpen={quickBarPriceDropdownOpen && Boolean(lightningSelectedMed || lightningQuery)}
                          onClose={() => setQuickBarPriceDropdownOpen(false)}
                          showCompany={settings.transaction?.showCompanyInRecentRates !== false}
                          onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                      </td>

                      {/* DISC % */}
                      {showDiscountCol && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={lightningDiscount || ''}
                            onChange={(e) => setLightningDiscount(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0%"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}

                      {/* TAX % */}
                      {settings.print?.tableColumns?.taxPercent && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={lightningTax || ''}
                            onChange={(e) => setLightningTax(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0%"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}

                      {/* AMOUNT PREVIEW */}
                      <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                        {formatCurrency((((lightningQty || 1) * (lightningPrice || 0)) * (1 - (lightningDiscount || 0) / 100)) * (1 + (lightningTax || 0) / 100))}
                      </td>

                      {/* ACTION BUTTON */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={handleConfirmLightningItem}
                          title="Add Item (Enter)"
                          className="w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition shadow-2xs mx-auto cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </thead>
                )}

                {/* Table Body Rows */}
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const isActive = activeRowIndex === idx;

                    return (
                      <tr 
                        key={item.id || idx} 
                        onClick={() => setActiveRowIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                          if (isNaN(dragIndex) || dragIndex === idx) return;
                          const newItems = [...items];
                          const [moved] = newItems.splice(dragIndex, 1);
                          newItems.splice(idx, 0, moved);
                          setItems(newItems);
                        }}
                        className={`transition relative ${isActive ? 'bg-[#f0f7ff]' : 'hover:bg-slate-50'}`}
                      >
                        {/* Drag Handle & Row Index */}
                        <td className="px-1 py-2 text-center border-r border-[#E2E8F0] bg-slate-50/50 w-10 text-xs text-slate-500 font-mono select-none">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', idx.toString());
                              }}
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 font-bold select-none px-0.5"
                              title="Drag to reorder row"
                            >
                              ⋮⋮
                            </span>
                            {isActive ? (
                              <Zap className="w-4 h-4 text-blue-500 inline fill-blue-500" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                        </td>

                        {/* Item Name Input with Auto-complete */}
                        <td className="px-2 py-1.5 border-r border-slate-200 relative">
                          <input
                            type="text"
                            data-pcell={`name-${idx}`}
                            value={item.name}
                            onFocus={() => {
                              setActiveRowIndex(idx);
                              setMedicineDropdownRow(idx);
                              setTableMedSelectedIndex(0);
                            }}
                            onChange={e => {
                              handleItemChange(idx, 'name', e.target.value);
                              setMedicineDropdownRow(idx);
                              setTableMedSelectedIndex(0);
                            }}
                            onKeyDown={(e) => {
                              const isDropdownActive = medicineDropdownRow === idx && item.name.trim().length > 0 && filteredMedicines.length > 0;
                              if (isDropdownActive) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setTableMedSelectedIndex(prev => (prev + 1) % filteredMedicines.length);
                                  return;
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setTableMedSelectedIndex(prev => (prev - 1 + filteredMedicines.length) % filteredMedicines.length);
                                  return;
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  if (filteredMedicines[tableMedSelectedIndex]) {
                                    handleSelectMedicine(idx, filteredMedicines[tableMedSelectedIndex]);
                                    setMedicineDropdownRow(null);
                                    focusTableCell(idx, 'quantity');
                                  }
                                  return;
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setMedicineDropdownRow(null);
                                  return;
                                }
                              }

                              // Direct row-to-row navigation
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (idx + 1 < items.length) {
                                  focusTableCell(idx + 1, 'name');
                                } else {
                                  handleAddRow();
                                  setTimeout(() => focusTableCell(idx + 1, 'name'), 40);
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (idx > 0) focusTableCell(idx - 1, 'name');
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!item.name?.trim() && items.filter(i => i.name?.trim()).length > 0) {
                                  paidAmountInputRef.current?.focus();
                                  paidAmountInputRef.current?.select();
                                } else {
                                  focusTableCell(idx, 'quantity');
                                }
                              }
                            }}
                            onClick={() => {
                              setActiveRowIndex(idx);
                              setMedicineDropdownRow(idx);
                              setTableMedSelectedIndex(0);
                            }}
                            placeholder="Enter item name or scan barcode"
                            className="w-full bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold cursor-pointer"
                          />

                          {/* Medicine Autocomplete Dropdown */}
                          {medicineDropdownRow === idx && (
                            <div 
                              className="absolute left-0 top-full mt-0.5 w-[550px] sm:w-[700px] max-w-[90vw] bg-white border-2 border-blue-400 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-y-auto ring-4 ring-blue-500/10"
                              onMouseDown={e => e.preventDefault()}
                            >
                              <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-semibold flex justify-between items-center sticky top-0 z-10">
                                <span className="font-bold text-slate-700">INVENTORY ITEMS ({filteredMedicines.length})</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] text-blue-600 font-normal">↑↓ Navigate • Enter select</span>
                                  <button 
                                    type="button" 
                                    onClick={(e) => { e.stopPropagation(); setMedicineDropdownRow(null); }}
                                    className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                              {filteredMedicines.map((m, mIdx) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectMedicine(idx, m);
                                    setMedicineDropdownRow(null);
                                    focusTableCell(idx, 'quantity');
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-xs border-b border-slate-100 flex justify-between items-center transition ${
                                    tableMedSelectedIndex === mIdx ? 'bg-blue-100 text-blue-900 font-semibold' : 'hover:bg-blue-50 text-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800">{m.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                      Stock: <span className={m.quantity < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>{m.quantity} {m.unit || 'PCS'}</span> • MRP: {formatCurrency(m.mrp || 0)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-blue-700">{formatCurrency(m.purchasePrice)}</div>
                                    <div className="text-[10px] text-slate-400">Pur. Price</div>
                                  </div>
                                </button>
                              ))}

                              {filteredMedicines.length === 0 && (
                                <div className="p-2 text-center text-[11px] text-slate-500">
                                  Item not in stock. Adding as new purchase item.
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* HSN/SAC */}
                        {settings.print?.tableColumns?.hsnSac && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              data-pcell={`hsnCode-${idx}`}
                              value={item.hsnCode || ''}
                              placeholder="HSN"
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'hsnCode');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'hsnCode');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'quantity');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'hsnCode', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono text-center focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Batch No */}
                        {settings.print?.tableColumns?.batchNo && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              data-pcell={`batchNumber-${idx}`}
                              value={item.batchNumber || ''}
                              placeholder="Batch"
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'batchNumber');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'batchNumber');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (settings.print?.tableColumns?.expDate) {
                                    focusTableCell(idx, 'expiryDate');
                                  } else {
                                    focusTableCell(idx, 'quantity');
                                  }
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'batchNumber', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Expiry Date */}
                        {settings.print?.tableColumns?.expDate && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="date"
                              data-pcell={`expiryDate-${idx}`}
                              value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'expiryDate');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'expiryDate');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'quantity');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'expiryDate', e.target.value)}
                              className="w-24 bg-white border border-slate-200 rounded p-1 text-xs text-slate-800 font-mono text-center"
                            />
                          </td>
                        )}

                        {/* Mfg Date */}
                        {settings.print?.tableColumns?.mfgDate && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="date"
                              data-pcell={`mfgDate-${idx}`}
                              value={item.mfgDate ? item.mfgDate.slice(0, 10) : ''}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'mfgDate');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'mfgDate');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'quantity');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'mfgDate', e.target.value)}
                              className="w-24 bg-white border border-slate-200 rounded p-1 text-xs text-slate-800 font-mono text-center"
                            />
                          </td>
                        )}

                        {/* MRP */}
                        {settings.print?.tableColumns?.mrp && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              data-pcell={`mrp-${idx}`}
                              min="0"
                              step="0.01"
                              value={item.mrp || 0}
                              placeholder="0"
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'mrp');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'mrp');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'quantity');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-800 font-mono text-right focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Qty Input */}
                        <td className="px-2 py-1.5 border-r border-slate-200">
                          <input
                            type="number"
                            data-pcell={`quantity-${idx}`}
                            min="1"
                            step="1"
                            value={item.quantity}
                            onFocus={() => setActiveRowIndex(idx)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (idx + 1 < items.length) focusTableCell(idx + 1, 'quantity');
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (idx > 0) focusTableCell(idx - 1, 'quantity');
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                focusTableCell(idx, 'purchasePrice');
                              }
                            }}
                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full text-center bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold"
                          />
                        </td>

                        {/* Free Qty */}
                        {settings.transaction?.freeItemQuantity && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <input
                              type="number"
                              data-pcell={`freeQuantity-${idx}`}
                              min="0"
                              step="1"
                              value={item.freeQuantity || 0}
                              placeholder="0"
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'freeQuantity');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'freeQuantity');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'purchasePrice');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'freeQuantity', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full text-center bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-semibold"
                            />
                          </td>
                        )}

                        {/* Unit Dropdown */}
                        {settings.print?.tableColumns?.unit !== false && (
                          <td className="px-2 py-1.5 border-r border-slate-200">
                            <select
                              data-pcell={`unit-${idx}`}
                              value={item.unit || 'NONE'}
                              onFocus={() => setActiveRowIndex(idx)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  focusTableCell(idx, 'purchasePrice');
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full bg-transparent border-0 p-1 text-xs text-slate-700 focus:ring-0 focus:outline-none text-center uppercase font-medium"
                            >
                              {COMMON_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                        )}

                        {/* Purchase Price Input */}
                        <td className="px-2 py-1.5 border-r border-slate-200 text-right relative">
                          <div className="flex items-center justify-end">
                            <input
                              type="number"
                              data-pcell={`purchasePrice-${idx}`}
                              min="0"
                              step="0.01"
                              value={item.purchasePrice}
                              onFocus={() => {
                                setActiveRowIndex(idx);
                                if (settings.transaction?.showRecentRatesOnFocus !== false && (item.medicineId || item.name)) {
                                  setActivePriceFieldIdx(idx);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'purchasePrice');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'purchasePrice');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setActivePriceFieldIdx(null);
                                  setShowPriceDropdownManual(null);
                                  if (showDiscountCol) {
                                    focusTableCell(idx, 'discountPercentage');
                                  } else if (settings.print?.tableColumns?.taxPercent) {
                                    focusTableCell(idx, 'taxPercentage');
                                  } else {
                                    if (idx + 1 < items.length) {
                                      focusTableCell(idx + 1, 'name');
                                    } else {
                                      paidAmountInputRef.current?.focus();
                                      paidAmountInputRef.current?.select();
                                    }
                                  }
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'purchasePrice', e.target.value)}
                              className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-900 focus:ring-0 focus:outline-none font-bold font-mono"
                            />
                            {(item.medicineId || item.name) && (
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPriceDropdownManual(prev => prev === idx ? null : idx);
                                  setActivePriceFieldIdx(idx);
                                }}
                                title="Show Last 5 Purchase Rates & Company"
                                className="p-0.5 text-slate-300 hover:text-blue-600 rounded transition shrink-0 ml-0.5"
                              >
                                <Clock className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Historical Purchase Prices Dropdown with Company Name */}
                          <HistoricalPriceDropdown
                            medicineId={item.medicineId}
                            itemName={item.name}
                            companyName={(() => {
                              const med = medicines.find(m => m.id === item.medicineId || (m.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim()));
                              return med?.manufacturer || (item as any).company || '';
                            })()}
                            transactionType="Purchase"
                            currentPrice={Number(item.purchasePrice) || 0}
                            onSelectPrice={(p) => handleItemChange(idx, 'purchasePrice', p.toString())}
                            isOpen={
                              (activePriceFieldIdx === idx && (settings.transaction?.showRecentRatesOnFocus !== false || showPriceDropdownManual === idx)) ||
                              showPriceDropdownManual === idx
                            }
                            onClose={() => {
                              setActivePriceFieldIdx(null);
                              setShowPriceDropdownManual(null);
                            }}
                            showCompany={settings.transaction?.showCompanyInRecentRates !== false}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                          />
                        </td>

                        {/* Discount % */}
                        {showDiscountCol && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              data-pcell={`discountPercentage-${idx}`}
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discountPercentage || 0}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'discountPercentage');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'discountPercentage');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (settings.print?.tableColumns?.taxPercent) {
                                    focusTableCell(idx, 'taxPercentage');
                                  } else {
                                    if (idx + 1 < items.length) {
                                      focusTableCell(idx + 1, 'name');
                                    } else {
                                      paidAmountInputRef.current?.focus();
                                      paidAmountInputRef.current?.select();
                                    }
                                  }
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'discountPercentage', parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Tax % */}
                        {settings.print?.tableColumns?.taxPercent && (
                          <td className="px-2 py-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              data-pcell={`taxPercentage-${idx}`}
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.taxPercentage || 0}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) focusTableCell(idx + 1, 'taxPercentage');
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (idx > 0) focusTableCell(idx - 1, 'taxPercentage');
                                } else if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (idx + 1 < items.length) {
                                    focusTableCell(idx + 1, 'name');
                                  } else {
                                    paidAmountInputRef.current?.focus();
                                    paidAmountInputRef.current?.select();
                                  }
                                }
                              }}
                              onChange={e => handleItemChange(idx, 'taxPercentage', parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-0 p-1 text-xs text-slate-800 font-mono focus:ring-0 focus:outline-none"
                            />
                          </td>
                        )}

                        {/* Amount Calculated */}
                        <td className="px-3 py-1.5 border-r border-slate-200 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.total)}
                        </td>

                        {/* Row Actions */}
                        <td className="px-1 py-1.5 text-center">
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => handleAddRow()}
                              title="Commit row and add next"
                              className="w-6 h-6 bg-[#1877f2] hover:bg-blue-700 text-white rounded flex items-center justify-center mx-auto shadow-xs transition active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveRow(idx);
                              }}
                              title="Remove item"
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: Add Row & Total Bar */}
                <tfoot className="bg-[#f8fafc] border-t border-slate-300 font-semibold text-xs">
                  <tr>
                    <td className="px-3 py-2 border-r border-slate-200"></td>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ADD ROW</span>
                      </button>
                    </td>
                    <td colSpan={10} className="px-3 py-2 text-right border-r border-slate-200 text-slate-500 font-semibold">
                      Total Qty: <strong className="text-slate-900 ml-1 mr-4">{totalQuantity}</strong>
                      Subtotal: <strong className="text-slate-900 text-sm ml-1 font-mono">{formatCurrency(rawSubTotal)}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>

          {/* Mobile-Only Calculation & Summary Section (Directly below table, no horizontal sliding) */}
          <div className="md:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            {/* Action Links: Add Tax, Add Discount & Charges */}
            <div className="flex items-center justify-between pt-1 text-xs font-bold text-blue-600">
              <button
                type="button"
                onClick={() => {
                  const rate = prompt('Enter Tax % across items (e.g. 5, 12, 18):', '0');
                  if (rate !== null) {
                    const parsed = parseFloat(rate) || 0;
                    setItems(items.map(it => {
                      const qty = Number(it.quantity) || 0;
                      const price = Number(it.purchasePrice) || 0;
                      const disc = Number(it.discountPercentage) || 0;
                      const base = qty * price;
                      const discAmt = (base * disc) / 100;
                      const taxable = base - discAmt;
                      const taxAmt = (taxable * parsed) / 100;
                      return {
                        ...it,
                        taxPercentage: parsed,
                        total: Math.round(taxable + taxAmt)
                      };
                    }));
                  }
                }}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+</span>
                <span>Add Tax</span>
                {totalTaxAmount > 0 && <span className="text-[11px] text-emerald-600 font-mono">({formatCurrency(totalTaxAmount)})</span>}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const disc = prompt('Enter Discount % for all items (e.g. 5, 10):', '0');
                  if (disc !== null) {
                    const parsed = parseFloat(disc) || 0;
                    setItems(items.map(it => {
                      const qty = Number(it.quantity) || 0;
                      const price = Number(it.purchasePrice) || 0;
                      const tax = Number(it.taxPercentage) || 0;
                      const base = qty * price;
                      const discAmt = (base * parsed) / 100;
                      const taxable = base - discAmt;
                      const taxAmt = (taxable * tax) / 100;
                      return {
                        ...it,
                        discountPercentage: parsed,
                        total: Math.round(taxable + taxAmt)
                      };
                    }));
                  }
                }}
                className="hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>+</span>
                <span>Add Discount & Charges</span>
                {totalDiscountAmount > 0 && <span className="text-[11px] text-rose-600 font-mono">(-{formatCurrency(totalDiscountAmount)})</span>}
              </button>
            </div>

            {/* Round Off Toggle Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundOff}
                  onChange={(e) => setRoundOff(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Round Off</span>
              </label>
              <span className="font-mono text-xs text-slate-500">
                {roundOffAmount !== 0 ? (roundOffAmount > 0 ? `+${roundOffAmount}` : `${roundOffAmount}`) : '0.00'}
              </span>
            </div>

            {/* Total Amount Row */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-black text-sm text-slate-900">Total Amount</span>
              <span className="font-black text-base text-blue-900 font-mono">
                Rs {grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Type Segmented Tabs */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                Payment Type
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['Cash', 'Credit', 'Bank Transfer', 'Cheque'] as const).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => {
                      setPaymentType(pt);
                      if (pt === 'Credit') {
                        setPaidAmount(0);
                        setHasCustomPaidAmount(true);
                      } else {
                        setPaidAmount(grandTotal);
                        setHasCustomPaidAmount(false);
                      }
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all truncate cursor-pointer ${
                      paymentType === pt
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pt === 'Bank Transfer' ? 'Bank' : pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid Amount & Balance Due on Mobile */}
            {paymentType !== 'Credit' && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Paid Amount</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(grandTotal);
                        setHasCustomPaidAmount(true);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
                    >
                      Full Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(0);
                        setHasCustomPaidAmount(true);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md"
                    >
                      0 (Udhaar)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">Rs</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={effectivePaidAmount === 0 ? '' : effectivePaidAmount}
                    placeholder="0.00"
                    onChange={(e) => {
                      setPaidAmount(parseFloat(e.target.value) || 0);
                      setHasCustomPaidAmount(true);
                    }}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-right text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {balanceDue > 0 && (
              <div className="flex items-center justify-between pt-1 text-xs font-bold text-rose-600">
                <span>Balance Due</span>
                <span className="font-mono">Rs {balanceDue.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Desktop-Only Bottom Section: Payment Type, Description, Images, Totals */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 pt-2 items-start">
            
            {/* Left Controls: Payment Type, + Description, + Image */}
            <div className="w-full md:col-span-6 space-y-4">
              
              {/* Payment Type Selection */}
              <div className="bg-white border border-slate-300 rounded-2xl p-3.5 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-700">Payment Type</label>
                
                {/* Mobile Segmented Chips */}
                <div className="grid grid-cols-2 sm:hidden gap-1.5">
                  {(['Cash', 'Credit', 'Bank Transfer', 'Cheque'] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => {
                        setPaymentType(pt);
                        if (pt === 'Credit') {
                          setPaidAmount(0);
                          setHasCustomPaidAmount(true);
                        } else {
                          setPaidAmount(grandTotal);
                          setHasCustomPaidAmount(false);
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                        paymentType === pt
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pt === 'Credit' ? 'Credit (Udhaar)' : pt}
                    </button>
                  ))}
                </div>

                {/* Desktop dropdown */}
                <div className="hidden sm:block relative">
                  <select
                    value={paymentType}
                    onChange={e => {
                      const pt = e.target.value as any;
                      setPaymentType(pt);
                      if (pt === 'Credit') {
                        setPaidAmount(0);
                        setHasCustomPaidAmount(true);
                      } else {
                        setPaidAmount(grandTotal);
                        setHasCustomPaidAmount(false);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit">Credit (Udhaar)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Additional Bill Expenses (Transport, Handling, Shipping, etc.) */}
              <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span>Additional Bill Expenses</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Proportionally Allocated</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Transport</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.transport || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, transport: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Shipping</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.shipping || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, shipping: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Handling</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.handling || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, handling: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Loading</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.loading || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, loading: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Delivery</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.delivery || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, delivery: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Other</label>
                    <input
                      type="number"
                      min="0"
                      value={additionalExpenses.other || ''}
                      onChange={e => setAdditionalExpenses({...additionalExpenses, other: parseFloat(e.target.value) || 0})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>
                {(Object.values(additionalExpenses) as number[]).reduce((a, b) => a + (b || 0), 0) > 0 && (
                  <div className="text-[11px] text-blue-700 font-bold pt-1 flex justify-between">
                    <span>Total Additional Expenses:</span>
                    <span className="font-mono">{formatCurrency((Object.values(additionalExpenses) as number[]).reduce((a, b) => a + (b || 0), 0))}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Add Description & Add Image */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDescription(!showDescription)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-2xs transition"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ ADD DESCRIPTION</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowImageUpload(true);
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-2xs transition"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ ADD IMAGE</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageFile} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Expandable Description Text Area */}
              {showDescription && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs space-y-1">
                  <label className="text-xs font-bold text-slate-700">Bill Remarks / Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter bill remarks, supplier terms, or batch details..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Expandable Image Preview */}
              {imageAttachment && (
                <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={imageAttachment} 
                      alt="Attachment" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-xs font-medium text-slate-700">Receipt / Bill Image Attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageAttachment(null)}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}

            </div>

            {/* Right Controls: Round Off, Totals, Paid & Balance Due */}
            <div className="w-full md:col-span-6 bg-white border border-slate-300 rounded-2xl p-4 shadow-xs space-y-3">
              
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={roundOff}
                    onChange={e => setRoundOff(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Round off ({roundOffType})</span>
                </label>
                <span className="text-slate-500 font-mono">
                  {roundOff ? (roundOffAmount >= 0 ? `+${roundOffAmount}` : `${roundOffAmount}`) : '0.00'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                <span>Total Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatCurrency(grandTotal)}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                  <span>Paid / Given Amount</span>
                  <div className="w-36">
                    <input
                      ref={paidAmountInputRef}
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="0.01"
                      value={effectivePaidAmount}
                      onFocus={(e) => e.target.select()}
                      onChange={e => {
                        setPaidAmount(parseFloat(e.target.value) || 0);
                        setHasCustomPaidAmount(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInitiateSave('save');
                        } else if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          saveButtonRef.current?.focus();
                        }
                      }}
                      className="w-full text-right bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Mobile Quick Paid Presets */}
                <div className="flex sm:hidden items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(grandTotal);
                      setHasCustomPaidAmount(true);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md active:bg-blue-100"
                  >
                    Full Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(0);
                      setHasCustomPaidAmount(true);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md active:bg-rose-100"
                  >
                    0 (Udhaar)
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
                <span className="text-rose-600">Balance Due</span>
                <span className="text-rose-600 font-mono">{formatCurrency(balanceDue)}</span>
              </div>

            </div>

          </div>

          </div>

        </div>

        {/* Modal Footer Action Buttons (Save & New and Save) */}
        <div className="bg-[#f1f5f9] border-t border-slate-300 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 select-none">
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="View full keyboard shortcut cheatsheet (F12 / ?)"
            >
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Shortcuts (F12)</span>
            </button>
            <span className="text-slate-300">•</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Ctrl+S</kbd> Save</span>
            <span className="text-slate-300">•</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Ctrl+Enter</kbd> Save & New</span>
          </div>

          <div className="flex items-center gap-2.5 justify-end">
            {/* Cancel / Discard button */}
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Close & discard changes (Esc)"
            >
              Cancel
            </button>

            {/* Save & New Button */}
            <button
              type="button"
              onClick={() => handleInitiateSave('save_and_new')}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-blue-600 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Save and create new bill (Ctrl+Enter or Alt+N)"
            >
              <span>Save & New</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-blue-100/70 text-blue-800 rounded font-mono font-medium">Ctrl+Enter</kbd>
            </button>

            {/* Save Button */}
            <button
              ref={saveButtonRef}
              type="button"
              onClick={() => handleInitiateSave('save')}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1877f2] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              title="Save purchase and close (Ctrl+S)"
            >
              <span>Save {transactionType === 'Purchase Return' ? 'Return' : 'Purchase'}</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-blue-800/60 text-white rounded font-mono font-medium">Ctrl+S</kbd>
            </button>
          </div>

        </div>

      </div>

      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsCheatSheetModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        context="purchase"
      />

      {/* Transaction Save & Confirmation Modal */}
      <TransactionSaveConfirmModal
        isOpen={showSaveConfirmModal}
        type="purchase"
        transactionTitle={billNumber || 'PUR-NEW'}
        partyLabel="Supplier"
        partyName={selectedSupplier?.name || supplierSearchQuery.trim() || 'General Supplier'}
        partyContact={selectedSupplier?.phone}
        itemCount={items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) > 0).length}
        totalQuantity={totalQuantity}
        subtotal={itemsSubtotal}
        discountAmount={totalDiscountAmount}
        taxAmount={totalTaxAmount}
        additionalCharges={totalExpenses}
        grandTotal={grandTotal}
        paidAmount={effectivePaidAmount}
        balanceDue={balanceDue}
        paymentType={paymentType}
        onConfirm={() => {
          setShowSaveConfirmModal(false);
          if (pendingSaveMode === 'save_and_new') {
            handleSaveAndNew();
          } else {
            handleSave();
          }
        }}
        onSaveAndNew={() => {
          setShowSaveConfirmModal(false);
          handleSaveAndNew();
        }}
        onClose={() => {
          setShowSaveConfirmModal(false);
          setTimeout(() => {
            paidAmountInputRef.current?.focus();
            paidAmountInputRef.current?.select();
          }, 60);
        }}
      />

      {/* Transaction Discard Confirmation Guard */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Discard Current Transaction?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You have active items or supplier details entered in this {transactionType || 'Purchase'}. Are you sure you want to close? All unsaved items will be lost.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Keep Editing (Esc)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Discard & Close</span>
                <span className="text-[10px] opacity-80 font-mono">(Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal supporting Hardware HID USB/Wireless Gun & Camera */}
      {isBarcodeScannerOpen && (
        <BarcodeScannerModal
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onScan={(code) => handleBarcodeScanned(code, 'Barcode Scanner Modal')}
        />
      )}

    </div>
  );
};
