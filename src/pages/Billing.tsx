import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Plus, Printer, Share2, MoreVertical, Filter, 
  BarChart2, FileSpreadsheet, ChevronDown, CheckCircle2,
  Trash2, Copy, Eye, Edit3, DollarSign, Download, Building2, User,
  TrendingUp, RefreshCw, X, ArrowUpDown, FileText, ShoppingBag, 
  Truck, RotateCcw, Check, Sparkles, ArrowRight, WalletCards, Keyboard,
  Package, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Zap
} from 'lucide-react';
import { dbInvoices, dbMedicines, dbSuppliers, dbPartyPayments, dbAuditLogs } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import { unifiedSyncService } from '../lib/syncService';
import { Invoice, Medicine, Party, PartyPayment, AuditLog } from '../types';
import { formatCurrency } from '../lib/utils';
import { AddSaleModal } from '../components/sales/AddSaleModal';
import { AddPaymentInModal } from '../components/sales/AddPaymentInModal';
import { InvoicePrintModal } from '../components/sales/InvoicePrintModal';
import { InvoiceShareModal } from '../components/sales/InvoiceShareModal';
import { ConfirmDeleteModal } from '../components/common/ConfirmDeleteModal';
import { PaymentVoucherPrintModal } from '../components/common/PaymentVoucherPrintModal';
import { EditPaymentModal } from '../components/parties/EditPaymentModal';
import { SpecialControlledSaleModal } from '../components/sales/SpecialControlledSaleModal';
import { KeyboardShortcutsCheatSheetModal } from '../components/common/KeyboardShortcutsCheatSheetModal';
import { ReportFilterBar, DatePreset } from '../components/common/ReportFilterBar';
import { ColumnHeader } from '../components/common/ColumnHeader';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { v4 as uuidv4 } from 'uuid';

export type SaleSubView = 'invoices' | 'quotation' | 'payment-in' | 'order' | 'challan' | 'return';

interface SubMenuConfig {
  id: SaleSubView;
  label: string;
  urduLabel: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  transactionType?: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
  color: string;
  btnLabel: string;
}

const SALE_SUBMENUS: SubMenuConfig[] = [
  {
    id: 'invoices',
    label: 'Sale Invoices',
    urduLabel: 'سیلز بل',
    path: '/sale/invoices',
    icon: FileText,
    transactionType: 'Sale',
    color: 'blue',
    btnLabel: 'Add Sale'
  },
  {
    id: 'quotation',
    label: 'Estimate / Quotation',
    urduLabel: 'تخمینہ',
    path: '/sale/quotation',
    icon: FileSpreadsheet,
    transactionType: 'Estimate',
    color: 'amber',
    btnLabel: 'Add Estimate'
  },
  {
    id: 'payment-in',
    label: 'Payment In',
    urduLabel: 'وصولی',
    path: '/sale/payment-in',
    icon: DollarSign,
    color: 'emerald',
    btnLabel: 'Add Payment In'
  },
  {
    id: 'order',
    label: 'Sale Order',
    urduLabel: 'سیلز آرڈر',
    path: '/sale/order',
    icon: ShoppingBag,
    transactionType: 'Sale Order',
    color: 'purple',
    btnLabel: 'Add Sale Order'
  },
  {
    id: 'challan',
    label: 'Delivery Challan',
    urduLabel: 'ڈیلیوری چالان',
    path: '/sale/challan',
    icon: Truck,
    transactionType: 'Delivery Challan',
    color: 'cyan',
    btnLabel: 'Add Challan'
  },
  {
    id: 'return',
    label: 'Sale Return / Cr. Note',
    urduLabel: 'سیلز واپسی',
    path: '/sale/return',
    icon: RotateCcw,
    transactionType: 'Sale Return',
    color: 'rose',
    btnLabel: 'Add Sale Return'
  }
];

