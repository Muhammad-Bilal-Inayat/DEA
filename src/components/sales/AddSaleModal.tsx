import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Plus, Trash2, Search, Calculator, Settings, Check, 
  Camera, FileText, Image as ImageIcon, ChevronDown, 
  ArrowLeftRight, AlertCircle, AlertTriangle, Sparkles, UserPlus, Phone, Printer, MessageCircle,
  Minus, Maximize2, Minimize2, ShieldAlert, Scan, MoreVertical, Loader2, Clock,
  Keyboard
} from 'lucide-react';
import { Medicine, Party, Invoice, InvoiceItem, AuditLog, PurchaseOrder } from '../../types';
import { dbMedicines, dbSuppliers, dbInvoices, dbPurchaseOrders, dbAuditLogs } from '../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { CalculatorModal } from './CalculatorModal';
import { AddPartyModal } from '../parties/AddPartyModal';
import { InvoiceSettingsModal } from './InvoiceSettingsModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { KeyboardShortcutsCheatSheetModal } from '../common/KeyboardShortcutsCheatSheetModal';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { getRecentSalePrices, getAuthoritativeLatestPurchasePrice } from '../../lib/inventoryCosting';
import { getFEFOBatches } from '../../lib/enterprisePharma';
import { 
  getFEFOSortedBatches, 
  allocateFEFOStock, 
  deductFEFOFromMedicine, 
  restockFEFOSaleReturn,
  calculateDaysUntilExpiry,
  FEFOBatchItem
} from '../../lib/fefoEngine';
import {
  getStockRotationSortedBatches,
  deductStockFromMedicine,
  restockSaleReturn,
  logStockRotationOverride
} from '../../lib/stockRotationEngine';
import { HistoricalPriceDropdown } from '../common/HistoricalPriceDropdown';
import { emitToast } from '../../contexts/ToastContext';
import { playScannerBeep } from '../../lib/barcodeAudio';
import { useHardwareBarcodeScanner } from '../../hooks/useHardwareBarcodeScanner';
import { TransactionSaveConfirmModal } from '../common/TransactionSaveConfirmModal';
import { LossSaleHardPromptModal, LossItemDetail } from './LossSaleHardPromptModal';

interface SaleTabState {
  id: string;
  tabLabel: string;
  transactionType: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
  isCredit: boolean;
  selectedPartyId: string;
  customerName: string;
  billingName: string;
  customerPhone: string;
  customerAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerPoNumber?: string;
  customerPoDate?: string;
  paymentTerms?: string;
  dueDate?: string;
  items: (InvoiceItem & { tempId: string })[];
  description: string;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  isRoundOff: boolean;
  roundOffAmount: number;
  receivedAmount: number;
  imageAttachment?: string;
  documentAttachment?: string;
  isWarrantyBill?: boolean;
  warrantyPeriod?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyType?: 'Repair' | 'Replacement' | 'Service';
  warrantyTerms?: string;
  tinNtn?: string;
  claimContact?: string;
  shopStamp?: boolean;
  warrantyCustomFieldValues?: Record<string, string>;
  isWarrantyHeaderEnabled?: boolean;
  isWarrantyFooterEnabled?: boolean;
  isWarrantyPrintingEnabled?: boolean;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedInvoice: Invoice) => void;
  initialInvoice?: Invoice | null;
  defaultTransactionType?: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
  dockDraftId?: string;
  isDockMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
  onSummaryChange?: (summary: { partyName: string; amount: number; itemCount: number; title?: string }) => void;
}

const UNIT_OPTIONS = ['NONE', 'Box', 'Strip', 'Pcs', 'Tab', 'Vial', 'Bottle', 'Ampoule', 'Pack'];

