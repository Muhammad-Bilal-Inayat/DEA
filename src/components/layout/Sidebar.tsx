import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Users, Package, FileText, ShoppingCart, Wallet, Landmark, 
  BarChart2, Plus, ChevronDown, ChevronUp, RefreshCw, X, ChevronRight,
  Building2, Settings, Database, Wrench, Award, MessageSquare, RotateCcw,
  CheckCircle2, Download, TrendingUp, Flame, PanelLeftClose, PanelLeftOpen,
  DollarSign, ShoppingBag, Store, Server, Lock, AlertTriangle, Zap, User,
  CreditCard, Globe, Sparkles, HardDrive, BookOpen, ShieldAlert, ArrowLeft,
  Shield, Sliders, Key, Smartphone, BarChart3, Activity, Phone, Laptop
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { CompanyProfileModal } from '../company/CompanyProfileModal';
import { ROLE_DEFINITIONS } from '../../lib/permissions';
import { BackupModals } from '../backup/BackupModals';
import { exportFullBackup } from '../../lib/db';
import { REPORT_LIST, ReportItemDef } from '../../pages/Reports';
import { SETTINGS_TABS, resolveTabKey } from '../../pages/Settings';
import { syncEngine, SyncStatus } from '../../lib/syncEngine';
import { getSidebarMenuConfig, isMasterAdminAuthenticated } from '../../lib/masterServerService';
import { PWAInstallButton } from '../pwa/PWAComponents';

const REPORT_CATEGORIES = [
  {
    categoryLabel: 'Transaction report',
    items: REPORT_LIST.filter(r => r.category === 'TRANSACTION')
  },
  {
    categoryLabel: 'Party report',
    items: REPORT_LIST.filter(r => r.category === 'PARTY')
  },
  {
    categoryLabel: 'Item/ Stock report',
    items: REPORT_LIST.filter(r => r.category === 'ITEM_STOCK')
  },
  {
    categoryLabel: 'Business Status',
    items: REPORT_LIST.filter(r => r.category === 'BUSINESS_STATUS')
  },
  {
    categoryLabel: 'Taxes',
    items: REPORT_LIST.filter(r => r.category === 'TAXES')
  },
  {
    categoryLabel: 'Expense report',
    items: REPORT_LIST.filter(r => r.category === 'EXPENSE')
  },
  {
    categoryLabel: 'Sale/ Purchase Order report',
    items: REPORT_LIST.filter(r => r.category === 'ORDERS')
  },
  {
    categoryLabel: 'Loan Accounts',
    items: REPORT_LIST.filter(r => r.category === 'LOANS')
  },
];

interface NavSubItem {
  label: string;
  path: string;
  addPath?: string;
  hasAdd?: boolean;
}

interface NavItem {
  id?: string;
  icon: any;
  label: string;
  path: string;
  moduleKey: keyof typeof ROLE_DEFINITIONS['Primary Admin']['allowedModules'];
  addPath?: string;
  hasDropdown?: boolean;
  hasAdd?: boolean;
  subItems?: NavSubItem[];
}

