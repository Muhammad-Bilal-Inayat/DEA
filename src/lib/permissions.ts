import { UserRole } from '../types';
import { isMasterAdminAuthenticated } from './masterServerService';

export interface RolePermissions {
  name: UserRole;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  allowedModules: {
    dashboard: boolean;
    parties: boolean;
    items: boolean;
    sale: boolean;
    purchase: boolean;
    expenses: boolean;
    bank: boolean;
    reports: boolean;
    syncShare: boolean;
    backup: boolean;
    utilities: boolean;
    settings: boolean;
  };
  features: {
    canViewCostsAndProfit: boolean;
    canAddEditItems: boolean;
    canCreateSale: boolean;
    canEditBills: boolean;
    canDeleteBills: boolean;
    canReprintBills: boolean;
    canCreatePurchase: boolean;
    canEditPurchase: boolean;
    canCollectPayments: boolean;
    canMakePayments: boolean;
    canViewFinancialReports: boolean;
    canViewProfitAndLoss: boolean;
    canManageBankAccounts: boolean;
    canManageUsersAndRoles: boolean;
    canDeleteTransactions: boolean;
    canAdjustStock: boolean;
    canManageBatches: boolean;
    canManageExpiries: boolean;
    canManageParties: boolean;
    canManageLedgers: boolean;
    canManageExpenses: boolean;
    canManageOnlineStore: boolean;
    canManageWarranty: boolean;
    canAccessSettings: boolean;
    canBackupRestore: boolean;
    canExportData: boolean;
    canImportData: boolean;
    canViewAuditLogs: boolean;
    // Controlled Items & Regulatory Features
    canViewControlledItems: boolean;
    canSellControlledItems: boolean;
    canApproveControlledSale: boolean;
    canPrintControlledInvoice: boolean;
    canReprintControlledInvoice: boolean;
    canEditControlledItem: boolean;
    canAdjustControlledStock: boolean;
    canReturnControlledItem: boolean;
    canExportControlledReport: boolean;
  };
}

const makeRoleFeatures = (overrides: Partial<RolePermissions['features']> = {}): RolePermissions['features'] => ({
  canViewCostsAndProfit: false,
  canAddEditItems: false,
  canCreateSale: false,
  canEditBills: false,
  canDeleteBills: false,
  canReprintBills: false,
  canCreatePurchase: false,
  canEditPurchase: false,
  canCollectPayments: false,
  canMakePayments: false,
  canViewFinancialReports: false,
  canViewProfitAndLoss: false,
  canManageBankAccounts: false,
  canManageUsersAndRoles: false,
  canDeleteTransactions: false,
  canAdjustStock: false,
  canManageBatches: false,
  canManageExpiries: false,
  canManageParties: false,
  canManageLedgers: false,
  canManageExpenses: false,
  canManageOnlineStore: false,
  canManageWarranty: false,
  canAccessSettings: false,
  canBackupRestore: false,
  canExportData: false,
  canImportData: false,
  canViewAuditLogs: false,
  canViewControlledItems: false,
  canSellControlledItems: false,
  canApproveControlledSale: false,
  canPrintControlledInvoice: false,
  canReprintControlledInvoice: false,
  canEditControlledItem: false,
  canAdjustControlledStock: false,
  canReturnControlledItem: false,
  canExportControlledReport: false,
  ...overrides,
});

const ALL_MODULES_ALLOWED = {
  dashboard: true,
  parties: true,
  items: true,
  sale: true,
  purchase: true,
  expenses: true,
  bank: true,
  reports: true,
  syncShare: true,
  backup: true,
  utilities: true,
  settings: true,
};

