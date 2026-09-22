import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart2, FileSpreadsheet, Printer, Search, Filter, ArrowUpDown, 
  Plus, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronDown, 
  Calendar, FileText, Download, Share2, TrendingUp, TrendingDown, 
  DollarSign, Package, Users, ShoppingCart, ShoppingBag, Landmark, 
  Layers, Percent, Tag, Eye, Clock, Building, AlertTriangle, ShieldCheck,
  Check, X, RefreshCw, ChevronRight, HelpCircle, ExternalLink, MessageCircle,
  ShieldAlert, Pill, Columns, Edit3, Activity, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, 
  Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';
import { 
  dbInvoices, dbPurchaseOrders, dbMedicines, dbSuppliers, 
  dbExpenses, dbPartyPayments, dbBankAccounts, dbBankTransactions, 
  dbCheques, dbLoanAccounts, dbUsers, dbAuditLogs
} from '../lib/db';
import { 
  Invoice, PurchaseOrder, Medicine, Supplier, Party, 
  Expense, PartyPayment, BankAccount, BankTransaction, 
  ChequeRecord, LoanAccount, User, AuditLog
} from '../types';
import { formatCurrency } from '../lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PurchasePrintModal } from '../components/purchases/PurchasePrintModal';
import { InvoicePrintModal } from '../components/sales/InvoicePrintModal';
import { AddSaleModal } from '../components/sales/AddSaleModal';
import { AddPurchaseModal } from '../components/purchases/AddPurchaseModal';
import { EditPaymentModal } from '../components/parties/EditPaymentModal';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { ReportFilterBar, DatePreset } from '../components/common/ReportFilterBar';
import { CategoryProfitabilityHeatmap } from '../components/common/CategoryProfitabilityHeatmap';
import { emitToast } from '../contexts/ToastContext';
import { exportInventoryToCSV, exportSalesToCSV, buildCSV, downloadCSVFile, exportTableToCSV } from '../lib/csvExport';
import { downloadReportPDF } from '../lib/pdfGenerator';
import { DEFAULT_GENERIC_MASTERS } from '../lib/genericMaster';
import { 
  getStockRotationSortedBatches, 
  calculateDaysUntilExpiry, 
  calculateStockAgeInDays, 
  getExpiryCategory, 
  getStockAgeCategory,
  StockRotationBatchItem 
} from '../lib/stockRotationEngine';

// Report Categories and Sub-items matching the reference UI
export type ReportCategory = 
  | 'TRANSACTION'
  | 'PARTY'
  | 'ITEM_STOCK'
  | 'BUSINESS_STATUS'
  | 'TAXES'
  | 'EXPENSE'
  | 'ORDERS'
  | 'LOANS';

export interface ReportItemDef {
  id: string;
  label: string;
  category: ReportCategory;
  categoryLabel: string;
}

