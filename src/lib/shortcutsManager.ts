export interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  category: 'sale' | 'purchase' | 'inventory' | 'accounts' | 'pharmacy' | 'reports' | 'system';
  defaultKey: string; // e.g. "Alt + S"
  currentKey: string; // e.g. "Alt + S" (can be customized by user)
  path?: string;
  actionType?: 'navigate' | 'event' | 'function';
  eventName?: string;
  iconName?: string;
  editable?: boolean;
}

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // --- SALE ---
  {
    id: 'sale-invoice',
    name: 'Add Sale Invoice',
    description: 'Create a new customer sale invoice or POS bill',
    category: 'sale',
    defaultKey: 'Alt + S',
    currentKey: 'Alt + S',
    path: '/sale/invoices?action=add',
    actionType: 'navigate',
    iconName: 'Receipt',
    editable: true
  },
  {
    id: 'payment-in',
    name: 'Payment In',
    description: 'Record cash or online payment received from customer',
    category: 'sale',
    defaultKey: 'Alt + I',
    currentKey: 'Alt + I',
    path: '/sale/payment-in?action=add',
    actionType: 'navigate',
    iconName: 'ArrowDownLeft',
    editable: true
  },
  {
    id: 'sale-return',
    name: 'Sale Return (Credit Note)',
    description: 'Issue a credit note for returned items',
    category: 'sale',
    defaultKey: 'Alt + R',
    currentKey: 'Alt + R',
    path: '/sale/return?action=add',
    actionType: 'navigate',
    iconName: 'RotateCcw',
    editable: true
  },
  {
    id: 'sale-order',
    name: 'Sale Order',
    description: 'Book advance customer sales orders',
    category: 'sale',
    defaultKey: 'Alt + F',
    currentKey: 'Alt + F',
    path: '/sale/order?action=add',
    actionType: 'navigate',
    iconName: 'ShoppingCart',
    editable: true
  },
  {
    id: 'sale-estimate',
    name: 'Estimate / Quotation',
    description: 'Generate price estimate or quotation for customer',
    category: 'sale',
    defaultKey: 'Alt + Q',
    currentKey: 'Alt + Q',
    path: '/sale/estimate?action=add',
    actionType: 'navigate',
    iconName: 'FileText',
    editable: true
  },
  {
    id: 'delivery-challan',
    name: 'Delivery Challan',
    description: 'Dispatch delivery challan without tax invoice',
    category: 'sale',
    defaultKey: 'Alt + D',
    currentKey: 'Alt + D',
    path: '/sale/challan?action=add',
    actionType: 'navigate',
    iconName: 'Truck',
    editable: true
  },
  {
    id: 'pos-quick-billing',
    name: 'POS Quick Express Counter',
    description: 'Open fast touch & barcode supermarket/pharmacy POS',
    category: 'sale',
    defaultKey: 'F2',
    currentKey: 'F2',
    path: '/billing',
    actionType: 'navigate',
    iconName: 'Zap',
    editable: true
  },

  // --- QUICK PRIVATE TRANSACTION & SPECIAL ---
  {
    id: 'quick-private-transaction',
    name: 'Quick Private Transaction Panel',
    description: 'Fast private transaction modal for Sales, Purchases, Returns & Adjustments',
    category: 'sale',
    defaultKey: 'Alt + P',
    currentKey: 'Alt + P',
    actionType: 'event',
    eventName: 'open-quick-transaction-panel',
    iconName: 'Zap',
    editable: true
  },

  // --- PURCHASE ---
  {
    id: 'purchase-bill',
    name: 'Add Purchase Bill',
    description: 'Record stock purchase from medicine distributor / vendor',
    category: 'purchase',
    defaultKey: 'Alt + B',
    currentKey: 'Alt + B',
    path: '/purchase?action=add',
    actionType: 'navigate',
    iconName: 'PackagePlus',
    editable: true
  },
  {
    id: 'payment-out',
    name: 'Payment Out',
    description: 'Record cash / bank payout made to supplier',
    category: 'purchase',
    defaultKey: 'Alt + O',
    currentKey: 'Alt + O',
    path: '/purchase/payment-out?action=add',
    actionType: 'navigate',
    iconName: 'ArrowUpRight',
    editable: true
  },
  {
    id: 'purchase-return',
    name: 'Purchase Return (Debit Note)',
    description: 'Return damaged or expired stock to distributor',
    category: 'purchase',
    defaultKey: 'Alt + L',
    currentKey: 'Alt + L',
    path: '/purchase/return?action=add',
    actionType: 'navigate',
    iconName: 'RotateCcw',
    editable: true
  },
  {
    id: 'purchase-order',
    name: 'Purchase Order',
    description: 'Place formal supply purchase order with vendor',
    category: 'purchase',
    defaultKey: 'Alt + G',
    currentKey: 'Alt + G',
    path: '/purchase/order?action=add',
    actionType: 'navigate',
    iconName: 'ClipboardList',
    editable: true
  },

  // --- INVENTORY ---
  {
    id: 'inventory-items',
    name: 'Inventory & Items Catalog',
    description: 'Manage medicines, batches, MRP and stock counts',
    category: 'inventory',
    defaultKey: 'Alt + N',
    currentKey: 'Alt + N',
    path: '/inventory',
    actionType: 'navigate',
    iconName: 'Package',
    editable: true
  },
  {
    id: 'barcode-generator',
    name: 'Barcode & QR Generator',
    description: 'Generate and print thermal barcode labels',
    category: 'inventory',
    defaultKey: 'Alt + B',
    currentKey: 'Alt + B',
    path: '/utilities',
    actionType: 'navigate',
    iconName: 'Barcode',
    editable: true
  },
  {
    id: 'low-stock-alert',
    name: 'Low Stock & Reorder Alert',
    description: 'View products currently below safety stock threshold',
    category: 'inventory',
    defaultKey: 'Alt + W',
    currentKey: 'Alt + W',
    path: '/inventory',
    actionType: 'navigate',
    iconName: 'AlertTriangle',
    editable: true
  },

  // --- ACCOUNTS & BANK ---
  {
    id: 'expenses',
    name: 'Add Expense',
    description: 'Record shop utility, rent, tea, delivery or staff expense',
    category: 'accounts',
    defaultKey: 'Alt + E',
    currentKey: 'Alt + E',
    path: '/expenses?action=add',
    actionType: 'navigate',
    iconName: 'Wallet',
    editable: true
  },
  {
    id: 'party-transfer',
    name: 'Bank & Party Transfer',
    description: 'Transfer funds between bank accounts or customer adjustment',
    category: 'accounts',
    defaultKey: 'Alt + J',
    currentKey: 'Alt + J',
    path: '/bank?action=transfer',
    actionType: 'navigate',
    iconName: 'Building2',
    editable: true
  },
  {
    id: 'cash-in-hand',
    name: 'Cash In Hand Register',
    description: 'Real-time drawer cash and daily denomination tracker',
    category: 'accounts',
    defaultKey: 'Alt + H',
    currentKey: 'Alt + H',
    path: '/cash-in-hand',
    actionType: 'navigate',
    iconName: 'Coins',
    editable: true
  },
  {
    id: 'cashier-shift',
    name: 'Cashier Shift Reconcile',
    description: 'Start, close and reconcile cashier drawer shift',
    category: 'accounts',
    defaultKey: 'Alt + K',
    currentKey: 'Alt + K',
    actionType: 'event',
    eventName: 'open-cashier-shift',
    iconName: 'Clock',
    editable: true
  },

  // --- PHARMACY SPECIALTY ---
  {
    id: 'pharmacy-shortage',
    name: 'Shortage Register (Lost Demand)',
    description: 'Track out-of-stock customer requests with WhatsApp order',
    category: 'pharmacy',
    defaultKey: 'Alt + 1',
    currentKey: 'Alt + 1',
    path: '/items',
    actionType: 'navigate',
    iconName: 'FileWarning',
    editable: true
  },
  {
    id: 'pharmacy-narcotics',
    name: 'Narcotics Register (DRAP Form 8)',
    description: 'Controlled medicines dispensation log & PMDC record',
    category: 'pharmacy',
    defaultKey: 'Alt + 2',
    currentKey: 'Alt + 2',
    path: '/items',
    actionType: 'navigate',
    iconName: 'ShieldAlert',
    editable: true
  },
  {
    id: 'pharmacy-chronic',
    name: 'Chronic Patient Refills',
    description: 'Diabetes & BP regular refill patient alerts',
    category: 'pharmacy',
    defaultKey: 'Alt + 3',
    currentKey: 'Alt + 3',
    path: '/items',
    actionType: 'navigate',
    iconName: 'HeartHandshake',
    editable: true
  },
  {
    id: 'pharmacy-returns',
    name: 'Expiry & Breakage Returns',
    description: 'Distributor near-expiry return challan & debit voucher',
    category: 'pharmacy',
    defaultKey: 'Alt + 4',
    currentKey: 'Alt + 4',
    path: '/items',
    actionType: 'navigate',
    iconName: 'RotateCcw',
    editable: true
  },

  // --- REPORTS ---
  {
    id: 'reports-daybook',
    name: 'Day Book & Daily Summary',
    description: 'Consolidated view of all sales, purchases and cash movements',
    category: 'reports',
    defaultKey: 'Alt + Y',
    currentKey: 'Alt + Y',
    path: '/reports?report=daybook',
    actionType: 'navigate',
    iconName: 'BookOpen',
    editable: true
  },
  {
    id: 'reports-profit-loss',
    name: 'Profit & Loss Statement',
    description: 'Real-time gross margin and net profit analysis',
    category: 'reports',
    defaultKey: 'Alt + Q',
    currentKey: 'Alt + Q',
    path: '/reports?report=pnl',
    actionType: 'navigate',
    iconName: 'TrendingUp',
    editable: true
  },
  {
    id: 'reports-tax',
    name: 'GSTR / FBR Sales Tax Report',
    description: 'Tax collected on invoices and eligible input credits',
    category: 'reports',
    defaultKey: 'Alt + T',
    currentKey: 'Alt + T',
    path: '/reports?report=tax',
    actionType: 'navigate',
    iconName: 'FileSpreadsheet',
    editable: true
  },

  // --- SYSTEM & NAVIGATION ---
  {
    id: 'shortcuts-modal',
    name: 'Open Shortcuts & Action Hub',
    description: 'Show complete keyboard shortcuts cheatsheet & fast menu',
    category: 'system',
    defaultKey: 'Ctrl + Enter',
    currentKey: 'Ctrl + Enter',
    actionType: 'event',
    eventName: 'open-shortcuts-modal',
    iconName: 'Keyboard',
    editable: true
  },
  {
    id: 'universal-search',
    name: 'Global Instant Search',
    description: 'Focus universal search to look up any item, invoice or party',
    category: 'system',
    defaultKey: 'Ctrl + K',
    currentKey: 'Ctrl + K',
    actionType: 'event',
    eventName: 'focus-global-search',
    iconName: 'Search',
    editable: true
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar Menu',
    description: 'Expand or collapse navigation sidebar',
    category: 'system',
    defaultKey: 'Ctrl + B',
    currentKey: 'Ctrl + B',
    actionType: 'event',
    eventName: 'toggle-sidebar-collapse',
    iconName: 'Menu',
    editable: true
  },
  {
    id: 'refresh-sync',
    name: 'Live Sync & Refresh Data',
    description: 'Sync with Cloud and reload all live records',
    category: 'system',
    defaultKey: 'Alt + Z',
    currentKey: 'Alt + Z',
    actionType: 'event',
    eventName: 'trigger-cloud-sync',
    iconName: 'RefreshCw',
    editable: true
  },
  {
    id: 'server-live-monitor',
    name: 'Central Server Live Monitor',
    description: 'Real-time multi-user live feed and terminal monitor (/server)',
    category: 'system',
    defaultKey: 'Alt + S',
    currentKey: 'Alt + S',
    path: '/server',
    actionType: 'navigate',
    iconName: 'Server',
    editable: true
  },
  {
    id: 'user-normal-portal',
    name: 'User Counter Portal',
    description: 'Dedicated normal user workspace with quick POS & ledger search',
    category: 'system',
    defaultKey: 'Alt + U',
    currentKey: 'Alt + U',
    path: '/user',
    actionType: 'navigate',
    iconName: 'User',
    editable: true
  }
];

