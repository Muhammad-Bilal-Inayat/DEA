import { UserRole, Tenant } from '../types';
import { logMasterAudit } from './masterServerService';
import { logMasterControlAction } from './masterAuditMiddleware';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';
import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * MBI INVENTRA — MASTER USER ACCESS CONTROL & HIERARCHY ENGINE
 * 
 * Hierarchy:
 * PLAN -> ROLE -> USER -> FIRM -> MENU -> SUBMENU -> FUNCTION / ACTION
 * 
 * Rule: The most restrictive applicable permission MUST apply.
 */

export interface MenuItemDefinition {
  id: string;
  label: string;
  iconName: string;
  defaultPath: string;
  moduleKey: string;
  order: number;
  submenus: SubmenuItemDefinition[];
}

export interface SubmenuItemDefinition {
  id: string;
  menuId: string;
  label: string;
  path: string;
  order: number;
  functions: FunctionItemDefinition[];
}

export interface FunctionItemDefinition {
  id: string;
  submenuId: string;
  label: string;
  description: string;
  order: number;
  actions: ActionItemDefinition[];
}

export interface ActionItemDefinition {
  id: string;
  functionId: string;
  label: string;
  code: string;
}

/**
 * High-level direct capability flags for rapid, declarative UI conditional rendering
 */
export interface EffectiveCapabilities {
  canAccessDashboard: boolean;
  canViewReports: boolean;
  canCreateItem: boolean;
  canEditItem: boolean;
  canDeleteItem: boolean;
  canAdjustStock: boolean;
  canExportInventory: boolean;
  canImportInventory: boolean;
  canCreateSaleInvoice: boolean;
  canCreateSale: boolean;
  canEditSaleInvoice: boolean;
  canEditBills: boolean;
  canEditInvoices: boolean;
  canVoidSaleInvoice: boolean;
  canDeleteBills: boolean;
  canDeleteTransactions: boolean;
  canReprintSaleInvoice: boolean;
  canReprintBills: boolean;
  canShareInvoice: boolean;
  canApplyDiscount: boolean;
  canOverrideSalePrice: boolean;
  canViewCostsAndProfit: boolean;
  canViewCost: boolean;
  canCollectPayment: boolean;
  canCollectPayments: boolean;
  canMakePayments: boolean;
  canManageParties: boolean;
  canViewPartyLedger: boolean;
  canManageSuppliers: boolean;
  canCreatePurchase: boolean;
  canEditPurchase: boolean;
  canManageExpenses: boolean;
  canAccessCashBank: boolean;
  canManageBankAccounts: boolean;
  canAccessShiftManagement: boolean;
  canAccessOnlineStore: boolean;
  canManageSettings: boolean;
  canAccessSettings: boolean;
  canSyncCloud: boolean;
  canExportAuditLogs: boolean;
  canManageUsers: boolean;
  canManageUsersAndRoles: boolean;
  [key: string]: boolean;
}

/**
 * Universal mapping from high-level/legacy feature flags to granular 173 switchboard hierarchy
 */
export const FEATURE_TO_SYSTEM_MAP: Record<string, { menuId?: string; submenuId?: string; functionId?: string; actionId?: string }> = {
  // Sales & Invoices
  canCreateSale: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'createSale' },
  canCreateSaleInvoice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'createSale' },
  canEditBills: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'editSale', actionId: 'act_edit_sale' },
  canEditInvoices: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'editSale', actionId: 'act_edit_sale' },
  canEditSaleInvoice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'editSale', actionId: 'act_edit_sale' },
  canDeleteBills: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'deleteSale', actionId: 'act_delete_sale' },
  canVoidSaleInvoice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'deleteSale', actionId: 'act_delete_sale' },
  canDeleteTransactions: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'deleteSale', actionId: 'act_delete_sale' },
  canReprintBills: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'reprintSale', actionId: 'act_print_sale' },
  canReprintSaleInvoice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'reprintSale', actionId: 'act_print_sale' },
  canShareInvoice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'reprintSale', actionId: 'act_print_sale' },
  canShareBill: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'reprintSale', actionId: 'act_print_sale' },
  canApplyDiscount: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'applyDiscount', actionId: 'act_apply_disc' },
  canGiveDiscount: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'applyDiscount', actionId: 'act_apply_disc' },
  canOverrideSalePrice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'overridePrice', actionId: 'act_price_sale' },
  canEditSalePrice: { menuId: 'sale', submenuId: 'saleInvoices', functionId: 'overridePrice', actionId: 'act_price_sale' },

  // Cost & Profit Margins
  canViewCostsAndProfit: { menuId: 'items', submenuId: 'inventoryList', functionId: 'viewCostsAndMargins', actionId: 'act_view_cost' },
  canViewCost: { menuId: 'items', submenuId: 'inventoryList', functionId: 'viewCostsAndMargins', actionId: 'act_view_cost' },
  canViewPurchaseCost: { menuId: 'items', submenuId: 'inventoryList', functionId: 'viewCostsAndMargins', actionId: 'act_view_cost' },
  viewCostsAndMargins: { menuId: 'items', submenuId: 'inventoryList', functionId: 'viewCostsAndMargins', actionId: 'act_view_cost' },
  act_view_cost: { menuId: 'items', submenuId: 'inventoryList', functionId: 'viewCostsAndMargins', actionId: 'act_view_cost' },
  canViewProfitReports: { menuId: 'reports', submenuId: 'financialReports', functionId: 'viewProfitLoss' },

  // Items & Stock
  canAddEditItems: { menuId: 'items', submenuId: 'inventoryList', functionId: 'addEditItems', actionId: 'act_edit_item' },
  canDeleteItem: { menuId: 'items', submenuId: 'inventoryList', functionId: 'addEditItems', actionId: 'act_del_item' },
  canAdjustStock: { menuId: 'items', submenuId: 'inventoryList', functionId: 'stockAdjustment', actionId: 'act_adj_stock' },
  canManageBatches: { menuId: 'items', submenuId: 'inventoryList', functionId: 'batchManagement', actionId: 'act_mg_batches' },
  canManageExpiries: { menuId: 'items', submenuId: 'inventoryList', functionId: 'expiryTracking', actionId: 'act_exp_track' },
  canManageShortageRegistry: { menuId: 'items', submenuId: 'shortageRegistry', functionId: 'manageShortageRegistry' },

  // Purchases
  canCreatePurchase: { menuId: 'purchase', submenuId: 'purchaseBills', functionId: 'createPurchase', actionId: 'act_create_pur' },
  canEditPurchase: { menuId: 'purchase', submenuId: 'purchaseBills', functionId: 'processPurchaseReturn', actionId: 'act_ret_pur' },

  // Parties
  canManageParties: { menuId: 'parties', submenuId: 'partyDirectory', functionId: 'manageParties', actionId: 'act_add_party' },
  canManageSuppliers: { menuId: 'parties', submenuId: 'partyDirectory', functionId: 'manageParties', actionId: 'act_add_party' },
  canManageLedgers: { menuId: 'parties', submenuId: 'partyStatement', functionId: 'partyStatement' },

  // Payments & Bank
  canCollectPayments: { menuId: 'sale', submenuId: 'paymentIn', functionId: 'collectPayment', actionId: 'act_pay_in' },
  canCollectPayment: { menuId: 'sale', submenuId: 'paymentIn', functionId: 'collectPayment', actionId: 'act_pay_in' },
  canMakePayments: { menuId: 'purchase', submenuId: 'paymentOut', functionId: 'makePayment', actionId: 'act_pay_out' },
  canManageBankAccounts: { menuId: 'bank', submenuId: 'bankAccounts', functionId: 'manageBankAccounts' },

  // Reports
  canViewFinancialReports: { menuId: 'reports', submenuId: 'financialReports', functionId: 'viewProfitLoss' },
  canViewProfitAndLoss: { menuId: 'reports', submenuId: 'financialReports', functionId: 'viewProfitLoss' },

  // Settings & Users
  canManageUsersAndRoles: { menuId: 'settings', submenuId: 'userManagement', functionId: 'manageUsers' },
  canManageUsers: { menuId: 'settings', submenuId: 'userManagement', functionId: 'manageUsers' },
  canAccessSettings: { menuId: 'settings', submenuId: 'generalSettings', functionId: 'manageSettings' },
  canBackupRestore: { menuId: 'utilities', submenuId: 'backupRestore', functionId: 'backupData' },
  canExportData: { menuId: 'utilities', submenuId: 'utilityTools', functionId: 'exportData' },
  canImportData: { menuId: 'utilities', submenuId: 'utilityTools', functionId: 'importData' },
  canViewAuditLogs: { menuId: 'utilities', submenuId: 'auditTrail', functionId: 'viewAuditLogs' },
  canManageExpenses: { menuId: 'expenses', submenuId: 'expenseDirectory', functionId: 'manageExpenses' },
  canManageOnlineStore: { menuId: 'onlineStore', submenuId: 'storeManagement', functionId: 'manageOnlineStore' }
};

/**
 * Normalizes and resolves all aliases for a user identifier so permissions match seamlessly
 */
export function resolveUserAliases(userId?: string): string[] {
  if (!userId) return ['usr_active', 'u1', 'usr_mbi_admin', 'usr_admin_01', 'admin-master'];
  const normalized = userId.trim();
  const aliases = new Set<string>([normalized]);

  // Master Admin aliases: 'usr_mbi_admin', 'u1', 'admin-master', 'usr_active', 'usr_admin_01'
  const isMasterAdmin = 
    normalized === 'usr_mbi_admin' || 
    normalized === 'usr_admin_01' || 
    normalized === 'u1' || 
    normalized === 'admin-master' || 
    normalized === 'usr_active' ||
    normalized.toLowerCase().includes('mbi_admin') ||
    normalized.toLowerCase().includes('bilal') ||
    normalized.toLowerCase().includes('bilalinayat');

  if (isMasterAdmin) {
    aliases.add('usr_mbi_admin');
    aliases.add('usr_admin_01');
    aliases.add('u1');
    aliases.add('admin-master');
    aliases.add('usr_active');
    aliases.add('m.bilalinayat786@gmail.com');
  }

  // Also check active simulated user or stored session
  try {
    const activeSimUser = localStorage.getItem('active_simulated_user');
    if (activeSimUser) {
      const parsedSim = JSON.parse(activeSimUser);
      if (parsedSim.id === normalized || parsedSim.email === normalized) {
        if (parsedSim.id) aliases.add(parsedSim.id);
        if (parsedSim.email) aliases.add(parsedSim.email);
        aliases.add('usr_active');
      }
    }
  } catch {}

  // Also check Master Control last selected user
  try {
    const lastControlUser = localStorage.getItem('mbi_master_control_last_selected_user');
    if (lastControlUser && (normalized === lastControlUser || normalized === 'usr_active')) {
      aliases.add(lastControlUser);
      aliases.add('usr_active');
    }
  } catch {}

  // Also check stored users
  try {
    const rawAppUsers = localStorage.getItem('mbi_app_users');
    if (rawAppUsers) {
      const parsed: Array<{ id: string; name?: string; email?: string }> = JSON.parse(rawAppUsers);
      const matched = parsed.find(u => 
        u.id === normalized || 
        (u.email && u.email.toLowerCase() === normalized.toLowerCase()) ||
        (u.name && u.name.toLowerCase() === normalized.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes('bilal'))
      );
      if (matched) {
        aliases.add(matched.id);
        if (matched.email) aliases.add(matched.email);
        if (matched.name && matched.name.toLowerCase().includes('bilal')) {
          aliases.add('usr_mbi_admin');
          aliases.add('u1');
          aliases.add('admin-master');
          aliases.add('usr_active');
          aliases.add('m.bilalinayat786@gmail.com');
        }
      }
    }
  } catch {}

  return Array.from(aliases);
}