export const ROLE_DEFINITIONS: Record<UserRole, RolePermissions> = {
  'Primary Admin': {
    name: 'Primary Admin',
    title: 'Primary Admin (Owner)',
    description: 'Full unrestricted access to all modules, financial data, team members, tenant controls, and system configurations.',
    badgeBg: 'bg-red-100 text-red-700 border-red-200',
    badgeText: 'PRIMARY ADMIN',
    allowedModules: { ...ALL_MODULES_ALLOWED },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canDeleteBills: true,
      canReprintBills: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: true,
      canDeleteTransactions: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canManageOnlineStore: true,
      canManageWarranty: true,
      canAccessSettings: true,
      canBackupRestore: true,
      canExportData: true,
      canImportData: true,
      canViewAuditLogs: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Secondary Admin': {
    name: 'Secondary Admin',
    title: 'Secondary Admin',
    description: 'Can manage all business day-to-day operations, sales, purchases, stock, expenses, and staff except company deletion.',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
    badgeText: 'SECONDARY ADMIN',
    allowedModules: { ...ALL_MODULES_ALLOWED },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canDeleteBills: true,
      canReprintBills: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: true,
      canDeleteTransactions: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canManageOnlineStore: true,
      canManageWarranty: true,
      canAccessSettings: true,
      canBackupRestore: true,
      canExportData: true,
      canImportData: true,
      canViewAuditLogs: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Admin': {
    name: 'Admin',
    title: 'Admin (Full Operations)',
    description: 'Administrative access to manage operations, sales, purchases, inventory, and users.',
    badgeBg: 'bg-rose-100 text-rose-700 border-rose-200',
    badgeText: 'ADMIN',
    allowedModules: { ...ALL_MODULES_ALLOWED },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canDeleteBills: true,
      canReprintBills: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canManageBankAccounts: true,
      canManageUsersAndRoles: true,
      canDeleteTransactions: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canManageOnlineStore: true,
      canManageWarranty: true,
      canAccessSettings: true,
      canBackupRestore: true,
      canExportData: true,
      canImportData: true,
      canViewAuditLogs: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Store Manager': {
    name: 'Store Manager',
    title: 'Store Manager',
    description: 'Manages pharmacy inventory, purchases, suppliers, and sales desk. Restricted from system configuration.',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'STORE MANAGER',
    allowedModules: {
      ...ALL_MODULES_ALLOWED,
      syncShare: false,
      backup: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canDeleteBills: false,
      canReprintBills: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canManageOnlineStore: true,
      canManageWarranty: true,
      canExportData: true,
      canViewAuditLogs: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Manager': {
    name: 'Manager',
    title: 'Manager',
    description: 'Operational manager with access to inventory, purchase, sales, and day-to-day operations.',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    badgeText: 'MANAGER',
    allowedModules: {
      ...ALL_MODULES_ALLOWED,
      syncShare: false,
      backup: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canDeleteBills: false,
      canReprintBills: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canManageOnlineStore: true,
      canManageWarranty: true,
      canExportData: true,
      canViewAuditLogs: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Pharmacist': {
    name: 'Pharmacist',
    title: 'Registered Pharmacist',
    description: 'Authoritative clinical dispensing role. Can manage controlled medicines, dispense prescriptions, manage batches, and create sales.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'PHARMACIST',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: true,
      expenses: false,
      bank: false,
      reports: true,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreateSale: true,
      canEditBills: true,
      canReprintBills: true,
      canCreatePurchase: true,
      canCollectPayments: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canExportData: true,
      canViewControlledItems: true,
      canSellControlledItems: true,
      canApproveControlledSale: true,
      canPrintControlledInvoice: true,
      canReprintControlledInvoice: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
      canReturnControlledItem: true,
      canExportControlledReport: true,
    }),
  },
  'Cashier': {
    name: 'Cashier',
    title: 'Cashier / POS Billing',
    description: 'Dedicated POS counter billing and cash collection. Protected from invoice edits, cost prices, profit reports, and inventory deletes.',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'CASHIER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false, // OFF by default for Cashier
      canDeleteBills: false,
      canReprintBills: true,
      canCollectPayments: true,
    }),
  },
  'Biller': {
    name: 'Biller',
    title: 'Biller / Counter POS',
    description: 'Can generate Sale Invoices, collect cash payments, and print bills.',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    badgeText: 'BILLER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canDeleteBills: false,
      canReprintBills: true,
      canCollectPayments: true,
    }),
  },
  'Biller and Salesman': {
    name: 'Biller and Salesman',
    title: 'Biller and Salesman',
    description: 'Combines full billing and sales desk features. Can create sales vouchers and receive customer payments.',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'BILLER AND SALESMAN',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
      canManageParties: true,
    }),
  },
  'Salesman': {
    name: 'Salesman',
    title: 'Salesman',
    description: 'Can create Sale Orders, Quotations, and view Customer lists. Cannot see costs or bank accounts.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'SALESMAN',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
      canManageParties: true,
    }),
  },
  'Sales Staff': {
    name: 'Sales Staff',
    title: 'Sales Staff / Counter Desk',
    description: 'Customer order taker and counter salesman.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'SALES STAFF',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
      canManageParties: true,
    }),
  },
  'Sales User': {
    name: 'Sales User',
    title: 'Sales User',
    description: 'Handles customer sales, quotations, and invoice generation.',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'SALES USER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
      canManageParties: true,
    }),
  },
  'Staff': {
    name: 'Staff',
    title: 'General Staff',
    description: 'General staff access for sales counter billing and catalog search.',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'STAFF',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
    }),
  },
  'Accountant': {
    name: 'Accountant',
    title: 'Accountant',
    description: 'Full access to Financial Reports, Ledgers, Day Book, Cash & Bank, and Expenses.',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'ACCOUNTANT',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: false,
      sale: true,
      purchase: true,
      expenses: true,
      bank: true,
      reports: true,
      syncShare: false,
      backup: true,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canManageBankAccounts: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canExportData: true,
      canViewAuditLogs: true,
    }),
  },
  'CA/Accountant': {
    name: 'CA/Accountant',
    title: 'CA / Chartered Accountant',
    description: 'Comprehensive financial reporting, tax management, balance sheet, and ledger audits.',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'CA/ACCOUNTANT',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: false,
      sale: true,
      purchase: true,
      expenses: true,
      bank: true,
      reports: true,
      syncShare: false,
      backup: true,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canCollectPayments: true,
      canMakePayments: true,
      canViewFinancialReports: true,
      canViewProfitAndLoss: true,
      canManageBankAccounts: true,
      canManageLedgers: true,
      canManageExpenses: true,
      canExportData: true,
      canViewAuditLogs: true,
    }),
  },
  'Stock Keeper': {
    name: 'Stock Keeper',
    title: 'Stock Keeper',
    description: 'Manages Inventory items, stock batches, low-stock alerts, purchase bills, and supplier receipts.',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'STOCK KEEPER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: false,
      purchase: true,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canViewControlledItems: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
    }),
  },
  'Inventory Manager': {
    name: 'Inventory Manager',
    title: 'Inventory Manager',
    description: 'Supervises stock levels, batch numbers, expiry dates, warehouses, and purchase inwards.',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
    badgeText: 'INVENTORY MANAGER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: false,
      purchase: true,
      expenses: false,
      bank: false,
      reports: true,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canAddEditItems: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canAdjustStock: true,
      canManageBatches: true,
      canManageExpiries: true,
      canManageParties: true,
      canExportData: true,
      canViewControlledItems: true,
      canEditControlledItem: true,
      canAdjustControlledStock: true,
    }),
  },
  'Purchase User': {
    name: 'Purchase User',
    title: 'Purchase User',
    description: 'Handles vendor purchase orders, supplier bills, and purchase returns.',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'PURCHASE USER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: false,
      purchase: true,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canViewCostsAndProfit: true,
      canCreatePurchase: true,
      canEditPurchase: true,
      canManageParties: true,
    }),
  },
  'Viewer': {
    name: 'Viewer',
    title: 'Viewer (Read-Only)',
    description: 'Read-only access to view catalog items, dashboard metrics, and customer invoices without modifying any records.',
    badgeBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    badgeText: 'VIEWER',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: false,
      expenses: false,
      bank: false,
      reports: false,
      syncShare: false,
      backup: false,
      utilities: false,
      settings: false,
    },
    features: makeRoleFeatures({
      canReprintBills: true,
    }),
  },
  'Custom Role': {
    name: 'Custom Role',
    title: 'Custom Configured Role',
    description: 'Fully custom set of modules and feature permissions tailored by the Primary Admin.',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
    badgeText: 'CUSTOM ROLE',
    allowedModules: {
      dashboard: true,
      parties: true,
      items: true,
      sale: true,
      purchase: true,
      expenses: false,
      bank: false,
      reports: true,
      syncShare: false,
      backup: false,
      utilities: true,
      settings: false,
    },
    features: makeRoleFeatures({
      canCreateSale: true,
      canEditBills: false,
      canReprintBills: true,
      canCollectPayments: true,
    }),
  },
};