const SHORTCUTS_STORAGE_KEY = 'mbi_custom_shortcuts_v2';

export function getStoredShortcuts(): ShortcutItem[] {
  if (typeof window === 'undefined') return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const customMap: Record<string, string> = JSON.parse(raw);
    return DEFAULT_SHORTCUTS.map(item => ({
      ...item,
      currentKey: customMap[item.id] || item.defaultKey
    }));
  } catch (e) {
    console.warn('Failed to parse custom shortcuts, using defaults', e);
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcutKey(id: string, newKey: string): ShortcutItem[] {
  const current = getStoredShortcuts();
  const customMap: Record<string, string> = {};
  
  current.forEach(item => {
    if (item.id === id) {
      customMap[item.id] = newKey.trim();
    } else if (item.currentKey !== item.defaultKey) {
      customMap[item.id] = item.currentKey;
    }
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(customMap));
    window.dispatchEvent(new CustomEvent('mbi-shortcuts-updated'));
  }

  return getStoredShortcuts();
}

export function resetAllShortcutsToDefault(): ShortcutItem[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('mbi-shortcuts-updated'));
  }
  return DEFAULT_SHORTCUTS;
}

/**
 * Get the currently configured shortcut key for the Private Tab / Quick Transaction
 */
export function getPrivateTabShortcutKey(userId?: string): string {
  if (userId && typeof window !== 'undefined') {
    const userCustom = localStorage.getItem(`mbi_user_shortcut_${userId}_quick-private-transaction`);
    if (userCustom) return userCustom;
  }
  const shortcuts = getStoredShortcuts();
  const found = shortcuts.find(s => s.id === 'quick-private-transaction');
  return found?.currentKey || 'Alt + P';
}

