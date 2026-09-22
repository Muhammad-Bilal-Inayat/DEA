import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, ArrowDownRight, ShoppingCart, 
  ChevronDown, Flame, TrendingUp, AlertTriangle, 
  Package, PlusCircle, CheckCircle2, Eye, EyeOff, 
  ExternalLink, Layers, DollarSign, Wallet, ShieldCheck,
  Calendar, Zap, ChevronRight, BarChart3, Maximize2, Minimize2,
  RotateCcw, SlidersHorizontal, Sparkles, Printer, Clock, FileText,
  LayoutGrid, Columns, Save, Check, RefreshCw, Filter, HelpCircle,
  Lock, ShieldAlert, GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableDashboardWidget } from '../components/dashboard/SortableDashboardWidget';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { v4 as uuidv4 } from 'uuid';
import { dbMedicines, dbInvoices, dbPurchaseOrders, dbSuppliers, dbExpenses, dbAppUsers, dbCashierShifts, dbShortageItems, dbBankAccounts } from '../lib/db';
import { saveRecordToFirestore } from '../lib/firebase';
import { Medicine, Invoice, PurchaseOrder, Supplier, Expense, BankAccount, DashboardLayoutPreferences, CashierShift, DashboardAggregatedSummary, SanitizedSaleSummary, TopProductSummary, LowStockAlertSummary, NearExpiryAlertSummary, ShortageItemRecord } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { calculateDaysUntilExpiry } from '../lib/fefoEngine';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { emitToast } from '../contexts/ToastContext';
import { 
  WidgetCustomizerModal, 
  ALL_DASHBOARD_WIDGETS, 
  DEFAULT_WIDGET_VISIBILITY,
  DEFAULT_MAIN_SECTIONS,
  DEFAULT_SIDEBAR_SECTIONS
} from '../components/dashboard/WidgetCustomizerModal';
import { 
  PharmacyKpiMetricsWidget, 
  WeeklySalesTrajectoryWidget, 
  TherapeuticCategoryMixWidget, 
  HourlyRushVelocityWidget, 
  FastSkusMarginMatrixWidget, 
  PharmacyErpAnalyticsHubWidget 
} from '../components/dashboard/PharmacyErpWidgets';
import { InvoicePrintModal } from '../components/sales/InvoicePrintModal';
import { AddSaleModal } from '../components/sales/AddSaleModal';
import { MobileDashboardView } from '../components/dashboard/MobileDashboardView';
import { getDashboardSummaryMetrics } from '../lib/quickTransactionService';
import { DashboardSummaryService } from '../lib/dashboardSummaryService';

interface TopProduct {
  id: string;
  name: string;
  manufacturer: string;
  batchNumber: string;
  unitsSold: number;
  totalRevenue: number;
  currentStock: number;
  lowStockThreshold: number;
  sellingPrice: number;
}

const mockChartData = [
  { name: '01 Sep', value: 0 },
  { name: '05 Sep', value: 0 },
  { name: '10 Sep', value: 0 },
  { name: '15 Sep', value: 0 },
  { name: '20 Sep', value: 0 },
  { name: '25 Sep', value: 0 },
  { name: '30 Sep', value: 0 },
];