const mainNavItems: NavItem[] = [
  { 
    id: 'dashboard',
    icon: Home, 
    label: 'Dashboard', 
    path: '/user', 
    moduleKey: 'dashboard',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'parties',
    icon: Users, 
    label: 'Parties', 
    path: '/parties', 
    moduleKey: 'parties',
    addPath: '/parties?action=add',
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    id: 'items',
    icon: Package, 
    label: 'Items', 
    path: '/items', 
    moduleKey: 'items',
    addPath: '/items?action=add',
    hasDropdown: true, 
    hasAdd: true,
    subItems: [
      { label: 'Products & Inventory', path: '/items', addPath: '/items?action=add', hasAdd: true },
      { label: 'Shortage Registry', path: '/shortage-registry', addPath: '/shortage-registry?action=add', hasAdd: true },
      { label: 'QR & Barcode Generator', path: '/settings?tab=QR%20CODE%20GENERATOR', hasAdd: false },
      { label: 'Top Products', path: '/top-products', hasAdd: false },
    ]
  },
  { 
    id: 'shortage',
    icon: AlertTriangle, 
    label: 'Short Register', 
    path: '/shortage-registry', 
    moduleKey: 'items',
    addPath: '/shortage-registry?action=add',
    hasDropdown: false, 
    hasAdd: true 
  },
  { 
    id: 'onlineStore',
    icon: ShoppingBag, 
    label: 'Online Store', 
    path: '/online-store', 
    moduleKey: 'sale',
    hasDropdown: true,
    hasAdd: false,
    subItems: [
      { label: 'Orders & Overview', path: '/online-store', hasAdd: false },
      { label: 'Products & Pricing', path: '/online-store?tab=products', hasAdd: false },
      { label: 'Coupons & Deals', path: '/online-store?tab=promotions', hasAdd: false },
      { label: 'Store Settings', path: '/online-store?tab=settings', hasAdd: false },
    ]
  },
  { 
    id: 'sale',
    icon: FileText, 
    label: 'Sale', 
    path: '/sale/invoices', 
    moduleKey: 'sale',
    addPath: '/sale/invoices?action=add',
    hasDropdown: true,
    hasAdd: true,
    subItems: [
      { label: 'Sale Invoices', path: '/sale/invoices', addPath: '/sale/invoices?action=add', hasAdd: true },
      { label: 'Estimate / Quotation', path: '/sale/quotation', addPath: '/sale/quotation?action=add', hasAdd: true },
      { label: 'Payment In', path: '/sale/payment-in', addPath: '/sale/payment-in?action=add', hasAdd: true },
      { label: 'Sale Order', path: '/sale/order', addPath: '/sale/order?action=add', hasAdd: true },
      { label: 'Delivery Challan', path: '/sale/challan', addPath: '/sale/challan?action=add', hasAdd: true },
      { label: 'Sale Return / Cr. Note', path: '/sale/return', addPath: '/sale/return?action=add', hasAdd: true },
      { label: 'Cashier Shifts & POS', path: '/shift-management', hasAdd: false },
    ]
  },
  { 
    id: 'shifts',
    icon: DollarSign, 
    label: 'Shift Management', 
    path: '/shift-management', 
    moduleKey: 'sale',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'purchase',
    icon: ShoppingCart, 
    label: 'Purchase', 
    path: '/purchase', 
    moduleKey: 'purchase',
    addPath: '/purchase?action=add',
    hasDropdown: true,
    hasAdd: true,
    subItems: [
      { label: 'Purchase Bills', path: '/purchase', addPath: '/purchase?action=add', hasAdd: true },
      { label: 'Payment Out', path: '/purchase/payment-out', addPath: '/purchase/payment-out?action=add', hasAdd: true },
      { label: 'Purchase Order', path: '/purchase/order', addPath: '/purchase/order?action=add', hasAdd: true },
      { label: 'Purchase Return/ Dr. Note', path: '/purchase/return', addPath: '/purchase/return?action=add', hasAdd: true },
    ]
  },
  { 
    id: 'expenses',
    icon: Wallet, 
    label: 'Expenses', 
    path: '/expenses', 
    moduleKey: 'expenses',
    hasDropdown: false, 
    hasAdd: false 
  },
  { 
    id: 'bank',
    icon: Landmark, 
    label: 'Cash & Bank', 
    path: '/bank', 
    moduleKey: 'bank',
    hasDropdown: true,
    hasAdd: false,
    subItems: [
      { label: 'Bank Accounts', path: '/bank', addPath: '/bank?action=add-bank', hasAdd: true },
      { label: 'Cash In Hand', path: '/cash-in-hand', addPath: '/cash-in-hand?action=adjust', hasAdd: true },
      { label: 'Shift Reconciliation', path: '/shift-management', hasAdd: false },
      { label: 'Cheques', path: '/bank/cheques', hasAdd: false },
      { label: 'Loan Accounts', path: '/bank/loan-accounts', addPath: '/bank/loan-accounts?action=add', hasAdd: true },
    ]
  },
  { 
    id: 'reports',
    icon: BarChart2, 
    label: 'Reports', 
    path: '/reports', 
    moduleKey: 'reports',
    hasDropdown: true, 
    hasAdd: false,
    subItems: REPORT_LIST.map(r => ({
      label: `${r.categoryLabel} > ${r.label}`,
      path: `/reports?report=${r.id}`,
      hasAdd: false
    }))
  },
];

interface ServerNavItemDef {
  tabKey: 'clients' | 'whatsapp_leads' | 'site_cms' | 'security_alerts' | 'security_audit' | 'sales_revenue' | 'storage' | 'sync_health' | 'sync_stream' | 'activity' | 'pricing_manager' | 'seo_strategy' | 'cloud_health' | 'docs' | 'master_control' | 'users' | 'database' | 'devices';
  label: string;
  badge: string;
  badgeColor?: string;
  icon: any;
}

const SERVER_FLEET_ITEMS: ServerNavItemDef[] = [
  { tabKey: 'clients', label: 'All Clients & Fleet', badge: 'Fleet', icon: Building2 },
  { tabKey: 'devices', label: 'Device Auth & Fleet Lock', badge: '1-Dev', icon: Laptop },
  { tabKey: 'security_audit', label: 'Security Audit Log & IP Block', badge: 'Audit', icon: ShieldAlert },
  { tabKey: 'whatsapp_leads', label: 'Registration Leads & WhatsApp', badge: 'Leads', icon: Phone },
  { tabKey: 'master_control', label: 'Master Switchboard (173)', badge: '173', icon: Sliders },
  { tabKey: 'database', label: 'Medicine DB Initialization', badge: 'Data', icon: Database },
  { tabKey: 'site_cms', label: 'Site CMS & Landing', badge: 'Website', icon: Store },
  { tabKey: 'sales_revenue', label: 'Global Sales & Revenue', badge: 'PKR', icon: DollarSign },
  { tabKey: 'storage', label: 'Tenant Storage Quota', badge: 'Disk', icon: HardDrive },
  { tabKey: 'sync_health', label: 'Sync Health (30-Day SLA)', badge: 'SLA', icon: BarChart3 },
  { tabKey: 'sync_stream', label: 'Live Sync Stream', badge: 'Stream', icon: Activity },
  { tabKey: 'activity', label: 'Activity & Real-Time IP', badge: 'Live', icon: Globe },
  { tabKey: 'cloud_health', label: 'Cloud Diagnostics', badge: 'Cloud', icon: HardDrive },
  { tabKey: 'pricing_manager', label: 'Plans & Pricing (SaaS)', badge: 'Plans', icon: CreditCard },
  { tabKey: 'seo_strategy', label: 'SEO Strategy & Schema', badge: 'SEO', icon: Sparkles },
  { tabKey: 'security_alerts', label: 'Security Threat Radar', badge: 'Radar', icon: ShieldAlert },
  { tabKey: 'docs', label: 'Server Documentation', badge: 'Manual', icon: BookOpen },
];