/**
 * Save custom shortcut key for Private Tab / Quick Transaction globally or per user
 */
export function setPrivateTabShortcutKey(newKey: string, userId?: string): void {
  const formattedKey = newKey.trim() || 'Alt + P';
  if (userId && typeof window !== 'undefined') {
    localStorage.setItem(`mbi_user_shortcut_${userId}_quick-private-transaction`, formattedKey);
  }
  saveShortcutKey('quick-private-transaction', formattedKey);
}

/**
 * Normalizes a KeyboardEvent into a standard string like "Alt + S", "Ctrl + K", "F2", "Ctrl + Enter", etc.
 */
export function formatEventToKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Cmd');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
    // Modifier only - return partial
    return parts.join(' + ');
  } else if (key.length === 1) {
    key = key.toUpperCase();
  }

  if (parts.length === 0) {
    return key;
  }

  if (!parts.includes(key)) {
    parts.push(key);
  }

  return parts.join(' + ');
}

/**
 * Checks if a KeyboardEvent matches a shortcut definition string (e.g. "Alt + S")
 */
export function matchesKeyboardEvent(e: KeyboardEvent, shortcutKeyString: string): boolean {
  if (!e || !e.key || typeof e.key !== 'string' || !shortcutKeyString) return false;

  const parts = shortcutKeyString.split('+').map(p => p.trim().toLowerCase());
  const hasCtrl = parts.includes('ctrl') || parts.includes('control');
  const hasMeta = parts.includes('cmd') || parts.includes('meta');
  const hasAlt = parts.includes('alt');
  const hasShift = parts.includes('shift');

  // Find non-modifier key
  const mainKey = parts.find(p => !['ctrl', 'control', 'cmd', 'meta', 'alt', 'shift'].includes(p));

  // Verify modifiers
  if (hasCtrl !== (e.ctrlKey || (e.metaKey && !hasMeta))) return false;
  if (hasAlt !== e.altKey) return false;
  if (hasShift !== e.shiftKey) return false;
  if (hasMeta && !e.metaKey) return false;

  if (!mainKey) return false;

  // Verify main key
  const eventKey = (e.key || '').toLowerCase();
  
  if (mainKey === 'enter' && eventKey === 'enter') return true;
  if (mainKey === 'space' && (eventKey === ' ' || eventKey === 'space')) return true;
  if (mainKey === 'escape' || mainKey === 'esc') return eventKey === 'escape';
  if (mainKey.startsWith('f') && mainKey === eventKey) return true; // F1 - F12

  return mainKey === eventKey;
}

/**
 * Execute shortcut programmatically
 */
export function executeShortcutAction(shortcut: ShortcutItem, navigate: (path: string) => void): void {
  if (shortcut.actionType === 'navigate' && shortcut.path) {
    navigate(shortcut.path);
  } else if (shortcut.actionType === 'event' && shortcut.eventName) {
    window.dispatchEvent(new CustomEvent(shortcut.eventName));
  }
}
