import React, { useState } from 'react';
import { 
  X, SlidersHorizontal, RotateCcw, Search, 
  TrendingUp, FileText, AlertTriangle, Wallet, BarChart3, 
  Flame, ArrowDownRight, Package, Landmark, EyeOff, LayoutGrid,
  Sparkles, ArrowUp, ArrowDown, ArrowUpDown, ListOrdered,
  Layout, MoveRight, MoveLeft, HelpCircle, GripVertical
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface WidgetDefinition {
  id: string;
  title: string;
  category: 'Financials & Profit' | 'Inventory & Alerts' | 'Sales & Cashflow' | 'Operations';
  description: string;
  defaultZone: 'main' | 'sidebar';
  isKeyMetric?: boolean;
}

export const ALL_DASHBOARD_WIDGETS: WidgetDefinition[] = [
  {
    id: 'fefo_expiry_status',
    title: 'FEFO Expiry Status Tracker',
    category: 'Inventory & Alerts',
    description: 'Real-time First-Expiry First-Out tracker highlighting medicines expiring in 30, 60, 90, and 180 days with batch metrics.',
    defaultZone: 'main',
    isKeyMetric: true,
  },
  {
    id: 'todays_profit',
    title: "Today's Profit & Margins",
    category: 'Financials & Profit',
    description: "Real-time gross/net profit, cost of goods sold (COGS), and profit margin % for today's transactions.",
    defaultZone: 'main',
    isKeyMetric: true,
  },
  {
    id: 'recent_sales',
    title: 'Recent Sales',
    category: 'Sales & Cashflow',
    description: 'Latest sales invoices feed with customer details, item quantities, payment mode, and quick invoice reprint.',
    defaultZone: 'main',
    isKeyMetric: true,
  },
  {
    id: 'low_stock_alerts',
    title: 'Low Stock Alerts',
    category: 'Inventory & Alerts',
    description: 'Critical inventory depletion warning list with stock quantities, threshold limits, and one-click purchase order restock.',
    defaultZone: 'sidebar',
    isKeyMetric: true,
  },
  {
    id: 'sales_expenses',
    title: 'Sales & Expenses Summary',
    category: 'Financials & Profit',
    description: 'Total billing turnover with visual area charts and categorized operational pharmacy expenses.',
    defaultZone: 'main',
  },
  {
    id: 'sales_trend',
    title: 'Sales Reports & Trend Analysis',
    category: 'Financials & Profit',
    description: 'Daily and weekly revenue demand patterns and peak pharmacy sales velocity hours.',
    defaultZone: 'main',
  },
  {
    id: 'top_products',
    title: 'Top Selling Products',
    category: 'Sales & Cashflow',
    description: 'High-turnover pharmaceutical products ranked by volume and revenue with quick sell shortcuts.',
    defaultZone: 'main',
  },
  {
    id: 'receivables_payables',
    title: 'Receivables, Payables & POs',
    category: 'Sales & Cashflow',
    description: 'Customer credit ledger balances, distributor supplier payables, and incoming purchase orders.',
    defaultZone: 'main',
  },
  {
    id: 'stock_inventory',
    title: 'Stock Inventory Valuation',
    category: 'Inventory & Alerts',
    description: 'Total wholesale catalog inventory value and live active medicine count.',
    defaultZone: 'sidebar',
  },
  {
    id: 'reorder_suggestions',
    title: 'Smart Low-Stock Alerts',
    category: 'Inventory & Alerts',
    description: 'Analyzes historical sales velocity and usage patterns to automatically forecast stockout days and suggest optimal replenishment quantities.',
    defaultZone: 'sidebar',
    isKeyMetric: true,
  },
  {
    id: 'expiry_alerts',
    title: 'Expiry Batch Alerts',
    category: 'Inventory & Alerts',
    description: 'Near-expiry batch safety monitoring with customizable threshold days.',
    defaultZone: 'sidebar',
  },
  {
    id: 'bank_accounts',
    title: 'Cash & Bank Accounts',
    category: 'Operations',
    description: 'Counter cash-in-hand register and commercial bank account balances.',
    defaultZone: 'sidebar',
  },
  {
    id: 'pharmacy_erp_kpi_metrics',
    title: 'Executive Pharmacy KPI Metrics',
    category: 'Financials & Profit',
    description: 'Top overview banner with Weekly Revenue, Gross Profit Margin, Invoices Cleared speed, and FEFO 99.8% Zero Loss tracking.',
    defaultZone: 'main',
    isKeyMetric: true,
  },
  {
    id: 'pharmacy_erp_analytics_hub',
    title: 'Pharmacy ERP Analytics Hub',
    category: 'Financials & Profit',
    description: 'Switchable multi-tab analytics engine with 7-Day Sales Trend, Category Mix, Rush Hours Velocity, and Fast SKUs Matrix.',
    defaultZone: 'main',
    isKeyMetric: true,
  },
  {
    id: 'weekly_revenue_trajectory',
    title: 'Weekly Revenue & Bill Trajectory',
    category: 'Financials & Profit',
    description: 'Daily counter performance across all active retail terminals with automatic peak day tagging and basket ticket stats.',
    defaultZone: 'main',
  },
  {
    id: 'therapeutic_category_mix',
    title: 'Therapeutic Drug Category Mix',
    category: 'Inventory & Alerts',
    description: 'Segmented stock mix donut chart, categorical sales breakdown, and margin percentages across drug classes.',
    defaultZone: 'main',
  },
  {
    id: 'hourly_rush_velocity',
    title: 'Hourly Rush Hours Velocity',
    category: 'Operations',
    description: 'Identifies dual-peak doctor consultant rush hours (Morning & Evening) with automated cashier staffing recommendations.',
    defaultZone: 'main',
  },
  {
    id: 'fast_skus_margin_matrix',
    title: 'Fast SKUs & Profit Margins',
    category: 'Sales & Cashflow',
    description: 'Real-time stock turnover rates, monthly consumption velocity, supplier profit margins, and remaining stock.',
    defaultZone: 'main',
  },
  {
    id: 'privacy_mode',
    title: 'Privacy & Display Mode',
    category: 'Operations',
    description: 'Quick toggle to mask customer currency figures for public pharmacy counter screens.',
    defaultZone: 'sidebar',
  },
];

export const DEFAULT_MAIN_SECTIONS = [
  'pharmacy_erp_kpi_metrics',
  'pharmacy_erp_analytics_hub',
  'fefo_expiry_status',
  'todays_profit',
  'recent_sales',
  'sales_expenses',
  'receivables_payables',
  'top_products',
  'sales_trend',
  'weekly_revenue_trajectory',
  'therapeutic_category_mix',
  'hourly_rush_velocity',
  'fast_skus_margin_matrix',
];

export const DEFAULT_SIDEBAR_SECTIONS = [
  'low_stock_alerts',
  'privacy_mode',
  'stock_inventory',
  'bank_accounts',
  'reorder_suggestions',
  'expiry_alerts',
];

export const DEFAULT_WIDGET_VISIBILITY: Record<string, boolean> = {
  pharmacy_erp_kpi_metrics: true,
  pharmacy_erp_analytics_hub: true,
  fefo_expiry_status: true,
  todays_profit: true,
  recent_sales: true,
  low_stock_alerts: true,
  sales_expenses: true,
  sales_trend: true,
  top_products: true,
  receivables_payables: true,
  stock_inventory: true,
  reorder_suggestions: false,
  expiry_alerts: true,
  bank_accounts: true,
  privacy_mode: true,
  weekly_revenue_trajectory: true,
  therapeutic_category_mix: true,
  hourly_rush_velocity: true,
  fast_skus_margin_matrix: true,
};

interface WidgetCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: Record<string, boolean>;
  onToggleWidget: (widgetId: string, visible: boolean) => void;
  onApplyPreset: (newVisibility: Record<string, boolean>) => void;
  onResetDefaults: () => void;
  mainOrder: string[];
  sidebarOrder: string[];
  onChangeOrder: (newMainOrder: string[], newSidebarOrder: string[]) => void;
  onResetOrder: () => void;
}