export const Billing: React.FC = () => {
  const { business } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine active subview from URL path
  const activeSubView: SaleSubView = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/sale/quotation') || path.includes('/sale/estimate')) return 'quotation';
    if (path.includes('/sale/payment-in')) return 'payment-in';
    if (path.includes('/sale/order')) return 'order';
    if (path.includes('/sale/challan')) return 'challan';
    if (path.includes('/sale/return') || path.includes('/sale/cr-note')) return 'return';
    return 'invoices';
  }, [location.pathname]);

  // Database Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PartyPayment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Period / Date Filters
  const [periodPreset, setPeriodPreset] = useState<string>('This Month');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');

  // Dropdown Filters
  const [selectedFirm, setSelectedFirm] = useState<string>('ALL FIRMS');
  const [selectedUser, setSelectedUser] = useState<string>('ALL USERS');
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Views
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isControlledSaleOpen, setIsControlledSaleOpen] = useState(false);
  const [isAddPaymentInOpen, setIsAddPaymentInOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState<Invoice | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedShareInvoice, setSelectedShareInvoice] = useState<Invoice | null>(null);
  
  // Quick Inline Payment Modal
  const [isQuickPaymentOpen, setIsQuickPaymentOpen] = useState(false);
  const [quickPaymentInvoice, setQuickPaymentInvoice] = useState<Invoice | null>(null);
  const [quickPaymentAmount, setQuickPaymentAmount] = useState<number>(0);

  // Active Menu Dropdown for 3-dots
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Payment View / Edit State
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

  const handlePaymentUpdated = (updatedPayment: PartyPayment, updatedParty?: Party) => {
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
    if (updatedParty) {
      setParties(prev => prev.map(p => p.id === updatedParty.id ? updatedParty : p));
    }
    loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    showToast(`Payment In voucher #${updatedPayment.referenceNumber || 'PAY'} updated successfully.`);
  };

  // Graph Toggle
  const [showGraph, setShowGraph] = useState(false);

  // Sort State
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Column Popover Filter State
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [colFilters, setColFilters] = useState<{
    party: string;
    status: string;
    paymentType: string;
    paymentMode: string;
  }>({
    party: 'ALL',
    status: 'ALL',
    paymentType: 'ALL',
    paymentMode: 'ALL',
  });

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Expandable invoice items rows
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set());

  // High-Capacity Infinite/Unlimited Engine Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(50);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  const toggleExpandInvoice = (id: string) => {
    setExpandedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Global F12 or ? listener on Billing page (when no modal is active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddSaleOpen || isAddPaymentInOpen || isPrintModalOpen || isShareModalOpen || isControlledSaleOpen) return;
      if (e.key === 'F12' || (e.key === '?' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddSaleOpen, isAddPaymentInOpen, isPrintModalOpen, isShareModalOpen, isControlledSaleOpen]);

  useEffect(() => {
    loadAllData();

    // Listen for live cross-tab, cross-browser, & unified sync service updates
    const unsubLegacy = syncEngine.onSyncMessage(() => {
      loadAllData();
    });

    const unsubUnified = unifiedSyncService.onEntityChange((payload) => {
      if (!payload.storeName || payload.storeName === 'invoices' || payload.storeName === 'partyPayments' || payload.storeName === 'all') {
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

  // Check if ?action=add is in URL query parameters
  const actionParam = searchParams.get('action');
  useEffect(() => {
    if (actionParam === 'add') {
      if (activeSubView === 'payment-in') {
        setIsAddPaymentInOpen(true);
      } else {
        setEditingInvoice(null);
        setIsAddSaleOpen(true);
      }
      // Remove query param after opening to keep URL clean
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }

    const handleOpenSale = () => {
      setEditingInvoice(null);
      setIsAddSaleOpen(true);
    };

    window.addEventListener('mbi-open-add-sale', handleOpenSale);
    return () => window.removeEventListener('mbi-open-add-sale', handleOpenSale);
  }, [actionParam, activeSubView]);

  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [invData, payData, partyData, medData] = await Promise.all([
        dbInvoices.getAll(),
        dbPartyPayments.getAll(),
        dbSuppliers.getAll(),
        dbMedicines.getAll()
      ]);

      setInvoices(invData || []);
      setPayments(payData || []);
      setParties(partyData || []);
      setMedicines(medData || []);
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Preset Date Handlers
  const handlePeriodChange = (preset: string) => {
    setPeriodPreset(preset);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === 'Today') {
      const d = today.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'This Week') {
      const first = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const last = new Date(today.setDate(today.getDate() - today.getDay() + 7));
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(last.toISOString().slice(0, 10));
    } else if (preset === 'This Month') {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(last.toISOString().slice(0, 10));
    } else if (preset === 'Last Month') {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      setStartDate(first.toISOString().slice(0, 10));
      setEndDate(last.toISOString().slice(0, 10));
    } else if (preset === 'This Year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (preset === 'All Time') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Switch Subview handler
  const handleSubViewChange = (subview: SaleSubView) => {
    const config = SALE_SUBMENUS.find(s => s.id === subview);
    if (config) {
      navigate(config.path);
    }
  };

  // Precomputed category map for O(1) instant category filtering without CPU lag
  const medicineCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medicines) {
      if (m.category) {
        if (m.id) map.set(m.id, m.category);
        if (m.name) map.set(m.name.toLowerCase().trim(), m.category);
      }
    }
    return map;
  }, [medicines]);

  // Filter Transactions by active subview, dates, firm, user & search
  const currentSubMenu = useMemo(() => {
    return SALE_SUBMENUS.find(s => s.id === activeSubView) || SALE_SUBMENUS[0];
  }, [activeSubView]);

  const filteredInvoices = useMemo(() => {
    if (activeSubView === 'payment-in') return [];

    const targetType = currentSubMenu.transactionType || 'Sale';

    return invoices.filter(inv => {
      // Transaction type match
      const invType = inv.transactionType || 'Sale';
      if (invType !== targetType) return false;

      // Date interval filter
      const invDate = inv.date.slice(0, 10);
      if (startDate && invDate < startDate) return false;
      if (endDate && invDate > endDate) return false;

      // Firm filter
      if (selectedFirm !== 'ALL FIRMS' && inv.firmName && inv.firmName !== selectedFirm) return false;

      // User filter
      if (selectedUser !== 'ALL USERS' && inv.userName && inv.userName !== selectedUser) return false;

      // Party filter (from top bar OR column filter)
      const effectiveParty = colFilters.party !== 'ALL' ? colFilters.party : selectedParty;
      if (effectiveParty !== 'ALL') {
        const pMatch = inv.customerName === effectiveParty || inv.partyId === effectiveParty;
        if (!pMatch) return false;
      }

      // Category filter (instant O(1) Map lookup - 0ms freeze)
      if (selectedCategory !== 'ALL') {
        const hasCategory = inv.items?.some(it => {
          const cat = (it.medicineId && medicineCategoryMap.get(it.medicineId)) || 
                      (it.name && medicineCategoryMap.get(it.name.toLowerCase().trim()));
          return cat === selectedCategory;
        });
        if (!hasCategory) return false;
      }

      // Status filter (from top bar OR column filter)
      const effectiveStatus = colFilters.status !== 'ALL' ? colFilters.status : statusFilter;
      if (effectiveStatus !== 'ALL') {
        if (effectiveStatus === 'Unpaid' && (inv.balanceDue || 0) <= 0) return false;
        if (effectiveStatus === 'Paid' && (inv.balanceDue || 0) > 0) return false;
        if (effectiveStatus === 'Pending' && inv.status !== 'Pending') return false;
        if (effectiveStatus === 'Completed' && inv.status !== 'Completed' && inv.status !== 'Converted') return false;
        if (effectiveStatus === 'Dispatched' && inv.status !== 'Dispatched') return false;
        if (effectiveStatus === 'Cash' && inv.paymentType !== 'Cash') return false;
        if (effectiveStatus === 'Credit' && inv.paymentType === 'Cash') return false;
      }

      // Payment Type column filter
      if (colFilters.paymentType !== 'ALL') {
        const pType = (inv.paymentType || 'Cash').toLowerCase();
        const targetPType = colFilters.paymentType.toLowerCase();
        if (!pType.includes(targetPType)) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = inv.invoiceNumber.toLowerCase().includes(q);
        const matchName = inv.customerName.toLowerCase().includes(q);
        const matchPhone = inv.customerPhone?.toLowerCase().includes(q) || false;
        const matchAmt = inv.grandTotal.toString().includes(q);
        if (!matchNo && !matchName && !matchPhone && !matchAmt) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        const diff = timeA - timeB;
        if (diff !== 0) {
          return sortOrder === 'asc' ? diff : -diff;
        }
        const numA = parseInt(a.invoiceNumber.replace(/\D/g, '') || '0');
        const numB = parseInt(b.invoiceNumber.replace(/\D/g, '') || '0');
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (sortField === 'invoiceNumber') {
        const numA = parseInt(a.invoiceNumber.replace(/\D/g, '') || '0');
        const numB = parseInt(b.invoiceNumber.replace(/\D/g, '') || '0');
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      if (sortField === 'customerName') {
        return sortOrder === 'asc' 
          ? a.customerName.localeCompare(b.customerName) 
          : b.customerName.localeCompare(a.customerName);
      }
      if (sortField === 'status') {
        const sA = a.status || (a.balanceDue > 0 ? 'Unpaid' : 'Paid');
        const sB = b.status || (b.balanceDue > 0 ? 'Unpaid' : 'Paid');
        return sortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
      }
      if (sortField === 'paymentType') {
        const pA = a.paymentType || 'Cash';
        const pB = b.paymentType || 'Cash';
        return sortOrder === 'asc' ? pA.localeCompare(pB) : pB.localeCompare(pA);
      }
      if (sortField === 'grandTotal') {
        return sortOrder === 'asc' ? a.grandTotal - b.grandTotal : b.grandTotal - a.grandTotal;
      }
      if (sortField === 'balanceDue') {
        return sortOrder === 'asc' ? a.balanceDue - b.balanceDue : b.balanceDue - a.balanceDue;
      }
      return 0;
    });
  }, [invoices, activeSubView, currentSubMenu, startDate, endDate, selectedFirm, selectedUser, statusFilter, colFilters, searchQuery, sortField, sortOrder, selectedParty, selectedCategory, medicineCategoryMap]);

  // Filtered Payments (for Payment In subview)
  const filteredPayments = useMemo(() => {
    if (activeSubView !== 'payment-in') return [];

    return payments.filter(p => {
      if (p.type && p.type !== 'PAYMENT_IN') return false;

      const pDate = p.date.slice(0, 10);
      if (startDate && pDate < startDate) return false;
      if (endDate && pDate > endDate) return false;

      // Party filter
      const effectiveParty = colFilters.party !== 'ALL' ? colFilters.party : selectedParty;
      if (effectiveParty !== 'ALL') {
        if (p.partyName !== effectiveParty && p.partyId !== effectiveParty) return false;
      }

      // Payment Mode column filter
      if (colFilters.paymentMode !== 'ALL') {
        const mode = (p.paymentMode || 'Cash').toLowerCase();
        if (!mode.includes(colFilters.paymentMode.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.partyName.toLowerCase().includes(q);
        const matchRef = p.referenceNumber?.toLowerCase().includes(q) || false;
        const matchMode = p.paymentMode?.toLowerCase().includes(q) || false;
        const matchAmt = p.amount.toString().includes(q);
        if (!matchName && !matchRef && !matchMode && !matchAmt) return false;
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
  }, [payments, activeSubView, startDate, endDate, selectedParty, colFilters, searchQuery, sortField, sortOrder]);

  // Reset pagination to page 1 whenever search, date, filters, or subview change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate, selectedFirm, selectedUser, selectedParty, selectedCategory, statusFilter, colFilters, activeSubView]);

  const activeTotalRecords = activeSubView === 'payment-in' ? filteredPayments.length : filteredInvoices.length;

  const totalPages = useMemo(() => {
    if (pageSize === 'All') return 1;
    return Math.max(1, Math.ceil(activeTotalRecords / (pageSize as number)));
  }, [activeTotalRecords, pageSize]);

  // Keep currentPage valid when records change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedInvoices = useMemo(() => {
    if (pageSize === 'All') return filteredInvoices;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredInvoices.slice(start, start + (pageSize as number));
  }, [filteredInvoices, currentPage, pageSize]);

  const paginatedPayments = useMemo(() => {
    if (pageSize === 'All') return filteredPayments;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredPayments.slice(start, start + (pageSize as number));
  }, [filteredPayments, currentPage, pageSize]);

  // Submenu Item Counts for Badges
  const subMenuCounts = useMemo(() => {
    const counts: Record<SaleSubView, number> = {
      'invoices': invoices.filter(i => (i.transactionType || 'Sale') === 'Sale').length,
      'quotation': invoices.filter(i => i.transactionType === 'Estimate').length,
      'payment-in': payments.filter(p => !p.type || p.type === 'PAYMENT_IN').length,
      'order': invoices.filter(i => i.transactionType === 'Sale Order').length,
      'challan': invoices.filter(i => i.transactionType === 'Delivery Challan').length,
      'return': invoices.filter(i => i.transactionType === 'Sale Return').length
    };
    return counts;
  }, [invoices, payments]);

  // KPI Calculations according to active subview
  const kpiData = useMemo(() => {
    if (activeSubView === 'invoices') {
      const total = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const unpaid = filteredInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
      const paid = Math.max(0, total - unpaid);
      return {
        box1Label: 'Paid (وصول شدہ)',
        box1Value: paid,
        box1Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box1Border: 'border-emerald-200 dark:border-emerald-700/80',
        box1Text: 'text-emerald-800 dark:text-emerald-300',
        box1LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol1: '+',
        box2Label: 'Unpaid (بقایا / ادھار)',
        box2Value: unpaid,
        box2Bg: 'bg-blue-50 dark:bg-blue-950/60',
        box2Border: 'border-blue-200 dark:border-blue-700/80',
        box2Text: 'text-blue-800 dark:text-blue-300',
        box2LabelColor: 'text-blue-700 dark:text-blue-400',
        symbol2: '=',
        box3Label: 'Total Sales (کل سیلز)',
        box3Value: total,
        box3Bg: 'bg-amber-50 dark:bg-amber-950/60',
        box3Border: 'border-amber-200 dark:border-amber-700/80',
        box3Text: 'text-amber-800 dark:text-amber-300',
        box3LabelColor: 'text-amber-700 dark:text-amber-400',
      };
    } else if (activeSubView === 'quotation') {
      const total = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const pending = filteredInvoices.filter(i => i.status !== 'Converted' && i.status !== 'Completed').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const converted = Math.max(0, total - pending);
      return {
        box1Label: 'Open / Pending (زیر غور)',
        box1Value: pending,
        box1Bg: 'bg-amber-50 dark:bg-amber-950/60',
        box1Border: 'border-amber-200 dark:border-amber-700/80',
        box1Text: 'text-amber-800 dark:text-amber-300',
        box1LabelColor: 'text-amber-700 dark:text-amber-400',
        symbol1: '+',
        box2Label: 'Converted to Sale (بل میں تبدیل)',
        box2Value: converted,
        box2Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box2Border: 'border-emerald-200 dark:border-emerald-700/80',
        box2Text: 'text-emerald-800 dark:text-emerald-300',
        box2LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol2: '=',
        box3Label: 'Total Estimates (کل کوٹیشنز)',
        box3Value: total,
        box3Bg: 'bg-orange-50 dark:bg-orange-950/60',
        box3Border: 'border-orange-200 dark:border-orange-700/80',
        box3Text: 'text-orange-800 dark:text-orange-300',
        box3LabelColor: 'text-orange-700 dark:text-orange-400',
      };
    } else if (activeSubView === 'payment-in') {
      const total = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const cash = filteredPayments.filter(p => p.paymentMode === 'Cash' || !p.paymentMode).reduce((sum, p) => sum + (p.amount || 0), 0);
      const bank = Math.max(0, total - cash);
      return {
        box1Label: 'Cash In (کیش وصولی)',
        box1Value: cash,
        box1Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box1Border: 'border-emerald-200 dark:border-emerald-700/80',
        box1Text: 'text-emerald-800 dark:text-emerald-300',
        box1LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol1: '+',
        box2Label: 'Bank & Online (بینک / آن لائن)',
        box2Value: bank,
        box2Bg: 'bg-indigo-50 dark:bg-indigo-950/60',
        box2Border: 'border-indigo-200 dark:border-indigo-700/80',
        box2Text: 'text-indigo-800 dark:text-indigo-300',
        box2LabelColor: 'text-indigo-700 dark:text-indigo-400',
        symbol2: '=',
        box3Label: 'Total Payments Received (کل وصولی)',
        box3Value: total,
        box3Bg: 'bg-teal-50 dark:bg-teal-950/60',
        box3Border: 'border-teal-200 dark:border-teal-700/80',
        box3Text: 'text-teal-800 dark:text-teal-300',
        box3LabelColor: 'text-teal-700 dark:text-teal-400',
      };
    } else if (activeSubView === 'order') {
      const total = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const pending = filteredInvoices.filter(i => i.status === 'Pending' || !i.status).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const completed = Math.max(0, total - pending);
      return {
        box1Label: 'Pending Orders (زیر التواء)',
        box1Value: pending,
        box1Bg: 'bg-purple-50 dark:bg-purple-950/60',
        box1Border: 'border-purple-200 dark:border-purple-700/80',
        box1Text: 'text-purple-800 dark:text-purple-300',
        box1LabelColor: 'text-purple-700 dark:text-purple-400',
        symbol1: '+',
        box2Label: 'Fulfilled / Invoiced (مکمل)',
        box2Value: completed,
        box2Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box2Border: 'border-emerald-200 dark:border-emerald-700/80',
        box2Text: 'text-emerald-800 dark:text-emerald-300',
        box2LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol2: '=',
        box3Label: 'Total Orders (کل آرڈرز)',
        box3Value: total,
        box3Bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/60',
        box3Border: 'border-fuchsia-200 dark:border-fuchsia-700/80',
        box3Text: 'text-fuchsia-800 dark:text-fuchsia-300',
        box3LabelColor: 'text-fuchsia-700 dark:text-fuchsia-400',
      };
    } else if (activeSubView === 'challan') {
      const total = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const dispatched = filteredInvoices.filter(i => i.status === 'Dispatched' || !i.status).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const invoiced = Math.max(0, total - dispatched);
      return {
        box1Label: 'Dispatched Challans (بھیجے گئے)',
        box1Value: dispatched,
        box1Bg: 'bg-cyan-50 dark:bg-cyan-950/60',
        box1Border: 'border-cyan-200 dark:border-cyan-700/80',
        box1Text: 'text-cyan-800 dark:text-cyan-300',
        box1LabelColor: 'text-cyan-700 dark:text-cyan-400',
        symbol1: '+',
        box2Label: 'Billed / Completed (بل شدہ)',
        box2Value: invoiced,
        box2Bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        box2Border: 'border-emerald-200 dark:border-emerald-700/80',
        box2Text: 'text-emerald-800 dark:text-emerald-300',
        box2LabelColor: 'text-emerald-700 dark:text-emerald-400',
        symbol2: '=',
        box3Label: 'Total Challan Value (کل مالیت)',
        box3Value: total,
        box3Bg: 'bg-sky-50 dark:bg-sky-950/60',
        box3Border: 'border-sky-200 dark:border-sky-700/80',
        box3Text: 'text-sky-800 dark:text-sky-300',
        box3LabelColor: 'text-sky-700 dark:text-sky-400',
      };
    } else {
      // Sale Return
      const total = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const cashRefunded = filteredInvoices.filter(i => i.paymentType === 'Cash').reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const creditAdjusted = Math.max(0, total - cashRefunded);
      return {
        box1Label: 'Cash Refunded (کیش واپس)',
        box1Value: cashRefunded,
        box1Bg: 'bg-rose-50 dark:bg-rose-950/60',
        box1Border: 'border-rose-200 dark:border-rose-700/80',
        box1Text: 'text-rose-800 dark:text-rose-300',
        box1LabelColor: 'text-rose-700 dark:text-rose-400',
        symbol1: '+',
        box2Label: 'Credit Note Adjusted (کھاتے میں)',
        box2Value: creditAdjusted,
        box2Bg: 'bg-red-50 dark:bg-red-950/60',
        box2Border: 'border-red-200 dark:border-red-700/80',
        box2Text: 'text-red-800 dark:text-red-300',
        box2LabelColor: 'text-red-700 dark:text-red-400',
        symbol2: '=',
        box3Label: 'Total Sale Returns (کل واپسی)',
        box3Value: total,
        box3Bg: 'bg-rose-100 dark:bg-rose-900/60',
        box3Border: 'border-rose-300 dark:border-rose-700/80',
        box3Text: 'text-rose-900 dark:text-rose-300',
        box3LabelColor: 'text-rose-800 dark:text-rose-400',
      };
    }
  }, [activeSubView, filteredInvoices, filteredPayments]);

  // Sorting helper
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Convert Estimate / Order / Challan -> Sale Invoice
  const handleConvertToSale = async (sourceInvoice: Invoice) => {
    try {
      // 1. Calculate next Sale Invoice number
      const saleInvoices = invoices.filter(i => (i.transactionType || 'Sale') === 'Sale');
      const maxNum = saleInvoices.reduce((max, i) => {
        const num = parseInt(i.invoiceNumber.replace(/\D/g, '') || '0');
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextSaleNum = (maxNum + 1).toString();

      // 2. Create converted Sale Invoice
      const convertedInvoice: Invoice = {
        ...sourceInvoice,
        id: uuidv4(),
        invoiceNumber: nextSaleNum,
        date: new Date().toISOString(),
        transactionType: 'Sale',
        status: 'Completed',
        description: `Converted from ${sourceInvoice.transactionType} #${sourceInvoice.invoiceNumber}. ${sourceInvoice.description || ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(convertedInvoice);

      // 3. Deduct inventory & create audit logs
      for (const item of sourceInvoice.items) {
        if (item.medicineId) {
          const med = medicines.find(m => m.id === item.medicineId);
          if (med) {
            const updatedQty = Math.max(0, med.quantity - item.quantity);
            await dbMedicines.save({ ...med, quantity: updatedQty });

            const audit: AuditLog = {
              id: uuidv4(),
              date: new Date().toISOString(),
              action: 'SALE',
              medicineId: med.id,
              medicineName: med.name,
              quantityChanged: -item.quantity,
              userId: '1',
              notes: `Sold in converted Invoice #${nextSaleNum} from ${sourceInvoice.transactionType} #${sourceInvoice.invoiceNumber}`,
            };
            await dbAuditLogs.save(audit);
          }
        }
      }

      // 4. Update customer party balance if credit
      if (convertedInvoice.partyId) {
        const party = parties.find(p => p.id === convertedInvoice.partyId);
        if (party) {
          const newBal = (party.balance || 0) + convertedInvoice.balanceDue;
          await dbSuppliers.save({ ...party, balance: newBal });
        }
      }

      // 5. Update source record status
      await dbInvoices.save({
        ...sourceInvoice,
        status: 'Converted',
        updatedAt: new Date().toISOString()
      });

      await loadAllData();
      showToast(`⚡ Successfully converted ${sourceInvoice.transactionType} #${sourceInvoice.invoiceNumber} to Sale Invoice #${nextSaleNum}!`);
      
      // Auto open print preview for the new invoice
      setSelectedPrintInvoice(convertedInvoice);
      setIsPrintModalOpen(true);
      setActiveMenuId(null);
    } catch (err) {
      console.error('Failed to convert transaction:', err);
      alert('Error converting transaction. Please check console.');
    }
  };

  // Convert Sale Order -> Delivery Challan
  const handleConvertToChallan = async (sourceInvoice: Invoice) => {
    try {
      const challans = invoices.filter(i => i.transactionType === 'Delivery Challan');
      const maxNum = challans.reduce((max, i) => {
        const num = parseInt(i.invoiceNumber.replace(/\D/g, '') || '0');
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextChallanNum = `DC-${maxNum + 1}`;

      const challanInvoice: Invoice = {
        ...sourceInvoice,
        id: uuidv4(),
        invoiceNumber: nextChallanNum,
        date: new Date().toISOString(),
        transactionType: 'Delivery Challan',
        status: 'Dispatched',
        description: `Dispatched against Order #${sourceInvoice.invoiceNumber}. ${sourceInvoice.description || ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await dbInvoices.save(challanInvoice);
      await loadAllData();
      showToast(`🚚 Created Delivery Challan #${nextChallanNum} from Order #${sourceInvoice.invoiceNumber}!`);
      setSelectedPrintInvoice(challanInvoice);
      setIsPrintModalOpen(true);
      setActiveMenuId(null);
    } catch (err) {
      console.error('Failed to convert order to challan:', err);
      alert('Error creating challan.');
    }
  };

  // Delete State
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<Invoice | null>(null);
  const [deleteTargetPayment, setDeleteTargetPayment] = useState<PartyPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete invoice trigger
  const handleDeleteInvoice = (inv: Invoice) => {
    setDeleteTargetInvoice(inv);
    setActiveMenuId(null);
  };

  // Confirm delete invoice
  const handleConfirmDeleteInvoice = async () => {
    if (!deleteTargetInvoice) return;
    setIsDeleting(true);
    try {
      // Revert stock if needed
      if (deleteTargetInvoice.items) {
        for (const item of deleteTargetInvoice.items) {
          const med = medicines.find(m => m.id === item.medicineId || m.name.toLowerCase() === item.name.toLowerCase());
          if (med) {
            await dbMedicines.save({
              ...med,
              quantity: (med.quantity || 0) + item.quantity,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      await dbInvoices.delete(deleteTargetInvoice.id);
      await loadAllData();
      showToast(`${deleteTargetInvoice.transactionType || 'Invoice'} #${deleteTargetInvoice.invoiceNumber} deleted.`);
      setDeleteTargetInvoice(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      showToast('Error deleting invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete payment trigger
  const handleDeletePayment = (p: PartyPayment) => {
    setDeleteTargetPayment(p);
  };

  // Confirm delete payment
  const handleConfirmDeletePayment = async () => {
    if (!deleteTargetPayment) return;
    setIsDeleting(true);
    try {
      if (deleteTargetPayment.partyId) {
        const party = parties.find(p => p.id === deleteTargetPayment.partyId);
        if (party) {
          const currentBal = party.balance ?? party.openingBalance ?? 0;
          await dbSuppliers.save({
            ...party,
            balance: currentBal + deleteTargetPayment.amount,
            updatedAt: new Date().toISOString()
          } as any);
        }
      }
      await dbPartyPayments.delete(deleteTargetPayment.id);
      window.dispatchEvent(new Event('mbi-local-db-change'));
      await loadAllData();
      showToast('Payment In record deleted successfully.');
      setDeleteTargetPayment(null);
    } catch (err) {
      console.error('Failed to delete payment:', err);
      showToast('Error deleting payment.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate handler
  const handleDuplicateInvoice = async (inv: Invoice) => {
    const nextNum = (Math.max(...invoices.map(i => parseInt(i.invoiceNumber.replace(/\D/g, '') || '0')), 0) + 1).toString();
    const duplicated: Invoice = {
      ...inv,
      id: uuidv4(),
      invoiceNumber: nextNum,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await dbInvoices.save(duplicated);
    await loadAllData();
    showToast(`Transaction duplicated as #${nextNum}`);
    setActiveMenuId(null);
  };

  // Quick Payment In Save
  const handleSaveQuickPayment = async () => {
    if (!quickPaymentInvoice || quickPaymentAmount <= 0) return;

    const newReceived = (quickPaymentInvoice.receivedAmount || 0) + quickPaymentAmount;
    const newBalanceDue = Math.max(0, quickPaymentInvoice.grandTotal - newReceived);

    const updatedInvoice: Invoice = {
      ...quickPaymentInvoice,
      receivedAmount: newReceived,
      balanceDue: newBalanceDue,
      updatedAt: new Date().toISOString()
    };

    await dbInvoices.save(updatedInvoice);

    const paymentRecord: PartyPayment = {
      id: uuidv4(),
      partyId: quickPaymentInvoice.partyId || quickPaymentInvoice.id,
      partyName: quickPaymentInvoice.customerName,
      type: 'PAYMENT_IN',
      amount: quickPaymentAmount,
      date: new Date().toISOString(),
      paymentMode: 'Cash',
      notes: `Payment against ${quickPaymentInvoice.transactionType || 'Invoice'} #${quickPaymentInvoice.invoiceNumber}`,
      createdAt: new Date().toISOString()
    };
    await dbPartyPayments.save(paymentRecord);

    // Reduce party balance
    if (quickPaymentInvoice.partyId) {
      const party = parties.find(p => p.id === quickPaymentInvoice.partyId);
      if (party) {
        const newBal = Math.max(0, (party.balance || 0) - quickPaymentAmount);
        await dbSuppliers.save({ ...party, balance: newBal });
      }
    }

    setIsQuickPaymentOpen(false);
    setQuickPaymentInvoice(null);
    await loadAllData();
    showToast(`Received Rs ${quickPaymentAmount.toLocaleString()} recorded!`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      if (activeSubView === 'payment-in') {
        const exportData = filteredPayments.map((p, idx) => ({
          'Sr #': idx + 1,
          'Date': p.date.slice(0, 10),
          'Party Name': p.partyName,
          'Payment Type': 'Payment In (وصولی)',
          'Payment Mode': p.paymentMode || 'Cash',
          'Amount Received (PKR)': p.amount,
          'Reference / Receipt #': p.referenceNumber || '',
          'Remarks / Notes': p.notes || ''
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payment In Ledger');
        XLSX.writeFile(wb, `Payment_In_${startDate}_to_${endDate}.xlsx`);
      } else {
        const exportData = filteredInvoices.map((inv, idx) => ({
          'Sr #': idx + 1,
          'Date': inv.date.slice(0, 10),
          'Document No': inv.invoiceNumber,
          'Customer / Party Name': inv.customerName,
          'Transaction Type': inv.transactionType || 'Sale',
          'Status': inv.status || 'Active',
          'Payment Type': inv.paymentType || 'Cash',
          'Items Count': inv.items.length,
          'Subtotal': inv.subTotal,
          'Discount': inv.discountAmount || 0,
          'Tax': inv.taxAmount || 0,
          'Total Amount (PKR)': inv.grandTotal,
          'Paid Amount (PKR)': inv.receivedAmount || 0,
          'Balance Due (PKR)': inv.balanceDue,
          'Remarks': inv.description || ''
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${currentSubMenu.label} Report`);
        XLSX.writeFile(wb, `${currentSubMenu.label.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`);
      }
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Error exporting Excel report.');
    }
  };

  // Visual Chart Data
  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; amount: number; count: number }> = {};
    if (activeSubView === 'payment-in') {
      filteredPayments.forEach(p => {
        const d = p.date.slice(0, 10);
        if (!map[d]) map[d] = { date: d.slice(5), amount: 0, count: 0 };
        map[d].amount += p.amount;
        map[d].count += 1;
      });
    } else {
      filteredInvoices.forEach(inv => {
        const d = inv.date.slice(0, 10);
        if (!map[d]) map[d] = { date: d.slice(5), amount: 0, count: 0 };
        map[d].amount += inv.grandTotal;
        map[d].count += 1;
      });
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredInvoices, filteredPayments, activeSubView]);

  const customerShareData = useMemo(() => {
    const map: Record<string, number> = {};
    if (activeSubView === 'payment-in') {
      filteredPayments.forEach(p => {
        map[p.partyName] = (map[p.partyName] || 0) + p.amount;
      });
    } else {
      filteredInvoices.forEach(inv => {
        map[inv.customerName] = (map[inv.customerName] || 0) + inv.grandTotal;
      });
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices, filteredPayments, activeSubView]);

  const COLORS = ['#0070f3', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const partyOptions = useMemo(() => {
    return [
      { id: 'ALL', name: 'All Parties / Customers' },
      ...parties.map(p => ({
        id: p.id || p.name,
        name: p.name,
        phone: p.phone,
        type: p.partyType
      }))
    ];
  }, [parties]);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(new Set(medicines.map(m => m.category).filter(Boolean)));
    return ['ALL', ...uniqueCategories];
  }, [medicines]);

  const statusOptions = useMemo(() => {
    if (activeSubView === 'payment-in') return undefined;
    if (activeSubView === 'invoices') {
      return [
        { id: 'ALL', label: 'All Invoices' },
        { id: 'Paid', label: 'Paid Only' },
        { id: 'Unpaid', label: 'Unpaid / Credit Only' },
      ];
    }
    if (activeSubView === 'quotation') {
      return [
        { id: 'ALL', label: 'All Quotations' },
        { id: 'Pending', label: 'Open / Pending' },
        { id: 'Completed', label: 'Converted to Sale' },
      ];
    }
    if (activeSubView === 'order') {
      return [
        { id: 'ALL', label: 'All Orders' },
        { id: 'Pending', label: 'Pending Orders' },
        { id: 'Completed', label: 'Completed Orders' },
      ];
    }
    return undefined;
  }, [activeSubView]);

  // Dynamic Column Filter Options with real counts
  const partyColumnOptions = useMemo(() => {
    const targetType = currentSubMenu.transactionType || 'Sale';
    const subviewInvoices = invoices.filter(i => (i.transactionType || 'Sale') === targetType);
    const names = activeSubView === 'payment-in'
      ? payments.map(p => p.partyName).filter(Boolean)
      : subviewInvoices.map(i => i.customerName).filter(Boolean);
    const counts: Record<string, number> = {};
    names.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    const unique = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { label: 'All Parties', value: 'ALL', count: names.length },
      ...unique.map(name => ({ label: name, value: name, count: counts[name] }))
    ];
  }, [activeSubView, payments, invoices, currentSubMenu]);

  const statusColumnOptions = useMemo(() => {
    const targetType = currentSubMenu.transactionType || 'Sale';
    const subviewInvoices = invoices.filter(i => (i.transactionType || 'Sale') === targetType);
    
    if (activeSubView === 'invoices') {
      const paidCount = subviewInvoices.filter(i => (i.balanceDue || 0) <= 0).length;
      const unpaidCount = subviewInvoices.filter(i => (i.balanceDue || 0) > 0).length;
      return [
        { label: 'All Invoices', value: 'ALL', count: subviewInvoices.length },
        { label: 'Paid Only', value: 'Paid', count: paidCount },
        { label: 'Unpaid / Due', value: 'Unpaid', count: unpaidCount },
      ];
    }
    if (activeSubView === 'quotation') {
      const pendingCount = subviewInvoices.filter(i => i.status !== 'Converted' && i.status !== 'Completed').length;
      const convertedCount = subviewInvoices.filter(i => i.status === 'Converted' || i.status === 'Completed').length;
      return [
        { label: 'All Quotations', value: 'ALL', count: subviewInvoices.length },
        { label: 'Open / Pending', value: 'Pending', count: pendingCount },
        { label: 'Converted to Sale', value: 'Completed', count: convertedCount },
      ];
    }
    if (activeSubView === 'order') {
      const pendingCount = subviewInvoices.filter(i => i.status === 'Pending' || !i.status).length;
      const completedCount = subviewInvoices.filter(i => i.status === 'Completed' || i.status === 'Converted').length;
      return [
        { label: 'All Orders', value: 'ALL', count: subviewInvoices.length },
        { label: 'Pending Orders', value: 'Pending', count: pendingCount },
        { label: 'Fulfilled / Invoiced', value: 'Completed', count: completedCount },
      ];
    }
    if (activeSubView === 'challan') {
      const dispatchedCount = subviewInvoices.filter(i => i.status === 'Dispatched' || !i.status).length;
      const completedCount = subviewInvoices.filter(i => i.status === 'Completed' || i.status === 'Converted').length;
      return [
        { label: 'All Challans', value: 'ALL', count: subviewInvoices.length },
        { label: 'Dispatched', value: 'Dispatched', count: dispatchedCount },
        { label: 'Billed / Completed', value: 'Completed', count: completedCount },
      ];
    }
    if (activeSubView === 'return') {
      const cashCount = subviewInvoices.filter(i => i.paymentType === 'Cash').length;
      const creditCount = subviewInvoices.filter(i => i.paymentType !== 'Cash').length;
      return [
        { label: 'All Returns', value: 'ALL', count: subviewInvoices.length },
        { label: 'Cash Refunded', value: 'Cash', count: cashCount },
        { label: 'Credit Adjusted', value: 'Credit', count: creditCount },
      ];
    }
    return [];
  }, [activeSubView, invoices, currentSubMenu]);

  const paymentTypeColumnOptions = useMemo(() => {
    const targetType = currentSubMenu.transactionType || 'Sale';
    const subviewInvoices = invoices.filter(i => (i.transactionType || 'Sale') === targetType);
    const cashCount = subviewInvoices.filter(i => (i.paymentType || 'Cash').toLowerCase() === 'cash').length;
    const creditCount = subviewInvoices.filter(i => (i.paymentType || '').toLowerCase() === 'credit').length;
    const bankCount = subviewInvoices.filter(i => {
      const pt = (i.paymentType || '').toLowerCase();
      return pt.includes('bank') || pt.includes('online') || pt.includes('transfer');
    }).length;
    const chequeCount = subviewInvoices.filter(i => (i.paymentType || '').toLowerCase().includes('cheque')).length;
    return [
      { label: 'All Payment Types', value: 'ALL', count: subviewInvoices.length },
      { label: 'Cash', value: 'Cash', count: cashCount },
      { label: 'Credit / Khata', value: 'Credit', count: creditCount },
      { label: 'Bank / Online', value: 'Bank', count: bankCount },
      { label: 'Cheque', value: 'Cheque', count: chequeCount },
    ].filter(opt => opt.value === 'ALL' || (opt.count && opt.count > 0));
  }, [invoices, currentSubMenu]);

  const paymentModeColumnOptions = useMemo(() => {
    const list = payments.filter(p => !p.type || p.type === 'PAYMENT_IN');
    const cashCount = list.filter(p => (p.paymentMode || 'Cash').toLowerCase() === 'cash').length;
    const bankCount = list.filter(p => {
      const pm = (p.paymentMode || '').toLowerCase();
      return pm.includes('bank') || pm.includes('online') || pm.includes('transfer');
    }).length;
    const chequeCount = list.filter(p => (p.paymentMode || '').toLowerCase().includes('cheque')).length;
    return [
      { label: 'All Payment Modes', value: 'ALL', count: list.length },
      { label: 'Cash', value: 'Cash', count: cashCount },
      { label: 'Bank / Online', value: 'Bank', count: bankCount },
      { label: 'Cheque', value: 'Cheque', count: chequeCount },
    ].filter(opt => opt.value === 'ALL' || (opt.count && opt.count > 0));
  }, [payments]);

  const handleResetFilters = () => {
    setPeriodPreset('This Month');
    handlePeriodChange('This Month');
    setSelectedParty('ALL');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setSelectedFirm('ALL FIRMS');
    setSearchQuery('');
    setColFilters({
      party: 'ALL',
      status: 'ALL',
      paymentType: 'ALL',
      paymentMode: 'ALL',
    });
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

      {/* UNIFIED SHARED REPORT FILTER BAR */}
      <ReportFilterBar
        dateRange={{
          startDate,
          endDate,
          preset: periodPreset as DatePreset
        }}
        onDateRangeChange={(range) => {
          setStartDate(range.startDate);
          setEndDate(range.endDate);
          setPeriodPreset(range.preset);
        }}
        partyOptions={partyOptions}
        selectedParty={selectedParty}
        onPartyChange={setSelectedParty}
        categoryOptions={categoryOptions}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        statusOptions={statusOptions}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search ${currentSubMenu.label.toLowerCase()} by invoice #, customer...`}
        onResetAllFilters={handleResetFilters}
        showSyncIndicator={true}
      >
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
          title="Keyboard Shortcuts Cheat Sheet (F12 / ?)"
        >
          <Keyboard className="w-3.5 h-3.5 text-amber-600" />
          <span>Shortcuts</span>
        </button>

        <button
          onClick={() => setShowGraph(!showGraph)}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
            showGraph 
              ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs' 
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
          <span>Graph</span>
        </button>

        <button
          onClick={handleExportExcel}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Excel</span>
        </button>

        <button
          onClick={() => window.print()}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Print</span>
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
            Rs {kpiData.box1Value.toFixed(2)}
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
            Rs {kpiData.box2Value.toFixed(2)}
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
            Rs {kpiData.box3Value.toFixed(2)}
          </div>
        </div>

      </div>

      {/* Visual Analytics Chart Panel (when Graph is toggled) */}
      {showGraph && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{currentSubMenu.label} Analytics & Distribution</span>
            </h3>
            <button
              onClick={() => setShowGraph(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 h-64">
              <p className="text-xs font-bold text-slate-500 mb-2">Daily Revenue Trend (PKR)</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#0070f3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-4 h-64 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-500 mb-2">Party Distribution</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerShareData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                  >
                    {customerShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MAIN DATA TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Section Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <currentSubMenu.icon className="w-4 h-4 text-blue-600" />
              <span>{currentSubMenu.label.toUpperCase()}</span>
            </h2>
            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-xs">
              {activeSubView === 'payment-in' ? filteredPayments.length : filteredInvoices.length} Records
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end min-w-0">
            
            {/* Search Input Box with Flexbox / flex-grow and min-w-[300px] */}
            <div className="relative flex-grow min-w-[240px] sm:min-w-[300px] max-w-xl group">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                searchQuery ? 'text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'
              }`} />
              <input
                type="text"
                tabIndex={0}
                placeholder={`Search ${currentSubMenu.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                className="w-full pl-8.5 pr-8 py-2 bg-slate-50/90 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
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

            {/* Controlled / Narcotics Sale Quick Action */}
            {activeSubView === 'invoices' && (
              <button
                onClick={() => setIsControlledSaleOpen(true)}
                title="PIN-Authorized Form-7 / Controlled Medicine Sale"
                className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Controlled Sale</span>
              </button>
            )}

            {/* Dynamic Primary "+ Add" Button */}
            <button
              onClick={() => {
                if (activeSubView === 'payment-in') {
                  setIsAddPaymentInOpen(true);
                } else {
                  setEditingInvoice(null);
                  setIsAddSaleOpen(true);
                }
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{currentSubMenu.btnLabel}</span>
            </button>

          </div>

        </div>

        {/* IF PAYMENT IN SUBVIEW: Display Payments Table / Mobile Cards */}
        {activeSubView === 'payment-in' ? (
          <>
            {/* Mobile Card-Based View */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-slate-50/50">
              {filteredPayments.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => handleViewPayment(p)}
                  className="p-3.5 bg-white space-y-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {p.referenceNumber || 'RCT-' + p.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>
                    <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px]">
                      {p.paymentMode || 'Cash'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{p.partyName}</h4>
                      {p.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-slate-400 block font-medium">Amount</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        Rs {p.amount.toLocaleString()}
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
                        onClick={() => handleDeletePayment(p)}
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
                  No Payment In records found for this period.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <ColumnHeader
                      label="DATE"
                      sortKey="date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="REF / RECEIPT #"
                      sortKey="referenceNumber"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="PARTY / CUSTOMER"
                      sortKey="partyName"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="party"
                      activeFilterValue={colFilters.party}
                      filterOptions={partyColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, party: val }))}
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
                      label="AMOUNT (PKR)"
                      sortKey="amount"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    <th className="py-2.5 px-3 text-center w-24 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedPayments.map((p) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onDoubleClick={() => handleViewPayment(p)}
                      title="Double-click to preview voucher"
                    >
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {p.referenceNumber || 'RCT-' + p.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.partyName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[11px]">
                          {p.paymentMode || 'Cash'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate">
                        {p.notes || 'Payment received'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                        Rs {p.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View / Print Voucher"
                            onClick={() => handleViewPayment(p)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Edit Payment"
                            onClick={() => handleEditPayment(p)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Payment"
                            onClick={() => handleDeletePayment(p)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No Payment In records found for this period. Click "+ Add Payment In" to record a receipt.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ALL OTHER SALES SUBVIEWS (Invoices, Estimates, Orders, Challans, Returns) */
          <>
            {/* Mobile Card-Based View for Sales / Invoices */}
            <div className="block sm:hidden divide-y divide-slate-100 bg-slate-50/50">
              {paginatedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => {
                    setSelectedPrintInvoice(inv);
                    setIsPrintModalOpen(true);
                  }}
                  className="p-3.5 bg-white space-y-2.5 border-b border-slate-100 last:border-0 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-xs text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md">
                        #{inv.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      {inv.status === 'Converted' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Check className="w-2.5 h-2.5" /> Invoiced
                        </span>
                      ) : inv.status === 'Dispatched' ? (
                        <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Truck className="w-2.5 h-2.5" /> Dispatched
                        </span>
                      ) : inv.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                          {inv.status || 'Active'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{inv.customerName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {inv.customerPhone && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {inv.customerPhone}
                          </span>
                        )}
                        <span className={`inline-block px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          inv.paymentType === 'Cash' 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {inv.paymentType || 'Cash'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-slate-900 text-sm block">
                        Rs {inv.grandTotal.toLocaleString()}
                      </span>
                      {activeSubView === 'invoices' && inv.balanceDue > 0 && (
                        <span className="text-[11px] font-mono font-black text-rose-600 block">
                          Due: Rs {inv.balanceDue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    {(activeSubView === 'quotation' || activeSubView === 'order' || activeSubView === 'challan') && inv.status !== 'Converted' ? (
                      <button
                        onClick={() => handleConvertToSale(inv)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md text-[10px] font-bold border border-blue-200 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5" /> Convert to Sale
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpandInvoice(inv.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                          expandedInvoiceIds.has(inv.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title="Click to view/hide items"
                      >
                        <Package className="w-3 h-3" />
                        <span>{inv.items?.length || 0} items</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedInvoiceIds.has(inv.id) ? 'rotate-180' : ''}`} />
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="View / Print"
                        onClick={() => {
                          setSelectedPrintInvoice(inv);
                          setIsPrintModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          setEditingInvoice(inv);
                          setIsAddSaleOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="WhatsApp Share"
                        onClick={() => {
                          setSelectedShareInvoice(inv);
                          setIsShareModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDeleteInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Breakdown for Mobile */}
                  {expandedInvoiceIds.has(inv.id) && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-blue-200 bg-blue-50/60 -mx-3 -mb-3 p-3 rounded-b-xl space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center pb-1 border-b border-blue-100">
                        <span className="flex items-center gap-1.5 text-blue-800">
                          <Package className="w-3.5 h-3.5" /> ITEMS ({inv.items?.length || 0})
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => toggleExpandInvoice(inv.id)}>Fold ▲</span>
                      </div>
                      <div className="divide-y divide-blue-100 text-xs">
                        {(inv.items || []).map((item, itIdx) => (
                          <div key={item.id || itIdx} className="py-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span>Qty: <strong className="text-slate-800">{item.quantity} {item.unit || ''}</strong></span>
                                {item.batchNumber && <span>• Batch: {item.batchNumber}</span>}
                                {item.expiryDate && <span>• Exp: {item.expiryDate}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono">
                              <div className="text-[11px] text-slate-600">@ Rs {(Number(item.sellingPrice || item.pricePerUnit) || 0).toLocaleString()}</div>
                              <div className="font-black text-slate-900 text-xs">
                                Rs {(item.total || (Number(item.quantity || 0) * Number(item.sellingPrice || item.pricePerUnit || 0))).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!inv.items || inv.items.length === 0) && (
                          <div className="py-2 text-center text-slate-400 text-xs">No items recorded in this invoice.</div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-blue-100 flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="text-slate-500">Invoice Net Total</span>
                        <span className="font-mono text-sm font-black text-blue-700">Rs {inv.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredInvoices.length === 0 && !loading && (
                <div className="py-10 text-center text-slate-400 text-xs px-4">
                  No records found for {currentSubMenu.label}.
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <ColumnHeader
                      label="DATE"
                      sortKey="date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="DOC NO."
                      sortKey="invoiceNumber"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                    <ColumnHeader
                      label="PARTY NAME"
                      sortKey="customerName"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="party"
                      activeFilterValue={colFilters.party}
                      filterOptions={partyColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, party: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
                    <th className="py-2.5 px-3 text-center text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      ITEMS
                    </th>
                    <ColumnHeader
                      label="STATUS"
                      sortKey="status"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterKey="status"
                      activeFilterValue={colFilters.status}
                      filterOptions={statusColumnOptions}
                      onSelectFilter={(val) => setColFilters(prev => ({ ...prev, status: val }))}
                      openPopoverKey={openFilterPopover}
                      setOpenPopoverKey={setOpenFilterPopover}
                      filterSearch={filterSearchQuery}
                      setFilterSearch={setFilterSearchQuery}
                    />
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
                      label="AMOUNT"
                      sortKey="grandTotal"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      align="right"
                    />
                    {activeSubView === 'invoices' && (
                      <ColumnHeader
                        label="BALANCE DUE"
                        sortKey="balanceDue"
                        currentSortField={sortField}
                        currentSortOrder={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                    )}
                    <th className="py-2.5 px-3 text-center w-36 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceIds.has(inv.id);
                    return (
                      <React.Fragment key={inv.id}>
                        <tr 
                          className={`transition-colors group cursor-pointer ${
                            isExpanded ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-blue-50/40'
                          }`}
                          onClick={() => toggleExpandInvoice(inv.id)}
                        >
                          {/* Date */}
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>

                          {/* Document Number */}
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                            {inv.invoiceNumber}
                          </td>

                          {/* Party Name */}
                          <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs truncate">
                            {inv.customerName}
                            {inv.customerPhone && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {inv.customerPhone}
                              </span>
                            )}
                          </td>

                          {/* Items Column */}
                          <td className="py-2.5 px-3 text-center" onClick={(e) => { e.stopPropagation(); toggleExpandInvoice(inv.id); }}>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-blue-600 text-white shadow-xs' 
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              }`}
                              title="Click to view items inside this invoice"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>{inv.items?.length || 0} items</span>
                              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white' : 'text-blue-500'}`} />
                            </button>
                          </td>

                      {/* Status / Transaction Subtype */}
                      <td className="py-2.5 px-3">
                        {inv.status === 'Converted' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            <Check className="w-3 h-3" /> Invoiced
                          </span>
                        ) : inv.status === 'Dispatched' ? (
                          <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            <Truck className="w-3 h-3" /> Dispatched
                          </span>
                        ) : inv.status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                            {inv.status || 'Active'}
                          </span>
                        )}
                      </td>

                      {/* Payment Type */}
                      <td className="py-2.5 px-3 text-slate-600">
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${
                          inv.paymentType === 'Cash' 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : 'bg-rose-50 text-rose-800'
                        }`}>
                          {inv.paymentType || 'Cash'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {inv.grandTotal.toLocaleString()}
                      </td>

                      {/* Balance Due (Only on Sale Invoices) */}
                      {activeSubView === 'invoices' && (
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={inv.balanceDue > 0 ? 'text-rose-600 font-black' : 'text-slate-500'}>
                            {inv.balanceDue.toLocaleString()}
                          </span>
                        </td>
                      )}

                      {/* Action Column */}
                      <td 
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Quick Convert Button for Estimates, Orders, and Challans */}
                          {(activeSubView === 'quotation' || activeSubView === 'order' || activeSubView === 'challan') && inv.status !== 'Converted' && (
                            <button
                              title="Convert to Sale Invoice"
                              onClick={() => handleConvertToSale(inv)}
                              className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Convert</span>
                            </button>
                          )}

                          {/* View / Print */}
                          <button
                            type="button"
                            title="View / Print Document"
                            onClick={() => {
                              setSelectedPrintInvoice(inv);
                              setIsPrintModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Document */}
                          <button
                            type="button"
                            title="Edit Document"
                            onClick={() => {
                              setEditingInvoice(inv);
                              setIsAddSaleOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Document */}
                          <button
                            type="button"
                            title="Delete Document"
                            onClick={() => handleDeleteInvoice(inv)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            title="Share on WhatsApp"
                            onClick={() => {
                              setSelectedShareInvoice(inv);
                              setIsShareModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 3-Dots Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              title="More Actions"
                              onClick={() => setActiveMenuId(activeMenuId === inv.id ? null : inv.id)}
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuId === inv.id && (
                              <div 
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left animate-in fade-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setSelectedPrintInvoice(inv);
                                    setIsPrintModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  View / Print
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingInvoice(inv);
                                    setIsAddSaleOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                  Edit Document
                                </button>

                                {/* Convert to Sale */}
                                {(activeSubView === 'quotation' || activeSubView === 'order' || activeSubView === 'challan') && inv.status !== 'Converted' && (
                                  <button
                                    onClick={() => handleConvertToSale(inv)}
                                    className="w-full px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-bold"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                    Convert to Sale Invoice
                                  </button>
                                )}

                                {/* Order to Challan */}
                                {activeSubView === 'order' && (
                                  <button
                                    onClick={() => handleConvertToChallan(inv)}
                                    className="w-full px-3 py-1.5 text-xs text-cyan-700 hover:bg-cyan-50 flex items-center gap-2 font-bold"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-cyan-500" />
                                    Create Delivery Challan
                                  </button>
                                )}

                                {/* Payment In shortcut */}
                                {activeSubView === 'invoices' && inv.balanceDue > 0 && (
                                  <button
                                    onClick={() => {
                                      setQuickPaymentInvoice(inv);
                                      setQuickPaymentAmount(inv.balanceDue);
                                      setIsQuickPaymentOpen(true);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-bold"
                                  >
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                                    Record Payment In
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDuplicateInvoice(inv)}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  Duplicate
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>

                                <button
                                  onClick={() => handleDeleteInvoice(inv)}
                                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  Delete Document
                                </button>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>

                        </tr>

                        {/* Expanded Items Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-slate-50 border-b-2 border-blue-200">
                            <td colSpan={activeSubView === 'invoices' ? 9 : 8} className="p-0">
                              <div className="p-4 bg-gradient-to-b from-blue-50/60 to-slate-50 border-y border-blue-200/70 shadow-inner" onClick={(e) => e.stopPropagation()}>
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Package className="w-4 h-4 text-blue-600" />
                                      <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Invoice Items Breakdown — {inv.invoiceNumber}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                                        {inv.items?.length || 0} item(s)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                                      <span>Customer: <strong className="text-slate-900">{inv.customerName}</strong></span>
                                      <span>•</span>
                                      <span>Date: <strong className="text-slate-900">{new Date(inv.date).toLocaleDateString('en-GB')}</strong></span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPrintInvoice(inv);
                                          setIsPrintModalOpen(true);
                                        }}
                                        className="ml-2 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 border border-blue-200 transition-colors cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" /> View / Print
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandInvoice(inv.id)}
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
                                        <th className="py-2 px-3 text-right">Unit Rate</th>
                                        <th className="py-2 px-3 text-right">Discount</th>
                                        <th className="py-2 px-3 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {(inv.items || []).map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-blue-50/30 transition-colors">
                                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                          <td className="py-2 px-3 font-bold text-slate-900">
                                            {item.name}
                                            {item.genericName && <span className="block text-[10px] text-slate-400 font-normal">{item.genericName}</span>}
                                          </td>
                                          <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{item.batchNumber || '—'}</td>
                                          <td className="py-2 px-3 text-slate-600 text-[11px]">{item.expiryDate || '—'}</td>
                                          <td className="py-2 px-3 text-center">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                              {item.quantity} {item.unit || ''}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                                            Rs {(Number(item.sellingPrice || item.pricePerUnit) || 0).toLocaleString()}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                                            {item.discountPercentage ? `${item.discountPercentage}%` : item.discountAmount ? `Rs ${item.discountAmount}` : '—'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                            Rs {(item.total || (Number(item.quantity || 0) * Number(item.sellingPrice || item.pricePerUnit || 0))).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                      {(!inv.items || inv.items.length === 0) && (
                                        <tr>
                                          <td colSpan={8} className="py-4 text-center text-slate-400 text-xs">
                                            No items recorded for this document.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                    <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-800">
                                      <tr>
                                        <td colSpan={4} className="py-2 px-3 text-slate-500">
                                          Total Items: {inv.items?.length || 0}
                                        </td>
                                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                                          {inv.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0} Units
                                        </td>
                                        <td colSpan={2} className="py-2 px-3 text-right text-slate-500">
                                          Total Amount:
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-sm font-black text-blue-700">
                                          Rs {inv.grandTotal.toLocaleString()}
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

                  {filteredInvoices.length === 0 && !loading && (
                    <tr>
                      <td colSpan={activeSubView === 'invoices' ? 9 : 8} className="py-12 text-center text-slate-400 text-xs">
                        No records found for {currentSubMenu.label}. Click "{currentSubMenu.btnLabel}" to create one.
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
              {pageSize === 'All' ? activeTotalRecords : Math.min(currentPage * (pageSize as number), activeTotalRecords)} of {activeTotalRecords.toLocaleString()} {activeSubView === 'payment-in' ? 'Payments' : 'Invoices'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold tracking-wide">
              <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" /> Unlimited Engine (0ms Lag)
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Total Value: <span className="font-mono text-slate-900 font-black">Rs {kpiData.box3Value.toLocaleString()}</span>
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

      {/* Main Add Sale / Estimate / Order / Challan / Return Modal */}
      <AddSaleModal
        isOpen={isAddSaleOpen}
        onClose={() => {
          setIsAddSaleOpen(false);
          setEditingInvoice(null);
        }}
        initialInvoice={editingInvoice}
        defaultTransactionType={currentSubMenu.transactionType || 'Sale'}
        onSaveSuccess={(saved) => {
          // Real-time optimistic UI update: immediately prepend new sale to invoices list with zero loading flash
          setInvoices(prev => [saved, ...prev.filter(inv => inv.id !== saved.id)]);
          loadAllData(true);
          showToast(`${saved.transactionType || 'Sale'} #${saved.invoiceNumber} saved successfully!`);
        }}
      />

      {/* Dedicated Add Payment In Modal */}
      <AddPaymentInModal
        isOpen={isAddPaymentInOpen}
        onClose={() => setIsAddPaymentInOpen(false)}
        onSaveSuccess={(saved) => {
          // Real-time optimistic UI update: immediately prepend new payment to payments list with zero loading flash
          setPayments(prev => [saved, ...prev.filter(p => p.id !== saved.id)]);
          loadAllData(true);
          showToast(`Payment In of Rs ${saved.amount.toLocaleString()} from ${saved.partyName} saved!`);
        }}
      />

      {/* Invoice / Slip Print Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPrintInvoice(null);
        }}
        invoice={selectedPrintInvoice}
      />

      {/* Invoice WhatsApp Share Modal */}
      <InvoiceShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSelectedShareInvoice(null);
        }}
        invoice={selectedShareInvoice}
      />

      {/* Quick Record Payment In Modal */}
      {isQuickPaymentOpen && quickPaymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white">
              <span className="font-bold text-sm">Record Payment In</span>
              <button onClick={() => setIsQuickPaymentOpen(false)} className="text-emerald-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <div className="text-slate-500 font-semibold">Customer:</div>
                <div className="font-bold text-slate-900 text-sm">{quickPaymentInvoice.customerName}</div>
              </div>

              <div>
                <div className="text-slate-500 font-semibold">Invoice #:</div>
                <div className="font-mono font-bold text-slate-800">{quickPaymentInvoice.invoiceNumber}</div>
              </div>

              <div className="flex justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-600">Total Invoice:</span>
                <span className="font-mono font-bold">Rs {quickPaymentInvoice.grandTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-800">
                <span className="font-bold">Current Balance Due:</span>
                <span className="font-mono font-black">Rs {quickPaymentInvoice.balanceDue.toLocaleString()}</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Received (PKR):</label>
                <input
                  type="number"
                  max={quickPaymentInvoice.balanceDue}
                  value={quickPaymentAmount}
                  onChange={(e) => setQuickPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickPaymentOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickPayment}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Invoice Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetInvoice)}
        title={`Delete ${deleteTargetInvoice?.transactionType || 'Invoice'}?`}
        message="Are you sure you want to permanently delete this sales transaction? Inventory stock will be automatically restored, and this action cannot be undone."
        itemName={deleteTargetInvoice ? `${deleteTargetInvoice.transactionType || 'Invoice'} #${deleteTargetInvoice.invoiceNumber} - ${deleteTargetInvoice.customerName} (Rs ${deleteTargetInvoice.grandTotal.toLocaleString()})` : undefined}
        confirmLabel="Yes, Delete Record"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteInvoice}
        onClose={() => setDeleteTargetInvoice(null)}
      />

      {/* Confirm Delete Payment In Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetPayment)}
        title="Delete Payment In Record?"
        message="Are you sure you want to permanently delete this payment entry? The party balance will be updated accordingly."
        itemName={deleteTargetPayment ? `Receipt #${deleteTargetPayment.receiptNumber || 'RCP'} - ${deleteTargetPayment.partyName} (Rs ${deleteTargetPayment.amount.toLocaleString()})` : undefined}
        confirmLabel="Yes, Delete Payment"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setDeleteTargetPayment(null)}
      />

      {/* Payment Voucher Print Modal */}
      {selectedPrintPayment && (
        <PaymentVoucherPrintModal
          isOpen={isPrintPaymentModalOpen}
          onClose={() => {
            setIsPrintPaymentModalOpen(false);
            setSelectedPrintPayment(null);
          }}
          payment={selectedPrintPayment}
          partyPhone={parties.find(p => p.id === selectedPrintPayment.partyId || p.name === selectedPrintPayment.partyName)?.phone}
          partyAddress={parties.find(p => p.id === selectedPrintPayment.partyId || p.name === selectedPrintPayment.partyName)?.address}
        />
      )}

      {/* Edit Payment In Voucher Modal */}
      {editingPayment && (
        <EditPaymentModal
          isOpen={isEditPaymentModalOpen}
          onClose={() => {
            setIsEditPaymentModalOpen(false);
            setEditingPayment(null);
          }}
          payment={editingPayment}
          party={parties.find(p => p.id === editingPayment.partyId || p.name === editingPayment.partyName)}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      {/* Special Controlled Sale Modal */}
      {isControlledSaleOpen && (
        <SpecialControlledSaleModal
          isOpen={isControlledSaleOpen}
          onClose={() => setIsControlledSaleOpen(false)}
          onSaleCompleted={async (invoice) => {
            setIsControlledSaleOpen(false);
            await loadAllData();
            setSelectedPrintInvoice(invoice);
            setIsPrintModalOpen(true);
            showToast(`Controlled Sale Invoice #${invoice.invoiceNumber} recorded with Form-7 log!`);
          }}
        />
      )}

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsCheatSheetModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        context="sale"
      />

    </div>
  );
};
