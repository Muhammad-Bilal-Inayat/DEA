import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, X, FileText, ShoppingCart, Wallet, Users, 
  Package, Coins, Folder, AlertCircle, Layers, Sliders, 
  Lock, QrCode, Printer, Sparkles, ShieldCheck, 
  Database, Headphones, Command, Clock, PlusCircle, 
  RotateCcw, Zap, ChevronRight, Activity, Percent, 
  ArrowDownLeft, ArrowUpRight, BarChart3, BookOpen, Shield,
  Server, HardDrive, Globe, Smartphone, Key, TrendingUp,
  CreditCard
} from 'lucide-react';
import { 
  dbInvoices, dbPurchaseOrders, dbExpenses, 
  dbSuppliers, dbMedicines, dbPartyPayments 
} from '../../lib/db';
import { Invoice, PurchaseOrder, Expense, Supplier, Medicine, PartyPayment } from '../../types';

export interface SoftwareFunctionItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Function' | 'Setting' | 'Action' | 'Modal' | 'Report' | 'Tool';
  scope?: 'user' | 'server' | 'all';
  keywords: string[];
  icon: any;
  iconBg: string;
  iconColor: string;
  shortcut?: string;
  badge?: string;
  action: () => void;
}

export interface SearchResultItem {
  id: string;
  type: 'function' | 'item' | 'category' | 'amount' | 'sale' | 'purchase' | 'expense' | 'party';
  typeLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  amount?: number;
  date?: string;
  route?: string;
  matchReason?: string;
  shortcut?: string;
  icon?: any;
  iconBg?: string;
  iconColor?: string;
  onExecute?: () => void;
}