interface SortableCustomizerRowProps {
  widget: WidgetDefinition;
  index: number;
  zone: 'main' | 'sidebar';
  totalInZone: number;
  isVisible: boolean;
  renderIcon: (id: string) => React.ReactNode;
  onToggle: () => void;
  onSetExactPosition: (targetPos: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSwitchZone: () => void;
}

const SortableCustomizerRow: React.FC<SortableCustomizerRowProps> = ({
  widget,
  index,
  zone,
  totalInZone,
  isVisible,
  renderIcon,
  onToggle,
  onSetExactPosition,
  onMoveUp,
  onMoveDown,
  onSwitchZone,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const positionNumber = index + 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 sm:p-3.5 rounded-xl transition-all border select-none ${
        isDragging
          ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/50 shadow-lg scale-[0.99] z-40'
          : isVisible
          ? 'bg-white border-slate-200/90 shadow-2xs hover:border-blue-300'
          : 'bg-slate-50/70 border-dashed border-slate-300 opacity-65'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Drag Handle + Numbering Badge + Position Dropdown + Icon + Details */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-colors shrink-0"
            title="Drag to rearrange position (Kheenchte hue tarteeb badlein)"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Numeric Badge & Position Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-xs border ${
                isVisible
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-500/20'
                  : 'bg-slate-200 text-slate-500 border-slate-300'
              }`}
              title={`Current Position: #${positionNumber}`}
            >
              #{positionNumber}
            </div>

            {/* Quick Position Selector Dropdown */}
            <div className="relative">
              <select
                value={positionNumber}
                onChange={(e) => onSetExactPosition(parseInt(e.target.value, 10))}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-1 px-2 rounded-lg border border-slate-300 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                title="Directly select position number (Tarteeb No)"
              >
                {Array.from({ length: totalInZone }, (_, i) => i + 1).map((pos) => (
                  <option key={pos} value={pos}>
                    No. {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            {renderIcon(widget.id)}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {widget.title}
              </h4>
              {widget.isKeyMetric && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                  Key Metric
                </span>
              )}
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                {widget.category}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {widget.description}
            </p>
          </div>
        </div>

        {/* Right Controls: Up/Down Buttons + Move Zone + Visibility Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Up / Down Arrows */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className={`p-1.5 rounded-md transition-colors ${
                index === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-white cursor-pointer shadow-2xs'
              }`}
              title="Move Up (Upar Karein)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            <span className="text-[10px] font-bold text-slate-500 px-1">
              {positionNumber}
            </span>

            <button
              type="button"
              onClick={onMoveDown}
              disabled={index >= totalInZone - 1}
              className={`p-1.5 rounded-md transition-colors ${
                index >= totalInZone - 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:text-blue-600 hover:bg-white cursor-pointer shadow-2xs'
              }`}
              title="Move Down (Neechay Karein)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Move Zone Button */}
          <button
            type="button"
            onClick={onSwitchZone}
            className="text-[10px] font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title={zone === 'main' ? 'Move to Right Sidebar (4-Col)' : 'Move to Main Area (8-Col)'}
          >
            {zone === 'main' ? (
              <>
                <span className="hidden sm:inline">To Sidebar</span>
                <MoveRight className="w-3 h-3" />
              </>
            ) : (
              <>
                <MoveLeft className="w-3 h-3" />
                <span className="hidden sm:inline">To Main</span>
              </>
            )}
          </button>

          {/* Visibility Toggle Switch */}
          <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isVisible ? 'bg-blue-600' : 'bg-slate-200'
            }`}
            role="switch"
            aria-checked={isVisible}
            title={isVisible ? 'Click to Hide Widget' : 'Click to Show Widget'}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isVisible ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export const WidgetCustomizerModal: React.FC<WidgetCustomizerModalProps> = ({
  isOpen,
  onClose,
  visibility,
  onToggleWidget,
  onApplyPreset,
  onResetDefaults,
  mainOrder,
  sidebarOrder,
  onChangeOrder,
  onResetOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'sidebar' | 'all'>('main');

  // Drag and drop sensors (declared unconditionally before any early return to strictly obey Rules of Hooks)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!isOpen) return null;

  const getWidget = (id: string) => ALL_DASHBOARD_WIDGETS.find(w => w.id === id);

  const renderIcon = (id: string) => {
    switch (id) {
      case 'todays_profit':
        return <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />;
      case 'recent_sales':
        return <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'low_stock_alerts':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />;
      case 'sales_expenses':
        return <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      case 'sales_trend':
        return <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />;
      case 'top_products':
        return <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />;
      case 'receivables_payables':
        return <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />;
      case 'stock_inventory':
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />;
      case 'reorder_suggestions':
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'expiry_alerts':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />;
      case 'bank_accounts':
        return <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />;
      case 'privacy_mode':
        return <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />;
      default:
        return <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />;
    }
  };

  // Reordering helpers
  const moveItemInArray = (arr: string[], fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= arr.length) return arr;
    const copy = [...arr];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    return copy;
  };

  const handleMoveUp = (zone: 'main' | 'sidebar', index: number) => {
    if (index === 0) return;
    if (zone === 'main') {
      const updated = moveItemInArray(mainOrder, index, index - 1);
      onChangeOrder(updated, sidebarOrder);
    } else {
      const updated = moveItemInArray(sidebarOrder, index, index - 1);
      onChangeOrder(mainOrder, updated);
    }
  };

  const handleMoveDown = (zone: 'main' | 'sidebar', index: number) => {
    const list = zone === 'main' ? mainOrder : sidebarOrder;
    if (index >= list.length - 1) return;
    if (zone === 'main') {
      const updated = moveItemInArray(mainOrder, index, index + 1);
      onChangeOrder(updated, sidebarOrder);
    } else {
      const updated = moveItemInArray(sidebarOrder, index, index + 1);
      onChangeOrder(mainOrder, updated);
    }
  };

  const handleSetExactPosition = (zone: 'main' | 'sidebar', currentIndex: number, targetPosition1Indexed: number) => {
    const list = zone === 'main' ? mainOrder : sidebarOrder;
    const targetIndex = targetPosition1Indexed - 1;
    if (targetIndex < 0 || targetIndex >= list.length || targetIndex === currentIndex) return;

    if (zone === 'main') {
      const updated = moveItemInArray(mainOrder, currentIndex, targetIndex);
      onChangeOrder(updated, sidebarOrder);
    } else {
      const updated = moveItemInArray(sidebarOrder, currentIndex, targetIndex);
      onChangeOrder(mainOrder, updated);
    }
  };

  const handleSwitchZone = (widgetId: string, currentZone: 'main' | 'sidebar') => {
    if (currentZone === 'main') {
      const newMain = mainOrder.filter(id => id !== widgetId);
      const newSidebar = [...sidebarOrder, widgetId];
      onChangeOrder(newMain, newSidebar);
    } else {
      const newSidebar = sidebarOrder.filter(id => id !== widgetId);
      const newMain = [...mainOrder, widgetId];
      onChangeOrder(newMain, newSidebar);
    }
  };

  const handlePreset = (type: 'all' | 'key_metrics' | 'finance' | 'inventory') => {
    const next: Record<string, boolean> = {};
    ALL_DASHBOARD_WIDGETS.forEach(w => {
      if (type === 'all') {
        next[w.id] = true;
      } else if (type === 'key_metrics') {
        next[w.id] = !!w.isKeyMetric || w.id === 'sales_expenses';
      } else if (type === 'finance') {
        next[w.id] = w.category === 'Financials & Profit' || w.id === 'receivables_payables' || w.id === 'bank_accounts';
      } else if (type === 'inventory') {
        next[w.id] = w.category === 'Inventory & Alerts' || w.id === 'top_products';
      }
    });
    onApplyPreset(next);
  };

  const visibleCount = ALL_DASHBOARD_WIDGETS.filter(w => visibility[w.id] !== false).length;

  const handleModalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeTab === 'main') {
      const oldIndex = mainOrder.indexOf(activeId);
      const newIndex = mainOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const next = arrayMove(mainOrder, oldIndex, newIndex);
        onChangeOrder(next, sidebarOrder);
      }
    } else if (activeTab === 'sidebar') {
      const oldIndex = sidebarOrder.indexOf(activeId);
      const newIndex = sidebarOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const next = arrayMove(sidebarOrder, oldIndex, newIndex);
        onChangeOrder(mainOrder, next);
      }
    }
  };

  const renderWidgetRow = (widgetId: string, index: number, zone: 'main' | 'sidebar', totalInZone: number) => {
    const widget = getWidget(widgetId);
    if (!widget) return null;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = widget.title.toLowerCase().includes(q) ||
                    widget.description.toLowerCase().includes(q) ||
                    widget.category.toLowerCase().includes(q);
      if (!match) return null;
    }

    return (
      <SortableCustomizerRow
        key={widget.id}
        widget={widget}
        index={index}
        zone={zone}
        totalInZone={totalInZone}
        isVisible={visibility[widget.id] !== false}
        renderIcon={renderIcon}
        onToggle={() => onToggleWidget(widget.id, !(visibility[widget.id] !== false))}
        onSetExactPosition={(pos) => handleSetExactPosition(zone, index, pos)}
        onMoveUp={() => handleMoveUp(zone, index)}
        onMoveDown={() => handleMoveDown(zone, index)}
        onSwitchZone={() => handleSwitchZone(widget.id, zone)}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                <span>Customize Widgets & Set Order</span>
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  Number Tarteeb
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Number select karein ya Up/Down buttons se widgets ki exact tarteeb set karein
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Tabs */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white space-y-3">
          {/* Tabs: Main Area vs Sidebar vs All */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('main')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'main'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>Main Area ({mainOrder.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sidebar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'sidebar'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Sidebar Area ({sidebarOrder.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Presets & Filters</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onResetOrder}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
                title="Reset widgets sequence to default order"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset Tarteeb</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search widgets by name, category, or metric..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Helper banner */}
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="leading-tight">
              <strong>Tarteeb Tips:</strong> Har widget ka <strong>Position Number (#1, #2...)</strong> dropdown se direct choose karein ya <strong>▲ Upar / ▼ Neechay</strong> arrows se arrange karein. Tarteeb dashboard par real-time save ho jati hai.
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {activeTab === 'main' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModalDragEnd}
            >
              <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 pb-1">
                    <span className="font-bold text-slate-700">Main Section Widgets (Ordered #1 to #{mainOrder.length}):</span>
                    <span>{mainOrder.filter(id => visibility[id] !== false).length} visible</span>
                  </div>
                  {mainOrder.map((widgetId, index) => renderWidgetRow(widgetId, index, 'main', mainOrder.length))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {activeTab === 'sidebar' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModalDragEnd}
            >
              <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1 pb-1">
                    <span className="font-bold text-slate-700">Sidebar Section Widgets (Ordered #1 to #{sidebarOrder.length}):</span>
                    <span>{sidebarOrder.filter(id => visibility[id] !== false).length} visible</span>
                  </div>
                  {sidebarOrder.map((widgetId, index) => renderWidgetRow(widgetId, index, 'sidebar', sidebarOrder.length))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {activeTab === 'all' && (
            <div className="space-y-4">
              {/* Presets Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Quick Visibility Presets
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreset('all')}
                    className="p-2.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold text-slate-800 transition-all text-center cursor-pointer shadow-2xs"
                  >
                    Show All (12)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('key_metrics')}
                    className="p-2.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 transition-all text-center cursor-pointer shadow-2xs"
                  >
                    Key Metrics Only
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('finance')}
                    className="p-2.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-xs font-bold text-purple-800 transition-all text-center cursor-pointer shadow-2xs"
                  >
                    Financials Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset('inventory')}
                    className="p-2.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-bold text-amber-800 transition-all text-center cursor-pointer shadow-2xs"
                  >
                    Inventory & Alerts
                  </button>
                </div>
              </div>

              {/* Reset Everything */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-rose-900">Reset All Widgets & Sequences</p>
                  <p className="text-rose-600">Revert all widget visibility and position numbers to factory defaults</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onResetDefaults();
                    onResetOrder();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium">
            Active: <span className="text-blue-700 font-bold">{visibleCount}</span> of {ALL_DASHBOARD_WIDGETS.length} Widgets Visible
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Done (Save Tarteeb)
          </button>
        </div>

      </div>
    </div>
  );
};
