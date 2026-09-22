import React, { useState } from 'react';
import { 
  ShoppingCart, FileText, Package, Users, Wallet, 
  Landmark, BarChart2, Zap, RefreshCw, CheckCircle2, 
  Eye, EyeOff, ShieldCheck, Layers, HelpCircle, Sparkles,
  ArrowUp, ArrowDown, Camera, Clock, Sliders, RotateCcw, Home, Award, MessageSquare, AlertTriangle, Flame, ShoppingBag, DollarSign, GripVertical
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
import { useSettings } from '../../contexts/SettingsContext';

interface ModuleDef {
  key: keyof import('../../contexts/SettingsContext').AppSettings['modules'];
  name: string;
  category: string;
  icon: any;
  color: string;
  description: string;
  subFeatures: string[];
}

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, defaultEnabled: true },
  { id: 'pos', label: 'POS Counter', icon: Zap, defaultEnabled: true },
  { id: 'parties', label: 'Parties', icon: Users, defaultEnabled: true },
  { id: 'items', label: 'Items & Stock', icon: Package, defaultEnabled: true },
  { id: 'shortage', label: 'Shortage Registry', icon: AlertTriangle, defaultEnabled: true },
  { id: 'topProducts', label: 'Top Products', icon: Flame, defaultEnabled: true },
  { id: 'onlineStore', label: 'Online Store', icon: ShoppingBag, defaultEnabled: true },
  { id: 'sale', label: 'Sale Invoices', icon: FileText, defaultEnabled: true },
  { id: 'shifts', label: 'Shift Management', icon: DollarSign, defaultEnabled: true },
  { id: 'purchase', label: 'Purchase Bills', icon: ShoppingCart, defaultEnabled: true },
  { id: 'cashInHand', label: 'Cash in Hand', icon: Wallet, defaultEnabled: true },
  { id: 'expenses', label: 'Expenses', icon: Wallet, defaultEnabled: true },
  { id: 'bank', label: 'Cash & Bank', icon: Landmark, defaultEnabled: true },
  { id: 'reports', label: 'Reports', icon: BarChart2, defaultEnabled: true },
  { id: 'pricing', label: 'Plans & Pricing', icon: Award, defaultEnabled: true },
  { id: 'feedback', label: 'Share Feedback', icon: MessageSquare, defaultEnabled: true },
];

