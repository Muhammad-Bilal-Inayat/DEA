import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Printer, Share2, MoreVertical, FileSpreadsheet, 
  ChevronDown, Filter, Trash2, Eye, Edit3, DollarSign, 
  ShoppingBag, Truck, RotateCcw, FileText, CheckCircle2, 
  AlertCircle, ArrowUpDown, X, Building2, User, Globe, 
  RefreshCw, Check, ArrowDownRight, Wallet, Sparkles, ExternalLink, Keyboard,
  Package, Zap, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { dbSuppliers, dbPurchaseOrders, dbMedicines, dbPartyPayments, dbAuditLogs } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import { unifiedSyncService } from '../lib/syncService';
import { Supplier, PurchaseOrder, Medicine, PartyPayment, AuditLog } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { AddPurchaseModal } from '../components/purchases/AddPurchaseModal';
import { AddPaymentOutModal } from '../components/purchases/AddPaymentOutModal';
import { PurchasePrintModal } from '../components/purchases/PurchasePrintModal';
import { PurchaseShareModal } from '../components/purchases/PurchaseShareModal';
import { PaymentOutPrintModal } from '../components/purchases/PaymentOutPrintModal';
import { PaymentVoucherPrintModal } from '../components/common/PaymentVoucherPrintModal';
import { EditPaymentModal } from '../components/parties/EditPaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { KeyboardShortcutsCheatSheetModal } from '../components/common/KeyboardShortcutsCheatSheetModal';
import { ReportFilterBar, DatePreset } from '../components/common/ReportFilterBar';
import { ColumnHeader } from '../components/common/ColumnHeader';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export type PurchaseSubView = 'bills' | 'payment-out' | 'order' | 'return';

interface PurchaseSubMenuConfig {
  id: PurchaseSubView;
  label: string;
  urduLabel: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  btnLabel: string;
}

const PURCHASE_SUBMENUS: PurchaseSubMenuConfig[] = [
  {
    id: 'bills',
    label: 'Purchase Bills',
    urduLabel: 'خریداری بل',
    path: '/purchase/bills',
    icon: ShoppingBag,
    color: 'blue',
    btnLabel: 'Add Purchase'
  },
  {
    id: 'payment-out',
    label: 'Payment Out',
    urduLabel: 'ادائیگی واؤچر',
    path: '/purchase/payment-out',
    icon: DollarSign,
    color: 'rose',
    btnLabel: 'Add Payment Out'
  },
  {
    id: 'order',
    label: 'Purchase Order',
    urduLabel: 'خریداری آرڈر',
    path: '/purchase/order',
    icon: Truck,
    color: 'purple',
    btnLabel: 'Add Purchase Order'
  },
  {
    id: 'return',
    label: 'Purchase Return/ Dr. Note',
    urduLabel: 'خریداری واپسی',
    path: '/purchase/return',
    icon: RotateCcw,
    color: 'amber',
    btnLabel: 'Add Purchase Return'
  }
];