// Available Section IDs and Metadata
export const SECTION_METADATA: Record<string, { title: string; category: string; description: string; defaultColSpan: string }> = {
  pharmacy_erp_kpi_metrics: {
    title: 'Executive Pharmacy KPI Metrics',
    category: 'Financials & Profit',
    description: 'Top overview banner with Weekly Revenue, Gross Profit Margin, Invoices Cleared speed, and FEFO 99.8% Zero Loss tracking',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  pharmacy_erp_analytics_hub: {
    title: 'Pharmacy ERP Analytics Hub',
    category: 'Financials & Profit',
    description: 'Switchable multi-tab analytics engine with 7-Day Sales Trend, Category Mix, Rush Hours Velocity, and Fast SKUs Matrix',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  weekly_revenue_trajectory: {
    title: 'Weekly Revenue & Bill Trajectory',
    category: 'Financials & Profit',
    description: 'Daily counter performance across all active retail terminals with automatic peak day tagging and basket ticket stats',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  therapeutic_category_mix: {
    title: 'Therapeutic Drug Category Mix',
    category: 'Inventory & Alerts',
    description: 'Segmented stock mix donut chart, categorical sales breakdown, and margin percentages across drug classes',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  hourly_rush_velocity: {
    title: 'Hourly Rush Hours Velocity',
    category: 'Operations',
    description: 'Identifies dual-peak doctor consultant rush hours (Morning & Evening) with automated cashier staffing recommendations',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  fast_skus_margin_matrix: {
    title: 'Fast SKUs & Profit Margins',
    category: 'Sales & Cashflow',
    description: 'Real-time stock turnover rates, monthly consumption velocity, supplier profit margins, and remaining stock',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  fefo_expiry_status: {
    title: 'FEFO Expiry Status Tracker',
    category: 'Inventory & Alerts',
    description: 'First-Expiry First-Out status tracking medicines expiring in 30, 60, 90, and 180 days with batch metrics',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  todays_profit: {
    title: "Today's Profit & Margins",
    category: 'Financials & Profit',
    description: "Real-time net earnings, gross profit margin %, and daily turnover comparison",
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-8',
  },
  recent_sales: {
    title: 'Recent Sales Invoices',
    category: 'Sales Activity',
    description: 'Latest recorded sales transactions with customer info and quick invoice reprint',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-8',
  },
  low_stock_alerts: {
    title: 'Low Stock Alerts',
    category: 'Inventory Alerts',
    description: 'Urgent inventory restock alerts for items at or below minimum threshold',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
  expiry_alerts: {
    title: 'Expiry Batch Alerts',
    category: 'Inventory Safety',
    description: 'Nearing expiry medicines and batch risk tracking',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
  reorder_suggestions: {
    title: 'Smart Reorder Predictor',
    category: 'Inventory Procurement',
    description: 'Historical consumption velocity predictor with automatic restock quantities and 1-click Shortage Registry push',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
  sales_trend: {
    title: 'Sales Reports & Trend Analysis',
    category: 'Analytics & Revenue',
    description: 'Daily and weekly revenue patterns and peak pharmacy demand',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-8',
  },
  sales_expenses: {
    title: 'Sales & Expenses Summary',
    category: 'Financial Overview',
    description: 'Total billing turnover and operational pharmacy expenses',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-8',
  },
  receivables_payables: {
    title: 'Receivables, Payables & POs',
    category: 'Cashflow',
    description: 'Customer balances, supplier payables and stock POs',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-12',
  },
  top_products: {
    title: 'Top Selling Products',
    category: 'Product Movement',
    description: 'High-demand pharmaceutical items and quick sell action',
    defaultColSpan: 'col-span-12 lg:col-span-12 xl:col-span-8',
  },
  stock_inventory: {
    title: 'Stock Inventory Value',
    category: 'Valuation',
    description: 'Total stock value and active catalog items count',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
  bank_accounts: {
    title: 'Cash & Bank Accounts',
    category: 'Banking',
    description: 'Counter cash-in-hand and Meezan/HBL bank balances',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
  privacy_mode: {
    title: 'Privacy & Display Mode',
    category: 'Security',
    description: 'Quick toggle to mask customer currency figures',
    defaultColSpan: 'col-span-12 lg:col-span-6 xl:col-span-4',
  },
};

export const ALL_MAIN_SECTIONS = DEFAULT_MAIN_SECTIONS;
export const ALL_SIDEBAR_SECTIONS = DEFAULT_SIDEBAR_SECTIONS;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    settings, 
    userPreferences, 
    updateUserPreferences,
    dashboardWidgets,
    dashboardMainOrder,
    dashboardSidebarOrder,
    updateDashboardWidgetVisibility,
    updateDashboardWidgetOrder,
    reorderDashboardSection,
    moveDashboardWidgetZone,
    resetDashboardWidgets,
  } = useSettings();
  const { userProfile, activeUser, currentUser } = useAuth();
  
  const userId = activeUser?.id || userProfile?.id || currentUser?.uid || 'default_user';

  // Privacy Mode
  const [privacyMode, setPrivacyMode] = useState(() => userPreferences?.privacyMode ?? (localStorage.getItem('mbi_privacy_mode') === 'true'));

  useEffect(() => {
    if (userPreferences?.privacyMode !== undefined) {
      setPrivacyMode(userPreferences.privacyMode);
    }
  }, [userPreferences?.privacyMode]);

  const togglePrivacy = (val?: boolean) => {
    const nextVal = typeof val === 'boolean' ? val : !privacyMode;
    setPrivacyMode(nextVal);
    updateUserPreferences({ privacyMode: nextVal });
    localStorage.setItem('mbi_privacy_mode', String(nextVal));
  };

  const [timeFilter, setTimeFilter] = useState<'This Month' | 'Today' | 'This Week' | 'This Year'>('This Month');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Medicine[]>([]);
  
  const [totalSale, setTotalSale] = useState(0);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [salesTrendView, setSalesTrendView] = useState<'daily' | 'weekly'>('daily');
  const [expiryThresholdDays, setExpiryThresholdDays] = useState<number>(() => userPreferences?.expiryThreshold ?? 60);
  const [pushedShortageIds, setPushedShortageIds] = useState<Set<string>>(new Set());
  const [isBulkPushingShortage, setIsBulkPushingShortage] = useState(false);

  // Sanitizers to prevent stale/invalid widget keys or empty dashboard state
  const sanitizeMain = (order?: string[]): string[] => {
    if (!order || !Array.isArray(order)) return DEFAULT_MAIN_SECTIONS;
    const allIds = new Set(ALL_DASHBOARD_WIDGETS.map(w => w.id));
    const valid = order.filter(id => allIds.has(id));
    return valid.length > 0 ? valid : DEFAULT_MAIN_SECTIONS;
  };

  const sanitizeSidebar = (order?: string[]): string[] => {
    if (!order || !Array.isArray(order)) return DEFAULT_SIDEBAR_SECTIONS;
    const allIds = new Set(ALL_DASHBOARD_WIDGETS.map(w => w.id));
    const valid = order.filter(id => allIds.has(id));
    return valid.length > 0 ? valid : DEFAULT_SIDEBAR_SECTIONS;
  };

  const sanitizeVis = (vis?: Record<string, boolean>): Record<string, boolean> => {
    const validKeys = new Set(ALL_DASHBOARD_WIDGETS.map(w => w.id));
    const result: Record<string, boolean> = { ...DEFAULT_WIDGET_VISIBILITY };
    if (vis && typeof vis === 'object') {
      Object.entries(vis).forEach(([k, v]) => {
        if (validKeys.has(k)) {
          result[k] = Boolean(v);
        }
      });
    }
    return result;
  };

  // Widget Customization, Ordering & Persistence
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() => {
    if (userPreferences?.dashboardWidgets) {
      return sanitizeVis(userPreferences.dashboardWidgets);
    }
    try {
      const saved = localStorage.getItem('mbi_dashboard_widgets_v2');
      if (saved) {
        return sanitizeVis(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load widget preferences:', e);
    }
    return DEFAULT_WIDGET_VISIBILITY;
  });

  const [mainOrder, setMainOrder] = useState<string[]>(() => {
    if (userPreferences?.dashboardMainOrder && userPreferences.dashboardMainOrder.length > 0) {
      return sanitizeMain(userPreferences.dashboardMainOrder);
    }
    try {
      const saved = localStorage.getItem('mbi_dashboard_main_order_v3');
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeMain(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load main section order:', e);
    }
    return DEFAULT_MAIN_SECTIONS;
  });

  const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
    if (userPreferences?.dashboardSidebarOrder && userPreferences.dashboardSidebarOrder.length > 0) {
      return sanitizeSidebar(userPreferences.dashboardSidebarOrder);
    }
    try {
      const saved = localStorage.getItem('mbi_dashboard_sidebar_order_v3');
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeSidebar(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load sidebar section order:', e);
    }
    return DEFAULT_SIDEBAR_SECTIONS;
  });

  // Sync state when userPreferences change from external source (e.g. user switch, firm switch, or cloud sync)
  useEffect(() => {
    if (userPreferences?.dashboardWidgets) {
      setWidgetVisibility(sanitizeVis(userPreferences.dashboardWidgets));
    }
    if (userPreferences?.dashboardMainOrder?.length) {
      setMainOrder(sanitizeMain(userPreferences.dashboardMainOrder));
    }
    if (userPreferences?.dashboardSidebarOrder?.length) {
      setSidebarOrder(sanitizeSidebar(userPreferences.dashboardSidebarOrder));
    }
    if (userPreferences?.expiryThreshold) {
      setExpiryThresholdDays(userPreferences.expiryThreshold);
    }
  }, [userPreferences]);

  const updateWidgetVisibility = (id: string, visible: boolean) => {
    const next = { ...widgetVisibility, [id]: visible };
    setWidgetVisibility(next);
    updateDashboardWidgetVisibility(id, visible);
    localStorage.setItem('mbi_dashboard_widgets_v2', JSON.stringify(next));
    emitToast(`Widget ${visible ? 'shown' : 'hidden'}`, 'info');
  };

  const applyWidgetPreset = (newVisibility: Record<string, boolean>) => {
    setWidgetVisibility(newVisibility);
    updateUserPreferences({ dashboardWidgets: newVisibility });
    localStorage.setItem('mbi_dashboard_widgets_v2', JSON.stringify(newVisibility));
    emitToast('Widget preset applied successfully', 'success');
  };

  const resetWidgetDefaults = () => {
    setWidgetVisibility(DEFAULT_WIDGET_VISIBILITY);
    resetDashboardWidgets();
    localStorage.setItem('mbi_dashboard_widgets_v2', JSON.stringify(DEFAULT_WIDGET_VISIBILITY));
    emitToast('Dashboard widgets reset to default', 'info');
  };

  const handleChangeOrder = (newMainOrder: string[], newSidebarOrder: string[]) => {
    setMainOrder(newMainOrder);
    setSidebarOrder(newSidebarOrder);
    updateDashboardWidgetOrder(newMainOrder, newSidebarOrder);
    localStorage.setItem('mbi_dashboard_main_order_v3', JSON.stringify(newMainOrder));
    localStorage.setItem('mbi_dashboard_sidebar_order_v3', JSON.stringify(newSidebarOrder));
    emitToast('Widget sequence updated (Tarteeb save ho gayi)', 'success');
  };

  const handleResetOrder = () => {
    setMainOrder(DEFAULT_MAIN_SECTIONS);
    setSidebarOrder(DEFAULT_SIDEBAR_SECTIONS);
    updateDashboardWidgetOrder(DEFAULT_MAIN_SECTIONS, DEFAULT_SIDEBAR_SECTIONS);
    localStorage.setItem('mbi_dashboard_main_order_v3', JSON.stringify(DEFAULT_MAIN_SECTIONS));
    localStorage.setItem('mbi_dashboard_sidebar_order_v3', JSON.stringify(DEFAULT_SIDEBAR_SECTIONS));
    emitToast('Widget sequence reset to default order', 'info');
  };

  // Drag & drop sensors and handlers for dashboard rearrangement
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeInMain = mainOrder.includes(activeId);
    const overInMain = mainOrder.includes(overId);
    const activeInSidebar = sidebarOrder.includes(activeId);
    const overInSidebar = sidebarOrder.includes(overId);

    // Case 1: Reorder inside Main column
    if (activeInMain && overInMain) {
      const oldIndex = mainOrder.indexOf(activeId);
      const newIndex = mainOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextMain = arrayMove(mainOrder, oldIndex, newIndex);
        handleChangeOrder(nextMain, sidebarOrder);
      }
      return;
    }

    // Case 2: Reorder inside Sidebar column
    if (activeInSidebar && overInSidebar) {
      const oldIndex = sidebarOrder.indexOf(activeId);
      const newIndex = sidebarOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextSidebar = arrayMove(sidebarOrder, oldIndex, newIndex);
        handleChangeOrder(mainOrder, nextSidebar);
      }
      return;
    }

    // Case 3: Move from Main to Sidebar
    if (activeInMain && overInSidebar) {
      const nextMain = mainOrder.filter(id => id !== activeId);
      const targetIndex = sidebarOrder.indexOf(overId);
      const nextSidebar = [...sidebarOrder];
      nextSidebar.splice(targetIndex >= 0 ? targetIndex : nextSidebar.length, 0, activeId);
      handleChangeOrder(nextMain, nextSidebar);
      return;
    }

    // Case 4: Move from Sidebar to Main
    if (activeInSidebar && overInMain) {
      const nextSidebar = sidebarOrder.filter(id => id !== activeId);
      const targetIndex = mainOrder.indexOf(overId);
      const nextMain = [...mainOrder];
      nextMain.splice(targetIndex >= 0 ? targetIndex : nextMain.length, 0, activeId);
      handleChangeOrder(nextMain, nextSidebar);
      return;
    }
  };

  const handleNudgeWidget = (zone: 'main' | 'sidebar', index: number, direction: 'up' | 'down') => {
    const list = zone === 'main' ? [...mainOrder] : [...sidebarOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const nextList = arrayMove(list, index, targetIndex);
    if (zone === 'main') {
      handleChangeOrder(nextList, sidebarOrder);
    } else {
      handleChangeOrder(mainOrder, nextList);
    }
  };

  const handleSwitchWidgetZone = (widgetId: string) => {
    if (mainOrder.includes(widgetId)) {
      const nextMain = mainOrder.filter(id => id !== widgetId);
      const nextSidebar = [...sidebarOrder, widgetId];
      handleChangeOrder(nextMain, nextSidebar);
    } else if (sidebarOrder.includes(widgetId)) {
      const nextSidebar = sidebarOrder.filter(id => id !== widgetId);
      const nextMain = [...mainOrder, widgetId];
      handleChangeOrder(nextMain, nextSidebar);
    }
  };

  // Key Metrics State: Today's Profit, Recent Sales, Low Stock Filter
  const [todayMetrics, setTodayMetrics] = useState({
    todaySale: 0,
    todayCogs: 0,
    todayExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    profitMargin: 0,
    todayInvoicesCount: 0,
  });
  const [activeCashierShift, setActiveCashierShift] = useState<CashierShift | null>(null);
  const [recentSales, setRecentSales] = useState<SanitizedSaleSummary[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertSummary[]>([]);
  const [nearExpiryAlerts, setNearExpiryAlerts] = useState<NearExpiryAlertSummary[]>([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState<'all' | 'critical' | 'out_of_stock'>('all');
  const [smartAlertFilter, setSmartAlertFilter] = useState<'all' | 'critical' | 'depleting'>('all');
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);

  const [dailySalesData, setDailySalesData] = useState([
    { name: 'Mon', sales: 0 },
    { name: 'Tue', sales: 0 },
    { name: 'Wed', sales: 0 },
    { name: 'Thu', sales: 0 },
    { name: 'Fri', sales: 0 },
    { name: 'Sat', sales: 0 },
    { name: 'Sun', sales: 0 },
  ]);

  const [weeklySalesData, setWeeklySalesData] = useState([
    { name: 'Week 1', sales: 0 },
    { name: 'Week 2', sales: 0 },
    { name: 'Week 3', sales: 0 },
    { name: 'Week 4', sales: 0 },
  ]);

  useEffect(() => {
    loadDashboardData();

    // Realtime Cloud Firestore snapshot listener for aggregated summaries
    const tenantId = settings?.general?.firms?.[0]?.name || 'default-tenant';
    const unsubscribeCloud = DashboardSummaryService.subscribeToSummary(
      tenantId,
      timeFilter,
      (cloudSummary) => {
        applySummaryData(cloudSummary);
      }
    );

    const handleSyncUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('mbi-data-synced', handleSyncUpdate);
    window.addEventListener('mbi-local-db-change', handleSyncUpdate);
    window.addEventListener('dashboard-metrics-updated', handleSyncUpdate);
    window.addEventListener('quick-transaction-saved', handleSyncUpdate);
    window.addEventListener('storage', handleSyncUpdate);

    return () => {
      unsubscribeCloud();
      window.removeEventListener('mbi-data-synced', handleSyncUpdate);
      window.removeEventListener('mbi-local-db-change', handleSyncUpdate);
      window.removeEventListener('dashboard-metrics-updated', handleSyncUpdate);
      window.removeEventListener('quick-transaction-saved', handleSyncUpdate);
      window.removeEventListener('storage', handleSyncUpdate);
    };
  }, [timeFilter, settings?.general?.firms]);

  const applySummaryData = (summary: DashboardAggregatedSummary) => {
    setTotalSale(summary.totalSale ?? 0);
    setTotalPurchase(summary.totalPurchase ?? 0);
    setTotalExpenses(summary.totalExpenses ?? 0);
    setStockValue(summary.stockValue ?? 0);
    setTotalReceivables(summary.receivablesTotal ?? 0);
    setTotalPayables(summary.payablesTotal ?? 0);
    if (summary.todayMetrics) {
      setTodayMetrics(summary.todayMetrics);
    }
    if (summary.topProducts) {
      setTopProducts(summary.topProducts);
    }
    if (summary.lowStockAlerts) {
      setLowStockAlerts(summary.lowStockAlerts);
    }
    if (summary.nearExpiryAlerts) {
      setNearExpiryAlerts(summary.nearExpiryAlerts);
    }
    if (summary.recentSales) {
      setRecentSales(summary.recentSales);
    }
    if (summary.salesTrend?.daily && summary.salesTrend.daily.length > 0) {
      setDailySalesData(summary.salesTrend.daily);
    }
    if (summary.salesTrend?.weekly && summary.salesTrend.weekly.length > 0) {
      setWeeklySalesData(summary.salesTrend.weekly);
    }
  };

  const loadDashboardData = async () => {
    try {
      const tenantId = settings?.general?.firms?.[0]?.name || 'default-tenant';
      const summary = await DashboardSummaryService.getSummary(tenantId, timeFilter);
      applySummaryData(summary);

      // Load full catalog, invoices, orders, suppliers, expenses and bank accounts
      const [allMeds, allInvs, allPOs, allSups, allExps, allBanks, shiftsData] = await Promise.all([
        dbMedicines.getAll().catch(() => []),
        dbInvoices.getAll().catch(() => []),
        dbPurchaseOrders.getAll().catch(() => []),
        dbSuppliers.getAll().catch(() => []),
        dbExpenses.getAll().catch(() => []),
        dbBankAccounts.getAll().catch(() => []),
        dbCashierShifts.getAll().catch(() => [])
      ]);
      setMedicines(allMeds || []);
      setInvoices(allInvs || []);
      setPurchaseOrders(allPOs || []);
      setSuppliers(allSups || []);
      setExpenses(allExps || []);
      setBankAccounts(allBanks || []);

      // Fetch active cashier shift
      const openShift = shiftsData.find(s => s.status === 'open') || null;
      setActiveCashierShift(openShift);
    } catch (e) {
      console.warn('Dashboard summary loading fallback notice:', e);
    }
  };

  const handlePrintInvoice = async (invSummary: SanitizedSaleSummary) => {
    try {
      const fullInvoice = await dbInvoices.getById(invSummary.id);
      if (fullInvoice) {
        setPrintInvoice(fullInvoice);
        setIsPrintModalOpen(true);
        return;
      }
    } catch {}
    
    // Construct minimal invoice wrapper if offline or missing
    const fallbackInv: Invoice = {
      id: invSummary.id,
      invoiceNumber: invSummary.invoiceNumber,
      date: invSummary.date,
      customerName: invSummary.partyName || 'Walk-in Customer',
      customerPhone: invSummary.customerPhone,
      transactionType: 'Sale',
      paymentType: (invSummary.paymentMode as any) || 'Cash',
      grandTotal: invSummary.grandTotal,
      balanceDue: invSummary.balanceAmount,
      receivedAmount: invSummary.paidAmount,
      items: [],
      subTotal: invSummary.grandTotal,
    };
    setPrintInvoice(fallbackInv);
    setIsPrintModalOpen(true);
  };

  const maskValue = (value: number | string, prefix = 'Rs ') => {
    if (privacyMode) {
      return '••••••';
    }
    if (typeof value === 'number') {
      return `${prefix}${value.toLocaleString('en-PK')}`;
    }
    return value;
  };

  const receivablesList = useMemo(() => {
    const list: Array<{ name: string; amount: number; phone: string }> = [];
    suppliers.forEach(sup => {
      const bal = Number(sup.balance) || 0;
      if (bal > 0) {
        list.push({
          name: sup.name,
          amount: bal,
          phone: sup.phone || (sup as any).mobile || ''
        });
      }
    });

    if (list.length === 0) {
      const customerDues: Record<string, { amount: number; phone: string }> = {};
      invoices.forEach(inv => {
        const due = Number(inv.balanceDue) || 0;
        if (due > 0) {
          const cName = inv.customerName || (inv as any).partyName || 'Customer';
          if (!customerDues[cName]) {
            customerDues[cName] = { amount: 0, phone: inv.customerPhone || '' };
          }
          customerDues[cName].amount += due;
        }
      });
      Object.entries(customerDues).forEach(([name, val]) => {
        list.push({ name, amount: val.amount, phone: val.phone });
      });
    }

    return list.sort((a, b) => b.amount - a.amount);
  }, [suppliers, invoices]);

  const payablesList = useMemo(() => {
    const list: Array<{ name: string; amount: number; phone: string }> = [];
    suppliers.forEach(sup => {
      const bal = Number(sup.balance) || 0;
      if (bal < 0) {
        list.push({
          name: sup.name,
          amount: Math.abs(bal),
          phone: sup.phone || (sup as any).mobile || ''
        });
      }
    });
    return list.sort((a, b) => b.amount - a.amount);
  }, [suppliers]);

  const purchaseList = useMemo(() => {
    return purchaseOrders.slice(0, 5).map(po => ({
      name: po.supplierName || (po.items && po.items[0]?.name) || `PO #${po.orderNumber || po.id.slice(0, 6)}`,
      amount: Number(po.totalAmount) || 0,
      qty: `${po.items?.length || 1} items`
    }));
  }, [purchaseOrders]);

  const effectiveReceivables = useMemo(() => {
    return totalReceivables || receivablesList.reduce((sum, r) => sum + r.amount, 0);
  }, [totalReceivables, receivablesList]);

  const effectivePayables = useMemo(() => {
    return totalPayables || payablesList.reduce((sum, p) => sum + p.amount, 0);
  }, [totalPayables, payablesList]);

  const totalBankBalance = useMemo(() => {
    return bankAccounts.reduce((sum, b) => sum + (Number(b.currentBalance ?? b.openingBalance) || 0), 0);
  }, [bankAccounts]);

  const cashInHandBalance = useMemo(() => {
    if (activeCashierShift) {
      return Number((activeCashierShift as any).cashBalance ?? activeCashierShift.openingCash ?? activeCashierShift.openingBalance) || 0;
    }
    return Math.max(0, (todayMetrics.todaySale || 0) - (todayMetrics.todayExpenses || 0));
  }, [activeCashierShift, todayMetrics]);

  // FEFO (First Expiry, First Out) Status & Breakdown Calculations
  const fefoStatusMetrics = useMemo(() => {
    let expiredQty = 0;
    let expiredCount = 0;
    let expiredValuation = 0;

    let within30Qty = 0;
    let within30Count = 0;
    let within30Valuation = 0;

    let within60Qty = 0;
    let within60Count = 0;
    let within60Valuation = 0;

    let within90Qty = 0;
    let within90Count = 0;
    let within90Valuation = 0;

    let within180Qty = 0;
    let within180Count = 0;
    let within180Valuation = 0;

    const nearBatches: Array<{
      id: string;
      medicineId: string;
      medicineName: string;
      batchNumber: string;
      expiryDate: string;
      daysLeft: number;
      quantity: number;
      valuation: number;
      category: 'EXPIRED' | '30_DAYS' | '60_DAYS' | '90_DAYS' | '180_DAYS';
    }> = [];

    medicines.forEach(med => {
      const batches = (med.batches && med.batches.length > 0)
        ? med.batches
        : [{
            id: med.id,
            batchNumber: med.batchNumber || 'Batch-1',
            expiryDate: med.expiryDate || '',
            quantity: med.quantity || 0,
            purchasePrice: med.purchasePrice || 0,
            sellingPrice: med.sellingPrice || 0,
            mrp: med.mrp || 0
          }];

      batches.forEach(b => {
        const q = Number(b.quantity) || 0;
        if (q <= 0 || !b.expiryDate) return;
        const days = calculateDaysUntilExpiry(b.expiryDate);
        const costPrice = Number(b.purchasePrice || med.purchasePrice || b.sellingPrice || 0);
        const val = q * costPrice;

        if (days < 0) {
          expiredQty += q;
          expiredCount += 1;
          expiredValuation += val;
          nearBatches.push({
            id: `${med.id}-${b.batchNumber}`,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysLeft: days,
            quantity: q,
            valuation: val,
            category: 'EXPIRED'
          });
        } else if (days <= 30) {
          within30Qty += q;
          within30Count += 1;
          within30Valuation += val;
          nearBatches.push({
            id: `${med.id}-${b.batchNumber}`,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysLeft: days,
            quantity: q,
            valuation: val,
            category: '30_DAYS'
          });
        } else if (days <= 60) {
          within60Qty += q;
          within60Count += 1;
          within60Valuation += val;
          nearBatches.push({
            id: `${med.id}-${b.batchNumber}`,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysLeft: days,
            quantity: q,
            valuation: val,
            category: '60_DAYS'
          });
        } else if (days <= 90) {
          within90Qty += q;
          within90Count += 1;
          within90Valuation += val;
          nearBatches.push({
            id: `${med.id}-${b.batchNumber}`,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysLeft: days,
            quantity: q,
            valuation: val,
            category: '90_DAYS'
          });
        } else if (days <= 180) {
          within180Qty += q;
          within180Count += 1;
          within180Valuation += val;
          nearBatches.push({
            id: `${med.id}-${b.batchNumber}`,
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            daysLeft: days,
            quantity: q,
            valuation: val,
            category: '180_DAYS'
          });
        }
      });
    });

    nearBatches.sort((a, b) => a.daysLeft - b.daysLeft);
    const totalExpiryWatchQty = within30Qty + within60Qty + within90Qty + within180Qty;
    const totalExpiryWatchValuation = within30Valuation + within60Valuation + within90Valuation + within180Valuation;

    return {
      expiredQty,
      expiredCount,
      expiredValuation,
      within30Qty,
      within30Count,
      within30Valuation,
      within60Qty,
      within60Count,
      within60Valuation,
      within90Qty,
      within90Count,
      within90Valuation,
      within180Qty,
      within180Count,
      within180Valuation,
      totalExpiryWatchQty,
      totalExpiryWatchValuation,
      nearBatches: nearBatches.slice(0, 5)
    };
  }, [medicines]);

  // ================= RENDERERS FOR INDIVIDUAL SECTIONS =================

  {/* FEFO Expiry Status Tracking Widget */}
  const renderFEFOExpiryStatusWidget = () => (
    <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 hover:border-amber-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 leading-tight">FEFO Expiry Status Tracker</h3>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                  {settings.item?.stockRotationMethod || 'FEFO'} Rotation Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                First-Expiry First-Out inventory timeline monitoring batches expiring within 30, 60, 90, and 180 days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/reports?report=fefo_expiry')}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Open Detailed FEFO Expiry Report"
            >
              <span>Detailed Expiry Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateWidgetVisibility('fefo_expiry_status', false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Hide widget (restore anytime from Customize Widgets)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 FEFO Expiry Metric Cards (30, 60, 90, 180 Days) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          
          {/* Bucket 1: Next 30 Days */}
          <div 
            onClick={() => navigate('/reports?report=fefo_expiry')}
            title="Click to view medicines expiring in next 30 days"
            className="bg-rose-50/80 border border-rose-200 hover:border-rose-400 hover:bg-rose-100/70 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                Expiring ≤ 30 Days
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600" />
              </span>
              <span className="text-[10px] bg-rose-200 text-rose-900 font-black px-1.5 py-0.5 rounded">
                Critical
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-900 tracking-tight">
                  {fefoStatusMetrics.within30Qty.toLocaleString()}
                </span>
                <span className="text-xs text-rose-700 font-semibold">units</span>
              </div>
              <div className="text-[11px] text-rose-800 font-bold mt-0.5">
                {fefoStatusMetrics.within30Count} batches ({maskValue(fefoStatusMetrics.within30Valuation)})
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-rose-200/60 text-[10px] text-rose-700 font-medium">
              <span>Urgent clearance / return</span>
              <span className="font-bold">&rarr;</span>
            </div>
          </div>

          {/* Bucket 2: 31 - 60 Days */}
          <div 
            onClick={() => navigate('/reports?report=fefo_expiry')}
            title="Click to view medicines expiring in 31-60 days"
            className="bg-orange-50/80 border border-orange-200 hover:border-orange-400 hover:bg-orange-100/70 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
                Expiring 31-60 Days
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-orange-600" />
              </span>
              <span className="text-[10px] bg-orange-200 text-orange-900 font-black px-1.5 py-0.5 rounded">
                Warning
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-orange-900 tracking-tight">
                  {fefoStatusMetrics.within60Qty.toLocaleString()}
                </span>
                <span className="text-xs text-orange-700 font-semibold">units</span>
              </div>
              <div className="text-[11px] text-orange-800 font-bold mt-0.5">
                {fefoStatusMetrics.within60Count} batches ({maskValue(fefoStatusMetrics.within60Valuation)})
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-orange-200/60 text-[10px] text-orange-700 font-medium">
              <span>Prioritize rotation</span>
              <span className="font-bold">&rarr;</span>
            </div>
          </div>

          {/* Bucket 3: 61 - 90 Days */}
          <div 
            onClick={() => navigate('/reports?report=fefo_expiry')}
            title="Click to view medicines expiring in 61-90 days"
            className="bg-amber-50/80 border border-amber-200 hover:border-amber-400 hover:bg-amber-100/70 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                Expiring 61-90 Days
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded">
                Alert
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-900 tracking-tight">
                  {fefoStatusMetrics.within90Qty.toLocaleString()}
                </span>
                <span className="text-xs text-amber-700 font-semibold">units</span>
              </div>
              <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                {fefoStatusMetrics.within90Count} batches ({maskValue(fefoStatusMetrics.within90Valuation)})
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-amber-200/60 text-[10px] text-amber-700 font-medium">
              <span>Quarterly review</span>
              <span className="font-bold">&rarr;</span>
            </div>
          </div>

          {/* Bucket 4: 91 - 180 Days */}
          <div 
            onClick={() => navigate('/reports?report=fefo_expiry')}
            title="Click to view medicines expiring in 91-180 days"
            className="bg-blue-50/80 border border-blue-200 hover:border-blue-400 hover:bg-blue-100/70 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                Expiring 91-180 Days
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
              </span>
              <span className="text-[10px] bg-blue-200 text-blue-900 font-black px-1.5 py-0.5 rounded">
                Watchlist
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900 tracking-tight">
                  {fefoStatusMetrics.within180Qty.toLocaleString()}
                </span>
                <span className="text-xs text-blue-700 font-semibold">units</span>
              </div>
              <div className="text-[11px] text-blue-800 font-bold mt-0.5">
                {fefoStatusMetrics.within180Count} batches ({maskValue(fefoStatusMetrics.within180Valuation)})
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-blue-200/60 text-[10px] text-blue-700 font-medium">
              <span>6-Month horizon</span>
              <span className="font-bold">&rarr;</span>
            </div>
          </div>

        </div>

        {/* Urgent Near Expiry Batches Preview Table */}
        {fefoStatusMetrics.nearBatches.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
            <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Next Batches in FEFO Queue (Earliest Expiry First)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Total at-risk watch stock: <strong>{fefoStatusMetrics.totalExpiryWatchQty.toLocaleString()} units</strong> ({maskValue(fefoStatusMetrics.totalExpiryWatchValuation)})
              </span>
            </div>
            <div className="divide-y divide-slate-100 overflow-x-auto text-xs">
              {fefoStatusMetrics.nearBatches.map((item) => {
                const isExp = item.daysLeft < 0;
                const isCrit = item.daysLeft >= 0 && item.daysLeft <= 30;
                const isWarn = item.daysLeft > 30 && item.daysLeft <= 60;
                const isAlert = item.daysLeft > 60 && item.daysLeft <= 90;

                return (
                  <div 
                    key={item.id}
                    onClick={() => navigate('/reports?report=fefo_expiry')}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-amber-50/60 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">{item.medicineName}</span>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          Batch: {item.batchNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Exp: <strong className="font-mono text-slate-700">{item.expiryDate}</strong> • Available: <strong className="text-slate-800">{item.quantity} units</strong> • Value: <span>{maskValue(item.valuation)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isExp ? 'bg-rose-100 text-rose-800' :
                        isCrit ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        isWarn ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        isAlert ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {isExp ? `Expired (${Math.abs(item.daysLeft)}d ago)` : `${item.daysLeft} days left`}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/sale');
                        }}
                        className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold"
                        title="Sell via POS"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">
          FEFO ensures batches expiring first are allocated before newer inventory.
        </span>
        <button
          onClick={() => navigate('/reports?report=fefo_expiry')}
          className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
        >
          <span>Open Full FEFO Expiry Management Report</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  {/* Key Metric 1: Today's Profit & Margins Widget */}
  const renderTodaysProfitWidget = () => (
    <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">Today's Profit & Net Margins</h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Live Today
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real-time revenue, cost of goods sold (COGS), and pharmacy earnings</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Open Profit & Loss Report"
            >
              <span>P&L Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateWidgetVisibility('todays_profit', false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Hide widget (restore anytime from Customize Widgets)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          
          {/* Net Profit */}
          <div 
            id="dashboard-metric-net-profit"
            onClick={() => navigate('/reports?report=profit_loss')}
            title="Click to view Profit & Loss Report"
            className="bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-500 hover:bg-emerald-100/70 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider group-hover:text-emerald-950 flex items-center gap-1">
                Today's Net Profit
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
              </span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                +{todayMetrics.profitMargin}%
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-900 tracking-tight group-hover:text-emerald-950">
                {maskValue(todayMetrics.netProfit)}
              </span>
              {!privacyMode && <span className="text-xs text-emerald-700 font-medium">.00</span>}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-emerald-700 font-medium group-hover:underline">Net profit after COGS & expenses</span>
              <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
          </div>

          {/* Today's Sales */}
          <div 
            id="dashboard-metric-gross-sales"
            onClick={() => navigate('/sale')}
            title="Click to view Sale Invoices & Billing"
            className="bg-slate-50 border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-700 uppercase tracking-wider flex items-center gap-1 transition-colors">
                Gross Sales
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
              </span>
              <span className="text-[10px] bg-slate-200 group-hover:bg-blue-200 group-hover:text-blue-900 text-slate-700 font-bold px-1.5 py-0.5 rounded transition-colors">
                {todayMetrics.todayInvoicesCount} Invoices
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 group-hover:text-blue-950 tracking-tight transition-colors">
                {maskValue(todayMetrics.todaySale)}
              </span>
              {!privacyMode && <span className="text-xs text-slate-400 font-medium">.00</span>}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400 group-hover:text-blue-600 transition-colors group-hover:underline">Total revenue collected today</span>
              <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
          </div>

          {/* Stock COGS */}
          <div 
            id="dashboard-metric-stock-cogs"
            onClick={() => navigate('/purchase')}
            title="Click to view Purchases & Stock Valuation"
            className="bg-slate-50 border border-slate-200/80 hover:border-indigo-500 hover:bg-indigo-50/40 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1 transition-colors">
                Stock COGS
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
              </span>
              <span className="text-[10px] text-slate-500 group-hover:text-indigo-600 font-medium transition-colors">Purchase Cost</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800 group-hover:text-indigo-950 tracking-tight transition-colors">
                {maskValue(todayMetrics.todayCogs)}
              </span>
              {!privacyMode && <span className="text-xs text-slate-400 font-medium">.00</span>}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 transition-colors group-hover:underline">Wholesale acquisition batch cost</span>
              <span className="text-[10px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
          </div>

          {/* Today's Expenses */}
          <div 
            id="dashboard-metric-daily-expenses"
            onClick={() => navigate('/expenses')}
            title="Click to view Expenses Management"
            className="bg-slate-50 border border-slate-200/80 hover:border-purple-500 hover:bg-purple-50/40 hover:shadow-md rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 group-hover:text-purple-700 uppercase tracking-wider flex items-center gap-1 transition-colors">
                Daily Expenses
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
              </span>
              <span className="text-[10px] text-slate-500 group-hover:text-purple-600 font-medium transition-colors">Overhead</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800 group-hover:text-purple-950 tracking-tight transition-colors">
                {maskValue(todayMetrics.todayExpenses)}
              </span>
              {!privacyMode && <span className="text-xs text-slate-400 font-medium">.00</span>}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400 group-hover:text-purple-600 transition-colors group-hover:underline">Counter and utility operating costs</span>
              <span className="text-[10px] text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
            </div>
          </div>

        </div>

        {/* Visual Revenue Breakdown Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-slate-600">
            <span>Daily Financial Split</span>
            <button 
              onClick={() => navigate('/reports?report=profit_loss')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Gross Margin: {Math.round(((todayMetrics.grossProfit) / (todayMetrics.todaySale || 1)) * 100)}%</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div 
            onClick={() => navigate('/reports?report=profit_loss')}
            className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
            title="Click to view detailed Profit & Loss Report"
          >
            <div 
              style={{ width: `${Math.max(10, Math.min(85, todayMetrics.profitMargin))}%` }} 
              className="h-full bg-emerald-500 transition-all" 
              title={`Net Profit: ${todayMetrics.profitMargin}%`}
            />
            <div 
              style={{ width: `${Math.max(10, Math.min(75, 100 - todayMetrics.profitMargin - 6))}%` }} 
              className="h-full bg-blue-400 transition-all" 
              title="Stock Cost of Goods Sold (COGS)"
            />
            <div 
              style={{ width: `6%` }} 
              className="h-full bg-purple-400 transition-all" 
              title="Operating Expenses"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 flex-wrap gap-2">
            <button 
              onClick={() => navigate('/reports?report=profit_loss')}
              className="flex items-center gap-1.5 hover:text-emerald-700 font-medium transition-colors cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block group-hover:scale-110 transition-transform" />
              <span className="group-hover:underline">Net Profit ({todayMetrics.profitMargin}%)</span>
            </button>
            <button 
              onClick={() => navigate('/purchase')}
              className="flex items-center gap-1.5 hover:text-blue-700 font-medium transition-colors cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block group-hover:scale-110 transition-transform" />
              <span className="group-hover:underline">Stock Cost (COGS)</span>
            </button>
            <button 
              onClick={() => navigate('/expenses')}
              className="flex items-center gap-1.5 hover:text-purple-700 font-medium transition-colors cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block group-hover:scale-110 transition-transform" />
              <span className="group-hover:underline">Operating Expenses</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  {/* Key Metric 2: Recent Sales Widget */}
  const renderRecentSalesWidget = () => (
    <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200/80 hover:border-blue-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">Recent Sales</h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                  {invoices.length} Invoices Recorded
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Live transaction activity with customer details and instant invoice reprint</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/sale')}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
            <button
              onClick={() => updateWidgetVisibility('recent_sales', false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Hide widget (restore anytime from Customize Widgets)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer / Patient</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-center">Mode</th>
                <th className="py-2.5 px-3 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length > 0 ? (
                recentSales.map((inv) => {
                  const isCredit = inv.paymentMode === 'Credit' || (inv.balanceAmount && inv.balanceAmount > 0);
                  const itemCount = inv.itemsCount || 0;
                  const dateStr = inv.date ? new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Today';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 max-w-[180px] truncate">
                          {inv.partyName || 'Walk-in Customer'}
                        </div>
                        {inv.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {inv.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCredit ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isCredit ? 'Credit' : 'Cash'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        {maskValue(inv.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Print / View Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No recent sales invoices yet. Click "New Sale" to record an invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100">
          <span className="text-slate-400">Showing latest sales invoices with instant re-print</span>
          <button
            onClick={() => navigate('/sale')}
            className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Invoices in Sales Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  {/* Key Metric 3: Low Stock Alerts Widget */}
  const renderLowStockAlertsWidget = () => {
    const criticalItems = lowStockAlerts.filter(m => m.quantity <= 5 && m.quantity > 0);
    const outOfStockItems = lowStockAlerts.filter(m => m.quantity <= 0);
    
    let displayList = lowStockAlerts;
    if (lowStockFilter === 'critical') {
      displayList = criticalItems;
    } else if (lowStockFilter === 'out_of_stock') {
      displayList = outOfStockItems;
    }

    return (
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-h-[320px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Low Stock Alerts</h3>
                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                    {lowStockAlerts.length}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Inventory at or below reorder threshold</span>
              </div>
            </div>

            <button
              onClick={() => updateWidgetVisibility('low_stock_alerts', false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Hide widget (restore anytime from Customize Widgets)"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 my-2.5 text-[11px]">
            <button
              onClick={() => setLowStockFilter('all')}
              className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                lowStockFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({lowStockAlerts.length})
            </button>
            <button
              onClick={() => setLowStockFilter('critical')}
              className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                lowStockFilter === 'critical' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Critical ({criticalItems.length})
            </button>
            <button
              onClick={() => setLowStockFilter('out_of_stock')}
              className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                lowStockFilter === 'out_of_stock' 
                  ? 'bg-red-700 text-white shadow-xs' 
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Out of Stock ({outOfStockItems.length})
            </button>
          </div>

          {/* List */}
          <div className="space-y-2 mt-2 max-h-[230px] overflow-y-auto pr-1">
            {displayList.length > 0 ? (
              displayList.map(med => {
                const threshold = med.lowStockThreshold || 20;
                const isOutOfStock = med.quantity <= 0;
                const isCritical = med.quantity > 0 && med.quantity <= 5;
                const suggestedOrderQty = Math.max((threshold * 2) - med.quantity, 15);

                return (
                  <div
                    key={med.id}
                    onClick={() => navigate('/purchase')}
                    className="p-2.5 bg-slate-50 hover:bg-rose-50/50 border border-slate-200/80 hover:border-rose-300 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{med.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {med.manufacturer} • Batch: <span className="font-mono">{med.batchNumber || 'N/A'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Min Threshold: <strong className="text-slate-700">{threshold}</strong> units
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        isOutOfStock 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : isCritical 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-amber-100 text-amber-900'
                      }`}>
                        {isOutOfStock ? '0 - Out of Stock' : `${med.quantity} in stock`}
                      </span>
                      <div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded font-semibold inline-block">
                          +{suggestedOrderQty} PO
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p className="font-medium text-slate-600">No items match this stock filter!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Inventory levels are currently healthy</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/purchase')}
          className="mt-3 w-full bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1 border border-rose-200 cursor-pointer"
        >
          <span>Create Restock Purchase Order</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  {/* 1. Expiry Batch Alerts Section */}
  const renderExpiryAlertsWidget = () => {
    const filteredExpiry = nearExpiryAlerts.filter(m => {
      const days = m.daysRemaining ?? Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= expiryThresholdDays;
    });

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-h-[300px]">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Expiry Batch Alerts</h3>
                <span className="text-[11px] text-slate-400">Batches nearing shelf expiry</span>
              </div>
            </div>
            <select
              value={expiryThresholdDays}
              onChange={(e) => {
                const val = Number(e.target.value);
                setExpiryThresholdDays(val);
                localStorage.setItem('mbi_expiry_threshold', String(val));
                emitToast('Expiry threshold updated', 'success');
              }}
              className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value={30}>Within 30 Days</option>
              <option value={60}>Within 60 Days</option>
              <option value={90}>Within 90 Days</option>
              <option value={180}>Within 6 Months (180 Days)</option>
            </select>
          </div>

          {/* Dedicated Separate Scrollable List */}
          <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
            {filteredExpiry.length > 0 ? (
              filteredExpiry.map(med => {
                const daysLeft = med.daysRemaining ?? Math.ceil((new Date(med.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 20;
                return (
                  <div 
                    key={med.id} 
                    onClick={() => navigate('/items')}
                    className="p-2.5 bg-amber-50/70 hover:bg-amber-100/60 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{med.name}</div>
                      <div className="text-[10px] text-slate-500">
                        Batch: <span className="font-mono font-medium">{med.batchNumber || 'N/A'}</span> • Exp: {med.expiryDate}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] inline-block ${
                        isUrgent ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">{med.quantity} in stock</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p className="font-medium text-slate-600">No batches expiring within {expiryThresholdDays} days!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Inventory expiry records are safe and healthy</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/items')}
          className="mt-3 w-full bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1 border border-amber-200"
        >
          <span>Manage Batch Expiries & Returns</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  {/* Smart Reorder Predictor calculation based on historical consumption */}
  const smartReorderPredictions = useMemo(() => {
    // Map historical consumption from invoices (past 30 days)
    const salesMap = new Map<string, number>();
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const idKey = item.medicineId;
        const nameKey = (item.name || '').toLowerCase().trim();
        const qty = Number(item.quantity) || 1;
        if (idKey) salesMap.set(idKey, (salesMap.get(idKey) || 0) + qty);
        if (nameKey) salesMap.set(nameKey, (salesMap.get(nameKey) || 0) + qty);
      });
    });

    const sourceMeds: {
      id: string;
      name: string;
      quantity: number;
      lowStockThreshold: number;
      manufacturer: string;
      genericName?: string;
      price: number;
      purchasePrice?: number;
    }[] = medicines.length > 0 ? medicines.map(m => ({
      id: m.id,
      name: m.name,
      quantity: m.quantity,
      lowStockThreshold: m.lowStockThreshold || 20,
      manufacturer: m.manufacturer || '',
      genericName: m.genericName || m.saltComposition || '',
      price: m.sellingPrice || 0,
      purchasePrice: m.purchasePrice || 0,
    })) : lowStockAlerts.map(l => ({
      id: l.id,
      name: l.name,
      quantity: l.quantity,
      lowStockThreshold: l.lowStockThreshold || 20,
      manufacturer: l.manufacturer || '',
      genericName: '',
      price: l.sellingPrice || 0,
      purchasePrice: 0,
    }));

    return sourceMeds.map(med => {
      const soldCount = Math.max(
        salesMap.get(med.id) || 0,
        salesMap.get(med.name.toLowerCase().trim()) || 0
      );

      // Estimated daily velocity (units/day)
      const dailyVelocity = soldCount > 0 
        ? Math.max(0.2, Number((soldCount / 30).toFixed(1)))
        : Math.max(0.3, Number(((med.lowStockThreshold || 15) / 15).toFixed(1)));

      const currentStock = Number(med.quantity) || 0;
      const threshold = Number(med.lowStockThreshold) || 20;
      const daysRemaining = currentStock === 0 ? 0 : Math.round(currentStock / dailyVelocity);

      let urgency: 'Emergency' | 'High' | 'Normal' = 'Normal';
      let urgencyLabel = 'Normal';
      let urgencyBadge = 'bg-blue-50 text-blue-700 border-blue-200';

      if (currentStock === 0 || daysRemaining <= 3) {
        urgency = 'Emergency';
        urgencyLabel = currentStock === 0 ? 'Out of Stock' : 'Critical (≤3d)';
        urgencyBadge = 'bg-rose-100 text-rose-800 border-rose-200';
      } else if (daysRemaining <= 7 || currentStock <= threshold) {
        urgency = 'High';
        urgencyLabel = 'Urgent (≤7d)';
        urgencyBadge = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (daysRemaining <= 15) {
        urgency = 'Normal';
        urgencyLabel = 'Moderate (≤15d)';
        urgencyBadge = 'bg-blue-50 text-blue-700 border-blue-200';
      }

      // Reorder quantity target: 21 days lead stock
      const targetDays = 21;
      const suggestedQty = Math.max(
        Math.ceil(dailyVelocity * targetDays) - currentStock,
        (threshold * 2) - currentStock,
        15
      );

      return {
        medicine: med,
        soldCount,
        dailyVelocity,
        currentStock,
        threshold,
        daysRemaining,
        urgency,
        urgencyLabel,
        urgencyBadge,
        suggestedQty,
        isReorderNeeded: currentStock <= threshold || daysRemaining <= 15,
      };
    })
    .filter(p => p.isReorderNeeded)
    .sort((a, b) => {
      if (a.currentStock === 0 && b.currentStock > 0) return -1;
      if (b.currentStock === 0 && a.currentStock > 0) return 1;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [medicines, invoices, lowStockAlerts]);

  const handlePushToShortage = async (
    e: React.MouseEvent,
    pred: {
      medicine: {
        id: string;
        name: string;
        genericName?: string;
        manufacturer?: string;
        purchasePrice?: number;
        price: number;
        lowStockThreshold: number;
      };
      suggestedQty: number;
      urgency: 'Emergency' | 'High' | 'Normal';
      daysRemaining: number;
      dailyVelocity: number;
    }
  ) => {
    e.stopPropagation();
    try {
      const shortageRecord: ShortageItemRecord = {
        id: uuidv4(),
        medicineName: pred.medicine.name,
        genericName: pred.medicine.genericName || '',
        companyName: pred.medicine.manufacturer || '',
        requestedQty: pred.suggestedQty,
        urgency: pred.urgency,
        status: 'Pending',
        estimatedPrice: pred.medicine.purchasePrice || pred.medicine.price || 0,
        notes: `Smart Reorder Predictor: Velocity ~${pred.dailyVelocity}/day, ~${pred.daysRemaining} days stock remaining.`,
        recordedBy: activeUser?.name || 'Smart Reorder Predictor',
        createdAt: new Date().toISOString(),
      };

      await dbShortageItems.save(shortageRecord);
      setPushedShortageIds(prev => new Set(prev).add(pred.medicine.id));
      emitToast(`"${pred.medicine.name}" (+${pred.suggestedQty} qty) pushed to Shortage Registry!`, 'success');
    } catch (err) {
      console.error('Failed to push item to Shortage Registry:', err);
      emitToast('Failed to add to Shortage Registry', 'error');
    }
  };

  const handlePushAllUrgentToShortage = async () => {
    const urgentItems = smartReorderPredictions.filter(p => !pushedShortageIds.has(p.medicine.id));
    if (urgentItems.length === 0) {
      emitToast('All suggested items are already pushed to Shortage Registry', 'info');
      return;
    }

    setIsBulkPushingShortage(true);
    try {
      const newPushed = new Set(pushedShortageIds);
      const shortageRecordsToSave = urgentItems.map(pred => {
        newPushed.add(pred.medicine.id);
        return {
          id: uuidv4(),
          medicineName: pred.medicine.name,
          genericName: pred.medicine.genericName || '',
          companyName: pred.medicine.manufacturer || '',
          requestedQty: pred.suggestedQty,
          urgency: pred.urgency,
          status: 'Pending' as const,
          estimatedPrice: pred.medicine.purchasePrice || pred.medicine.price || 0,
          notes: `Smart Reorder Predictor: Velocity ~${pred.dailyVelocity}/day, ~${pred.daysRemaining} days stock remaining.`,
          recordedBy: activeUser?.name || 'Smart Reorder Predictor',
          createdAt: new Date().toISOString(),
        };
      });

      await Promise.all(shortageRecordsToSave.map(rec => dbShortageItems.save(rec)));
      setPushedShortageIds(newPushed);
      emitToast(`Successfully pushed ${urgentItems.length} items to Shortage Registry!`, 'success');
    } catch (e) {
      console.error('Bulk push failed:', e);
      emitToast('Error pushing items to Shortage Registry', 'error');
    } finally {
      setIsBulkPushingShortage(false);
    }
  };

  {/* 2. Smart Low-Stock Alerts Section */}
  const renderReorderSuggestionsWidget = () => {
    const criticalList = smartReorderPredictions.filter(p => p.urgency === 'Emergency' || p.currentStock === 0 || p.daysRemaining <= 3);
    const urgentList = smartReorderPredictions.filter(p => p.urgency === 'High' || (p.daysRemaining > 3 && p.daysRemaining <= 7));
    
    const displayList = smartAlertFilter === 'critical' 
      ? criticalList 
      : smartAlertFilter === 'depleting' 
        ? urgentList 
        : smartReorderPredictions;

    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-h-[350px]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Smart Low-Stock Alerts</h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                    Velocity AI
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Usage velocity analysis & replenishment advisor</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                {smartReorderPredictions.length} to replenish
              </span>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 my-2 text-[11px]">
            <button
              type="button"
              onClick={() => setSmartAlertFilter('all')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                smartAlertFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({smartReorderPredictions.length})
            </button>
            <button
              type="button"
              onClick={() => setSmartAlertFilter('critical')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                smartAlertFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Critical ≤3d ({criticalList.length})
            </button>
            <button
              type="button"
              onClick={() => setSmartAlertFilter('depleting')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                smartAlertFilter === 'depleting'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Urgent ≤7d ({urgentList.length})
            </button>
          </div>

          {/* Predictive Suggestions Scrollable List */}
          <div className="space-y-2 mt-2 max-h-[220px] overflow-y-auto pr-1">
            {displayList.length > 0 ? (
              displayList.map(pred => {
                const isPushed = pushedShortageIds.has(pred.medicine.id);
                return (
                  <div 
                    key={pred.medicine.id} 
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[160px]">{pred.medicine.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${pred.urgencyBadge}`}>
                          {pred.urgencyLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>Stock: <strong className={pred.currentStock === 0 ? 'text-rose-600' : 'text-slate-800'}>{pred.currentStock}</strong>/{pred.threshold}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">⚡ ~{pred.dailyVelocity}/day</span>
                        <span>•</span>
                        <span className={pred.daysRemaining <= 3 ? 'text-rose-600 font-bold' : 'text-amber-600 font-medium'}>
                          {pred.daysRemaining === 0 ? 'Out of stock' : `~${pred.daysRemaining}d stock left`}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        Suggested Restock: <strong className="text-emerald-800">+{pred.suggestedQty} units</strong>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isPushed ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Pushed</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handlePushToShortage(e, pred)}
                          title="Push to Shortage Registry for procurement"
                          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>+{pred.suggestedQty} Push</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                <p className="font-medium text-slate-600">No items match this velocity filter!</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Sales velocity model indicates adequate current inventory</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
          {smartReorderPredictions.length > 0 && (
            <button
              type="button"
              disabled={isBulkPushingShortage}
              onClick={handlePushAllUrgentToShortage}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isBulkPushingShortage ? 'Pushing All Items...' : `Push All to Shortage Registry (${smartReorderPredictions.length})`}</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/shortages')}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1 border border-indigo-200 cursor-pointer"
            >
              <span>Shortage Registry</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/purchase')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
            >
              <span>Create Restock PO</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  {/* 3. Sales Reports & Trends Section */}
  const renderSalesTrendSection = () => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 space-y-4 h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sales Reports & Trend Analysis
              </h3>
              <p className="text-xs text-slate-500">Analyze daily/weekly demand cycles to optimize pharmacy staffing and procurement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSalesTrendView('daily')}
                className={`px-3 py-1 rounded-md transition-all ${salesTrendView === 'daily' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600'}`}
              >
                Daily (7 Days)
              </button>
              <button
                onClick={() => setSalesTrendView('weekly')}
                className={`px-3 py-1 rounded-md transition-all ${salesTrendView === 'weekly' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600'}`}
              >
                Weekly (4 Weeks)
              </button>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              Full Reports <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="h-[230px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesTrendView === 'daily' ? dailySalesData : weeklySalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(val: any) => `Rs ${val.toLocaleString()}`} />
              <Tooltip 
                formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Total Revenue']}
                contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs text-emerald-900 font-medium">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Peak Demand Period Identified: <strong className="font-bold">Friday & Saturday evenings (5 PM - 9 PM)</strong></span>
        </div>
        <span className="text-[11px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold">High Velocity</span>
      </div>
    </div>
  );

  {/* 4. Sales & Expenses Overview Section */}
  const renderSalesExpensesSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      {/* Sale Card */}
      <div 
        id="dashboard-sale-card"
        onClick={() => navigate('/sale')}
        className="group relative bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[250px]"
      >
        <div className="flex justify-between items-start" onClick={(e) => e.stopPropagation()}>
          <div 
            onClick={() => navigate('/sale')}
            className="flex items-center gap-2.5 text-slate-800 font-semibold group-hover:text-emerald-600 transition-colors"
          >
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shadow-xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold">Sale Overview</span>
              <span className="text-[11px] block font-normal text-slate-400">Click to open POS / Billing</span>
            </div>
          </div>

          {/* Time Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {timeFilter}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30">
                {(['Today', 'This Week', 'This Month', 'This Year'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setTimeFilter(f); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs ${timeFilter === f ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex h-full mt-3">
          <div className="flex-1 flex flex-col justify-center border-r border-slate-100 pr-4">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {maskValue(totalSale)}
              </span>
              {!privacyMode && <span className="text-sm font-medium text-slate-400">.00</span>}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Total Sale ({timeFilter})</div>
            
            <div className="flex items-center gap-2 mt-4">
              <div className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12.4%
              </div>
              <span className="text-[11px] text-slate-400">vs last month</span>
            </div>
          </div>
          
          <div className="flex-1 pl-3 flex flex-col justify-between">
            <div className="flex-1 w-full min-h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="saleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    formatter={(val: any) => [`Rs ${Number(val).toLocaleString()}`, 'Sale']}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#saleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Report Period</span>
              <span className="font-medium text-slate-600">01 Sep - 30 Sep</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-medium text-emerald-600 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Open Billing POS & Record Sale <ChevronRight className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">
            {invoices.length} Invoices
          </span>
        </div>
      </div>

      {/* Expenses Card */}
      <div 
        id="dashboard-expenses-card"
        onClick={() => navigate('/expenses')}
        className="group bg-white rounded-xl p-5 shadow-sm border border-slate-200/80 hover:border-purple-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[250px]"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5 text-slate-800 font-semibold group-hover:text-purple-600 transition-colors">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-bold">Expenses Overview</span>
              <span className="text-[11px] block font-normal text-slate-400">Click to record & track expenses</span>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/expenses'); }}
            className="text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            + Add Expense
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-1 my-2">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {maskValue(totalExpenses)}
              </span>
              {!privacyMode && <span className="text-sm font-medium text-slate-400">.00</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">Total Expenses Incurred ({timeFilter})</div>
          </div>
          
          <div className="w-full max-w-[240px] h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-medium text-purple-600 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View All Expenses & Categories <ChevronRight className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] text-slate-400">
            {expenses.length} Records
          </span>
        </div>
      </div>
    </div>
  );

  {/* 5. Receivables, Payables & Purchase Orders Section */}
  const renderReceivablesPayablesSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* You'll Receive Card */}
      <div 
        id="dashboard-receive-card"
        onClick={() => navigate('/parties')}
        className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[290px]"
      >
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
              <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              You'll Receive
            </div>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">Receivables</span>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {maskValue(effectiveReceivables)}
            </span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>

          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {receivablesList.length > 0 ? (
              receivablesList.slice(0, 3).map((item, idx) => (
                <div 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); navigate('/parties'); }}
                  className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="text-slate-700 font-medium block truncate max-w-[130px]">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.phone}</span>
                  </div>
                  <span className="text-emerald-600 font-bold">{maskValue(item.amount, '')}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center">No pending receivables</div>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/parties'); }}
          className="text-center text-xs font-medium text-slate-500 group-hover:text-emerald-600 hover:bg-slate-50 py-2 border-t border-slate-100 rounded-b-lg transition-colors flex items-center justify-center gap-1"
        >
          View All Receivables <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* You'll Pay Card */}
      <div 
        id="dashboard-pay-card"
        onClick={() => navigate('/parties')}
        className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[290px]"
      >
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
              You'll Pay
            </div>
            <span className="text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium">Payables</span>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {maskValue(effectivePayables)}
            </span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>

          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {payablesList.length > 0 ? (
              payablesList.slice(0, 3).map((item, idx) => (
                <div 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); navigate('/parties'); }}
                  className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="text-slate-700 font-medium block truncate max-w-[130px]">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.phone}</span>
                  </div>
                  <span className="text-rose-600 font-bold">{maskValue(item.amount, '')}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center">No pending payables</div>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/parties'); }}
          className="text-center text-xs font-medium text-slate-500 group-hover:text-rose-600 hover:bg-slate-50 py-2 border-t border-slate-100 rounded-b-lg transition-colors flex items-center justify-center gap-1"
        >
          View All Payables <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Purchase Orders Card */}
      <div 
        id="dashboard-purchase-card"
        onClick={() => navigate('/purchase')}
        className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[290px]"
      >
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-700 text-sm font-semibold">
              <ShoppingCart className="w-4 h-4 text-blue-500" />
              Purchase Orders
            </div>
            <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">Stock In</span>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {maskValue(totalPurchase)}
            </span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>

          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {purchaseList.length > 0 ? (
              purchaseList.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); navigate('/purchase'); }}
                  className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="text-slate-700 font-medium block truncate max-w-[130px]">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.qty}</span>
                  </div>
                  <span className="text-blue-600 font-bold">{maskValue(item.amount, '')}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center">No purchase orders yet</div>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); navigate('/purchase'); }}
          className="text-center text-xs font-medium text-slate-500 group-hover:text-blue-600 hover:bg-slate-50 py-2 border-t border-slate-100 rounded-b-lg transition-colors flex items-center justify-center gap-1"
        >
          + Create New PO <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  {/* 6. Top Selling Products Section */}
  const renderTopProductsSection = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shadow-xs">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Top Selling Products 
                <span className="text-[11px] font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  High Turnover Medicines
                </span>
              </h3>
              <p className="text-xs text-slate-500">Quickly sell or restock the highest volume pharmaceutical items</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/sale')}
              className="flex items-center gap-1.5 bg-[#ef4444] hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Quick Sale
            </button>
            <button 
              onClick={() => navigate('/top-products')}
              className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Medicine / Product Details</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4">Sales Revenue</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length > 0 ? (
                topProducts.slice(0, 6).map((prod, index) => {
                  const isLow = prod.currentStock <= (prod.lowStockThreshold || 20);
                  return (
                    <tr 
                      key={prod.id}
                      onClick={() => navigate('/items')}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                          index === 1 ? 'bg-slate-300 text-slate-800' :
                          index === 2 ? 'bg-amber-600/30 text-amber-900' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {prod.manufacturer} • Batch: <span className="font-mono">{prod.batchNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-mono">
                          {prod.unitsSold} units
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {maskValue(prod.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                          {prod.currentStock} left
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate('/sale')}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
                            title="Add to Sale POS"
                          >
                            <Zap className="w-3 h-3 text-blue-600" /> Sell
                          </button>
                          <button
                            onClick={() => navigate('/items')}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                            title="View Stock Details"
                          >
                            <Eye className="w-3 h-3 text-slate-500" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No sales recorded yet. Start billing in Sale POS to see top moving products.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-medium">Showing top moving items from catalog</span>
        <button 
          onClick={() => navigate('/items')}
          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
        >
          Browse Complete Catalog ({medicines.length} items) <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  {/* 7. Stock Inventory Section */}
  const renderStockInventoryWidget = () => (
    <div className="space-y-3 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between px-1 pt-1 mb-2">
          <h3 className="text-slate-700 font-bold text-sm flex items-center gap-1.5">
            <Package className="w-4 h-4 text-blue-600" /> Stock Inventory Valuation
          </h3>
          <button 
            onClick={() => navigate('/items')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View All
          </button>
        </div>
        
        {/* Total Stock Value */}
        <div 
          onClick={() => navigate('/items')}
          className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all duration-200 cursor-pointer mb-3"
        >
          <div className="flex justify-between items-start">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Stock Value</div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {maskValue(stockValue)}
            </span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
            <span>Total Catalog Items</span>
            <span className="font-bold text-slate-700">{medicines.length} Products</span>
          </div>
        </div>

        {/* Low Stocks Alerts Mini Card */}
        <div 
          onClick={() => navigate('/items')}
          className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
        >
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5 text-slate-800 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Low Stock Summary
            </div>
            <span className="text-[11px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
              {lowStockItems.length} Items
            </span>
          </div>

          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
            {lowStockItems.length > 0 ? (
              lowStockItems.slice(0, 3).map(med => (
                <div 
                  key={med.id}
                  onClick={(e) => { e.stopPropagation(); navigate('/items'); }}
                  className="flex justify-between items-center text-xs p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className="text-slate-700 font-medium truncate max-w-[150px]">{med.name}</span>
                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                    {med.quantity} left
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 py-2 text-center">All catalog stock healthy</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  {/* 8. Bank Accounts Section */}
  const renderBankAccountsWidget = () => (
    <div className="space-y-3 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between px-1 pt-1 mb-2">
          <h3 className="text-slate-700 font-bold text-sm flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" /> Cash & Bank Accounts
          </h3>
          <button 
            onClick={() => navigate('/bank')}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Manage
          </button>
        </div>
        
        {/* Cash In Hand */}
        <div 
          onClick={() => navigate('/expenses')}
          className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all duration-200 cursor-pointer mb-3"
        >
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash In Hand (Counter)</div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">Active</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2 text-slate-900">
            <span className="text-xl font-black">{maskValue(cashInHandBalance)}</span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>
        </div>
        
        {/* Bank Accounts */}
        <div 
          onClick={() => navigate('/bank')}
          className="group bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Bank Accounts {bankAccounts.length > 0 ? `(${bankAccounts.map(b => b.bankName).slice(0, 2).join(' / ')})` : ''}
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
              {bankAccounts.length > 0 ? `${bankAccounts.length} Connected` : '0 Connected'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2 text-slate-900">
            <span className="text-xl font-black">{maskValue(totalBankBalance)}</span>
            {!privacyMode && <span className="text-xs font-medium text-slate-400">.00</span>}
          </div>
        </div>
      </div>
    </div>
  );

  {/* 9. Privacy Mode Widget */}
  const renderPrivacyModeWidget = () => (
    <div className={cn(
      "bg-white rounded-xl p-4 transition-all duration-300 relative z-30 flex items-center justify-between h-full min-h-[85px]",
      privacyMode 
        ? "ring-4 ring-blue-500 border-2 border-blue-600 shadow-2xl bg-gradient-to-r from-blue-50/90 via-white to-indigo-50/90" 
        : "shadow-sm border border-slate-200/80 hover:border-slate-300"
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-xs",
          privacyMode ? "bg-blue-600 text-white shadow-blue-500/30" : "bg-slate-100 text-slate-600"
        )}>
          {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-900 font-bold block leading-tight">Privacy Mode</span>
            {privacyMode && (
              <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                ACTIVE (BLURRED)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block line-clamp-1">
            {privacyMode ? 'Dashboard is blurred & figures masked for counter privacy' : 'Click toggle to blur dashboard & protect figures'}
          </span>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => togglePrivacy()}
        className={`w-12 h-7 rounded-full relative transition-colors focus:outline-none cursor-pointer shrink-0 shadow-inner ${
          privacyMode ? 'bg-blue-600 ring-2 ring-blue-400 ring-offset-2' : 'bg-slate-300 hover:bg-slate-400'
        }`}
        title={privacyMode ? "Disable Privacy Mode (Unblur Dashboard)" : "Enable Privacy Mode (Blur Dashboard)"}
        aria-label="Toggle Privacy Mode"
      >
        <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
          privacyMode ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );

  // Dispatcher to render section by ID
  const renderSectionById = (sectionId: string) => {
    const isPrivacyWidget = sectionId === 'privacy_mode';
    const widgetContent = (() => {
      switch (sectionId) {
        case 'pharmacy_erp_kpi_metrics':
          return (
            <PharmacyKpiMetricsWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'pharmacy_erp_analytics_hub':
          return (
            <PharmacyErpAnalyticsHubWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'weekly_revenue_trajectory':
          return (
            <WeeklySalesTrajectoryWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'therapeutic_category_mix':
          return (
            <TherapeuticCategoryMixWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'hourly_rush_velocity':
          return (
            <HourlyRushVelocityWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'fast_skus_margin_matrix':
          return (
            <FastSkusMarginMatrixWidget
              invoices={invoices}
              medicines={medicines}
              privacyMode={privacyMode}
              maskValue={maskValue}
              onNavigate={navigate}
            />
          );
        case 'fefo_expiry_status':
          return renderFEFOExpiryStatusWidget();
        case 'todays_profit':
          return renderTodaysProfitWidget();
        case 'recent_sales':
          return renderRecentSalesWidget();
        case 'low_stock_alerts':
          return renderLowStockAlertsWidget();
        case 'expiry_alerts':
          return renderExpiryAlertsWidget();
        case 'reorder_suggestions':
          return renderReorderSuggestionsWidget();
        case 'sales_trend':
          return renderSalesTrendSection();
        case 'sales_expenses':
          return renderSalesExpensesSection();
        case 'receivables_payables':
          return renderReceivablesPayablesSection();
        case 'top_products':
          return renderTopProductsSection();
        case 'stock_inventory':
          return renderStockInventoryWidget();
        case 'bank_accounts':
          return renderBankAccountsWidget();
        case 'privacy_mode':
          return renderPrivacyModeWidget();
        default:
          return null;
      }
    })();

    if (!widgetContent) return null;

    // When Privacy Mode is active, blur every widget EXCEPT the privacy mode widget itself
    if (privacyMode && !isPrivacyWidget) {
      return (
        <div className="relative group transition-all duration-300 rounded-xl overflow-hidden">
          {/* Blurred Content */}
          <div className="filter blur-[6px] select-none pointer-events-none opacity-65 transition-all duration-300 grayscale-[25%]">
            {widgetContent}
          </div>
          {/* Privacy Protection Overlay Badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-slate-900/60 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl border border-white/20">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Privacy Masked</span>
            </div>
          </div>
        </div>
      );
    }

    return widgetContent;
  };

  const allWidgetIds = useMemo(() => new Set(ALL_DASHBOARD_WIDGETS.map(w => w.id)), []);
  const activeWidgetsCount = ALL_DASHBOARD_WIDGETS.filter(w => widgetVisibility[w.id] !== false).length;

  const visibleMainSections = useMemo(() => {
    const list = mainOrder
      .filter(id => allWidgetIds.has(id))
      .filter(id => widgetVisibility[id] !== false);
    return list;
  }, [mainOrder, widgetVisibility, allWidgetIds]);

  const visibleSidebarSections = useMemo(() => {
    const list = sidebarOrder
      .filter(id => allWidgetIds.has(id))
      .filter(id => widgetVisibility[id] !== false);
    return list;
  }, [sidebarOrder, widgetVisibility, allWidgetIds]);

  return (
    <div className="space-y-4 max-w-full pb-12">
      {/* Mobile-Optimized Dashboard (md:hidden) */}
      <div className="md:hidden">
        <MobileDashboardView
          todayMetrics={todayMetrics}
          invoices={invoices}
          medicines={medicines}
          suppliers={suppliers}
          expenses={expenses}
          activeCashierShift={activeCashierShift}
          privacyMode={privacyMode}
          onTogglePrivacy={togglePrivacy}
          onPrintInvoice={(inv) => {
            setPrintInvoice(inv);
            setIsPrintModalOpen(true);
          }}
          activeUserName={activeUser?.name || 'Pharmacist'}
        />
      </div>

      {/* Desktop / Tablet Dashboard (hidden md:block) */}
      <div className="hidden md:block space-y-4">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Business Dashboard</h1>
              <span className="text-xs text-slate-400 hidden sm:inline">• Pharmacy Live Analytics</span>
              {activeUser && (
                <span className="text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold truncate max-w-[180px] lg:max-w-none">
                  Pharmacist: {activeUser.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Real-time sales, automated low stock restock velocity, and batch expiry tracking
            </p>
          </div>

          {/* Dashboard Customization & Privacy Controls */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Rapid F2 POS Billing Button */}
            <button
              type="button"
              onClick={() => setIsAddSaleOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
              title="Open Rapid POS Billing (Press F2 anywhere)"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300" />
              <span>Rapid Bill (F2)</span>
            </button>

            {/* Quick Privacy Mode Toggle in Header */}
            <button
              type="button"
              onClick={() => togglePrivacy()}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap",
                privacyMode
                  ? "bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 ring-2 ring-blue-400"
                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400"
              )}
              title={privacyMode ? "Disable Privacy Mode (Unblur Dashboard)" : "Enable Privacy Mode (Blur Dashboard)"}
            >
              {privacyMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse shrink-0" />
                  <span>Privacy: ON (Blurred)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
                  <span>Privacy Mode</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsCustomizerOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition-all hover:border-blue-400 cursor-pointer whitespace-nowrap"
              title="Configure Dashboard Widgets"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <span>Customize Widgets</span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {activeWidgetsCount} / {ALL_DASHBOARD_WIDGETS.length}
              </span>
            </button>
          </div>
        </div>

        {/* Privacy Mode Banner when Active */}
        {privacyMode && (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldAlert className="w-4 h-4 text-blue-200 shrink-0" />
              <span className="font-medium truncate sm:whitespace-normal">
                <strong>Privacy Mode Active:</strong> Dashboard widgets are blurred & customer figures masked. Click the toggle to unblur.
              </span>
            </div>
            <button
              type="button"
              onClick={() => togglePrivacy(false)}
              className="px-3 py-1.5 bg-white text-blue-800 hover:bg-blue-50 rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              Unblur Dashboard
            </button>
          </div>
        )}

        {/* Dashboard Columns with Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Main Area (8 Cols) */}
            <div className="xl:col-span-8 space-y-4 xl:border-r xl:border-slate-300 xl:pr-6">
              <SortableContext items={visibleMainSections} strategy={verticalListSortingStrategy}>
                {visibleMainSections.map((sectionId, index) => {
                  const widgetDef = ALL_DASHBOARD_WIDGETS.find(w => w.id === sectionId);
                  return (
                    <SortableDashboardWidget
                      key={sectionId}
                      id={sectionId}
                      index={index}
                      totalInZone={visibleMainSections.length}
                      zone="main"
                      title={widgetDef?.title || sectionId}
                      onMoveZone={handleSwitchWidgetZone}
                      onMoveUp={() => handleNudgeWidget('main', index, 'up')}
                      onMoveDown={() => handleNudgeWidget('main', index, 'down')}
                    >
                      {renderSectionById(sectionId)}
                    </SortableDashboardWidget>
                  );
                })}
              </SortableContext>

              {visibleMainSections.length === 0 && (
                <div className="p-10 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 space-y-3">
                  <SlidersHorizontal className="w-8 h-8 mx-auto text-slate-300" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">All main section widgets are hidden</p>
                    <p className="text-xs text-slate-400 mt-1">Enable Today's Profit, Recent Sales, or Sales Analytics from the widget customizer</p>
                  </div>
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Open Widget Customizer
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar Area (4 Cols) */}
            <div className="xl:col-span-4 space-y-4 xl:pl-2">
              <SortableContext items={visibleSidebarSections} strategy={verticalListSortingStrategy}>
                {visibleSidebarSections.map((sectionId, index) => {
                  const widgetDef = ALL_DASHBOARD_WIDGETS.find(w => w.id === sectionId);
                  return (
                    <SortableDashboardWidget
                      key={sectionId}
                      id={sectionId}
                      index={index}
                      totalInZone={visibleSidebarSections.length}
                      zone="sidebar"
                      title={widgetDef?.title || sectionId}
                      onMoveZone={handleSwitchWidgetZone}
                      onMoveUp={() => handleNudgeWidget('sidebar', index, 'up')}
                      onMoveDown={() => handleNudgeWidget('sidebar', index, 'down')}
                    >
                      {renderSectionById(sectionId)}
                    </SortableDashboardWidget>
                  );
                })}
              </SortableContext>

              {visibleSidebarSections.length === 0 && (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-400 space-y-2">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">All sidebar widgets are hidden</p>
                  <button
                    onClick={() => setIsCustomizerOpen(true)}
                    className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Configure Low Stock & Inventory Widgets
                  </button>
                </div>
              )}
            </div>
          </div>

          <DragOverlay>
            {activeDragId ? (
              <div className="p-4 bg-white rounded-2xl shadow-2xl border-2 border-blue-500 ring-4 ring-blue-500/20 max-w-md opacity-95 pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      Rearranging Widget
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      {ALL_DASHBOARD_WIDGETS.find(w => w.id === activeDragId)?.title || activeDragId}
                    </h4>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Widget Customization Slide-over Modal */}
      <WidgetCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        visibility={widgetVisibility}
        onToggleWidget={updateWidgetVisibility}
        onApplyPreset={applyWidgetPreset}
        onResetDefaults={resetWidgetDefaults}
        mainOrder={mainOrder}
        sidebarOrder={sidebarOrder}
        onChangeOrder={handleChangeOrder}
        onResetOrder={handleResetOrder}
      />

      {/* Invoice Print & Reprint Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintInvoice(null);
        }}
        invoice={printInvoice}
      />

      {/* Rapid POS Billing (F2) Modal */}
      <AddSaleModal
        isOpen={isAddSaleOpen}
        onClose={() => setIsAddSaleOpen(false)}
        onSaveSuccess={(savedInvoice) => {
          setIsAddSaleOpen(false);
          loadDashboardData();
          emitToast(`Invoice ${savedInvoice.invoiceNumber} created successfully!`, 'success');
        }}
      />
    </div>
  );
};