const createEmptySaleRows = () => Array.from({ length: 5 }).map(() => ({
  tempId: uuidv4(),
  name: '',
  batchNumber: '',
  expiryDate: '',
  quantity: 1,
  unit: 'Box',
  pricePerUnit: 0,
  sellingPrice: 0,
  mrp: 0,
  total: 0
}));

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  initialInvoice,
  defaultTransactionType = 'Sale',
  dockDraftId,
  isDockMinimized,
  onMinimizeChange,
  onSummaryChange
}) => {
  const { business, tenant, tenantId, currentUser, activeUser } = useAuth();
  const { settings, updateTransaction } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  
  // Master lists
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseOrder[]>([]);
  const [activePriceRowId, setActivePriceRowId] = useState<string | null>(null);
  const [showPriceDropdownManual, setShowPriceDropdownManual] = useState<string | null>(null);
  const [quickBarPriceDropdownOpen, setQuickBarPriceDropdownOpen] = useState(false);
  
  // Tabs State (multi-sale support)
  const [tabs, setTabs] = useState<SaleTabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Modals inside AddSale
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<Invoice | null>(null);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState(false);
  
  // Quick Lightning Entry Row State
  const [lightningQuery, setLightningQuery] = useState('');
  const [lightningResults, setLightningResults] = useState<Medicine[]>([]);
  const [lightningSelectedMed, setLightningSelectedMed] = useState<Medicine | null>(null);
  const [lightningQty, setLightningQty] = useState<number>(1);
  const [lightningUnit, setLightningUnit] = useState<string>('Box');
  const [lightningPrice, setLightningPrice] = useState<number>(0);
  const [lightningHsn, setLightningHsn] = useState('');
  const [lightningBatch, setLightningBatch] = useState('');
  const [lightningExpDate, setLightningExpDate] = useState('');
  const [lightningMfgDate, setLightningMfgDate] = useState('');
  const [lightningMrp, setLightningMrp] = useState<number>(0);
  const [lightningFreeQty, setLightningFreeQty] = useState<number>(0);
  const [lightningDiscount, setLightningDiscount] = useState<number>(0);
  const [lightningTax, setLightningTax] = useState<number>(0);

  // Customer dropdown search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isPlusDropdownOpen, setIsPlusDropdownOpen] = useState(false);
  const [activeMedDropdownTempId, setActiveMedDropdownTempId] = useState<string | null>(null);
  const [customerSelectedIndex, setCustomerSelectedIndex] = useState(0);
  const [lightningSelectedIndex, setLightningSelectedIndex] = useState(0);
  const [tableMedSelectedIndex, setTableMedSelectedIndex] = useState(0);

  // Active field target for calculator value insertion
  const [activeCalcTarget, setActiveCalcTarget] = useState<'price' | 'received' | null>(null);

  // Mobile 2-Step View state (Step 1: Party & Details, Step 2: Items & Totals)
  const [mobileStep, setMobileStep] = useState<1 | 2>(1);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  // Mobile medicine search state
  const [mobileMedicineSearch, setMobileMedicineSearch] = useState('');

  // Show attachment boxes
  const [showDescription, setShowDescription] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);

  // Status Alerts
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);

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

  const customerInputRef = useRef<HTMLInputElement>(null);
  const lightningInputRef = useRef<HTMLInputElement>(null);
  const lightningQtyInputRef = useRef<HTMLInputElement>(null);
  const lightningDiscountInputRef = useRef<HTMLInputElement>(null);
  const lightningPriceInputRef = useRef<HTMLInputElement>(null);
  const receivedAmountInputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const plusDropdownRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Discount column flag (controlled by Settings > Item-wise Discount & Print/Invoice Table Columns)
  const showDiscountCol = settings.print?.tableColumns?.discount !== false && settings.item?.itemWiseDiscount !== false;

  // Close & Discard Confirmation Guard
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState<'save' | 'save_and_new' | 'save_and_print'>('save');
  
  // Below-cost loss prevention modal states
  const [showLossPromptModal, setShowLossPromptModal] = useState(false);
  const [lossPromptItems, setLossPromptItems] = useState<LossItemDetail[]>([]);
  const [pendingLossMode, setPendingLossMode] = useState<'save' | 'save_and_new' | 'save_and_print'>('save');
  const [lossAuthorized, setLossAuthorized] = useState(false);

  // Helper to focus table cell by scell attribute
  const focusSaleTableCell = (rowIndex: number, field: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-scell="${field}-${rowIndex}"]`);
      if (el) {
        el.focus();
        if ('select' in el && typeof (el as HTMLInputElement).select === 'function') {
          (el as HTMLInputElement).select();
        }
      }
    });
  };

  // Autofocus Customer Input immediately when Sale modal opens so Tab/Keyboard works without mouse
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const timer = setTimeout(() => {
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(event.target as Node)) {
        setIsPlusDropdownOpen(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load medicines, parties & initialize default tab
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [medsData, partiesData, invoicesData, purchasesData] = await Promise.all([
        dbMedicines.getAll(),
        dbSuppliers.getAll(),
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll()
      ]);
      setMedicines(medsData);
      setParties(partiesData);
      setAllInvoices(invoicesData);
      setAllPurchases(purchasesData);

      // Determine next invoice number based on prefixes in settings
      const type = initialInvoice?.transactionType || defaultTransactionType || 'Sale';
      const prefixes = (settings.transaction.prefixes as any) || {};
      const typePrefix = 
        type === 'Estimate' ? (prefixes.estimate || 'EST-') :
        type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
        type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
        type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
        (prefixes.sale || '');
      
      const typeLabel = 
        type === 'Estimate' ? 'Estimate' :
        type === 'Sale Order' ? 'Sale Order' :
        type === 'Delivery Challan' ? 'Challan' :
        type === 'Sale Return' ? 'Sale Return' : 'Sale';

      let nextNum = '1';
      const matchingInvoices = invoicesData.filter(inv => inv.transactionType === type || (!inv.transactionType && type === 'Sale'));
      if (matchingInvoices.length > 0) {
        const nums = matchingInvoices
          .map(inv => parseInt(inv.invoiceNumber.replace(/\D/g, '') || '0'))
          .filter(n => !isNaN(n));
        const max = nums.length > 0 ? Math.max(...nums) : 0;
        nextNum = (max + 1).toString();
      }
      const formattedNum = typePrefix ? `${typePrefix}${nextNum}` : nextNum;

      const todayStr = new Date().toISOString().slice(0, 10);
      const oneYearLaterStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      if (initialInvoice) {
        // Editing existing invoice
        const initialTab: SaleTabState = {
          id: 'tab-edit',
          tabLabel: `${typeLabel} #${initialInvoice.invoiceNumber}`,
          transactionType: initialInvoice.transactionType || 'Sale',
          isCredit: initialInvoice.paymentType === 'Credit',
          selectedPartyId: initialInvoice.partyId || '',
          customerName: initialInvoice.customerName || '',
          billingName: initialInvoice.billingName || '',
          customerPhone: initialInvoice.customerPhone || '',
          customerAddress: initialInvoice.customerAddress || '',
          invoiceNumber: initialInvoice.invoiceNumber,
          invoiceDate: initialInvoice.date.slice(0, 10),
          items: initialInvoice.items.map(item => ({ ...item, tempId: uuidv4() })),
          description: initialInvoice.description || '',
          discountPercentage: initialInvoice.discountPercentage || 0,
          discountAmount: initialInvoice.discountAmount || 0,
          taxPercentage: initialInvoice.taxPercentage || 0,
          isRoundOff: !!initialInvoice.roundOff,
          roundOffAmount: initialInvoice.roundOff || 0,
          receivedAmount: initialInvoice.receivedAmount || 0,
          imageAttachment: initialInvoice.imageAttachment,
          documentAttachment: initialInvoice.documentAttachment,
          isWarrantyBill: initialInvoice.isWarrantyBill || false,
          warrantyPeriod: initialInvoice.warrantyDetails?.warrantyPeriod || '1 Year',
          warrantyStartDate: initialInvoice.warrantyDetails?.warrantyStartDate || initialInvoice.date.slice(0, 10),
          warrantyEndDate: initialInvoice.warrantyDetails?.warrantyEndDate || oneYearLaterStr,
          warrantyType: initialInvoice.warrantyDetails?.warrantyType || 'Replacement',
          warrantyTerms: initialInvoice.warrantyDetails?.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
          tinNtn: initialInvoice.warrantyDetails?.tinNtn || 'TIN-982738-1',
          claimContact: initialInvoice.warrantyDetails?.claimContact || 'support@mbiinventra.com / 0336-4585863',
        };
        setTabs([initialTab]);
        setActiveTabId(initialTab.id);
        if (initialInvoice.description) setShowDescription(true);
        if (initialInvoice.imageAttachment) setShowImageUpload(true);
        if (initialInvoice.documentAttachment) setShowDocUpload(true);
      } else {
        // Check if there is an unsaved draft from power failure / light interruption
        let restoredDraftTabs: SaleTabState[] | null = null;
        try {
          const draftKey = `mbi_pos_draft_${tenantId || 'demo'}`;
          const rawDraft = localStorage.getItem(draftKey);
          if (rawDraft) {
            const parsed = JSON.parse(rawDraft);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((t: any) => t.items && t.items.some((i: any) => i.name && i.name.trim().length > 0))) {
              restoredDraftTabs = parsed;
            }
          }
        } catch (e) {}

        if (restoredDraftTabs) {
          setTabs(restoredDraftTabs);
          setActiveTabId(restoredDraftTabs[0].id);
          emitToast('⚡ Restored active bill draft after session/power interruption!', 'info');
        } else {
          // Create initial default tab
          const defaultTab: SaleTabState = {
            id: uuidv4(),
            tabLabel: `${typeLabel} #${formattedNum}`,
            transactionType: type as any,
            isCredit: false,
            selectedPartyId: '',
            customerName: '',
            billingName: '',
            customerPhone: '',
            customerAddress: '',
            invoiceNumber: formattedNum,
            invoiceDate: todayStr,
            items: createEmptySaleRows(),
            description: '',
            discountPercentage: 0,
            discountAmount: 0,
            taxPercentage: 0,
            isRoundOff: false,
            roundOffAmount: 0,
            receivedAmount: 0,
            isWarrantyBill: !!settings?.transaction?.warrantyMode,
            warrantyPeriod: '1 Year',
            warrantyStartDate: todayStr,
            warrantyEndDate: oneYearLaterStr,
            warrantyType: 'Replacement',
            warrantyTerms: 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
            tinNtn: 'TIN-982738-1',
            claimContact: 'support@mbiinventra.com / 0336-4585863',
            isWarrantyHeaderEnabled: true,
            isWarrantyFooterEnabled: true,
            isWarrantyPrintingEnabled: true,
          };
          setTabs([defaultTab]);
          setActiveTabId(defaultTab.id);
        }
      }
    } catch (err) {
      console.error('Failed to load initial sale data:', err);
    }
  };

  // Active Tab Getter & Updater
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateCurrentTab = (updates: Partial<SaleTabState>) => {
    if (!currentTab) return;
    setTabs(prev => prev.map(t => (t.id === currentTab.id ? { ...t, ...updates } : t)));
  };

  // Auto-save active draft bill tabs for power interrupt / light off protection
  useEffect(() => {
    if (tabs.length > 0) {
      try {
        const draftKey = `mbi_pos_draft_${tenantId || 'demo'}`;
        const hasValidDraft = tabs.some(t => t.items && t.items.some(i => i.name && i.name.trim().length > 0));
        if (hasValidDraft) {
          localStorage.setItem(draftKey, JSON.stringify(tabs));
        }
      } catch (e) {}
    }
  }, [tabs, tenantId]);

  // Check if active transaction has unsaved content before closing
  const hasUnsavedChanges = useMemo(() => {
    if (!currentTab) return false;
    const hasItems = currentTab.items.some(i => i.name && i.name.trim().length > 0);
    const hasCustomer = Boolean(currentTab.selectedPartyId || (currentTab.customerName && currentTab.customerName.trim().length > 0 && currentTab.customerName !== 'Walk-in / Cash Customer'));
    const hasLightning = Boolean(lightningQuery && lightningQuery.trim().length > 0);
    const hasReceived = Boolean(currentTab.receivedAmount && currentTab.receivedAmount > 0);
    return hasItems || hasCustomer || hasLightning || hasReceived;
  }, [currentTab, lightningQuery]);

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const handleAddSpecificTab = (type: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return') => {
    try {
      const prefixes = (settings?.transaction?.prefixes as any) || {};
      const typePrefix = 
        type === 'Estimate' ? (prefixes.estimate || 'EST-') :
        type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
        type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
        type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
        (prefixes.sale || '');

      const typeLabel = 
        type === 'Estimate' ? 'Estimate' :
        type === 'Sale Order' ? 'Sale Order' :
        type === 'Delivery Challan' ? 'Challan' :
        type === 'Sale Return' ? 'Return' : 'Sale';

      const nextTabNum = (tabs?.length || 0) + 1;
      const currentInvNum = currentTab?.invoiceNumber || '1';
      const digits = currentInvNum.replace(/\D/g, '');
      const rawNum = (digits ? parseInt(digits, 10) : 1) + nextTabNum - 1;
      const formattedNum = typePrefix ? `${typePrefix}${rawNum}` : rawNum.toString();

      const newTab: SaleTabState = {
        id: uuidv4(),
        tabLabel: `${typeLabel} #${formattedNum}`,
        transactionType: type,
        isCredit: false,
        selectedPartyId: '',
        customerName: '',
        billingName: '',
        customerPhone: '',
        customerAddress: '',
        invoiceNumber: formattedNum,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: createEmptySaleRows(),
        description: '',
        discountPercentage: 0,
        discountAmount: 0,
        taxPercentage: 0,
        isRoundOff: false,
        roundOffAmount: 0,
        receivedAmount: 0,
        isWarrantyBill: !!settings?.transaction?.warrantyMode,
        warrantyPeriod: '1 Year',
        warrantyStartDate: new Date().toISOString().slice(0, 10),
        warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        warrantyType: 'Replacement',
        warrantyTerms: 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
        tinNtn: 'TIN-982738-1',
        claimContact: 'support@mbiinventra.com / 0336-4585863',
        isWarrantyHeaderEnabled: true,
        isWarrantyFooterEnabled: true,
        isWarrantyPrintingEnabled: true,
      };
      setTabs(prev => [...(prev || []), newTab]);
      setActiveTabId(newTab.id);
    } catch (err) {
      console.error('Error adding specific tab:', err);
    }
  };

  // Add a new tab (defaults to current type)
  const handleAddNewTab = () => {
    handleAddSpecificTab(currentTab?.transactionType || 'Sale');
  };

  // Open Save Confirmation Dialog with validation
  const handleInitiateSave = (mode: 'save' | 'save_and_new' | 'save_and_print' = 'save') => {
    const validItems = currentTab?.items.filter(it => it.name && it.name.trim().length > 0 && Number(it.quantity) >= 0) || [];
    if (validItems.length === 0) {
      setErrorMessage('Please add at least one medicine item before saving.');
      emitToast('Please add at least one medicine item to the invoice.', 'error');
      lightningInputRef.current?.focus();
      return;
    }

    const txType = currentTab?.transactionType || 'Sale';
    if (txType === 'Sale') {
      const belowPurItems: { name: string; sellPrice: number; latestPur: number }[] = [];
      for (const item of validItems) {
        const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        const latestPur = item.latestPurchasePrice || item.costPrice || getAuthoritativeLatestPurchasePrice(med, allPurchases, item.name);
        const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
        const discPercent = Number(item.discountPercentage) || 0;
        const effectivePrice = sellPrice * (1 - discPercent / 100);
        if (latestPur > 0 && (sellPrice < latestPur || effectivePrice < latestPur)) {
          belowPurItems.push({
            name: item.name,
            sellPrice,
            latestPur
          });
        }
      }

      if (belowPurItems.length > 0) {
        const first = belowPurItems[0];
        const errorMsg = `❌ Sale Prohibited: "${first.name}" rate (Rs. ${first.sellPrice}) is lower than Latest Purchase Price (Rs. ${first.latestPur}). Latest Purchase se 1 Rs bhi kam me sale nahi ho sakti!`;
        setErrorMessage(errorMsg);
        emitToast(errorMsg, 'error');
        return;
      }
    }

    setPendingSaveMode(mode);
    setShowSaveConfirmModal(true);
  };

  // Global Keyboard Shortcuts for Fast POS Operation
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if save confirm modal or other top modal is open
      if (showSaveConfirmModal || showCloseConfirm) return;

      // F12 or ? (when not inside typing input) to toggle Shortcuts Cheat Sheet
      if (e.key === 'F12' || (e.key === '?' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // F1: Focus Customer Search
      if (e.key === 'F1') {
        e.preventDefault();
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
        return;
      }

      // F2: Focus Rapid Medicine Search Bar
      if (e.key === 'F2') {
        e.preventDefault();
        lightningInputRef.current?.focus();
        lightningInputRef.current?.select();
        return;
      }

      // F7 or Alt+S: Open Invoice Settings
      if (e.key === 'F7' || (e.altKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
        return;
      }

      // Alt+C: Open POS Calculator
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsCalculatorOpen(prev => !prev);
        return;
      }

      // Ctrl+S or F9: Quick Save
      if (((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey) || e.key === 'F9') {
        e.preventDefault();
        handleInitiateSave('save');
        return;
      }

      // Ctrl+P or F8: Save & Print
      if (((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) || e.key === 'F8') {
        e.preventDefault();
        handleInitiateSave('save_and_print');
        return;
      }

      // Alt+N or F10: Save & New
      if ((e.altKey && (e.key === 'n' || e.key === 'N')) || e.key === 'F10') {
        e.preventDefault();
        handleInitiateSave('save_and_new');
        return;
      }

      // Ctrl+T: New Bill Tab
      if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleAddNewTab();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, isMinimized, showSaveConfirmModal, showCloseConfirm, currentTab]);

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[0].id);
    }
  };

  // Customer selection logic
  const handleSelectParty = (party: Party) => {
    updateCurrentTab({
      selectedPartyId: party.id,
      customerName: party.name,
      billingName: party.contactPerson || party.name,
      customerPhone: party.phone || '',
      customerAddress: party.address || ''
    });
    setCustomerSearchQuery(party.name);
    setIsCustomerDropdownOpen(false);
    setTimeout(() => {
      lightningInputRef.current?.focus();
    }, 60);
  };

  const handlePartyCreated = async (newParty: Party) => {
    await dbSuppliers.save(newParty as any);
    const updatedParties = await dbSuppliers.getAll();
    setParties(updatedParties);
    handleSelectParty(newParty);
    setIsAddPartyOpen(false);
  };

  // Quick Lightning Item Search Logic
  const handleLightningSearch = (query: string) => {
    setLightningQuery(query);
    setLightningSelectedIndex(0);
    if (!query.trim()) {
      setLightningResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = medicines.filter(
      m => m.name.toLowerCase().includes(q) || 
           m.barcode.toLowerCase().includes(q) || 
           m.batchNumber.toLowerCase().includes(q)
    );
    setLightningResults(results.slice(0, 6));
  };

  const handleApplyTemplate = (type: 'med_pack' | 'first_aid' | 'syrups') => {
    if (!currentTab) return;
    let sampleItems: any[] = [];
    if (type === 'med_pack') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Panadol 500mg Tablet', batchNumber: 'PN-401', expiryDate: '10/2027', quantity: 50, unit: 'Strip', pricePerUnit: 25, sellingPrice: 30, mrp: 35, total: 1500 },
        { tempId: uuidv4(), name: 'Augmentin 625mg', batchNumber: 'AG-882', expiryDate: '05/2028', quantity: 10, unit: 'Box', pricePerUnit: 650, sellingPrice: 720, mrp: 800, total: 7200 },
        { tempId: uuidv4(), name: 'Brufen 400mg', batchNumber: 'BR-110', expiryDate: '12/2026', quantity: 20, unit: 'Strip', pricePerUnit: 40, sellingPrice: 48, mrp: 55, total: 960 },
      ];
    } else if (type === 'first_aid') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Blue Tex Cotton Pad 100g', batchNumber: 'BT-902', expiryDate: '12/2028', quantity: 15, unit: 'Pack', pricePerUnit: 150, sellingPrice: 180, mrp: 200, total: 2700 },
        { tempId: uuidv4(), name: 'Sterile Gauze Bandage', batchNumber: 'GZ-331', expiryDate: '01/2029', quantity: 25, unit: 'Piece', pricePerUnit: 45, sellingPrice: 55, mrp: 60, total: 1375 },
        { tempId: uuidv4(), name: 'Surgical Adhesive Tape', batchNumber: 'TP-105', expiryDate: '06/2028', quantity: 10, unit: 'Piece', pricePerUnit: 90, sellingPrice: 110, mrp: 125, total: 1100 },
      ];
    } else if (type === 'syrups') {
      sampleItems = [
        { tempId: uuidv4(), name: 'Panadol Syrup 120ml', batchNumber: 'PS-602', expiryDate: '08/2027', quantity: 12, unit: 'Bottle', pricePerUnit: 120, sellingPrice: 145, mrp: 160, total: 1740 },
        { tempId: uuidv4(), name: 'Calpol Pediatric Drops', batchNumber: 'CP-211', expiryDate: '04/2027', quantity: 8, unit: 'Bottle', pricePerUnit: 95, sellingPrice: 115, mrp: 130, total: 920 },
      ];
    }

    updateCurrentTab({
      items: [...currentTab.items, ...sampleItems]
    });
  };

  const commitLightningItem = (medOrName: Medicine | string, qty: number, unitPrice: number) => {
    if (!currentTab) return;
    const isMedObj = typeof medOrName !== 'string';
    const med = isMedObj ? (medOrName as Medicine) : null;
    const itemName = med ? med.name : (medOrName as string).trim();
    if (!itemName) return;

    const unit = lightningUnit || med?.unit || 'Box';
    const effectiveQty = qty > 0 ? qty : 1;
    const medLatestPur = getAuthoritativeLatestPurchasePrice(med, allPurchases, itemName);
    const effectivePrice = unitPrice !== undefined && unitPrice !== null && unitPrice > 0 ? unitPrice : Math.max(med?.sellingPrice || med?.mrp || 0, medLatestPur);
    const disc = lightningDiscount || 0;
    const rateAfterDiscount = effectivePrice * (1 - disc / 100);

    // Hard block: Never allow sale price below latest purchase price
    if (medLatestPur > 0 && (effectivePrice < medLatestPur || rateAfterDiscount < medLatestPur)) {
      const msg = `❌ Error: Sale rate for "${itemName}" (Rs. ${effectivePrice}) is lower than Latest Purchase Price (Rs. ${medLatestPur}). Rate must be at least Rs. ${medLatestPur}!`;
      setErrorMessage(msg);
      emitToast(`❌ Latest Purchase rate (Rs. ${medLatestPur}) se 1 Rs bhi kam me sale nahi ho sakti!`, 'error');
      lightningPriceInputRef.current?.focus();
      lightningPriceInputRef.current?.select();
      return;
    }

    const tax = lightningTax || (med?.gstPercentage || 0);
    const base = effectiveQty * effectivePrice;
    const discAmt = (base * disc) / 100;
    const taxable = base - discAmt;
    const total = taxable + (taxable * tax) / 100;

    const newItem: InvoiceItem & { tempId: string } = {
      tempId: uuidv4(),
      medicineId: med?.id,
      name: itemName,
      hsnCode: lightningHsn || med?.hsnCode || '',
      batchNumber: lightningBatch || med?.batchNumber || '',
      expiryDate: lightningExpDate || med?.expiryDate || '',
      mfgDate: lightningMfgDate || med?.manufacturingDate || '',
      quantity: effectiveQty,
      freeQuantity: lightningFreeQty || 0,
      unit: unit,
      pricePerUnit: effectivePrice,
      sellingPrice: effectivePrice,
      mrp: lightningMrp || med?.mrp || effectivePrice,
      discountPercentage: disc,
      gstPercentage: tax,
      total: total,
      costPrice: medLatestPur,
      latestPurchasePrice: medLatestPur
    };

    // Replace the first empty row or append at the bottom
    const firstEmptyIdx = currentTab.items.findIndex(it => !it.name || !it.name.trim());
    let updatedItems: (InvoiceItem & { tempId: string })[];
    if (firstEmptyIdx !== -1) {
      updatedItems = [...currentTab.items];
      updatedItems[firstEmptyIdx] = newItem;
    } else {
      updatedItems = [...currentTab.items, newItem];
    }

    updateCurrentTab({
      items: updatedItems,
      ...(currentTab.isWarrantyBill ? { isWarrantyPrintingEnabled: false } : {})
    });

    // Reset ALL lightning fields to empty and re-focus input for next item
    setLightningQuery('');
    setLightningSelectedMed(null);
    setLightningPrice(0);
    setLightningQty(1);
    setLightningUnit('Box');
    setLightningBatch('');
    setLightningExpDate('');
    setLightningMfgDate('');
    setLightningHsn('');
    setLightningMrp(0);
    setLightningFreeQty(0);
    setLightningDiscount(0);
    setLightningTax(0);
    setLightningResults([]);
    setTimeout(() => {
      lightningInputRef.current?.focus();
    }, 50);
  };

  const handleSelectLightningMed = (med: Medicine, autoAdd = false) => {
    // DRAP Quarantine & Recall Block Protection
    if (med.stockStatus === 'Quarantined' || med.stockStatus === 'Recalled') {
      emitToast(`⚠️ Blocked: ${med.name} (Batch: ${med.batchNumber}) is ${med.stockStatus.toUpperCase()} and cannot be sold.`, 'error');
      return;
    }

    // Stock Rotation Engine (FIFO / FEFO based on configuration)
    const rotationMethod = settings.item?.stockRotationMethod || 'FIFO';
    const allowExpired = !(settings.item?.enforceExpiredBlock ?? true);
    const sortedBatches = getStockRotationSortedBatches(med, medicines, rotationMethod, allowExpired);
    const bestBatch = sortedBatches.find(b => b.isPrimary) || sortedBatches[0];

    const authoritativeLatestPur = getAuthoritativeLatestPurchasePrice(med, allPurchases, med.name);
    const price = Math.max(med.sellingPrice || med.mrp || 0, authoritativeLatestPur);

    setLightningSelectedMed(med);
    setLightningQuery(med.name);
    setLightningPrice(price);
    setLightningUnit(med.unit || 'Box');
    setLightningBatch(bestBatch?.batchNumber || med.batchNumber || '');
    setLightningExpDate(bestBatch?.expiryDate || med.expiryDate || '');
    setLightningMrp(bestBatch?.mrp || med.mrp || price);
    setLightningResults([]);

    if (sortedBatches.length > 1 && bestBatch) {
      if (rotationMethod === 'FIFO') {
        const purDateStr = bestBatch.purchaseDate ? bestBatch.purchaseDate.slice(0, 10) : 'Initial Stock';
        emitToast(`FIFO: Auto-selected earliest purchase batch ${bestBatch.batchNumber} (Pur: ${purDateStr}, Avail: ${bestBatch.quantity})`, 'info');
      } else {
        const expDateStr = bestBatch.expiryDate ? bestBatch.expiryDate.slice(0, 7) : 'N/A';
        emitToast(`FEFO: Auto-selected earliest expiry batch ${bestBatch.batchNumber} (Exp: ${expDateStr}, Avail: ${bestBatch.quantity})`, 'info');
      }
    }

    if (autoAdd) {
      commitLightningItem(med, lightningQty > 0 ? lightningQty : 1, price);
    } else {
      setTimeout(() => {
        lightningQtyInputRef.current?.focus();
        lightningQtyInputRef.current?.select();
      }, 50);
    }
  };

  const handleConfirmLightningItem = () => {
    if (!currentTab) return;
    const med = lightningSelectedMed || medicines.find(m => m.name.toLowerCase().trim() === lightningQuery.toLowerCase().trim());
    const authoritativeLatestPur = getAuthoritativeLatestPurchasePrice(med, allPurchases, lightningQuery);
    const unitPrice = lightningPrice || (med?.sellingPrice || med?.mrp || authoritativeLatestPur || 0);

    if (authoritativeLatestPur > 0 && unitPrice < authoritativeLatestPur) {
      const msg = `❌ Error: Rate (Rs. ${unitPrice}) is lower than Latest Purchase Price (Rs. ${authoritativeLatestPur}). Minimum sale price is Rs. ${authoritativeLatestPur}!`;
      setErrorMessage(msg);
      emitToast(`❌ Latest Purchase rate (Rs. ${authoritativeLatestPur}) se kam me sale nahi ho sakti!`, 'error');
      lightningPriceInputRef.current?.focus();
      lightningPriceInputRef.current?.select();
      return;
    }

    const qty = lightningQty >= 0 ? lightningQty : 0;
    const target = lightningSelectedMed || lightningQuery;
    commitLightningItem(target, qty, unitPrice);
  };

  // Robust Hardware & Modal Barcode Scanner Processor
  const handleBarcodeScanned = (scannedCode: string, format?: string) => {
    setIsBarcodeScannerOpen(false);
    const clean = scannedCode.trim().toLowerCase();
    if (!clean || !currentTab) return;

    // Find matching medicine in database
    const matched = medicines.find(m => 
      (m.barcode && m.barcode.trim().toLowerCase() === clean) ||
      m.id.toLowerCase() === clean ||
      ((m as any).code && (m as any).code.toLowerCase() === clean) ||
      (m.batchNumber && m.batchNumber.trim().toLowerCase() === clean) ||
      (m.batches && Array.isArray(m.batches) && m.batches.some(b => b.batchNumber && b.batchNumber.trim().toLowerCase() === clean))
    );

    if (matched) {
      // Check if medicine is already in the current sales bill
      const existingIdx = currentTab.items.findIndex(it => 
        (it.medicineId && it.medicineId === matched.id) ||
        (it.name && it.name.trim().toLowerCase() === matched.name.trim().toLowerCase())
      );

      if (existingIdx !== -1) {
        // Increment quantity of the existing line item by 1
        const existing = currentTab.items[existingIdx];
        const newQty = (Number(existing.quantity) || 0) + 1;
        const unitPrice = Number(existing.pricePerUnit !== undefined ? existing.pricePerUnit : existing.sellingPrice) || 0;
        const disc = Number(existing.discountPercentage) || 0;
        const tax = Number(existing.gstPercentage) || 0;
        const base = newQty * unitPrice;
        const discAmt = (base * disc) / 100;
        const taxable = base - discAmt;
        const total = taxable + (taxable * tax) / 100;

        const updated = [...currentTab.items];
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          total
        };

        updateCurrentTab({ items: updated });
        playScannerBeep('duplicate');
        setSuccessMessage(`✅ Barcode Scanned: ${matched.name} | Qty: ${newQty}`);
        emitToast(`✅ Barcode Scanned: ${matched.name} (Qty: ${newQty})`, 'success');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Add as new row with quantity 1
        playScannerBeep('success');
        handleSelectLightningMed(matched, true);
        setSuccessMessage(`✅ Scanned & Added: ${matched.name} (Barcode: ${scannedCode})`);
        emitToast(`✅ Scanned & Added: ${matched.name}`, 'success');
        setTimeout(() => setSuccessMessage(null), 3500);
      }

      // Reset lightning rapid search bar and ensure ready for next scan
      setLightningQuery('');
      setLightningResults([]);
      setTimeout(() => {
        lightningInputRef.current?.focus();
      }, 50);
    } else {
      playScannerBeep('error');
      setLightningQuery(scannedCode);
      handleLightningSearch(scannedCode);
      const errMsg = `⚠️ Barcode "${scannedCode}" scanned - Not found in inventory catalog.`;
      setErrorMessage(errMsg);
      emitToast(errMsg, 'error');
      setTimeout(() => setErrorMessage(null), 4500);
      setTimeout(() => {
        lightningInputRef.current?.focus();
        lightningInputRef.current?.select();
      }, 50);
    }
  };

  // Universal Hardware Barcode Scanner Listener for AddSaleModal (Works from any focus point)
  useHardwareBarcodeScanner({
    enabled: isOpen && !isMinimized && !showSaveConfirmModal && !showCloseConfirm && !isBarcodeScannerOpen,
    onScan: (barcode) => {
      handleBarcodeScanned(barcode, 'Attached USB/Wireless Barcode Gun');
    }
  });

  // Add empty custom row
  const handleAddBlankRow = () => {
    if (!currentTab) return;
    const blankItem: InvoiceItem & { tempId: string } = {
      tempId: uuidv4(),
      name: '',
      batchNumber: '',
      quantity: 1,
      unit: 'Box',
      pricePerUnit: 0,
      sellingPrice: 0,
      mrp: 0,
      total: 0
    };
    updateCurrentTab({
      items: [...currentTab.items, blankItem]
    });
  };

  // Update item row inline
  const handleUpdateItemRow = (tempId: string, updates: Partial<InvoiceItem>) => {
    if (!currentTab) return;
    const updatedItems = currentTab.items.map(it => {
      if (it.tempId === tempId) {
        const item = { ...it, ...updates };
        const price = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
        
        let qty = updates.quantity !== undefined ? Number(updates.quantity) : Number(item.quantity);
        if (isNaN(qty) || qty < 0) {
          qty = 0;
        }
        item.quantity = qty;

        const med = medicines.find(m => m.id === item.medicineId || (item.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim()));
        const latestPur = item.latestPurchasePrice || (med ? getAuthoritativeLatestPurchasePrice(med, allPurchases, item.name) : 0);
        if (latestPur > 0) {
          item.latestPurchasePrice = latestPur;
          item.costPrice = latestPur;
        }

        const discPercent = Number(item.discountPercentage) || 0;
        const taxPercent = Number(item.taxPercentage || item.gstPercentage) || 0;

        const base = price * qty;
        const discAmt = (base * discPercent) / 100;
        const taxable = base - discAmt;
        const taxAmt = (taxable * taxPercent) / 100;

        item.sellingPrice = price;
        item.pricePerUnit = price;
        item.discountAmount = discAmt;
        item.taxableAmount = taxable;
        item.total = Math.round(taxable + taxAmt);
        return item;
      }
      return it;
    });
    updateCurrentTab({ items: updatedItems });
  };

  const handleDeleteItemRow = (tempId: string) => {
    if (!currentTab) return;
    updateCurrentTab({
      items: currentTab.items.filter(it => it.tempId !== tempId)
    });
  };

  const handleSelectMedIntoRow = (tempId: string, med: Medicine) => {
    const rotationMethod = settings.item?.stockRotationMethod || 'FIFO';
    const allowExpired = !(settings.item?.enforceExpiredBlock ?? true);
    const sortedBatches = getStockRotationSortedBatches(med, medicines, rotationMethod, allowExpired);
    const bestBatch = sortedBatches.find(b => b.isPrimary) || sortedBatches[0];
    
    const latestPur = getAuthoritativeLatestPurchasePrice(med, allPurchases, med.name);
    const sellingPrice = Math.max(bestBatch?.mrp || med.sellingPrice || med.mrp || 0, latestPur);
    
    const currentItem = currentTab?.items.find(i => i.tempId === tempId);
    const qty = currentItem && currentItem.quantity !== undefined && currentItem.quantity >= 0 ? currentItem.quantity : 1;
    
    handleUpdateItemRow(tempId, {
      medicineId: med.id,
      name: med.name,
      genericName: med.genericName || '',
      batchNumber: bestBatch?.batchNumber || med.batchNumber || '',
      expiryDate: bestBatch?.expiryDate || med.expiryDate || '',
      quantity: qty,
      pricePerUnit: sellingPrice,
      sellingPrice: sellingPrice,
      mrp: bestBatch?.mrp || med.mrp || sellingPrice,
      costPrice: latestPur,
      latestPurchasePrice: latestPur,
      availableStock: med.quantity || 0,
      unit: med.unit || 'Box',
    });
    setActiveMedDropdownTempId(null);
  };

  // Financial Calculations
  const rawSubtotal = currentTab ? currentTab.items.reduce((sum, item) => sum + (item.total || 0), 0) : 0;
  const totalQty = currentTab ? currentTab.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;

  // Handle bidirectional discount updates
  const handleDiscountPercentChange = (percent: number) => {
    const discAmount = Math.round((rawSubtotal * percent) / 100);
    updateCurrentTab({
      discountPercentage: percent,
      discountAmount: discAmount
    });
  };

  const handleDiscountAmountChange = (amount: number) => {
    const percent = rawSubtotal > 0 ? parseFloat(((amount / rawSubtotal) * 100).toFixed(2)) : 0;
    updateCurrentTab({
      discountAmount: amount,
      discountPercentage: percent
    });
  };

  // Tax calculation
  const calculatedTaxAmount = currentTab?.taxPercentage 
    ? Math.round(((rawSubtotal - (currentTab.discountAmount || 0)) * currentTab.taxPercentage) / 100)
    : 0;

  // Raw Grand Total before Round Off
  const preliminaryTotal = rawSubtotal - (currentTab?.discountAmount || 0) + calculatedTaxAmount;
  
  // Round off calculation based on settings
  let effectiveRoundOff = currentTab?.roundOffAmount || 0;
  let finalGrandTotal = preliminaryTotal;
  if (currentTab?.isRoundOff) {
    const roundType = settings.transaction.roundOffType || 'Nearest';
    let rounded = preliminaryTotal;
    if (roundType === 'Nearest') rounded = Math.round(preliminaryTotal);
    else if (roundType === 'Up') rounded = Math.ceil(preliminaryTotal);
    else if (roundType === 'Down') rounded = Math.floor(preliminaryTotal);
    else rounded = preliminaryTotal;
    
    effectiveRoundOff = rounded - preliminaryTotal;
    finalGrandTotal = rounded;
  } else {
    finalGrandTotal = preliminaryTotal + (currentTab?.roundOffAmount || 0);
  }

  // Handle Received Amount vs Credit Mode
  const effectiveReceivedAmount = currentTab?.isCredit 
    ? (currentTab.receivedAmount || 0)
    : (currentTab?.receivedAmount !== undefined && currentTab.receivedAmount !== 0 ? currentTab.receivedAmount : finalGrandTotal);

  const effectiveBalanceDue = Math.max(0, finalGrandTotal - effectiveReceivedAmount);

  // Sync draft summary for docking with stable dependencies
  const onSummaryChangeRef = useRef(onSummaryChange);
  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  const validItemsCount = (currentTab?.items || []).filter(r => r.name && r.name.trim() !== '').length;
  const customerNameSummary = currentTab?.customerName || '';
  const tabLabelSummary = currentTab?.tabLabel || '';
  const invoiceNumberSummary = currentTab?.invoiceNumber || '';

  useEffect(() => {
    if (onSummaryChangeRef.current && currentTab) {
      onSummaryChangeRef.current({
        partyName: customerNameSummary || 'Cash Customer',
        amount: finalGrandTotal || 0,
        itemCount: validItemsCount,
        title: tabLabelSummary || `Sale #${invoiceNumberSummary}`
      });
    }
  }, [customerNameSummary, finalGrandTotal, validItemsCount, tabLabelSummary, invoiceNumberSummary]);

  // File Upload Handlers
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentTab({ imageAttachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentTab({ documentAttachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Keyboard Shortcuts: Ctrl+P for instant browser print dialog, Ctrl+S for saving
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If save confirmation modal is open, let it handle its own keys
      if (showSaveConfirmModal) {
        return;
      }

      // If discard confirmation dialog is open, allow Esc to cancel and Enter to confirm discard
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

      // If child submodal is open, let Esc close it
      if (isCalculatorOpen || isAddPartyOpen || isSettingsOpen || isPrintModalOpen || isBarcodeScannerOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (isBarcodeScannerOpen) setIsBarcodeScannerOpen(false);
          else if (isCalculatorOpen) setIsCalculatorOpen(false);
          else if (isAddPartyOpen) setIsAddPartyOpen(false);
          else if (isSettingsOpen) setIsSettingsOpen(false);
          else if (isPrintModalOpen) setIsPrintModalOpen(false);
          return;
        }
        return;
      }

      // Esc key closes dropdowns or requests close with confirmation guard
      if (e.key === 'Escape') {
        if (isCustomerDropdownOpen) {
          e.preventDefault();
          setIsCustomerDropdownOpen(false);
          return;
        }
        if (lightningResults.length > 0) {
          e.preventDefault();
          setLightningResults([]);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleRequestClose();
        return;
      }

      // F1: Quick focus Customer field
      if (e.key === 'F1') {
        e.preventDefault();
        customerInputRef.current?.focus();
        customerInputRef.current?.select();
        return;
      }

      // F2: Quick focus Rapid Medicine field
      if (e.key === 'F2') {
        e.preventDefault();
        lightningInputRef.current?.focus();
        lightningInputRef.current?.select();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save_and_print');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save');
        return;
      }

      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        handleInitiateSave('save_and_new');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, isCalculatorOpen, isAddPartyOpen, isSettingsOpen, isPrintModalOpen, isBarcodeScannerOpen, isCustomerDropdownOpen, lightningResults, showCloseConfirm, showSaveConfirmModal, hasUnsavedChanges, currentTab, rawSubtotal, calculatedTaxAmount, effectiveRoundOff, finalGrandTotal, effectiveReceivedAmount, effectiveBalanceDue]);

  // Construct active invoice object for printing or saving
  const buildActiveInvoice = (forPrint: boolean = false): Invoice => {
    if (!currentTab) throw new Error("No active sale tab");
    const customerName = (currentTab.customerName || '').trim() || (currentTab.isCredit ? '' : 'Walk-in / Cash Customer');
    const validItems = currentTab.items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);
    const txType = currentTab.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale';

    const now = new Date();
    let invoiceDateObj = new Date(currentTab.invoiceDate);
    if (currentTab.invoiceDate === now.toISOString().slice(0, 10)) {
      invoiceDateObj = now;
    } else {
      invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const currentFirm = settings.general?.firms?.find(f => f.isDefault) || settings.general?.firms?.[0];
    const effectiveFirmId = currentFirm?.id || 'firm-1';
    const effectiveFirmName = currentFirm?.name || business?.name || 'MBI INVENTRA';
    const effectiveTenantId = tenantId || tenant?.id || business?.tenantId || 'tenant-default';
    const effectiveUserId = activeUser?.id || currentUser?.uid || '1';
    const effectiveUserName = activeUser?.name || currentUser?.displayName || 'Admin';

    return {
      id: initialInvoice ? initialInvoice.id : (forPrint ? `preview-${Date.now()}` : uuidv4()),
      invoiceNumber: currentTab.invoiceNumber || `${Date.now()}`,
      date: invoiceDateObj.toISOString(),
      partyId: currentTab.selectedPartyId || undefined,
      customerName: customerName,
      billingName: currentTab.billingName || customerName,
      customerPhone: currentTab.customerPhone || undefined,
      customerAddress: currentTab.customerAddress || undefined,
      transactionType: txType,
      status: txType === 'Sale Return' ? 'Completed' : txType === 'Delivery Challan' ? 'Dispatched' : 'Pending',
      paymentType: currentTab.isCredit ? 'Credit' : 'Cash',
      items: validItems.length > 0 
        ? validItems.map(({ tempId, ...rest }) => rest)
        : currentTab.items.filter(i => i.name && i.name.trim().length > 0).map(({ tempId, ...rest }) => rest),
      subTotal: rawSubtotal,
      discountPercentage: currentTab.discountPercentage,
      discountAmount: currentTab.discountAmount,
      taxPercentage: currentTab.taxPercentage,
      taxAmount: calculatedTaxAmount,
      roundOff: effectiveRoundOff,
      grandTotal: finalGrandTotal,
      receivedAmount: effectiveReceivedAmount,
      balanceDue: effectiveBalanceDue,
      description: currentTab.description || undefined,
      imageAttachment: currentTab.imageAttachment,
      documentAttachment: currentTab.documentAttachment,
      isWarrantyBill: currentTab.isWarrantyBill,
      warrantyDetails: currentTab.isWarrantyBill ? {
        warrantyPeriod: currentTab.warrantyPeriod || '1 Year',
        warrantyStartDate: currentTab.warrantyStartDate || currentTab.invoiceDate,
        warrantyEndDate: currentTab.warrantyEndDate || '',
        warrantyType: currentTab.warrantyType || 'Replacement',
        warrantyTerms: currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
        tinNtn: currentTab.tinNtn || 'TIN-982738-1',
        claimContact: currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863',
        shopStamp: true
      } : undefined,
      firmName: effectiveFirmName,
      firmId: effectiveFirmId,
      tenantId: effectiveTenantId,
      userId: effectiveUserId,
      userName: effectiveUserName,
      cashierId: effectiveUserId,
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Instantly trigger browser print dialog for current active invoice
  const handleTriggerPrint = () => {
    if (!currentTab) return;
    const validItems = currentTab.items.filter(i => i.name && i.name.trim().length > 0 && Number(i.quantity) >= 0);
    if (validItems.length === 0) {
      emitToast('Please add at least one item before printing the invoice (Ctrl+P)', 'warning');
      return;
    }
    const inv = buildActiveInvoice(true);
    setPrintInvoiceData(inv);
    setAutoTriggerPrint(true);
    setIsPrintModalOpen(true);
    emitToast('Opening browser print dialog (Ctrl+P)...', 'info');
  };

  // Save Sale Invoice Logic
  const handleSaveInvoice = async (mode: 'save' | 'save_and_new' | 'save_and_print' = 'save') => {
    if (!currentTab || isSaving) return;
    setErrorMessage(null);
    setIsSaving(true);

    try {
      // 1. Auto-commit rapid entry if user typed in top lightning bar without clicking +
      let effectiveItems = [...currentTab.items];
      if (lightningSelectedMed || (lightningQuery && lightningQuery.trim().length > 0)) {
        const pendingName = lightningSelectedMed ? lightningSelectedMed.name : lightningQuery.trim();
        const pendingQty = lightningQty > 0 ? lightningQty : 1;
        const pendingPrice = lightningPrice > 0 ? lightningPrice : (lightningSelectedMed?.sellingPrice || lightningSelectedMed?.mrp || 0);
        const pendingBase = pendingQty * pendingPrice;
        const pendingTaxable = pendingBase - (pendingBase * (lightningDiscount || 0)) / 100;
        const pendingTotal = pendingTaxable + (pendingTaxable * (lightningTax || 0)) / 100;

        const uncommittedItem: InvoiceItem & { tempId: string } = {
          tempId: uuidv4(),
          medicineId: lightningSelectedMed?.id,
          name: pendingName,
          hsnCode: lightningHsn || lightningSelectedMed?.hsnCode || '',
          batchNumber: lightningBatch || lightningSelectedMed?.batchNumber || '',
          expiryDate: lightningExpDate || lightningSelectedMed?.expiryDate || '',
          mfgDate: lightningMfgDate || lightningSelectedMed?.manufacturingDate || '',
          quantity: pendingQty,
          freeQuantity: lightningFreeQty || 0,
          unit: lightningUnit || lightningSelectedMed?.unit || 'Box',
          pricePerUnit: pendingPrice,
          sellingPrice: pendingPrice,
          mrp: lightningMrp || lightningSelectedMed?.mrp || pendingPrice,
          discountPercentage: lightningDiscount || 0,
          gstPercentage: lightningTax || 0,
          total: Math.round(pendingTotal)
        };

        const emptyIdx = effectiveItems.findIndex(it => !it.name || !it.name.trim());
        if (emptyIdx !== -1) {
          effectiveItems[emptyIdx] = uncommittedItem;
        } else {
          effectiveItems.push(uncommittedItem);
        }
      }

      // 2. Validate and normalize cart items (default quantity to 1 if missing or 0)
      const validItems = effectiveItems
        .filter(i => i.name && i.name.trim().length > 0)
        .map(i => {
          const qty = Number(i.quantity) >= 0 ? Number(i.quantity) : 0;
          const price = Number(i.pricePerUnit !== undefined ? i.pricePerUnit : (i.sellingPrice || i.mrp || 0));
          const disc = Number(i.discountPercentage) || 0;
          const tax = Number(i.taxPercentage || i.gstPercentage) || 0;
          const base = price * qty;
          const taxable = base - (base * disc) / 100;
          const total = Math.round(taxable + (taxable * tax) / 100);
          return {
            ...i,
            quantity: qty,
            pricePerUnit: price,
            sellingPrice: price,
            total: Number(i.total) > 0 ? Number(i.total) : total
          };
        });

      if (validItems.length === 0) {
        const errorMsg = 'Please add at least one product with a name to the cart before saving.';
        setErrorMessage(errorMsg);
        emitToast(errorMsg, 'warning');
        setIsSaving(false);
        return;
      }

      // 3. Customer validation
      const customerName = (currentTab.customerName || '').trim() || (currentTab.isCredit ? '' : 'Walk-in / Cash Customer');
      if (currentTab.isCredit && !customerName) {
        const errorMsg = 'Please enter or select a customer name for Credit transactions.';
        setErrorMessage(errorMsg);
        emitToast(errorMsg, 'warning');
        setIsSaving(false);
        return;
      }

      // 4. Warranty bill validation
      if (currentTab.isWarrantyBill) {
        if (!currentTab.warrantyEndDate || !currentTab.warrantyEndDate.trim()) {
          const errorMsg = 'Warranty End Date is required when Warranty Mode is active.';
          setErrorMessage(errorMsg);
          emitToast(errorMsg, 'warning');
          setIsSaving(false);
          return;
        }
      }

      const txType = currentTab.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale';

      // 5. Strict Latest Purchase Price validation: Sale MUST NEVER be below Latest Purchase Price
      if (txType === 'Sale') {
        const belowPurchaseItems: { name: string; sellPrice: number; latestPur: number }[] = [];
        for (const item of validItems) {
          const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
          const latestPur = item.latestPurchasePrice || item.costPrice || getAuthoritativeLatestPurchasePrice(med, allPurchases, item.name);
          const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
          const discPercent = Number(item.discountPercentage) || 0;
          const effectivePrice = sellPrice * (1 - discPercent / 100);

          if (latestPur > 0 && (sellPrice < latestPur || effectivePrice < latestPur)) {
            belowPurchaseItems.push({
              name: item.name,
              sellPrice,
              latestPur
            });
          }
        }

        if (belowPurchaseItems.length > 0) {
          const first = belowPurchaseItems[0];
          const errorMsg = `❌ Sale Prohibited: "${first.name}" rate (Rs. ${first.sellPrice}) is lower than Latest Purchase Price (Rs. ${first.latestPur}). Latest Purchase se 1 Rs bhi kam me sale nahi ho sakti!`;
          setErrorMessage(errorMsg);
          emitToast(errorMsg, 'error');
          setIsSaving(false);
          return;
        }

        if (!lossAuthorized) {
          const belowCostDetails: LossItemDetail[] = [];
          for (const item of validItems) {
            const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
            const avgCost = med ? (med.purchasePrice || 0) : 0;
            const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
            if (sellPrice > 0 && avgCost > 0 && sellPrice < avgCost) {
              const lossPerUnit = avgCost - sellPrice;
              belowCostDetails.push({
                id: item.tempId || item.id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: sellPrice,
                cost: avgCost,
                lossPerUnit,
                totalLoss: lossPerUnit * item.quantity
              });
            }
          }

          if (belowCostDetails.length > 0) {
            setLossPromptItems(belowCostDetails);
            setPendingLossMode(mode);
            setShowLossPromptModal(true);
            setIsSaving(false);
            return;
          }
        }

        // Check Customer Credit Limit for Credit sales
        if (currentTab.isCredit && currentTab.selectedPartyId && effectiveBalanceDue > 0) {
          const party = parties.find(p => p.id === currentTab.selectedPartyId);
          if (party && party.creditLimit && party.creditLimit > 0) {
            const currentBal = party.balance || 0;
            const projectedBal = currentBal + effectiveBalanceDue;
            if (projectedBal > party.creditLimit && settings.safetyRules?.blockExceededCreditLimit) {
              const overAmount = projectedBal - party.creditLimit;
              const errorMsg = `Sale blocked: Customer credit limit of Rs. ${party.creditLimit.toLocaleString()} exceeded by Rs. ${overAmount.toLocaleString()}.`;
              setErrorMessage(errorMsg);
              emitToast(errorMsg, 'error');
              setIsSaving(false);
              return;
            }
          }
        }
      }

      const now = new Date();
      let invoiceDateObj = new Date(currentTab.invoiceDate);
      if (currentTab.invoiceDate === now.toISOString().slice(0, 10)) {
        invoiceDateObj = now;
      } else {
        invoiceDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      }

      const currentFirm = settings.general?.firms?.find(f => f.isDefault) || settings.general?.firms?.[0];
      const effectiveFirmId = currentFirm?.id || 'firm-1';
      const effectiveFirmName = currentFirm?.name || business?.name || 'MBI INVENTRA';
      const effectiveTenantId = tenantId || tenant?.id || business?.tenantId || 'tenant-default';
      const effectiveUserId = activeUser?.id || currentUser?.uid || '1';
      const effectiveUserName = activeUser?.name || currentUser?.displayName || 'Admin';

      // Calculate totals accurately
      const calculatedSubtotal = validItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      const effectiveSubtotal = calculatedSubtotal > 0 ? calculatedSubtotal : rawSubtotal;
      const effectiveGrandTotal = finalGrandTotal > 0 ? finalGrandTotal : Math.max(0, effectiveSubtotal - (currentTab.discountAmount || 0) + (calculatedTaxAmount || 0));
      const effectiveRecAmount = currentTab.isCredit 
        ? (currentTab.receivedAmount || 0) 
        : (currentTab.receivedAmount !== undefined && currentTab.receivedAmount !== 0 ? currentTab.receivedAmount : effectiveGrandTotal);
      const effectiveBalDue = Math.max(0, effectiveGrandTotal - effectiveRecAmount);

      const newInvoice: Invoice = {
        id: initialInvoice ? initialInvoice.id : uuidv4(),
        invoiceNumber: currentTab.invoiceNumber || `${Date.now()}`,
        date: invoiceDateObj.toISOString(),
        partyId: currentTab.selectedPartyId || undefined,
        customerName: customerName,
        billingName: currentTab.billingName || customerName,
        customerPhone: currentTab.customerPhone || undefined,
        customerAddress: currentTab.customerAddress || undefined,
        transactionType: txType,
        status: txType === 'Sale Return' ? 'Completed' : txType === 'Delivery Challan' ? 'Dispatched' : 'Pending',
        paymentType: currentTab.isCredit ? 'Credit' : 'Cash',
        items: validItems.map(({ tempId, ...rest }) => rest),
        subTotal: effectiveSubtotal,
        discountPercentage: currentTab.discountPercentage,
        discountAmount: currentTab.discountAmount,
        taxPercentage: currentTab.taxPercentage,
        taxAmount: calculatedTaxAmount,
        roundOff: effectiveRoundOff,
        grandTotal: effectiveGrandTotal,
        receivedAmount: effectiveRecAmount,
        balanceDue: effectiveBalDue,
        description: currentTab.description || undefined,
        imageAttachment: currentTab.imageAttachment,
        documentAttachment: currentTab.documentAttachment,
        isWarrantyBill: currentTab.isWarrantyBill,
        warrantyDetails: currentTab.isWarrantyBill ? {
          warrantyPeriod: currentTab.warrantyPeriod || '1 Year',
          warrantyStartDate: currentTab.warrantyStartDate || currentTab.invoiceDate,
          warrantyEndDate: currentTab.warrantyEndDate || '',
          warrantyType: currentTab.warrantyType || 'Replacement',
          warrantyTerms: currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.',
          tinNtn: currentTab.tinNtn || 'TIN-982738-1',
          claimContact: currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863',
          shopStamp: true,
          customFields: currentTab.warrantyCustomFieldValues
        } : undefined,
        firmName: effectiveFirmName,
        firmId: effectiveFirmId,
        tenantId: effectiveTenantId,
        userId: effectiveUserId,
        userName: effectiveUserName,
        cashierId: effectiveUserId,
        createdAt: initialInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 6. INSTANT ZERO-LATENCY SAVE: notify UI & transition immediately with zero loading screen
      onSaveSuccess(newInvoice);
      emitToast(`${txType} Saved: #${newInvoice.invoiceNumber}`, 'success');

      if (mode === 'save_and_new') {
        const type = txType;
        const prefixes = (settings.transaction.prefixes as any) || {};
        const typePrefix = 
          type === 'Estimate' ? (prefixes.estimate || 'EST-') :
          type === 'Sale Order' ? (prefixes.saleOrder || 'SO-') :
          type === 'Delivery Challan' ? (prefixes.deliveryChallan || 'DC-') :
          type === 'Sale Return' ? (prefixes.creditNote || 'SR-') :
          (prefixes.sale || 'INV-');
        
        const typeLabel = 
          type === 'Estimate' ? 'Estimate' :
          type === 'Sale Order' ? 'Sale Order' :
          type === 'Delivery Challan' ? 'Challan' :
          type === 'Sale Return' ? 'Sale Return' : 'Sale';

        // Increment number cleanly
        const digits = (newInvoice.invoiceNumber || '').match(/\d+/g);
        const lastNum = digits ? parseInt(digits[digits.length - 1], 10) : 1;
        const nextFormattedNum = `${typePrefix}${lastNum + 1}`;

        const freshTab: SaleTabState = {
          id: uuidv4(),
          tabLabel: `${typeLabel} #${nextFormattedNum}`,
          transactionType: txType as any,
          isCredit: false,
          selectedPartyId: '',
          customerName: '',
          billingName: '',
          customerPhone: '',
          customerAddress: '',
          invoiceNumber: nextFormattedNum,
          invoiceDate: new Date().toISOString().slice(0, 10),
          items: createEmptySaleRows(),
          description: '',
          discountPercentage: 0,
          discountAmount: 0,
          taxPercentage: 0,
          isRoundOff: false,
          roundOffAmount: 0,
          receivedAmount: 0,
        };

        setTabs([freshTab]);
        setActiveTabId(freshTab.id);
        setCustomerSearchQuery('');
        setSuccessMessage(`Invoice #${newInvoice.invoiceNumber} saved! Ready for #${nextFormattedNum}.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else if (mode === 'save_and_print') {
        setPrintInvoiceData(newInvoice);
        setAutoTriggerPrint(true);
        setIsPrintModalOpen(true);
        emitToast(`Invoice #${newInvoice.invoiceNumber} saved & print initiated!`, 'success');
      } else {
        onClose();
      }

      // 7. Background asynchronous persistence (non-blocking for instant cashier speed)
      (async () => {
        try {
          await dbInvoices.save(newInvoice);

          const rotationMethod = settings.item?.stockRotationMethod || 'FIFO';
          const enforceExpired = settings.item?.enforceExpiredBlock ?? true;

          if (txType === 'Sale') {
            await Promise.all(validItems.map(async (item) => {
              if (item.medicineId) {
                const med = medicines.find(m => m.id === item.medicineId) || (await dbMedicines.getById(item.medicineId));
                if (med) {
                  // Check if manual batch override occurred
                  const recommendedBatches = getStockRotationSortedBatches(med, medicines, rotationMethod, !enforceExpired);
                  const primaryBatch = recommendedBatches.find(b => b.isPrimary) || recommendedBatches[0];
                  if (item.batchNumber && primaryBatch && item.batchNumber !== primaryBatch.batchNumber) {
                    await logStockRotationOverride(
                      dbAuditLogs,
                      { id: effectiveUserId, name: effectiveUserName },
                      med.name,
                      primaryBatch.batchNumber,
                      item.batchNumber,
                      item.quantity,
                      rotationMethod,
                      `Sold via Invoice #${newInvoice.invoiceNumber}`
                    );
                  }

                  const updatedMed = deductStockFromMedicine(med, item.quantity, {
                    specificBatchNumber: item.batchNumber,
                    method: rotationMethod,
                    allowExpired: !enforceExpired
                  });
                  await dbMedicines.save(updatedMed);

                  const audit: AuditLog = {
                    id: uuidv4(),
                    date: new Date().toISOString(),
                    action: 'SALE',
                    medicineId: med.id,
                    medicineName: med.name,
                    quantityChanged: -item.quantity,
                    userId: effectiveUserId,
                    notes: `Sold in Invoice #${newInvoice.invoiceNumber} to ${newInvoice.customerName} (Batch: ${item.batchNumber || `${rotationMethod} Auto`})`,
                  };
                  await dbAuditLogs.save(audit);
                }
              }
            }));
          } else if (txType === 'Sale Return') {
            await Promise.all(validItems.map(async (item) => {
              if (item.medicineId) {
                const med = medicines.find(m => m.id === item.medicineId) || (await dbMedicines.getById(item.medicineId));
                if (med) {
                  const updatedMed = restockSaleReturn(med, item.quantity, item.batchNumber);
                  await dbMedicines.save(updatedMed);

                  const audit: AuditLog = {
                    id: uuidv4(),
                    date: new Date().toISOString(),
                    action: 'ADD_STOCK',
                    medicineId: med.id,
                    medicineName: med.name,
                    quantityChanged: item.quantity,
                    userId: effectiveUserId,
                    notes: `Returned item in Return #${newInvoice.invoiceNumber} from ${newInvoice.customerName} (Batch: ${item.batchNumber || 'Restocked'})`,
                  };
                  await dbAuditLogs.save(audit);
                }
              }
            }));
          }

          if (currentTab.selectedPartyId) {
            const party = parties.find(p => p.id === currentTab.selectedPartyId);
            if (party) {
              const currentBal = party.balance || 0;
              if (txType === 'Sale') {
                const updatedBal = currentBal + effectiveBalDue;
                await dbSuppliers.save({ ...party, balance: updatedBal });
              } else if (txType === 'Sale Return') {
                const updatedBal = Math.max(0, currentBal - effectiveGrandTotal);
                await dbSuppliers.save({ ...party, balance: updatedBal });
              }
            }
          }

          window.dispatchEvent(new Event('mbi-local-db-change'));
        } catch (bgErr: any) {
          console.error('Background invoice sync error:', bgErr);
        }
      })();
    } catch (err: any) {
      console.error('Failed to save sale invoice:', err);
      const msg = err?.message || 'Error saving invoice. Please verify your entries.';
      setErrorMessage(msg);
      emitToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !currentTab) return null;

  // If minimized in dock mode, don't render floating pill (the dock bar manages it)
  if (isMinimized && onMinimizeChange) {
    return null;
  }

  // Minimized floating pill docked at bottom right (fallback for non-dock standalone mode)
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 bg-[#1e293b] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">{currentTab?.tabLabel || 'Sale Form'}</span>
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

  return (
    <div className={`fixed inset-0 z-50 flex ${
      isMaximized ? 'p-0 overflow-hidden' : 'items-center justify-center p-2 sm:p-4 overflow-y-auto'
    } bg-slate-900/75 backdrop-blur-md`}>
      <div className={`bg-[#f8fafc] w-full flex flex-col overflow-hidden text-slate-800 transition-all ${
        isMaximized 
          ? 'h-full max-h-screen rounded-none' 
          : 'max-w-6xl max-h-[96vh] rounded-2xl shadow-2xl border border-slate-300'
      }`}>
        
        {/* Top Sale Tabs & Action Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#1e293b] text-white border-b border-slate-800 flex-shrink-0">
          
          {/* Desktop Tabs List */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {tabs.map((tab) => {
              const isActive = tab.id === currentTab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.tabLabel}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 hover:text-rose-500 rounded transition-colors text-slate-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Plus Tab Button */}
            <button
              type="button"
              onClick={handleAddNewTab}
              title="Add New Tab"
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 flex-shrink-0 ml-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Active Tab Pill */}
          <div className="sm:hidden flex items-center gap-2 flex-1 min-w-0 mr-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs font-black text-white truncate">
              {currentTab.tabLabel || `Invoice #${currentTab.invoiceNumber}`}
            </span>
            {tabs.length > 1 && (
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-bold shrink-0">
                {tabs.findIndex(t => t.id === currentTab.id) + 1}/{tabs.length}
              </span>
            )}
          </div>

          {/* Desktop Utility Tools & Window Controls */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <button
              type="button"
              onClick={handleTriggerPrint}
              title="Print Invoice (Ctrl+P)"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="font-semibold">Print</span>
              <kbd className="hidden md:inline px-1 py-0.2 bg-slate-800 border border-slate-700 text-slate-400 rounded text-[10px] font-mono">Ctrl+P</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              title="Open Calculator"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts Cheat Sheet (F12 / ?)"
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Shortcuts</span>
              <kbd className="hidden md:inline px-1 py-0.2 bg-slate-800 border border-slate-700 text-amber-300/80 rounded text-[10px] font-mono">F12</kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Invoice & Sale Settings"
              className={`p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                isSettingsOpen ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Settings</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-700 mx-1" />

            {/* Window Controls: Minimize, Maximize/Restore, Close */}
            <button
              type="button"
              onClick={() => handleSetMinimized(true)}
              title="Minimize Window"
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleRequestClose}
              title="Close Window (Esc)"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Actions & Window Controls */}
          <div className="sm:hidden flex items-center gap-0.5 text-slate-300">
            {/* Mobile Minimize */}
            <button
              type="button"
              onClick={() => handleSetMinimized(true)}
              title="Minimize Window"
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Mobile Maximize / Restore */}
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restore Window" : "Maximize Window"}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer text-slate-300"
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Mobile Submenu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(!isMobileSubMenuOpen)}
                title="Invoice Actions & Tools"
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMobileSubMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsMobileSubMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 text-slate-200 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); handleTriggerPrint(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-blue-300 font-bold text-left cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsCalculatorOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-emerald-300 font-bold text-left cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>Calculator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsSettingsOpen(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-bold text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Invoice Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); handleAddNewTab(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-amber-300 font-bold text-left cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Bill Tab</span>
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); handleSetMinimized(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-left cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                      <span>Minimize Window</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsMobileSubMenuOpen(false); setIsMaximized(!isMaximized); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-left cursor-pointer"
                    >
                      {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span>{isMaximized ? 'Restore Size' : 'Maximize Window'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Close */}
            <button
              type="button"
              onClick={handleRequestClose}
              title="Close Window (Esc)"
              className="p-1.5 hover:bg-rose-600 hover:text-white rounded-lg transition-colors text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 bg-white">

          {/* Status Alert Banners */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* Top Form Row: Title, Credit/Cash Toggle, Customer, Invoice Details */}
          <div className="bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl space-y-3 sm:space-y-4 block">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {currentTab?.transactionType === 'Sale Return' ? 'Return' : currentTab?.transactionType || 'Sale'}
                  </h2>
                  <span className="text-[11px] sm:text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    #{currentTab.invoiceNumber}
                  </span>
                </div>

                {/* Credit <-> Cash Toggle Pill */}
                {settings.transaction?.showPaymentType !== false && (
                  <div className="flex items-center bg-slate-200 p-0.5 sm:p-1 rounded-full text-xs font-bold shadow-inner">
                    <button
                      type="button"
                      onClick={() => updateCurrentTab({ isCredit: true })}
                      className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
                        currentTab.isCredit 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentTab({ isCredit: false })}
                      className={`px-2.5 sm:px-3 py-1 rounded-full transition-all ${
                        !currentTab.isCredit 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                )}

                {/* Warranty Bill High-Contrast Animated Toggle Switch */}
                {settings.transaction?.showWarrantyToggle !== false && (
                  <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold transition-all duration-300 ease-in-out shadow-sm border ${
                    currentTab.isWarrantyBill 
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-amber-200/50 ring-2 ring-amber-400/30' 
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}>
                    <div className="flex items-center gap-1">
                      <ShieldAlert className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 ${currentTab.isWarrantyBill ? 'text-amber-700 scale-110 animate-pulse' : 'text-slate-400'}`} />
                      <span className="tracking-wide text-[11px] sm:text-xs">Warranty</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !currentTab.isWarrantyBill;
                        const updates: Partial<SaleTabState> = { isWarrantyBill: nextVal };
                        if (nextVal) {
                          const autoPercent = 15;
                          const autoAmount = Math.round((rawSubtotal * autoPercent) / 100);
                          updates.discountPercentage = autoPercent;
                          updates.discountAmount = autoAmount;
                          if (!currentTab.warrantyStartDate) {
                            updates.warrantyStartDate = new Date().toISOString().slice(0, 10);
                          }
                          if (!currentTab.warrantyEndDate) {
                            const oneYr = new Date();
                            oneYr.setFullYear(oneYr.getFullYear() + 1);
                            updates.warrantyEndDate = oneYr.toISOString().slice(0, 10);
                          }
                        }
                        updateCurrentTab(updates);
                        updateTransaction({ warrantyMode: nextVal });
                      }}
                      className={`relative inline-flex h-5 sm:h-6 w-9 sm:w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                        currentTab.isWarrantyBill ? 'bg-amber-600 shadow-md' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 sm:h-5 w-4 sm:w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out ${
                          currentTab.isWarrantyBill ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {currentTab.isWarrantyBill && (
                  <div className="flex gap-2 items-center bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button onClick={() => updateCurrentTab({isWarrantyHeaderEnabled: !currentTab.isWarrantyHeaderEnabled})} className={`px-2 py-0.5 rounded ${currentTab.isWarrantyHeaderEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Header: {currentTab.isWarrantyHeaderEnabled ? 'ON' : 'OFF'}</button>
                    <button onClick={() => updateCurrentTab({isWarrantyFooterEnabled: !currentTab.isWarrantyFooterEnabled})} className={`px-2 py-0.5 rounded ${currentTab.isWarrantyFooterEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Footer: {currentTab.isWarrantyFooterEnabled ? 'ON' : 'OFF'}</button>
                    <button onClick={() => updateCurrentTab({isWarrantyPrintingEnabled: !currentTab.isWarrantyPrintingEnabled})} className={`px-2 py-0.5 rounded ${currentTab.isWarrantyPrintingEnabled ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>Printing: {currentTab.isWarrantyPrintingEnabled ? 'ON' : 'OFF'}</button>
                  </div>
                )}
              </div>

              {/* Invoice Number & Date */}
              {settings.transaction?.showInvoiceNumberAndDate !== false && (
                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs">
                    <span className="font-semibold text-slate-600 text-[11px] sm:text-xs">Invoice No:</span>
                    <input
                      type="text"
                      value={currentTab.invoiceNumber}
                      onChange={(e) => updateCurrentTab({ invoiceNumber: e.target.value })}
                      placeholder="Invoice #"
                      className="w-full sm:w-36 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-left font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                      title="Enter custom reference or invoice number"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs">
                    <span className="font-semibold text-slate-500 text-[11px] sm:text-xs">Date:</span>
                    <input
                      type="date"
                      value={currentTab.invoiceDate}
                      onChange={(e) => updateCurrentTab({ invoiceDate: e.target.value })}
                      className="w-full sm:w-auto px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Customer Inputs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
              
              {/* Customer Selector / Autocomplete */}
              <div className="relative" ref={customerDropdownRef}>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Customer <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      ref={customerInputRef}
                      type="text"
                      placeholder="Search or Enter Customer Name (F1)"
                      value={currentTab.customerName}
                      onChange={(e) => {
                        updateCurrentTab({ customerName: e.target.value });
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(e.target.value.trim().length > 0);
                        setCustomerSelectedIndex(0);
                      }}
                      onFocus={() => {
                        if (customerSearchQuery.trim().length > 0 || (currentTab.customerName && currentTab.customerName.trim().length > 0)) {
                          setIsCustomerDropdownOpen(true);
                        } else {
                          setIsCustomerDropdownOpen(false);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setIsCustomerDropdownOpen(false);
                        }, 200);
                      }}
                      onKeyDown={(e) => {
                        const filtered = parties.filter(p => p.name.toLowerCase().includes((customerSearchQuery || currentTab.customerName).toLowerCase()));
                        if (isCustomerDropdownOpen && filtered.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setCustomerSelectedIndex(prev => (prev + 1) % filtered.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setCustomerSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filtered[customerSelectedIndex]) {
                              handleSelectParty(filtered[customerSelectedIndex]);
                            } else {
                              setIsCustomerDropdownOpen(false);
                              lightningInputRef.current?.focus();
                            }
                          } else if (e.key === 'Tab') {
                            if (filtered[customerSelectedIndex]) {
                              handleSelectParty(filtered[customerSelectedIndex]);
                            }
                          } else if (e.key === 'Escape') {
                            setIsCustomerDropdownOpen(false);
                          }
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setIsCustomerDropdownOpen(true);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          setIsCustomerDropdownOpen(false);
                          lightningInputRef.current?.focus();
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {settings.transaction?.showCustomerAddButton !== false && (
                    <button
                      type="button"
                      onClick={() => setIsAddPartyOpen(true)}
                      title="Add New Party"
                      className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  )}
                </div>

                {/* Dropdown for Customer Suggestions */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                    {parties
                      .filter(p => p.name.toLowerCase().includes((customerSearchQuery || currentTab.customerName).toLowerCase()))
                      .map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectParty(p)}
                          className={`px-3.5 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center text-xs ${
                            idx === customerSelectedIndex ? 'bg-blue-100 text-slate-900 font-bold' : 'hover:bg-blue-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {p.phone ? `Phone: ${p.phone}` : ''} {p.city ? `• ${p.city}` : ''}
                            </div>
                          </div>
                          {p.balance !== undefined && (
                            <div className={`font-bold font-mono text-[11px] ${p.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              Bal: Rs {p.balance.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}

                    {parties.length === 0 && (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No registered parties found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Billing Name (Optional) */}
              {settings.transaction?.billingNameOfParties && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Billing Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Doctor, Pharmacy or Dept Name"
                    value={currentTab.billingName}
                    onChange={(e) => updateCurrentTab({ billingName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Phone Number */}
              {settings.transaction?.customerPhone !== false && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Customer Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="0321-xxxxxxx"
                      value={currentTab.customerPhone}
                      onChange={(e) => updateCurrentTab({ customerPhone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Customer PO Details */}
              {settings.transaction?.customerPoDetails && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      P.O. Number
                    </label>
                    <input
                      type="text"
                      placeholder="PO-xxxx"
                      value={currentTab.customerPoNumber || ''}
                      onChange={(e) => updateCurrentTab({ customerPoNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      P.O. Date
                    </label>
                    <input
                      type="date"
                      value={currentTab.customerPoDate || ''}
                      onChange={(e) => updateCurrentTab({ customerPoDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Due Date & Payment Terms */}
              {settings.transaction?.dueDatesAndPaymentTerms && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={currentTab.paymentTerms || 'Due on Receipt'}
                      onChange={(e) => updateCurrentTab({ paymentTerms: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Net 7">Net 7 Days</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={currentTab.dueDate || ''}
                      onChange={(e) => updateCurrentTab({ dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Quick Barcode Scanner Control (Optional secondary placement, default false to avoid duplicate with items table) */}
              {settings.transaction?.showTopBarcodeVoiceTools && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Barcode Scanner
                  </label>
                  <div className="flex items-center gap-2">
                    {(settings.general.enableQrScanner ?? true) && (
                      <button
                        type="button"
                        onClick={() => setIsBarcodeScannerOpen(true)}
                        title="Scan Barcode (Hardware USB/Wireless Scanner Gun or Camera)"
                        className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      >
                        <Scan className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">Scan Barcode (Gun / USB)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Warranty Bill Configuration Panel (Visible only when Warranty is ON) */}
            {currentTab.isWarrantyBill && (
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">Warranty Bill Mode Active</h3>
                  </div>
                  <span className="text-[11px] text-amber-800 font-medium">Warranty fields & auto 15% discount active</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Warranty Discount Field Section */}
                  <div className="bg-amber-100/90 p-2.5 rounded-xl border border-amber-300/90 flex flex-col justify-center">
                    <label className="text-[11px] font-bold text-amber-950 block mb-1 flex items-center justify-between">
                      <span>Warranty Discount (%)</span>
                      <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.2 rounded font-black">Auto 15%</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={currentTab.discountPercentage !== undefined ? currentTab.discountPercentage : 15}
                          onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-400 rounded-lg text-xs font-black text-amber-900 focus:ring-2 focus:ring-amber-500 font-mono pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-xs font-bold text-amber-800">%</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-amber-900 font-mono block">
                          -Rs. {(currentTab.discountAmount || Math.round((rawSubtotal * (currentTab.discountPercentage ?? 15)) / 100)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Configurable Warranty Custom Fields */}
                  {((settings.transaction?.warrantyCustomFields || settings.item?.warrantyCustomFields || [
                    { id: 'wcf-1', name: 'Warranty Type', enabled: true, defaultValue: 'Replacement' },
                    { id: 'wcf-2', name: 'Warranty Period', enabled: true, defaultValue: '1 Year' }
                  ]).filter(f => f.enabled !== false)).map(field => {
                    const isTypeField = field.name.toLowerCase().includes('type');
                    const isPeriodField = field.name.toLowerCase().includes('period') || field.name.toLowerCase().includes('duration');
                    const currentValue = currentTab.warrantyCustomFieldValues?.[field.id] ?? (
                      isTypeField ? (currentTab.warrantyType || field.defaultValue || 'Replacement') :
                      isPeriodField ? (currentTab.warrantyPeriod || field.defaultValue || '1 Year') :
                      (field.defaultValue || '')
                    );

                    return (
                      <div key={field.id}>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">{field.name}</label>
                        {isTypeField ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentTab({
                                warrantyType: val as any,
                                warrantyCustomFieldValues: {
                                  ...(currentTab.warrantyCustomFieldValues || {}),
                                  [field.id]: val
                                }
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="Replacement">Replacement</option>
                            <option value="Repair">Repair</option>
                            <option value="Service">Service</option>
                            <option value="Checking Warranty">Checking Warranty</option>
                            <option value="Comprehensive">Comprehensive</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updates: Partial<SaleTabState> = {
                                warrantyCustomFieldValues: {
                                  ...(currentTab.warrantyCustomFieldValues || {}),
                                  [field.id]: val
                                }
                              };
                              if (isPeriodField) updates.warrantyPeriod = val;
                              updateCurrentTab(updates);
                            }}
                            placeholder={field.placeholder || `Enter ${field.name}`}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Start Date</label>
                    <input
                      type="date"
                      value={currentTab.warrantyStartDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => updateCurrentTab({ warrantyStartDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={currentTab.warrantyEndDate || ''}
                      onChange={(e) => updateCurrentTab({ warrantyEndDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">TIN / NTN Number</label>
                    <input
                      type="text"
                      value={currentTab.tinNtn || 'TIN-982738-1'}
                      onChange={(e) => updateCurrentTab({ tinNtn: e.target.value })}
                      placeholder="Enter TIN or NTN"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Claim Contact Details</label>
                    <input
                      type="text"
                      value={currentTab.claimContact || 'support@mbiinventra.com / 0336-4585863'}
                      onChange={(e) => updateCurrentTab({ claimContact: e.target.value })}
                      placeholder="Support phone / email"
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Warranty Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={currentTab.warrantyTerms || 'Warranty covers manufacturing defects, hardware failure, and normal operation faults. Physical damage, water ingress, and unauthorized tampering voids warranty.'}
                    onChange={(e) => updateCurrentTab({ warrantyTerms: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            {/* Selected Party Financial Status Card */}
            {settings.transaction?.showPartyBalanceCard !== false && (() => {
              if (!currentTab.selectedPartyId) return null;
              const party = parties.find(p => p.id === currentTab.selectedPartyId);
              if (!party) return null;
              const curBal = party.balance || 0;
              const limit = party.creditLimit || 0;
              const isOverLimit = limit > 0 && curBal > limit;

              return (
                <div className={`mt-3 px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isOverLimit 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : 'bg-blue-50/70 border-blue-200 text-blue-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{party.name}</span>
                    {party.phone && <span className="text-[11px] text-slate-500 font-mono">({party.phone})</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-slate-500 text-[11px]">Current Due: </span>
                      <strong className={`font-mono font-bold ${curBal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Rs. {curBal.toLocaleString()}
                      </strong>
                    </div>
                    {limit > 0 && (
                      <div>
                        <span className="text-slate-500 text-[11px]">Credit Limit: </span>
                        <strong className="font-mono font-bold text-slate-700">
                          Rs. {limit.toLocaleString()}
                        </strong>
                        {isOverLimit && (
                          <span className="ml-1.5 bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">
                            Exceeded!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Items & Billing Section */}
          <div className="space-y-4 block">
            
            {/* Items Table Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
            
            {/* Real-Time Below-Cost Warning Banner */}
            {(() => {
              const belowCostList = currentTab.items.filter(item => {
                if (!item.name || !item.name.trim()) return false;
                const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                const avgCost = med ? (med.purchasePrice || 0) : 0;
                const sellPrice = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
                return sellPrice > 0 && avgCost > 0 && sellPrice < avgCost;
              });

              if (belowCostList.length === 0) return null;

              return (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="font-bold">Selling Below Cost Warning:</strong> {belowCostList.length} item(s) ({belowCostList.map(i => i.name).join(', ')}) priced below weighted average purchase cost.
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    Policy: {settings.pricing?.belowCostAction === 'Block' ? 'Strict Block' : 'Warning'}
                  </div>
                </div>
              );
            })()}
            
            {/* Items Table Header */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-slate-900">ITEMS INVOICED</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {currentTab.items.length} items
                </span>
              </div>
              
              <div className="hidden md:flex items-center gap-2">
                {(settings.general.enableQrScanner ?? true) && (
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    title="Scan Barcode (Hardware USB/Wireless Scanner Gun or Camera)"
                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scan Barcode</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">Gun/USB</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => lightningInputRef.current?.focus()}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold text-xs ml-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rapid Add Mode (F2)</span>
                </button>
              </div>
            </div>

            {/* Mobile-Optimized Billed Items View (Matches reference app: No horizontal scrolling) */}
            <div className="md:hidden bg-white p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-slate-900 tracking-tight">Billed Items</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {currentTab.items.filter(i => i.name?.trim()).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete/Clear all items from this invoice?')) {
                        updateCurrentTab({
                          items: [{
                            tempId: `item-${Date.now()}`,
                            name: '',
                            quantity: 1,
                            pricePerUnit: 0,
                            sellingPrice: 0,
                            discountPercentage: 0,
                            taxPercentage: 0,
                            total: 0
                          }]
                        });
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete Items
                  </button>
                  <button
                    type="button"
                    onClick={handleAddBlankRow}
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
                      .map(med => {
                        const latestPur = getAuthoritativeLatestPurchasePrice(med, allPurchases, med.name);
                        const sellingPrice = Math.max(med.mrp || med.salePrice || 0, latestPur);
                        return (
                          <button
                            key={med.id}
                            type="button"
                            onClick={() => {
                              const existingEmptyIdx = currentTab.items.findIndex(i => !i.name || !i.name.trim());
                              const newItem = {
                                tempId: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                medicineId: med.id,
                                name: med.name,
                                genericName: med.genericName || med.saltComposition || '',
                                batchNumber: med.batchNumber || '',
                                expiryDate: med.expiryDate || '',
                                mfgDate: '',
                                quantity: 1,
                                freeQuantity: 0,
                                unit: med.unit || 'Packs',
                                pricePerUnit: sellingPrice,
                                sellingPrice: sellingPrice,
                                mrp: med.mrp || sellingPrice,
                                discountPercentage: 0,
                                taxPercentage: 0,
                                total: sellingPrice,
                                availableStock: med.quantity || 0,
                                costPrice: latestPur,
                                latestPurchasePrice: latestPur
                              };
                              if (existingEmptyIdx !== -1) {
                                const updated = [...currentTab.items];
                                updated[existingEmptyIdx] = { ...updated[existingEmptyIdx], ...newItem };
                                updateCurrentTab({ items: updated });
                              } else {
                                updateCurrentTab({ items: [...currentTab.items, newItem] });
                              }
                              setMobileMedicineSearch('');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{med.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{med.genericName || 'Medicine'}</span>
                                <span>• Stock: <strong className={med.quantity <= (med.lowStockThreshold || 10) ? 'text-amber-600 font-bold' : 'text-slate-600'}>{med.quantity || 0}</strong></span>
                                {latestPur > 0 && (
                                  <span className="text-emerald-800 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                    Latest Pur: Rs {latestPur}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-blue-700">Rs {sellingPrice}</div>
                              <span className="text-[10px] text-emerald-600 font-bold">+ Add</span>
                            </div>
                          </button>
                        );
                      })}
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
                    {currentTab.items.map((item) => {
                      const itemRate = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
                      const itemQty = Number(item.quantity) || 0;
                      const itemAmt = itemQty * itemRate;
                      const med = medicines.find(m => m.id === item.medicineId || (item.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim()));
                      const latestPur = item.latestPurchasePrice || (med ? getAuthoritativeLatestPurchasePrice(med, allPurchases, item.name) : 0);
                      const isBelowPur = latestPur > 0 && itemRate > 0 && itemRate < latestPur;

                      return (
                        <tr key={item.tempId} className="border-b border-dashed border-slate-300">
                          {/* Item Name */}
                          <td className="py-2.5 px-1 align-top">
                            <div className="flex items-start gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteItemRow(item.tempId)}
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
                                  onClick={() => setActiveMedDropdownTempId(item.tempId)}
                                  onFocus={() => setActiveMedDropdownTempId(item.tempId)}
                                  onChange={(e) => {
                                    handleUpdateItemRow(item.tempId, { name: e.target.value });
                                    setActiveMedDropdownTempId(item.tempId);
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
                                {activeMedDropdownTempId === item.tempId && (
                                  <div 
                                    className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white border-2 border-blue-500 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto ring-4 ring-blue-500/10"
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 flex justify-between items-center sticky top-0 z-10">
                                      <span className="flex items-center gap-1 text-blue-600">
                                        <Plus className="w-3 h-3" /> Select Medicine
                                      </span>
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setActiveMedDropdownTempId(null); }}
                                        className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    {(() => {
                                      const query = (item.name || '').toLowerCase().trim();
                                      const matches = query
                                        ? medicines.filter(m => (m.name && m.name.toLowerCase().includes(query)) || (m.barcode && m.barcode.toLowerCase().includes(query)) || (m.genericName && m.genericName.toLowerCase().includes(query))).slice(0, 15)
                                        : medicines.slice(0, 15);
                                        
                                      if (matches.length === 0) {
                                        return (
                                          <div className="p-3 text-center text-slate-400 text-xs">
                                            No matching medicines found.
                                          </div>
                                        );
                                      }
                                      
                                      return matches.map(rowMed => {
                                        const rowLatestPur = getAuthoritativeLatestPurchasePrice(rowMed, allPurchases, rowMed.name);
                                        const rowSellPrice = Math.max(rowMed.sellingPrice || rowMed.mrp || 0, rowLatestPur);
                                        return (
                                          <button
                                            key={rowMed.id}
                                            type="button"
                                            onClick={() => handleSelectMedIntoRow(item.tempId, rowMed)}
                                            className="w-full px-2.5 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-0 cursor-pointer"
                                          >
                                            <div className="min-w-0 pr-2">
                                              <div className="font-bold text-slate-900 text-xs truncate">{rowMed.name}</div>
                                              <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                                                <span>Stock: <strong className={rowMed.quantity <= 5 ? 'text-rose-600' : 'text-slate-700'}>{rowMed.quantity}</strong></span>
                                                {rowLatestPur > 0 && (
                                                  <span className="text-emerald-800 font-semibold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                                    Pur: Rs {rowLatestPur}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div className="font-mono font-bold text-blue-700 text-xs">Rs {rowSellPrice}</div>
                                              <span className="text-[10px] text-emerald-600 font-bold">+ Pick</span>
                                            </div>
                                          </button>
                                        );
                                      });
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
                              value={item.quantity === 0 ? '0' : item.quantity}
                              placeholder="0"
                              onFocus={(e) => {
                                setActiveMedDropdownTempId(null);
                                e.target.select();
                              }}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                handleUpdateItemRow(item.tempId, { quantity: isNaN(parsed) ? 0 : parsed });
                              }}
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
                              onChange={(e) => handleUpdateItemRow(item.tempId, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                              className={`w-full max-w-[62px] ml-auto text-right font-bold text-xs py-1 px-1 rounded-lg focus:outline-none ${
                                isBelowPur
                                  ? 'bg-rose-50 border-2 border-rose-500 text-rose-700 ring-1 ring-rose-400'
                                  : 'bg-white border border-slate-300 focus:ring-1 focus:ring-blue-500'
                              }`}
                            />
                            {isBelowPur && (
                              <div className="text-[9px] font-bold text-rose-600 mt-0.5 text-right whitespace-nowrap">
                                ⚠️ Min: {latestPur}
                              </div>
                            )}
                            {!isBelowPur && latestPur > 0 && (
                              <div className="text-[8px] font-semibold text-emerald-700 mt-0.5 text-right whitespace-nowrap">
                                Pur: {latestPur}
                              </div>
                            )}
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
                      <td className="py-2.5 px-1 text-center font-mono text-xs">{totalQty}</td>
                      <td className="py-2.5 px-1"></td>
                      <td className="py-2.5 px-2 text-right font-mono text-xs text-blue-900">
                        Rs {rawSubtotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Add item row button */}
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 border border-dashed border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>

              {/* Quick Input Tools (Scan Barcode) at the end for mobile users */}
              <div className="pt-2 border-t border-slate-100">
                {(settings.general.enableQrScanner ?? true) && (
                  <button
                    type="button"
                    onClick={() => setIsBarcodeScannerOpen(true)}
                    title="Scan Barcode (Hardware USB/Wireless Scanner Gun or Camera)"
                    className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Scan className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">Scan Barcode (Gun / USB)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Invoiced Items Table (Desktop Power-User Table) */}
            <div className="hidden md:block overflow-x-auto min-h-[300px] pb-28">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">ITEM</th>
                    {settings.print?.tableColumns?.hsnSac && <th className="py-2.5 px-3 w-20 border-r border-slate-200">HSN/SAC</th>}
                    {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-22 border-r border-slate-200">BATCH NO.</th>}
                    {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-22 border-r border-slate-200">EXP. DATE</th>}
                    {settings.print?.tableColumns?.mfgDate && <th className="py-2.5 px-3 w-22 border-r border-slate-200">MFG. DATE</th>}
                    {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">MRP</th>}
                    <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">QTY</th>
                    {settings.transaction?.freeItemQuantity && <th className="py-2.5 px-3 w-16 text-center border-r border-slate-200">FREE QTY</th>}
                    {showDiscountCol && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">DISC %</th>}
                    {settings.print?.tableColumns?.unit !== false && <th className="py-2.5 px-3 w-20 text-center border-r border-slate-200">UNIT</th>}
                    <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">PRICE/UNIT</th>
                    {settings.print?.tableColumns?.taxPercent && <th className="py-2.5 px-3 w-20 text-right border-r border-slate-200">TAX / GST</th>}
                    <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200">AMOUNT</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                {settings.transaction?.quickEntry !== false && (
                  <thead className="bg-blue-50/90 border-b-2 border-blue-200">
                    <tr>
                      <td className="py-2 px-1 text-center border-r border-slate-200 w-10 text-amber-500 font-bold text-sm">⚡</td>
                      <td className="py-2 px-3 border-r border-slate-200 relative min-w-[210px]">
                        <div className="relative">
                          <input
                            ref={lightningInputRef}
                            type="text"
                            placeholder="Scan Barcode or Search Medicine (F2)..."
                            value={lightningQuery}
                            onChange={(e) => handleLightningSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (lightningResults.length > 0) {
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev + 1) % lightningResults.length);
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  setLightningSelectedIndex(prev => (prev - 1 + lightningResults.length) % lightningResults.length);
                                } else if (e.key === 'Enter' || e.key === 'Tab') {
                                  e.preventDefault();
                                  // Check if query is an exact barcode match
                                  const cleanQ = lightningQuery.trim().toLowerCase();
                                  const exactBarcodeMatch = medicines.find(m => 
                                    (m.barcode && m.barcode.trim().toLowerCase() === cleanQ) ||
                                    m.id.toLowerCase() === cleanQ ||
                                    ((m as any).code && (m as any).code.toLowerCase() === cleanQ)
                                  );
                                  if (exactBarcodeMatch) {
                                    handleBarcodeScanned(cleanQ, 'Direct Barcode Input');
                                    return;
                                  }

                                  if (lightningResults[lightningSelectedIndex]) {
                                    handleSelectLightningMed(lightningResults[lightningSelectedIndex], false);
                                    setLightningSelectedIndex(0);
                                  } else if (e.key === 'Enter') {
                                    handleConfirmLightningItem();
                                  }
                                } else if (e.key === 'Escape') {
                                  setLightningResults([]);
                                }
                              } else {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const cleanQ = lightningQuery.trim().toLowerCase();
                                  const exactBarcodeMatch = medicines.find(m => 
                                    (m.barcode && m.barcode.trim().toLowerCase() === cleanQ) ||
                                    m.id.toLowerCase() === cleanQ ||
                                    ((m as any).code && (m as any).code.toLowerCase() === cleanQ)
                                  );
                                  if (exactBarcodeMatch) {
                                    handleBarcodeScanned(cleanQ, 'Direct Barcode Input');
                                    return;
                                  }

                                  if (lightningQuery.trim()) {
                                    handleConfirmLightningItem();
                                  } else if (currentTab.items.length > 0) {
                                    receivedAmountInputRef.current?.focus();
                                    receivedAmountInputRef.current?.select();
                                  }
                                } else if (e.key === 'Tab' && !e.shiftKey) {
                                  if (!lightningQuery.trim() && currentTab.items.length > 0) {
                                    e.preventDefault();
                                    receivedAmountInputRef.current?.focus();
                                    receivedAmountInputRef.current?.select();
                                  }
                                }
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setLightningResults([]);
                              }, 200);
                            }}
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-blue-300 focus:ring-2 focus:ring-blue-500 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none transition-all shadow-2xs"
                          />
                          <Search className="w-3.5 h-3.5 text-blue-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        {/* Auto-suggest dropdown */}
                        {lightningResults.length > 0 && (
                          <div className="absolute left-0 top-full mt-1 w-[480px] sm:w-[620px] max-w-[90vw] bg-white border-2 border-blue-400 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-y-auto ring-4 ring-blue-500/10">
                            {lightningResults.map((med, idx) => {
                              const showBatch = settings.transaction?.showBatchInAutocomplete !== false;
                              const showStock = settings.transaction?.showStockInAutocomplete !== false;
                              const showMrp = settings.transaction?.showMrpInAutocomplete !== false;
                              const showPurRate = settings.transaction?.showPurchasePriceInAutocomplete !== false;
                              const showSaleRate = settings.transaction?.showSalePriceInAutocomplete !== false;
                              const showExpDate = settings.transaction?.showExpDateInAutocomplete && med.expiryDate;

                              const metaItems: React.ReactNode[] = [];
                              if (showBatch && med.batchNumber) {
                                metaItems.push(
                                  <span key="batch">Batch: <span className="font-mono text-slate-700 font-medium">{med.batchNumber}</span></span>
                                );
                              }
                              if (showStock) {
                                metaItems.push(
                                  <span key="stock">Stock: <strong className={med.quantity <= 10 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>{med.quantity}</strong> {med.unit ? `(${med.unit})` : ''}</span>
                                );
                              }
                              if (showMrp && (med.mrp || med.mrp === 0)) {
                                metaItems.push(
                                  <span key="mrp">MRP: <span className="font-mono text-slate-700 font-medium">Rs {med.mrp}</span></span>
                                );
                              }
                              if (showPurRate) {
                                metaItems.push(
                                  <span key="purRate" className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    Pur. Rate: <span className="font-mono font-bold">Rs {med.purchasePrice || 0}</span>
                                  </span>
                                );
                              }
                              if (showExpDate) {
                                metaItems.push(
                                  <span key="exp" className="text-purple-800 font-medium bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                    Exp: <span className="font-mono">{med.expiryDate}</span>
                                  </span>
                                );
                              }

                              return (
                                <div
                                  key={med.id}
                                  onClick={() => handleSelectLightningMed(med, false)}
                                  className={`px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center text-xs transition-colors ${
                                    idx === lightningSelectedIndex ? 'bg-blue-100 text-slate-900 font-bold' : 'hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="font-bold text-slate-900 truncate">{med.name}</div>
                                    {metaItems.length > 0 && (
                                      <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        {metaItems.map((elem, mIdx) => (
                                          <React.Fragment key={mIdx}>
                                            {mIdx > 0 && <span className="text-slate-300">|</span>}
                                            {elem}
                                          </React.Fragment>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {showSaleRate && (
                                    <div className="text-right flex-shrink-0">
                                      <span className="font-black font-mono text-blue-700 text-sm">Rs {med.sellingPrice}</span>
                                      <div className="text-[9px] text-slate-400">Sale Rate</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
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
                      {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && (
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
                      {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && (
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
                      {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={lightningMrp || ''}
                            onChange={(e) => setLightningMrp(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          ref={lightningQtyInputRef}
                          type="number"
                          min="1"
                          value={lightningQty || ''}
                          onChange={(e) => setLightningQty(parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => { 
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (showDiscountCol) {
                                lightningDiscountInputRef.current?.focus();
                                lightningDiscountInputRef.current?.select();
                              } else {
                                lightningPriceInputRef.current?.focus();
                                lightningPriceInputRef.current?.select();
                              }
                            }
                          }}
                          placeholder="1"
                          className="w-16 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      {settings.transaction?.freeItemQuantity && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            value={lightningFreeQty || ''}
                            onChange={(e) => setLightningFreeQty(parseInt(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-16 px-1 py-1 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                          />
                        </td>
                      )}
                      {showDiscountCol && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            ref={lightningDiscountInputRef}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={lightningDiscount || ''}
                            onChange={(e) => setLightningDiscount(parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter') { 
                                e.preventDefault();
                                lightningPriceInputRef.current?.focus();
                                lightningPriceInputRef.current?.select();
                              } 
                            }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      {settings.print?.tableColumns?.unit !== false && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <select
                            value={lightningUnit}
                            onChange={(e) => setLightningUnit(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200 relative">
                        <div className="flex items-center justify-end">
                          <input
                            ref={lightningPriceInputRef}
                            type="number"
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
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          {(lightningSelectedMed || lightningQuery) && (
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickBarPriceDropdownOpen(prev => !prev);
                              }}
                              title="Show Last 5 Sale Rates & Company"
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition shrink-0 ml-0.5"
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Quick Bar Historical Sale Price Dropdown */}
                        <HistoricalPriceDropdown
                          medicineId={lightningSelectedMed?.id}
                          itemName={lightningSelectedMed?.name || lightningQuery}
                          companyName={lightningSelectedMed?.manufacturer || ''}
                          transactionType="Sale"
                          currentPrice={lightningPrice || 0}
                          onSelectPrice={(p) => {
                            setLightningPrice(p);
                            setQuickBarPriceDropdownOpen(false);
                          }}
                          isOpen={quickBarPriceDropdownOpen}
                          onClose={() => setQuickBarPriceDropdownOpen(false)}
                          showCompany={settings.transaction?.showCompanyInRecentRates !== false}
                          onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                      </td>
                      {settings.print?.tableColumns?.taxPercent && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={lightningTax || ''}
                            onChange={(e) => setLightningTax(parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmLightningItem(); }}
                            placeholder="0"
                            className="w-full px-1 py-1 bg-white border border-slate-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-200 text-right font-mono font-bold text-xs">
                        Rs {(((lightningPrice || lightningSelectedMed?.sellingPrice || 0) * lightningQty) * (1 - (lightningDiscount || 0) / 100) * (1 + (lightningTax || 0) / 100)).toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={handleConfirmLightningItem}
                          title="Add Item (Enter)"
                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-100 font-medium">
                  {currentTab.items.map((item, index) => (
                    <tr
                      key={item.tempId}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (isNaN(dragIndex) || dragIndex === index) return;
                        const newItems = [...currentTab.items];
                        const [moved] = newItems.splice(dragIndex, 1);
                        newItems.splice(index, 0, moved);
                        updateCurrentTab({ 
                          items: newItems,
                          ...(currentTab.isWarrantyBill ? { isWarrantyPrintingEnabled: false } : {})
                        });
                      }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-2 px-1 text-center border-r border-slate-200 bg-slate-50/50 w-10 text-xs text-slate-500 font-mono select-none">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 font-bold select-none px-0.5"
                            title="Drag to reorder row"
                          >
                            ⋮⋮
                          </span>
                          <span>{index + 1}</span>
                        </div>
                      </td>

                      {/* Item Name & Batch */}
                      <td className="py-2 px-3 border-r border-slate-200 relative">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            handleUpdateItemRow(item.tempId, { name: e.target.value });
                            setActiveMedDropdownTempId(item.tempId);
                            setTableMedSelectedIndex(0);
                          }}
                          onKeyDown={(e) => {
                            const filteredMeds = medicines
                              .filter(m => m.name.toLowerCase().includes(item.name.toLowerCase()) || m.barcode.toLowerCase().includes(item.name.toLowerCase()))
                              .slice(0, 10);
                            if (activeMedDropdownTempId === item.tempId && filteredMeds.length > 0) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setTableMedSelectedIndex(prev => (prev + 1) % filteredMeds.length);
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setTableMedSelectedIndex(prev => (prev - 1 + filteredMeds.length) % filteredMeds.length);
                              } else if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (filteredMeds[tableMedSelectedIndex]) {
                                  const m = filteredMeds[tableMedSelectedIndex];
                                  handleUpdateItemRow(item.tempId, {
                                    medicineId: m.id,
                                    name: m.name,
                                    batchNumber: m.batchNumber || '',
                                    expiryDate: m.expiryDate || '',
                                    mrp: m.mrp || 0,
                                    pricePerUnit: m.sellingPrice || m.mrp || 0,
                                    unit: m.unit || 'Box'
                                  });
                                  setActiveMedDropdownTempId(null);
                                  setTableMedSelectedIndex(0);
                                }
                              } else if (e.key === 'Escape') {
                                setActiveMedDropdownTempId(null);
                              }
                            }
                          }}
                          placeholder="Medicine / Item name"
                          onClick={() => setActiveMedDropdownTempId(item.tempId)}
                          onFocus={() => setActiveMedDropdownTempId(item.tempId)}
                          className="w-full font-bold text-slate-900 bg-transparent focus:bg-white focus:border focus:border-blue-400 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        />
                        {!settings.print?.tableColumns?.batchNo && item.batchNumber && (
                          <div className="text-[10px] text-slate-400 font-mono px-1.5">
                            Batch: {item.batchNumber}
                          </div>
                        )}

                        {/* Medicine Autocomplete Dropdown */}
                        {activeMedDropdownTempId === item.tempId && (
                          <div 
                            className="absolute left-0 top-full mt-0.5 w-[620px] sm:w-[760px] max-w-[90vw] bg-white border-2 border-blue-400 rounded-xl shadow-2xl z-[9999] max-h-80 overflow-y-auto ring-4 ring-blue-500/10"
                            onMouseDown={e => e.preventDefault()}
                          >
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between sticky top-0 z-10">
                              <span className="flex items-center gap-1.5 text-blue-600">
                                <Plus className="w-3.5 h-3.5" /> Select Medicine
                              </span>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-6 text-[10px] tracking-wider text-slate-500 uppercase font-bold">
                                  {settings.transaction?.showSalePriceInAutocomplete !== false && <span className="w-20 text-right">Sale Price</span>}
                                  {settings.transaction?.showPurchasePriceInAutocomplete !== false && <span className="w-20 text-right text-amber-800">Pur. Rate</span>}
                                  {settings.transaction?.showStockInAutocomplete !== false && <span className="w-16 text-right">Stock</span>}
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); setActiveMedDropdownTempId(null); }}
                                  className="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded hover:bg-slate-200"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            {medicines
                              .filter(m => !item.name || m.name.toLowerCase().includes(item.name.toLowerCase()) || (m.barcode && m.barcode.toLowerCase().includes(item.name.toLowerCase())) || (m.genericName && m.genericName.toLowerCase().includes(item.name.toLowerCase())))
                              .slice(0, 15)
                              .map((m, idx) => {
                                const showBatch = settings.transaction?.showBatchInAutocomplete !== false;
                                const showStock = settings.transaction?.showStockInAutocomplete !== false;
                                const showMrp = settings.transaction?.showMrpInAutocomplete !== false;
                                const showPurRate = settings.transaction?.showPurchasePriceInAutocomplete !== false;
                                const showSaleRate = settings.transaction?.showSalePriceInAutocomplete !== false;
                                const showExpDate = settings.transaction?.showExpDateInAutocomplete && m.expiryDate;

                                const subDetails: string[] = [];
                                if (showBatch && m.batchNumber) subDetails.push(`Batch: ${m.batchNumber}`);
                                if (showMrp && (m.mrp || m.mrp === 0)) subDetails.push(`MRP: Rs ${m.mrp}`);
                                if (showExpDate && m.expiryDate) subDetails.push(`Exp: ${m.expiryDate}`);
                                if (m.unit) subDetails.push(`Unit: ${m.unit}`);

                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateItemRow(item.tempId, {
                                        medicineId: m.id,
                                        name: m.name,
                                        batchNumber: m.batchNumber || '',
                                        expiryDate: m.expiryDate || '',
                                        mrp: m.mrp || 0,
                                        pricePerUnit: m.sellingPrice || m.mrp || 0,
                                        unit: m.unit || 'Box'
                                      });
                                      setActiveMedDropdownTempId(null);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 text-xs border-b border-slate-100 flex justify-between items-center transition cursor-pointer ${
                                      idx === tableMedSelectedIndex ? 'bg-blue-100 font-bold text-slate-900' : 'hover:bg-blue-50'
                                    }`}
                                  >
                                    <div className="pr-3 min-w-0 flex-1">
                                      <div className="font-bold text-slate-900 text-xs truncate">{m.name}</div>
                                      <div className="text-[10px] text-slate-500 mt-0.5">{subDetails.join(' • ') || (m.unit || 'Box')}</div>
                                    </div>
                                    <div className="flex items-center gap-6 flex-shrink-0 font-mono text-xs">
                                      {showSaleRate && (
                                        <div className="w-20 text-right font-bold text-blue-700">Rs {m.sellingPrice || m.mrp || 0}</div>
                                      )}
                                      {showPurRate && (
                                        <div className="w-20 text-right font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                          Rs {m.purchasePrice || 0}
                                        </div>
                                      )}
                                      {showStock && (
                                        <div className={`w-16 text-right font-bold ${Number(m.quantity) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {m.quantity}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </td>

                      {/* HSN/SAC */}
                      {settings.print?.tableColumns?.hsnSac && (
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={item.hsnCode || ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { hsnCode: e.target.value })}
                            placeholder="HSN"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                          />
                        </td>
                      )}

                      {/* Batch No */}
                      {(settings.print?.tableColumns?.batchNo || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={item.batchNumber || ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { batchNumber: e.target.value })}
                            placeholder="Batch"
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-medium"
                          />
                        </td>
                      )}

                      {/* Exp Date */}
                      {(settings.print?.tableColumns?.expDate || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={item.expiryDate ? item.expiryDate.slice(0, 10) : ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { expiryDate: e.target.value })}
                            className="w-24 px-1 py-1 border border-slate-200 rounded text-xs font-mono text-center bg-white"
                          />
                        </td>
                      )}

                      {/* Mfg Date */}
                      {settings.print?.tableColumns?.mfgDate && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="date"
                            value={item.mfgDate ? item.mfgDate.slice(0, 10) : ''}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { mfgDate: e.target.value })}
                            className="w-24 px-1 py-1 border border-slate-200 rounded text-xs font-mono text-center bg-white"
                          />
                        </td>
                      )}

                      {/* MRP */}
                      {(settings.print?.tableColumns?.mrp || currentTab.isWarrantyBill) && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            type="number"
                            value={item.mrp || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { mrp: parseFloat(e.target.value) || 0 })}
                            className="w-20 px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                      )}

                      {/* Quantity */}
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <input
                          data-scell={`quantity-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity === 0 ? '0' : item.quantity}
                          onFocus={(e) => {
                            setActiveMedDropdownTempId(null);
                            e.target.select();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              if (index + 1 < currentTab.items.length) focusSaleTableCell(index + 1, 'quantity');
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              if (index > 0) focusSaleTableCell(index - 1, 'quantity');
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (showDiscountCol) {
                                focusSaleTableCell(index, 'discount');
                              } else {
                                focusSaleTableCell(index, 'price');
                              }
                            }
                          }}
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleUpdateItemRow(item.tempId, { quantity: isNaN(parsed) ? 0 : parsed });
                          }}
                          className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                        />
                      </td>

                      {/* Free Qty */}
                      {settings.transaction?.freeItemQuantity && (
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            value={item.freeQuantity || 0}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { freeQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg text-center font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                          />
                        </td>
                      )}

                      {/* Discount % (Dedicated Vertical Column Next to QTY) */}
                      {showDiscountCol && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            data-scell={`discount-${index}`}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountPercentage === 0 ? '0' : (item.discountPercentage || 0)}
                            onFocus={(e) => {
                              setActiveMedDropdownTempId(null);
                              e.target.select();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (index + 1 < currentTab.items.length) focusSaleTableCell(index + 1, 'discount');
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (index > 0) focusSaleTableCell(index - 1, 'discount');
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                focusSaleTableCell(index, 'price');
                              }
                            }}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { discountPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                            placeholder="0"
                          />
                        </td>
                      )}

                      {/* Unit */}
                      {settings.print?.tableColumns?.unit !== false && (
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <select
                            value={item.unit || 'Box'}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { unit: e.target.value })}
                            className="w-20 px-1 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          >
                            {UNIT_OPTIONS.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Price / Unit */}
                      <td className="py-2 px-2 text-right relative border-r border-slate-200">
                        <div className="flex items-center justify-end">
                          <input
                            data-scell={`price-${index}`}
                            type="number"
                            value={item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice}
                            onFocus={(e) => {
                              e.target.select();
                              if (settings.transaction?.showRecentRatesOnFocus !== false && (item.medicineId || item.name)) {
                                setActivePriceRowId(item.tempId);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (index + 1 < currentTab.items.length) focusSaleTableCell(index + 1, 'price');
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (index > 0) focusSaleTableCell(index - 1, 'price');
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                setActivePriceRowId(null);
                                setShowPriceDropdownManual(null);
                                if (settings.print?.tableColumns?.taxPercent) {
                                  focusSaleTableCell(index, 'tax');
                                } else {
                                  if (index + 1 < currentTab.items.length) {
                                    focusSaleTableCell(index + 1, 'quantity');
                                  } else {
                                    receivedAmountInputRef.current?.focus();
                                    receivedAmountInputRef.current?.select();
                                  }
                                }
                              }
                            }}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-1.5 py-1 border border-slate-200 rounded-lg text-right font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none text-xs"
                          />
                          {(item.medicineId || item.name) && (
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPriceDropdownManual(prev => prev === item.tempId ? null : item.tempId);
                                setActivePriceRowId(item.tempId);
                              }}
                              title="Show Last 5 Sale Rates & Company"
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition shrink-0 ml-0.5"
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Historical Sale Prices Dropdown */}
                        <HistoricalPriceDropdown
                          medicineId={item.medicineId}
                          itemName={item.name}
                          companyName={(() => {
                            const med = medicines.find(m => m.id === item.medicineId || (m.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim()));
                            return med?.manufacturer || (item as any).company || '';
                          })()}
                          transactionType="Sale"
                          currentPrice={Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0}
                          onSelectPrice={(p) => handleUpdateItemRow(item.tempId, { pricePerUnit: p })}
                          isOpen={
                            (activePriceRowId === item.tempId && (settings.transaction?.showRecentRatesOnFocus !== false || showPriceDropdownManual === item.tempId)) ||
                            showPriceDropdownManual === item.tempId
                          }
                          onClose={() => {
                            setActivePriceRowId(null);
                            setShowPriceDropdownManual(null);
                          }}
                          showCompany={settings.transaction?.showCompanyInRecentRates !== false}
                          onOpenSettings={() => setIsSettingsOpen(true)}
                        />
                        {activePriceRowId === item.tempId && (() => {
                          const matchedMed = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                          const avgCost = matchedMed ? (matchedMed.purchasePrice || 0) : 0;
                          const currentSell = Number(item.pricePerUnit !== undefined ? item.pricePerUnit : item.sellingPrice) || 0;
                          const isBelow = currentSell > 0 && avgCost > 0 && currentSell < avgCost;
                          if (!isBelow && avgCost <= 0) return null;
                          return (
                            <div className="absolute right-0 top-[calc(100%+8rem)] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5 w-48 text-left">
                              {avgCost > 0 && (
                                <div className="text-[10px] text-slate-600 flex justify-between font-mono mb-1">
                                  <span>Avg Cost:</span>
                                  <span className="font-bold">Rs {avgCost}</span>
                                </div>
                              )}
                              {isBelow && (
                                <div className="p-1 rounded bg-rose-50 text-rose-700 text-[9px] font-bold">
                                  ⚠ Selling Below Cost!
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Tax % */}
                      {settings.print?.tableColumns?.taxPercent && (
                        <td className="py-2 px-2 text-right border-r border-slate-200">
                          <input
                            data-scell={`tax-${index}`}
                            type="number"
                            value={item.taxPercentage || 0}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (index + 1 < currentTab.items.length) {
                                  focusSaleTableCell(index + 1, 'quantity');
                                } else {
                                  receivedAmountInputRef.current?.focus();
                                  receivedAmountInputRef.current?.select();
                                }
                              }
                            }}
                            onChange={(e) => handleUpdateItemRow(item.tempId, { taxPercentage: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 border border-slate-200 rounded text-right font-mono text-xs"
                            placeholder="%"
                          />
                        </td>
                      )}

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        Rs {(item.total || 0).toLocaleString()}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => handleDeleteItemRow(item.tempId)}
                          title="Remove item"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {currentTab.items.length === 0 && (
                    <tr>
                      <td colSpan={14} className="py-8 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <p className="text-xs font-bold text-slate-500">
                            No items added yet. Use the rapid entry search above (⚡), click <strong>ADD ROW</strong>, or load a quick template:
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('med_pack')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>💊</span> Standard Med Pack
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('first_aid')}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors border border-emerald-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>🩹</span> First Aid & Surgical
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate('syrups')}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors border border-purple-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <span>🧪</span> Syrups & Drops
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Action & Subtotal Ribbon (Desktop) */}
            <div className="hidden md:flex bg-slate-50 border-t border-slate-200 px-4 py-3 flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD ROW</span>
              </button>

              <div className="flex items-center gap-8 text-xs font-bold">
                <div className="text-slate-600">
                  TOTAL QTY: <span className="font-mono text-slate-900 font-black ml-1">{totalQty}</span>
                </div>
                <div className="text-slate-600">
                  SUBTOTAL: <span className="font-mono text-blue-900 font-black text-sm ml-1">Rs {rawSubtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Mobile Tax, Discount, Charges, Round Off & Payment Panel (Matching reference image) */}
          <div className="md:hidden bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
              Tax, Discount & Charges
            </div>

            {/* Discount Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">Discount</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentTab.discountPercentage || ''}
                    onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                    className="w-12 text-right text-xs font-mono font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 font-bold ml-1">%</span>
                </div>

                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                  <span className="text-slate-400 font-bold mr-1">Rs</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentTab.discountAmount || ''}
                    onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                    className="w-20 text-right text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Tax Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700">Tax</span>
              <div className="flex items-center gap-2">
                <select
                  value={currentTab.taxPercentage || 0}
                  onChange={(e) => updateCurrentTab({ taxPercentage: parseFloat(e.target.value) || 0 })}
                  className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={0}>None (0%)</option>
                  <option value={5}>GST @ 5%</option>
                  <option value={12}>GST @ 12%</option>
                  <option value={17}>GST @ 17%</option>
                  <option value={18}>GST @ 18%</option>
                </select>
                <span className="font-mono text-slate-600 font-bold min-w-[50px] text-right">
                  Rs {((rawSubtotal * (currentTab.taxPercentage || 0)) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Round Off Row */}
            <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={currentTab.isRoundOff ?? true}
                  onChange={(e) => updateCurrentTab({ isRoundOff: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-700">Round Off</span>
              </label>
              <span className="font-mono text-slate-600 font-bold text-xs">
                Rs {currentTab.isRoundOff ? effectiveRoundOff.toFixed(2) : '0.00'}
              </span>
            </div>

            {/* Total Amount Row (Large & Bold) */}
            <div className="flex items-center justify-between gap-3 py-2 border-t border-slate-300">
              <span className="font-black text-sm text-slate-900">Total Amount</span>
              <span className="font-black text-lg text-blue-700 font-mono">
                Rs {Math.round(finalGrandTotal).toLocaleString()}
              </span>
            </div>

            {/* Payment Type */}
            <div className="flex items-center justify-between gap-3 text-xs pt-1">
              <span className="font-semibold text-slate-700">Payment Type</span>
              <select
                value={currentTab.isCredit ? 'Credit' : (currentTab.paymentTerms || 'Cash')}
                onChange={(e) => {
                  const val = e.target.value;
                  const isCreditVal = val === 'Credit';
                  updateCurrentTab({
                    isCredit: isCreditVal,
                    paymentTerms: val,
                    receivedAmount: isCreditVal ? 0 : Math.round(finalGrandTotal)
                  });
                }}
                className="py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Cash">💵 Cash</option>
                <option value="Credit">💳 Credit (Udhaar)</option>
                <option value="Bank">🏦 Bank</option>
                <option value="UPI">📱 UPI / Online</option>
                <option value="Cheque">📜 Cheque</option>
              </select>
            </div>

            {/* Received Amount if not purely credit */}
            {!currentTab.isCredit && (
              <div className="flex items-center justify-between gap-3 text-xs pt-1">
                <span className="font-semibold text-slate-700">Received Amount</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">Rs</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={currentTab.receivedAmount === 0 ? '' : currentTab.receivedAmount}
                    placeholder="0"
                    onChange={(e) => updateCurrentTab({ receivedAmount: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right font-bold text-xs py-1 px-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Description (Optional) */}
            <div className="pt-1">
              <input
                type="text"
                placeholder="Description / Remarks (Optional)..."
                value={currentTab.description || ''}
                onChange={(e) => updateCurrentTab({ description: e.target.value })}
                className="w-full py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Bottom Grid: Left Attachments & Remarks vs Right Calculation Panel (Desktop) */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Left Column: Description, Image & Document triggers */}
            <div className="lg:col-span-7 space-y-3">
              
              <div className="flex flex-wrap gap-2">
                {settings.transaction?.showDescriptionNotes !== false && (
                  <button
                    type="button"
                    onClick={() => setShowDescription(!showDescription)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      showDescription || currentTab.description
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    + ADD DESCRIPTION
                  </button>
                )}

                {settings.transaction?.showAddImageDoc !== false && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImageUpload(true);
                        imageInputRef.current?.click();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        currentTab.imageAttachment
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {currentTab.imageAttachment ? 'Image Attached' : '+ ADD IMAGE'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDocUpload(true);
                        docInputRef.current?.click();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        currentTab.documentAttachment
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {currentTab.documentAttachment ? 'Document Attached' : '+ ADD DOCUMENT'}
                    </button>
                  </>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleDocFileChange}
                className="hidden"
              />

              {/* Description / Notes Box */}
              {(showDescription || currentTab.description) && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Invoice Notes / Delivery Instructions / Remarks:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter notes or terms to be printed on this invoice..."
                    value={currentTab.description}
                    onChange={(e) => updateCurrentTab({ description: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Image Preview if uploaded */}
              {currentTab.imageAttachment && (
                <div className="relative inline-block p-2 border border-slate-200 rounded-xl bg-slate-50">
                  <img
                    src={currentTab.imageAttachment}
                    alt="Invoice Attachment"
                    className="w-32 h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => updateCurrentTab({ imageAttachment: undefined })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs shadow"
                  >
                    ✕
                  </button>
                </div>
              )}

            </div>

            {/* Right Column: Financial Calculation Box */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 font-medium text-xs">
              
              {/* Discount Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-bold">Discount:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTab.discountPercentage || ''}
                      onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                      className="w-12 text-right text-xs font-mono font-bold focus:outline-none"
                    />
                    <span className="text-slate-400 font-bold ml-1">%</span>
                  </div>

                  <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1">
                    <span className="text-slate-400 font-bold mr-1">Rs</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentTab.discountAmount || ''}
                      onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Row */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-bold">Tax / GST:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={currentTab.taxPercentage}
                    onChange={(e) => updateCurrentTab({ taxPercentage: parseFloat(e.target.value) || 0 })}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                  >
                    <option value={0}>NONE (0%)</option>
                    <option value={5}>GST 5%</option>
                    <option value={12}>GST 12%</option>
                    <option value={18}>GST 18%</option>
                  </select>
                  <span className="font-mono font-bold text-slate-700 w-24 text-right">
                    Rs {calculatedTaxAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Round Off */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={currentTab.isRoundOff}
                    onChange={(e) => updateCurrentTab({ isRoundOff: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Round Off:</span>
                </label>
                <span className="font-mono text-slate-500">
                  {effectiveRoundOff >= 0 ? `+${effectiveRoundOff}` : effectiveRoundOff}
                </span>
              </div>

              {/* Grand Total Box */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-slate-300 text-sm">
                <span className="font-black text-slate-900">Total:</span>
                <div className="bg-white border-2 border-blue-600 px-3 py-1.5 rounded-xl font-black font-mono text-lg text-blue-900 shadow-xs">
                  Rs {finalGrandTotal.toLocaleString()}
                </div>
              </div>

              {/* Received Amount vs Balance Due */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-700 font-bold">Received Amount:</span>
                <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 py-1">
                  <span className="text-slate-400 mr-1 font-bold">Rs</span>
                  <input
                    ref={receivedAmountInputRef}
                    type="number"
                    value={effectiveReceivedAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateCurrentTab({ receivedAmount: parseFloat(e.target.value) || 0 })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleInitiateSave('save');
                      } else if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        saveButtonRef.current?.focus();
                      }
                    }}
                    className="w-24 text-right font-mono font-bold text-emerald-700 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Balance Due:</span>
                <span className={`font-mono text-sm ${effectiveBalanceDue > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
                  Rs {effectiveBalanceDue.toLocaleString()}
                </span>
              </div>

            </div>

          </div>

          </div>

        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex-shrink-0 gap-3">
          
          <div className="hidden sm:flex text-xs text-slate-500 items-center gap-2 flex-wrap">
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
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Ctrl+P</kbd> Print</span>
            <span className="text-slate-300">•</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Alt+N</kbd> Save & New</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {errorMessage && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse max-w-sm sm:max-w-md truncate">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="truncate" title={errorMessage}>{errorMessage}</span>
              </div>
            )}
            
            {/* Discard / Cancel Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleRequestClose}
              title="Close & discard changes (Esc)"
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {/* Quick Print Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleTriggerPrint}
              title="Trigger browser print dialog (Ctrl+P)"
              className="hidden sm:flex px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] font-mono">Ctrl+P</kbd>
            </button>

            {/* Save & Print Button (Hidden on mobile per user request) */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleInitiateSave('save_and_print')}
              title="Save invoice and trigger print dialog"
              className="hidden sm:flex px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition-colors items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Printer className="w-3.5 h-3.5 text-emerald-600" />}
              <span>Save & Print</span>
            </button>

            {/* Save & New split button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleInitiateSave('save_and_new')}
              className="flex px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer items-center justify-center"
            >
              Save & New
            </button>

            {/* Primary Save Button */}
            <button
              ref={saveButtonRef}
              type="button"
              disabled={isSaving}
              onClick={() => handleInitiateSave('save')}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0070f3] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{isSaving ? 'Saving...' : `Save ${currentTab?.transactionType === 'Sale Return' ? 'Return' : currentTab?.transactionType || initialInvoice?.transactionType || defaultTransactionType || 'Sale'}`}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Sub-modals inside AddSale */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onInsertValue={(val) => {
          if (activeCalcTarget === 'received') {
            updateCurrentTab({ receivedAmount: val });
          } else {
            setLightningPrice(val);
          }
        }}
      />

      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        onSave={handlePartyCreated}
      />

      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title="Scan Product Barcode (Add Sale POS)"
      />

      {/* Invoice Print & Export Preview Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintInvoiceData(null);
          setAutoTriggerPrint(false);
        }}
        invoice={printInvoiceData}
        autoPrint={autoTriggerPrint}
        onUpdateInvoice={(updatedInvoice) => {
          setPrintInvoiceData(updatedInvoice);
        }}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsCheatSheetModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        context="sale"
      />

      {/* Transaction Save & Confirmation Modal */}
      <TransactionSaveConfirmModal
        isOpen={showSaveConfirmModal}
        type="sale"
        transactionTitle={currentTab?.invoiceNumber || 'INV-NEW'}
        partyLabel="Customer"
        partyName={currentTab?.customerName || 'Walk-in Customer'}
        partyContact={currentTab?.customerPhone}
        itemCount={currentTab?.items.filter(it => it.name && it.name.trim().length > 0 && Number(it.quantity) > 0).length || 0}
        totalQuantity={currentTab?.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0}
        subtotal={rawSubtotal}
        discountAmount={currentTab?.discountAmount || 0}
        taxAmount={calculatedTaxAmount}
        grandTotal={finalGrandTotal}
        paidAmount={effectiveReceivedAmount}
        balanceDue={effectiveBalanceDue}
        isSaving={isSaving}
        paymentType={currentTab?.isCredit ? 'Credit' : 'Cash'}
        onConfirm={async () => {
          setShowSaveConfirmModal(false);
          await handleSaveInvoice(pendingSaveMode);
        }}
        onSaveAndNew={async () => {
          setShowSaveConfirmModal(false);
          await handleSaveInvoice('save_and_new');
        }}
        onSaveAndPrint={async () => {
          setShowSaveConfirmModal(false);
          await handleSaveInvoice('save_and_print');
        }}
        onClose={() => {
          setShowSaveConfirmModal(false);
          setTimeout(() => {
            receivedAmountInputRef.current?.focus();
            receivedAmountInputRef.current?.select();
          }, 60);
        }}
      />

      {/* Below-Cost Loss Dual Confirmation Hard Prompt Modal */}
      <LossSaleHardPromptModal
        isOpen={showLossPromptModal}
        onClose={() => {
          setShowLossPromptModal(false);
          setIsSaving(false);
        }}
        lossItems={lossPromptItems}
        grandTotal={finalGrandTotal}
        onConfirm={async () => {
          setShowLossPromptModal(false);
          setLossAuthorized(true);
          // Proceed with save with authorization flag set
          await handleSaveInvoice(pendingLossMode);
          setLossAuthorized(false);
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
                  You have active items or details entered in this {currentTab?.transactionType || 'Sale'}. Are you sure you want to close? All unsaved items will be lost.
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

    </div>
  );
};