export const TransactionSearch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isServerRoute = location.pathname.startsWith('/server');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'functions' | 'item' | 'category' | 'amount' | 'sale' | 'purchase' | 'expense' | 'party'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cached data sets
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [parties, setParties] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Load database records safely on focus or open
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [invList, purList, expList, partyList, medList] = await Promise.all([
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbMedicines.getAll().catch(() => []),
      ]);
      setInvoices(invList || []);
      setPurchases(purList || []);
      setExpenses(expList || []);
      setParties(partyList || []);
      setMedicines(medList || []);
    } catch (err) {
      console.error('Failed to load search data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Global shortcut Ctrl+K or '/'
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e || !e.key) return;
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsOpen(true);
        loadData();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure selected item stays in view
  useEffect(() => {
    if (isOpen && resultsContainerRef.current) {
      const selectedEl = resultsContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  // Master index of all software functions, tools, settings, actions, and modals
  const softwareFunctions = useMemo<SoftwareFunctionItem[]>(() => {
    return [
      // 1. Shift Management & Closing
      {
        id: 'fn-shift-close',
        title: 'Cashier Shift Close & Drawer Reconciliation...',
        subtitle: 'Reconcile cash drawer, record safe drops, verify discrepancies & print shift closing slip',
        category: 'Modal',
        keywords: ['shift close', 'shift band', 'cashier shift', 'shift reconciliation', 'drawer close', 'cash count', 'hisaab', 'shif close', 'shift', 'closing', 'safe drop', 'cash drop', 'shift register', 'pos shift'],
        icon: Clock,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        badge: 'Shift Modal',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-cashier-shift'));
        }
      },
      {
        id: 'fn-shift-cash-in-out',
        title: 'Shift Cash In / Cash Out / Safe Drop...',
        subtitle: 'Add cash float to drawer, deposit cash into safe vault or record mid-shift expenses',
        category: 'Action',
        keywords: ['cash in', 'cash out', 'safe drop', 'vault deposit', 'shift expense', 'cash movement', 'drawer float'],
        icon: Coins,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-cashier-shift'));
        }
      },

      // 2. Security, Passcode & Lock
      {
        id: 'fn-passcode',
        title: 'Passcode & App Lock Security...',
        subtitle: 'Configure master application passcode, PIN protection & screen auto-lock',
        category: 'Setting',
        keywords: ['pass code', 'passcode', 'password', 'pin', 'app lock', 'security lock', 'lock screen', 'protect', 'code'],
        icon: Lock,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-700',
        badge: 'Security',
        action: () => {
          navigate('/settings?tab=GENERAL');
        }
      },
      {
        id: 'fn-safety-lock',
        title: 'Safety & Financial Period Lock (Anti-Backdating)...',
        subtitle: 'Lock past transaction dates, freeze accounting books & prevent backdated edits',
        category: 'Setting',
        keywords: ['safety lock', 'period lock', 'backdating', 'freeze book', 'date lock', 'lock period', 'audit lock'],
        icon: ShieldCheck,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-700',
        action: () => {
          navigate('/settings?tab=SAFETY & LOCK');
        }
      },
      {
        id: 'fn-roles-rbac',
        title: 'User Roles & RBAC Permissions...',
        subtitle: 'Set granular permissions for Cashiers, Salesmen, Managers, and Store Admins',
        category: 'Setting',
        keywords: ['role', 'roles', 'rbac', 'permissions', 'user rights', 'cashier mode', 'manager access', 'admin access'],
        icon: Shield,
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-700',
        action: () => {
          navigate('/settings?tab=ROLES & RBAC');
        }
      },

      // 3. Hardware, QR & Scanner
      {
        id: 'fn-qr-scanner',
        title: 'QR & Barcode Scanner Settings...',
        subtitle: 'Configure camera barcode scanning, USB HID barcode guns & 2D QR readers',
        category: 'Setting',
        keywords: ['qr', 'qr scanner', 'barcode', 'barcode scanner', 'camera scan', 'scan', 'scanner', 'code scan', '2d qr'],
        icon: QrCode,
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-700',
        badge: 'Hardware',
        action: () => {
          navigate('/settings?tab=GENERAL');
        }
      },
      {
        id: 'fn-thermal-printer',
        title: 'Thermal Printer & Invoice Styles...',
        subtitle: 'Customize 80mm / 58mm POS thermal slips, A4 / A5 bills, Urdu headers & QR codes',
        category: 'Setting',
        keywords: ['printer', 'thermal printer', 'print setup', 'invoice style', '80mm', '58mm', 'slip print', 'bill format', 'urdu print'],
        icon: Printer,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        action: () => {
          navigate('/settings?tab=PRINT');
        }
      },

      // 4. Invoice Billing & Transaction Settings
      {
        id: 'fn-invoice-billing-settings',
        title: 'Invoice & Billing Configuration...',
        subtitle: 'Configure tax rules, discounts, round-off, custom invoice prefixes & payment terms',
        category: 'Setting',
        keywords: ['invoice billing', 'billing settings', 'invoice settings', 'tax setup', 'discount rules', 'round off', 'billing', 'villing', 'bill configuration'],
        icon: Layers,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        badge: 'Settings',
        action: () => {
          navigate('/settings?tab=TRANSACTION');
        }
      },
      {
        id: 'fn-feature-flags',
        title: 'Feature Flags Manager (All 19 Toggles)...',
        subtitle: 'Enable or disable Advanced Batch Tracking, AI Search, Multi-Unit POS, Period Lock & more',
        category: 'Setting',
        keywords: ['feature flags', 'flags', 'features', '19 flags', 'toggle feature', 'turn on feature', 'turn off feature', 'modules'],
        icon: Sparkles,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-700',
        badge: '19 Flags',
        action: () => {
          navigate('/settings?tab=FEATURE FLAGS');
        }
      },
      {
        id: 'fn-taxes-fbr',
        title: 'Taxes & GST / FBR Invoicing Setup...',
        subtitle: 'Configure Sales Tax rates, FBR digital POS integration, NTN/STRN details',
        category: 'Setting',
        keywords: ['tax', 'taxes', 'gst', 'fbr', 'sales tax', 'vat', 'ntn', 'tax rate', 'withholding'],
        icon: Percent,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        action: () => {
          navigate('/settings?tab=TAXES');
        }
      },
      {
        id: 'fn-pricing-margin',
        title: 'Pricing, Markup & Margin Rules...',
        subtitle: 'Setup automatic retail / wholesale markups, minimum sale prices & batch pricing',
        category: 'Setting',
        keywords: ['pricing', 'margin', 'markup', 'wholesale price', 'retail price', 'profit margin', 'mrp markup'],
        icon: Percent,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        action: () => {
          navigate('/settings?tab=PRICING & MARGIN');
        }
      },

      // 5. Common Actions (Sales, Purchases, Inventory, Parties, Expenses)
      {
        id: 'fn-add-sale',
        title: 'Add Sale Invoice / Fast POS Billing...',
        subtitle: 'Create a new customer sale invoice, barcode billing or credit receipt',
        category: 'Action',
        keywords: ['add sale', 'new sale', 'sale invoice', 'pos billing', 'create bill', 'parchi', 'sale', 'fast billing'],
        icon: PlusCircle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-700',
        shortcut: 'Alt + S',
        badge: 'POS Sale',
        action: () => {
          navigate('/sale/invoices?action=add');
        }
      },
      {
        id: 'fn-add-purchase',
        title: 'Add Purchase Bill / Inward Stock...',
        subtitle: 'Record supplier stock invoice, batch numbers, expiry dates & purchase rates',
        category: 'Action',
        keywords: ['add purchase', 'new purchase', 'purchase bill', 'inward bill', 'supplier bill', 'mal khareed'],
        icon: ShoppingCart,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        shortcut: 'Alt + P',
        badge: 'Purchase',
        action: () => {
          navigate('/purchase?action=add');
        }
      },
      {
        id: 'fn-add-expense',
        title: 'Add Expense / Petty Cash Payout...',
        subtitle: 'Record store electricity bills, staff tea, rent, maintenance or courier costs',
        category: 'Action',
        keywords: ['add expense', 'expense', 'petty cash', 'kharcha', 'bill payout', 'tea expense', 'rent'],
        icon: Wallet,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-700',
        shortcut: 'Alt + E',
        action: () => {
          navigate('/expenses?action=add');
        }
      },
      {
        id: 'fn-add-product',
        title: 'Add New Medicine / Inventory Item...',
        subtitle: 'Create new product with batch, expiry date, barcode, salt formula & rack location',
        category: 'Action',
        keywords: ['add item', 'add medicine', 'add product', 'new item', 'dawa add', 'stock add', 'item master'],
        icon: Package,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        action: () => {
          navigate('/inventory?action=add');
        }
      },
      {
        id: 'fn-add-party',
        title: 'Add New Customer or Supplier / Party...',
        subtitle: 'Register customer, doctor, distributor or vendor with opening balance & credit limit',
        category: 'Action',
        keywords: ['add customer', 'add supplier', 'add party', 'new customer', 'new distributor', 'khata party'],
        icon: Users,
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-700',
        action: () => {
          navigate('/parties?action=add');
        }
      },
      {
        id: 'fn-sale-return',
        title: 'Sale Return / Credit Note...',
        subtitle: 'Process customer medicine return, batch refund or exchange credit note',
        category: 'Action',
        keywords: ['sale return', 'credit note', 'return item', 'customer refund', 'dawa wapsi'],
        icon: ArrowDownLeft,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-700',
        shortcut: 'Alt + R',
        action: () => {
          navigate('/sale/return?action=add');
        }
      },
      {
        id: 'fn-purchase-return',
        title: 'Purchase Return / Debit Note...',
        subtitle: 'Return damaged or expired stock to pharmaceutical distributor / supplier',
        category: 'Action',
        keywords: ['purchase return', 'debit note', 'supplier return', 'vendor return', 'expiry return'],
        icon: ArrowUpRight,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        action: () => {
          navigate('/purchase/returns?action=add');
        }
      },
      {
        id: 'fn-quotation',
        title: 'Quotation / Estimate Creation...',
        subtitle: 'Generate professional price estimate for hospital, clinic or customer',
        category: 'Action',
        keywords: ['quotation', 'estimate', 'price quote', 'rate estimate', 'proposal'],
        icon: FileText,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-700',
        action: () => {
          navigate('/sale/quotations?action=add');
        }
      },
      {
        id: 'fn-payment-in',
        title: 'Payment In / Customer Cash Receipt...',
        subtitle: 'Receive customer ledger payments, balance recovery & bank transfers',
        category: 'Action',
        keywords: ['payment in', 'receive cash', 'customer payment', 'khata recovery', 'balance payment'],
        icon: Coins,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        shortcut: 'Alt + I',
        action: () => {
          navigate('/sale/payment-in?action=add');
        }
      },
      {
        id: 'fn-payment-out',
        title: 'Payment Out / Supplier Payment Voucher...',
        subtitle: 'Pay distributor dues, issue cheque or record bank online transfer',
        category: 'Action',
        keywords: ['payment out', 'supplier payment', 'vendor payout', 'cheque payment', 'distributor payment'],
        icon: Coins,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        action: () => {
          navigate('/purchase/payment-out?action=add');
        }
      },

      // 6. Tools, Radars & Modals
      {
        id: 'fn-data-import-wizard',
        title: 'Universal Data Import Wizard (Excel / CSV)...',
        subtitle: 'Bulk import medicines, suppliers, opening balances & invoices from Excel files',
        category: 'Tool',
        keywords: ['data import', 'excel import', 'csv import', 'import wizard', 'bulk import', 'excel upload', 'sheet import'],
        icon: Package,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        badge: 'Excel Tool',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-import-wizard'));
        }
      },
      {
        id: 'fn-exception-center',
        title: 'Operational Exception Center (Radar)...',
        subtitle: 'Monitor stock shortages, zero-margin sales, abnormal discounts & duplicate bills',
        category: 'Tool',
        keywords: ['exception center', 'radar', 'audit exceptions', 'anomalies', 'risk radar', 'system warnings'],
        icon: AlertCircle,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        badge: 'Radar',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-exception-center'));
        }
      },
      {
        id: 'fn-company-profile',
        title: 'Company Profile & Business Details...',
        subtitle: 'Set pharmacy name, logo, phone numbers, NTN/Drug License & header addresses',
        category: 'Modal',
        keywords: ['company profile', 'business info', 'pharmacy name', 'drug license', 'logo', 'header info', 'shop name'],
        icon: Sliders,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-700',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-company-profile'));
        }
      },
      {
        id: 'fn-backup-sync',
        title: 'Database Backup & Offline Sync Manager...',
        subtitle: 'Export complete JSON/encrypted database backup, restore data & cloud sync',
        category: 'Tool',
        keywords: ['backup', 'database backup', 'restore', 'sync', 'offline sync', 'export data', 'save data'],
        icon: Database,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        action: () => {
          navigate('/sync-share');
        }
      },
      {
        id: 'fn-firebase-cloud',
        title: 'Firebase Cloud Multi-Device Sync...',
        subtitle: 'Sync sales, inventory & khata real-time across multiple counters and mobile devices',
        category: 'Modal',
        keywords: ['firebase', 'cloud sync', 'multi device', 'cloud login', 'online sync', 'multi counter'],
        icon: Sparkles,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-firebase-auth'));
        }
      },
      {
        id: 'fn-shortcuts-modal',
        title: 'Keyboard Shortcuts Guide (Cheatsheet)...',
        subtitle: 'View quick keys for POS billing, adding bills, switching tabs & fast drawer actions',
        category: 'Modal',
        keywords: ['shortcuts', 'keyboard shortcuts', 'cheatsheet', 'keys', 'hotkeys', 'fast keys'],
        icon: Command,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-700',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
        }
      },
      {
        id: 'fn-help-support',
        title: 'Help Desk & Support Hotline (0336-4585863)...',
        subtitle: 'Instant technical support, training tutorials, user guides & direct WhatsApp help',
        category: 'Modal',
        keywords: ['help', 'support', 'hotline', 'contact', 'whatsapp', 'phone support', 'customer care'],
        icon: Headphones,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        action: () => {
          window.dispatchEvent(new CustomEvent('open-help-modal'));
        }
      },

      // 7. Key Financial Reports & Radars
      {
        id: 'fn-daybook-report',
        title: 'Daybook / Daily Cash Register Report...',
        subtitle: 'Consolidated summary of today’s cash sales, recoveries, expenses & net balance',
        category: 'Report',
        keywords: ['daybook', 'day book', 'daily report', 'today sales', 'daily cash', 'aaj ka hisaab', 'daily register'],
        icon: BookOpen,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-700',
        badge: 'Report',
        action: () => {
          navigate('/reports?report=day_book');
        }
      },
      {
        id: 'fn-profit-loss',
        title: 'Profit & Loss Statement (P&L)...',
        subtitle: 'Net income, gross profit margin, COGS, operating expenses & net profit analysis',
        category: 'Report',
        keywords: ['profit and loss', 'p&l', 'profit', 'munafa', 'loss', 'income statement', 'gross profit'],
        icon: BarChart3,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        badge: 'Financial',
        action: () => {
          navigate('/reports?report=profit_loss');
        }
      },
      {
        id: 'fn-balance-sheet',
        title: 'Balance Sheet & Financial Position...',
        subtitle: 'Assets, current liabilities, inventory valuation, receivables & equity summary',
        category: 'Report',
        keywords: ['balance sheet', 'assets', 'liabilities', 'financial position', 'khata status'],
        icon: Layers,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-700',
        action: () => {
          navigate('/reports?report=balance_sheet');
        }
      },
      {
        id: 'fn-expiry-radar',
        title: 'Near Expiry & Batch Expiration Radar...',
        subtitle: 'Inspect products expiring within 30, 60, or 90 days for distributor returns',
        category: 'Report',
        keywords: ['expiry', 'near expiry', 'expired dawa', 'batch expiry', 'expiration radar', 'expiry alert'],
        icon: AlertCircle,
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-700',
        badge: 'Expiry Alert',
        action: () => {
          navigate('/inventory?view=expiry');
        }
      },
      {
        id: 'fn-low-stock',
        title: 'Low Stock & Safety Reorder List...',
        subtitle: 'Medicines below safety reorder threshold ready for purchase order generation',
        category: 'Report',
        keywords: ['low stock', 'out of stock', 'reorder list', 'shortage', 'stock alert', 'kam stock'],
        icon: Package,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        badge: 'Reorder',
        action: () => {
          navigate('/inventory?view=low_stock');
        }
      },
      {
        id: 'fn-audit-log',
        title: 'Audit Trail & Activity Security Log...',
        subtitle: 'Chronological timeline of invoice edits, deleted items, price overrides & logins',
        category: 'Report',
        keywords: ['audit log', 'audit trail', 'activity log', 'history', 'user actions', 'who changed what'],
        icon: Activity,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-700',
        action: () => {
          navigate('/audit-log');
        }
      },

      // =========================================================================
      // SERVER-SPECIFIC FUNCTIONS & TOOLS (Accessible when on /server or searched on server)
      // =========================================================================
      {
        id: 'fn-server-clients',
        title: 'Central Server: Client Fleet & Store Branches...',
        subtitle: 'Manage multi-branch tenants, trial countdowns, expiry dates & licenses',
        category: 'Function',
        scope: 'server',
        keywords: ['server', 'clients', 'fleet', 'tenants', 'branches', 'stores', 'trial', 'license', 'client list', 'store list', 'central server'],
        icon: Server,
        iconBg: 'bg-blue-900/40',
        iconColor: 'text-blue-400',
        badge: 'Server Fleet',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-storage',
        title: 'Central Server: Storage Quota & 80% Capacity Monitor...',
        subtitle: 'Track MB disk usage per client, set custom limits & purge cache warnings',
        category: 'Tool',
        scope: 'server',
        keywords: ['storage', 'quota', 'capacity', 'disk', 'mb', '80%', 'storage limit', 'storage monitor', 'server storage', 'tenant quota'],
        icon: HardDrive,
        iconBg: 'bg-cyan-900/40',
        iconColor: 'text-cyan-400',
        badge: 'Storage Quota',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-sync-health',
        title: 'Central Server: 30-Day Sync Health & SLA Uptime Charts...',
        subtitle: 'D3/Recharts telemetry of daily sync frequency, latency & failure rates',
        category: 'Report',
        scope: 'server',
        keywords: ['sync health', 'sync chart', '30 days', 'sla', 'uptime', 'failed sync', 'sync frequency', 'telemetry', 'recharts'],
        icon: TrendingUp,
        iconBg: 'bg-emerald-900/40',
        iconColor: 'text-emerald-400',
        badge: 'SLA Telemetry',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-activity-feed',
        title: 'Central Server: Real-Time Activity Feed & Client IP Tracker...',
        subtitle: 'Live stream of user actions, timestamps, and IP addresses with multi-select filters',
        category: 'Report',
        scope: 'server',
        keywords: ['activity feed', 'ip address', 'client ip', 'last sync', 'live activity', 'user activity', 'activity stream', 'audit feed'],
        icon: Globe,
        iconBg: 'bg-amber-900/40',
        iconColor: 'text-amber-400',
        badge: 'IP Tracker',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-sync-stream',
        title: 'Central Server: Multi-User Sync Stream & Terminal Replication...',
        subtitle: 'Live data replication stream across all POS cashiers and branch terminals',
        category: 'Function',
        scope: 'server',
        keywords: ['sync stream', 'multi user sync', 'replication', 'pos sync', 'live stream', 'individual sync', 'all sync'],
        icon: Activity,
        iconBg: 'bg-indigo-900/40',
        iconColor: 'text-indigo-400',
        badge: 'Sync Engine',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-master-control',
        title: 'Central Server: Master Control (173 Feature Switchboard)...',
        subtitle: 'Centrally activate or disable POS features, hardware modules & UI themes',
        category: 'Setting',
        scope: 'server',
        keywords: ['master control', '173 features', 'feature switch', 'toggle features', 'module control', 'admin toggles'],
        icon: Sliders,
        iconBg: 'bg-purple-900/40',
        iconColor: 'text-purple-400',
        badge: '173 Controls',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-passcodes',
        title: 'Central Server: Active Users & Master Passcodes...',
        subtitle: 'Live online users, instant passcode reset & per-user permission matrices',
        category: 'Setting',
        scope: 'server',
        keywords: ['server users', 'user passcodes', 'reset pin', 'active operators', 'cashier passcodes', 'rbac server'],
        icon: Key,
        iconBg: 'bg-blue-900/40',
        iconColor: 'text-blue-400',
        badge: 'Passcodes',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-2fa',
        title: 'Central Server: Google Authenticator 2FA Security...',
        subtitle: 'Configure TOTP two-factor authentication & emergency recovery backup codes',
        category: 'Setting',
        scope: 'server',
        keywords: ['2fa', 'authenticator', 'google authenticator', 'totp', 'two factor', 'emergency codes', 'server security'],
        icon: Smartphone,
        iconBg: 'bg-purple-900/40',
        iconColor: 'text-purple-400',
        badge: '2FA Security',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-seo',
        title: 'Master SEO Strategy & Schema.org Structured Data Console...',
        subtitle: 'Configure social meta tags, JSON-LD schemas, pharmacy knowledge graphs',
        category: 'Tool',
        scope: 'server',
        keywords: ['seo', 'seo console', 'schema.org', 'json-ld', 'meta tags', 'google search', 'open graph'],
        icon: Globe,
        iconBg: 'bg-indigo-900/40',
        iconColor: 'text-indigo-400',
        badge: 'SEO Console',
        action: () => {
          navigate('/seo');
        }
      },
      {
        id: 'fn-server-pricing',
        title: 'Central Server: Plans & Subscription Pricing Editor...',
        subtitle: 'Configure SaaS tiers, recurring rates in PKR (Monthly, 1, 3, 5 Years), discounts & feature quotas',
        category: 'Setting',
        scope: 'server',
        keywords: ['plans', 'pricing', 'saas pricing', 'pkr', 'subscription', 'packages', 'rates', 'discount', 'edit pricing', 'server pricing', 'billing tiers'],
        icon: CreditCard,
        iconBg: 'bg-indigo-900/40',
        iconColor: 'text-indigo-400',
        badge: 'Pricing Engine',
        action: () => {
          navigate('/server');
        }
      },
      {
        id: 'fn-server-docs',
        title: 'Central Server: Documentation & Operational Manual...',
        subtitle: 'Exhaustive technical blueprints, parameter specifications and guides for every server module',
        category: 'Report',
        scope: 'server',
        keywords: ['documentation', 'manual', 'server docs', 'blueprints', 'guide', 'specs', 'server manual', 'knowledge base'],
        icon: BookOpen,
        iconBg: 'bg-emerald-900/40',
        iconColor: 'text-emerald-400',
        badge: 'Full Manual',
        action: () => {
          navigate('/server');
        }
      }
    ];
  }, [navigate]);

  // Comprehensive multi-entity + functions search results
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const rawQ = query.trim();
    const q = rawQ.toLowerCase();
    
    // Check if query is numeric (for Amount search)
    const cleanNumStr = rawQ.replace(/[^0-9.]/g, '');
    const searchNum = cleanNumStr && !isNaN(Number(cleanNumStr)) ? Number(cleanNumStr) : null;
    const isNumericQuery = searchNum !== null && cleanNumStr.length > 0;

    const results: SearchResultItem[] = [];

    // -------------------------------------------------------------
    // 0. SOFTWARE FUNCTIONS & ACTIONS (Matching search terms or filter)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'functions') {
      softwareFunctions.forEach(fn => {
        // Context-aware scope filter: If on /server, search all functions. If on /user, only show user-side functions.
        const isAllowedScope = isServerRoute ? true : (fn.scope !== 'server');
        if (!isAllowedScope) return;

        const titleMatch = fn.title.toLowerCase().includes(q);
        const subtitleMatch = fn.subtitle.toLowerCase().includes(q);
        const keywordMatch = fn.keywords.some(k => k.includes(q) || q.includes(k));
        
        // If filter is explicitly 'functions' or search query matches
        if ((!q && filterType === 'functions') || (q && (titleMatch || subtitleMatch || keywordMatch))) {
          results.push({
            id: fn.id,
            type: 'function',
            typeLabel: `··· ${fn.category.toUpperCase()}`,
            title: fn.title,
            subtitle: fn.subtitle,
            badge: fn.badge || `··· ${fn.category}`,
            shortcut: fn.shortcut,
            icon: fn.icon,
            iconBg: fn.iconBg,
            iconColor: fn.iconColor,
            matchReason: !titleMatch && keywordMatch ? `Matched Feature` : undefined,
            onExecute: fn.action
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 1. ITEMS / PRODUCTS (Name, Barcode, Batch, Salt/Formula, Cat)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'item') {
      medicines.forEach(med => {
        const name = (med.name || '').toLowerCase();
        const barcode = (med.barcode || '').toLowerCase();
        const batch = (med.batchNumber || '').toLowerCase();
        const cat = (med.category || '').toLowerCase();
        const generic = (med.genericName || '').toLowerCase();
        const mfg = (med.manufacturer || '').toLowerCase();
        const rack = (med.rackLocation || '').toLowerCase();

        const matchItem = !q || 
          name.includes(q) || 
          barcode.includes(q) || 
          batch.includes(q) || 
          cat.includes(q) || 
          generic.includes(q) || 
          mfg.includes(q) || 
          rack.includes(q);

        const matchPrice = isNumericQuery && (
          med.sellingPrice === searchNum ||
          med.mrp === searchNum ||
          med.purchasePrice === searchNum ||
          String(med.sellingPrice).includes(cleanNumStr) ||
          String(med.mrp).includes(cleanNumStr)
        );

        if (matchItem || matchPrice) {
          results.push({
            id: med.id,
            type: 'item',
            typeLabel: med.category || 'Product / Item',
            title: med.name,
            subtitle: `Stock: ${med.quantity} ${med.unit || 'Box'} • Batch: ${med.batchNumber || '-'} • Barcode: ${med.barcode || '-'} • MRP: Rs ${med.mrp || med.sellingPrice}`,
            amount: med.sellingPrice || med.mrp || 0,
            badge: med.quantity <= (med.lowStockThreshold || 10) ? 'Low Stock' : 'In Stock',
            matchReason: matchPrice ? `Price Match: Rs ${med.sellingPrice}` : med.category,
            route: `/inventory`
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 2. CATEGORIES (Item categories)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'category') {
      const categoryMap = new Map<string, number>();
      medicines.forEach(m => {
        const cat = m.category || 'General';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });

      categoryMap.forEach((count, catName) => {
        if (!q || catName.toLowerCase().includes(q)) {
          results.push({
            id: `cat-${catName}`,
            type: 'category',
            typeLabel: 'Category',
            title: `Category: ${catName}`,
            subtitle: `${count} items in inventory under ${catName}`,
            badge: `${count} Products`,
            route: `/inventory`
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 3. SALES & INVOICES (Invoice #, Party, Amount, Items Inside)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'sale' || (filterType === 'amount' && isNumericQuery)) {
      invoices.forEach((inv: any) => {
        const invNum = (inv.invoiceNumber || inv.id || '').toLowerCase();
        const party = (inv.customerName || inv.partyName || '').toLowerCase();
        const type = (inv.transactionType || inv.invoiceType || 'Sale Invoice').toLowerCase();
        const notes = (inv.description || inv.notes || '').toLowerCase();
        const itemsMatch = inv.items?.some((it: any) => 
          it.name?.toLowerCase().includes(q) || 
          (it.batchNumber && it.batchNumber.toLowerCase().includes(q))
        ) || false;

        const grand = inv.grandTotal ?? inv.totalAmount ?? 0;
        const balance = inv.balanceDue ?? 0;
        const paid = inv.receivedAmount ?? inv.paidAmount ?? 0;

        const matchAmount = isNumericQuery && (
          grand === searchNum ||
          balance === searchNum ||
          paid === searchNum ||
          String(Math.round(grand)).includes(cleanNumStr) ||
          String(Math.round(balance)).includes(cleanNumStr)
        );

        const matchText = !q || 
          invNum.includes(q) || 
          party.includes(q) || 
          type.includes(q) || 
          notes.includes(q) || 
          itemsMatch;

        if (matchText || matchAmount) {
          results.push({
            id: inv.id,
            type: 'sale',
            typeLabel: inv.transactionType || inv.invoiceType || 'Sale Invoice',
            title: inv.invoiceNumber ? `Invoice #${inv.invoiceNumber}` : `Invoice ${inv.id?.slice(0, 8)}`,
            subtitle: `${inv.customerName || inv.partyName || 'Cash Sale'} • ${inv.items?.length || 0} items ${inv.date ? `• ${inv.date}` : ''}`,
            amount: grand,
            date: inv.date || inv.createdAt,
            badge: inv.status || inv.paymentStatus || (balance > 0 ? 'Unpaid' : 'Paid'),
            matchReason: matchAmount ? `Amount Match: Rs ${grand.toLocaleString()}` : undefined,
            route: `/sale/invoices`
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 4. PURCHASES & BILLS (Order #, Supplier, Items, Amount)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'purchase' || (filterType === 'amount' && isNumericQuery)) {
      purchases.forEach((pur: any) => {
        const orderNum = (pur.orderNumber || pur.billNumber || pur.poNumber || pur.id || '').toLowerCase();
        const sup = (pur.supplierName || pur.partyName || '').toLowerCase();
        const type = (pur.transactionType || 'Purchase Bill').toLowerCase();
        const itemsMatch = pur.items?.some((it: any) => it.name?.toLowerCase().includes(q)) || false;

        const grand = pur.grandTotal ?? pur.totalAmount ?? 0;
        const balance = pur.balanceDue ?? 0;

        const matchAmount = isNumericQuery && (
          grand === searchNum ||
          balance === searchNum ||
          String(Math.round(grand)).includes(cleanNumStr)
        );

        const matchText = !q || 
          orderNum.includes(q) || 
          sup.includes(q) || 
          type.includes(q) || 
          itemsMatch;

        if (matchText || matchAmount) {
          results.push({
            id: pur.id,
            type: 'purchase',
            typeLabel: pur.transactionType || 'Purchase Bill',
            title: pur.billNumber ? `Bill #${pur.billNumber}` : pur.poNumber ? `PO #${pur.poNumber}` : pur.orderNumber ? `Bill #${pur.orderNumber}` : `Purchase ${pur.id?.slice(0, 8)}`,
            subtitle: `${pur.supplierName || pur.partyName || 'Distributor'} • ${pur.items?.length || 0} items ${pur.date || pur.orderDate ? `• ${pur.date || pur.orderDate}` : ''}`,
            amount: grand,
            date: pur.date || pur.orderDate || pur.createdAt,
            badge: pur.status || 'Received',
            matchReason: matchAmount ? `Amount Match: Rs ${grand.toLocaleString()}` : undefined,
            route: `/purchase`
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 5. EXPENSES (Expense #, Category, Description, Amount)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'expense' || (filterType === 'amount' && isNumericQuery)) {
      expenses.forEach(exp => {
        const expNum = (exp.expenseNumber || exp.id || '').toLowerCase();
        const cat = (exp.category || '').toLowerCase();
        const desc = (exp.description || '').toLowerCase();
        const expAmount = exp.amount || 0;

        const matchAmount = isNumericQuery && (
          expAmount === searchNum || 
          String(Math.round(expAmount)).includes(cleanNumStr)
        );

        const matchText = !q || expNum.includes(q) || cat.includes(q) || desc.includes(q);

        if (matchText || matchAmount) {
          results.push({
            id: exp.id,
            type: 'expense',
            typeLabel: 'Expense',
            title: exp.expenseNumber ? `#${exp.expenseNumber} - ${exp.category}` : exp.category,
            subtitle: exp.description || `Paid via ${exp.paymentType || 'Cash'} • ${exp.date || ''}`,
            amount: expAmount,
            date: exp.date,
            badge: exp.category,
            matchReason: matchAmount ? `Amount Match: Rs ${expAmount.toLocaleString()}` : undefined,
            route: `/expenses`
          });
        }
      });
    }

    // -------------------------------------------------------------
    // 6. PARTIES (Customers & Suppliers)
    // -------------------------------------------------------------
    if (filterType === 'all' || filterType === 'party' || (filterType === 'amount' && isNumericQuery)) {
      parties.forEach((p: any) => {
        const name = (p.name || '').toLowerCase();
        const phone = (p.phone || p.mobile || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        const ntn = (p.taxNumber || p.gstNumber || p.ntn || '').toLowerCase();
        const partyCat = (p.category || '').toLowerCase();
        const bal = p.balance ?? p.openingBalance ?? 0;

        const matchAmount = isNumericQuery && (
          Math.abs(bal) === searchNum || 
          String(Math.round(Math.abs(bal))).includes(cleanNumStr)
        );

        const matchText = !q || 
          name.includes(q) || 
          phone.includes(q) || 
          city.includes(q) || 
          address.includes(q) || 
          ntn.includes(q) || 
          partyCat.includes(q);

        if (matchText || matchAmount) {
          results.push({
            id: p.id,
            type: 'party',
            typeLabel: p.partyType || (p.type === 'supplier' ? 'Supplier' : 'Customer'),
            title: p.name,
            subtitle: `${p.phone || 'No Phone'} • ${p.city || 'Local'}${p.category ? ` • ${p.category}` : ''}`,
            amount: bal,
            badge: (bal || 0) > 0 ? 'Receivable' : (bal || 0) < 0 ? 'Payable' : 'Settled',
            matchReason: matchAmount ? `Balance Match: Rs ${Math.abs(bal).toLocaleString()}` : undefined,
            route: `/parties`
          });
        }
      });
    }

    return results.slice(0, 60);
  }, [query, filterType, softwareFunctions, invoices, purchases, expenses, parties, medicines]);

  const handleSelectResult = (item: SearchResultItem) => {
    setIsOpen(false);
    if (item.onExecute) {
      item.onExecute();
    } else if (item.route) {
      navigate(item.route);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        handleSelectResult(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Tab') {
      // Allow user to Tab into result list or pills without closing
      if (!e.shiftKey && searchResults.length > 0) {
        // If on input and user tabs, keep dropdown open and allow navigating items
      }
    }
  };

  const getTypeIcon = (item: SearchResultItem) => {
    if (item.type === 'function' && item.icon) {
      const IconComponent = item.icon;
      return <IconComponent className={`w-4 h-4 ${item.iconColor || 'text-indigo-600'}`} />;
    }

    switch (item.type) {
      case 'item':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'category':
        return <Folder className="w-4 h-4 text-amber-600" />;
      case 'amount':
        return <Coins className="w-4 h-4 text-emerald-600" />;
      case 'sale':
        return <FileText className="w-4 h-4 text-red-600" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'expense':
        return <Wallet className="w-4 h-4 text-purple-600" />;
      case 'party':
        return <Users className="w-4 h-4 text-teal-600" />;
      default:
        return <Zap className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Top Header Direct Search Input Box */}
      <div className="relative w-full group">
        <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
          isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'
        }`} />
        
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            loadData();
          }}
          onKeyDown={handleKeyDown}
          placeholder={typeof window !== 'undefined' && window.innerWidth < 640 ? "Search..." : "Search medicines, batch, invoices, parties, functions (Ctrl+K)..."}
          className="w-full pl-8 sm:pl-9 pr-8 sm:pr-16 py-1.5 sm:py-2 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl text-xs sm:text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all truncate"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-2xs select-none">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Transparent backdrop for outside dismiss on PC & mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9990] bg-slate-950/20 sm:bg-black/10 backdrop-blur-none"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Menu directly under Search Bar */}
      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 w-[calc(100vw-1.5rem)] sm:w-[540px] md:w-[620px] lg:w-full min-w-[min(100%,320px)] lg:min-w-[620px] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[9999] overflow-hidden flex flex-col max-h-[min(540px,calc(100vh-5rem))] animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Filter Pills with 3 Dots differentiation */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none text-[11px] font-bold shrink-0">
            {[
              { id: 'all' as const, label: 'All', isSpecial: false },
              { id: 'functions' as const, label: '⚡ Functions & Actions (...)', isSpecial: true },
              { id: 'item' as const, label: 'Items / Stock', isSpecial: false },
              { id: 'sale' as const, label: 'Sales', isSpecial: false },
              { id: 'purchase' as const, label: 'Purchases', isSpecial: false },
              { id: 'party' as const, label: 'Parties', isSpecial: false },
              { id: 'expense' as const, label: 'Expenses', isSpecial: false },
              { id: 'category' as const, label: 'Categories', isSpecial: false },
              { id: 'amount' as const, label: 'Amounts', isSpecial: false },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => {
                  setFilterType(f.id);
                  setSelectedIndex(0);
                  searchInputRef.current?.focus();
                }}
                className={`px-3 py-1.5 rounded-lg tracking-tight transition-all whitespace-nowrap cursor-pointer ${
                  filterType === f.id 
                    ? f.isSpecial
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'bg-blue-600 text-white shadow-2xs' 
                    : f.isSpecial
                    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Stats Header */}
          <div className="px-3 py-1.5 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span className="flex items-center gap-2">
              <span>Found <strong className="text-slate-900 dark:text-white font-bold">{searchResults.length}</strong> record(s)</span>
              {query && <span className="text-slate-400 truncate max-w-[200px]">matching "{query}"</span>}
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> Instant Search & Actions
            </span>
          </div>

          {/* Scrollable Results List */}
          <div 
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-1"
          >
            {isLoading ? (
              <div className="p-10 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
                <RotateCcw className="w-4.5 h-4.5 animate-spin text-blue-500" />
                Searching MBI Inventra functions & records...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((res, index) => {
                const isSelected = index === selectedIndex;
                const isFunction = res.type === 'function';

                return (
                  <div
                    key={`${res.type}-${res.id}-${index}`}
                    data-index={index}
                    tabIndex={0}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectResult(res)}
                    onMouseDown={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectResult(res);
                      }
                    }}
                    onFocus={() => setSelectedIndex(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isSelected 
                        ? isFunction 
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-600 pl-2' 
                          : 'bg-blue-50/80 dark:bg-blue-950/50 border-l-4 border-blue-600 pl-2' 
                        : isFunction
                        ? 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${
                        isFunction ? (res.iconBg || 'bg-indigo-100 dark:bg-indigo-900/50') : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {getTypeIcon(res)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs sm:text-[13px] font-bold truncate ${
                            isFunction ? 'text-indigo-950 dark:text-indigo-200 font-black' : 'text-slate-900 dark:text-white'
                          }`}>
                            {res.title}
                          </span>
                          
                          {/* Distinct 3-Dots Badge for Functions vs Data */}
                          <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase tracking-wide border ${
                            isFunction
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            {res.typeLabel}
                          </span>

                          {res.matchReason && (
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {res.matchReason}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {res.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      {res.amount !== undefined && (
                        <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100">
                          Rs. {Math.abs(res.amount).toLocaleString()}
                        </div>
                      )}
                      
                      {res.shortcut && (
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 rounded-md border border-indigo-200 dark:border-indigo-800">
                          {res.shortcut}
                        </kbd>
                      )}

                      {res.badge && !res.shortcut && (
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isFunction
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : res.badge === 'Paid' || res.badge === 'In Stock' || res.badge === 'Settled'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : res.badge === 'Unpaid' || res.badge === 'Low Stock' || res.badge === 'Payable'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {res.badge}
                        </span>
                      )}

                      <div className={`p-1 rounded text-slate-400 transition-transform ${isSelected ? 'translate-x-0.5 text-blue-600' : ''}`}>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <AlertCircle className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">No matching software functions or records found</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                  Try searching for <span className="font-semibold text-slate-600 dark:text-slate-300">"Shift Close"</span>, <span className="font-semibold text-slate-600 dark:text-slate-300">"Passcode"</span>, <span className="font-semibold text-slate-600 dark:text-slate-300">"QR Scanner"</span>, <span className="font-semibold text-slate-600 dark:text-slate-300">"Invoice Billing"</span>, or any medicine/invoice name.
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
            <span className="flex items-center gap-1.5">
              <span>Showing <strong className="text-slate-800 dark:text-slate-200">{searchResults.length}</strong> result(s)</span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">··· Functions & Actions</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Use <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">↓</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">Enter</kbd> to open</span>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