/**
 * Retrieves the active role permissions matrix, applying any custom overrides stored in localStorage
 */
export function getActiveRolePermissions(businessId?: string): Record<UserRole, RolePermissions> {
  const bizId = businessId || localStorage.getItem('mbi_active_business_id') || 'default';
  try {
    const stored = localStorage.getItem(`mbi_rbac_permissions_${bizId}`) || localStorage.getItem('mbi_rbac_permissions');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...ROLE_DEFINITIONS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse custom RBAC permissions from localStorage:', e);
  }
  return { ...ROLE_DEFINITIONS };
}

/**
 * Saves custom role permissions to localStorage and syncs with Firestore
 */
export function saveCustomRolePermissions(updatedPermissions: Record<UserRole, RolePermissions>, businessId?: string): void {
  const bizId = businessId || localStorage.getItem('mbi_active_business_id') || 'default';
  try {
    localStorage.setItem(`mbi_rbac_permissions_${bizId}`, JSON.stringify(updatedPermissions));
    localStorage.setItem('mbi_rbac_permissions', JSON.stringify(updatedPermissions));
  } catch (e) {
    console.error('Failed to save custom RBAC permissions:', e);
  }
}

/**
 * Resets custom role permissions back to system defaults
 */
export function resetRolePermissionsToDefault(businessId?: string): Record<UserRole, RolePermissions> {
  const bizId = businessId || localStorage.getItem('mbi_active_business_id') || 'default';
  try {
    localStorage.removeItem(`mbi_rbac_permissions_${bizId}`);
    localStorage.removeItem('mbi_rbac_permissions');
  } catch (e) {}
  return { ...ROLE_DEFINITIONS };
}