interface SortableMenuItemProps {
  item: typeof DEFAULT_MENU_ITEMS[0];
  index: number;
  totalItems: number;
  isVisible: boolean;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (id: string) => void;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({
  item,
  index,
  totalItems,
  isVisible,
  onMove,
  onToggleVisibility,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ItemIcon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 select-none ${
        isDragging
          ? 'z-50 bg-indigo-50 border-indigo-400 shadow-xl ring-2 ring-indigo-400 scale-102'
          : isVisible
          ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
          : 'bg-slate-50 border-slate-200 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-grab active:cursor-grabbing transition-colors shrink-0"
          title="Drag and drop to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs">
          <ItemIcon className="w-4 h-4 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
          <p className="text-[10px] text-slate-400 font-mono">Pos: #{index + 1}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Up Button */}
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(item.id, 'up')}
          className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Move Up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        {/* Down Button */}
        <button
          type="button"
          disabled={index === totalItems - 1}
          onClick={() => onMove(item.id, 'down')}
          className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Move Down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {/* Toggle On/Off Switch */}
        <label className="relative inline-flex items-center cursor-pointer ml-1">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={() => onToggleVisibility(item.id)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>
    </div>
  );
};

const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    key: 'sales',
    name: 'Sales Management',
    category: 'Core Operations',
    icon: FileText,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    description: 'Create and manage sales invoices, cash sales, estimates, quotations, and returns.',
    subFeatures: ['Sale Invoices', 'Quotation / Estimate', 'Payment In', 'Sale Order', 'Delivery Challan', 'Sale Return / Cr. Note']
  },
  {
    key: 'purchases',
    name: 'Purchases & Bills',
    category: 'Core Operations',
    icon: ShoppingCart,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Track vendor purchase bills, supplier payments, purchase orders, and debit notes.',
    subFeatures: ['Purchase Bills', 'Payment Out', 'Purchase Orders', 'Purchase Return / Dr. Note', 'Vendor Statements']
  },
  {
    key: 'inventory',
    name: 'Inventory & Items',
    category: 'Stock & Catalog',
    icon: Package,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Manage medicine catalog, stock batches, expiry dates, formula salts, and reorder levels.',
    subFeatures: ['Item List & Stock Value', 'Low Stock Warnings', 'Batch & Expiry Tracker', 'Top Selling Medicines']
  },
  {
    key: 'parties',
    name: 'Parties (Customers & Suppliers)',
    category: 'Relationship Ledger',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Maintain party ledgers, contact details, outstanding receivables, and payables.',
    subFeatures: ['Customer Profiles', 'Supplier Directory', 'Receivables & Payables', 'Party Statements']
  },
  {
    key: 'expenses',
    name: 'Expense Tracking',
    category: 'Financial Control',
    icon: Wallet,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Record daily pharmacy expenses, utilities, staff salaries, rent, and operational overheads.',
    subFeatures: ['Direct & Indirect Expenses', 'Expense Categories', 'Payment Methods', 'Expense Reports']
  },
  {
    key: 'banking',
    name: 'Cash & Bank Management',
    category: 'Treasury & Liquidity',
    icon: Landmark,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    description: 'Manage counter cash in hand, bank accounts, cheque clearances, and loan accounts.',
    subFeatures: ['Cash in Hand Adjustments', 'Bank Accounts & Transfers', 'Cheque Clearing', 'Loan Accounts']
  },
  {
    key: 'reports',
    name: 'Reports & Business Analytics',
    category: 'Intelligence',
    icon: BarChart2,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    description: 'Access Daybook, Profit & Loss, Tax audit, Item stock summary, and transaction ledgers.',
    subFeatures: ['Daybook & P&L Statement', 'Item Stock & Expiry Reports', 'Party Wise Ledgers', 'Tax & GST Summaries']
  },
  {
    key: 'pos',
    name: 'POS Quick Counter',
    category: 'Counter Speed',
    icon: Zap,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    description: 'Ultra-fast counter billing mode with barcode scan support and thermal receipt printing.',
    subFeatures: ['Lightning Rapid Scan', 'Quick Cash Tender', 'Thermal Receipt Auto-print', 'Hold / Recall Carts']
  },
  {
    key: 'syncShare',
    name: 'Cloud Sync & Team Access',
    category: 'Collaboration',
    icon: RefreshCw,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    description: 'Real-time multi-device cloud backup with Firebase Firestore and staff role permissions.',
    subFeatures: ['Firebase Real-time Cloud', 'Multi-user Roles & RBAC', 'Encrypted Local Backups', 'Live Sync Status']
  }
];