const SERVER_USER_ITEMS: ServerNavItemDef[] = [
  { tabKey: 'users', label: 'Users & Passcodes Directory', badge: 'RBAC', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  isCollapsed = false,
  setIsCollapsed
}) => {
  const { business, activeRole, canAccess } = useAuth();
  const { settings, userPreferences } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isServerRoute = location.pathname.startsWith('/server');
  const [activeServerTab, setActiveServerTab] = useState<string>('clients');

  useEffect(() => {
    const handleActiveTab = (e: any) => {
      if (e.detail) setActiveServerTab(e.detail);
    };
    window.addEventListener('mbi-active-server-tab-changed', handleActiveTab as any);
    return () => window.removeEventListener('mbi-active-server-tab-changed', handleActiveTab as any);
  }, []);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  
  // Modals state for Backup/Restore
  const [activeBackupModal, setActiveBackupModal] = useState<'auto' | 'computer' | 'drive' | 'restore' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Explicit state for dropdowns (Sale, Purchase, Cash & Bank, Backup/Restore, Utilities, Reports)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Sale: true,
    Purchase: true,
    'Cash & Bank': false,
    'Backup/Restore': false,
    Utilities: true, // Default open matching screenshot
    Reports: false,
    Settings: false,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = syncEngine.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    showToast('Synchronizing with cloud and all connected browsers...');
    await syncEngine.pullServerSync(true);
    await syncEngine.pushServerSync();
    setTimeout(() => {
      setIsSyncing(false);
      showToast('All data successfully synchronized!');
    }, 600);
  };

  // Automatically keep section open if user is currently on that route
  useEffect(() => {
    if (location.pathname.startsWith('/sale')) {
      setExpandedMenus(prev => ({ ...prev, Sale: true }));
    } else if (location.pathname.startsWith('/purchase')) {
      setExpandedMenus(prev => ({ ...prev, Purchase: true }));
    } else if (location.pathname.startsWith('/bank')) {
      setExpandedMenus(prev => ({ ...prev, 'Cash & Bank': true }));
    } else if (location.pathname.startsWith('/utilities')) {
      setExpandedMenus(prev => ({ ...prev, Utilities: true }));
    } else if (location.pathname.startsWith('/reports')) {
      setExpandedMenus(prev => ({ ...prev, Reports: true }));
    } else if (location.pathname.startsWith('/settings')) {
      setExpandedMenus(prev => ({ ...prev, Settings: true }));
    }
  }, [location.pathname]);

  const toggleDropdown = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleQuickAdd = (addPath: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(addPath);
    setIsOpen(false);
  };

  // Backup to Computer Handler
  const handleBackupToComputer = async () => {
    try {
      const backupJson = await exportFullBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      const companyClean = (business?.name || 'MBI_Inventra').replace(/[^a-zA-Z0-9]/g, '_');
      a.href = url;
      a.download = `MBI_Inventra_Backup_${companyClean}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database backup exported to computer successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to generate backup.');
    }
  };

  // Filter main items and their sub-items according to current role permissions, Module Visibility & General Settings
  const visibleNavItems = useMemo(() => {
    const userOrder = userPreferences?.menuOrder || [];
    const userVis = userPreferences?.menuVisibility || {};

    const menuConfigs = getSidebarMenuConfig();
    const orderMap = new Map<string, number>();
    menuConfigs.forEach(m => {
      orderMap.set(m.id.toLowerCase(), m.order);
      orderMap.set(m.moduleKey.toLowerCase(), m.order);
      orderMap.set(m.label.toLowerCase(), m.order);
    });

    const getRank = (item: NavItem): number => {
      const key = item.label.toLowerCase();
      if (key.includes('dashboard')) return orderMap.get('dashboard') || 1;
      if (key.includes('shortage')) return orderMap.get('shortage') || 2;
      if (key.includes('sale')) return orderMap.get('sale') || 3;
      if (key.includes('item') || key.includes('product')) return orderMap.get('items') || 4;
      if (key.includes('purchase')) return orderMap.get('purchases') || 5;
      if (key.includes('part')) return orderMap.get('parties') || 6;
      if (key.includes('supplier')) return orderMap.get('suppliers') || 7;
      if (key.includes('expense')) return orderMap.get('expenses') || 8;
      if (key.includes('bank') || key.includes('cash')) return orderMap.get('bank') || 9;
      if (key.includes('report')) return orderMap.get('reports') || 10;
      if (key.includes('online')) return orderMap.get('onlinestore') || 11;
      if (key.includes('setting')) return orderMap.get('settings') || 12;
      return 99;
    };

    const mods = settings.modules || {
      sales: true,
      purchases: true,
      inventory: true,
      parties: true,
      expenses: true,
      banking: true,
      reports: true,
      pos: true,
      syncShare: true,
    };

    const filtered = mainNavItems
      .filter(item => {
        if (!canAccess(item.moduleKey)) return false;
        if (item.id && userVis[item.id] === false) return false;
        if (item.label === 'Sale' && mods.sales === false) return false;
        if (item.label === 'Purchase' && mods.purchases === false) return false;
        if (item.label === 'Items' && (mods.inventory === false || settings.item.enableItem === false)) return false;
        if (item.label === 'Top Products' && mods.inventory === false) return false;
        if (item.label === 'Parties' && mods.parties === false) return false;
        if (item.label === 'Expenses' && mods.expenses === false) return false;
        if ((item.label === 'Cash & Bank' || item.label === 'Cash in Hand') && mods.banking === false) return false;
        if (item.label === 'Reports' && mods.reports === false) return false;
        return true;
      })
      .map(item => {
        if (!item.subItems) return item;
        const filteredSubs = item.subItems.filter(sub => {
          if (sub.label.includes('Estimate') && !settings.general.estimateQuotation) return false;
          if (sub.label.includes('Sale Order') && !settings.general.salePurchaseOrder) return false;
          if (sub.label.includes('Purchase Order') && !settings.general.salePurchaseOrder) return false;
          if (sub.label.includes('Delivery Challan') && !settings.general.deliveryChallan) return false;
          return true;
        });
        return { ...item, subItems: filteredSubs };
      });

    return [...filtered].sort((a, b) => {
      if (userOrder.length > 0 && a.id && b.id) {
        const idxA = userOrder.indexOf(a.id);
        const idxB = userOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
      }
      return getRank(a) - getRank(b);
    });
  }, [mainNavItems, canAccess, settings.general, settings.item.enableItem, settings.modules, userPreferences]);

  const isSyncAllowed = canAccess('syncShare') && settings.modules?.syncShare !== false;
  const isBackupAllowed = canAccess('backup');
  const isUtilitiesAllowed = canAccess('utilities');
  const isSettingsAllowed = canAccess('settings');
  const isServerAllowed = activeRole === 'Primary Admin' || activeRole === 'Secondary Admin' || activeRole === 'Admin' || activeRole === 'Store Manager' || !activeRole || isMasterAdminAuthenticated();

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container - Deep Slate / Indigo Theme */}
      <aside className={cn(
        'fixed top-0 left-0 bottom-0 z-[60] bg-[#090d16] text-slate-300 flex flex-col transition-all duration-200 ease-in-out lg:static lg:z-auto border-r border-slate-800/90 select-none overflow-hidden shadow-xl',
        isOpen ? 'translate-x-0 w-[250px]' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-[70px]' : 'lg:w-[230px]'
      )}>
        
        {/* Header Card: Server Mode vs Standard Company Card */}
        {isServerRoute ? (
          <div 
            onClick={() => {
              setActiveServerTab('clients');
              window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: 'clients' }));
            }}
            className={cn(
              "h-[60px] px-3.5 flex items-center border-b border-indigo-900/60 bg-[#0d1226] hover:bg-[#151c3b] cursor-pointer transition-all group flex-shrink-0",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title="MBI Master Server Control Panel"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-lg flex items-center justify-center flex-shrink-0 ring-1 ring-indigo-400/30">
                <Server className="w-4.5 h-4.5 text-white" />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-[13px] font-black text-indigo-200 tracking-wide truncate group-hover:text-white transition-colors uppercase leading-tight flex items-center gap-1.5">
                    <span>CENTRAL SERVER</span>
                  </h1>
                  <p className="text-[10px] text-emerald-400 truncate flex items-center gap-1 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>All Users & Multi-Store</span>
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => setIsCompanyModalOpen(true)}
            className={cn(
              "h-[60px] px-3.5 flex items-center border-b border-slate-800/90 bg-[#0d1322] hover:bg-[#151e36] cursor-pointer transition-all group flex-shrink-0",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            title={isCollapsed ? (business?.name || "Company Profile") : "Click to view & edit Company Profile"}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md flex items-center justify-center flex-shrink-0 ring-1 ring-white/20 overflow-hidden bg-slate-900">
                <img 
                  src={business?.logo || '/icon.svg'} 
                  alt="Store Logo" 
                  className="w-full h-full object-contain p-0.5 rounded-[10px]" 
                />
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="text-[13px] font-black text-white tracking-wide truncate group-hover:text-blue-300 transition-colors uppercase leading-tight">
                    {business?.name || 'My Pharmacy Store'}
                  </h1>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{business?.phone || business?.mobile || business?.city || 'Active Terminal'}</span>
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
                <ChevronRight className="hidden lg:block w-4 h-4 text-slate-500 group-hover:text-blue-300 transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
              </div>
            )}
          </div>
        )}

        {/* Navigation Items: Server Hub vs Store Menu */}
        {isServerRoute ? (
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3 no-scrollbar text-[13px]">
            {/* UNHIDDEN Master Super Panel Header Item */}
            <div className="group relative px-0.5">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'open-master' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 font-bold cursor-pointer rounded-xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-900/90 hover:from-purple-800 hover:to-indigo-800 text-purple-100 border border-purple-500/60 shadow-md group',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-2 min-h-[38px]'
                )}
                title={isCollapsed ? "Master Super Panel" : undefined}
              >
                <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                  <div className="w-7 h-7 rounded-lg bg-purple-950/80 flex items-center justify-center flex-shrink-0 text-purple-300 group-hover:scale-110 transition-transform">
                    <Shield className="w-4 h-4 text-purple-300" />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="truncate text-[12px] font-black tracking-normal flex-1 text-purple-100 text-left">Master Super Panel</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-200 border border-purple-400/50">
                        UNHIDDEN
                      </span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* SECTION 1: SERVER & FLEET MODULES */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Server className="w-3 h-3" />
                    <span>Server Modules & Fleet</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 text-[9px] font-mono">14 MODS</span>
                </div>
              )}

              {SERVER_FLEET_ITEMS.map((item) => {
                const isTabActive = activeServerTab === item.tabKey;
                const Icon = item.icon;

                return (
                  <div key={item.tabKey} className="group relative">
                    <div
                      onClick={() => {
                        if (isCollapsed && setIsCollapsed) {
                          setIsCollapsed(false);
                        }
                        setActiveServerTab(item.tabKey);
                        window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: item.tabKey }));
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                        isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-1.5 min-h-[36px]',
                        isTabActive 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md ring-1 ring-blue-400/50' 
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                        <div className={cn(
                          "w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isTabActive ? "bg-white/20 text-white" : "bg-slate-800/80 text-slate-400 group-hover:text-blue-300 group-hover:bg-slate-800"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="truncate text-[12px] font-semibold tracking-normal flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border flex-shrink-0 font-mono",
                                isTabActive ? "bg-white/20 text-white border-white/30" : "bg-slate-950/80 text-slate-400 border-slate-800"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: USER & STAFF CONTROLS */}
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>User & Staff Directory</span>
                </div>
              )}

              {SERVER_USER_ITEMS.map((item) => {
                const isTabActive = activeServerTab === item.tabKey;
                const Icon = item.icon;

                return (
                  <div key={item.tabKey} className="group relative">
                    <div
                      onClick={() => {
                        if (isCollapsed && setIsCollapsed) {
                          setIsCollapsed(false);
                        }
                        setActiveServerTab(item.tabKey);
                        window.dispatchEvent(new CustomEvent('mbi-set-server-tab', { detail: item.tabKey }));
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                        isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-1.5 min-h-[36px]',
                        isTabActive 
                          ? 'bg-emerald-600 text-white font-bold shadow-md' 
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-2.5")}>
                        <div className={cn(
                          "w-6.5 h-6.5 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                          isTabActive ? "bg-white/20 text-white" : "bg-slate-800/80 text-slate-400 group-hover:text-emerald-300 group-hover:bg-slate-800"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isCollapsed && (
                          <>
                            <span className="truncate text-[12px] font-semibold tracking-normal flex-1 text-left">{item.label}</span>
                            {item.badge && (
                              <span className={cn(
                                "px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded border flex-shrink-0 font-mono",
                                isTabActive ? "bg-white/20 text-white border-white/30" : "bg-slate-950/80 text-slate-400 border-slate-800"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 3: SERVER SECURITY & QUICK ACTIONS */}
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              {!isCollapsed && (
                <div className="px-2 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>Security & Quick Actions</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'change-pass' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Change Server Password" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-950/50 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <Key className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Change Password</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'toggle-2fa' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Google 2FA Protection" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-purple-950/50 flex items-center justify-center flex-shrink-0 text-purple-400">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Google 2FA Security</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'sync-all' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Force Synchronize All Terminals" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Force Sync All</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'backup' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl cursor-pointer text-left',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Instant Snapshot Backup" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <Database className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-medium">Instant Backup</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('mbi-server-action', { detail: { action: 'lock-server' } }));
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 text-red-300 hover:text-red-200 bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 rounded-xl cursor-pointer text-left mt-1',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-1.5 gap-2.5'
                )}
                title={isCollapsed ? "Lock Server Session" : undefined}
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-red-950 flex items-center justify-center flex-shrink-0 text-red-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && <span className="truncate text-[12px] font-bold">Lock Server</span>}
              </button>
            </div>

            {/* Switch to Store POS Button */}
            <div className="pt-3 mt-2 border-t border-slate-800/90">
              <button
                type="button"
                onClick={() => {
                  navigate('/dashboard');
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center transition-all duration-150 font-bold cursor-pointer rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700/80 shadow-xs',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2.5'
                )}
                title={isCollapsed ? "Switch to Store POS" : undefined}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                {!isCollapsed && (
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[12px] font-extrabold leading-tight">Switch to Store POS</p>
                    <p className="text-[10px] text-slate-400 font-normal">Return to single-store view</p>
                  </div>
                )}
              </button>
            </div>
          </nav>
        ) : (
        /* Navigation Items (Scrollable without visible scrollbars) */
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1 no-scrollbar text-[13px]">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const isExpanded = expandedMenus[item.label];

            return (
              <div key={item.label} className="group relative">
                {/* Main Item Row */}
                <div
                  className={cn(
                    'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-2 min-h-[40px]',
                    isActive 
                      ? 'bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50 shadow-xs' 
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  )}
                  title={isCollapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (isCollapsed && setIsCollapsed) {
                      setIsCollapsed(false);
                    }
                    if (item.hasDropdown) {
                      toggleDropdown(item.label, e);
                    } else {
                      navigate(item.path);
                      setIsOpen(false);
                    }
                  }}
                >
                  <NavLink 
                    to={item.path} 
                    className={cn("flex items-center flex-1 min-w-0", isCollapsed ? "justify-center" : "gap-3")}
                    onClick={(e) => {
                      if (item.hasDropdown) {
                        e.preventDefault();
                        toggleDropdown(item.label, e);
                      } else {
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive ? "bg-blue-600 text-white shadow-xs" : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="truncate text-[13px] font-semibold tracking-normal flex-1">{item.label}</span>
                        {item.label === 'Top Products' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0 shadow-2xs">
                            HOT
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5">
                      {/* Quick Add Button (+) */}
                      {item.hasAdd && item.addPath && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(item.addPath!, e)}
                          title={`Create New ${item.label}`}
                          className="w-6 h-6 flex items-center justify-center bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer group/btn"
                        >
                          <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform duration-150" />
                        </button>
                      )}

                      {/* Dropdown Chevron Toggle */}
                      {item.hasDropdown && (
                        <button
                          type="button"
                          onClick={(e) => toggleDropdown(item.label, e)}
                          title={isExpanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub Menu Items (Natural flow when expanded, NEVER inside collapsed sidebar) */}
                {item.subItems && isExpanded && !isCollapsed && (
                  <div className="bg-[#131d33] py-1 border-l-[3px] border-transparent animate-in fade-in slide-in-from-top-1 duration-150">
                    {item.label === 'Reports' ? (
                      REPORT_CATEGORIES.map((cat, catIdx) => (
                        <div key={catIdx} className="mb-1">
                          <div className="px-3.5 py-1.5 pl-8 pr-3 text-[11px] font-extrabold text-blue-300 uppercase tracking-wider bg-[#0f172a]/90 border-y border-slate-800/80 flex items-center justify-between sticky top-0 z-10">
                            <span>{cat.categoryLabel}</span>
                          </div>
                          <div className="py-0.5 space-y-0.5">
                            {cat.items.map((subItem, sIdx) => {
                              const subPath = `/reports?report=${subItem.id}`;
                              const isSubActive = location.pathname === '/reports' && location.search === `?report=${subItem.id}`;
                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => {
                                    navigate(subPath);
                                    setIsOpen(false);
                                  }}
                                  className={cn(
                                    'flex items-center justify-between px-3.5 py-1.5 min-h-[30px] transition-colors text-[12.5px] font-medium pl-10 pr-3 group/sub cursor-pointer',
                                    isSubActive
                                      ? 'bg-[#1e293b] text-white font-semibold'
                                      : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white'
                                  )}
                                >
                                  <NavLink
                                    to={subPath}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsOpen(false);
                                    }}
                                    className="flex-1 truncate"
                                  >
                                    <span>{subItem.label}</span>
                                  </NavLink>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      item.subItems.map((subItem, index) => {
                        const isSubActive = 
                          location.pathname === subItem.path || 
                          (subItem.path === '/sale/invoices' && (location.pathname === '/sale' || location.pathname === '/sale/invoices'));

                        return (
                          <div
                            key={index}
                            onClick={() => {
                              navigate(subItem.path);
                              setIsOpen(false);
                            }}
                            className={cn(
                              'flex items-center justify-between px-3.5 py-1.5 min-h-[32px] transition-colors text-[12.5px] font-medium pl-10 pr-3 group/sub cursor-pointer',
                              isSubActive
                                ? 'bg-[#1e293b] text-white font-semibold'
                                : 'text-slate-400 hover:bg-[#1e293b]/60 hover:text-white'
                            )}
                          >
                            <NavLink
                              to={subItem.path}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                              }}
                              className="flex-1 truncate"
                            >
                              <span>{subItem.label}</span>
                            </NavLink>

                            {subItem.hasAdd && subItem.addPath && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAdd(subItem.addPath!, e);
                                }}
                                title={`Add ${subItem.label}`}
                                className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-500 rounded-md transition-all opacity-90 group-hover/sub:opacity-100 active:scale-95 ml-1.5 cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && item.subItems && item.subItems.length > 0 && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[220px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-blue-400" />
                        {item.label}
                      </span>
                      {item.hasAdd && item.addPath && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item.addPath!, e);
                          }}
                          className="h-5 px-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Add
                        </button>
                      )}
                    </div>
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      {item.subItems.map((sub, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => {
                            navigate(sub.path);
                            setIsOpen(false);
                          }}
                          className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <span className="truncate">{sub.label}</span>
                          {sub.hasAdd && sub.addPath && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(sub.addPath!, e);
                              }}
                              className="h-4 px-1.5 flex items-center gap-0.5 bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded text-[9px] font-medium"
                            >
                              <Plus className="w-2 h-2" />
                              Add
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Bottom Utility & Admin Sections */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-0.5">

            {/* Sync & Share Navigation Link */}
            {isSyncAllowed && (
              <NavLink
                to="/sync-share"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium transition-colors border-l-[3px]',
                  isActive 
                    ? 'bg-[#1e293b] text-white border-blue-500 font-semibold' 
                    : 'border-transparent text-slate-300 hover:bg-[#1e293b]/70 hover:text-white'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className={cn(
                      'w-[18px] h-[18px]',
                      location.pathname === '/sync-share' ? 'text-blue-400' : 'text-slate-400'
                    )} />
                  </div>
                  <span className="truncate text-[13px] font-semibold">Sync & Share</span>
                </div>
                {/* Active Sync Green Dot */}
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 mr-1" />
              </NavLink>
            )}

            {/* BACKUP / RESTORE DROPDOWN */}
            {isBackupAllowed && (
              <div className="group relative">
                {/* Main Header Item */}
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      setActiveBackupModal('auto');
                    } else {
                      toggleDropdown('Backup/Restore', e);
                    }
                  }}
                  title={isCollapsed ? "Backup / Restore" : undefined}
                  className={cn(
                    'flex items-center transition-colors cursor-pointer border-l-[3px] border-transparent text-slate-300 hover:bg-[#1e293b]/70 hover:text-white',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3.5 py-2 min-h-[38px] text-[13px] font-medium',
                    expandedMenus['Backup/Restore'] ? 'text-white' : ''
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-[18px] h-[18px] text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Backup/Restore</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Backup/Restore'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                        Backup / Restore
                      </span>
                    </div>
                    <div className="py-1">
                      <div 
                        onClick={() => {
                          setActiveBackupModal('auto');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Auto Backup
                      </div>
                      <div 
                        onClick={() => {
                          handleBackupToComputer();
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span>Backup To Computer</span>
                        <Download className="w-3 h-3 text-slate-400" />
                      </div>
                      <div 
                        onClick={() => {
                          setActiveBackupModal('drive');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Backup To Drive
                      </div>
                      <div 
                        onClick={() => {
                          setActiveBackupModal('restore');
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white text-xs cursor-pointer transition-colors"
                      >
                        Restore Backup
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Menu Items */}
                {expandedMenus['Backup/Restore'] && !isCollapsed && (
                  <div className="bg-[#131d33] py-1 border-l-[3px] border-transparent animate-in fade-in slide-in-from-top-1 duration-150 text-[12.5px] font-medium">
                    
                    {/* Auto Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('auto');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Auto Backup
                    </div>

                    {/* Backup To Computer */}
                    <div 
                      onClick={() => {
                        handleBackupToComputer();
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors flex items-center justify-between group/comp"
                    >
                      <span>Backup To Computer</span>
                      <Download className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover/comp:opacity-100 transition-opacity" />
                    </div>

                    {/* Backup To Drive */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('drive');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Backup To Drive
                    </div>

                    {/* Restore Backup */}
                    <div 
                      onClick={() => {
                        setActiveBackupModal('restore');
                        setIsOpen(false);
                      }}
                      className="px-3.5 py-1.5 pl-10 pr-3 text-slate-300 hover:bg-[#1e293b] hover:text-white cursor-pointer transition-colors"
                    >
                      Restore Backup
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Dropdown */}
            {isSettingsAllowed && (
              <div className="group relative">
                <div 
                  onClick={(e) => {
                    if (isCollapsed) {
                      navigate('/settings');
                      setIsOpen(false);
                    } else {
                      toggleDropdown('Settings', e);
                    }
                  }}
                  title={isCollapsed ? "Settings" : undefined}
                  className={cn(
                    'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                    isCollapsed ? 'justify-center p-2.5 mx-auto' : 'justify-between px-3 py-2 min-h-[40px]',
                    (expandedMenus['Settings'] || location.pathname === '/settings')
                      ? 'bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50 shadow-xs' 
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  )}
                >
                  <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center" : "gap-3")}>
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      (expandedMenus['Settings'] || location.pathname === '/settings')
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "bg-slate-800/80 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800"
                    )}>
                      <Settings className="w-4 h-4" />
                    </div>
                    {!isCollapsed && <span className="truncate text-[13px] font-semibold">Settings</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expandedMenus['Settings'] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsed Hover Flyout Menu */}
                {isCollapsed && (
                  <div className="absolute left-[54px] top-0 hidden group-hover:block z-50 bg-[#0f172a] border border-slate-700 shadow-2xl rounded-xl py-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-2">
                        <Settings className="w-3.5 h-3.5 text-blue-400" />
                        Settings
                      </span>
                    </div>
                    <div className="py-1 max-h-[360px] overflow-y-auto">
                      {SETTINGS_TABS.map((tab) => {
                        const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                        const currentTabParam = new URLSearchParams(location.search).get('tab');
                        const activeResolvedKey = resolveTabKey(currentTabParam);
                        const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                        return (
                          <div
                            key={tab.key}
                            onClick={() => {
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className={cn(
                              "px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors",
                              isSubActive ? "bg-slate-800 text-white font-bold" : "text-slate-300 hover:text-white"
                            )}
                          >
                            <span className="truncate">{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600/80 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedMenus['Settings'] && !isCollapsed && (
                  <div className="bg-[#0b101d] py-1.5 my-1 rounded-xl border border-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150 space-y-0.5">
                    {SETTINGS_TABS.map((tab) => {
                      const subPath = `/settings?tab=${encodeURIComponent(tab.key)}`;
                      const currentTabParam = new URLSearchParams(location.search).get('tab');
                      const activeResolvedKey = resolveTabKey(currentTabParam);
                      const isSubActive = location.pathname === '/settings' && activeResolvedKey === tab.key;
                      return (
                        <div
                          key={tab.key}
                          onClick={() => {
                            navigate(subPath);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between px-3 py-1.5 mx-1.5 rounded-lg transition-colors text-[12.5px] font-medium cursor-pointer select-none',
                            isSubActive
                              ? 'bg-blue-600/20 text-blue-300 font-bold'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                          )}
                        >
                          <NavLink
                            to={subPath}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(subPath);
                              setIsOpen(false);
                            }}
                            className="flex-1 truncate flex items-center justify-between"
                          >
                            <span>{tab.label}</span>
                            {tab.badge && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600/80 text-white text-[9px] font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Plans & Pricing */}
            {userPreferences?.menuVisibility?.pricing !== false && (
              <NavLink 
                to="/pricing"
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? "Plans & Pricing" : undefined}
                className={({ isActive }) => cn(
                  'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2 min-h-[40px]',
                  isActive 
                    ? 'bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50 shadow-xs' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800/80 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-white">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                {!isCollapsed && <span className="truncate text-[13px] font-semibold">Plans & Pricing</span>}
              </NavLink>
            )}

            {/* Share Feedback */}
            {userPreferences?.menuVisibility?.feedback !== false && (
              <NavLink 
                to="/feedback"
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? "Share Feedback" : undefined}
                className={({ isActive }) => cn(
                  'flex items-center transition-all duration-150 font-medium cursor-pointer rounded-xl',
                  isCollapsed ? 'justify-center p-2.5 mx-auto' : 'gap-3 px-3 py-2 min-h-[40px]',
                  isActive 
                    ? 'bg-blue-600/20 text-white font-bold ring-1 ring-blue-500/50 shadow-xs' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800/80 flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:text-white">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                {!isCollapsed && <span className="truncate text-[13px] font-semibold">Share Feedback</span>}
              </NavLink>
            )}

          </div>
        </nav>
        )}

        {/* Multi-Browser & Cloud Sync Status Badge */}
        <div className={cn(
          "border-t border-slate-800/90 bg-[#060a12] transition-all",
          isCollapsed ? "p-2 flex flex-col items-center justify-center" : "px-3.5 py-2.5 flex items-center justify-between"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : syncStatus === 'syncing' ? "bg-amber-400" : "bg-rose-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  syncStatus === 'synced' ? "bg-emerald-500" : syncStatus === 'syncing' ? "bg-amber-500" : "bg-rose-500"
                )}></span>
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-slate-200 truncate flex items-center gap-1">
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Multi-Browser Live'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Tabs & cloud active</p>
              </div>
            </div>
          ) : (
            <div title="Multi-Browser Sync Active" className="flex items-center justify-center p-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  syncStatus === 'synced' ? "bg-emerald-400" : "bg-amber-400"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  syncStatus === 'synced' ? "bg-emerald-500" : "bg-amber-500"
                )}></span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Force Sync Across All Tabs & Connected Browsers"
              className={cn(
                "px-2.5 py-1 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs font-semibold",
                isCollapsed ? "mt-1.5" : ""
              )}
            >
              <RefreshCw className={cn("w-3 h-3 text-blue-400", isSyncing && "animate-spin")} />
              {!isCollapsed && <span className="text-[10.5px]">Sync</span>}
            </button>
          </div>
        </div>

        {/* Desktop Collapse / Expand Toggle Bar */}
        <div className="hidden lg:flex items-center justify-between p-2 border-t border-slate-800/90 bg-[#080d19] text-slate-400">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-2">
              Collapse Sidebar
            </span>
          )}
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mx-auto flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title={isCollapsed ? "Expand Sidebar (Full labels)" : "Collapse Sidebar (Compact icons)"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Backup & Restore Interactive Modals */}
      <BackupModals 
        activeModal={activeBackupModal} 
        onClose={() => setActiveBackupModal(null)} 
      />

      {/* Company Profile Modal */}
      <CompanyProfileModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)} 
      />
    </>
  );
};