/**
 * Normalizes any legacy or custom role string to valid UserRole
 */
export function normalizeUserRole(role?: string): UserRole {
  if (!role) return 'Primary Admin';
  const trimmed = role.trim();
  const match = Object.keys(ROLE_DEFINITIONS).find(
    r => r.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match as UserRole;
  if (trimmed.toLowerCase() === 'admin') return 'Primary Admin';
  if (trimmed.toLowerCase().includes('primary')) return 'Primary Admin';
  if (trimmed.toLowerCase().includes('secondary')) return 'Secondary Admin';
  if (trimmed.toLowerCase().includes('pharmacist')) return 'Pharmacist';
  if (trimmed.toLowerCase().includes('inventory')) return 'Inventory Manager';
  if (trimmed.toLowerCase().includes('purchase')) return 'Purchase User';
  if (trimmed.toLowerCase().includes('viewer')) return 'Viewer';
  if (trimmed.toLowerCase().includes('custom')) return 'Custom Role';
  if (trimmed.toLowerCase() === 'manager' || trimmed.toLowerCase().includes('store manager')) return 'Store Manager';
  if (trimmed.toLowerCase() === 'cashier') return 'Cashier';
  if (trimmed.toLowerCase() === 'staff' || trimmed.toLowerCase().includes('sales staff')) return 'Sales Staff';
  if (trimmed.toLowerCase().includes('sales')) return 'Salesman';
  if (trimmed.toLowerCase().includes('biller')) return 'Biller';
  if (trimmed.toLowerCase().includes('account') || trimmed.toLowerCase().includes('ca')) return 'Accountant';
  if (trimmed.toLowerCase().includes('stock')) return 'Stock Keeper';
  return 'Primary Admin';
}

import { checkGranularRouteAccess } from './userAccessControl';

/**
 * Checks if current user role / specific user has permission to access a specific route
 */
export function hasRouteAccess(role: UserRole, pathname: string, userId?: string, tenantId?: string): boolean {
  // If specific userId or active session user exists, check granular hierarchy first
  let targetUserId = userId;
  let targetRole = role;
  let targetTenant = tenantId;

  if (!targetUserId && typeof localStorage !== 'undefined') {
    try {
      const activeUserStr = localStorage.getItem('active_simulated_user');
      if (activeUserStr) {
        const u = JSON.parse(activeUserStr);
        if (u && u.id) {
          targetUserId = u.id;
          targetRole = u.role || role;
          targetTenant = u.tenantId || tenantId;
        }
      }
    } catch (e) {}
  }

  if (targetUserId) {
    const granularCheck = checkGranularRouteAccess(pathname, {
      userId: targetUserId,
      role: targetRole,
      tenantId: targetTenant
    });
    if (!granularCheck.isAllowed) {
      return false;
    }
  }

  const allPerms = getActiveRolePermissions();
  const perms = allPerms[role] || allPerms['Primary Admin'] || ROLE_DEFINITIONS['Primary Admin'];
  
  if (pathname === '/' || pathname === '') return perms.allowedModules.dashboard;
  if (pathname.startsWith('/master')) return isMasterAdminAuthenticated();
  if (pathname.startsWith('/user')) return true;
  if (pathname.startsWith('/server')) {
    // Only administrators and managers or master authenticated session can access Central Server
    return (
      role === 'Primary Admin' ||
      role === 'Secondary Admin' ||
      role === 'Admin' ||
      role === 'Store Manager' ||
      isMasterAdminAuthenticated()
    );
  }
  if (pathname.startsWith('/parties')) return perms.allowedModules.parties;
  if (pathname.startsWith('/items')) return perms.allowedModules.items;
  if (pathname.startsWith('/shortage-registry') || pathname.startsWith('/shortages') || pathname.startsWith('/shortage') || pathname.startsWith('/short-register') || pathname.startsWith('/shortage-book')) return perms.allowedModules.items || perms.allowedModules.purchase;
  if (pathname.startsWith('/top-products')) return perms.allowedModules.items || perms.allowedModules.dashboard;
  if (pathname.startsWith('/sale')) return perms.allowedModules.sale;
  if (pathname.startsWith('/purchase')) return perms.allowedModules.purchase;
  if (pathname.startsWith('/expenses')) return perms.allowedModules.expenses;
  if (pathname.startsWith('/bank') || pathname.startsWith('/cash-in-hand') || pathname.startsWith('/shift-management')) return perms.allowedModules.bank || perms.allowedModules.sale;
  if (pathname.startsWith('/reports')) return perms.allowedModules.reports;
  if (pathname.startsWith('/sync-share')) return perms.allowedModules.syncShare;
  if (pathname.startsWith('/utilities')) return perms.allowedModules.utilities;
  if (pathname.startsWith('/seo')) return perms.allowedModules.settings || perms.allowedModules.dashboard;
  if (pathname.startsWith('/settings')) return perms.allowedModules.settings;
  
  return true;
}