export const ModuleVisibilityTab: React.FC = () => {
  const { settings, updateModules, userPreferences, updateUserPreferences } = useSettings();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggle = (key: keyof typeof settings.modules) => {
    const currentVal = settings.modules?.[key] ?? true;
    const nextVal = !currentVal;
    
    updateModules({ [key]: nextVal });
    showToast(`${String(key).toUpperCase()} module ${nextVal ? 'enabled' : 'hidden'} from navigation.`);
  };

  const handleEnableAll = () => {
    updateModules({
      sales: true,
      purchases: true,
      inventory: true,
      parties: true,
      expenses: true,
      banking: true,
      reports: true,
      pos: true,
      syncShare: true,
    });
    showToast('All system modules enabled.');
  };

  // Header buttons toggles
  const showScanHeader = userPreferences?.showScanButtonInHeader !== false;
  const showShiftHeader = userPreferences?.showShiftButtonInHeader !== false;

  const toggleScanHeader = () => {
    updateUserPreferences({ showScanButtonInHeader: !showScanHeader });
    showToast(`Camera Scan button ${!showScanHeader ? 'shown' : 'hidden'} in header.`);
  };

  const toggleShiftHeader = () => {
    updateUserPreferences({ showShiftButtonInHeader: !showShiftHeader });
    showToast(`Cashier Shift button ${!showShiftHeader ? 'shown' : 'hidden'} in header.`);
  };

  // Sidebar Menu Order & Visibility Controls
  const menuOrder = userPreferences?.menuOrder || [];
  const menuVisibility = userPreferences?.menuVisibility || {};

  // Build sorted list of items according to custom order
  const sortedMenuItems = [...DEFAULT_MENU_ITEMS].sort((a, b) => {
    const idxA = menuOrder.indexOf(a.id);
    const idxB = menuOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const handleMoveMenuItem = (id: string, direction: 'up' | 'down') => {
    const currentOrder = sortedMenuItems.map(i => i.id);
    const index = currentOrder.indexOf(id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = currentOrder[index];
      currentOrder[index] = currentOrder[index - 1];
      currentOrder[index - 1] = temp;
    } else if (direction === 'down' && index < currentOrder.length - 1) {
      const temp = currentOrder[index];
      currentOrder[index] = currentOrder[index + 1];
      currentOrder[index + 1] = temp;
    }

    updateUserPreferences({ menuOrder: currentOrder });
    showToast('Sidebar menu order updated.');
  };

  const handleToggleMenuItemVisibility = (id: string) => {
    const currentVis = menuVisibility[id] !== false; // default is visible
    const updated = { ...menuVisibility, [id]: !currentVis };
    updateUserPreferences({ menuVisibility: updated });
    showToast(`Menu item ${!currentVis ? 'enabled' : 'hidden'}.`);
  };

  const handleResetMenuOrder = () => {
    updateUserPreferences({ menuOrder: [], menuVisibility: {} });
    showToast('Sidebar menu reset to default sequence.');
  };

  // Dnd-kit sensors and handler for Drag & Drop menu reordering
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedMenuItems.findIndex((item) => item.id === active.id);
      const newIndex = sortedMenuItems.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedMenuItems, oldIndex, newIndex);
        const newOrderIds = reordered.map((item) => item.id);
        updateUserPreferences({ menuOrder: newOrderIds });
        showToast('Sidebar menu sequence reordered!');
      }
    }
  };

  const activeCount = Object.values(settings.modules || {}).filter(Boolean).length;
  const totalCount = MODULE_DEFINITIONS.length;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header UI Controls & Toggles (Scan & Shift) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Header Bar Action Buttons Settings</h2>
              <p className="text-xs text-slate-500">Enable or hide quick-action buttons displayed in the top header bar</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Scan Button Toggle */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Header Scan Button</h3>
                <p className="text-[11px] text-slate-500">Camera barcode product scanner</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showScanHeader}
                onChange={toggleScanHeader}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Shift Button Toggle */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Header Shift Button</h3>
                <p className="text-[11px] text-slate-500">Cashier shift reconciliation tracker</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showShiftHeader}
                onChange={toggleShiftHeader}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Sidebar Menu Drag & Drop Ordering & On / Off Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Sidebar Menu Drag & Drop Custom Ordering (Per User)</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span>Drag handle</span>
                <GripVertical className="w-3.5 h-3.5 text-indigo-600 inline" />
                <span>or use Up/Down buttons to reorder menus for your personalized navigation bar</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleResetMenuOrder}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Default Order</span>
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedMenuItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedMenuItems.map((item, index) => {
                const isVisible = menuVisibility[item.id] !== false;

                return (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    index={index}
                    totalItems={sortedMenuItems.length}
                    isVisible={isVisible}
                    onMove={handleMoveMenuItem}
                    onToggleVisibility={handleToggleMenuItemVisibility}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Module Grid Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">System Functional Modules</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {activeCount} of {totalCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Configure core backend module features and permission rules across your organization.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleEnableAll}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Enable All Modules</span>
          </button>
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULE_DEFINITIONS.map((mod) => {
          const isEnabled = settings.modules?.[mod.key] ?? true;
          const Icon = mod.icon;

          return (
            <div
              key={mod.key}
              className={`bg-white border rounded-2xl p-4.5 transition-all shadow-xs flex flex-col justify-between ${
                isEnabled ? 'border-slate-200 shadow-sm' : 'border-slate-200/60 bg-slate-50/60 opacity-75'
              }`}
            >
              <div>
                {/* Card Header: Icon, Name & Toggle Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {mod.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{mod.name}</h3>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggle(mod.key)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {mod.description}
                </p>

                {/* Sub Features Chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {mod.subFeatures.map((feat, idx) => (
                    <span
                      key={idx}
                      className={`text-[10.5px] px-2 py-0.5 rounded-md font-medium ${
                        isEnabled 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-slate-200/60 text-slate-400 line-through'
                      }`}
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  {isEnabled ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-emerald-700 text-[11px]">Visible in Sidebar</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-slate-500 text-[11px]">Hidden from Sidebar</span>
                    </>
                  )
                  }
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(mod.key)}
                  className={`text-[11px] font-bold hover:underline ${isEnabled ? 'text-rose-600' : 'text-blue-600'}`}
                >
                  {isEnabled ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Instant live synchronization:</span> Toggling any section immediately updates your navigation drawer and dashboard metrics without requiring a page reload or losing unsaved work.
        </div>
      </div>

    </div>
  );
};