/**
 * Fully Resolved Effective Permissions Object (Deep-Merged & Stored at User-Tenant-Firm Intersection)
 */
export interface EffectivePermissions {
  userId: string;
  tenantId: string;
  firmId: string;
  compositeKey: string;
  role: UserRole;
  plan: string;
  calculatedAt: string;
  version: number;
  isCustomOverrideActive: boolean;
  // All 173 resolved states (Hierarchy-aware)
  menus: Record<string, boolean>;
  submenus: Record<string, boolean>;
  functions: Record<string, boolean>;
  actions: Record<string, boolean>;
  // Direct fast capabilities
  capabilities: EffectiveCapabilities;
  // Flattened Map for ultra-fast O(1) conditional UI rendering across any feature, capability or route
  flattenedMap: Record<string, boolean>;
  flat?: Record<string, boolean>;
}

// Master catalogue of all system menus, submenus, functions, and actions
export const SYSTEM_MENU_TREE: MenuItemDefinition[] = [
  {
    id: 'dashboard',
    label: 'Home / Dashboard',
    iconName: 'Home',
    defaultPath: '/',
    moduleKey: 'dashboard',
    order: 1,
    submenus: [
      {
        id: 'dashboardOverview',
        menuId: 'dashboard',
        label: 'Business Overview & Stats',
        path: '/',
        order: 1,
        functions: [
          {
            id: 'viewDashboardCards',
            submenuId: 'dashboardOverview',
            label: 'View Summary Metrics',
            description: 'Today sales, receivables, payables, stock value',
            order: 1,
            actions: [{ id: 'act_view_stats', functionId: 'viewDashboardCards', label: 'View Metrics', code: 'DASH_VIEW' }]
          },
          {
            id: 'viewProfitGraphs',
            submenuId: 'dashboardOverview',
            label: 'View Financial & Sales Charts',
            description: 'Sales velocity, revenue trend, top selling items',
            order: 2,
            actions: [{ id: 'act_view_charts', functionId: 'viewProfitGraphs', label: 'View Charts', code: 'DASH_CHARTS' }]
          }
        ]
      }
    ]
  },
  {
    id: 'parties',
    label: 'Parties (Customers & Suppliers)',
    iconName: 'Users',
    defaultPath: '/parties',
    moduleKey: 'parties',
    order: 2,
    submenus: [
      {
        id: 'partyDirectory',
        menuId: 'parties',
        label: 'Parties Directory',
        path: '/parties',
        order: 1,
        functions: [
          {
            id: 'manageParties',
            submenuId: 'partyDirectory',
            label: 'Add & Edit Customer/Supplier Profiles',
            description: 'Create new party, phone, address, credit limit',
            order: 1,
            actions: [
              { id: 'act_create_party', functionId: 'manageParties', label: 'Create Party', code: 'PARTY_CREATE' },
              { id: 'act_edit_party', functionId: 'manageParties', label: 'Edit Party', code: 'PARTY_EDIT' },
              { id: 'act_delete_party', functionId: 'manageParties', label: 'Delete Party', code: 'PARTY_DELETE' }
            ]
          },
          {
            id: 'viewPartyLedgers',
            submenuId: 'partyDirectory',
            label: 'View Statement of Accounts / Ledgers',
            description: 'Historical debit/credit ledger, payment statements',
            order: 2,
            actions: [{ id: 'act_view_ledger', functionId: 'viewPartyLedgers', label: 'View Ledgers', code: 'PARTY_LEDGER' }]
          }
        ]
      }
    ]
  },
  {
    id: 'items',
    label: 'Items & Products',
    iconName: 'Package',
    defaultPath: '/items',
    moduleKey: 'items',
    order: 3,
    submenus: [
      {
        id: 'inventoryList',
        menuId: 'items',
        label: 'Products & Stock Inventory',
        path: '/items',
        order: 1,
        functions: [
          {
            id: 'addEditItems',
            submenuId: 'inventoryList',
            label: 'Add & Edit Products / Medicines',
            description: 'Formulation, pricing, barcode, packing units',
            order: 1,
            actions: [
              { id: 'act_add_item', functionId: 'addEditItems', label: 'Add Product', code: 'ITEM_ADD' },
              { id: 'act_edit_item', functionId: 'addEditItems', label: 'Edit Product', code: 'ITEM_EDIT' },
              { id: 'act_delete_item', functionId: 'addEditItems', label: 'Delete Product', code: 'ITEM_DELETE' }
            ]
          },
          {
            id: 'adjustStock',
            submenuId: 'inventoryList',
            label: 'Inventory Stock Adjustments',
            description: 'Manual physical count adjustment and discrepancy log',
            order: 2,
            actions: [{ id: 'act_adjust_stock', functionId: 'adjustStock', label: 'Adjust Stock', code: 'STOCK_ADJUST' }]
          },
          {
            id: 'viewCostsAndMargins',
            submenuId: 'inventoryList',
            label: 'View Purchase Costs & Profit Margins',
            description: 'Display purchase rate, trade price, margins',
            order: 3,
            actions: [{ id: 'act_view_cost', functionId: 'viewCostsAndMargins', label: 'View Cost Rates', code: 'VIEW_COST' }]
          },
          {
            id: 'manageBatches',
            submenuId: 'inventoryList',
            label: 'Batch & Expiry Controls',
            description: 'Track batch numbers, expiration dates, racks',
            order: 4,
            actions: [{ id: 'act_manage_batches', functionId: 'manageBatches', label: 'Batch Control', code: 'BATCH_MGMT' }]
          }
        ]
      },
      {
        id: 'shortageRegistry',
        menuId: 'items',
        label: 'Shortage Registry & Demand Register',
        path: '/shortage-registry',
        order: 2,
        functions: [
          {
            id: 'manageShortageRegistry',
            submenuId: 'shortageRegistry',
            label: 'Manage Out-of-Stock Demand',
            description: 'Record customer requests and shortage items',
            order: 1,
            actions: [{ id: 'act_shortage_edit', functionId: 'manageShortageRegistry', label: 'Edit Shortage Log', code: 'SHORTAGE_EDIT' }]
          }
        ]
      },
      {
        id: 'topProducts',
        menuId: 'items',
        label: 'Top Selling & Fast Moving Products',
        path: '/top-products',
        order: 3,
        functions: [
          {
            id: 'viewTopProducts',
            submenuId: 'topProducts',
            label: 'View Fast Moving Analytics',
            description: 'Top revenue and high velocity items analysis',
            order: 1,
            actions: [{ id: 'act_top_prod_view', functionId: 'viewTopProducts', label: 'View Fast Movers', code: 'TOP_PROD_VIEW' }]
          }
        ]
      }
    ]
  },
  {
    id: 'sale',
    label: 'Sales & POS Billing',
    iconName: 'FileText',
    defaultPath: '/sale/invoices',
    moduleKey: 'sale',
    order: 4,
    submenus: [
      {
        id: 'saleInvoices',
        menuId: 'sale',
        label: 'Sale Invoices & POS Counter',
        path: '/sale/invoices',
        order: 1,
        functions: [
          {
            id: 'createSale',
            submenuId: 'saleInvoices',
            label: 'Create New Sale Invoices / POS Counter',
            description: 'Generate thermal receipts, barcode checkout',
            order: 1,
            actions: [{ id: 'act_create_sale', functionId: 'createSale', label: 'Create Sale', code: 'SALE_CREATE' }]
          },
          {
            id: 'editSale',
            submenuId: 'saleInvoices',
            label: 'Edit Saved Invoices',
            description: 'Modify items, quantities, and prices on existing invoices',
            order: 2,
            actions: [{ id: 'act_edit_sale', functionId: 'editSale', label: 'Edit Invoices', code: 'SALE_EDIT' }]
          },
          {
            id: 'deleteSale',
            submenuId: 'saleInvoices',
            label: 'Delete / Void Invoices',
            description: 'Cancel and reverse completed invoices from database',
            order: 3,
            actions: [{ id: 'act_delete_sale', functionId: 'deleteSale', label: 'Delete Invoices', code: 'SALE_DELETE' }]
          },
          {
            id: 'reprintSale',
            submenuId: 'saleInvoices',
            label: 'Reprint Receipts & Export PDF',
            description: 'Print duplicate receipts, share WhatsApp invoice',
            order: 4,
            actions: [{ id: 'act_print_sale', functionId: 'reprintSale', label: 'Print Receipts', code: 'SALE_PRINT' }]
          },
          {
            id: 'applyDiscount',
            submenuId: 'saleInvoices',
            label: 'Apply Custom Discounts',
            description: 'Authorize percent or cash discounts on checkout',
            order: 5,
            actions: [{ id: 'act_apply_disc', functionId: 'applyDiscount', label: 'Grant Discount', code: 'SALE_DISC' }]
          }
        ]
      },
      {
        id: 'paymentIn',
        menuId: 'sale',
        label: 'Payment In (Customer Collections)',
        path: '/sale/payment-in',
        order: 2,
        functions: [
          {
            id: 'collectPayment',
            submenuId: 'paymentIn',
            label: 'Receive Customer Payments',
            description: 'Record cash, online bank, and cheque receipts',
            order: 1,
            actions: [{ id: 'act_collect_pay', functionId: 'collectPayment', label: 'Receive Payment', code: 'PAY_IN' }]
          }
        ]
      },
      {
        id: 'estimateQuotation',
        menuId: 'sale',
        label: 'Estimate / Quotation',
        path: '/sale/quotation',
        order: 3,
        functions: [
          {
            id: 'manageQuotations',
            submenuId: 'estimateQuotation',
            label: 'Create & Manage Quotations',
            description: 'Non-financial estimates and price quotes',
            order: 1,
            actions: [{ id: 'act_quote_edit', functionId: 'manageQuotations', label: 'Create Quotation', code: 'QUOTE_CREATE' }]
          }
        ]
      },
      {
        id: 'saleOrder',
        menuId: 'sale',
        label: 'Sale Orders',
        path: '/sale/order',
        order: 4,
        functions: [
          {
            id: 'manageSaleOrders',
            submenuId: 'saleOrder',
            label: 'Process Customer Orders',
            description: 'Pending booking orders and dispatching',
            order: 1,
            actions: [{ id: 'act_sale_order', functionId: 'manageSaleOrders', label: 'Process Orders', code: 'ORDER_SALE' }]
          }
        ]
      },
      {
        id: 'deliveryChallan',
        menuId: 'sale',
        label: 'Delivery Challan',
        path: '/sale/challan',
        order: 5,
        functions: [
          {
            id: 'manageDeliveryChallan',
            submenuId: 'deliveryChallan',
            label: 'Dispatch Delivery Challans',
            description: 'Goods transit documents without commercial invoice',
            order: 1,
            actions: [{ id: 'act_challan', functionId: 'manageDeliveryChallan', label: 'Dispatch Challan', code: 'CHALLAN' }]
          }
        ]
      },
      {
        id: 'saleReturn',
        menuId: 'sale',
        label: 'Sale Return / Credit Note',
        path: '/sale/return',
        order: 6,
        functions: [
          {
            id: 'processReturn',
            submenuId: 'saleReturn',
            label: 'Process Customer Sale Returns',
            description: 'Return items back to stock and issue credit',
            order: 1,
            actions: [{ id: 'act_sale_return', functionId: 'processReturn', label: 'Process Return', code: 'RETURN_SALE' }]
          }
        ]
      }
    ]
  },
  {
    id: 'shiftManagement',
    label: 'Cashier Shifts & POS',
    iconName: 'DollarSign',
    defaultPath: '/shift-management',
    moduleKey: 'sale',
    order: 5,
    submenus: [
      {
        id: 'shiftOperations',
        menuId: 'shiftManagement',
        label: 'Shift Management',
        path: '/shift-management',
        order: 1,
        functions: [
          {
            id: 'manageShifts',
            submenuId: 'shiftOperations',
            label: 'Open, Reconcile & Close Cashier Shifts',
            description: 'Opening float, drawer cash count, shift audit report',
            order: 1,
            actions: [
              { id: 'act_open_shift', functionId: 'manageShifts', label: 'Open Shift', code: 'SHIFT_OPEN' },
              { id: 'act_close_shift', functionId: 'manageShifts', label: 'Close Shift', code: 'SHIFT_CLOSE' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'purchase',
    label: 'Purchases & Suppliers',
    iconName: 'ShoppingCart',
    defaultPath: '/purchase',
    moduleKey: 'purchase',
    order: 6,
    submenus: [
      {
        id: 'purchaseBills',
        menuId: 'purchase',
        label: 'Purchase Bills (Inward Stock)',
        path: '/purchase',
        order: 1,
        functions: [
          {
            id: 'createPurchase',
            submenuId: 'purchaseBills',
            label: 'Create & Inward Purchase Bills',
            description: 'Add supplier bills, batch quantities, cost prices',
            order: 1,
            actions: [{ id: 'act_create_pur', functionId: 'createPurchase', label: 'Create Purchase', code: 'PUR_CREATE' }]
          },
          {
            id: 'editPurchase',
            submenuId: 'purchaseBills',
            label: 'Edit Purchase Bills',
            description: 'Modify supplier costs, taxes, and batch receipts',
            order: 2,
            actions: [{ id: 'act_edit_pur', functionId: 'editPurchase', label: 'Edit Purchase', code: 'PUR_EDIT' }]
          },
          {
            id: 'deletePurchase',
            submenuId: 'purchaseBills',
            label: 'Delete Purchase Records',
            description: 'Remove inward bill and reduce stock',
            order: 3,
            actions: [{ id: 'act_delete_pur', functionId: 'deletePurchase', label: 'Delete Purchase', code: 'PUR_DELETE' }]
          }
        ]
      },
      {
        id: 'paymentOut',
        menuId: 'purchase',
        label: 'Payment Out (Supplier Disbursements)',
        path: '/purchase/payment-out',
        order: 2,
        functions: [
          {
            id: 'makePayment',
            submenuId: 'paymentOut',
            label: 'Make Payments to Suppliers & Vendors',
            description: 'Disburse cash, bank transfer, or cheque to vendors',
            order: 1,
            actions: [{ id: 'act_make_pay', functionId: 'makePayment', label: 'Make Payment', code: 'PAY_OUT' }]
          }
        ]
      },
      {
        id: 'purchaseOrder',
        menuId: 'purchase',
        label: 'Purchase Orders (PO)',
        path: '/purchase/order',
        order: 3,
        functions: [
          {
            id: 'managePurchaseOrders',
            submenuId: 'purchaseOrder',
            label: 'Generate Purchase Orders',
            description: 'Send purchase orders to distributors & pharmaceutical vendors',
            order: 1,
            actions: [{ id: 'act_pur_order', functionId: 'managePurchaseOrders', label: 'Create PO', code: 'PO_CREATE' }]
          }
        ]
      },
      {
        id: 'purchaseReturn',
        menuId: 'purchase',
        label: 'Purchase Return / Debit Note',
        path: '/purchase/return',
        order: 4,
        functions: [
          {
            id: 'processPurchaseReturn',
            submenuId: 'purchaseReturn',
            label: 'Process Returns to Distributor / Debit Notes',
            description: 'Return damaged or expired items to distributor',
            order: 1,
            actions: [{ id: 'act_pur_ret', functionId: 'processPurchaseReturn', label: 'Process Debit Note', code: 'PUR_RETURN' }]
          }
        ]
      }
    ]
  },
  {
    id: 'expenses',
    label: 'Expenses Management',
    iconName: 'Wallet',
    defaultPath: '/expenses',
    moduleKey: 'expenses',
    order: 7,
    submenus: [
      {
        id: 'expenseDirectory',
        menuId: 'expenses',
        label: 'Expenses Directory',
        path: '/expenses',
        order: 1,
        functions: [
          {
            id: 'manageExpenses',
            submenuId: 'expenseDirectory',
            label: 'Record & Manage Operational Expenses',
            description: 'Rent, salaries, utility bills, tea, petty cash',
            order: 1,
            actions: [
              { id: 'act_add_exp', functionId: 'manageExpenses', label: 'Add Expense', code: 'EXP_ADD' },
              { id: 'act_delete_exp', functionId: 'manageExpenses', label: 'Delete Expense', code: 'EXP_DELETE' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'bank',
    label: 'Cash & Bank Accounts',
    iconName: 'Landmark',
    defaultPath: '/bank',
    moduleKey: 'bank',
    order: 8,
    submenus: [
      {
        id: 'bankAccounts',
        menuId: 'bank',
        label: 'Bank Accounts & Transfers',
        path: '/bank',
        order: 1,
        functions: [
          {
            id: 'manageBankAccounts',
            submenuId: 'bankAccounts',
            label: 'Manage Bank Accounts & Fund Transfers',
            description: 'Bank balance, account adjustments, inter-bank transfers',
            order: 1,
            actions: [{ id: 'act_bank_mgmt', functionId: 'manageBankAccounts', label: 'Manage Banks', code: 'BANK_MGMT' }]
          }
        ]
      },
      {
        id: 'cashInHand',
        menuId: 'bank',
        label: 'Cash in Hand (Physical Register)',
        path: '/cash-in-hand',
        order: 2,
        functions: [
          {
            id: 'manageCashInHand',
            submenuId: 'cashInHand',
            label: 'Cash Drawer Adjustments & Counting',
            description: 'Daily cash in hand balance and cash transfers',
            order: 1,
            actions: [{ id: 'act_cash_adjust', functionId: 'manageCashInHand', label: 'Adjust Cash', code: 'CASH_ADJUST' }]
          }
        ]
      },
      {
        id: 'cheques',
        menuId: 'bank',
        label: 'Cheque Clearance Register',
        path: '/bank/cheques',
        order: 3,
        functions: [
          {
            id: 'manageCheques',
            submenuId: 'cheques',
            label: 'Manage Cheques & Deposit Clearance',
            description: 'Pending post-dated cheques, clearance status',
            order: 1,
            actions: [{ id: 'act_cheque_mgmt', functionId: 'manageCheques', label: 'Clear Cheques', code: 'CHEQUE_CLEAR' }]
          }
        ]
      },
      {
        id: 'loanAccounts',
        menuId: 'bank',
        label: 'Loan Accounts',
        path: '/bank/loan-accounts',
        order: 4,
        functions: [
          {
            id: 'manageLoans',
            submenuId: 'loanAccounts',
            label: 'Manage Borrowing & Lending Accounts',
            description: 'Principal loan, repayment installments, interest',
            order: 1,
            actions: [{ id: 'act_loan_mgmt', functionId: 'manageLoans', label: 'Manage Loans', code: 'LOAN_MGMT' }]
          }
        ]
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    iconName: 'BarChart2',
    defaultPath: '/reports',
    moduleKey: 'reports',
    order: 9,
    submenus: [
      {
        id: 'financialReports',
        menuId: 'reports',
        label: 'Financial & Profit/Loss Reports',
        path: '/reports?tab=financial',
        order: 1,
        functions: [
          {
            id: 'viewProfitLoss',
            submenuId: 'financialReports',
            label: 'View Profit & Loss / Balance Sheet',
            description: 'Net gross profit, margin breakdown, tax statement',
            order: 1,
            actions: [{ id: 'act_view_pl', functionId: 'viewProfitLoss', label: 'View P&L', code: 'REPORT_PL' }]
          },
          {
            id: 'exportReports',
            submenuId: 'financialReports',
            label: 'Export Reports to Excel & PDF',
            description: 'Download detailed statements to spreadsheet',
            order: 2,
            actions: [{ id: 'act_export_rep', functionId: 'exportReports', label: 'Export Reports', code: 'REPORT_EXPORT' }]
          }
        ]
      },
      {
        id: 'operationalReports',
        menuId: 'reports',
        label: 'Sales, Stock & Tax Reports',
        path: '/reports',
        order: 2,
        functions: [
          {
            id: 'viewOperationalReports',
            submenuId: 'operationalReports',
            label: 'View Daily Sales, Stock, & Expiry Reports',
            description: 'Stock valuation, low stock alert, sales by staff',
            order: 1,
            actions: [{ id: 'act_view_ops_rep', functionId: 'viewOperationalReports', label: 'View Operational Reports', code: 'REPORT_OPS' }]
          }
        ]
      }
    ]
  },
  {
    id: 'onlineStore',
    label: 'Online Storefront & E-Commerce',
    iconName: 'ShoppingBag',
    defaultPath: '/online-store',
    moduleKey: 'sale',
    order: 10,
    submenus: [
      {
        id: 'storeManagement',
        menuId: 'onlineStore',
        label: 'Online Store Orders & Catalog',
        path: '/online-store',
        order: 1,
        functions: [
          {
            id: 'manageOnlineStore',
            submenuId: 'storeManagement',
            label: 'Manage Web Storefront & Digital Orders',
            description: 'Publish products online, manage customer web orders',
            order: 1,
            actions: [{ id: 'act_store_mgmt', functionId: 'manageOnlineStore', label: 'Store Management', code: 'STORE_MGMT' }]
          }
        ]
      }
    ]
  },
  {
    id: 'utilities',
    label: 'Utilities & Barcodes',
    iconName: 'Wrench',
    defaultPath: '/utilities',
    moduleKey: 'utilities',
    order: 11,
    submenus: [
      {
        id: 'utilityTools',
        menuId: 'utilities',
        label: 'Barcode Generator & Bulk Import/Export',
        path: '/utilities',
        order: 1,
        functions: [
          {
            id: 'useUtilities',
            submenuId: 'utilityTools',
            label: 'Use Barcode Generator & Excel Importers',
            description: 'Generate sticker labels, import medicine master',
            order: 1,
            actions: [{ id: 'act_use_utils', functionId: 'useUtilities', label: 'Use Utilities', code: 'UTIL_USE' }]
          }
        ]
      }
    ]
  },
  {
    id: 'syncShare',
    label: 'Cloud Sync & Multi-Device',
    iconName: 'RefreshCw',
    defaultPath: '/sync-share',
    moduleKey: 'syncShare',
    order: 12,
    submenus: [
      {
        id: 'syncCenter',
        menuId: 'syncShare',
        label: 'Cloud Server Synchronization',
        path: '/sync-share',
        order: 1,
        functions: [
          {
            id: 'syncCloud',
            submenuId: 'syncCenter',
            label: 'Trigger Realtime Cloud Sync & Database Reset',
            description: 'Push offline state, pull cloud Firestore data',
            order: 1,
            actions: [{ id: 'act_sync_cloud', functionId: 'syncCloud', label: 'Sync Cloud', code: 'SYNC_CLOUD' }]
          }
        ]
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings & Administration',
    iconName: 'Settings',
    defaultPath: '/settings',
    moduleKey: 'settings',
    order: 13,
    submenus: [
      {
        id: 'generalSettings',
        menuId: 'settings',
        label: 'Business Settings & Print Templates',
        path: '/settings',
        order: 1,
        functions: [
          {
            id: 'manageSettings',
            submenuId: 'generalSettings',
            label: 'Configure Invoice Layout, VAT, & Thermal Printer',
            description: 'Thermal 80mm/58mm format, company header, tax rate',
            order: 1,
            actions: [{ id: 'act_manage_settings', functionId: 'manageSettings', label: 'Edit Settings', code: 'SETTINGS_EDIT' }]
          },
          {
            id: 'manageStaffUsers',
            submenuId: 'generalSettings',
            label: 'Manage Staff Team & Terminals',
            description: 'Create cashier/pharmacist accounts, role assignment',
            order: 2,
            actions: [{ id: 'act_manage_staff', functionId: 'manageStaffUsers', label: 'Manage Staff', code: 'STAFF_MGMT' }]
          },
          {
            id: 'backupRestoreData',
            submenuId: 'generalSettings',
            label: 'Database Backup & Restore Vault',
            description: 'Export local backup, restore database from JSON file',
            order: 3,
            actions: [{ id: 'act_backup_restore', functionId: 'backupRestoreData', label: 'Backup & Restore', code: 'BACKUP_MGMT' }]
          }
        ]
      }
    ]
  }
];

/**
 * User Access Control Profile representing a specific user's granular toggles and orderings
 */
export interface UserAccessControlProfile {
  userId: string;
  tenantId?: string;
  firmId?: string;
  role: UserRole;
  plan?: string;
  isCustomOverrideActive: boolean;

  // Custom ordering (array of IDs)
  menuOrder: string[];
  submenuOrder: Record<string, string[]>; // menuId -> array of submenuIds
  functionOrder: Record<string, string[]>; // submenuId -> array of functionIds

  // Granular ON / OFF switches (true = ON, false = OFF)
  menuToggles: Record<string, boolean>;
  submenuToggles: Record<string, boolean>;
  functionToggles: Record<string, boolean>;
  actionToggles: Record<string, boolean>;

  updatedAt: string;
  updatedBy?: string;
}

/**
 * Plan Defaults Matrix
 */
export function getPlanDefaultToggles(plan: string): {
  menus: Record<string, boolean>;
  submenus: Record<string, boolean>;
  functions: Record<string, boolean>;
  actions: Record<string, boolean>;
} {
  const isTrial = plan.includes('Trial') || plan.includes('3-Day');
  const isStandard = plan === 'Standard POS';
  const isEnterprise = plan.includes('Enterprise') || plan.includes('Lifetime') || plan.includes('Pharmacy Pro');

  const menus: Record<string, boolean> = {};
  const submenus: Record<string, boolean> = {};
  const functions: Record<string, boolean> = {};
  const actions: Record<string, boolean> = {};

  SYSTEM_MENU_TREE.forEach(menu => {
    // Standard POS might restrict online store or advanced cloud sync
    if (isStandard && (menu.id === 'onlineStore' || menu.id === 'syncShare')) {
      menus[menu.id] = false;
    } else {
      menus[menu.id] = true;
    }

    menu.submenus.forEach(sub => {
      submenus[sub.id] = menus[menu.id] !== false;
      sub.functions.forEach(fn => {
        functions[fn.id] = submenus[sub.id] !== false;
        fn.actions.forEach(act => {
          actions[act.id] = functions[fn.id] !== false;
        });
      });
    });
  });

  return { menus, submenus, functions, actions };
}

/**
 * Role Defaults Matrix
 */
export function getRoleDefaultToggles(role: UserRole): {
  menus: Record<string, boolean>;
  submenus: Record<string, boolean>;
  functions: Record<string, boolean>;
  actions: Record<string, boolean>;
} {
  const norm = role || 'Primary Admin';

  const menus: Record<string, boolean> = {};
  const submenus: Record<string, boolean> = {};
  const functions: Record<string, boolean> = {};
  const actions: Record<string, boolean> = {};

  // Initialize all to false for safety, then enable according to role archetype
  SYSTEM_MENU_TREE.forEach(menu => {
    menus[menu.id] = false;
    menu.submenus.forEach(sub => {
      submenus[sub.id] = false;
      sub.functions.forEach(fn => {
        functions[fn.id] = false;
        fn.actions.forEach(act => {
          actions[act.id] = false;
        });
      });
    });
  });

  if (norm === 'Primary Admin' || norm === 'Secondary Admin' || norm === 'Admin') {
    // Unrestricted
    SYSTEM_MENU_TREE.forEach(menu => {
      menus[menu.id] = true;
      menu.submenus.forEach(sub => {
        submenus[sub.id] = true;
        sub.functions.forEach(fn => {
          functions[fn.id] = true;
          fn.actions.forEach(act => {
            actions[act.id] = true;
          });
        });
      });
    });
  } else if (norm === 'Store Manager' || norm === 'Manager') {
    // Can do almost everything except deleting company or master settings
    SYSTEM_MENU_TREE.forEach(menu => {
      menus[menu.id] = true;
      menu.submenus.forEach(sub => {
        submenus[sub.id] = true;
        sub.functions.forEach(fn => {
          functions[fn.id] = true;
          fn.actions.forEach(act => {
            actions[act.id] = true;
          });
        });
      });
    });
    // Disallow staff creation and full backup delete
    functions['manageStaffUsers'] = false;
  } else if (norm === 'Cashier' || norm === 'Biller') {
    // Specific Cashier defaults:
    // ON: POS, Sales, Customers, Cash in Hand, Shift Management
    // OFF: Purchases, Suppliers, Reports, Settings, Inventory Adjustment, View Costs
    menus['dashboard'] = true;
    submenus['dashboardOverview'] = true;
    functions['viewDashboardCards'] = true;

    menus['parties'] = true;
    submenus['partyDirectory'] = true;
    functions['manageParties'] = true;
    actions['act_create_party'] = true;
    actions['act_edit_party'] = false;
    actions['act_delete_party'] = false;

    menus['items'] = true;
    submenus['inventoryList'] = true;
    submenus['shortageRegistry'] = true;
    submenus['topProducts'] = true;
    functions['addEditItems'] = false;
    functions['adjustStock'] = false;
    functions['viewCostsAndMargins'] = false;
    functions['manageBatches'] = false;
    functions['manageShortageRegistry'] = true;
    functions['viewTopProducts'] = true;

    menus['sale'] = true;
    submenus['saleInvoices'] = true;
    submenus['paymentIn'] = true;
    submenus['estimateQuotation'] = true;
    submenus['saleOrder'] = true;
    submenus['deliveryChallan'] = false;
    submenus['saleReturn'] = true;

    functions['createSale'] = true;
    functions['editSale'] = false;
    functions['deleteSale'] = false;
    functions['reprintSale'] = true;
    functions['applyDiscount'] = true;
    functions['collectPayment'] = true;
    functions['processReturn'] = true;

    menus['shiftManagement'] = true;
    submenus['shiftOperations'] = true;
    functions['manageShifts'] = true;

    menus['bank'] = true;
    submenus['cashInHand'] = true;
    functions['manageCashInHand'] = true;

    // Strict OFF
    menus['purchase'] = false;
    menus['expenses'] = false;
    menus['reports'] = false;
    menus['settings'] = false;
    menus['syncShare'] = false;
    menus['utilities'] = false;
    menus['onlineStore'] = false;
  } else if (norm === 'Accountant' || norm === 'CA/Accountant') {
    // Accountant defaults:
    // ON: Ledgers, Cash & Bank, Expenses, Reports, P&L, Payment In/Out, View Invoices
    // OFF: Create Sale POS, Add Items, Settings, Cloud Sync
    menus['dashboard'] = true;
    submenus['dashboardOverview'] = true;
    functions['viewDashboardCards'] = true;
    functions['viewProfitGraphs'] = true;

    menus['parties'] = true;
    submenus['partyDirectory'] = true;
    functions['manageParties'] = true;
    functions['viewPartyLedgers'] = true;

    menus['sale'] = true;
    submenus['saleInvoices'] = true;
    submenus['paymentIn'] = true;
    functions['createSale'] = false;
    functions['reprintSale'] = true;
    functions['collectPayment'] = true;

    menus['purchase'] = true;
    submenus['purchaseBills'] = true;
    submenus['paymentOut'] = true;
    functions['createPurchase'] = true;
    functions['makePayment'] = true;

    menus['expenses'] = true;
    submenus['expenseDirectory'] = true;
    functions['manageExpenses'] = true;

    menus['bank'] = true;
    submenus['bankAccounts'] = true;
    submenus['cashInHand'] = true;
    submenus['cheques'] = true;
    submenus['loanAccounts'] = true;
    functions['manageBankAccounts'] = true;
    functions['manageCashInHand'] = true;
    functions['manageCheques'] = true;
    functions['manageLoans'] = true;

    menus['reports'] = true;
    submenus['financialReports'] = true;
    submenus['operationalReports'] = true;
    functions['viewProfitLoss'] = true;
    functions['exportReports'] = true;
    functions['viewOperationalReports'] = true;

    menus['items'] = true;
    submenus['inventoryList'] = true;
    functions['viewCostsAndMargins'] = true;
    functions['addEditItems'] = false;
    functions['adjustStock'] = false;

    menus['settings'] = false;
    menus['syncShare'] = false;
    menus['utilities'] = false;
  } else if (norm === 'Pharmacist') {
    // Pharmacist defaults:
    // ON: Items, Batch/Expiry, Narcotic/Controlled Drugs, Shortage, Fast Movers, Sales, Returns
    // OFF: Financial P&L, Bank Accounts, Staff Management, Master Settings
    menus['dashboard'] = true;
    menus['items'] = true;
    submenus['inventoryList'] = true;
    submenus['shortageRegistry'] = true;
    submenus['topProducts'] = true;
    functions['addEditItems'] = true;
    functions['adjustStock'] = true;
    functions['manageBatches'] = true;
    functions['viewCostsAndMargins'] = true;
    functions['manageShortageRegistry'] = true;
    functions['viewTopProducts'] = true;

    menus['sale'] = true;
    submenus['saleInvoices'] = true;
    submenus['saleReturn'] = true;
    functions['createSale'] = true;
    functions['processReturn'] = true;
    functions['reprintSale'] = true;

    menus['purchase'] = true;
    submenus['purchaseBills'] = true;
    submenus['purchaseOrder'] = true;
    functions['createPurchase'] = true;
    functions['managePurchaseOrders'] = true;

    menus['parties'] = true;
    submenus['partyDirectory'] = true;
    functions['manageParties'] = true;

    menus['reports'] = true;
    submenus['operationalReports'] = true;
    functions['viewOperationalReports'] = true;
    functions['viewProfitLoss'] = false;

    menus['bank'] = false;
    menus['expenses'] = false;
    menus['settings'] = false;
    menus['syncShare'] = false;
  } else if (norm === 'Inventory Manager' || norm === 'Stock Keeper') {
    // Stock keeper:
    // ON: Items, Stock adjustments, Purchases, Shortage, Batches
    // OFF: Sales, POS, Cash, Expenses, Settings, Reports
    menus['dashboard'] = true;
    menus['items'] = true;
    submenus['inventoryList'] = true;
    submenus['shortageRegistry'] = true;
    submenus['topProducts'] = true;
    functions['addEditItems'] = true;
    functions['adjustStock'] = true;
    functions['manageBatches'] = true;
    functions['manageShortageRegistry'] = true;

    menus['purchase'] = true;
    submenus['purchaseBills'] = true;
    submenus['purchaseOrder'] = true;
    submenus['purchaseReturn'] = true;
    functions['createPurchase'] = true;
    functions['processPurchaseReturn'] = true;

    menus['parties'] = true;
    submenus['partyDirectory'] = true;
    functions['manageParties'] = true;

    menus['sale'] = false;
    menus['bank'] = false;
    menus['expenses'] = false;
    menus['reports'] = false;
    menus['settings'] = false;
  } else {
    // Salesman / Sales Staff / Viewer
    menus['dashboard'] = true;
    menus['sale'] = true;
    submenus['saleInvoices'] = true;
    functions['createSale'] = true;
    functions['reprintSale'] = true;
    menus['items'] = true;
    submenus['inventoryList'] = true;
    functions['viewCostsAndMargins'] = false;
    functions['addEditItems'] = false;
    functions['adjustStock'] = false;
    menus['parties'] = true;
  }

  return { menus, submenus, functions, actions };
}

/**
 * Storage Key Helper with strict tenant + firm + user isolation and direct user index
 */
export function getUserAccessProfileKey(userId: string, tenantId?: string, firmId?: string): string {
  const tid = tenantId || 'default_tenant';
  const fid = firmId || 'default_firm';
  return `mbi_user_access_profile_${tid}_${fid}_${userId}`;
}

const GLOBAL_PROFILES_INDEX_KEY = 'mbi_user_access_profiles_index_v2';

/**
 * Helper to get all saved profile index mapping
 */
function getProfilesIndex(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GLOBAL_PROFILES_INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function updateProfilesIndex(userId: string, fullStorageKey: string): void {
  try {
    const idx = getProfilesIndex();
    idx[userId] = fullStorageKey;
    localStorage.setItem(GLOBAL_PROFILES_INDEX_KEY, JSON.stringify(idx));
  } catch (e) {}
}

/**
 * Create a fresh default User Access Control Profile
 */
export function createDefaultUserAccessProfile(
  userId: string,
  role: UserRole = 'Cashier',
  plan: string = 'Standard POS',
  tenantId?: string,
  firmId?: string
): UserAccessControlProfile {
  const defaultMenuOrder = SYSTEM_MENU_TREE.map(m => m.id);
  const defaultSubmenuOrder: Record<string, string[]> = {};
  const defaultFunctionOrder: Record<string, string[]> = {};

  SYSTEM_MENU_TREE.forEach(menu => {
    defaultSubmenuOrder[menu.id] = menu.submenus.map(s => s.id);
    menu.submenus.forEach(sub => {
      defaultFunctionOrder[sub.id] = sub.functions.map(f => f.id);
    });
  });

  const roleDefaults = getRoleDefaultToggles(role);
  const planDefaults = getPlanDefaultToggles(plan);

  // Combine with most restrictive rule for baseline
  const menuToggles: Record<string, boolean> = {};
  const submenuToggles: Record<string, boolean> = {};
  const functionToggles: Record<string, boolean> = {};
  const actionToggles: Record<string, boolean> = {};

  SYSTEM_MENU_TREE.forEach(m => {
    menuToggles[m.id] = (planDefaults.menus[m.id] !== false) && (roleDefaults.menus[m.id] !== false);
    m.submenus.forEach(s => {
      submenuToggles[s.id] = (planDefaults.submenus[s.id] !== false) && (roleDefaults.submenus[s.id] !== false) && menuToggles[m.id];
      s.functions.forEach(f => {
        functionToggles[f.id] = (planDefaults.functions[f.id] !== false) && (roleDefaults.functions[f.id] !== false) && submenuToggles[s.id];
        f.actions.forEach(a => {
          actionToggles[a.id] = (planDefaults.actions[a.id] !== false) && (roleDefaults.actions[a.id] !== false) && functionToggles[f.id];
        });
      });
    });
  });

  return {
    userId,
    tenantId,
    role,
    plan,
    isCustomOverrideActive: false,
    menuOrder: defaultMenuOrder,
    submenuOrder: defaultSubmenuOrder,
    functionOrder: defaultFunctionOrder,
    menuToggles,
    submenuToggles,
    functionToggles,
    actionToggles,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Load User Access Control Profile from storage or initialize
 */
export function getUserAccessControlProfile(
  userId: string,
  role: UserRole = 'Cashier',
  plan: string = 'Standard POS',
  tenantId?: string,
  firmId?: string
): UserAccessControlProfile {
  if (!userId) {
    return createDefaultUserAccessProfile('temp_user', role, plan, tenantId, firmId);
  }

  const aliases = resolveUserAliases(userId);

  // 0. Active session priority: If checking active user or matching alias, check active cache first!
  try {
    const activeCached = localStorage.getItem('mbi_active_user_access_profile');
    if (activeCached) {
      const parsed = JSON.parse(activeCached);
      if (parsed && typeof parsed === 'object') {
        const matchesActive = userId === 'usr_active' || 
          aliases.includes(parsed.userId) || 
          parsed.userId === userId || 
          parsed.userId === 'usr_active' ||
          parsed.isCustomOverrideActive;
        if (matchesActive) {
          return sanitizeAccessProfile(parsed, parsed.role || role, parsed.plan || plan, tenantId || parsed.tenantId);
        }
      }
    }
  } catch (e) {}

  // 1. Try direct exact tenant + firm + user key across all aliases
  for (const uid of aliases) {
    const exactKey = getUserAccessProfileKey(uid, tenantId, firmId);
    try {
      const raw = localStorage.getItem(exactKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return sanitizeAccessProfile(parsed, role, plan, tenantId);
        }
      }
    } catch (e) {}
  }

  // 2. Try direct user key across all aliases
  for (const uid of aliases) {
    try {
      const directUserKey = `mbi_user_access_profile_user_${uid}`;
      const raw = localStorage.getItem(directUserKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return sanitizeAccessProfile(parsed, role, plan, tenantId);
        }
      }
    } catch (e) {}
  }

  // 3. Try global index lookup by userId and aliases
  try {
    const idx = getProfilesIndex();
    for (const uid of aliases) {
      const indexedKey = idx[uid];
      if (indexedKey) {
        const raw = localStorage.getItem(indexedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return sanitizeAccessProfile(parsed, role, plan, tenantId);
          }
        }
      }
    }
  } catch (e) {}

  // Fallback: return default profile safely WITHOUT clobbering active cached session
  const defaultProfile = createDefaultUserAccessProfile(userId, role, plan, tenantId, firmId);
  return defaultProfile;
}

/**
 * Sanitize and backfill any missing items in existing profile
 */
function sanitizeAccessProfile(
  existing: UserAccessControlProfile,
  role: UserRole,
  plan: string,
  tenantId?: string
): UserAccessControlProfile {
  const fallback = createDefaultUserAccessProfile(existing.userId || 'usr', role, plan, tenantId);

  return {
    ...fallback,
    ...existing,
    menuOrder: Array.isArray(existing.menuOrder) && existing.menuOrder.length > 0 ? existing.menuOrder : fallback.menuOrder,
    submenuOrder: existing.submenuOrder || fallback.submenuOrder,
    functionOrder: existing.functionOrder || fallback.functionOrder,
    menuToggles: { ...fallback.menuToggles, ...(existing.menuToggles || {}) },
    submenuToggles: { ...fallback.submenuToggles, ...(existing.submenuToggles || {}) },
    functionToggles: { ...fallback.functionToggles, ...(existing.functionToggles || {}) },
    actionToggles: { ...fallback.actionToggles, ...(existing.actionToggles || {}) },
    updatedAt: existing.updatedAt || new Date().toISOString()
  };
}

/**
 * Compute the deep-merged, fully-resolved Effective Permissions object from a profile
 * Generates a unified flattened map for instantaneous O(1) conditional UI rendering
 */
export function computeEffectivePermissions(profile: UserAccessControlProfile): EffectivePermissions {
  const resolvedMenus: Record<string, boolean> = {};
  const resolvedSubmenus: Record<string, boolean> = {};
  const resolvedFunctions: Record<string, boolean> = {};
  const resolvedActions: Record<string, boolean> = {};
  const flattenedMap: Record<string, boolean> = {};

  for (const menu of SYSTEM_MENU_TREE) {
    const isMenuEnabled = profile.menuToggles[menu.id] !== false;
    resolvedMenus[menu.id] = isMenuEnabled;
    flattenedMap[menu.id] = isMenuEnabled;
    flattenedMap[`menu:${menu.id}`] = isMenuEnabled;

    for (const sub of menu.submenus) {
      const isSubmenuEnabled = isMenuEnabled && profile.submenuToggles[sub.id] !== false;
      resolvedSubmenus[sub.id] = isSubmenuEnabled;
      flattenedMap[sub.id] = isSubmenuEnabled;
      flattenedMap[`submenu:${sub.id}`] = isSubmenuEnabled;
      flattenedMap[`sub:${sub.id}`] = isSubmenuEnabled;
      if (sub.path) {
        flattenedMap[sub.path] = isSubmenuEnabled;
      }

      for (const fn of sub.functions) {
        const isFunctionEnabled = isSubmenuEnabled && profile.functionToggles[fn.id] !== false;
        resolvedFunctions[fn.id] = isFunctionEnabled;
        flattenedMap[fn.id] = isFunctionEnabled;
        flattenedMap[`fn:${fn.id}`] = isFunctionEnabled;
        flattenedMap[`function:${fn.id}`] = isFunctionEnabled;

        for (const act of fn.actions) {
          const isActionEnabled = isFunctionEnabled && profile.actionToggles[act.id] !== false;
          resolvedActions[act.id] = isActionEnabled;
          flattenedMap[act.id] = isActionEnabled;
          flattenedMap[`act:${act.id}`] = isActionEnabled;
          flattenedMap[`action:${act.id}`] = isActionEnabled;
          if (act.code) {
            flattenedMap[act.code] = isActionEnabled;
          }
        }
      }
    }
  }

  // Derive high-level capability flags directly for rapid UI conditional rendering
  const capabilities: EffectiveCapabilities = {
    canAccessDashboard: !!resolvedMenus['dashboard'],
    canViewReports: !!resolvedMenus['reports'] && !!resolvedFunctions['viewProfitLoss'],
    canCreateItem: !!resolvedFunctions['addEditItems'],
    canEditItem: !!resolvedFunctions['addEditItems'],
    canDeleteItem: !!resolvedActions['act_del_item'] && !!resolvedFunctions['addEditItems'],
    canAdjustStock: !!resolvedFunctions['stockAdjustment'],
    canExportInventory: !!resolvedFunctions['importExportItems'] && !!resolvedActions['act_exp_items'],
    canImportInventory: !!resolvedFunctions['importExportItems'] && !!resolvedActions['act_imp_items'],
    canCreateSaleInvoice: !!resolvedFunctions['createSale'],
    canCreateSale: !!resolvedFunctions['createSale'],
    canEditSaleInvoice: !!resolvedFunctions['editSale'] && profile.actionToggles['act_edit_sale'] !== false,
    canEditBills: !!resolvedFunctions['editSale'] && profile.actionToggles['act_edit_sale'] !== false,
    canEditInvoices: !!resolvedFunctions['editSale'] && profile.actionToggles['act_edit_sale'] !== false,
    canVoidSaleInvoice: !!resolvedFunctions['deleteSale'] && profile.actionToggles['act_delete_sale'] !== false && profile.actionToggles['act_del_sale'] !== false,
    canDeleteBills: !!resolvedFunctions['deleteSale'] && profile.actionToggles['act_delete_sale'] !== false && profile.actionToggles['act_del_sale'] !== false,
    canDeleteTransactions: !!resolvedFunctions['deleteSale'] && profile.actionToggles['act_delete_sale'] !== false,
    canReprintSaleInvoice: !!resolvedFunctions['reprintSale'] && profile.actionToggles['act_print_sale'] !== false,
    canReprintBills: !!resolvedFunctions['reprintSale'] && profile.actionToggles['act_print_sale'] !== false,
    canShareInvoice: !!resolvedFunctions['reprintSale'] && profile.actionToggles['act_print_sale'] !== false,
    canShareBill: !!resolvedFunctions['reprintSale'] && profile.actionToggles['act_print_sale'] !== false,
    canApplyDiscount: !!resolvedFunctions['applyDiscount'] && profile.actionToggles['act_apply_disc'] !== false && profile.actionToggles['act_disc_sale'] !== false,
    canGiveDiscount: !!resolvedFunctions['applyDiscount'] && profile.actionToggles['act_apply_disc'] !== false && profile.actionToggles['act_disc_sale'] !== false,
    canOverrideSalePrice: !!resolvedFunctions['overridePrice'] && profile.actionToggles['act_price_sale'] !== false,
    canEditSalePrice: !!resolvedFunctions['overridePrice'] && profile.actionToggles['act_price_sale'] !== false,
    canViewCostsAndProfit: !!resolvedFunctions['viewCostsAndMargins'] && profile.actionToggles['act_view_cost'] !== false,
    canViewCost: !!resolvedFunctions['viewCostsAndMargins'] && profile.actionToggles['act_view_cost'] !== false,
    canViewPurchaseCost: !!resolvedFunctions['viewCostsAndMargins'] && profile.actionToggles['act_view_cost'] !== false,
    canViewProfitReports: !!resolvedFunctions['viewProfitLoss'],
    canCollectPayment: !!resolvedFunctions['collectPayment'],
    canCollectPayments: !!resolvedFunctions['collectPayment'],
    canMakePayments: !!resolvedFunctions['makePayment'],
    canManageParties: !!resolvedFunctions['manageParties'],
    canViewPartyLedger: !!resolvedFunctions['partyStatement'],
    canManageSuppliers: !!resolvedFunctions['manageParties'],
    canCreatePurchase: !!resolvedFunctions['createPurchase'],
    canEditPurchase: !!resolvedFunctions['processPurchaseReturn'],
    canManageExpenses: !!resolvedFunctions['manageExpenses'],
    canAccessCashBank: !!resolvedMenus['bank'],
    canManageBankAccounts: !!resolvedFunctions['manageBankAccounts'],
    canAccessShiftManagement: !!resolvedMenus['shiftManagement'],
    canAccessOnlineStore: !!resolvedMenus['onlineStore'],
    canManageSettings: !!resolvedMenus['settings'] && !!resolvedFunctions['manageSettings'],
    canAccessSettings: !!resolvedMenus['settings'] && !!resolvedFunctions['manageSettings'],
    canSyncCloud: !!resolvedFunctions['syncCloud'],
    canExportAuditLogs: !!resolvedMenus['utilities'],
    canManageUsers: !!resolvedMenus['settings'] && !!resolvedFunctions['manageUsers'],
    canManageUsersAndRoles: !!resolvedMenus['settings'] && !!resolvedFunctions['manageUsers']
  };

  // Merge capabilities into flattenedMap
  Object.entries(capabilities).forEach(([k, v]) => {
    flattenedMap[k] = v;
  });

  const tenantId = (profile.tenantId || 'mbi-tenant-main').trim();
  const firmId = (profile.firmId || 'firm-main').trim();
  const userId = (profile.userId || 'usr_active').trim();
  const compositeKey = `${tenantId}:${firmId}:${userId}`;

  return {
    userId,
    tenantId,
    firmId,
    compositeKey,
    role: profile.role,
    plan: profile.plan || 'Standard POS',
    calculatedAt: new Date().toISOString(),
    version: 3,
    isCustomOverrideActive: !!profile.isCustomOverrideActive,
    menus: resolvedMenus,
    submenus: resolvedSubmenus,
    functions: resolvedFunctions,
    actions: resolvedActions,
    capabilities,
    flattenedMap,
    flat: flattenedMap
  };
}

/**
 * Storage key for effective permissions at user-tenant-firm intersection
 */
export function getEffectivePermissionsStorageKey(userId: string, tenantId?: string, firmId?: string): string {
  const tid = (tenantId || 'mbi-tenant-main').trim();
  const fid = (firmId || 'firm-main').trim();
  const uid = (userId || 'usr_active').trim();
  return `mbi_effective_permissions_${tid}_${fid}_${uid}`;
}

/**
 * Retrieve Effective Permissions from cache or calculate from profile at user-tenant-firm intersection
 */
export function getEffectivePermissions(
  userId: string,
  role: UserRole = 'Cashier',
  plan: string = 'Standard POS',
  tenantId?: string,
  firmId?: string
): EffectivePermissions {
  const key = getEffectivePermissionsStorageKey(userId, tenantId, firmId);
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.flattenedMap || parsed.flat) && parsed.capabilities && parsed.menus) {
        if (!parsed.flattenedMap && parsed.flat) parsed.flattenedMap = parsed.flat;
        if (!parsed.flat && parsed.flattenedMap) parsed.flat = parsed.flattenedMap;
        return parsed;
      }
    }
  } catch (e) {}

  const profile = getUserAccessControlProfile(userId, role, plan, tenantId, firmId);
  const effective = computeEffectivePermissions(profile);
  saveEffectivePermissionsLocalAndCloud(effective);
  return effective;
}

/**
 * Persist Effective Permissions to Local Storage and Firestore at User-Tenant-Firm Intersection
 */
export async function saveEffectivePermissionsLocalAndCloud(
  effective: EffectivePermissions
): Promise<void> {
  const key = getEffectivePermissionsStorageKey(effective.userId, effective.tenantId, effective.firmId);
  try {
    const serialized = JSON.stringify(effective);
    localStorage.setItem(key, serialized);
    localStorage.setItem('mbi_active_effective_permissions', serialized);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mbi-effective-permissions-updated', { detail: { effective } }));
    }

    // Save to Firestore user_permissions collection at user-tenant-firm intersection
    const firestoreDocId = `${effective.tenantId}_${effective.firmId || 'firm-main'}_${effective.userId}`.replace(/[\/\s:]/g, '_');
    saveRecordToFirestore('user_permissions', firestoreDocId, {
      ...effective,
      updatedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('[UserAccessControl] Firestore user_permissions sync notice:', err);
    });
  } catch (e) {
    console.error('[UserAccessControl] Error saving effective permissions:', e);
  }
}

/**
 * Save User Access Control Profile with Persistence, Indexing, Effective Computation & Audit Logging
 */
export function saveUserAccessControlProfile(
  profile: UserAccessControlProfile,
  logAudit: boolean = true,
  adminName: string = 'Master Admin'
): void {
  const exactKey = getUserAccessProfileKey(profile.userId, profile.tenantId, profile.firmId);
  const directUserKey = `mbi_user_access_profile_user_${profile.userId}`;
  
  // Capture previous profile for audit diff
  let previousProfile: any = null;
  try {
    const rawPrev = localStorage.getItem(exactKey);
    if (rawPrev) previousProfile = JSON.parse(rawPrev);
  } catch {}

  profile.updatedAt = new Date().toISOString();
  profile.updatedBy = adminName;
  profile.isCustomOverrideActive = true;

  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(exactKey, serialized);
    localStorage.setItem(directUserKey, serialized);
    updateProfilesIndex(profile.userId, exactKey);

    // Calculate and persist Effective Permissions object at user-tenant-firm intersection
    const effective = computeEffectivePermissions(profile);
    saveEffectivePermissionsLocalAndCloud(effective);

    // Also replicate to all user aliases (e.g. usr_mbi_admin <-> u1 <-> admin-master)
    const aliases = resolveUserAliases(profile.userId);
    for (const alias of aliases) {
      if (alias !== profile.userId) {
        const aliasExactKey = getUserAccessProfileKey(alias, profile.tenantId, profile.firmId);
        const aliasDirectKey = `mbi_user_access_profile_user_${alias}`;
        localStorage.setItem(aliasExactKey, serialized);
        localStorage.setItem(aliasDirectKey, serialized);
        updateProfilesIndex(alias, aliasExactKey);
        
        const effectiveForAlias = computeEffectivePermissions({ ...profile, userId: alias });
        saveEffectivePermissionsLocalAndCloud(effectiveForAlias);
      }
    }

    // Always update active session profile cache
    localStorage.setItem('mbi_active_user_access_profile', serialized);
    localStorage.setItem('mbi_active_effective_permissions', JSON.stringify(effective));
    localStorage.setItem('mbi_user_access_profile_user_usr_active', serialized);
    localStorage.setItem('mbi_master_control_last_selected_user', profile.userId);

    // Dispatch global event so UI instantly rerenders sidebar & permission states
    window.dispatchEvent(new CustomEvent('mbi-user-access-profile-updated', { detail: { profile } }));
    window.dispatchEvent(new CustomEvent('mbi-effective-permissions-updated', { detail: { effective } }));
    window.dispatchEvent(new Event('storage'));

    if (logAudit) {
      logMasterControlAction({
        actionType: 'FEATURE_TOGGLE_UPDATE',
        category: 'FEATURE_SWITCHBOARD',
        description: `173-Feature Switchboard updated for user "${profile.userId}" (${profile.role}, Plan: ${profile.plan})`,
        targetUser: {
          userId: profile.userId,
          tenantId: profile.tenantId || 'mbi-tenant-main',
          firmId: profile.firmId || 'firm-main',
          role: profile.role,
          plan: profile.plan
        },
        actor: { name: adminName, role: 'MASTER_ADMIN' },
        previousState: previousProfile ? {
          menus: previousProfile.menuToggles,
          submenus: previousProfile.submenuToggles,
          functions: previousProfile.functionToggles,
          actions: previousProfile.actionToggles
        } : null,
        newState: {
          menus: profile.menuToggles,
          submenus: profile.submenuToggles,
          functions: profile.functionToggles,
          actions: profile.actionToggles
        },
        diffSummary: `Configured ${Object.keys(profile.functionToggles || {}).length} granular function rules with flattened effective map`
      });

      logMasterAudit(
        'User Access Configured',
        'SECURITY',
        `Granular Menu/Function permissions & order saved for user ${profile.userId} (${profile.role}) at tenant ${profile.tenantId || 'Active Tenant'} / firm ${profile.firmId || 'firm-main'}`,
        profile.tenantId || 'Active Tenant'
      );
    }
  } catch (e) {
    console.error('Failed to save user access profile:', e);
  }
}

/**
 * Reset specific user to Plan Defaults
 */
export function resetUserToPlanDefaults(
  userId: string,
  plan: string = 'Standard POS',
  role: UserRole = 'Cashier',
  tenantId?: string,
  userName?: string,
  firmId?: string
): UserAccessControlProfile {
  const profile = getUserAccessControlProfile(userId, role, plan, tenantId, firmId);
  const planDefaults = getPlanDefaultToggles(plan);

  const prevToggles = { ...profile.functionToggles };

  profile.menuToggles = { ...planDefaults.menus };
  profile.submenuToggles = { ...planDefaults.submenus };
  profile.functionToggles = { ...planDefaults.functions };
  profile.actionToggles = { ...planDefaults.actions };
  profile.isCustomOverrideActive = false;
  profile.updatedAt = new Date().toISOString();

  saveUserAccessControlProfile(profile, false);

  logMasterControlAction({
    actionType: 'PLAN_OVERRIDE',
    category: 'ACCESS_CONTROL',
    description: `Reset user "${userName || userId}" permissions to default preset for plan "${plan}"`,
    targetUser: {
      userId,
      name: userName,
      tenantId: tenantId || 'mbi-tenant-main',
      firmId: firmId || 'firm-main',
      role,
      plan
    },
    previousState: prevToggles,
    newState: planDefaults.functions,
    diffSummary: `Permissions reset to ${plan} default profile`
  });

  logMasterAudit(
    'User Reset to Plan Defaults',
    'SECURITY',
    `Reset user ${userName || userId} permissions to default ${plan} preset`,
    tenantId || 'Tenant'
  );

  return profile;
}

/**
 * Reset specific user to Role Defaults
 */
export function resetUserToRoleDefaults(
  userId: string,
  role: UserRole = 'Cashier',
  plan: string = 'Standard POS',
  tenantId?: string,
  userName?: string,
  firmId?: string
): UserAccessControlProfile {
  const profile = createDefaultUserAccessProfile(userId, role, plan, tenantId, firmId);
  profile.isCustomOverrideActive = false;
  profile.updatedAt = new Date().toISOString();

  saveUserAccessControlProfile(profile, false);

  logMasterControlAction({
    actionType: 'ROLE_OVERRIDE',
    category: 'ACCESS_CONTROL',
    description: `Reset user "${userName || userId}" permissions to standard role preset "${role}"`,
    targetUser: {
      userId,
      name: userName,
      tenantId: tenantId || 'mbi-tenant-main',
      firmId: firmId || 'firm-main',
      role,
      plan
    },
    newState: profile.functionToggles,
    diffSummary: `Permissions reset to ${role} default profile`
  });

  logMasterAudit(
    'User Reset to Role Defaults',
    'SECURITY',
    `Reset user ${userName || userId} permissions to standard ${role} preset`,
    tenantId || 'Tenant'
  );

  return profile;
}

/**
 * Centralized Custom React Hook for Instant Effective Permissions in any UI Component
 * Provides direct O(1) checks via the flattened map and capability accessors.
 */
export function useEffectivePermissions(params?: {
  userId?: string;
  role?: UserRole;
  plan?: string;
  tenantId?: string;
  firmId?: string;
}) {
  const resolveActiveContext = useCallback(() => {
    let uId = params?.userId;
    let r = params?.role;
    let p = params?.plan;
    let tId = params?.tenantId;
    let fId = params?.firmId;

    if (!uId || !tId) {
      try {
        const simUserStr = localStorage.getItem('active_simulated_user');
        if (simUserStr) {
          const simUser = JSON.parse(simUserStr);
          if (simUser) {
            uId = uId || simUser.id;
            r = r || simUser.role;
            p = p || simUser.plan;
            tId = tId || simUser.installationId || simUser.storeName;
            fId = fId || simUser.firmId;
          }
        }
      } catch (e) {}

      try {
        const storedActiveId = localStorage.getItem('mbi_user_access_active_id');
        if (storedActiveId) {
          uId = uId || storedActiveId;
        }
        const ctxStr = localStorage.getItem('mbi_current_business_context');
        if (ctxStr) {
          const ctx = JSON.parse(ctxStr);
          if (ctx) {
            tId = tId || ctx.tenantId;
            fId = fId || ctx.firmId;
            uId = uId || ctx.userId;
          }
        }
      } catch (e) {}
    }

    return {
      userId: uId || 'usr_active',
      role: (r as UserRole) || 'Cashier',
      plan: p || 'Standard POS',
      tenantId: tId || 'mbi-tenant-main',
      firmId: fId || 'firm-main'
    };
  }, [params?.userId, params?.role, params?.plan, params?.tenantId, params?.firmId]);

  const [context, setContext] = useState(resolveActiveContext);

  const [effective, setEffective] = useState<EffectivePermissions>(() => {
    const ctx = resolveActiveContext();
    return getEffectivePermissions(
      ctx.userId,
      ctx.role,
      ctx.plan,
      ctx.tenantId,
      ctx.firmId
    );
  });

  const refresh = useCallback(() => {
    const ctx = resolveActiveContext();
    setContext(ctx);
    const updated = getEffectivePermissions(
      ctx.userId,
      ctx.role,
      ctx.plan,
      ctx.tenantId,
      ctx.firmId
    );
    setEffective(updated);
  }, [resolveActiveContext]);

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener('mbi-user-access-profile-updated', handleUpdate);
    window.addEventListener('mbi-effective-permissions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('mbi-user-access-profile-updated', handleUpdate);
      window.removeEventListener('mbi-effective-permissions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const flatMap = effective.flattenedMap || effective.flat || {};

  // High-performance O(1) checks
  const can = useCallback((key: string | keyof EffectiveCapabilities): boolean => {
    if (!effective) return false;
    const map = effective.flattenedMap || effective.flat || {};
    if (key in map) {
      return !!map[key as string];
    }
    if (key in effective.capabilities) {
      return !!(effective.capabilities as any)[key];
    }
    return true;
  }, [effective]);

  const canFunction = useCallback((fnId: string): boolean => {
    if (!effective) return false;
    return effective.functions[fnId] !== false;
  }, [effective]);

  const canAction = useCallback((actId: string): boolean => {
    if (!effective) return false;
    return effective.actions[actId] !== false;
  }, [effective]);

  const canMenu = useCallback((menuId: string): boolean => {
    if (!effective) return false;
    return effective.menus[menuId] !== false;
  }, [effective]);

  const canSubmenu = useCallback((subId: string): boolean => {
    if (!effective) return false;
    return effective.submenus[subId] !== false;
  }, [effective]);

  const isAllowed = useCallback((routeOrKey: string): boolean => {
    if (!effective) return false;
    const map = effective.flattenedMap || effective.flat || {};
    if (map[routeOrKey] !== undefined) {
      return map[routeOrKey];
    }
    const check = checkGranularRouteAccess(routeOrKey, {
      userId: effective.userId,
      role: effective.role,
      plan: effective.plan,
      tenantId: effective.tenantId
    });
    return check.isAllowed;
  }, [effective]);

  const guard = useCallback((functionId: string, actionName: string = 'this action'): boolean => {
    if (!effective) return true;
    return guardActionExecution(functionId, {
      userId: effective.userId,
      role: effective.role,
      plan: effective.plan,
      tenantId: effective.tenantId
    }, actionName);
  }, [effective]);

  return {
    permissions: effective,
    effective,
    capabilities: effective.capabilities,
    flat: flatMap,
    flattenedMap: flatMap,
    can,
    canMenu,
    canSubmenu,
    canFunction,
    canAction,
    isAllowed,
    guard,
    context,
    refresh
  };
}

/**
 * HIERARCHY EVALUATOR:
 * PLAN -> ROLE -> USER -> FIRM -> MENU -> SUBMENU -> FUNCTION / ACTION
 * 
 * Computes whether a given function or action is authorized.
 */
export function evaluatePermission(params: {
  userId?: string;
  role?: UserRole;
  plan?: string;
  tenantId?: string;
  menuId?: string;
  submenuId?: string;
  functionId?: string;
  actionId?: string;
  feature?: string;
}): boolean {
  let { userId, role = 'Primary Admin', plan = 'Standard POS', tenantId, menuId, submenuId, functionId, actionId, feature } = params;

  // Resolve user ID if missing from active session
  if (!userId) {
    try {
      const activeId = localStorage.getItem('mbi_user_access_active_id');
      const activeUserStr = localStorage.getItem('active_simulated_user');
      if (activeId) userId = activeId;
      else if (activeUserStr) userId = JSON.parse(activeUserStr)?.id;
    } catch {}
  }
  const effectiveUserId = userId || 'usr_active';

  // Translate high-level feature flag via FEATURE_TO_SYSTEM_MAP if passed
  if (feature) {
    const mapped = FEATURE_TO_SYSTEM_MAP[feature];
    if (mapped) {
      if (mapped.menuId && !menuId) menuId = mapped.menuId;
      if (mapped.submenuId && !submenuId) submenuId = mapped.submenuId;
      if (mapped.functionId && !functionId) functionId = mapped.functionId;
      if (mapped.actionId && !actionId) actionId = mapped.actionId;
    }
  }

  // Load User Access Profile
  const profile = getUserAccessControlProfile(effectiveUserId, role, plan, tenantId);

  // If high-level feature is passed, check effective capabilities & map first
  if (feature) {
    const effective = computeEffectivePermissions(profile);
    if (effective.capabilities[feature] !== undefined) {
      if (!effective.capabilities[feature]) return false;
    }
    if (effective.flattenedMap[feature] !== undefined) {
      if (!effective.flattenedMap[feature]) return false;
    }
    if (profile.functionToggles[feature] === false) return false;
    if (profile.actionToggles[feature] === false) return false;
  }

  // Hierarchy Check: If parent Menu is OFF -> Submenu is OFF -> Function is OFF -> Action is OFF
  // CRITICAL: An explicit false toggle in the 173-Feature Switchboard ALWAYS blocks, even for Primary Admin!
  if (menuId) {
    if (profile.menuToggles[menuId] === false) return false;
  }

  if (submenuId) {
    // Find parent menu if not provided
    if (!menuId) {
      const parentMenu = SYSTEM_MENU_TREE.find(m => m.submenus.some(s => s.id === submenuId));
      if (parentMenu && profile.menuToggles[parentMenu.id] === false) return false;
    }
    if (profile.submenuToggles[submenuId] === false) return false;
  }

  if (functionId) {
    // Find parent submenu and menu
    let parentSubmenu: SubmenuItemDefinition | undefined;
    let parentMenu: MenuItemDefinition | undefined;

    for (const m of SYSTEM_MENU_TREE) {
      for (const s of m.submenus) {
        if (s.functions.some(f => f.id === functionId)) {
          parentSubmenu = s;
          parentMenu = m;
          break;
        }
      }
      if (parentSubmenu) break;
    }

    if (parentMenu && profile.menuToggles[parentMenu.id] === false) return false;
    if (parentSubmenu && profile.submenuToggles[parentSubmenu.id] === false) return false;
    if (profile.functionToggles[functionId] === false) return false;
  }

  if (actionId) {
    if (profile.actionToggles[actionId] === false) return false;
  }

  // Only after verifying no explicit switchboard block, allow Primary Admin to bypass role restrictions
  if (role === 'Primary Admin') {
    return true;
  }

  return true;
}

/**
 * Checks Route Access evaluating full granular hierarchy with real-time console tracing
 */
export function checkGranularRouteAccess(
  pathname: string,
  userParams: { userId?: string; role?: UserRole; plan?: string; tenantId?: string }
): { isAllowed: boolean; reason?: string; requiredFunction?: string; blockingFactor?: string } {
  const role = userParams.role || 'Primary Admin';
  const targetUserId = userParams.userId || 'usr_active';
  const plan = userParams.plan || 'Pharmacy Pro';
  const tenantId = userParams.tenantId || 'tenant_main';

  // Normalize path
  const path = pathname.toLowerCase();

  // Load profile and compute effective policy for deep diagnostic tracing
  const profile = getUserAccessControlProfile(targetUserId, role as any, plan, tenantId);
  const effectivePermissions = computeEffectivePermissions(profile);

  // Route to Function Mapping
  const routeMapping: Array<{ prefix: string; menuId: string; submenuId?: string; functionId?: string; label: string }> = [
    { prefix: '/user', menuId: 'dashboard', submenuId: 'dashboardOverview', functionId: 'viewDashboardCards', label: 'Dashboard' },
    { prefix: '/dashboard', menuId: 'dashboard', submenuId: 'dashboardOverview', functionId: 'viewDashboardCards', label: 'Dashboard' },
    { prefix: '/parties', menuId: 'parties', submenuId: 'partyDirectory', functionId: 'manageParties', label: 'Parties & Customers' },
    { prefix: '/items', menuId: 'items', submenuId: 'inventoryList', functionId: 'addEditItems', label: 'Products & Inventory' },
    { prefix: '/shortage-registry', menuId: 'items', submenuId: 'shortageRegistry', functionId: 'manageShortageRegistry', label: 'Shortage Registry' },
    { prefix: '/top-products', menuId: 'items', submenuId: 'topProducts', functionId: 'viewTopProducts', label: 'Top Products Analytics' },
    { prefix: '/sale/invoices', menuId: 'sale', submenuId: 'saleInvoices', functionId: 'createSale', label: 'Sale Invoices & POS' },
    { prefix: '/sale/quotation', menuId: 'sale', submenuId: 'estimateQuotation', functionId: 'manageQuotations', label: 'Estimates & Quotations' },
    { prefix: '/sale/estimate', menuId: 'sale', submenuId: 'estimateQuotation', functionId: 'manageQuotations', label: 'Estimates & Quotations' },
    { prefix: '/sale/payment-in', menuId: 'sale', submenuId: 'paymentIn', functionId: 'collectPayment', label: 'Payment In Collections' },
    { prefix: '/sale/order', menuId: 'sale', submenuId: 'saleOrder', functionId: 'manageSaleOrders', label: 'Sale Orders' },
    { prefix: '/sale/challan', menuId: 'sale', submenuId: 'deliveryChallan', functionId: 'manageDeliveryChallan', label: 'Delivery Challan' },
    { prefix: '/sale/return', menuId: 'sale', submenuId: 'saleReturn', functionId: 'processReturn', label: 'Sale Returns' },
    { prefix: '/sale', menuId: 'sale', submenuId: 'saleInvoices', functionId: 'createSale', label: 'Sale Module' },
    { prefix: '/shift-management', menuId: 'shiftManagement', submenuId: 'shiftOperations', functionId: 'manageShifts', label: 'Cashier Shifts & POS' },
    { prefix: '/purchase/payment-out', menuId: 'purchase', submenuId: 'paymentOut', functionId: 'makePayment', label: 'Supplier Payment Out' },
    { prefix: '/purchase/order', menuId: 'purchase', submenuId: 'purchaseOrder', functionId: 'managePurchaseOrders', label: 'Purchase Orders' },
    { prefix: '/purchase/return', menuId: 'purchase', submenuId: 'purchaseReturn', functionId: 'processPurchaseReturn', label: 'Purchase Return Debit Note' },
    { prefix: '/purchase', menuId: 'purchase', submenuId: 'purchaseBills', functionId: 'createPurchase', label: 'Purchase Bills' },
    { prefix: '/expenses', menuId: 'expenses', submenuId: 'expenseDirectory', functionId: 'manageExpenses', label: 'Expenses Management' },
    { prefix: '/bank/cash-in-hand', menuId: 'bank', submenuId: 'cashInHand', functionId: 'manageCashInHand', label: 'Cash in Hand' },
    { prefix: '/cash-in-hand', menuId: 'bank', submenuId: 'cashInHand', functionId: 'manageCashInHand', label: 'Cash in Hand' },
    { prefix: '/bank/cheques', menuId: 'bank', submenuId: 'cheques', functionId: 'manageCheques', label: 'Cheque Clearance' },
    { prefix: '/bank/loan-accounts', menuId: 'bank', submenuId: 'loanAccounts', functionId: 'manageLoans', label: 'Loan Accounts' },
    { prefix: '/bank', menuId: 'bank', submenuId: 'bankAccounts', functionId: 'manageBankAccounts', label: 'Cash & Bank' },
    { prefix: '/reports', menuId: 'reports', submenuId: 'financialReports', functionId: 'viewProfitLoss', label: 'Reports & Analytics' },
    { prefix: '/online-store', menuId: 'onlineStore', submenuId: 'storeManagement', functionId: 'manageOnlineStore', label: 'Online Store' },
    { prefix: '/utilities', menuId: 'utilities', submenuId: 'utilityTools', functionId: 'useUtilities', label: 'Utilities & Barcodes' },
    { prefix: '/sync-share', menuId: 'syncShare', submenuId: 'syncCenter', functionId: 'syncCloud', label: 'Cloud Sync' },
    { prefix: '/settings', menuId: 'settings', submenuId: 'generalSettings', functionId: 'manageSettings', label: 'Settings & Administration' },
  ];

  let matchedRule: typeof routeMapping[0] | undefined;
  let result: { isAllowed: boolean; reason?: string; requiredFunction?: string; blockingFactor?: string };

  for (const m of routeMapping) {
    if (path.startsWith(m.prefix) || path === m.prefix) {
      matchedRule = m;
      const allowed = evaluatePermission({
        ...userParams,
        menuId: m.menuId,
        submenuId: m.submenuId,
        functionId: m.functionId
      });

      if (!allowed) {
        let blockingFactor = 'Role restriction or master security policy';
        if (profile.menuToggles[m.menuId] === false) {
          blockingFactor = `Menu "${m.menuId}" turned OFF in Master Switchboard`;
        } else if (m.submenuId && profile.submenuToggles[m.submenuId] === false) {
          blockingFactor = `Submenu "${m.submenuId}" turned OFF in Master Switchboard`;
        } else if (m.functionId && profile.functionToggles[m.functionId] === false) {
          blockingFactor = `Operational Function "${m.functionId}" turned OFF in Master Switchboard`;
        }

        result = {
          isAllowed: false,
          reason: `Access to ${m.label} is disabled by Master Administrator for your account (${role}).`,
          requiredFunction: m.functionId,
          blockingFactor
        };
        break;
      } else {
        result = { isAllowed: true };
        break;
      }
    }
  }

  // Handle root dashboard or unmapped routes
  if (!result!) {
    if (path === '/' || path === '') {
      matchedRule = { prefix: '/', menuId: 'dashboard', submenuId: 'dashboardOverview', functionId: 'viewDashboardCards', label: 'Root Dashboard' };
      const dashAllowed = evaluatePermission({
        ...userParams,
        menuId: 'dashboard',
        submenuId: 'dashboardOverview',
        functionId: 'viewDashboardCards'
      });
      result = {
        isAllowed: dashAllowed,
        reason: dashAllowed ? undefined : 'Dashboard access disabled by Master Administrator.',
        requiredFunction: 'viewDashboardCards',
        blockingFactor: dashAllowed ? undefined : (profile.menuToggles['dashboard'] === false ? 'Menu "dashboard" turned OFF' : 'Role restricted')
      };
    } else {
      result = { isAllowed: true };
    }
  }

  // Console-based logger outputting computed effective permissions & tracing
  if (typeof console !== 'undefined' && console.groupCollapsed) {
    const isPass = result.isAllowed;
    const badge = isPass ? '✅ ALLOWED' : '⛔ BLOCKED';
    const badgeColor = isPass ? '#10b981' : '#ef4444';

    console.groupCollapsed(
      `%c[Permission Trace] %c${badge} %c"${pathname}" %c| User: ${targetUserId} (${role})`,
      'color: #8b5cf6; font-weight: bold;',
      `color: ${badgeColor}; font-weight: 800; font-size: 11px;`,
      'color: #0284c7; font-weight: bold;',
      'color: #64748b; font-weight: normal;'
    );

    console.log('%c🔍 Route Path Tested:', 'color: #3b82f6; font-weight: bold;', pathname);
    console.log('%c👤 User & Tenant Context:', 'color: #6366f1; font-weight: bold;', {
      userId: targetUserId,
      role,
      plan,
      tenantId,
      isCustomOverrideActive: profile.isCustomOverrideActive
    });

    console.log('%c🎯 Matched Route Rule:', 'color: #0ea5e9; font-weight: bold;', matchedRule || { prefix: pathname, label: 'Custom / Unmapped Route' });

    console.log('%c🛡️ Evaluation Verdict:', `color: ${badgeColor}; font-weight: bold;`, {
      isAllowed: result.isAllowed,
      reason: result.reason || 'Route permitted by current effective policy',
      requiredFunction: result.requiredFunction || 'None',
      blockingFactor: result.blockingFactor || 'None (Permitted)'
    });

    console.log('%c⚡ Computed Effective Permissions Object:', 'color: #10b981; font-weight: bold;', {
      userId: targetUserId,
      role,
      activeMenusCount: Object.values(effectivePermissions.menus).filter(Boolean).length,
      activeSubmenusCount: Object.values(effectivePermissions.submenus).filter(Boolean).length,
      activeFunctionsCount: Object.values(effectivePermissions.functions).filter(Boolean).length,
      activeActionsCount: Object.values(effectivePermissions.actions).filter(Boolean).length,
      effectivePermissions
    });

    console.log('%c🎛️ Raw Switchboard Profile Snapshot:', 'color: #f59e0b; font-weight: bold;', {
      menuToggles: profile.menuToggles,
      submenuToggles: profile.submenuToggles,
      functionToggles: profile.functionToggles,
      actionToggles: profile.actionToggles
    });

    console.groupEnd();
  }

  // Broadcast event for real-time debugger overlay
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mbi-route-access-evaluated', {
      detail: {
        timestamp: new Date().toISOString(),
        pathname,
        userParams: { userId: targetUserId, role, plan, tenantId },
        result,
        matchedRule,
        effectivePermissions
      }
    }));
  }

  return result;
}

/**
 * Action Execution Guard: Prevents button clicks or mutations when a function is OFF
 */
export function guardActionExecution(
  functionId: string,
  userParams: { userId?: string; role?: UserRole; plan?: string; tenantId?: string },
  actionName: string = 'this action'
): boolean {
  const allowed = evaluatePermission({
    ...userParams,
    functionId
  });

  if (!allowed) {
    console.warn(`[MBI Security Guard] Blocked unauthorized execution of "${actionName}" (Function: ${functionId})`);
    alert(`⛔ ACCESS RESTRICTED\n\nYour account does not have permission to perform ${actionName}.\n\nThis function has been explicitly turned OFF by the Master Administrator.`);
    return false;
  }

  return true;
}