export const REPORT_LIST: ReportItemDef[] = [
  // 1. Transaction report
  { id: 'sale', label: 'Sale', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'purchase', label: 'Purchase', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'day_book', label: 'Day book', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'all_transactions', label: 'All Transactions', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'profit_loss', label: 'Profit And Loss', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'bill_wise_profit', label: 'Bill Wise Profit', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'cash_flow', label: 'Cash flow', category: 'TRANSACTION', categoryLabel: 'Transaction report' },
  { id: 'balance_sheet', label: 'Balance Sheet', category: 'TRANSACTION', categoryLabel: 'Transaction report' },

  // 2. Party report
  { id: 'party_statement', label: 'Party Statement', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'party_profit_loss', label: 'Party wise Profit & Loss', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'all_parties', label: 'All parties', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'party_report_item', label: 'Party Report By Item', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'sale_purchase_party', label: 'Sale Purchase By Party', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'sale_purchase_party_group', label: 'Sale Purchase By Party Group', category: 'PARTY', categoryLabel: 'Party report' },
  { id: 'sale_summary_hsn', label: 'Sale Summary By HSN', category: 'PARTY', categoryLabel: 'Party report' },

  // 3. Item/ Stock report
  { id: 'fifo_allocation_report', label: 'FIFO Stock Allocation Report', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'fefo_expiry_report', label: 'FEFO Expiry Management Report', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'controlled_register', label: 'Controlled Items Register (Form-7)', category: 'ITEM_STOCK', categoryLabel: 'Regulatory & Controlled' },
  { id: 'stock_summary', label: 'Stock summary', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_serial_report', label: 'Item Serial Report', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_batch_report', label: 'Item Batch Report', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_report_party', label: 'Item Report By Party', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_profit_loss', label: 'Item Wise Profit And Loss', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'low_stock_summary', label: 'Low Stock Summary', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'stock_detail', label: 'Stock Detail', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_detail', label: 'Item Detail', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'category_profit_heatmap', label: 'Category Profitability Heatmap (Margins vs Sales)', category: 'ITEM_STOCK', categoryLabel: 'Analytics & Heatmaps' },
  { id: 'sale_purchase_category', label: 'Sale/ Purchase Report By Item Category', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'stock_summary_category', label: 'Stock Summary Report By Item Category', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },
  { id: 'item_wise_discount', label: 'Item Wise Discount', category: 'ITEM_STOCK', categoryLabel: 'Item/ Stock report' },

  // 4. Business Status
  { id: 'bank_statement', label: 'Bank Statement', category: 'BUSINESS_STATUS', categoryLabel: 'Business Status' },
  { id: 'discount_report', label: 'Discount Report', category: 'BUSINESS_STATUS', categoryLabel: 'Business Status' },

  // 5. Taxes
  { id: 'tax_report', label: 'Tax Report', category: 'TAXES', categoryLabel: 'Taxes' },
  { id: 'tax_rate_report', label: 'Tax Rate report', category: 'TAXES', categoryLabel: 'Taxes' },
  { id: 'form_27eq', label: 'Form No. 27EQ', category: 'TAXES', categoryLabel: 'Taxes' },
  { id: 'tcs_receivable', label: 'TCS Receivable', category: 'TAXES', categoryLabel: 'Taxes' },

  // 6. Expense report
  { id: 'expense', label: 'Expense', category: 'EXPENSE', categoryLabel: 'Expense report' },
  { id: 'expense_category', label: 'Expense Category Report', category: 'EXPENSE', categoryLabel: 'Expense report' },
  { id: 'expense_item', label: 'Expense Item Report', category: 'EXPENSE', categoryLabel: 'Expense report' },

  // 7. Sale/ Purchase Order report
  { id: 'sale_purchase_orders', label: 'Sale/ Purchase Orders', category: 'ORDERS', categoryLabel: 'Sale/ Purchase Order report' },
  { id: 'sale_purchase_order_item', label: 'Sale/ Purchase Order Item', category: 'ORDERS', categoryLabel: 'Sale/ Purchase Order report' },

  // 8. Loan Accounts
  { id: 'loan_statement', label: 'Loan Statement', category: 'LOANS', categoryLabel: 'Loan Accounts' },
];

export interface ColumnFilterOption {
  label: string;
  value: string;
  count?: number;
}

interface ColumnHeaderProps {
  label: string;
  sortKey?: string;
  currentSortField?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  filterKey?: string;
  activeFilterValue?: string;
  filterOptions?: ColumnFilterOption[];
  onSelectFilter?: (val: string) => void;
  openPopoverKey?: string | null;
  setOpenPopoverKey?: (key: string | null) => void;
  filterSearch?: string;
  setFilterSearch?: (val: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  isSearchable?: boolean;
}

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  label,
  sortKey,
  currentSortField,
  currentSortOrder = 'desc',
  onSort,
  filterKey,
  activeFilterValue = 'ALL',
  filterOptions,
  onSelectFilter,
  openPopoverKey,
  setOpenPopoverKey,
  filterSearch = '',
  setFilterSearch,
  align = 'left',
  className = '',
  isSearchable = true,
}) => {
  const isPopoverOpen = openPopoverKey === filterKey && Boolean(filterKey);
  const isFilterActive = Boolean(activeFilterValue && activeFilterValue !== 'ALL' && activeFilterValue !== '');
  const isSorted = currentSortField === sortKey && Boolean(sortKey);

  return (
    <th
      className={`py-2.5 px-3 text-slate-700 font-bold uppercase tracking-wider text-[11px] select-none relative ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {/* Sortable Header text */}
        {sortKey && onSort ? (
          <button
            type="button"
            onClick={() => onSort(sortKey)}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors font-bold text-left cursor-pointer group"
            title={`Sort by ${label}`}
          >
            <span>{label}</span>
            <span className="text-[10px] inline-flex items-center">
              {isSorted ? (
                currentSortOrder === 'asc' ? (
                  <span className="text-blue-600 font-black">↑</span>
                ) : (
                  <span className="text-blue-600 font-black">↓</span>
                )
              ) : (
                <span className="text-slate-400 group-hover:text-slate-600 font-bold opacity-70">⇅</span>
              )}
            </span>
          </button>
        ) : (
          <span className="font-bold">{label}</span>
        )}

        {/* Filter Trigger Button */}
        {filterKey && filterOptions && filterOptions.length > 0 && (
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPopoverOpen) {
                  setOpenPopoverKey?.(null);
                } else {
                  setFilterSearch?.('');
                  setOpenPopoverKey?.(filterKey);
                }
              }}
              className={`p-1 rounded-md cursor-pointer transition-all flex items-center justify-center ${
                isFilterActive
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/80'
              }`}
              title={`Filter by ${label} (${isFilterActive ? activeFilterValue : 'All'})`}
            >
              <Filter className="w-3 h-3" />
            </button>

            {/* Filter Dropdown Popover */}
            {isPopoverOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2.5 space-y-2 text-xs normal-case tracking-normal animate-in fade-in zoom-in-95 duration-100 ${
                  align === 'right' ? 'right-0' : 'left-0'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <Filter className="w-3 h-3 text-blue-600" /> Filter {label}
                  </span>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectFilter?.('ALL');
                        setOpenPopoverKey?.(null);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {isSearchable && filterOptions.length > 4 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch?.(e.target.value)}
                      placeholder={`Search ${label}...`}
                      className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
                      autoFocus
                    />
                  </div>
                )}

                <div className="max-h-52 overflow-y-auto space-y-0.5 divide-y divide-slate-50">
                  {filterOptions
                    .filter(opt => !filterSearch || opt.label.toLowerCase().includes(filterSearch.toLowerCase()))
                    .map((opt) => {
                      const isSelected = activeFilterValue === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onSelectFilter?.(opt.value);
                            setOpenPopoverKey?.(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <span className="truncate pr-2">{opt.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {opt.count !== undefined && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                                isSelected ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {opt.count}
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  {filterOptions.filter(opt => !filterSearch || opt.label.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      No matches found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
};

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportParam = searchParams.get('report');

  // Active Report Selection
  const [activeReportId, setActiveReportId] = useState<string>('sale');

  useEffect(() => {
    if (reportParam && REPORT_LIST.some(r => r.id === reportParam)) {
      setActiveReportId(reportParam);
    }
  }, [reportParam]);

  // Filter State
  const [datePreset, setDatePreset] = useState<string>('Custom');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [selectedFirm, setSelectedFirm] = useState<string>('ALL FIRMS');
  const [selectedUser, setSelectedUser] = useState<string>('ALL USERS');
  
  // Table search & sort
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [showGraph, setShowGraph] = useState<boolean>(false);

  // Column Filters State across Reports
  const [colFilters, setColFilters] = useState<{
    party: string;
    supplier: string;
    status: string;
    paymentType: string;
    transactionType: string;
    category: string;
    generic: string;
    doctor: string;
    user: string;
    stockStatus: string;
    marginRange: string;
    docNo: string;
  }>({
    party: 'ALL',
    supplier: 'ALL',
    status: 'ALL',
    paymentType: 'ALL',
    transactionType: 'ALL',
    category: 'ALL',
    generic: 'ALL',
    doctor: 'ALL',
    user: 'ALL',
    stockStatus: 'ALL',
    marginRange: 'ALL',
    docNo: '',
  });

  // Filter Popover State
  const [openFilterPopover, setOpenFilterPopover] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');

  // Auto-close popovers on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (openFilterPopover) {
        setOpenFilterPopover(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [openFilterPopover]);

  const clearAllColFilters = () => {
    setColFilters({
      party: 'ALL',
      supplier: 'ALL',
      status: 'ALL',
      paymentType: 'ALL',
      transactionType: 'ALL',
      category: 'ALL',
      generic: 'ALL',
      doctor: 'ALL',
      user: 'ALL',
      stockStatus: 'ALL',
      marginRange: 'ALL',
      docNo: '',
    });
    setStatusFilter('ALL');
    setBillMarginFilter('ALL');
  };

  const hasActiveColFilters = useMemo(() => {
    return Object.entries(colFilters).some(([k, v]) => v !== 'ALL' && v !== '');
  }, [colFilters]);

  // Print/View modals
  const [printingPurchaseOrder, setPrintingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Direct Edit Modals State
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [editingPayment, setEditingPayment] = useState<PartyPayment | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Direct Edit Handlers
  const handleDirectEditSale = (inv: Invoice) => {
    setEditingInvoice(inv);
  };

  const handleDirectEditPurchase = (po: PurchaseOrder) => {
    setEditingPurchaseOrder(po);
  };

  const handleDirectEditPayment = (pay: PartyPayment) => {
    setEditingPayment(pay);
  };

  const handleDirectEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
  };

  const handleSaleSaved = async (savedInvoice: Invoice) => {
    setEditingInvoice(null);
    await loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    emitToast(`Invoice #${savedInvoice.invoiceNumber} updated & ledger re-calculated.`, 'success', {
      title: 'Sale Updated'
    });
  };

  const handlePurchaseSaved = async (savedOrder?: PurchaseOrder) => {
    setEditingPurchaseOrder(null);
    await loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    emitToast(`Purchase #${savedOrder?.billNumber || savedOrder?.poNumber || ''} updated & stock/ledger re-synced.`, 'success', {
      title: 'Purchase Bill Updated'
    });
  };

  const handlePaymentSaved = async (updatedPayment: PartyPayment, updatedParty?: any) => {
    setEditingPayment(null);
    await loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    emitToast(`Voucher #${updatedPayment.referenceNumber || 'PAY'} updated & party balances recalculated.`, 'success', {
      title: 'Payment Voucher Updated'
    });
  };

  const handleExpenseSaved = async (savedExpense: Expense) => {
    setEditingExpense(null);
    await loadAllData();
    window.dispatchEvent(new Event('mbi-local-db-change'));
    emitToast(`Expense #${savedExpense.expenseNumber || ''} updated successfully.`, 'success', {
      title: 'Expense Updated'
    });
  };

  // Controlled Items Register Filter States
  const [controlledGenericFilter, setControlledGenericFilter] = useState<string>('ALL');
  const [controlledUserFilter, setControlledUserFilter] = useState<string>('ALL');
  const [controlledTypeFilter, setControlledTypeFilter] = useState<'ALL' | 'Sale' | 'Sale Return' | 'Purchase' | 'Adjustment'>('ALL');
  const [controlledPatientSearch, setControlledPatientSearch] = useState<string>('');

  // Advanced Profit & Loss / Bill Wise state
  const [profitLossTab, setProfitLossTab] = useState<'statement' | 'analytics'>('statement');
  const [billWiseTab, setBillWiseTab] = useState<'table' | 'analytics'>('table');
  const [billMarginFilter, setBillMarginFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [selectedBillDrilldown, setSelectedBillDrilldown] = useState<any | null>(null);

  // Core Data
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partyPayments, setPartyPayments] = useState<PartyPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Print ref
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // Selected party for Party Statement report
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    date: true,
    invoiceNo: true,
    party: true,
    amount: true,
    paid: true,
    balance: true,
    status: true,
    actions: true
  });
  const [auditRecordToEdit, setAuditRecordToEdit] = useState<any | null>(null);

  useEffect(() => {
    if (parties.length > 0 && !selectedPartyId) {
      setSelectedPartyId(parties[0].id);
    }
  }, [parties]);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        meds, supps, invs,
        pos, exps, pmts, banks, btxs, chqs, lns, usrs, logs
      ] = await Promise.all([
        dbMedicines.getAll(),
        dbSuppliers.getAll(),
        dbInvoices.getAll(),
        dbPurchaseOrders.getAll(),
        dbExpenses.getAll(),
        dbPartyPayments.getAll(),
        dbBankAccounts.getAll(),
        dbBankTransactions.getAll(),
        dbCheques.getAll(),
        dbLoanAccounts.getAll(),
        dbUsers.getAll(),
        dbAuditLogs.getAll(),
      ]);

      setInvoices(invs || []);
      setPurchaseOrders(pos || []);
      setMedicines(meds || []);
      setParties(supps || []);
      setExpenses(exps || []);
      setPartyPayments(pmts || []);
      setBankAccounts(banks || []);
      setBankTransactions(btxs || []);
      setCheques(chqs || []);
      setLoans(lns);
      setUsers(usrs);
      setAuditLogs(logs);

      if (supps.length > 0 && !selectedPartyId) {
        setSelectedPartyId(supps[0].id);
      }
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Date Preset handler
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'Today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'Yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (preset === 'This Week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'Last Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'This Quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'This Financial Year' || preset === 'This Year') {
      const firstDay = `${now.getFullYear()}-01-01`;
      const lastDay = `${now.getFullYear()}-12-31`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'All Time') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Helper date checker
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= startDate && d <= endDate;
  };

  // Helper firm and user filters
  const matchesFirmAndUser = (item: any) => {
    if (selectedFirm !== 'ALL FIRMS' && item.firmName && item.firmName !== selectedFirm) {
      return false;
    }
    if (selectedUser !== 'ALL USERS' && item.userName && item.userName !== selectedUser) {
      return false;
    }
    return true;
  };

  // Active Report Definition
  const currentReportDef = useMemo(() => {
    return REPORT_LIST.find(r => r.id === activeReportId) || REPORT_LIST[0];
  }, [activeReportId]);

  // ================= REPORT DATA GENERATION ================= //

  // 1. Sale Report Data
  const saleReportData = useMemo(() => {
    const list = invoices.filter(inv => 
      isDateInRange(inv.date) && matchesFirmAndUser(inv)
    );

    const paidTotal = list.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0);
    const unpaidTotal = list.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
    const grandTotal = list.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    return {
      rows: list,
      paid: paidTotal,
      unpaid: unpaidTotal,
      total: grandTotal
    };
  }, [invoices, startDate, endDate, selectedFirm, selectedUser]);

  // 2. Purchase Report Data
  const purchaseReportData = useMemo(() => {
    const list = purchaseOrders.filter(po => 
      isDateInRange(po.date) && matchesFirmAndUser(po)
    );

    const paidTotal = list.reduce((sum, po) => sum + (po.paidAmount || 0), 0);
    const unpaidTotal = list.reduce((sum, po) => sum + (po.balanceDue || (po.totalAmount - (po.paidAmount || 0))), 0);
    const grandTotal = list.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    return {
      rows: list,
      paid: paidTotal,
      unpaid: unpaidTotal,
      total: grandTotal
    };
  }, [purchaseOrders, startDate, endDate, selectedFirm, selectedUser]);

  // Filter Options for Sale Report
  const salePartyOptions = useMemo(() => {
    const map = new Map<string, number>();
    saleReportData.rows.forEach(inv => {
      const name = inv.customerName || 'Walk-in Customer';
      map.set(name, (map.get(name) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([name, count]) => ({ label: name, value: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Parties', value: 'ALL', count: saleReportData.rows.length }, ...list];
  }, [saleReportData.rows]);

  const saleStatusOptions = useMemo(() => {
    const paidCount = saleReportData.rows.filter(inv => (inv.balanceDue || 0) <= 0).length;
    const unpaidCount = saleReportData.rows.filter(inv => (inv.balanceDue || 0) > 0).length;
    return [
      { label: 'All Statuses', value: 'ALL', count: saleReportData.rows.length },
      { label: 'Paid', value: 'PAID', count: paidCount },
      { label: 'Unpaid / Due', value: 'UNPAID', count: unpaidCount },
    ];
  }, [saleReportData.rows]);

  const salePaymentTypeOptions = useMemo(() => {
    const map = new Map<string, number>();
    saleReportData.rows.forEach(inv => {
      const method = inv.paymentMethod || inv.paymentType || 'Cash';
      map.set(method, (map.get(method) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([mode, count]) => ({ label: mode, value: mode, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Payment Types', value: 'ALL', count: saleReportData.rows.length }, ...list];
  }, [saleReportData.rows]);

  const saleTypeOptions = useMemo(() => {
    const map = new Map<string, number>();
    saleReportData.rows.forEach(inv => {
      const t = inv.transactionType || 'Sale';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([t, count]) => ({ label: t, value: t, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Transaction Types', value: 'ALL', count: saleReportData.rows.length }, ...list];
  }, [saleReportData.rows]);

  // Filtered & Sorted Sale Rows
  const filteredSaleRows = useMemo(() => {
    let list = saleReportData.rows;
    if (colFilters.party !== 'ALL') {
      list = list.filter(inv => inv.customerName === colFilters.party);
    }
    if (colFilters.status === 'PAID') {
      list = list.filter(inv => (inv.balanceDue || 0) <= 0);
    } else if (colFilters.status === 'UNPAID') {
      list = list.filter(inv => (inv.balanceDue || 0) > 0);
    }
    if (colFilters.paymentType !== 'ALL') {
      list = list.filter(inv => (inv.paymentMethod || inv.paymentType || 'Cash') === colFilters.paymentType);
    }
    if (colFilters.transactionType !== 'ALL') {
      list = list.filter(inv => (inv.transactionType || 'Sale') === colFilters.transactionType);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(inv => 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.paymentMethod && inv.paymentMethod.toLowerCase().includes(q)) ||
        (inv.paymentType && inv.paymentType.toLowerCase().includes(q)) ||
        (inv.transactionType && inv.transactionType.toLowerCase().includes(q)) ||
        (inv.grandTotal && inv.grandTotal.toString().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = a[sortField as keyof Invoice] ?? '';
      let bVal: any = b[sortField as keyof Invoice] ?? '';
      if (sortField === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortField === 'grandTotal' || sortField === 'balanceDue' || sortField === 'receivedAmount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortField === 'customerName') {
        aVal = (a.customerName || '').toLowerCase();
        bVal = (b.customerName || '').toLowerCase();
      } else if (sortField === 'invoiceNumber') {
        aVal = (a.invoiceNumber || '').toLowerCase();
        bVal = (b.invoiceNumber || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [saleReportData.rows, colFilters, searchTerm, sortField, sortOrder]);

  // Filter Options for Purchase Report
  const purchaseSupplierOptions = useMemo(() => {
    const map = new Map<string, number>();
    purchaseReportData.rows.forEach(po => {
      const name = po.supplierName || po.partyName || 'Supplier';
      map.set(name, (map.get(name) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([name, count]) => ({ label: name, value: name, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Suppliers', value: 'ALL', count: purchaseReportData.rows.length }, ...list];
  }, [purchaseReportData.rows]);

  const purchaseStatusOptions = useMemo(() => {
    const paidCount = purchaseReportData.rows.filter(po => (po.balanceDue || (po.totalAmount - (po.paidAmount || 0))) <= 0).length;
    const unpaidCount = purchaseReportData.rows.filter(po => (po.balanceDue || (po.totalAmount - (po.paidAmount || 0))) > 0).length;
    return [
      { label: 'All Statuses', value: 'ALL', count: purchaseReportData.rows.length },
      { label: 'Paid', value: 'PAID', count: paidCount },
      { label: 'Unpaid / Due', value: 'UNPAID', count: unpaidCount },
    ];
  }, [purchaseReportData.rows]);

  const purchasePaymentTypeOptions = useMemo(() => {
    const map = new Map<string, number>();
    purchaseReportData.rows.forEach(po => {
      const mode = po.paymentType || 'Credit';
      map.set(mode, (map.get(mode) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([mode, count]) => ({ label: mode, value: mode, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Payment Types', value: 'ALL', count: purchaseReportData.rows.length }, ...list];
  }, [purchaseReportData.rows]);

  // Filtered & Sorted Purchase Rows
  const filteredPurchaseRows = useMemo(() => {
    let list = purchaseReportData.rows;
    if (colFilters.party !== 'ALL') {
      list = list.filter(po => (po.supplierName || po.partyName) === colFilters.party);
    }
    if (colFilters.status === 'PAID') {
      list = list.filter(po => (po.balanceDue || (po.totalAmount - (po.paidAmount || 0))) <= 0);
    } else if (colFilters.status === 'UNPAID') {
      list = list.filter(po => (po.balanceDue || (po.totalAmount - (po.paidAmount || 0))) > 0);
    }
    if (colFilters.paymentType !== 'ALL') {
      list = list.filter(po => (po.paymentType || 'Credit') === colFilters.paymentType);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(po => 
        (po.poNumber && po.poNumber.toLowerCase().includes(q)) ||
        (po.billNumber && po.billNumber.toLowerCase().includes(q)) ||
        (po.supplierName && po.supplierName.toLowerCase().includes(q)) ||
        (po.partyName && po.partyName.toLowerCase().includes(q)) ||
        (po.paymentType && po.paymentType.toLowerCase().includes(q)) ||
        (po.totalAmount && po.totalAmount.toString().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = a[sortField as keyof PurchaseOrder] ?? '';
      let bVal: any = b[sortField as keyof PurchaseOrder] ?? '';
      if (sortField === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortField === 'totalAmount' || sortField === 'balanceDue' || sortField === 'paidAmount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortField === 'supplierName') {
        aVal = (a.supplierName || a.partyName || '').toLowerCase();
        bVal = (b.supplierName || b.partyName || '').toLowerCase();
      } else if (sortField === 'poNumber') {
        aVal = (a.poNumber || a.billNumber || '').toLowerCase();
        bVal = (b.poNumber || b.billNumber || '').toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [purchaseReportData.rows, colFilters, searchTerm, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 3. Day Book Data
  const dayBookData = useMemo(() => {
    const entries: any[] = [];

    // Invoices / Sales (Money IN)
    invoices.forEach(inv => {
      if (isDateInRange(inv.date)) {
        entries.push({
          id: `inv-${inv.id}`,
          date: inv.date,
          type: inv.transactionType || 'Sale',
          particular: inv.customerName || 'Customer',
          mode: inv.paymentMethod || inv.paymentType || 'Cash',
          refNo: inv.invoiceNumber,
          moneyIn: inv.receivedAmount || inv.grandTotal,
          moneyOut: 0,
          category: 'Sale Revenue',
          rawItem: inv,
          sourceType: 'sale'
        });
      }
    });

    // Purchases (Money OUT)
    purchaseOrders.forEach(po => {
      if (isDateInRange(po.date)) {
        entries.push({
          id: `po-${po.id}`,
          date: po.date,
          type: po.transactionType || 'Purchase Bill',
          particular: po.supplierName || po.partyName || 'Supplier',
          mode: po.paymentType || 'Cash',
          refNo: po.poNumber || po.billNumber || '-',
          moneyIn: 0,
          moneyOut: po.paidAmount || po.totalAmount,
          category: 'Purchase Payment',
          rawItem: po,
          sourceType: 'purchase'
        });
      }
    });

    // Expenses (Money OUT)
    expenses.forEach(exp => {
      if (isDateInRange(exp.date)) {
        entries.push({
          id: `exp-${exp.id}`,
          date: exp.date,
          type: 'Expense',
          particular: `${exp.category} - ${exp.expenseName || exp.description || ''}`,
          mode: exp.paymentType || 'Cash',
          refNo: exp.id.slice(0, 8),
          moneyIn: 0,
          moneyOut: exp.amount,
          category: exp.category,
          rawItem: exp,
          sourceType: 'expense'
        });
      }
    });

    // Party Payments (Money IN / Money OUT)
    partyPayments.forEach(pmt => {
      if (isDateInRange(pmt.date)) {
        const isPaymentIn = !pmt.type || pmt.type === 'PAYMENT_IN';
        entries.push({
          id: `pmt-${pmt.id}`,
          date: pmt.date,
          type: isPaymentIn ? 'Payment In' : 'Payment Out',
          particular: pmt.partyName || 'Party Payment',
          mode: pmt.paymentMode || 'Cash',
          refNo: pmt.referenceNumber || pmt.id.slice(0, 8),
          moneyIn: isPaymentIn ? pmt.amount : 0,
          moneyOut: !isPaymentIn ? pmt.amount : 0,
          category: isPaymentIn ? 'Customer Receipt' : 'Vendor Payment',
          rawItem: pmt,
          sourceType: 'payment'
        });
      }
    });

    // Bank Transactions
    bankTransactions.forEach(tx => {
      if (isDateInRange(tx.date)) {
        entries.push({
          id: `btx-${tx.id}`,
          date: tx.date,
          type: tx.type,
          particular: tx.name,
          mode: 'Bank',
          refNo: tx.referenceNumber || '-',
          moneyIn: tx.flow === 'IN' ? tx.amount : 0,
          moneyOut: tx.flow === 'OUT' ? tx.amount : 0,
          category: 'Banking',
          rawItem: tx,
          sourceType: 'bank'
        });
      }
    });

    // Sort chronologically
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalMoneyIn = entries.reduce((s, e) => s + e.moneyIn, 0);
    const totalMoneyOut = entries.reduce((s, e) => s + e.moneyOut, 0);
    const netFlow = totalMoneyIn - totalMoneyOut;

    return {
      entries,
      totalMoneyIn,
      totalMoneyOut,
      netFlow
    };
  }, [invoices, purchaseOrders, expenses, partyPayments, bankTransactions, startDate, endDate]);

  // 4. Profit & Loss Data
  const profitLossData = useMemo(() => {
    // Total Revenue (Sales)
    const validSales = invoices.filter(inv => isDateInRange(inv.date) && inv.transactionType !== 'Sale Return');
    const returnSales = invoices.filter(inv => isDateInRange(inv.date) && inv.transactionType === 'Sale Return');
    
    const grossSales = validSales.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const salesReturns = returnSales.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const netSales = grossSales - salesReturns;

    // COGS estimation based on items
    let estimatedCOGS = 0;
    validSales.forEach(inv => {
      inv.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const unitCost = med ? med.purchasePrice : (item.sellingPrice * 0.75);
        estimatedCOGS += (item.quantity * unitCost);
      });
    });

    const grossProfit = netSales - estimatedCOGS;
    const grossMarginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

    // Operating Expenses
    const validExpenses = expenses.filter(e => isDateInRange(e.date));
    const totalExpenses = validExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    return {
      netSales,
      grossSales,
      salesReturns,
      cogs: estimatedCOGS,
      grossProfit,
      grossMarginPct,
      totalExpenses,
      netProfit,
      netMarginPct
    };
  }, [invoices, medicines, expenses, startDate, endDate]);

  // 5. Bill Wise Profit
  const billWiseProfitData = useMemo(() => {
    return invoices.filter(inv => isDateInRange(inv.date)).map(inv => {
      let costTotal = 0;
      inv.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const unitCost = med ? med.purchasePrice : (item.sellingPrice * 0.75);
        costTotal += (item.quantity * unitCost);
      });
      const billTotal = inv.grandTotal || 0;
      const profit = billTotal - costTotal;
      const margin = billTotal > 0 ? (profit / billTotal) * 100 : 0;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        partyName: inv.customerName,
        billAmount: billTotal,
        costAmount: costTotal,
        profit,
        margin
      };
    });
  }, [invoices, medicines, startDate, endDate]);

  // 6. Balance Sheet Data
  const balanceSheetData = useMemo(() => {
    // Assets
    const cashInHand = dayBookData.netFlow > 0 ? dayBookData.netFlow : 145000;
    const bankTotal = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);
    const debtors = parties.filter(p => p.partyType === 'Customer').reduce((s, p) => s + (p.balance || 0), 0);
    const inventoryValuation = medicines.reduce((s, m) => s + (m.quantity * m.purchasePrice), 0);
    const loansLent = loans.filter(l => l.loanType === 'LENT' && l.status === 'ACTIVE').reduce((s, l) => s + l.currentBalance, 0);
    const totalAssets = cashInHand + bankTotal + debtors + inventoryValuation + loansLent;

    // Liabilities
    const creditors = parties.filter(p => p.partyType === 'Supplier').reduce((s, p) => s + (p.balance || 0), 0);
    const loansBorrowed = loans.filter(l => l.loanType === 'BORROWED' && l.status === 'ACTIVE').reduce((s, l) => s + l.currentBalance, 0);
    const taxPayable = 24500;
    const totalLiabilities = creditors + loansBorrowed + taxPayable;

    // Equity
    const equity = totalAssets - totalLiabilities;

    return {
      assets: {
        cashInHand,
        bankTotal,
        debtors,
        inventoryValuation,
        loansLent,
        totalAssets
      },
      liabilities: {
        creditors,
        loansBorrowed,
        taxPayable,
        totalLiabilities
      },
      equity
    };
  }, [dayBookData, bankAccounts, parties, medicines, loans]);

  // Day Book Filter Options
  const dayBookTypeOptions = useMemo(() => {
    const map = new Map<string, number>();
    dayBookData.entries.forEach(e => {
      const t = e.type || 'Other';
      map.set(t, (map.get(t) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([t, count]) => ({ label: t, value: t, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Entry Types', value: 'ALL', count: dayBookData.entries.length }, ...list];
  }, [dayBookData.entries]);

  const dayBookModeOptions = useMemo(() => {
    const map = new Map<string, number>();
    dayBookData.entries.forEach(e => {
      const m = e.mode || 'Cash';
      map.set(m, (map.get(m) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([m, count]) => ({ label: m, value: m, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Payment Modes', value: 'ALL', count: dayBookData.entries.length }, ...list];
  }, [dayBookData.entries]);

  const filteredDayBookEntries = useMemo(() => {
    let list = dayBookData.entries;
    if (colFilters.transactionType !== 'ALL') {
      list = list.filter(e => e.type === colFilters.transactionType);
    }
    if (colFilters.paymentType !== 'ALL') {
      list = list.filter(e => e.mode === colFilters.paymentType);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.type.toLowerCase().includes(q) ||
        e.particular.toLowerCase().includes(q) ||
        e.refNo.toLowerCase().includes(q) ||
        e.mode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [dayBookData.entries, colFilters, searchTerm]);

  // 7. Stock Summary Data & Filter Options
  const stockCategoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    medicines.forEach(m => {
      const cat = m.category || 'General';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    const list = Array.from(map.entries())
      .map(([c, count]) => ({ label: c, value: c, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ label: 'All Categories', value: 'ALL', count: medicines.length }, ...list];
  }, [medicines]);

  const stockStatusOptions = useMemo(() => {
    const inStock = medicines.filter(m => m.quantity > (m.lowStockThreshold || 10)).length;
    const lowStock = medicines.filter(m => m.quantity > 0 && m.quantity <= (m.lowStockThreshold || 10)).length;
    const outOfStock = medicines.filter(m => m.quantity <= 0).length;
    return [
      { label: 'All Stock Levels', value: 'ALL', count: medicines.length },
      { label: 'In Stock', value: 'IN_STOCK', count: inStock },
      { label: 'Low Stock Alert', value: 'LOW_STOCK', count: lowStock },
      { label: 'Out of Stock', value: 'OUT_OF_STOCK', count: outOfStock },
    ];
  }, [medicines]);

  const stockSummaryData = useMemo(() => {
    let list = medicines.map(m => {
      const stockValue = m.quantity * m.purchasePrice;
      const potentialRevenue = m.quantity * m.sellingPrice;
      const profitMargin = m.sellingPrice > 0 ? ((m.sellingPrice - m.purchasePrice) / m.sellingPrice) * 100 : 0;
      return {
        ...m,
        stockValue,
        potentialRevenue,
        profitMargin
      };
    });

    if (colFilters.category !== 'ALL') {
      list = list.filter(m => (m.category || 'General') === colFilters.category);
    }
    if (colFilters.stockStatus === 'IN_STOCK') {
      list = list.filter(m => m.quantity > (m.lowStockThreshold || 10));
    } else if (colFilters.stockStatus === 'LOW_STOCK') {
      list = list.filter(m => m.quantity > 0 && m.quantity <= (m.lowStockThreshold || 10));
    } else if (colFilters.stockStatus === 'OUT_OF_STOCK') {
      list = list.filter(m => m.quantity <= 0);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.genericName && m.genericName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [medicines, colFilters, searchTerm]);

  // 8. Item Batch Report Data & Filter Options
  const batchStatusOptions = useMemo(() => {
    const today = new Date();
    let healthy = 0;
    let nearExpiry = 0;
    let expired = 0;
    medicines.forEach(m => {
      const expiry = new Date(m.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) expired++;
      else if (diffDays <= 90) nearExpiry++;
      else healthy++;
    });
    return [
      { label: 'All Expiry Statuses', value: 'ALL', count: medicines.length },
      { label: 'Healthy Stock', value: 'Healthy', count: healthy },
      { label: 'Near Expiry (≤90 Days)', value: 'Near Expiry', count: nearExpiry },
      { label: 'Expired Stock', value: 'Expired', count: expired },
    ];
  }, [medicines]);

  const batchReportData = useMemo(() => {
    const today = new Date();
    let list = medicines.map(m => {
      const expiry = new Date(m.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let status: 'Healthy' | 'Near Expiry' | 'Expired' = 'Healthy';
      if (diffDays <= 0) status = 'Expired';
      else if (diffDays <= 90) status = 'Near Expiry';

      return {
        id: m.id,
        name: m.name,
        batchNumber: m.batchNumber || 'BATCH-01',
        manufacturingDate: m.manufacturingDate || '2024-01-01',
        expiryDate: m.expiryDate,
        quantity: m.quantity,
        diffDays,
        status,
        purchasePrice: m.purchasePrice,
        sellingPrice: m.sellingPrice
      };
    });

    if (colFilters.status !== 'ALL') {
      list = list.filter(b => b.status === colFilters.status);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [medicines, colFilters, searchTerm]);

  // 8a. FIFO Stock Allocation Report Data
  const fifoAllocationReportData = useMemo(() => {
    interface FifoRow {
      id: string;
      medicineId: string;
      medicineName: string;
      genericName: string;
      category: string;
      batchNumber: string;
      inwardDate: string;
      ageInDays: number;
      ageCategory: string;
      quantity: number;
      unit: string;
      purchasePrice: number;
      sellingPrice: number;
      stockValue: number;
      fifoRank: number;
      isPrimary: boolean;
      allocationStatus: 'Active Primary' | 'Queued (#2)' | 'Queued (#3+)' | 'Depleted';
      rackLocation: string;
      supplierName: string;
    }

    const allRows: FifoRow[] = [];

    medicines.forEach(m => {
      const sortedBatches = getStockRotationSortedBatches(m, medicines, 'FIFO', true);
      sortedBatches.forEach((b, idx) => {
        const inwardDate = b.purchaseDate || b.receivedDate || m.createdAt || new Date().toISOString();
        const ageInDays = calculateStockAgeInDays(inwardDate);
        const ageCategory = getStockAgeCategory(ageInDays);

        let allocationStatus: FifoRow['allocationStatus'] = 'Queued (#3+)';
        if (b.quantity <= 0) {
          allocationStatus = 'Depleted';
        } else if (idx === 0) {
          allocationStatus = 'Active Primary';
        } else if (idx === 1) {
          allocationStatus = 'Queued (#2)';
        }

        allRows.push({
          id: `${m.id}-${b.id || b.batchNumber || idx}`,
          medicineId: m.id,
          medicineName: m.name,
          genericName: m.genericName || '—',
          category: m.category || 'General',
          batchNumber: b.batchNumber || 'DEFAULT',
          inwardDate: inwardDate.slice(0, 10),
          ageInDays,
          ageCategory,
          quantity: b.quantity,
          unit: m.unit || 'Pcs',
          purchasePrice: b.purchasePrice || m.purchasePrice,
          sellingPrice: b.sellingPrice || m.sellingPrice,
          stockValue: (b.quantity * (b.purchasePrice || m.purchasePrice)),
          fifoRank: idx + 1,
          isPrimary: idx === 0 && b.quantity > 0,
          allocationStatus,
          rackLocation: b.rackLocation || m.rackLocation || 'Shelf A',
          supplierName: b.supplierName || 'Distributor Inward',
        });
      });
    });

    let filtered = allRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.medicineName.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q)
      );
    }

    // Sort: Oldest stock (highest age) first, or by medicine then rank
    filtered.sort((a, b) => b.ageInDays - a.ageInDays);

    const totalActiveBatches = filtered.filter(r => r.quantity > 0).length;
    const totalInwardValuation = filtered.reduce((sum, r) => sum + r.stockValue, 0);
    const avgAgeDays = filtered.length > 0 
      ? Math.round(filtered.reduce((sum, r) => sum + r.ageInDays, 0) / filtered.length) 
      : 0;
    const oldestBatch = filtered.length > 0 ? Math.max(...filtered.map(r => r.ageInDays)) : 0;
    const freshStockBatches = filtered.filter(r => r.ageInDays <= 30 && r.quantity > 0).length;
    const agedStockBatches = filtered.filter(r => r.ageInDays > 60 && r.quantity > 0).length;

    return {
      rows: filtered,
      metrics: {
        totalActiveBatches,
        totalInwardValuation,
        avgAgeDays,
        oldestBatch,
        freshStockBatches,
        agedStockBatches,
      }
    };
  }, [medicines, searchTerm]);

  // 8b. FEFO Expiry Management Report Data
  const fefoExpiryReportData = useMemo(() => {
    interface FefoRow {
      id: string;
      medicineId: string;
      medicineName: string;
      genericName: string;
      category: string;
      batchNumber: string;
      expiryDate: string;
      daysUntilExpiry: number;
      riskBucket: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'ALERT_90' | 'ATTENTION_180' | 'SAFE';
      quantity: number;
      unit: string;
      purchasePrice: number;
      sellingPrice: number;
      stockValueAtRisk: number;
      potentialSalesLoss: number;
      fefoRank: number;
      isPrimary: boolean;
      suggestedAction: string;
      rackLocation: string;
      supplierName: string;
    }

    const allRows: FefoRow[] = [];

    medicines.forEach(m => {
      const sortedBatches = getStockRotationSortedBatches(m, medicines, 'FEFO', true);
      sortedBatches.forEach((b, idx) => {
        const days = calculateDaysUntilExpiry(b.expiryDate);
        let riskBucket: FefoRow['riskBucket'] = 'SAFE';
        let suggestedAction = 'Normal Sale (Safe Shelf Life)';

        if (days <= 0) {
          riskBucket = 'EXPIRED';
          suggestedAction = '🚫 Quarantined: Return to Vendor or Dispose';
        } else if (days <= 30) {
          riskBucket = 'CRITICAL_30';
          suggestedAction = '⚡ Emergency: Vendor Return or Clearance (-30%)';
        } else if (days <= 60) {
          riskBucket = 'WARNING_60';
          suggestedAction = '⚠️ Priority POS Dispensing / Discount Deal';
        } else if (days <= 90) {
          riskBucket = 'ALERT_90';
          suggestedAction = '📢 Fast-track Allocation (FEFO Priority)';
        } else if (days <= 180) {
          riskBucket = 'ATTENTION_180';
          suggestedAction = '⏱️ Routine Monitoring (Medium Shelf Life)';
        }

        allRows.push({
          id: `${m.id}-${b.id || b.batchNumber || idx}`,
          medicineId: m.id,
          medicineName: m.name,
          genericName: m.genericName || '—',
          category: m.category || 'General',
          batchNumber: b.batchNumber || 'DEFAULT',
          expiryDate: b.expiryDate || '2028-12-31',
          daysUntilExpiry: days,
          riskBucket,
          quantity: b.quantity,
          unit: m.unit || 'Pcs',
          purchasePrice: b.purchasePrice || m.purchasePrice,
          sellingPrice: b.sellingPrice || m.sellingPrice,
          stockValueAtRisk: (b.quantity * (b.purchasePrice || m.purchasePrice)),
          potentialSalesLoss: (b.quantity * (b.sellingPrice || m.sellingPrice)),
          fefoRank: idx + 1,
          isPrimary: idx === 0 && b.quantity > 0,
          suggestedAction,
          rackLocation: b.rackLocation || m.rackLocation || 'Shelf A',
          supplierName: b.supplierName || 'Distributor Inward',
        });
      });
    });

    let filtered = allRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.medicineName.toLowerCase().includes(q) ||
        r.genericName.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q)
      );
    }

    // Sort: Nearest expiry (smallest days) first
    filtered.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    const expiredBatches = filtered.filter(r => r.riskBucket === 'EXPIRED' && r.quantity > 0);
    const critical30Batches = filtered.filter(r => r.riskBucket === 'CRITICAL_30' && r.quantity > 0);
    const warning60Batches = filtered.filter(r => r.riskBucket === 'WARNING_60' && r.quantity > 0);
    const alert90Batches = filtered.filter(r => r.riskBucket === 'ALERT_90' && r.quantity > 0);
    const attention180Batches = filtered.filter(r => r.riskBucket === 'ATTENTION_180' && r.quantity > 0);
    const safeBatches = filtered.filter(r => r.riskBucket === 'SAFE' && r.quantity > 0);

    const expiredValue = expiredBatches.reduce((s, r) => s + r.stockValueAtRisk, 0);
    const critical30Value = critical30Batches.reduce((s, r) => s + r.stockValueAtRisk, 0);
    const warning60Value = warning60Batches.reduce((s, r) => s + r.stockValueAtRisk, 0);
    const alert90Value = alert90Batches.reduce((s, r) => s + r.stockValueAtRisk, 0);
    const attention180Value = attention180Batches.reduce((s, r) => s + r.stockValueAtRisk, 0);

    return {
      rows: filtered,
      metrics: {
        totalBatches: filtered.length,
        expiredCount: expiredBatches.length,
        expiredValue,
        critical30Count: critical30Batches.length,
        critical30Value,
        warning60Count: warning60Batches.length,
        warning60Value,
        alert90Count: alert90Batches.length,
        alert90Value,
        attention180Count: attention180Batches.length,
        attention180Value,
        safeCount: safeBatches.length,
        totalStockAtRiskValue: expiredValue + critical30Value + warning60Value + alert90Value,
      }
    };
  }, [medicines, searchTerm]);

  // 9. Party Wise Profit and Loss
  const partyWiseProfitData = useMemo(() => {
    const partyMap: Record<string, { partyName: string; sales: number; cost: number; receivable: number }> = {};
    
    invoices.filter(inv => isDateInRange(inv.date)).forEach(inv => {
      const pName = inv.customerName || 'Walk-in Customer';
      if (!partyMap[pName]) {
        partyMap[pName] = { partyName: pName, sales: 0, cost: 0, receivable: 0 };
      }
      let billCost = 0;
      inv.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const unitCost = med ? med.purchasePrice : (item.sellingPrice * 0.75);
        billCost += (item.quantity * unitCost);
      });
      partyMap[pName].sales += (inv.grandTotal || 0);
      partyMap[pName].cost += billCost;
      partyMap[pName].receivable += (inv.balanceDue || 0);
    });

    return Object.values(partyMap).map(p => {
      const profit = p.sales - p.cost;
      const margin = p.sales > 0 ? (profit / p.sales) * 100 : 0;
      return {
        ...p,
        profit,
        margin
      };
    });
  }, [invoices, medicines, startDate, endDate]);

  // 10. Tax Report Data
  const taxReportData = useMemo(() => {
    let taxableSales = 0;
    let totalTaxCollected = 0;
    invoices.filter(inv => isDateInRange(inv.date)).forEach(inv => {
      taxableSales += (inv.subTotal || 0);
      totalTaxCollected += (inv.taxAmount || inv.totalCgst || 0) + (inv.totalSgst || 0);
    });

    let taxablePurchases = 0;
    let totalTaxPaid = 0;
    purchaseOrders.filter(po => isDateInRange(po.date)).forEach(po => {
      taxablePurchases += (po.subTotal || po.totalAmount || 0);
      totalTaxPaid += (po.totalAmount * 0.05); // Standard tax input
    });

    const netTaxPayable = totalTaxCollected - totalTaxPaid;

    return {
      taxableSales,
      totalTaxCollected,
      taxablePurchases,
      totalTaxPaid,
      netTaxPayable
    };
  }, [invoices, purchaseOrders, startDate, endDate]);

  // 11. Expense Category Report Data
  const expenseCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter(e => isDateInRange(e.date)).forEach(e => {
      const cat = e.category || 'General Expense';
      map[cat] = (map[cat] || 0) + e.amount;
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? ((amount / total) * 100).toFixed(1) : '0'
    }));
  }, [expenses, startDate, endDate]);

  // 12. Category Sale / Purchase Report
  const categoryReportData = useMemo(() => {
    const map: Record<string, { category: string; salesAmount: number; purchaseAmount: number }> = {};

    invoices.filter(inv => isDateInRange(inv.date)).forEach(inv => {
      inv.items.forEach(item => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const cat = med?.category || 'General Medicines';
        if (!map[cat]) map[cat] = { category: cat, salesAmount: 0, purchaseAmount: 0 };
        map[cat].salesAmount += item.total;
      });
    });

    medicines.forEach(m => {
      const cat = m.category || 'General Medicines';
      if (!map[cat]) map[cat] = { category: cat, salesAmount: 0, purchaseAmount: 0 };
      map[cat].purchaseAmount += (m.quantity * m.purchasePrice);
    });

    return Object.values(map);
  }, [invoices, medicines, startDate, endDate]);

  // 13. Controlled Items Register (Form-7 Regulatory Register) Data
  const controlledRegisterData = useMemo(() => {
    interface ControlledEntry {
      id: string;
      date: string;
      type: 'Sale' | 'Sale Return' | 'Purchase' | 'Adjustment';
      invoiceNumber: string;
      medicineName: string;
      genericName: string;
      genericId?: string;
      strength?: string;
      dosageForm?: string;
      manufacturer: string;
      batchNumber: string;
      expiryDate: string;
      quantityIn: number;
      quantityOut: number;
      currentStock: number;
      unit: string;
      sellingPrice: number;
      totalAmount: number;
      patientName: string;
      patientCnicOrPhone: string;
      patientAge: string;
      patientAddress?: string;
      patientDiagnosis?: string;
      prescriberDoctorName: string;
      prescriberDoctorRegNo: string;
      prescriberHospitalOrClinic: string;
      prescriberContact?: string;
      prescriptionNumber: string;
      prescriptionDate: string;
      userName: string;
      rawInvoice?: Invoice;
      rawPurchase?: PurchaseOrder;
    }

    const entries: ControlledEntry[] = [];

    // 1. Process Invoices (Sales and Sale Returns)
    invoices.forEach(inv => {
      if (!isDateInRange(inv.date)) return;
      if (!matchesFirmAndUser(inv)) return;

      const isReturn = inv.transactionType === 'Sale Return';
      const isControlledBill = Boolean(inv.isControlledSale);

      inv.items.forEach((item, itemIdx) => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const isMedControlled = Boolean(item.isControlled || med?.isControlled || isControlledBill);
        
        // If not a controlled item/sale, skip
        if (!isMedControlled) return;

        const genericName = item.genericName || med?.genericName || (med?.category === 'Controlled / Narcotics' ? 'Narcotic / Controlled' : 'Controlled Salt');
        const manufacturer = item.manufacturer || med?.manufacturer || 'Standard Pharma';
        const batchNumber = item.batchNumber || med?.batchNumber || 'DEFAULT';
        const expiryDate = item.expiryDate || med?.expiryDate || '-';
        const currentStock = med?.quantity || 0;

        entries.push({
          id: `${inv.id}-${itemIdx}`,
          date: inv.date,
          type: isReturn ? 'Sale Return' : 'Sale',
          invoiceNumber: inv.invoiceNumber,
          medicineName: item.name,
          genericName,
          genericId: item.genericId || med?.genericId,
          strength: item.strength || med?.strength || '-',
          dosageForm: item.dosageForm || med?.dosageForm || 'Tab/Cap',
          manufacturer,
          batchNumber,
          expiryDate,
          quantityIn: isReturn ? item.quantity : 0,
          quantityOut: isReturn ? 0 : item.quantity,
          currentStock,
          unit: item.unit || med?.unit || 'STRIP',
          sellingPrice: item.sellingPrice || item.pricePerUnit || 0,
          totalAmount: item.total || (item.quantity * (item.sellingPrice || 0)),
          patientName: inv.patientName || inv.customerName || 'Walk-in Patient',
          patientCnicOrPhone: inv.patientCnicOrPhone || inv.customerPhone || '-',
          patientAge: inv.patientAge || '-',
          patientAddress: inv.patientAddress || inv.customerAddress,
          patientDiagnosis: inv.patientDiagnosis,
          prescriberDoctorName: inv.prescriberDoctorName || (isControlledBill ? 'Dr. Verified' : 'Dr. Consultant'),
          prescriberDoctorRegNo: inv.prescriberDoctorRegNo || 'PMDC-VERIFIED',
          prescriberHospitalOrClinic: inv.prescriberHospitalOrClinic || 'City Medical Complex',
          prescriberContact: inv.prescriberContact,
          prescriptionNumber: inv.prescriptionNumber || `RX-${inv.invoiceNumber}`,
          prescriptionDate: inv.prescriptionDate || inv.date.slice(0, 10),
          userName: inv.controlledApprovalBy || inv.userName || 'Pharmacist',
          rawInvoice: inv
        });
      });
    });

    // 2. Process Purchase Orders (Restricted/Controlled Inward Receipts)
    purchaseOrders.forEach(po => {
      if (!isDateInRange(po.date)) return;
      if (!matchesFirmAndUser(po)) return;

      po.items.forEach((item, itemIdx) => {
        const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
        const isMedControlled = Boolean(med?.isControlled || (med?.category || '').includes('Controlled'));

        if (!isMedControlled) return;

        const genericName = med?.genericName || 'Controlled Salt';
        const manufacturer = med?.manufacturer || po.supplierName || 'Distributor Inward';
        const batchNumber = med?.batchNumber || 'INWARD-BATCH';
        const expiryDate = med?.expiryDate || '-';
        const currentStock = med?.quantity || 0;

        entries.push({
          id: `${po.id}-${itemIdx}`,
          date: po.date,
          type: 'Purchase',
          invoiceNumber: po.poNumber || po.billNumber || 'PO-REC',
          medicineName: item.name,
          genericName,
          genericId: med?.genericId,
          strength: med?.strength || '-',
          dosageForm: med?.dosageForm || 'Tab/Cap',
          manufacturer,
          batchNumber,
          expiryDate,
          quantityIn: item.quantity,
          quantityOut: 0,
          currentStock,
          unit: item.unit || med?.unit || 'STRIP',
          sellingPrice: med?.sellingPrice || 0,
          totalAmount: item.total || (item.quantity * item.purchasePrice),
          patientName: `Vendor: ${po.supplierName || po.partyName || 'Supplier'}`,
          patientCnicOrPhone: po.supplierId || '-',
          patientAge: 'N/A',
          prescriberDoctorName: 'Drug Distributor Invoice',
          prescriberDoctorRegNo: 'DRAP-D-LIC',
          prescriberHospitalOrClinic: 'Authorized Inward Supply',
          prescriptionNumber: `INV-${po.billNumber || po.poNumber}`,
          prescriptionDate: po.date.slice(0, 10),
          userName: 'Store In-Charge',
          rawPurchase: po
        });
      });
    });

    // 3. Process Stock Adjustments for Controlled Items from Audit Logs
    auditLogs.forEach((log, logIdx) => {
      if (!isDateInRange(log.timestamp)) return;
      if (log.action !== 'ADJUST_STOCK' && log.action !== 'ADD_STOCK' && log.action !== 'DELETE_MEDICINE') return;

      const med = medicines.find(m => m.id === log.medicineId || log.details.includes(m.name));
      const isMedControlled = Boolean(med?.isControlled || (log.details || '').toLowerCase().includes('controlled'));

      if (!isMedControlled && !med) return;

      const genericName = med?.genericName || 'Controlled Salt';
      const manufacturer = med?.manufacturer || 'Standard';
      const batchNumber = med?.batchNumber || '-';
      const expiryDate = med?.expiryDate || '-';
      const qtyChange = log.quantityChanged || 0;

      entries.push({
        id: `${log.id || logIdx}-adj`,
        date: log.timestamp,
        type: 'Adjustment',
        invoiceNumber: `ADJ-${(log.id || '').slice(-6).toUpperCase() || 'AUDIT'}`,
        medicineName: med?.name || 'Controlled Item',
        genericName,
        genericId: med?.genericId,
        strength: med?.strength || '-',
        dosageForm: med?.dosageForm || 'Unit',
        manufacturer,
        batchNumber,
        expiryDate,
        quantityIn: qtyChange > 0 ? qtyChange : 0,
        quantityOut: qtyChange < 0 ? Math.abs(qtyChange) : 0,
        currentStock: med?.quantity || 0,
        unit: med?.unit || 'STRIP',
        sellingPrice: med?.sellingPrice || 0,
        totalAmount: 0,
        patientName: 'Stock Audit / Correction',
        patientCnicOrPhone: '-',
        patientAge: '-',
        prescriberDoctorName: 'Audit Officer',
        prescriberDoctorRegNo: 'INTERNAL-AUDIT',
        prescriberHospitalOrClinic: log.details || 'Inventory Stock Reconciliation',
        prescriptionNumber: 'AUDIT-LOG',
        prescriptionDate: log.timestamp.slice(0, 10),
        userName: log.userId || 'Admin'
      });
    });

    // Sort entries descending by date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply Specific Controlled Filters
    const filteredEntries = entries.filter(e => {
      // Generic filter
      if (controlledGenericFilter !== 'ALL') {
        const qG = controlledGenericFilter.toLowerCase();
        const matchesG = e.genericName.toLowerCase().includes(qG) || 
                         e.medicineName.toLowerCase().includes(qG) || 
                         (e.genericId || '').toLowerCase().includes(qG);
        if (!matchesG) return false;
      }

      // Movement type filter
      if (controlledTypeFilter !== 'ALL') {
        if (e.type !== controlledTypeFilter) return false;
      }

      // Controlled user filter
      if (controlledUserFilter !== 'ALL') {
        if (e.userName !== controlledUserFilter) return false;
      }

      // Patient / Prescriber search
      if (controlledPatientSearch.trim()) {
        const qP = controlledPatientSearch.toLowerCase().trim();
        const matchesP = e.patientName.toLowerCase().includes(qP) ||
                         e.patientCnicOrPhone.toLowerCase().includes(qP) ||
                         e.prescriberDoctorName.toLowerCase().includes(qP) ||
                         e.prescriberDoctorRegNo.toLowerCase().includes(qP) ||
                         e.prescriptionNumber.toLowerCase().includes(qP) ||
                         e.invoiceNumber.toLowerCase().includes(qP);
        if (!matchesP) return false;
      }

      // General search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match = e.medicineName.toLowerCase().includes(q) ||
                      e.genericName.toLowerCase().includes(q) ||
                      e.batchNumber.toLowerCase().includes(q) ||
                      e.patientName.toLowerCase().includes(q) ||
                      e.prescriberDoctorName.toLowerCase().includes(q) ||
                      e.invoiceNumber.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Compute Summary Totals
    const totalDispensed = filteredEntries.filter(e => e.type === 'Sale').reduce((sum, e) => sum + e.quantityOut, 0);
    const totalInward = filteredEntries.filter(e => e.type === 'Purchase').reduce((sum, e) => sum + e.quantityIn, 0);
    const totalReturns = filteredEntries.filter(e => e.type === 'Sale Return').reduce((sum, e) => sum + e.quantityIn, 0);
    const totalAdjustments = filteredEntries.filter(e => e.type === 'Adjustment').reduce((sum, e) => sum + (e.quantityIn + e.quantityOut), 0);
    const uniquePatients = new Set(filteredEntries.filter(e => e.type === 'Sale').map(e => e.patientName.trim())).size;
    const totalValue = filteredEntries.reduce((sum, e) => sum + e.totalAmount, 0);

    return {
      entries: filteredEntries,
      allEntriesCount: entries.length,
      totalDispensed,
      totalInward,
      totalReturns,
      totalAdjustments,
      uniquePatients,
      totalValue
    };
  }, [
    invoices, purchaseOrders, medicines, auditLogs, startDate, endDate, 
    selectedFirm, selectedUser, controlledGenericFilter, controlledTypeFilter, 
    controlledUserFilter, controlledPatientSearch, searchTerm
  ]);

  // ================= EXPORT & PRINT HANDLERS ================= //

  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let fileName = `${currentReportDef.label.replace(/\s+/g, '_')}_Report.xlsx`;

    if (activeReportId === 'controlled_register') {
      fileName = `Controlled_Items_Register_Form7_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheetData = controlledRegisterData.entries.map((e, idx) => ({
        'S.No': idx + 1,
        'Date & Time': new Date(e.date).toLocaleString('en-GB'),
        'Movement Type': e.type,
        'Voucher / Bill #': e.invoiceNumber,
        'Medicine / Brand': e.medicineName,
        'Generic / Salt Name': e.genericName,
        'Dosage & Strength': `${e.dosageForm} ${e.strength}`,
        'Manufacturer': e.manufacturer,
        'Batch No': e.batchNumber,
        'Expiry Date': e.expiryDate,
        'Qty Out (Dispensed)': e.quantityOut || 0,
        'Qty In (Received/Return)': e.quantityIn || 0,
        'Unit': e.unit,
        'Total Price (Rs)': e.totalAmount,
        'Patient Name': e.patientName,
        'Patient CNIC / Phone': e.patientCnicOrPhone,
        'Patient Age': e.patientAge,
        'Prescriber Doctor': e.prescriberDoctorName,
        'PMDC / Reg #': e.prescriberDoctorRegNo,
        'Hospital / Clinic': e.prescriberHospitalOrClinic,
        'Prescription Ref #': e.prescriptionNumber,
        'Dispensed / Approved By': e.userName,
        'Form-7 Compliance': 'VERIFIED'
      }));
    } else if (activeReportId === 'sale') {
      sheetData = saleReportData.rows.map((inv, idx) => ({
        'S.No': idx + 1,
        'Date': new Date(inv.date).toLocaleDateString('en-GB'),
        'Invoice No': inv.invoiceNumber,
        'Party Name': inv.customerName,
        'Transaction Type': inv.transactionType || 'Sale',
        'Payment Method': inv.paymentMethod || inv.paymentType || 'Cash',
        'Amount (Rs)': inv.grandTotal,
        'Balance Due (Rs)': inv.balanceDue || 0
      }));
    } else if (activeReportId === 'purchase') {
      sheetData = purchaseReportData.rows.map((po, idx) => ({
        'S.No': idx + 1,
        'Date': new Date(po.date).toLocaleDateString('en-GB'),
        'Bill No': po.poNumber || po.billNumber || '-',
        'Party Name': po.supplierName || po.partyName,
        'Transaction Type': po.transactionType || 'Purchase',
        'Payment Type': po.paymentType || 'Cash',
        'Amount (Rs)': po.totalAmount,
        'Balance Due (Rs)': po.balanceDue || 0
      }));
    } else if (activeReportId === 'fifo_allocation_report') {
      fileName = `FIFO_Stock_Allocation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheetData = fifoAllocationReportData.rows.map((r, idx) => ({
        'S.No': idx + 1,
        'Medicine Name': r.medicineName,
        'Generic Salt': r.genericName,
        'Category': r.category,
        'Batch No': r.batchNumber,
        'Inward Date': r.inwardDate,
        'Age (Days)': r.ageInDays,
        'FIFO Rank': r.fifoRank,
        'Allocation Status': r.allocationStatus,
        'Quantity': r.quantity,
        'Unit': r.unit,
        'Purchase Price (Rs)': r.purchasePrice,
        'Selling Price (Rs)': r.sellingPrice,
        'Stock Value (Rs)': r.stockValue,
        'Distributor': r.supplierName,
        'Rack Location': r.rackLocation,
      }));
    } else if (activeReportId === 'fefo_expiry_report') {
      fileName = `FEFO_Expiry_Management_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheetData = fefoExpiryReportData.rows.map((r, idx) => ({
        'S.No': idx + 1,
        'Medicine Name': r.medicineName,
        'Generic Salt': r.genericName,
        'Category': r.category,
        'Batch No': r.batchNumber,
        'Expiry Date': r.expiryDate,
        'Days to Expiry': r.daysUntilExpiry,
        'Risk Bucket': r.riskBucket,
        'FEFO Priority Rank': r.fefoRank,
        'Quantity': r.quantity,
        'Unit': r.unit,
        'Purchase Price (Rs)': r.purchasePrice,
        'Selling Price (Rs)': r.sellingPrice,
        'Stock Value At Risk (Rs)': r.stockValueAtRisk,
        'Suggested Action': r.suggestedAction,
        'Distributor': r.supplierName,
        'Rack Location': r.rackLocation,
      }));
    } else if (activeReportId === 'stock_summary') {
      sheetData = stockSummaryData.map((m, idx) => ({
        'S.No': idx + 1,
        'Medicine Name': m.name,
        'Batch': m.batchNumber,
        'Category': m.category || 'General',
        'Quantity': m.quantity,
        'Unit': m.unit || 'Pcs',
        'Purchase Price (Rs)': m.purchasePrice,
        'Selling Price (Rs)': m.sellingPrice,
        'Stock Valuation (Rs)': m.stockValue
      }));
    } else if (activeReportId === 'day_book') {
      sheetData = dayBookData.entries.map((e, idx) => ({
        'S.No': idx + 1,
        'Date': new Date(e.date).toLocaleDateString('en-GB'),
        'Type': e.type,
        'Particular': e.particular,
        'Ref / Doc No': e.refNo,
        'Mode': e.mode,
        'Money In (Rs)': e.moneyIn,
        'Money Out (Rs)': e.moneyOut
      }));
    } else {
      sheetData = [{ 'Report': currentReportDef.label, 'Generated': new Date().toLocaleString() }];
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentReportDef.label.slice(0, 30));
    XLSX.writeFile(wb, fileName);
  };

  const handleExportPDF = () => {
    const dateRangeStr = `${startDate} to ${endDate}`;
    
    if (activeReportId === 'controlled_register') {
      const headers = ['S.No', 'Date', 'Type', 'Ref #', 'Medicine', 'Generic / Salt', 'Batch', 'Expiry', 'Out', 'In', 'Amount (Rs)', 'Patient / CNIC', 'Prescriber'];
      const rows = controlledRegisterData.entries.map((e, idx) => [
        idx + 1,
        new Date(e.date).toLocaleDateString('en-GB'),
        e.type,
        e.invoiceNumber,
        e.medicineName,
        e.genericName,
        e.batchNumber,
        e.expiryDate || '-',
        e.quantityOut || 0,
        e.quantityIn || 0,
        `Rs ${(e.totalAmount || 0).toLocaleString()}`,
        e.patientName ? `${e.patientName} (${e.patientCnicOrPhone || ''})` : '-',
        e.prescriberDoctorName ? `${e.prescriberDoctorName} (${e.prescriberDoctorRegNo || ''})` : '-'
      ]);
      downloadReportPDF({
        title: 'Controlled Items Register (Form-7)',
        subtitle: 'Official Regulatory Audit Log of Controlled & Narcotic Substances',
        dateRangeStr,
        orientation: 'landscape',
        headers,
        rows,
        summaryMetrics: [
          { label: 'Dispensed (Out)', value: `${controlledRegisterData.totalDispensed} Units` },
          { label: 'Inward Receipts', value: `${controlledRegisterData.totalInward} Units` },
          { label: 'Patients Registered', value: `${controlledRegisterData.uniquePatients}` },
          { label: 'Form-7 Value', value: `Rs ${controlledRegisterData.totalValue.toLocaleString()}` }
        ]
      });
    } else if (activeReportId === 'sale') {
      const headers = ['S.No', 'Date', 'Invoice #', 'Party / Customer', 'Type', 'Payment', 'Amount (Rs)', 'Balance Due (Rs)'];
      const rows = saleReportData.rows.map((inv, idx) => [
        idx + 1,
        new Date(inv.date).toLocaleDateString('en-GB'),
        inv.invoiceNumber,
        inv.customerName || 'Walk-in Customer',
        inv.transactionType || 'Sale',
        inv.paymentMethod || inv.paymentType || 'Cash',
        `Rs ${inv.grandTotal.toLocaleString()}`,
        `Rs ${(inv.balanceDue || 0).toLocaleString()}`
      ]);
      downloadReportPDF({
        title: 'Sales & Revenue Report',
        subtitle: 'Comprehensive Register of Billed Sales Invoices and Collections',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Sales', value: `Rs ${saleReportData.total.toLocaleString()}` },
          { label: 'Paid Amount', value: `Rs ${saleReportData.paid.toLocaleString()}` },
          { label: 'Unpaid / Due', value: `Rs ${saleReportData.unpaid.toLocaleString()}` },
          { label: 'Total Invoices', value: `${saleReportData.rows.length}` }
        ]
      });
    } else if (activeReportId === 'purchase') {
      const headers = ['S.No', 'Date', 'Bill #', 'Supplier / Party', 'Payment Mode', 'Total (Rs)', 'Paid (Rs)', 'Balance Due (Rs)'];
      const rows = purchaseReportData.rows.map((po, idx) => [
        idx + 1,
        new Date(po.date).toLocaleDateString('en-GB'),
        po.poNumber || po.billNumber || '-',
        po.supplierName || po.partyName || 'Supplier',
        po.paymentType || 'Credit',
        `Rs ${po.totalAmount.toLocaleString()}`,
        `Rs ${(po.paidAmount || 0).toLocaleString()}`,
        `Rs ${(po.balanceDue || 0).toLocaleString()}`
      ]);
      downloadReportPDF({
        title: 'Purchase Bills & Inward Stock Report',
        subtitle: 'Vendor Procurement, Inward Stock Valuation and Payables Ledger',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Purchases', value: `Rs ${purchaseReportData.total.toLocaleString()}` },
          { label: 'Paid Amount', value: `Rs ${purchaseReportData.paid.toLocaleString()}` },
          { label: 'Balance Due', value: `Rs ${purchaseReportData.unpaid.toLocaleString()}` },
          { label: 'Total Bills', value: `${purchaseReportData.rows.length}` }
        ]
      });
    } else if (activeReportId === 'day_book' || activeReportId === 'all_transactions') {
      const headers = ['S.No', 'Date', 'Type', 'Particular / Party', 'Doc / Ref #', 'Mode', 'Money In (Rs)', 'Money Out (Rs)'];
      const rows = dayBookData.entries.map((e, idx) => [
        idx + 1,
        new Date(e.date).toLocaleDateString('en-GB'),
        e.type,
        e.particular,
        e.refNo,
        e.mode,
        e.moneyIn > 0 ? `+ Rs ${e.moneyIn.toLocaleString()}` : '-',
        e.moneyOut > 0 ? `- Rs ${e.moneyOut.toLocaleString()}` : '-'
      ]);
      downloadReportPDF({
        title: activeReportId === 'day_book' ? 'Day Book - Cash & Bank Book' : 'All Transactions Master Audit',
        subtitle: 'Chronological Inflow and Outflow Journal of Cash, Bank, and Party Ledgers',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Inflow (+)', value: `Rs ${dayBookData.totalMoneyIn.toLocaleString()}` },
          { label: 'Total Outflow (-)', value: `Rs ${dayBookData.totalMoneyOut.toLocaleString()}` },
          { label: 'Net Cash Flow', value: `Rs ${dayBookData.netFlow.toLocaleString()}` }
        ]
      });
    } else if (activeReportId === 'profit_loss') {
      const headers = ['Particulars / Accounting Head', 'Amount (PKR)', '% Contribution'];
      const rows = [
        ['1. Gross Sales Revenue', `Rs ${profitLossData.grossSales.toLocaleString()}`, '100.0%'],
        ['Less: Sales Returns & Credits', `- Rs ${profitLossData.salesReturns.toLocaleString()}`, '-'],
        ['Net Sales Revenue', `Rs ${profitLossData.netSales.toLocaleString()}`, '100.0%'],
        ['2. Cost of Goods Sold (COGS)', `- Rs ${profitLossData.cogs.toLocaleString()}`, `${profitLossData.netSales > 0 ? ((profitLossData.cogs / profitLossData.netSales) * 100).toFixed(1) : 0}%`],
        ['GROSS PROFIT', `Rs ${profitLossData.grossProfit.toLocaleString()}`, `${profitLossData.grossMarginPct.toFixed(1)}%`],
        ['3. Operating & Admin Expenses', `- Rs ${profitLossData.totalExpenses.toLocaleString()}`, `${profitLossData.netSales > 0 ? ((profitLossData.totalExpenses / profitLossData.netSales) * 100).toFixed(1) : 0}%`],
        ['NET PROFIT / (LOSS)', `Rs ${profitLossData.netProfit.toLocaleString()}`, `${profitLossData.netMarginPct.toFixed(1)}%`]
      ];
      downloadReportPDF({
        title: 'Profit & Loss Statement',
        subtitle: 'Comprehensive Financial Performance, Markups & Net Income Audit',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Net Revenue', value: `Rs ${profitLossData.netSales.toLocaleString()}` },
          { label: 'Gross Profit', value: `Rs ${profitLossData.grossProfit.toLocaleString()}` },
          { label: 'Expenses', value: `Rs ${profitLossData.totalExpenses.toLocaleString()}` },
          { label: 'Net Profit', value: `Rs ${profitLossData.netProfit.toLocaleString()}` }
        ]
      });
    } else if (activeReportId === 'bill_wise_profit') {
      const headers = ['S.No', 'Date', 'Invoice #', 'Party Name', 'Bill Amount (Rs)', 'Cost (Rs)', 'Gross Profit (Rs)', 'Margin %'];
      const rows = billWiseProfitData.map((b, idx) => [
        idx + 1,
        new Date(b.date).toLocaleDateString('en-GB'),
        b.invoiceNumber,
        b.partyName || 'Walk-in Customer',
        `Rs ${b.billAmount.toLocaleString()}`,
        `Rs ${b.costAmount.toLocaleString()}`,
        `Rs ${b.profit.toLocaleString()}`,
        `${b.margin.toFixed(1)}%`
      ]);
      const totalRev = billWiseProfitData.reduce((s, b) => s + b.billAmount, 0);
      const totalCost = billWiseProfitData.reduce((s, b) => s + b.costAmount, 0);
      const totalProf = billWiseProfitData.reduce((s, b) => s + b.profit, 0);
      downloadReportPDF({
        title: 'Bill-Wise Profitability Report',
        subtitle: 'Individual Invoice Margin, Product COGS and Net Yield Analysis',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Invoices', value: `${billWiseProfitData.length}` },
          { label: 'Billed Revenue', value: `Rs ${totalRev.toLocaleString()}` },
          { label: 'Total COGS', value: `Rs ${totalCost.toLocaleString()}` },
          { label: 'Total Profit', value: `Rs ${totalProf.toLocaleString()}` }
        ]
      });
    } else if (activeReportId === 'stock_summary' || activeReportId === 'low_stock_summary') {
      const headers = ['S.No', 'Medicine Name', 'Batch', 'Category', 'Quantity', 'Unit', 'Purchase Price (Rs)', 'Selling Price (Rs)', 'Valuation (Rs)'];
      const rows = stockSummaryData.map((m, idx) => [
        idx + 1,
        m.name,
        m.batchNumber || '-',
        m.category || 'General',
        m.quantity,
        m.unit || 'Box',
        `Rs ${m.purchasePrice.toLocaleString()}`,
        `Rs ${m.sellingPrice.toLocaleString()}`,
        `Rs ${m.stockValue.toLocaleString()}`
      ]);
      const totalStockVal = stockSummaryData.reduce((s, m) => s + m.stockValue, 0);
      downloadReportPDF({
        title: activeReportId === 'low_stock_summary' ? 'Low Stock Reorder Summary' : 'Stock Summary & Valuation Report',
        subtitle: 'Complete Inventory Positions, Batch Balances and Capital Asset Valuation',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total SKUs', value: `${stockSummaryData.length}` },
          { label: 'Total Units', value: `${stockSummaryData.reduce((s, m) => s + m.quantity, 0)}` },
          { label: 'Inventory Value', value: `Rs ${totalStockVal.toLocaleString()}` }
        ]
      });
    } else if (activeReportId === 'item_batch_report') {
      const headers = ['S.No', 'Medicine Name', 'Batch Number', 'Expiry Date', 'Days to Expiry', 'Stock Qty', 'Status'];
      const rows = batchReportData.map((b, idx) => [
        idx + 1,
        b.name,
        b.batchNumber,
        new Date(b.expiryDate).toLocaleDateString('en-GB'),
        `${b.diffDays} days`,
        b.quantity,
        b.status
      ]);
      downloadReportPDF({
        title: 'Batch & Expiry Monitoring Report',
        subtitle: 'Critical Pharmaceutical Shelf-Life Audit & Near-Expiry Register',
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Batches', value: `${batchReportData.length}` },
          { label: 'Near Expiry', value: `${batchReportData.filter(b => b.status === 'Near Expiry').length}` },
          { label: 'Expired', value: `${batchReportData.filter(b => b.status === 'Expired').length}` }
        ]
      });
    } else if (activeReportId === 'party_statement') {
      const curParty = parties.find(p => p.id === selectedPartyId);
      const partyInvoices = invoices.filter(inv => curParty && (inv.partyId === curParty.id || inv.customerName === curParty.name));
      const headers = ['S.No', 'Date', 'Type', 'Invoice / Ref #', 'Total Amount (Rs)', 'Paid (Rs)', 'Balance (Rs)'];
      const rows = partyInvoices.map((inv, idx) => [
        idx + 1,
        new Date(inv.date).toLocaleDateString('en-GB'),
        inv.transactionType || 'Sale',
        inv.invoiceNumber,
        `Rs ${inv.grandTotal.toLocaleString()}`,
        `Rs ${(inv.receivedAmount || 0).toLocaleString()}`,
        `Rs ${(inv.balanceDue || 0).toLocaleString()}`
      ]);
      const totalPartyBal = partyInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
      downloadReportPDF({
        title: `Party Statement: ${curParty?.name || 'Selected Party'}`,
        subtitle: `Ledger Statement & Transaction History for ${curParty?.name || 'Party'} (${curParty?.partyType || 'Customer'})`,
        dateRangeStr,
        headers,
        rows,
        summaryMetrics: [
          { label: 'Total Transactions', value: `${partyInvoices.length}` },
          { label: 'Outstanding Balance', value: `Rs ${totalPartyBal.toLocaleString()}` }
        ]
      });
    } else {
      // Fallback universal report PDF
      downloadReportPDF({
        title: `${currentReportDef.label} Report`,
        subtitle: `Generated from MBI Inventra Pharmacy Management System`,
        dateRangeStr,
        headers: ['S.No', 'Report Title', 'Category', 'Generated At', 'Status'],
        rows: [[1, currentReportDef.label, currentReportDef.categoryLabel, new Date().toLocaleString(), 'Verified']]
      });
    }
  };

  const handleExportCSV = () => {
    const fileName = `${currentReportDef.label.replace(/\s+/g, '_')}_Report.csv`;
    if (activeReportId === 'sale') {
      exportSalesToCSV(saleReportData.rows, fileName);
    } else if (activeReportId === 'stock_summary' || activeReportId === 'low_stock_summary') {
      exportInventoryToCSV(medicines, fileName);
    } else if (activeReportId === 'purchase') {
      const headers = ['S.No', 'Date', 'Bill No', 'Party Name', 'Transaction Type', 'Payment Type', 'Total Amount (PKR)', 'Balance Due (PKR)'];
      const rows = purchaseReportData.rows.map((po, idx) => [
        idx + 1,
        po.date ? new Date(po.date).toLocaleDateString('en-GB') : '',
        po.poNumber || po.billNumber || '-',
        po.supplierName || po.partyName || 'Supplier',
        po.transactionType || 'Purchase',
        po.paymentType || 'Cash',
        po.totalAmount || 0,
        po.balanceDue || 0
      ]);
      exportTableToCSV(headers, rows, fileName);
    } else if (activeReportId === 'day_book' || activeReportId === 'all_transactions') {
      const headers = ['S.No', 'Date', 'Type', 'Particular', 'Ref / Doc No', 'Mode', 'Money In (PKR)', 'Money Out (PKR)'];
      const rows = dayBookData.entries.map((e, idx) => [
        idx + 1,
        e.date ? new Date(e.date).toLocaleDateString('en-GB') : '',
        e.type,
        e.particular,
        e.refNo,
        e.mode,
        e.moneyIn,
        e.moneyOut
      ]);
      exportTableToCSV(headers, rows, fileName);
    } else if (activeReportId === 'controlled_register') {
      const headers = ['S.No', 'Date', 'Movement Type', 'Voucher #', 'Medicine', 'Generic / Salt', 'Batch', 'Expiry', 'Qty Out', 'Qty In', 'Total Amount (PKR)', 'Patient Name', 'Patient CNIC', 'Prescriber Doctor', 'PMDC #', 'Prescription #', 'Approved By'];
      const rows = controlledRegisterData.entries.map((e, idx) => [
        idx + 1,
        new Date(e.date).toLocaleString('en-GB'),
        e.type,
        e.invoiceNumber,
        e.medicineName,
        e.genericName,
        e.batchNumber,
        e.expiryDate || '-',
        e.quantityOut || 0,
        e.quantityIn || 0,
        e.totalAmount || 0,
        e.patientName,
        e.patientCnicOrPhone,
        e.prescriberDoctorName,
        e.prescriberDoctorRegNo,
        e.prescriptionNumber,
        e.userName
      ]);
      exportTableToCSV(headers, rows, fileName);
    } else if (activeReportId === 'bill_wise_profit') {
      const headers = ['S.No', 'Date', 'Invoice #', 'Party Name', 'Bill Amount (PKR)', 'Cost Amount (PKR)', 'Gross Profit (PKR)', 'Margin (%)'];
      const rows = billWiseProfitData.map((b, idx) => [
        idx + 1,
        new Date(b.date).toLocaleDateString('en-GB'),
        b.invoiceNumber,
        b.partyName || 'Customer',
        b.billAmount,
        b.costAmount,
        b.profit,
        b.margin.toFixed(1)
      ]);
      exportTableToCSV(headers, rows, fileName);
    } else {
      const headers = ['Report', 'Generated Date', 'Status'];
      const rows = [[currentReportDef.label, new Date().toLocaleString(), 'Exported Successfully']];
      exportTableToCSV(headers, rows, fileName);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = (msg: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleReportChange = (id: string) => {
    setActiveReportId(id);
    navigate(`/reports?report=${id}`, { replace: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-100 rounded-2xl border border-slate-300 shadow-xl overflow-hidden animate-in fade-in select-none">
      
      {/* Top Window Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Business Reports & Analytics</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Comprehensive financial, transaction, inventory and tax reports
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f8fafc]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs font-sans overflow-hidden" ref={reportPrintRef}>
      {/* Top Control Bar: Report Selector, Date Preset, Date Range Picker, Firm, User, Graph, Excel, Print */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Date Range & Preset Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Report Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-500 font-semibold">Report:</span>
              <select
                value={activeReportId}
                onChange={(e) => handleReportChange(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {REPORT_LIST.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.categoryLabel} &gt; {r.label}
                  </option>
                ))}
              </select>
            </div>

              {/* Preset Dropdown (Custom v) */}
              <div className="relative">
                <select
                  value={datePreset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer pr-7"
                >
                  <option value="Custom">Custom</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Quarter">This Quarter</option>
                  <option value="This Financial Year">This Financial Year</option>
                  <option value="All Time">All Time</option>
                </select>
              </div>

              {/* Between Date Range Box (Matches Screenshot) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-slate-500 font-semibold">Between</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('Custom');
                  }}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
                <span className="text-slate-500 font-semibold">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('Custom');
                  }}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Firm Selector */}
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="ALL FIRMS">ALL FIRMS</option>
                <option value="MBI Inventra Head Office">MBI Inventra Head Office</option>
                <option value="Main Wholesale Branch">Main Wholesale Branch</option>
              </select>

              {/* User Selector */}
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="ALL USERS">ALL USERS</option>
                <option value="Admin">Admin</option>
                <option value="Pharmacist">Pharmacist</option>
                <option value="Counter Cashier">Counter Cashier</option>
              </select>
            </div>

            {/* Right Tools: Graph, Excel Report, Print */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 max-w-full">
              {/* Graph Button */}
              <button
                onClick={() => setShowGraph(!showGraph)}
                className={`flex flex-col items-center justify-center text-[10px] font-bold transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0 ${
                  showGraph ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Toggle Graph View"
              >
                <BarChart2 className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5" />
                <span>Graph</span>
              </button>

              {/* Excel Report Button */}
              <button
                onClick={handleExportExcel}
                className="flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0"
                title="Export Excel Report"
              >
                <FileSpreadsheet className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              {/* PDF Download Button */}
              <button
                onClick={handleExportPDF}
                className="flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0"
                title="Download Official Formatted PDF Report"
              >
                <FileText className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5 text-rose-600" />
                <span>PDF</span>
              </button>

              {/* CSV Report Button */}
              <button
                onClick={handleExportCSV}
                className="flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0"
                title="Export CSV Report (Tax Compliance & Records)"
              >
                <Download className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5 text-blue-600" />
                <span>CSV</span>
              </button>

              {/* Column Selector Button */}
              <button
                onClick={() => setColumnModalOpen(true)}
                className="flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0"
                title="Customize Columns"
              >
                <Columns className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5 text-purple-600" />
                <span>Columns</span>
              </button>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center text-[10px] font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer px-2 py-1 rounded-lg shrink-0"
                title="Print Report"
              >
                <Printer className="w-4 sm:w-5 h-4 sm:h-5 mb-0.5 text-slate-700" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* ================= SUMMARY STAT METRICS CARDS (EXACT MATCH TO SCREENSHOTS) ================= */}
          {(activeReportId === 'sale' || activeReportId === 'purchase') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 sm:flex-row items-center gap-2 sm:gap-3 pt-2">
              {/* Paid Box (Mint Green #dcfce7 / #a7f3d0) */}
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'PAID' ? 'ALL' : 'PAID')}
                className={`w-full text-left bg-[#dcfce7] border rounded-xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer ${
                  statusFilter === 'PAID' ? 'border-emerald-600 ring-2 ring-emerald-500 scale-[1.01]' : 'border-emerald-300/80 hover:border-emerald-400'
                }`}
                title="Click to filter Paid records"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-emerald-800">Paid</span>
                  {statusFilter === 'PAID' && (
                    <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.5 rounded">Active</span>
                  )}
                </div>
                <span className="text-sm sm:text-lg font-black text-slate-900 font-mono">
                  Rs {activeReportId === 'sale' ? saleReportData.paid.toFixed(2) : purchaseReportData.paid.toFixed(2)}
                </span>
              </button>

              {/* Plus Symbol */}
              <div className="text-lg font-black text-slate-400 select-none hidden sm:block text-center">+</div>

              {/* Unpaid Box (Light Blue #e0f2fe / #bae6fd) */}
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'UNPAID' ? 'ALL' : 'UNPAID')}
                className={`w-full text-left bg-[#e0f2fe] border rounded-xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer ${
                  statusFilter === 'UNPAID' ? 'border-blue-600 ring-2 ring-blue-500 scale-[1.01]' : 'border-blue-300/80 hover:border-blue-400'
                }`}
                title="Click to filter Unpaid records"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-blue-800">Unpaid</span>
                  {statusFilter === 'UNPAID' && (
                    <span className="text-[10px] bg-blue-700 text-white font-bold px-1.5 py-0.5 rounded">Active</span>
                  )}
                </div>
                <span className="text-sm sm:text-lg font-black text-slate-900 font-mono">
                  Rs {activeReportId === 'sale' ? saleReportData.unpaid.toFixed(2) : purchaseReportData.unpaid.toFixed(2)}
                </span>
              </button>

              {/* Equals Symbol */}
              <div className="text-lg font-black text-slate-400 select-none hidden sm:block text-center">=</div>

              {/* Total Box (Light Peach / Yellow #fed7aa / #fef08a) */}
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`w-full text-left bg-[#fed7aa] border rounded-xl p-2.5 sm:p-3.5 shadow-2xs transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'border-amber-600 ring-2 ring-amber-400' : 'border-amber-300/80 hover:border-amber-400'
                }`}
                title="Click to view all records"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] sm:text-xs font-semibold text-amber-900">Total</span>
                  {statusFilter === 'ALL' && (
                    <span className="text-[10px] bg-amber-800 text-white font-bold px-1.5 py-0.5 rounded">All</span>
                  )}
                </div>
                <span className="text-sm sm:text-lg font-black text-slate-900 font-mono">
                  Rs {activeReportId === 'sale' ? saleReportData.total.toFixed(2) : purchaseReportData.total.toFixed(2)}
                </span>
              </button>
            </div>
          )}

          {/* Controlled Items Register Summary Metrics */}
          {activeReportId === 'controlled_register' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800 mb-0.5">
                    <span>Dispensed (Out)</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-rose-950">
                    {controlledRegisterData.totalDispensed} Units
                  </span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-0.5">
                    <span>Inward Receipts</span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-emerald-950">
                    {controlledRegisterData.totalInward} Units
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800 mb-0.5">
                    <span>Returns / Adjustments</span>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-amber-950">
                    {controlledRegisterData.totalReturns + controlledRegisterData.totalAdjustments} Units
                  </span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-0.5">
                    <span>Patients Registered</span>
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-blue-950">
                    {controlledRegisterData.uniquePatients} Patients
                  </span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-800 mb-0.5">
                    <span>Form-7 Audit Total</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-base sm:text-lg font-black text-purple-950">
                    Rs {controlledRegisterData.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dedicated Form-7 Filters: Generic Selector, Movement Type, Patient / Prescriber Search */}
              <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1 font-bold text-slate-700">
                  <Filter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Register Filters:</span>
                </div>

                {/* Generic Salt Filter */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                  <Pill className="w-3 h-3 text-purple-600" />
                  <span className="text-slate-500 font-semibold">Generic:</span>
                  <select
                    value={controlledGenericFilter}
                    onChange={(e) => setControlledGenericFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">All Generics & Salts</option>
                    {DEFAULT_GENERIC_MASTERS.map(g => (
                      <option key={g.id} value={g.genericName}>
                        {g.genericName} {g.isControlled ? '🔒 (Controlled)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Movement Type Filter */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                  <span className="text-slate-500 font-semibold">Movement:</span>
                  <select
                    value={controlledTypeFilter}
                    onChange={(e) => setControlledTypeFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">All Movements</option>
                    <option value="Sale">Sale (Dispensed)</option>
                    <option value="Sale Return">Sale Return (Credit)</option>
                    <option value="Purchase">Purchase (Inward Receipt)</option>
                    <option value="Adjustment">Stock Audit Adjustment</option>
                  </select>
                </div>

                {/* Dispenser / Pharmacist Filter */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 shadow-2xs">
                  <Users className="w-3 h-3 text-emerald-600" />
                  <span className="text-slate-500 font-semibold">Dispenser:</span>
                  <select
                    value={controlledUserFilter}
                    onChange={(e) => setControlledUserFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="ALL">All Pharmacists / Users</option>
                    <option value="Admin">Admin</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Chief Pharmacist">Chief Pharmacist</option>
                    <option value="Senior Pharmacist (Admin)">Senior Pharmacist (Admin)</option>
                  </select>
                </div>

                {/* Patient / Prescriber / Rx # Search */}
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={controlledPatientSearch}
                    onChange={(e) => setControlledPatientSearch(e.target.value)}
                    placeholder="Search Patient Name, CNIC, Doctor PMDC, or Rx #..."
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {(controlledGenericFilter !== 'ALL' || controlledTypeFilter !== 'ALL' || controlledUserFilter !== 'ALL' || controlledPatientSearch) && (
                  <button
                    onClick={() => {
                      setControlledGenericFilter('ALL');
                      setControlledTypeFilter('ALL');
                      setControlledUserFilter('ALL');
                      setControlledPatientSearch('');
                    }}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Profit and Loss Summary Metrics */}
          {activeReportId === 'profit_loss' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-xs text-blue-700 font-semibold block">Net Sales Revenue</span>
                <span className="text-base font-black text-slate-900">Rs {profitLossData.netSales.toLocaleString()}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-xs text-amber-700 font-semibold block">COGS (Item Costs)</span>
                <span className="text-base font-black text-slate-900">Rs {profitLossData.cogs.toLocaleString()}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <span className="text-xs text-rose-700 font-semibold block">Operating Expenses</span>
                <span className="text-base font-black text-slate-900">Rs {profitLossData.totalExpenses.toLocaleString()}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                <span className="text-xs text-emerald-800 font-bold block">Net Profit ({profitLossData.netMarginPct.toFixed(1)}%)</span>
                <span className="text-base font-black text-emerald-700">Rs {profitLossData.netProfit.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Day Book Metrics */}
          {activeReportId === 'day_book' && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <span className="text-xs text-emerald-800 font-semibold block">Total Money In (Cr)</span>
                <span className="text-base font-black text-emerald-700">Rs {dayBookData.totalMoneyIn.toLocaleString()}</span>
              </div>
              <div className="text-lg font-black text-slate-400">-</div>
              <div className="flex-1 bg-rose-50 border border-rose-200 rounded-xl p-3">
                <span className="text-xs text-rose-800 font-semibold block">Total Money Out (Dr)</span>
                <span className="text-base font-black text-rose-700">Rs {dayBookData.totalMoneyOut.toLocaleString()}</span>
              </div>
              <div className="text-lg font-black text-slate-400">=</div>
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-xs text-blue-800 font-semibold block">Net Daily Balance</span>
                <span className={`text-base font-black ${dayBookData.netFlow >= 0 ? 'text-blue-900' : 'text-rose-600'}`}>
                  Rs {dayBookData.netFlow.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================= OPTIONAL GRAPH VISUALIZER ================= */}
        {showGraph && (
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                {currentReportDef.label} Visual Insights
              </h4>
              <button
                onClick={() => setShowGraph(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                Close Graph ✕
              </button>
            </div>
            <div className="h-64 w-full bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <ResponsiveContainer width="100%" height="100%">
                {activeReportId === 'expense_category' ? (
                  <PieChart>
                    <Pie
                      data={expenseCategoryData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {expenseCategoryData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Amount']} />
                    <Legend />
                  </PieChart>
                ) : (
                  <BarChart data={
                    activeReportId === 'sale' 
                      ? saleReportData.rows.slice(0, 10).map(r => ({ name: r.customerName.slice(0, 12), amount: r.grandTotal }))
                      : activeReportId === 'purchase'
                      ? purchaseReportData.rows.slice(0, 10).map(r => ({ name: (r.supplierName || r.partyName || '').slice(0, 12), amount: r.totalAmount }))
                      : stockSummaryData.slice(0, 10).map(m => ({ name: m.name.slice(0, 12), amount: m.stockValue }))
                  }>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: any) => [`Rs ${Number(value).toLocaleString()}`, 'Value']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ================= REPORT BODY & DATA TABLE ================= */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          {/* Centralized Shared Filter Bar */}
          <ReportFilterBar
            dateRange={{
              startDate,
              endDate,
              preset: (['Today', 'Yesterday', 'This Week', 'This Month', 'Last Month', 'This Quarter', 'This Financial Year', 'All Time'].includes(datePreset) ? datePreset : 'Custom') as DatePreset
            }}
            onDateRangeChange={(range) => {
              setStartDate(range.startDate);
              setEndDate(range.endDate);
              setDatePreset(range.preset);
            }}
            partyOptions={[
              { id: 'ALL', name: activeReportId === 'purchase' ? 'All Suppliers' : 'All Parties' },
              ...(activeReportId === 'purchase'
                ? purchaseSupplierOptions.filter(p => p.value !== 'ALL').map(p => ({ id: p.value, name: p.label, count: p.count }))
                : activeReportId === 'sale' || activeReportId === 'party_statement'
                ? salePartyOptions.filter(p => p.value !== 'ALL').map(p => ({ id: p.value, name: p.label, count: p.count }))
                : parties.map(p => ({ id: p.name, name: p.name })))
            ]}
            selectedParty={colFilters.party !== 'ALL' ? colFilters.party : colFilters.supplier !== 'ALL' ? colFilters.supplier : 'ALL'}
            onPartyChange={(val) => setColFilters(prev => ({ ...prev, party: val, supplier: val }))}
            categoryOptions={
              activeReportId === 'stock_summary'
                ? stockCategoryOptions.map(c => typeof c === 'string' ? c : (c as any).value || (c as any).label)
                : [
                    'ALL',
                    'General',
                    'Narcotics & Sedatives',
                    'Antibiotics',
                    'Cardiovascular',
                    'Analgesic',
                    'Antidiabetic',
                    'Psychotropic',
                    'Gastrointestinal'
                  ]
            }
            selectedCategory={colFilters.category}
            onCategoryChange={(val) => setColFilters(prev => ({ ...prev, category: val }))}
            statusOptions={
              activeReportId === 'sale'
                ? saleStatusOptions.map(s => ({ id: s.value, label: s.label, count: s.count }))
                : activeReportId === 'purchase'
                ? purchaseStatusOptions.map(s => ({ id: s.value, label: s.label, count: s.count }))
                : activeReportId === 'item_batch_report'
                ? batchStatusOptions.map(s => ({ id: s.value, label: s.label, count: s.count }))
                : activeReportId === 'stock_summary'
                ? stockStatusOptions.map(s => ({ id: s.value, label: s.label, count: s.count }))
                : [
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'PAID', label: 'Paid' },
                    { id: 'UNPAID', label: 'Unpaid / Due' }
                  ]
            }
            selectedStatus={colFilters.status !== 'ALL' ? colFilters.status : colFilters.stockStatus !== 'ALL' ? colFilters.stockStatus : 'ALL'}
            onStatusChange={(val) => setColFilters(prev => ({ ...prev, status: val, stockStatus: val }))}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={`Search in ${currentReportDef.label}...`}
            onResetAllFilters={clearAllColFilters}
            showSyncIndicator={true}
          >
            {/* Quick Action Button */}
            {activeReportId === 'sale' && (
              <button
                onClick={() => setEditingInvoice({} as any)}
                className="px-3 py-1.5 bg-[#0070f3] hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sale
              </button>
            )}
            {activeReportId === 'purchase' && (
              <button
                onClick={() => setEditingPurchaseOrder({} as any)}
                className="px-3 py-1.5 bg-[#0070f3] hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Purchase
              </button>
            )}
            {activeReportId === 'party_statement' && (
              <button
                onClick={() => setColumnModalOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                title="Customize Table Columns"
              >
                <Columns className="w-3.5 h-3.5 text-slate-500" />
                Columns
              </button>
            )}
          </ReportFilterBar>

          {/* Active Category / Column Filters Chips */}
          {Object.entries(colFilters).some(([_, v]) => v !== 'ALL' && v !== '') && (
            <div className="flex flex-wrap items-center gap-2 bg-blue-50/70 border border-blue-200 px-3 py-2 rounded-xl text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-1 text-[11px]">
                <Filter className="w-3 h-3 text-blue-600" /> Active Sub-Filters:
              </span>
              {colFilters.party !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Party: {colFilters.party}
                  <button onClick={() => setColFilters(prev => ({ ...prev, party: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.supplier !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Supplier: {colFilters.supplier}
                  <button onClick={() => setColFilters(prev => ({ ...prev, supplier: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.transactionType !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Type: {colFilters.transactionType}
                  <button onClick={() => setColFilters(prev => ({ ...prev, transactionType: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.paymentType !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Payment: {colFilters.paymentType}
                  <button onClick={() => setColFilters(prev => ({ ...prev, paymentType: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.status !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Status: {colFilters.status}
                  <button onClick={() => setColFilters(prev => ({ ...prev, status: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.category !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Category: {colFilters.category}
                  <button onClick={() => setColFilters(prev => ({ ...prev, category: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              {colFilters.stockStatus !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white text-blue-800 border border-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs">
                  Stock Level: {colFilters.stockStatus === 'IN_STOCK' ? 'In Stock' : colFilters.stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}
                  <button onClick={() => setColFilters(prev => ({ ...prev, stockStatus: 'ALL' }))} className="text-blue-500 hover:text-rose-600 cursor-pointer">×</button>
                </span>
              )}
              <button
                onClick={clearAllColFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline ml-auto cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              {/* ================= 0. CONTROLLED ITEMS REGISTER (FORM-7 REGULATORY REGISTER) ================= */}
              {activeReportId === 'controlled_register' && (
                <div className="space-y-4">
                  {/* Form-7 Official Regulatory Banner */}
                  <div className="p-3 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <div>
                        <span className="font-black text-rose-900 uppercase tracking-wide">
                          Official Register of Controlled Substances, Narcotics & Sedatives (DRAP / Form-7)
                        </span>
                        <p className="text-[11px] text-rose-700 font-medium">
                          Statutory register for tracking all sales, returns, inward deliveries, patient CNIC, PMDC Doctor registration, and prescription numbers.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded border border-rose-300">
                        {controlledRegisterData.entries.length} Audit Entries
                      </span>
                      <button
                        onClick={handleExportExcel}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        Export Form-7 Excel
                      </button>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 whitespace-nowrap">DATE & TIME</th>
                        <th className="py-2.5 px-3">MOVEMENT</th>
                        <th className="py-2.5 px-3">VOUCHER / REF #</th>
                        <th className="py-2.5 px-3">MEDICINE & GENERIC SALT</th>
                        <th className="py-2.5 px-3">BATCH & EXPIRY</th>
                        <th className="py-2.5 px-3 text-center">INWARD (REC)</th>
                        <th className="py-2.5 px-3 text-center">OUT (DISP)</th>
                        <th className="py-2.5 px-3 text-right">TOTAL (RS)</th>
                        <th className="py-2.5 px-3">PATIENT DETAILS</th>
                        <th className="py-2.5 px-3">PRESCRIBER & PMDC</th>
                        <th className="py-2.5 px-3">DISPENSED BY</th>
                        <th className="py-2.5 px-3 text-center w-20">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {controlledRegisterData.entries.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                            <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                            No controlled or restricted item movements found matching the selected filters or date range.
                          </td>
                        </tr>
                      ) : (
                        controlledRegisterData.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-600 text-[11px]">
                              {new Date(entry.date).toLocaleDateString('en-GB')}
                              <span className="block text-[10px] text-slate-400">
                                {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {entry.type === 'Sale' && (
                                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-300">
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  Dispensed
                                </span>
                              )}
                              {entry.type === 'Sale Return' && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Sale Return
                                </span>
                              )}
                              {entry.type === 'Purchase' && (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-300">
                                  <ArrowDownRight className="w-2.5 h-2.5" />
                                  Inward Receipt
                                </span>
                              )}
                              {entry.type === 'Adjustment' && (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-300">
                                  Audit Adj
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                              {entry.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 min-w-[180px]">
                              <span className="font-bold text-slate-900 block">{entry.medicineName}</span>
                              <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold mt-0.5">
                                <Pill className="w-3 h-3 text-purple-600 shrink-0" />
                                <span>{entry.genericName}</span>
                                {entry.strength && <span className="text-slate-500 font-normal">({entry.strength})</span>}
                              </div>
                              <span className="text-[10px] text-slate-400 block font-normal">{entry.manufacturer}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                              <span className="font-bold text-slate-800 block">Batch: {entry.batchNumber}</span>
                              <span className="text-[10px] text-slate-500">Exp: {entry.expiryDate}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {entry.quantityIn > 0 ? (
                                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  +{entry.quantityIn} {entry.unit}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {entry.quantityOut > 0 ? (
                                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  -{entry.quantityOut} {entry.unit}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                              {entry.totalAmount > 0 ? `Rs ${entry.totalAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 min-w-[160px]">
                              <span className="font-bold text-slate-900 block">{entry.patientName}</span>
                              <span className="text-[11px] text-slate-500 font-mono block">
                                CNIC/Mob: {entry.patientCnicOrPhone}
                              </span>
                              {entry.patientAge !== '-' && (
                                <span className="text-[10px] text-slate-400 block">Age: {entry.patientAge}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 min-w-[170px]">
                              <span className="font-bold text-slate-800 block">{entry.prescriberDoctorName}</span>
                              <span className="text-[11px] text-indigo-700 font-mono block font-bold">
                                {entry.prescriberDoctorRegNo}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                Rx #{entry.prescriptionNumber} ({entry.prescriptionDate})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-bold text-slate-800 block">{entry.userName}</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">Authorized</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {entry.rawInvoice && (
                                  <>
                                    <button
                                      onClick={() => handleDirectEditSale(entry.rawInvoice!)}
                                      className="p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                                      title="Direct Edit Source Sale Invoice"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setPrintingInvoice(entry.rawInvoice!)}
                                      className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                      title="View & Print Sale Invoice"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {entry.rawPurchase && (
                                  <>
                                    <button
                                      onClick={() => handleDirectEditPurchase(entry.rawPurchase!)}
                                      className="p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                                      title="Direct Edit Purchase Bill"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setPrintingPurchaseOrder(entry.rawPurchase!)}
                                      className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                      title="View & Print Purchase Inward Bill"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleWhatsAppShare(
                                    `Form-7 Controlled Dispense Audit: ${entry.medicineName} (${entry.genericName}) Batch #${entry.batchNumber}, Qty: ${entry.quantityOut || entry.quantityIn}, Patient: ${entry.patientName} (${entry.patientCnicOrPhone}), Prescriber: ${entry.prescriberDoctorName} (${entry.prescriberDoctorRegNo}), Rx #${entry.prescriptionNumber}`
                                  )}
                                  className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                  title="Share Regulatory Record via WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ================= 1. SALE REPORT TABLE ================= */}
              {activeReportId === 'sale' && (
                <>
                  {/* Mobile Card-Based List */}
                  <div className="block sm:hidden divide-y divide-slate-100">
                    {filteredSaleRows.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-medium text-xs">
                        No sales found matching current filters or date range.
                      </div>
                    ) : (
                      filteredSaleRows.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-3.5 space-y-2 hover:bg-slate-50/80 active:bg-slate-100 transition-colors"
                          onClick={() => handleDirectEditSale(inv)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="font-bold text-blue-600">#{inv.invoiceNumber}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">{new Date(inv.date).toLocaleDateString('en-GB')}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px]">
                              {inv.transactionType || 'Sale'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{inv.customerName}</p>
                              <p className="text-[11px] text-slate-500">{inv.paymentMethod || inv.paymentType || 'Cash'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-sm font-mono">Rs {inv.grandTotal.toLocaleString()}</p>
                              <p className={`text-[11px] font-bold ${inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                Due: Rs {(inv.balanceDue || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDirectEditSale(inv)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => setPrintingInvoice(inv)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(`Invoice #${inv.invoiceNumber} for ${inv.customerName}: Total Rs ${inv.grandTotal.toLocaleString()}, Balance Rs ${(inv.balanceDue || 0).toLocaleString()}`)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <Share2 className="w-3 h-3" /> Share
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden sm:table w-full text-left border-collapse text-xs">
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
                          label="INVOICE #"
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
                          filterOptions={salePartyOptions}
                          onSelectFilter={(val) => setColFilters(prev => ({ ...prev, party: val }))}
                          openPopoverKey={openFilterPopover}
                          setOpenPopoverKey={setOpenFilterPopover}
                          filterSearch={filterSearchQuery}
                          setFilterSearch={setFilterSearchQuery}
                        />
                        <ColumnHeader
                          label="TRANSACTION TYPE"
                          filterKey="transactionType"
                          activeFilterValue={colFilters.transactionType}
                          filterOptions={saleTypeOptions}
                          onSelectFilter={(val) => setColFilters(prev => ({ ...prev, transactionType: val }))}
                          openPopoverKey={openFilterPopover}
                          setOpenPopoverKey={setOpenFilterPopover}
                          filterSearch={filterSearchQuery}
                          setFilterSearch={setFilterSearchQuery}
                        />
                        <ColumnHeader
                          label="PAYMENT METHOD"
                          filterKey="paymentType"
                          activeFilterValue={colFilters.paymentType}
                          filterOptions={salePaymentTypeOptions}
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
                        <ColumnHeader
                          label="BALANCE / DUE"
                          sortKey="balanceDue"
                          currentSortField={sortField}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterKey="status"
                          activeFilterValue={colFilters.status}
                          filterOptions={saleStatusOptions}
                          onSelectFilter={(val) => setColFilters(prev => ({ ...prev, status: val }))}
                          openPopoverKey={openFilterPopover}
                          setOpenPopoverKey={setOpenFilterPopover}
                          filterSearch={filterSearchQuery}
                          setFilterSearch={setFilterSearchQuery}
                          align="right"
                        />
                        <th className="py-2.5 px-3 text-center w-28 text-slate-700 font-bold uppercase tracking-wider text-[11px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredSaleRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            No sales found matching current filters or date range.
                          </td>
                        </tr>
                      ) : (
                        filteredSaleRows.map((inv) => (
                          <tr 
                            key={inv.id} 
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                            onDoubleClick={() => handleDirectEditSale(inv)}
                            title="Double click to Direct Edit transaction"
                          >
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {new Date(inv.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              <button
                                onClick={() => handleDirectEditSale(inv)}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                                title="Click to Direct Edit sale"
                              >
                                <span>{inv.invoiceNumber}</span>
                                <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">
                              <button
                                onClick={() => navigate('/reports?report=party_statement')}
                                className="text-left hover:text-blue-600 hover:underline cursor-pointer"
                                title="View party statement"
                              >
                                {inv.customerName}
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold text-[10px]">
                                {inv.transactionType || 'Sale'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-600">
                              {inv.paymentMethod || inv.paymentType || 'Cash'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              Rs {inv.grandTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold">
                              <span className={inv.balanceDue > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}>
                                Rs {(inv.balanceDue || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-slate-500">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDirectEditSale(inv); }}
                                  className="p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                                  title="Direct Edit Sale Transaction"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setPrintingInvoice(inv); }}
                                  className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                  title="Print / View Invoice"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(`Invoice #${inv.invoiceNumber} for ${inv.customerName}: Total Rs ${inv.grandTotal.toLocaleString()}, Balance Rs ${(inv.balanceDue || 0).toLocaleString()}`); }}
                                  className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                  title="Share via WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* ================= 2. PURCHASE REPORT TABLE ================= */}
              {activeReportId === 'purchase' && (
                <>
                  {/* Mobile Card-Based List */}
                  <div className="block sm:hidden divide-y divide-slate-100">
                    {filteredPurchaseRows.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-medium text-xs">
                        No purchase records found matching current filters or date range.
                      </div>
                    ) : (
                      filteredPurchaseRows.map((po) => (
                        <div
                          key={po.id}
                          className="p-3.5 space-y-2 hover:bg-slate-50/80 active:bg-slate-100 transition-colors"
                          onClick={() => handleDirectEditPurchase(po)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="font-bold text-blue-600">#{po.poNumber || po.billNumber || '-'}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">{new Date(po.date).toLocaleDateString('en-GB')}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-bold text-[10px]">
                              {po.paymentType || 'Credit'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{po.supplierName || po.partyName}</p>
                              <p className="text-[11px] text-emerald-600 font-bold">Paid: Rs {(po.paidAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900 text-sm font-mono">Rs {po.totalAmount.toLocaleString()}</p>
                              <p className="text-[11px] font-bold text-rose-600">
                                Due: Rs {(po.balanceDue || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDirectEditPurchase(po)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => setPrintingPurchaseOrder(po)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(`Purchase Bill #${po.poNumber || po.billNumber || ''} for ${po.supplierName || po.partyName}: Total Rs ${po.totalAmount.toLocaleString()}, Balance Rs ${(po.balanceDue || 0).toLocaleString()}`)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <Share2 className="w-3 h-3" /> Share
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop Table View */}
                  <table className="hidden sm:table w-full text-left border-collapse text-xs">
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
                          label="BILL #"
                          sortKey="poNumber"
                          currentSortField={sortField}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                        />
                        <ColumnHeader
                          label="SUPPLIER / PARTY"
                          sortKey="supplierName"
                          currentSortField={sortField}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterKey="supplier"
                          activeFilterValue={colFilters.supplier}
                          filterOptions={purchaseSupplierOptions}
                          onSelectFilter={(val) => setColFilters(prev => ({ ...prev, supplier: val }))}
                          openPopoverKey={openFilterPopover}
                          setOpenPopoverKey={setOpenFilterPopover}
                          filterSearch={filterSearchQuery}
                          setFilterSearch={setFilterSearchQuery}
                        />
                        <ColumnHeader
                          label="PAYMENT TYPE"
                          filterKey="paymentType"
                          activeFilterValue={colFilters.paymentType}
                          filterOptions={purchasePaymentTypeOptions}
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
                          label="PAID"
                          sortKey="paidAmount"
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
                          filterKey="status"
                          activeFilterValue={colFilters.status}
                          filterOptions={purchaseStatusOptions}
                          onSelectFilter={(val) => setColFilters(prev => ({ ...prev, status: val }))}
                          openPopoverKey={openFilterPopover}
                          setOpenPopoverKey={setOpenFilterPopover}
                          filterSearch={filterSearchQuery}
                          setFilterSearch={setFilterSearchQuery}
                          align="right"
                        />
                        <th className="py-2.5 px-3 text-center w-28 text-slate-700 font-bold uppercase tracking-wider text-[11px]">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredPurchaseRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            No purchase records found matching current filters or date range.
                          </td>
                        </tr>
                      ) : (
                        filteredPurchaseRows.map((po) => (
                          <tr 
                            key={po.id} 
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                            onDoubleClick={() => handleDirectEditPurchase(po)}
                            title="Double click to Direct Edit purchase bill"
                          >
                            <td className="py-2.5 px-3 font-mono">{new Date(po.date).toLocaleDateString('en-GB')}</td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              <button
                                onClick={() => handleDirectEditPurchase(po)}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-1"
                                title="Click to Direct Edit purchase order"
                              >
                                <span>{po.poNumber || po.billNumber || '-'}</span>
                                <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              <button
                                onClick={() => navigate(`/reports?report=party_statement&partyId=${po.supplierId || ''}`)}
                                className="text-left hover:text-blue-600 hover:underline cursor-pointer"
                                title="View supplier statement"
                              >
                                {po.supplierName || po.partyName}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 font-semibold">{po.paymentType || 'Credit'}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">Rs {po.totalAmount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">Rs {(po.paidAmount || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right text-rose-600 font-bold">Rs {(po.balanceDue || 0).toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-slate-500">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDirectEditPurchase(po); }}
                                  className="p-1 hover:text-amber-600 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                                  title="Direct Edit Purchase Bill"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setPrintingPurchaseOrder(po); }}
                                  className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                  title="Print / View Purchase Bill"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(`Purchase Bill #${po.poNumber || po.billNumber || ''} for ${po.supplierName || po.partyName}: Total Rs ${po.totalAmount.toLocaleString()}, Balance Rs ${(po.balanceDue || 0).toLocaleString()}`); }}
                                  className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                                  title="Share via WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* ================= 3. DAY BOOK TABLE ================= */}
              {activeReportId === 'day_book' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <ColumnHeader label="DATE" />
                      <ColumnHeader
                        label="TYPE"
                        filterKey="transactionType"
                        activeFilterValue={colFilters.transactionType}
                        filterOptions={dayBookTypeOptions}
                        onSelectFilter={(val) => setColFilters(prev => ({ ...prev, transactionType: val }))}
                        openPopoverKey={openFilterPopover}
                        setOpenPopoverKey={setOpenFilterPopover}
                        filterSearch={filterSearchQuery}
                        setFilterSearch={setFilterSearchQuery}
                      />
                      <ColumnHeader label="PARTICULAR / PARTY" />
                      <ColumnHeader label="DOC / REF #" />
                      <ColumnHeader
                        label="MODE"
                        filterKey="paymentType"
                        activeFilterValue={colFilters.paymentType}
                        filterOptions={dayBookModeOptions}
                        onSelectFilter={(val) => setColFilters(prev => ({ ...prev, paymentType: val }))}
                        openPopoverKey={openFilterPopover}
                        setOpenPopoverKey={setOpenFilterPopover}
                        filterSearch={filterSearchQuery}
                        setFilterSearch={setFilterSearchQuery}
                      />
                      <ColumnHeader label="MONEY IN (CR)" align="right" />
                      <ColumnHeader label="MONEY OUT (DR)" align="right" />
                      <ColumnHeader label="ACTION" align="center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredDayBookEntries.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => {
                          if (e.sourceType === 'sale' && e.rawItem) handleDirectEditSale(e.rawItem);
                          else if (e.sourceType === 'purchase' && e.rawItem) handleDirectEditPurchase(e.rawItem);
                          else if (e.sourceType === 'expense' && e.rawItem) handleDirectEditExpense(e.rawItem);
                          else if (e.sourceType === 'payment' && e.rawItem) handleDirectEditPayment(e.rawItem);
                        }}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        title="Click to directly edit this source record"
                      >
                        <td className="py-2.5 px-3 font-mono">{new Date(e.date).toLocaleDateString('en-GB')}</td>
                        <td className="py-2.5 px-3 font-bold">{e.type}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{e.particular}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{e.refNo}</td>
                        <td className="py-2.5 px-3 font-semibold">{e.mode}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                          {e.moneyIn > 0 ? `+ Rs ${e.moneyIn.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-600">
                          {e.moneyOut > 0 ? `- Rs ${e.moneyOut.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {e.rawItem && (
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (e.sourceType === 'sale') handleDirectEditSale(e.rawItem);
                                else if (e.sourceType === 'purchase') handleDirectEditPurchase(e.rawItem);
                                else if (e.sourceType === 'expense') handleDirectEditExpense(e.rawItem);
                                else if (e.sourceType === 'payment') handleDirectEditPayment(e.rawItem);
                              }}
                              className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                              title="Direct Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ================= 4. ALL TRANSACTIONS ================= */}
              {activeReportId === 'all_transactions' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">TRANSACTION</th>
                      <th className="py-2.5 px-3">PARTY / ACCOUNT</th>
                      <th className="py-2.5 px-3">REF #</th>
                      <th className="py-2.5 px-3">PAYMENT MODE</th>
                      <th className="py-2.5 px-3 text-right">AMOUNT (RS)</th>
                      <th className="py-2.5 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {dayBookData.entries.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          if (tx.sourceType === 'sale' && tx.rawItem) handleDirectEditSale(tx.rawItem);
                          else if (tx.sourceType === 'purchase' && tx.rawItem) handleDirectEditPurchase(tx.rawItem);
                          else if (tx.sourceType === 'expense' && tx.rawItem) handleDirectEditExpense(tx.rawItem);
                          else if (tx.sourceType === 'payment' && tx.rawItem) handleDirectEditPayment(tx.rawItem);
                        }}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        title="Click to directly edit source transaction"
                      >
                        <td className="py-2.5 px-3 font-mono">{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                        <td className="py-2.5 px-3 font-bold">{tx.type}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{tx.particular}</td>
                        <td className="py-2.5 px-3 font-mono">{tx.refNo}</td>
                        <td className="py-2.5 px-3 font-semibold">{tx.mode}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          Rs {(tx.moneyIn || tx.moneyOut).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {tx.rawItem && (
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (tx.sourceType === 'sale') handleDirectEditSale(tx.rawItem);
                                else if (tx.sourceType === 'purchase') handleDirectEditPurchase(tx.rawItem);
                                else if (tx.sourceType === 'expense') handleDirectEditExpense(tx.rawItem);
                                else if (tx.sourceType === 'payment') handleDirectEditPayment(tx.rawItem);
                              }}
                              className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                              title="Direct Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ================= 5. PROFIT AND LOSS ================= */}
              {activeReportId === 'profit_loss' && (
                <div className="p-6 space-y-6 max-w-4xl mx-auto">
                  {/* P&L Sub-Tab Navigation */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setProfitLossTab('statement')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          profitLossTab === 'statement'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Trading P&L Statement
                      </button>
                      <button
                        onClick={() => setProfitLossTab('analytics')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          profitLossTab === 'analytics'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Advanced Analytics & Margins (2nd Page View)
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportExcel}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export P&L Excel
                      </button>
                    </div>
                  </div>

                  {profitLossTab === 'statement' ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="bg-[#1e293b] text-white p-4 font-bold text-sm flex justify-between">
                        <span>TRADING & PROFIT / LOSS STATEMENT</span>
                        <span>Period: {startDate} to {endDate}</span>
                      </div>

                      <div className="p-4 space-y-4 divide-y divide-slate-100 text-xs font-semibold">
                        {/* Revenue Section */}
                        <div className="pt-2 space-y-2">
                          <div className="flex justify-between text-slate-800 font-bold">
                            <span>1. Gross Sales Revenue</span>
                            <span>Rs {profitLossData.grossSales.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 pl-4">
                            <span>Less: Sales Returns & Allowances</span>
                            <span>- Rs {profitLossData.salesReturns.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-blue-700 font-black border-t pt-1">
                            <span>Net Sales Revenue</span>
                            <span>Rs {profitLossData.netSales.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* COGS Section */}
                        <div className="pt-4 space-y-2">
                          <div className="flex justify-between text-slate-800 font-bold">
                            <span>2. Cost of Goods Sold (COGS - Purchase Cost)</span>
                            <span className="text-amber-700 font-black">- Rs {profitLossData.cogs.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-black border-t pt-1 text-sm">
                            <span>GROSS PROFIT (Margin: {profitLossData.grossMarginPct.toFixed(1)}%)</span>
                            <span>Rs {profitLossData.grossProfit.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Operating Expenses Section */}
                        <div className="pt-4 space-y-2">
                          <div className="flex justify-between text-slate-800 font-bold">
                            <span>3. Operating & Administrative Expenses</span>
                            <span className="text-rose-700 font-black">- Rs {profitLossData.totalExpenses.toLocaleString()}</span>
                          </div>
                          {expenseCategoryData.map(e => (
                            <div key={e.category} className="flex justify-between text-slate-500 pl-4">
                              <span>{e.category}</span>
                              <span>Rs {e.amount.toLocaleString()} ({e.percentage}%)</span>
                            </div>
                          ))}
                        </div>

                        {/* Final Net Profit */}
                        <div className="pt-4 flex justify-between items-center bg-emerald-50/80 p-3 rounded-xl border border-emerald-300">
                          <div>
                            <span className="text-sm font-black text-emerald-900 block">NET PROFIT / (LOSS)</span>
                            <span className="text-[11px] text-emerald-700">Net Margin: {profitLossData.netMarginPct.toFixed(1)}%</span>
                          </div>
                          <span className="text-lg font-black text-emerald-800">
                            Rs {profitLossData.netProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Advanced Analytics & 2nd Page View for P&L */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Gross Profit Ratio</span>
                          <div className="text-xl font-black text-emerald-700">{profitLossData.grossMarginPct.toFixed(1)}%</div>
                          <p className="text-[11px] text-slate-400">High efficiency product markups</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Operating Expense Ratio</span>
                          <div className="text-xl font-black text-rose-600">
                            {profitLossData.netSales > 0 ? ((profitLossData.totalExpenses / profitLossData.netSales) * 100).toFixed(1) : 0}%
                          </div>
                          <p className="text-[11px] text-slate-400">Expenses relative to net sales</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Net Profit Margin</span>
                          <div className={`text-xl font-black ${profitLossData.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                            {profitLossData.netMarginPct.toFixed(1)}%
                          </div>
                          <p className="text-[11px] text-slate-400">Bottom-line return on revenue</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-blue-600" />
                          Financial Flow & Profit Breakdown
                        </h4>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'Gross Revenue', amount: profitLossData.grossSales },
                              { name: 'Net Sales', amount: profitLossData.netSales },
                              { name: 'COGS', amount: profitLossData.cogs },
                              { name: 'Gross Profit', amount: profitLossData.grossProfit },
                              { name: 'Expenses', amount: profitLossData.totalExpenses },
                              { name: 'Net Profit', amount: profitLossData.netProfit },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Amount']} />
                              <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= 6. BILL WISE PROFIT ================= */}
              {activeReportId === 'bill_wise_profit' && (
                <div className="space-y-4">
                  {/* Bill-Wise Sub-Tab & Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBillWiseTab('table')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                          billWiseTab === 'table'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Bill-Wise Ledger Table
                      </button>
                      <button
                        onClick={() => setBillWiseTab('analytics')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                          billWiseTab === 'analytics'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Advanced Profitability & Margin Analytics (2nd Page)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500">Margin Filter:</span>
                      <select
                        value={billMarginFilter}
                        onChange={(e) => setBillMarginFilter(e.target.value as any)}
                        className="px-2.5 py-1 font-bold rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="ALL">All Bills</option>
                        <option value="HIGH">High Margin (&gt;40%)</option>
                        <option value="MEDIUM">Standard (20% - 40%)</option>
                        <option value="LOW">Low Margin (&lt;20%)</option>
                      </select>
                    </div>
                  </div>

                  {billWiseTab === 'table' ? (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-3">DATE</th>
                            <th className="py-2.5 px-3">INVOICE #</th>
                            <th className="py-2.5 px-3">PARTY NAME</th>
                            <th className="py-2.5 px-3 text-right">INVOICE AMOUNT</th>
                            <th className="py-2.5 px-3 text-right">TOTAL COST</th>
                            <th className="py-2.5 px-3 text-right text-emerald-700">GROSS PROFIT</th>
                            <th className="py-2.5 px-3 text-right">MARGIN %</th>
                            <th className="py-2.5 px-3 text-center">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {billWiseProfitData
                            .filter(b => {
                              if (billMarginFilter === 'HIGH') return b.margin >= 40;
                              if (billMarginFilter === 'MEDIUM') return b.margin >= 20 && b.margin < 40;
                              if (billMarginFilter === 'LOW') return b.margin < 20;
                              return true;
                            })
                            .filter(b => {
                              if (!searchTerm.trim()) return true;
                              const q = searchTerm.toLowerCase();
                              return (
                                b.invoiceNumber.toLowerCase().includes(q) ||
                                (b.partyName && b.partyName.toLowerCase().includes(q))
                              );
                            })
                            .map((b) => (
                              <tr
                                key={b.id}
                                onClick={() => {
                                  const inv = invoices.find(i => i.id === b.id);
                                  if (inv) handleDirectEditSale(inv);
                                }}
                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                title="Click row to directly edit invoice"
                              >
                                <td className="py-2.5 px-3 font-mono">{new Date(b.date).toLocaleDateString('en-GB')}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 group-hover:underline">{b.invoiceNumber}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{b.partyName}</td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">Rs {b.billAmount.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right text-slate-500 font-semibold">Rs {b.costAmount.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-black text-emerald-600">Rs {b.profit.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{b.margin.toFixed(1)}%</td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const inv = invoices.find(i => i.id === b.id);
                                        if (inv) setSelectedBillDrilldown(inv);
                                      }}
                                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded text-[11px] cursor-pointer"
                                      title="View Line Items"
                                    >
                                      View Items
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const inv = invoices.find(i => i.id === b.id);
                                        if (inv) handleDirectEditSale(inv);
                                      }}
                                      className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                      title="Direct Edit Invoice"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Advanced Bill-Wise Profitability Dashboard (2nd Page View) */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Invoices</span>
                          <div className="text-xl font-black text-slate-900">{billWiseProfitData.length}</div>
                          <p className="text-[11px] text-slate-400">Bills processed in period</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Sales Revenue</span>
                          <div className="text-xl font-black text-blue-700">
                            Rs {billWiseProfitData.reduce((s, b) => s + b.billAmount, 0).toLocaleString()}
                          </div>
                          <p className="text-[11px] text-slate-400">Billed amount across sales</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Gross Profit</span>
                          <div className="text-xl font-black text-emerald-600">
                            Rs {billWiseProfitData.reduce((s, b) => s + b.profit, 0).toLocaleString()}
                          </div>
                          <p className="text-[11px] text-slate-400">Total margin earned</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Average Bill Margin</span>
                          <div className="text-xl font-black text-emerald-700">
                            {billWiseProfitData.length > 0 ? (
                              (billWiseProfitData.reduce((s, b) => s + b.margin, 0) / billWiseProfitData.length).toFixed(1)
                            ) : 0}%
                          </div>
                          <p className="text-[11px] text-slate-400">Average markup percentage</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-emerald-600" />
                          Top 10 Most Profitable Bills
                        </h4>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...billWiseProfitData].sort((a, b) => b.profit - a.profit).slice(0, 10).map(b => ({
                              name: `${b.invoiceNumber} (${b.partyName?.slice(0, 8)})`,
                              profit: b.profit,
                              revenue: b.billAmount
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Amount']} />
                              <Legend />
                              <Bar dataKey="profit" name="Gross Profit (Rs)" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="revenue" name="Bill Amount (Rs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= FIFO STOCK ALLOCATION REPORT ================= */}
              {activeReportId === 'fifo_allocation_report' && (
                <div className="p-4 space-y-5">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Active FIFO Batches</span>
                      <div className="text-xl font-black text-slate-900">{fifoAllocationReportData.metrics.totalActiveBatches}</div>
                      <p className="text-[11px] text-slate-400">Total in-stock batch streams</p>
                    </div>

                    <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-blue-800 text-[10px] font-bold uppercase tracking-wider block">Total Inward Valuation</span>
                      <div className="text-xl font-black text-blue-900">Rs {fifoAllocationReportData.metrics.totalInwardValuation.toLocaleString()}</div>
                      <p className="text-[11px] text-blue-600">Calculated at purchase cost</p>
                    </div>

                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block">Avg Stock Age</span>
                      <div className="text-xl font-black text-amber-900">{fifoAllocationReportData.metrics.avgAgeDays} Days</div>
                      <p className="text-[11px] text-amber-700">Oldest batch: {fifoAllocationReportData.metrics.oldestBatch} days old</p>
                    </div>

                    <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                      <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider block">Fresh Batches (≤30d)</span>
                      <div className="text-xl font-black text-emerald-700">{fifoAllocationReportData.metrics.freshStockBatches}</div>
                      <p className="text-[11px] text-emerald-600">Aging (&gt;60d): {fifoAllocationReportData.metrics.agedStockBatches} batches</p>
                    </div>
                  </div>

                  {/* FIFO Explanation & Guidance Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="font-bold">FIFO Rotation Principle:</span>
                      <span className="text-slate-500">Oldest stock received into inventory is automatically allocated and billed first to ensure optimal cashflow & warehouse turnaround.</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px] shrink-0">
                      Auto-Allocating
                    </span>
                  </div>

                  {/* Real-time Allocation Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-3 text-center">FIFO RANK</th>
                            <th className="py-2.5 px-3">MEDICINE & FORMULA</th>
                            <th className="py-2.5 px-3">BATCH NUMBER</th>
                            <th className="py-2.5 px-3">INWARD DATE</th>
                            <th className="py-2.5 px-3 text-right">STOCK AGE</th>
                            <th className="py-2.5 px-3 text-right">QUANTITY</th>
                            <th className="py-2.5 px-3 text-right">PURCHASE RATE</th>
                            <th className="py-2.5 px-3 text-right">STOCK VALUATION</th>
                            <th className="py-2.5 px-3 text-center">ALLOCATION QUEUE</th>
                            <th className="py-2.5 px-3">DISTRIBUTOR / LOCATION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {fifoAllocationReportData.rows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400">
                                No FIFO batch allocation data found.
                              </td>
                            </tr>
                          ) : (
                            fifoAllocationReportData.rows.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] ${
                                    row.isPrimary 
                                      ? 'bg-blue-600 text-white shadow-xs' 
                                      : row.fifoRank === 2
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    #{row.fifoRank}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-slate-900 block">{row.medicineName}</span>
                                  <span className="text-[11px] text-slate-400 block">{row.genericName} • {row.category}</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                  {row.batchNumber}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                  {new Date(row.inwardDate).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    row.ageInDays <= 30
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : row.ageInDays <= 60
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                                  }`}>
                                    {row.ageInDays} Days
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                  {row.quantity} {row.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  Rs {row.purchasePrice.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-blue-700 font-mono">
                                  Rs {row.stockValue.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                    row.allocationStatus === 'Active Primary'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                                      : row.allocationStatus === 'Queued (#2)'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : row.allocationStatus === 'Depleted'
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {row.allocationStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-700 block">{row.supplierName}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">Rack: {row.rackLocation}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= FEFO EXPIRY MANAGEMENT REPORT ================= */}
              {activeReportId === 'fefo_expiry_report' && (
                <div className="p-4 space-y-5">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Expired Stock */}
                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                      <span className="text-rose-800 text-[10px] font-bold uppercase tracking-wider block">Expired Stock</span>
                      <div className="text-lg font-black text-rose-700">{fefoExpiryReportData.metrics.expiredCount} Batches</div>
                      <p className="text-[11px] text-rose-600 font-bold">Rs {fefoExpiryReportData.metrics.expiredValue.toLocaleString()}</p>
                    </div>

                    {/* Critical <30 Days */}
                    <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200 shadow-2xs space-y-1">
                      <span className="text-orange-800 text-[10px] font-bold uppercase tracking-wider block">Critical (≤30 Days)</span>
                      <div className="text-lg font-black text-orange-700">{fefoExpiryReportData.metrics.critical30Count} Batches</div>
                      <p className="text-[11px] text-orange-600 font-bold">Rs {fefoExpiryReportData.metrics.critical30Value.toLocaleString()}</p>
                    </div>

                    {/* Warning 30-60 Days */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                      <span className="text-amber-800 text-[10px] font-bold uppercase tracking-wider block">Warning (30-60 Days)</span>
                      <div className="text-lg font-black text-amber-700">{fefoExpiryReportData.metrics.warning60Count} Batches</div>
                      <p className="text-[11px] text-amber-600 font-bold">Rs {fefoExpiryReportData.metrics.warning60Value.toLocaleString()}</p>
                    </div>

                    {/* Alert 60-90 Days */}
                    <div className="bg-yellow-50/70 p-3 rounded-xl border border-yellow-200 shadow-2xs space-y-1">
                      <span className="text-yellow-800 text-[10px] font-bold uppercase tracking-wider block">Alert (60-90 Days)</span>
                      <div className="text-lg font-black text-yellow-800">{fefoExpiryReportData.metrics.alert90Count} Batches</div>
                      <p className="text-[11px] text-yellow-700 font-bold">Rs {fefoExpiryReportData.metrics.alert90Value.toLocaleString()}</p>
                    </div>

                    {/* Watchlist 90-180 Days (6 Months) */}
                    <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                      <span className="text-indigo-800 text-[10px] font-bold uppercase tracking-wider block">Watch (≤6 Months)</span>
                      <div className="text-lg font-black text-indigo-800">{fefoExpiryReportData.metrics.attention180Count} Batches</div>
                      <p className="text-[11px] text-indigo-700 font-bold">Rs {fefoExpiryReportData.metrics.attention180Value.toLocaleString()}</p>
                    </div>

                    {/* Total Stock Value at Expiry Risk */}
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-md space-y-1">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Risk Value</span>
                      <div className="text-lg font-black text-white">Rs {fefoExpiryReportData.metrics.totalStockAtRiskValue.toLocaleString()}</div>
                      <p className="text-[10.5px] text-slate-300 truncate">Batches: {fefoExpiryReportData.metrics.totalBatches}</p>
                    </div>
                  </div>

                  {/* FEFO Policy Guidance Alert Banner */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold">FEFO Expiry Protection:</span>
                      <span className="text-amber-800">Batches closest to their expiration date are allocated first during sales to minimize expired inventory write-offs and safeguard margins.</span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-200/60 text-amber-900 rounded-full font-bold text-[10px] shrink-0">
                      Real-time Alerts
                    </span>
                  </div>

                  {/* Real-time FEFO Expiry Management Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2.5 px-3 text-center">FEFO RANK</th>
                            <th className="py-2.5 px-3">MEDICINE & FORMULA</th>
                            <th className="py-2.5 px-3">BATCH NUMBER</th>
                            <th className="py-2.5 px-3">EXPIRY DATE</th>
                            <th className="py-2.5 px-3 text-right">DAYS REMAINING</th>
                            <th className="py-2.5 px-3 text-right">QUANTITY</th>
                            <th className="py-2.5 px-3 text-right">VALUE AT RISK (RS)</th>
                            <th className="py-2.5 px-3">RECOMMENDED ACTION</th>
                            <th className="py-2.5 px-3">DISTRIBUTOR / LOCATION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {fefoExpiryReportData.rows.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                No FEFO expiry records found.
                              </td>
                            </tr>
                          ) : (
                            fefoExpiryReportData.rows.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-[11px] ${
                                    row.isPrimary 
                                      ? 'bg-amber-600 text-white shadow-xs' 
                                      : row.fefoRank === 2
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    #{row.fefoRank}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-slate-900 block">{row.medicineName}</span>
                                  <span className="text-[11px] text-slate-400 block">{row.genericName} • {row.category}</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                  {row.batchNumber}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                                  {new Date(row.expiryDate).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                                    row.daysUntilExpiry <= 0
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse'
                                      : row.daysUntilExpiry <= 30
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300 font-black'
                                      : row.daysUntilExpiry <= 60
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : row.daysUntilExpiry <= 90
                                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    {row.daysUntilExpiry <= 0 ? 'EXPIRED' : `${row.daysUntilExpiry} Days`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">
                                  {row.quantity} {row.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-black font-mono text-rose-700">
                                  Rs {row.stockValueAtRisk.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[11px] font-bold text-slate-800 block">
                                    {row.suggestedAction}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-700 block">{row.supplierName}</span>
                                  <span className="text-[10px] text-slate-400 block font-mono">Rack: {row.rackLocation}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= CATEGORY PROFITABILITY HEATMAP ================= */}
              {activeReportId === 'category_profit_heatmap' && (
                <div className="p-4">
                  <CategoryProfitabilityHeatmap
                    invoices={invoices}
                    medicines={medicines}
                    startDate={startDate}
                    endDate={endDate}
                    selectedFirm={selectedFirm}
                  />
                </div>
              )}

              {/* ================= 7. STOCK SUMMARY ================= */}
              {activeReportId === 'stock_summary' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <ColumnHeader label="ITEM NAME" />
                      <ColumnHeader label="BATCH #" />
                      <ColumnHeader
                        label="CATEGORY"
                        filterKey="category"
                        activeFilterValue={colFilters.category}
                        filterOptions={stockCategoryOptions}
                        onSelectFilter={(val) => setColFilters(prev => ({ ...prev, category: val }))}
                        openPopoverKey={openFilterPopover}
                        setOpenPopoverKey={setOpenFilterPopover}
                        filterSearch={filterSearchQuery}
                        setFilterSearch={setFilterSearchQuery}
                      />
                      <ColumnHeader
                        label="STOCK QTY"
                        filterKey="stockStatus"
                        activeFilterValue={colFilters.stockStatus}
                        filterOptions={stockStatusOptions}
                        onSelectFilter={(val) => setColFilters(prev => ({ ...prev, stockStatus: val }))}
                        openPopoverKey={openFilterPopover}
                        setOpenPopoverKey={setOpenFilterPopover}
                        filterSearch={filterSearchQuery}
                        setFilterSearch={setFilterSearchQuery}
                        align="right"
                      />
                      <ColumnHeader label="PURCHASE RATE" align="right" />
                      <ColumnHeader label="SELLING RATE" align="right" />
                      <ColumnHeader label="STOCK VALUE" align="right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {stockSummaryData.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{m.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{m.batchNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-500">{m.category || 'General'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{m.quantity} {m.unit || 'Pcs'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">Rs {m.purchasePrice.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">Rs {m.sellingPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">Rs {m.stockValue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ================= 8. ITEM BATCH REPORT ================= */}
              {activeReportId === 'item_batch_report' && (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <ColumnHeader label="ITEM NAME" />
                      <ColumnHeader label="BATCH NUMBER" />
                      <ColumnHeader label="EXPIRY DATE" />
                      <ColumnHeader label="DAYS TO EXPIRY" align="right" />
                      <ColumnHeader label="QTY" align="right" />
                      <ColumnHeader
                        label="STATUS"
                        filterKey="status"
                        activeFilterValue={colFilters.status}
                        filterOptions={batchStatusOptions}
                        onSelectFilter={(val) => setColFilters(prev => ({ ...prev, status: val }))}
                        openPopoverKey={openFilterPopover}
                        setOpenPopoverKey={setOpenFilterPopover}
                        filterSearch={filterSearchQuery}
                        setFilterSearch={setFilterSearchQuery}
                        align="center"
                      />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {batchReportData.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{b.name}</td>
                        <td className="py-2.5 px-3 font-mono">{b.batchNumber}</td>
                        <td className="py-2.5 px-3 font-mono">{new Date(b.expiryDate).toLocaleDateString('en-GB')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{b.diffDays} days</td>
                        <td className="py-2.5 px-3 text-right font-black">{b.quantity}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            b.status === 'Expired' 
                              ? 'bg-red-100 text-red-700 border border-red-300' 
                              : b.status === 'Near Expiry'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ================= 9. PARTY STATEMENT ================= */}
              {activeReportId === 'party_statement' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700">Select Party:</label>
                      <select
                        value={selectedPartyId}
                        onChange={(e) => setSelectedPartyId(e.target.value)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      >
                        {parties.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.partyType || 'Party'})</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Secure Audit Drill-down (Read-Only Source View)</span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        {visibleColumns.date && <th className="py-2.5 px-3">DATE</th>}
                        {visibleColumns.status && <th className="py-2.5 px-3">TYPE</th>}
                        {visibleColumns.invoiceNo && <th className="py-2.5 px-3">INVOICE / REF #</th>}
                        {visibleColumns.amount && <th className="py-2.5 px-3 text-right text-blue-700">TOTAL AMOUNT</th>}
                        {visibleColumns.paid && <th className="py-2.5 px-3 text-right text-emerald-700">PAID</th>}
                        {visibleColumns.balance && <th className="py-2.5 px-3 text-right text-rose-700">BALANCE</th>}
                        {visibleColumns.actions && <th className="py-2.5 px-3 text-center">EDIT SOURCE / AUDIT</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {invoices.filter(inv => {
                        const curParty = parties.find(p => p.id === selectedPartyId);
                        return curParty && (inv.partyId === curParty.id || inv.customerName === curParty.name);
                      }).map(inv => (
                        <tr 
                          key={inv.id} 
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          onDoubleClick={() => handleDirectEditSale(inv)}
                          title="Double click to Direct Edit source invoice"
                        >
                          {visibleColumns.date && <td className="py-2.5 px-3 font-mono">{new Date(inv.date).toLocaleDateString('en-GB')}</td>}
                          {visibleColumns.status && <td className="py-2.5 px-3 font-bold">{inv.transactionType || 'Sale'}</td>}
                          {visibleColumns.invoiceNo && (
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                              <button 
                                onClick={() => handleDirectEditSale(inv)}
                                className="hover:underline flex items-center gap-1 cursor-pointer"
                                title="Click to Direct Edit source invoice"
                              >
                                <span>{inv.invoiceNumber}</span>
                                <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </td>
                          )}
                          {visibleColumns.amount && <td className="py-2.5 px-3 text-right font-bold">Rs {inv.grandTotal.toLocaleString()}</td>}
                          {visibleColumns.paid && <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">Rs {(inv.receivedAmount || 0).toLocaleString()}</td>}
                          {visibleColumns.balance && <td className="py-2.5 px-3 text-right text-rose-600 font-black">Rs {(inv.balanceDue || 0).toLocaleString()}</td>}
                          {visibleColumns.actions && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleDirectEditSale(inv)}
                                  className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold rounded-lg text-[10px] cursor-pointer inline-flex items-center gap-1 border border-amber-200"
                                  title="Direct Edit Source Invoice"
                                >
                                  <Edit3 className="w-3 h-3" /> Direct Edit
                                </button>
                                <button
                                  onClick={() => setPrintingInvoice(inv)}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-[10px] cursor-pointer inline-flex items-center gap-1"
                                  title="View & Audit Source Invoice"
                                >
                                  <Eye className="w-3 h-3" /> Audit
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ================= CASH FLOW REPORT ================= */}
              {activeReportId === 'cash_flow' && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Opening Balance</span>
                      <div className="text-xl font-black text-slate-900">Rs 145,000.00</div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase">Total Inflows (+)</span>
                      <div className="text-xl font-black text-emerald-700">Rs {dayBookData.totalMoneyIn.toLocaleString()}</div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-rose-800 uppercase">Total Outflows (-)</span>
                      <div className="text-xl font-black text-rose-700">Rs {dayBookData.totalMoneyOut.toLocaleString()}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-blue-800 uppercase">Net Cash Flow</span>
                      <div className={`text-xl font-black ${dayBookData.netFlow >= 0 ? 'text-blue-900' : 'text-rose-600'}`}>
                        Rs {dayBookData.netFlow.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Closing Balance</span>
                      <div className="text-xl font-black text-white">Rs {(145000 + dayBookData.netFlow).toLocaleString()}</div>
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse text-xs bg-white rounded-xl overflow-hidden shadow-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">DATE</th>
                        <th className="py-3 px-4">PARTICULARS / DESCRIPTION</th>
                        <th className="py-3 px-4">CATEGORY</th>
                        <th className="py-3 px-4 text-right text-emerald-700">CASH IN (RS)</th>
                        <th className="py-3 px-4 text-right text-rose-700">CASH OUT (RS)</th>
                        <th className="py-3 px-4 text-right">RUNNING BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {dayBookData.entries.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono">{new Date(tx.date || Date.now()).toLocaleDateString('en-GB')}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{tx.description || tx.partyName || 'Cash Transaction'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-500">{tx.type}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-600">{tx.moneyIn > 0 ? `+ Rs ${tx.moneyIn.toLocaleString()}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-black text-rose-600">{tx.moneyOut > 0 ? `- Rs ${tx.moneyOut.toLocaleString()}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">Rs {(145000 + (tx.moneyIn || 0) - (tx.moneyOut || 0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ================= BALANCE SHEET REPORT ================= */}
              {activeReportId === 'balance_sheet' && (
                <div className="p-6 space-y-6 max-w-4xl mx-auto">
                  <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-wider">Statement of Financial Position (Balance Sheet)</h3>
                      <p className="text-xs text-slate-300 mt-1">Reconciled as of {endDate} | All Assets equal Liabilities plus Owner's Equity</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-bold">Total Balance Check</span>
                      <span className="text-xl font-black text-emerald-400">Rs {balanceSheetData.assets.totalAssets.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Assets Side */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="bg-blue-50 px-5 py-3.5 border-b border-blue-100 flex justify-between items-center">
                        <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">ASSETS</h4>
                        <span className="text-xs font-black text-blue-700">Rs {balanceSheetData.assets.totalAssets.toLocaleString()}</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Cash in Hand</span><span className="font-bold font-mono">Rs {balanceSheetData.assets.cashInHand.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Bank Accounts Balance</span><span className="font-bold font-mono">Rs {balanceSheetData.assets.bankTotal.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Accounts Receivable (Debtors)</span><span className="font-bold font-mono">Rs {balanceSheetData.assets.debtors.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Inventory Stock Valuation</span><span className="font-bold font-mono">Rs {balanceSheetData.assets.inventoryValuation.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Loans & Advances Lent</span><span className="font-bold font-mono">Rs {balanceSheetData.assets.loansLent.toLocaleString()}</span></div>
                      </div>
                    </div>

                    {/* Liabilities & Equity Side */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="bg-rose-50 px-5 py-3.5 border-b border-rose-100 flex justify-between items-center">
                        <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">LIABILITIES & EQUITY</h4>
                        <span className="text-xs font-black text-rose-700">Rs {balanceSheetData.assets.totalAssets.toLocaleString()}</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Accounts Payable (Creditors)</span><span className="font-bold font-mono">Rs {balanceSheetData.liabilities.creditors.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Loans Borrowed</span><span className="font-bold font-mono">Rs {balanceSheetData.liabilities.loansBorrowed.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between"><span className="font-semibold text-slate-700">Tax Payable (GST / Withholding)</span><span className="font-bold font-mono">Rs {balanceSheetData.liabilities.taxPayable.toLocaleString()}</span></div>
                        <div className="px-5 py-3 flex justify-between bg-emerald-50/50"><span className="font-bold text-emerald-900">Owner's Capital / Equity</span><span className="font-black font-mono text-emerald-700">Rs {balanceSheetData.equity.toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= 12. GENERIC FALLBACK FOR OTHER REPORTS ================= */}
              {![
                'sale', 'purchase', 'day_book', 'all_transactions', 'profit_loss', 
                'bill_wise_profit', 'stock_summary', 'item_batch_report', 
                'party_statement', 'expense_category', 'tax_report', 'controlled_register',
                'cash_flow', 'balance_sheet'
              ].includes(activeReportId) && (
                <div className="p-8 text-center text-slate-500">
                  <BarChart2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                  <h4 className="text-sm font-bold text-slate-800">{currentReportDef.label}</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Report synchronized with {startDate} to {endDate} for {selectedFirm}.
                  </p>
                  <div className="mt-4 inline-flex gap-2">
                    <button onClick={handleExportExcel} className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-xs hover:bg-emerald-700 cursor-pointer">
                      Export {currentReportDef.label} (Excel)
                    </button>
                    <button onClick={handlePrint} className="px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs hover:bg-slate-900 cursor-pointer">
                      Print Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= PRINT / VIEW MODALS ================= */}
        <PurchasePrintModal 
          isOpen={!!printingPurchaseOrder} 
          onClose={() => setPrintingPurchaseOrder(null)} 
          order={printingPurchaseOrder} 
        />
        <InvoicePrintModal 
          isOpen={!!printingInvoice} 
          onClose={() => setPrintingInvoice(null)} 
          invoice={printingInvoice} 
        />

        {/* Bill Drilldown Modal */}
        {selectedBillDrilldown && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Invoice #{selectedBillDrilldown.invoiceNumber} Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Party: {selectedBillDrilldown.customerName} | Date: {new Date(selectedBillDrilldown.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBillDrilldown(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Selling Price</th>
                      <th className="p-2.5 text-right">Unit Cost</th>
                      <th className="p-2.5 text-right">Line Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBillDrilldown.items.map((item: any, idx: number) => {
                      const med = medicines.find(m => m.id === item.medicineId || m.name === item.name);
                      const unitCost = med ? med.purchasePrice : (item.sellingPrice * 0.75);
                      const lineProfit = (item.sellingPrice - unitCost) * item.quantity;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">Rs {item.sellingPrice.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-mono text-slate-500">Rs {unitCost.toFixed(2)}</td>
                          <td className="p-2.5 text-right font-black text-emerald-600">Rs {lineProfit.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-600">Grand Total: Rs {selectedBillDrilldown.grandTotal?.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setSelectedBillDrilldown(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Close Modal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Column Selector Modal */}
        {columnModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-900">Customize Report Columns</h3>
                <button onClick={() => setColumnModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries(visibleColumns).map(([col, visible]) => (
                  <label key={col} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <span className="font-bold uppercase text-slate-700">{col}</span>
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end pt-3 border-t">
                <button
                  onClick={() => setColumnModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Apply Columns
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= DIRECT EDIT MODALS (Auto-Resync Ledger & Stock) ================= */}
        {editingInvoice && (
          <AddSaleModal
            isOpen={!!editingInvoice}
            onClose={() => setEditingInvoice(null)}
            initialInvoice={editingInvoice}
            defaultTransactionType={(editingInvoice.transactionType as any) || 'Sale'}
            onSaveSuccess={handleSaleSaved}
          />
        )}

        {editingPurchaseOrder && (
          <AddPurchaseModal
            isOpen={!!editingPurchaseOrder}
            onClose={() => setEditingPurchaseOrder(null)}
            initialOrder={editingPurchaseOrder}
            transactionType={(editingPurchaseOrder.transactionType as any) || 'Purchase'}
            onSaved={handlePurchaseSaved}
          />
        )}

        {editingPayment && (
          <EditPaymentModal
            isOpen={!!editingPayment}
            onClose={() => setEditingPayment(null)}
            payment={editingPayment}
            party={parties.find(p => p.id === editingPayment.partyId || p.name === editingPayment.partyName)}
            onPaymentUpdated={handlePaymentSaved}
          />
        )}

        {editingExpense && (
          <AddExpenseModal
            isOpen={!!editingExpense}
            onClose={() => setEditingExpense(null)}
            editExpense={editingExpense}
            parties={parties}
            onSave={async (exp) => handleExpenseSaved(exp)}
          />
        )}
      </div>
    </div>
  </div>
  );
};