export const Purchases: React.FC = () => {
  const { business } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Orders, payments and master data state
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States for Purchases
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<PurchaseOrder | null>(null);
  const [sharingOrder, setSharingOrder] = useState<PurchaseOrder | null>(null);

  // Modal States for Payment Out
  const [isAddPaymentOutOpen, setIsAddPaymentOutOpen] = useState(false);
  const [prefillSupplierId, setPrefillSupplierId] = useState<string | undefined>();
  const [prefillSupplierName, setPrefillSupplierName] = useState<string | undefined>();
  const [prefillAmount, setPrefillAmount] = useState<number | undefined>();
  const [prefillOrderId, setPrefillOrderId] = useState<string | undefined>();
  const [printingPayment, setPrintingPayment] = useState<PartyPayment | null>(null);

  // Payment Edit & Unified Print State
  const [selectedPrintPayment, setSelectedPrintPayment] = useState<PartyPayment | null>(null);
  const [isPrintPaymentModalOpen, setIsPrintPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PartyPayment | null>(null);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);

  const handleViewPayment = (p: PartyPayment) => {
    setSelectedPrintPayment(p);
    setIsPrintPaymentModalOpen(true);
  };

  const handleEditPayment = (p: PartyPayment) => {
    setEditingPayment(p);
    setIsEditPaymentModalOpen(true);
  };

  const handlePaymentUpdated = (updatedPayment: PartyPayment, updatedParty?: Supplier) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    if (updatedParty) {
      setSuppliers(prev => prev.map(s => s.id === updatedParty.id ? updatedParty : s));
    }
    loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    showToast(`Payment Out voucher #${updatedPayment.referenceNumber || 'PAY'} updated successfully.`);
  };

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Active sub-view from URL
  const activeSubView: PurchaseSubView = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/purchase/payment-out')) return 'payment-out';
    if (path.includes('/purchase/order')) return 'order';
    if (path.includes('/purchase/return')) return 'return';
    return 'bills';
  }, [location.pathname]);

  const currentSubMenu = useMemo(() => {
    return PURCHASE_SUBMENUS.find(s => s.id === activeSubView) || PURCHASE_SUBMENUS[0];
  }, [activeSubView]);

  // Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('This Month');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('ALL');
  const [selectedFirm, setSelectedFirm] = useState<string>('ALL FIRMS');
  const [selectedUser, setSelectedUser] = useState<string>('ALL USERS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Table Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Column Popover Filter State
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [colFilters, setColFilters] = useState<{
    supplier: string;
    status: string;
    paymentType: string;
    paymentMode: string;
  }>({
    supplier: 'ALL',
    status: 'ALL',
    paymentType: 'ALL',
    paymentMode: 'ALL',
  });

  // Action Menu Dropdown
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Expandable invoice items state
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Global F12 or ? listener on Purchases page (when no modal is active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddModalOpen || isAddPaymentOutOpen || Boolean(printingOrder) || Boolean(sharingOrder) || isPrintPaymentModalOpen) return;
      if (e.key === 'F12' || (e.key === '?' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isAddPaymentOutOpen, printingOrder, sharingOrder, isPrintPaymentModalOpen]);

  // Delete State
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<PurchaseOrder | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<PartyPayment | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  // High-Speed Unlimited Engine Pagination for Purchases
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(50);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Check URL query parameters (e.g. /purchase/payment-out?action=add or /purchase?action=add)
  const actionParam = searchParams.get('action');
  useEffect(() => {
    if (actionParam === 'add') {
      if (activeSubView === 'payment-out') {
        setPrefillSupplierId(undefined);
        setPrefillSupplierName(undefined);
        setPrefillAmount(undefined);
        setPrefillOrderId(undefined);
        setIsAddPaymentOutOpen(true);
      } else {
        setEditingOrder(null);
        setIsAddModalOpen(true);
      }
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }

    const handleOpenPurchase = () => {
      setEditingOrder(null);
      setIsAddModalOpen(true);
    };

    window.addEventListener('mbi-open-add-purchase', handleOpenPurchase);
    return () => window.removeEventListener('mbi-open-add-purchase', handleOpenPurchase);
  }, [actionParam, activeSubView]);

  useEffect(() => {
    loadAllData();

    // Listen for live cross-tab & cross-browser synchronization
    const unsubLegacy = syncEngine.onSyncMessage(() => {
      loadAllData();
    });

    const unsubUnified = unifiedSyncService.onEntityChange((payload) => {
      if (!payload.storeName || payload.storeName === 'purchaseOrders' || payload.storeName === 'partyPayments' || payload.storeName === 'all') {
        loadAllData();
      }
    });

    const handleStorageChange = () => {
      loadAllData();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mbi-data-synced', handleStorageChange);
    window.addEventListener('mbi-local-db-change', handleStorageChange);

    return () => {
      unsubLegacy();
      unsubUnified();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mbi-data-synced', handleStorageChange);
      window.removeEventListener('mbi-local-db-change', handleStorageChange);
    };
  }, []);

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [poData, suppData, medData, paymentData] = await Promise.all([
        dbPurchaseOrders.getAll(),
        dbSuppliers.getAll(),
        dbMedicines.getAll(),
        dbPartyPayments.getAll()
      ]);

      // Sort newest first with timestamp and poNumber tie-breaking
      poData.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        const diff = timeB - timeA;
        if (diff !== 0) return diff;
        const numA = parseInt(a.poNumber?.replace(/\D/g, '') || '0');
        const numB = parseInt(b.poNumber?.replace(/\D/g, '') || '0');
        return numB - numA;
      });

      setOrders(poData);
      setSuppliers(suppData);
      setMedicines(medData);

      // Filter only PAYMENT_OUT payments
      const outPayments = paymentData
        .filter(p => p.type === 'PAYMENT_OUT')
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || a.date).getTime();
          const timeB = new Date(b.createdAt || b.date).getTime();
          return timeB - timeA;
        });
      setPayments(outPayments);
    } catch (err) {
      console.error('Failed to load purchase data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Dynamic Column Filter Options
  const supplierColumnOptions = useMemo(() => {
    const list = activeSubView === 'payment-out'
      ? payments.map(p => p.partyName).filter(Boolean)
      : orders.filter(o => {
          if (activeSubView === 'bills') return (o.transactionType || 'Purchase') === 'Purchase';
          if (activeSubView === 'order') return o.transactionType === 'Purchase Order';
          if (activeSubView === 'return') return o.transactionType === 'Purchase Return';
          return true;
        }).map(o => o.supplierName || o.partyName).filter(Boolean);
    const counts: Record<string, number> = {};
    list.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
    const unique = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { label: 'All Suppliers / Parties', value: 'ALL', count: list.length },
      ...unique.map(name => ({ label: name, value: name, count: counts[name] }))
    ];
  }, [activeSubView, payments, orders]);

  const paymentTypeColumnOptions = useMemo(() => {
    const targetOrders = orders.filter(o => {
      if (activeSubView === 'bills') return (o.transactionType || 'Purchase') === 'Purchase';
      if (activeSubView === 'order') return o.transactionType === 'Purchase Order';
      if (activeSubView === 'return') return o.transactionType === 'Purchase Return';
      return true;
    });
    const cashCount = targetOrders.filter(o => (o.paymentType || 'Cash').toLowerCase() === 'cash').length;
    const creditCount = targetOrders.filter(o => (o.paymentType || '').toLowerCase() === 'credit').length;
    const bankCount = targetOrders.filter(o => {
      const pt = (o.paymentType || '').toLowerCase();
      return pt.includes('bank') || pt.includes('online') || pt.includes('transfer');
    }).length;
    const chequeCount = targetOrders.filter(o => (o.paymentType || '').toLowerCase().includes('cheque')).length;
    return [
      { label: 'All Payment Types', value: 'ALL', count: targetOrders.length },
      { label: 'Cash', value: 'Cash', count: cashCount },
      { label: 'Credit / Khata', value: 'Credit', count: creditCount },
      { label: 'Bank Transfer', value: 'Bank Transfer', count: bankCount },
      { label: 'Cheque', value: 'Cheque', count: chequeCount },
    ].filter(opt => opt.value === 'ALL' || (opt.count && opt.count > 0));
  }, [orders, activeSubView]);

  const paymentModeColumnOptions = useMemo(() => {
    const cashCount = payments.filter(p => (p.paymentMode || 'Cash').toLowerCase() === 'cash').length;
    const bankCount = payments.filter(p => {
      const pm = (p.paymentMode || '').toLowerCase();
      return pm.includes('bank') || pm.includes('online') || pm.includes('transfer');
    }).length;
    const chequeCount = payments.filter(p => (p.paymentMode || '').toLowerCase().includes('cheque')).length;
    return [
      { label: 'All Payment Modes', value: 'ALL', count: payments.length },
      { label: 'Cash', value: 'Cash', count: cashCount },
      { label: 'Bank / Online', value: 'Bank', count: bankCount },
      { label: 'Cheque', value: 'Cheque', count: chequeCount },
    ].filter(opt => opt.value === 'ALL' || (opt.count && opt.count > 0));
  }, [payments]);

  const statusColumnOptions = useMemo(() => {
    const targetOrders = orders.filter(o => {
      if (activeSubView === 'bills') return (o.transactionType || 'Purchase') === 'Purchase';
      if (activeSubView === 'order') return o.transactionType === 'Purchase Order';
      if (activeSubView === 'return') return o.transactionType === 'Purchase Return';
      return true;
    });
    const paidCount = targetOrders.filter(o => (o.balanceDue || 0) <= 0 || o.status === 'Paid').length;
    const unpaidCount = targetOrders.filter(o => (o.balanceDue || 0) > 0 || o.status === 'Unpaid' || o.paymentType === 'Credit').length;
    return [
      { label: 'All Statuses', value: 'ALL', count: targetOrders.length },
      { label: 'Paid / Completed', value: 'PAID', count: paidCount },
      { label: 'Unpaid / Balance Due', value: 'UNPAID', count: unpaidCount },
    ];
  }, [orders, activeSubView]);

  // Filtered Orders based on active submenu, date range, supplier, status, column filters, and search query
  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      // 1. Transaction Type Subview Filter
      if (activeSubView === 'bills') {
        const type = po.transactionType || 'Purchase';
        if (type !== 'Purchase') return false;
      } else if (activeSubView === 'order') {
        if (po.transactionType !== 'Purchase Order') return false;
      } else if (activeSubView === 'return') {
        if (po.transactionType !== 'Purchase Return') return false;
      }

      // 2. Date filtering
      if (startDate && po.date) {
        const d = po.date.slice(0, 10);
        if (d < startDate) return false;
      }
      if (endDate && po.date) {
        const d = po.date.slice(0, 10);
        if (d > endDate) return false;
      }

      // 3. Supplier / Party filter (top bar OR column filter)
      const effectiveSupplier = colFilters.supplier !== 'ALL' ? colFilters.supplier : selectedSupplierFilter;
      if (effectiveSupplier && effectiveSupplier !== 'ALL') {
        if (po.supplierId !== effectiveSupplier && po.supplierName !== effectiveSupplier && po.partyName !== effectiveSupplier) {
          return false;
        }
      }

      // 4. Payment status filter (top bar OR column filter)
      const effectiveStatus = colFilters.status !== 'ALL' ? colFilters.status : selectedPaymentStatus;
      if (effectiveStatus && effectiveStatus !== 'ALL') {
        const isUnpaid = (po.balanceDue !== undefined && po.balanceDue > 0) || po.status === 'Unpaid' || po.paymentType === 'Credit';
        if (effectiveStatus === 'PAID' && isUnpaid) return false;
        if (effectiveStatus === 'UNPAID' && !isUnpaid) return false;
      }

      // 5. Payment Type column filter
      if (colFilters.paymentType !== 'ALL') {
        const pType = (po.paymentType || 'Cash').toLowerCase();
        if (!pType.includes(colFilters.paymentType.toLowerCase())) return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const party = (po.supplierName || po.partyName || '').toLowerCase();
        const num = (po.billNumber || po.poNumber || '').toLowerCase();
        const payment = (po.paymentType || '').toLowerCase();
        const items = (po.items || []).map(i => i.name.toLowerCase()).join(' ');
        if (!party.includes(q) && !num.includes(q) && !payment.includes(q) && !items.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        const diff = timeA - timeB;
        if (diff !== 0) return sortOrder === 'asc' ? diff : -diff;
        const numA = parseInt(a.poNumber?.replace(/\D/g, '') || '0');
        const numB = parseInt(b.poNumber?.replace(/\D/g, '') || '0');
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (sortField === 'billNumber' || sortField === 'poNumber') {
        const numA = a.billNumber || a.poNumber || '';
        const numB = b.billNumber || b.poNumber || '';
        return sortOrder === 'asc' ? numA.localeCompare(numB) : numB.localeCompare(numA);
      }
      if (sortField === 'supplierName' || sortField === 'partyName') {
        const sA = a.supplierName || a.partyName || '';
        const sB = b.supplierName || b.partyName || '';
        return sortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
      }
      if (sortField === 'paymentType') {
        const pA = a.paymentType || 'Cash';
        const pB = b.paymentType || 'Cash';
        return sortOrder === 'asc' ? pA.localeCompare(pB) : pB.localeCompare(pA);
      }
      if (sortField === 'totalAmount') {
        return sortOrder === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
      }
      if (sortField === 'balanceDue') {
        return sortOrder === 'asc' ? (a.balanceDue || 0) - (b.balanceDue || 0) : (b.balanceDue || 0) - (a.balanceDue || 0);
      }
      return 0;
    });
  }, [orders, activeSubView, startDate, endDate, selectedSupplierFilter, selectedPaymentStatus, colFilters, searchQuery, sortField, sortOrder]);

  // Filtered Payments Out based on date range, supplier, payment mode, and search query
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (startDate && p.date) {
        const d = p.date.slice(0, 10);
        if (d < startDate) return false;
      }
      if (endDate && p.date) {
        const d = p.date.slice(0, 10);
        if (d > endDate) return false;
      }

      // Supplier / Party filter
      const effectiveSupplier = colFilters.supplier !== 'ALL' ? colFilters.supplier : selectedSupplierFilter;
      if (effectiveSupplier && effectiveSupplier !== 'ALL') {
        if (p.partyId !== effectiveSupplier && p.partyName !== effectiveSupplier) {
          return false;
        }
      }

      // Payment Mode column filter
      if (colFilters.paymentMode !== 'ALL') {
        const mode = (p.paymentMode || 'Cash').toLowerCase();
        if (!mode.includes(colFilters.paymentMode.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const party = (p.partyName || '').toLowerCase();
        const ref = (p.referenceNumber || '').toLowerCase();
        const mode = (p.paymentMode || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        if (!party.includes(q) && !ref.includes(q) && !mode.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortOrder === 'asc' ? diff : -diff;
      }
      if (sortField === 'referenceNumber') {
        const rA = a.referenceNumber || '';
        const rB = b.referenceNumber || '';
        return sortOrder === 'asc' ? rA.localeCompare(rB) : rB.localeCompare(rA);
      }
      if (sortField === 'partyName') {
        return sortOrder === 'asc' ? a.partyName.localeCompare(b.partyName) : b.partyName.localeCompare(a.partyName);
      }
      if (sortField === 'paymentMode') {
        const mA = a.paymentMode || 'Cash';
        const mB = b.paymentMode || 'Cash';
        return sortOrder === 'asc' ? mA.localeCompare(mB) : mB.localeCompare(mA);
      }
      if (sortField === 'amount') {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [payments, startDate, endDate, selectedSupplierFilter, colFilters, searchQuery, sortField, sortOrder]);

  const activeTotalRecords = activeSubView === 'payment-out' ? filteredPayments.length : filteredOrders.length;
  const totalPages = pageSize === 'All' ? 1 : Math.max(1, Math.ceil(activeTotalRecords / (pageSize as number)));

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, selectedSupplierFilter, colFilters, searchQuery, activeSubView]);

  const paginatedOrders = useMemo(() => {
    if (pageSize === 'All') return filteredOrders;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredOrders.slice(start, start + (pageSize as number));
  }, [filteredOrders, currentPage, pageSize]);

  const paginatedPayments = useMemo(() => {
    if (pageSize === 'All') return filteredPayments;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredPayments.slice(start, start + (pageSize as number));
  }, [filteredPayments, currentPage, pageSize]);

  // Aggregated Summary Statistics for Bills (Paid, Unpaid, Total)
  const summaryStats = useMemo(() => {
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalSum = 0;

    filteredOrders.forEach(o => {
      const amount = Number(o.totalAmount) || 0;
      totalSum += amount;

      if (o.paidAmount !== undefined && o.paidAmount !== null) {
        totalPaid += Number(o.paidAmount);
      } else if (o.status === 'Paid' || o.status === 'Completed') {
        totalPaid += amount;
      } else if (o.paymentType === 'Cash' || o.paymentType === 'Bank Transfer') {
        totalPaid += amount;
      }

      if (o.balanceDue !== undefined && o.balanceDue !== null) {
        totalUnpaid += Number(o.balanceDue);
      } else if (o.status === 'Unpaid' || o.status === 'Pending' || o.paymentType === 'Credit') {
        totalUnpaid += amount;
      }
    });

    if (totalUnpaid === 0 && totalPaid < totalSum) {
      totalUnpaid = totalSum - totalPaid;
    }

    return {
      paid: totalPaid,
      unpaid: totalUnpaid,
      total: totalSum
    };
  }, [filteredOrders]);

  // Dynamic Equation Cards (Adapts based on whether we are in Payment Out or Bills)
  const kpiData = useMemo(() => {
    if (activeSubView === 'payment-out') {
      const cashOut = filteredPayments
        .filter(p => (p.paymentMode || 'Cash') === 'Cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const bankOut = filteredPayments
        .filter(p => (p.paymentMode || 'Cash') !== 'Cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOut = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        box1Label: 'Cash Outflow (نقد ادائیگی)',
        box1Value: cashOut,
        box1Bg: 'bg-rose-50 dark:bg-rose-950/60',
        box1Border: 'border-rose-200 dark:border-rose-700/80',
        box1Text: 'text-rose-800 dark:text-rose-300',
        box1LabelColor: 'text-rose-700 dark:text-rose-400',
        symbol1: '+',
        box2Label: 'Bank & Digital Outflow (بینک / آن لائن)',
        box2Value: bankOut,
        box2Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box2Border: 'border-emerald-200 dark:border-emerald-700/80',
        box2Text: 'text-emerald-800 dark:text-emerald-300',
        box2LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol2: '=',
        box3Label: 'Total Paid Out (کل ادائیگیاں)',
        box3Value: totalOut,
        box3Bg: 'bg-rose-100 dark:bg-rose-900/60',
        box3Border: 'border-rose-300 dark:border-rose-700/80',
        box3Text: 'text-rose-900 dark:text-rose-300',
        box3LabelColor: 'text-rose-800 dark:text-rose-400',
      };
    } else {
      return {
        box1Label: 'Paid Purchases (ادا شدہ)',
        box1Value: summaryStats.paid,
        box1Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box1Border: 'border-emerald-200 dark:border-emerald-700/80',
        box1Text: 'text-emerald-800 dark:text-emerald-300',
        box1LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol1: '+',
        box2Label: 'Unpaid / Balance Due (بقایا جات)',
        box2Value: summaryStats.unpaid,
        box2Bg: 'bg-blue-50 dark:bg-blue-950/60',
        box2Border: 'border-blue-200 dark:border-blue-700/80',
        box2Text: 'text-blue-800 dark:text-blue-300',
        box2LabelColor: 'text-blue-700 dark:text-blue-400',
        symbol2: '=',
        box3Label: 'Total Purchases (کل خریداری)',
        box3Value: summaryStats.total,
        box3Bg: 'bg-amber-50 dark:bg-amber-950/60',
        box3Border: 'border-amber-200 dark:border-amber-700/80',
        box3Text: 'text-amber-800 dark:text-amber-300',
        box3LabelColor: 'text-amber-700 dark:text-amber-400',
      };
    }
  }, [activeSubView, filteredPayments, summaryStats]);

  // Handle Quick Payment Out from Purchase Bill row
  const handleOpenQuickPaymentOut = (order: PurchaseOrder) => {
    setPrefillSupplierId(order.supplierId);
    setPrefillSupplierName(order.supplierName || order.partyName);
    setPrefillAmount(order.balanceDue || 0);
    setPrefillOrderId(order.id);
    setIsAddPaymentOutOpen(true);
    setActionMenuOpenId(null);
  };

  // Handle WhatsApp Share for Payment Out Voucher
  const handleSharePaymentOut = (payment: PartyPayment) => {
    const businessName = business?.name || 'MBI INVENTRA';
    const text = `*${businessName} - PAYMENT OUT VOUCHER*\n------------------------------\n*Voucher #:* ${payment.referenceNumber || 'PV-' + payment.id.slice(0, 6).toUpperCase()}\n*Date:* ${formatDate(payment.date)}\n*Paid To:* ${payment.partyName}\n*Amount:* Rs ${payment.amount.toLocaleString()}\n*Payment Mode:* ${payment.paymentMode || 'Cash'}\n*Remarks:* ${payment.notes || 'Payment against supplier bills'}\n------------------------------\n_Thank you for your partnership!_`;
    
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    showToast('Opening WhatsApp to share payment voucher...');
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (activeSubView === 'payment-out') {
      if (filteredPayments.length === 0) {
        alert('No Payment Out records to export.');
        return;
      }
      const dataRows = filteredPayments.map((p, idx) => ({
        '#': idx + 1,
        'Date': formatDate(p.date),
        'Voucher / Receipt #': p.referenceNumber || `PV-${p.id.slice(0, 6).toUpperCase()}`,
        'Supplier / Payee': p.partyName,
        'Payment Mode': p.paymentMode || 'Cash',
        'Amount Paid (PKR)': p.amount,
        'Remarks / Notes': p.notes || ''
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payment Out Ledger');
      XLSX.writeFile(wb, `Payment_Out_Ledger_${startDate}_to_${endDate}.xlsx`);
      showToast('Payment Out Excel report downloaded successfully!');
    } else {
      if (filteredOrders.length === 0) {
        alert('No purchase records to export.');
        return;
      }
      const dataRows = filteredOrders.map((o, idx) => ({
        '#': idx + 1,
        'Date': formatDate(o.date),
        'Invoice / Bill No': o.billNumber || o.poNumber,
        'Party Name': o.supplierName || o.partyName,
        'Payment Type': o.paymentType || 'Cash',
        'Total Amount': o.totalAmount,
        'Paid Amount': o.paidAmount !== undefined ? o.paidAmount : (o.status === 'Paid' ? o.totalAmount : 0),
        'Balance Due': o.balanceDue || 0,
        'Status': o.status || 'Completed'
      }));
      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${currentSubMenu.label} Report`);
      XLSX.writeFile(wb, `Purchase_${currentSubMenu.label.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`);
      showToast(`${currentSubMenu.label} Excel report downloaded!`);
    }
  };

  // Confirm Delete Purchase Order
  const handleConfirmDeleteOrder = async () => {
    if (!deleteTargetOrder) return;
    setIsDeletingOrder(true);
    try {
      // Reverse stock changes
      if (deleteTargetOrder.items) {
        for (const item of deleteTargetOrder.items) {
          const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
          if (med) {
            await dbMedicines.save({
              ...med,
              quantity: Math.max(0, (med.quantity || 0) - item.quantity),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      await dbPurchaseOrders.delete(deleteTargetOrder.id);
      await loadAllData();
      setDeleteTargetOrder(null);
      showToast(`Purchase bill #${deleteTargetOrder.billNumber || deleteTargetOrder.poNumber} deleted.`);
    } catch (err) {
      console.error('Failed to delete purchase order:', err);
      alert('Failed to delete purchase bill.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Confirm Delete Payment Out
  const handleConfirmDeletePayment = async () => {
    if (!deleteTargetPayment) return;
    setIsDeletingPayment(true);
    try {
      // 1. Revert supplier balance (increase balance by the paid amount)
      if (deleteTargetPayment.partyId) {
        const supplier = suppliers.find(s => s.id === deleteTargetPayment.partyId);
        if (supplier) {
          const revertedBalance = (supplier.balance || 0) + deleteTargetPayment.amount;
          await dbSuppliers.save({ ...supplier, balance: revertedBalance });
        }
      }

      // 2. Delete payment record
      await dbPartyPayments.delete(deleteTargetPayment.id);

      // 3. Add audit log
      const audit: AuditLog = {
        id: uuidv4(),
        date: new Date().toISOString(),
        action: 'PAYMENT_OUT_DELETED',
        notes: `Deleted Payment Out Voucher #${deleteTargetPayment.referenceNumber} to ${deleteTargetPayment.partyName} (Rs ${deleteTargetPayment.amount.toLocaleString()})`,
        userId: '1'
      };
      await dbAuditLogs.save(audit);

      await loadAllData();
      setDeleteTargetPayment(null);
      showToast(`Payment voucher #${deleteTargetPayment.referenceNumber} deleted and supplier balance reverted.`);
    } catch (err) {
      console.error('Failed to delete payment:', err);
      alert('Failed to delete payment voucher.');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP SUBMENU NAVIGATION TABS (Matching Billing / Vyapar standard) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        {PURCHASE_SUBMENUS.map((sub) => {
          const Icon = sub.icon;
          const isActive = activeSubView === sub.id;
          const count = sub.id === 'payment-out' ? payments.length : orders.filter(o => {
            if (sub.id === 'bills') return (o.transactionType || 'Purchase') === 'Purchase';
            if (sub.id === 'order') return o.transactionType === 'Purchase Order';
            if (sub.id === 'return') return o.transactionType === 'Purchase Return';
            return true;
          }).length;

          return (
            <button
              key={sub.id}
              onClick={() => navigate(sub.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
                isActive
                  ? sub.id === 'payment-out'
                    ? 'bg-rose-600 text-white shadow-rose-200'
                    : 'bg-blue-600 text-white shadow-blue-200'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                isActive 
                  ? 'bg-white/25 text-white' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TOP SHARED FILTER BAR */}
      <ReportFilterBar
        dateRange={{
          startDate,
          endDate,
          preset: datePreset,
        }}
        onDateRangeChange={(newRange) => {
          setStartDate(newRange.startDate);
          setEndDate(newRange.endDate);
          setDatePreset(newRange.preset);
        }}
        partyOptions={suppliers.map(s => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
        }))}
        selectedParty={selectedSupplierFilter}
        onPartyChange={setSelectedSupplierFilter}
        partyLabel="Supplier / Party"
        partyPlaceholder="All Suppliers"
        statusOptions={[
          { id: 'PAID', label: 'Paid / Completed', color: 'bg-emerald-500' },
          { id: 'UNPAID', label: 'Unpaid / Balance Due', color: 'bg-rose-500' },
        ]}
        selectedStatus={selectedPaymentStatus}
        onStatusChange={setSelectedPaymentStatus}
        statusLabel="Payment Status"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search bills, PO #, supplier, items..."
        onResetAllFilters={() => {
          setDatePreset('This Month');
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          setStartDate(`${y}-${m}-01`);
          setEndDate(`${y}-${m}-30`);
          setSelectedSupplierFilter('ALL');
          setSelectedPaymentStatus('ALL');
          setSearchQuery('');
          setColFilters({
            supplier: 'ALL',
            status: 'ALL',
            paymentType: 'ALL',
            paymentMode: 'ALL',
          });
        }}
        showSyncIndicator={true}
      >
        {/* Shortcuts Cheat Sheet */}
        <button
          type="button"
          onClick={() => setShowShortcutsModal(true)}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          title="Keyboard Shortcuts Cheat Sheet (F12 / ?)"
        >
          <Keyboard className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Shortcuts</span>
        </button>

        {/* Excel Export */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Excel</span>
        </button>

        {/* Print */}
        <button
          type="button"
          onClick={() => window.print()}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden md:inline">Print</span>
        </button>
      </ReportFilterBar>

      {/* DYNAMIC KPI EQUATION CARDS (Box 1 + Box 2 = Box 3) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3.5">
        
        {/* Box 1 */}
        <div className={`flex-1 w-full min-w-0 ${kpiData.box1Bg} border ${kpiData.box1Border} rounded-xl p-3 sm:p-4 text-center shadow-xs transition-all`}>
          <div className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${kpiData.box1LabelColor} truncate`}>
            {kpiData.box1Label}
          </div>
          <div className={`text-base sm:text-2xl font-black font-mono ${kpiData.box1Text} mt-1 tracking-tight truncate`}>
            {formatCurrency(kpiData.box1Value)}
          </div>
        </div>

        {/* Symbol 1 */}
        <div className="text-slate-400 dark:text-slate-500 font-black text-xl select-none hidden sm:flex items-center justify-center flex-shrink-0 px-1">
          {kpiData.symbol1}
        </div>

        {/* Box 2 */}
        <div className={`flex-1 w-full min-w-0 ${kpiData.box2Bg} border ${kpiData.box2Border} rounded-xl p-3 sm:p-4 text-center shadow-xs transition-all`}>
          <div className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${kpiData.box2LabelColor} truncate`}>
            {kpiData.box2Label}
          </div>
          <div className={`text-base sm:text-2xl font-black font-mono ${kpiData.box2Text} mt-1 tracking-tight truncate`}>
            {formatCurrency(kpiData.box2Value)}
          </div>
        </div>

        {/* Symbol 2 */}
        <div className="text-slate-400 dark:text-slate-500 font-black text-xl select-none hidden sm:flex items-center justify-center flex-shrink-0 px-1">
          {kpiData.symbol2}
        </div>

        {/* Box 3 */}
        <div className={`flex-1 w-full min-w-0 ${kpiData.box3Bg} border ${kpiData.box3Border} rounded-xl p-3 sm:p-4 text-center shadow-xs transition-all`}>
          <div className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${kpiData.box3LabelColor} truncate`}>
            {kpiData.box3Label}
          </div>
          <div className={`text-base sm:text-2xl font-black font-mono ${kpiData.box3Text} mt-1 tracking-tight truncate`}>
            {formatCurrency(kpiData.box3Value)}
          </div>
        </div>

      </div>

      {/* TRANSACTIONS SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        
        {/* Table Header: Search & Dynamic Primary Action Button */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 shrink-0">
              <span>{activeSubView === 'payment-out' ? 'PAYMENT OUT VOUCHERS' : 'TRANSACTIONS'}</span>
              <span className="text-slate-400 font-normal">
                ({activeSubView === 'payment-out' ? filteredPayments.length : filteredOrders.length})
              </span>
            </h2>
            
            {/* Search Input Box with Flexbox / flex-grow and min-w-[300px] */}
            <div className="relative flex-grow min-w-[240px] sm:min-w-[300px] max-w-xl group">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                searchQuery ? 'text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'
              }`} />
              <input
                type="text"
                tabIndex={0}
                placeholder={activeSubView === 'payment-out' ? 'Search payee, voucher #...' : 'Search supplier, bill #...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (searchQuery) {
                      e.preventDefault();
                      setSearchQuery('');
                    } else {
                      (e.target as HTMLInputElement).blur();
                    }
                  }
                }}
                className="w-full bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl pl-8.5 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => setSearchQuery('')}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Clear search (Esc)"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Primary "+ Add" Button */}
          <button
            type="button"
            onClick={() => {
              if (activeSubView === 'payment-out') {
                setPrefillSupplierId(undefined);
                setPrefillSupplierName(undefined);
                setPrefillAmount(undefined);
                setPrefillOrderId(undefined);
                setIsAddPaymentOutOpen(true);
              } else {
                setEditingOrder(null);
                setIsAddModalOpen(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg focus:outline-none focus:ring-2 transition-all active:scale-95 cursor-pointer text-white ${
              activeSubView === 'payment-out' 
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{currentSubMenu.btnLabel}</span>
          </button>

        </div>

        {/* SUBVIEW CONDITIONAL RENDERING */}
        {activeSubView === 'payment-out' ? (
          <>
            {/* Mobile Card-Based View for Payment Out */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-slate-50/50">
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleViewPayment(p)}
                  className="p-3.5 bg-white space-y-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                        {p.referenceNumber || `PV-${p.id.slice(0, 6).toUpperCase()}`}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {formatDate(p.date)}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      {p.paymentMode || 'Cash'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate uppercase">{p.partyName}</h4>
                      {p.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block font-medium">Paid Amount</span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-slate-400 font-medium">Payment Voucher</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleViewPayment(p)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditPayment(p)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSharePaymentOut(p)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetPayment(p)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredPayments.length === 0 && !loading && (
                <div className="py-10 text-center text-slate-400 text-xs px-4">
                  No Payment Out records found for this period.
                </div>
              )}
            </div>

            {/* Desktop Table View for Payment Out */}
            <div className="hidden sm:block overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200">
                    <ColumnHeader
                      label="DATE"
                      sortKey="date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="VOUCHER / REF #"
                      sortKey="referenceNumber"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="SUPPLIER / PAYEE"
                      sortKey="partyName"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="supplier"
                      activeFilterValue={colFilters.supplier}
                      filterOptions={supplierColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, supplier: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <ColumnHeader
                      label="PAYMENT MODE"
                      sortKey="paymentMode"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="paymentMode"
                      activeFilterValue={colFilters.paymentMode}
                      filterOptions={paymentModeColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, paymentMode: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <ColumnHeader label="REMARKS / NOTES" />
                    <ColumnHeader
                      label="PAID AMOUNT (PKR)"
                      sortKey="amount"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="px-4 py-3 text-center w-28 text-slate-700 uppercase font-black text-[11px]">
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedPayments.map((p) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-rose-50/30 transition group cursor-pointer"
                      onDoubleClick={() => handleViewPayment(p)}
                      title="Double-click to preview voucher"
                    >
                      
                      {/* Date */}
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>

                      {/* Voucher # */}
                      <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-900">
                        {p.referenceNumber || `PV-${p.id.slice(0, 6).toUpperCase()}`}
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-900 uppercase">
                        {p.partyName}
                      </td>

                      {/* Payment Mode */}
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-700">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          {p.paymentMode || 'Cash'}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-500 text-[11px] max-w-xs truncate">
                        {p.notes || 'Outgoing Payment to Supplier'}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 border-r border-slate-100 text-right font-mono font-black text-rose-700 text-sm">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewPayment(p)}
                            title="View / Print Voucher"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditPayment(p)}
                            title="Edit Payment Voucher"
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSharePaymentOut(p)}
                            title="Share on WhatsApp"
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTargetPayment(p)}
                            title="Delete Payment Voucher"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}

                  {filteredPayments.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-700">No Payment Out Records Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "+ Add Payment Out" to record cash or bank payments made to your suppliers.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>

        ) : (

          /* BILLS / PURCHASE ORDERS / RETURNS TABLE / MOBILE CARDS VIEW */
          <>
            {/* Mobile Card-Based View for Purchases */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-slate-50/50">
              {paginatedOrders.map((order) => {
                const hasDue = (order.balanceDue || 0) > 0;
                return (
                  <div
                    key={order.id}
                    onClick={() => setPrintingOrder(order)}
                    className="p-3.5 bg-white space-y-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {order.billNumber || order.poNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatDate(order.date)}
                        </span>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {order.paymentType || 'Cash'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-900 truncate uppercase">{order.supplierName || order.partyName}</h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandOrder(order.id);
                          }}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 mt-1 rounded-md border transition-colors cursor-pointer ${
                            expandedOrderIds.has(order.id)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title="Click to show/hide items"
                        >
                          <Package className="w-3 h-3" />
                          <span>{order.items?.length || 0} items</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedOrderIds.has(order.id) ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-slate-900 text-sm block">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        {hasDue && (
                          <span className="text-[11px] font-mono font-black text-rose-600 block">
                            Due: {formatCurrency(order.balanceDue || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      {hasDue ? (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickPaymentOut(order)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[10px] font-black transition flex items-center gap-1"
                        >
                          <ArrowDownRight className="w-3 h-3" /> Record Payment
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          Fully Paid
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrder(order);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSharingOrder(order)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetOrder(order)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Expanded Items Breakdown */}
                    {expandedOrderIds.has(order.id) && (
                      <div className="mt-2.5 pt-2 border-t border-dashed border-blue-200 bg-blue-50/60 -mx-3.5 -mb-3.5 p-3.5 rounded-b-xl space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center pb-1 border-b border-blue-100">
                          <span className="flex items-center gap-1.5 text-blue-800">
                            <Package className="w-3.5 h-3.5" /> BILL ITEMS ({order.items?.length || 0})
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => toggleExpandOrder(order.id)}>Fold ▲</span>
                        </div>
                        <div className="divide-y divide-blue-100 text-xs">
                          {(order.items || []).map((item, itIdx) => (
                            <div key={itIdx} className="py-1.5 flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-900 truncate">{item.name || (item as any).medicineName}</div>
                                <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                  <span>Qty: <strong className="text-slate-800">{item.quantity} {(item as any).unit || ''}</strong></span>
                                  {item.batchNumber && <span>• Batch: {item.batchNumber}</span>}
                                  {item.expiryDate && <span>• Exp: {item.expiryDate}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono">
                                <div className="text-[11px] text-slate-600">@ Rs {(Number(item.purchasePrice || (item as any).pricePerUnit) || 0).toLocaleString()}</div>
                                <div className="font-black text-slate-900 text-xs">
                                  Rs {((item as any).totalAmount || item.total || (Number(item.quantity || 0) * Number(item.purchasePrice || (item as any).pricePerUnit || 0))).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(!order.items || order.items.length === 0) && (
                            <div className="py-2 text-center text-slate-400 text-xs">No items recorded in this purchase bill.</div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-blue-100 flex justify-between items-center text-xs font-bold text-slate-800">
                          <span className="text-slate-500">Bill Net Total</span>
                          <span className="font-mono text-sm font-black text-blue-700">{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredOrders.length === 0 && !loading && (
                <div className="py-10 text-center text-slate-400 text-xs px-4">
                  No Purchase Transactions Found.
                </div>
              )}
            </div>

            {/* Desktop Table View for Purchases */}
            <div className="hidden sm:block overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-slate-200">
                    <ColumnHeader
                      label="DATE"
                      sortKey="date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="INVOICE / BILL NO."
                      sortKey="billNumber"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="PARTY NAME"
                      sortKey="supplierName"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="supplier"
                      activeFilterValue={colFilters.supplier}
                      filterOptions={supplierColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, supplier: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <th className="px-4 py-3 text-center text-slate-700 uppercase font-black text-[11px]">
                      ITEMS
                    </th>
                    <ColumnHeader
                      label="PAYMENT TYPE"
                      sortKey="paymentType"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="paymentType"
                      activeFilterValue={colFilters.paymentType}
                      filterOptions={paymentTypeColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, paymentType: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <ColumnHeader
                      label="TOTAL AMOUNT"
                      sortKey="totalAmount"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <ColumnHeader
                      label="BALANCE DUE"
                      sortKey="balanceDue"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                      filterKey="status"
                      activeFilterValue={colFilters.status}
                      filterOptions={statusColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, status: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <th className="px-4 py-3 text-center w-36 text-slate-700 uppercase font-black text-[11px]">
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedOrders.map((order) => {
                    const isMenuOpen = actionMenuOpenId === order.id;
                    const hasDue = (order.balanceDue || 0) > 0;
                    const isExpanded = expandedOrderIds.has(order.id);

                    return (
                      <React.Fragment key={order.id}>
                        <tr 
                          className={`transition-colors cursor-pointer ${
                            isExpanded ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-blue-50/40'
                          }`}
                          onClick={() => toggleExpandOrder(order.id)}
                          onDoubleClick={() => setPrintingOrder(order)}
                          title="Click to view/hide items, double click to print bill"
                        >
                          
                          {/* Date */}
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-800 font-medium">
                            {formatDate(order.date)}
                          </td>

                          {/* Invoice No */}
                          <td className="px-4 py-3 border-r border-slate-100 font-semibold text-blue-600">
                            {order.billNumber || order.poNumber}
                          </td>

                          {/* Party Name */}
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-900 font-bold uppercase">
                            {order.supplierName || order.partyName}
                          </td>

                          {/* Items Column */}
                          <td className="px-4 py-3 border-r border-slate-100 text-center" onClick={(e) => { e.stopPropagation(); toggleExpandOrder(order.id); }}>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              }`}
                              title="Click to view items inside this purchase bill"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>{order.items?.length || 0} items</span>
                              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : 'text-blue-500'}`} />
                            </button>
                          </td>

                        {/* Payment Type */}
                        <td className="px-4 py-3 border-r border-slate-100 text-slate-700">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                            {order.paymentType || 'Cash'}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 border-r border-slate-100 text-right font-bold text-slate-900">
                          {formatCurrency(order.totalAmount)}
                        </td>

                        {/* Balance Due + Quick Pay Button */}
                        <td className="px-4 py-3 border-r border-slate-100 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-mono font-bold ${hasDue ? 'text-rose-600' : 'text-slate-500'}`}>
                              {formatCurrency(order.balanceDue || 0)}
                            </span>
                            {hasDue && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickPaymentOut(order)}
                                title="Record Payment Out for this Bill"
                                className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-black transition cursor-pointer"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Action Icons */}
                        <td className="px-4 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            
                            {/* View / Print Button */}
                            <button
                              type="button"
                              onClick={() => setPrintingOrder(order)}
                              title="View / Print Purchase Bill"
                              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrder(order);
                                setIsAddModalOpen(true);
                              }}
                              title="Edit Purchase Bill"
                              className="p-1 text-slate-500 hover:text-amber-600 rounded hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTargetOrder(order)}
                              title="Delete Purchase Bill"
                              className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Share Button */}
                            <button
                              type="button"
                              onClick={() => setSharingOrder(order)}
                              title="Share Bill on WhatsApp"
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 3-dots Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActionMenuOpenId(isMenuOpen ? null : order.id)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div 
                                  className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
                                  onMouseLeave={() => setActionMenuOpenId(null)}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPrintingOrder(order);
                                      setActionMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    <span>View / Print Bill</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingOrder(order);
                                      setIsAddModalOpen(true);
                                      setActionMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Edit Bill</span>
                                  </button>

                                  {hasDue && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuickPaymentOut(order)}
                                      className="w-full px-3 py-1.5 text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-bold"
                                    >
                                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Record Payment Out</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSharingOrder(order);
                                      setActionMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Share Bill</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeleteTargetOrder(order);
                                      setActionMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Delete Bill</span>
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        </td>

                        </tr>

                        {/* Expanded Items Sub-Row for Purchases */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b-2 border-blue-200">
                            <td colSpan={8} className="p-0">
                              <div className="p-4 bg-gradient-to-b from-blue-50/60 to-slate-50 border-y border-blue-200/70 shadow-inner" onClick={(e) => e.stopPropagation()}>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-blue-600" />
                                      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Purchase Bill Items — {order.billNumber || order.poNumber}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                        {order.items?.length || 0} item(s)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                                      <span>Supplier: <strong className="text-slate-900">{order.supplierName || order.partyName}</strong></span>
                                      <span>•</span>
                                      <span>Date: <strong className="text-slate-900">{formatDate(order.date)}</strong></span>
                                      <button
                                        type="button"
                                        onClick={() => setPrintingOrder(order)}
                                        className="ml-2 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" /> View / Print Bill
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandOrder(order.id)}
                                        className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                                      >
                                        ✕ Close
                                      </button>
                                    </div>
                                  </div>

                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100/80 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                                      <tr>
                                        <th className="py-2 px-3 w-10 text-center">#</th>
                                        <th className="py-2 px-3">Item / Medicine Name</th>
                                        <th className="py-2 px-3">Batch</th>
                                        <th className="py-2 px-3">Expiry</th>
                                        <th className="py-2 px-3 text-center">Qty</th>
                                        <th className="py-2 px-3 text-right">Purchase Rate</th>
                                        <th className="py-2 px-3 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {(order.items || []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                          <td className="py-2 px-3 font-bold text-slate-900">
                                            {item.name || (item as any).medicineName}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{item.batchNumber || '—'}</td>
                                          <td className="py-2 px-3 text-slate-600 text-[11px]">{item.expiryDate || '—'}</td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                              {item.quantity} {(item as any).unit || ''}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                                            Rs {(Number(item.purchasePrice || (item as any).pricePerUnit) || 0).toLocaleString()}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                            Rs {((item as any).totalAmount || item.total || (Number(item.quantity || 0) * Number(item.purchasePrice || (item as any).pricePerUnit || 0))).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                      {(!order.items || order.items.length === 0) && (
                                        <tr>
                                          <td colSpan={7} className="py-4 text-center text-slate-400 text-xs">
                                            No items recorded for this purchase bill.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-800">
                                      <tr>
                                        <td colSpan={4} className="py-2 px-3 text-slate-500">
                                          Total Items: {order.items?.length || 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                                          {order.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0} Units
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500">
                                          Bill Total:
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-sm font-black text-blue-700">
                                          {formatCurrency(order.totalAmount)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredOrders.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No Purchase Transactions Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "{currentSubMenu.btnLabel}" above to create your first purchase record.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </>
        )}

        {/* Transactions Footer Summary with High-Speed Unlimited Engine Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-medium text-slate-600">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="font-bold text-slate-700">
              Showing {activeTotalRecords === 0 ? 0 : ((currentPage - 1) * (pageSize === 'All' ? activeTotalRecords : (pageSize as number))) + 1}
              -
              {pageSize === 'All' ? activeTotalRecords : Math.min(currentPage * (pageSize as number), activeTotalRecords)} of {activeTotalRecords.toLocaleString()} {activeSubView === 'payment-out' ? 'Payments' : 'Purchases'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Unlimited Engine (0ms Lag)
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Total Value: <span className="font-mono text-slate-900 font-black">{formatCurrency(kpiData.box3Value)}</span>
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Rows:</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value="All">All</option>
              </select>
            </div>

            {/* Page Navigator */}
            {pageSize !== 'All' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="First Page"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Previous Page"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="px-2 font-bold text-[11px] text-slate-700 whitespace-nowrap">
                  Page <span className="font-mono text-blue-600">{currentPage}</span> of <span className="font-mono">{totalPages}</span>
                </span>

                <button
                  type="button"
                  title="Next Page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Last Page"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>

                {/* Jump to Page */}
                {totalPages > 3 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const num = parseInt(jumpPageInput);
                      if (!isNaN(num) && num >= 1 && num <= totalPages) {
                        setCurrentPage(num);
                        setJumpPageInput('');
                      }
                    }}
                    className="flex items-center gap-1 ml-1"
                  >
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      placeholder="Go"
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add / Edit Purchase Modal */}
      {isAddModalOpen && (
        <AddPurchaseModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingOrder(null);
          }}
          onSaved={(savedOrder) => {
            if (savedOrder) {
              setOrders(prev => [savedOrder, ...prev.filter(o => o.id !== savedOrder.id)]);
            }
            loadAllData(true);
            showToast('Purchase bill saved successfully!');
          }}
          transactionType={activeSubView === 'order' ? 'Purchase Order' : activeSubView === 'return' ? 'Purchase Return' : 'Purchase'}
          initialOrder={editingOrder}
        />
      )}

      {/* Add Dedicated Payment Out Modal */}
      <AddPaymentOutModal
        isOpen={isAddPaymentOutOpen}
        onClose={() => {
          setIsAddPaymentOutOpen(false);
          setPrefillSupplierId(undefined);
          setPrefillSupplierName(undefined);
          setPrefillAmount(undefined);
          setPrefillOrderId(undefined);
        }}
        initialSupplierId={prefillSupplierId}
        initialSupplierName={prefillSupplierName}
        initialAmount={prefillAmount}
        initialPurchaseOrderId={prefillOrderId}
        onSaveSuccess={(payment) => {
          setPayments(prev => [payment, ...prev.filter(p => p.id !== payment.id)]);
          loadAllData();
          showToast(`Payment Out of Rs ${payment.amount.toLocaleString()} to ${payment.partyName} saved!`);
        }}
      />

      {/* Purchase Bill Print Modal */}
      {printingOrder && (
        <PurchasePrintModal
          isOpen={Boolean(printingOrder)}
          onClose={() => setPrintingOrder(null)}
          order={printingOrder}
        />
      )}

      {/* Purchase Bill Share Modal */}
      {sharingOrder && (
        <PurchaseShareModal
          isOpen={Boolean(sharingOrder)}
          onClose={() => setSharingOrder(null)}
          order={sharingOrder}
        />
      )}

      {/* Payment Out Print Modal */}
      <PaymentOutPrintModal
        isOpen={Boolean(printingPayment)}
        onClose={() => setPrintingPayment(null)}
        payment={printingPayment}
      />

      {/* Unified Payment Voucher Print Modal */}
      {selectedPrintPayment && (
        <PaymentVoucherPrintModal
          isOpen={isPrintPaymentModalOpen}
          onClose={() => {
            setIsPrintPaymentModalOpen(false);
            setSelectedPrintPayment(null);
          }}
          payment={selectedPrintPayment}
          partyPhone={suppliers.find(s => s.id === selectedPrintPayment.partyId || s.name === selectedPrintPayment.partyName)?.phone}
          partyAddress={suppliers.find(s => s.id === selectedPrintPayment.partyId || s.name === selectedPrintPayment.partyName)?.address}
        />
      )}

      {/* Edit Payment Out Voucher Modal */}
      {editingPayment && (
        <EditPaymentModal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          payment={editingPayment}
          party={suppliers.find(s => s.id === editingPayment.partyId || s.name === editingPayment.partyName)}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      {/* Confirm Delete Purchase Bill Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetOrder)}
        title="Delete Purchase Bill?"
        message="Are you sure you want to permanently delete this purchase record? Inventory stock will be adjusted accordingly and this action cannot be undone."
        itemName={deleteTargetOrder ? `Bill #${deleteTargetOrder.billNumber || deleteTargetOrder.poNumber} - ${deleteTargetOrder.supplierName} (${formatCurrency(deleteTargetOrder.totalAmount)})` : undefined}
        confirmLabel="Yes, Delete Bill"
        isDeleting={isDeletingOrder}
        onConfirm={handleConfirmDeleteOrder}
        onClose={() => setDeleteTargetOrder(null)}
      />

      {/* Confirm Delete Payment Out Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetPayment)}
        title="Delete Payment Out Voucher?"
        message="Are you sure you want to delete this payment voucher? The supplier's outstanding balance will be increased back by the payment amount."
        itemName={deleteTargetPayment ? `Voucher #${deleteTargetPayment.referenceNumber} - ${deleteTargetPayment.partyName} (${formatCurrency(deleteTargetPayment.amount)})` : undefined}
        confirmLabel="Yes, Delete Voucher"
        isDeleting={isDeletingPayment}
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setDeleteTargetPayment(null)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsCheatSheetModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        context="purchase"
      />

    </div>
  );
};
