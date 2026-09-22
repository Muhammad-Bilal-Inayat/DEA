export type UserRole = 
  | 'Primary Admin'
  | 'Secondary Admin'
  | 'Admin'
  | 'Store Manager'
  | 'Manager'
  | 'Pharmacist'
  | 'Cashier'
  | 'Biller'
  | 'Sales Staff'
  | 'Salesman'
  | 'Staff'
  | 'Biller and Salesman'
  | 'Accountant'
  | 'CA/Accountant'
  | 'Stock Keeper'
  | 'Inventory Manager'
  | 'Sales User'
  | 'Purchase User'
  | 'Viewer'
  | 'Custom Role';

export type Role = UserRole;

export interface TenantFeatureToggles {
  sales: boolean;
  billing: boolean;
  purchases: boolean;
  inventory: boolean;
  customers: boolean;
  suppliers: boolean;
  ledgers: boolean;
  expenses: boolean;
  cashAndBank: boolean;
  reports: boolean;
  profitAndLoss: boolean;
  batchManagement: boolean;
  expiryManagement: boolean;
  barcode: boolean;
  warranty: boolean;
  onlineStore: boolean;
  advancedReports: boolean;
  multipleWarehouses: boolean;
  dataExport: boolean;
  backupAndRestore: boolean;
  aiVoice: boolean;
}

export const DEFAULT_TENANT_FEATURE_TOGGLES: TenantFeatureToggles = {
  sales: true,
  billing: true,
  purchases: true,
  inventory: true,
  customers: true,
  suppliers: true,
  ledgers: true,
  expenses: true,
  cashAndBank: true,
  reports: true,
  profitAndLoss: true,
  batchManagement: true,
  expiryManagement: true,
  barcode: true,
  warranty: true,
  onlineStore: true,
  advancedReports: true,
  multipleWarehouses: true,
  dataExport: true,
  backupAndRestore: true,
  aiVoice: true,
};

export interface Tenant {
  id: string; // tenantId
  tenantId: string;
  organizationId: string;
  licenseId: string;
  name: string; // Store / Pharmacy Name
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city?: string;
  address?: string;
  plan: 'Basic' | 'Business' | 'Premium' | '3-Day Free Trial' | 'Trial (3 Days)' | 'Trial (15 Days)' | 'Standard POS' | 'Pharmacy Pro' | 'Enterprise Multi-Branch' | 'Lifetime Perpetual';
  status: 'Active' | 'Suspended' | 'Expired' | 'Trial';
  primaryAdminId: string;
  primaryAdminEmail: string;
  userId?: string;
  trialPlan?: 'Basic' | 'BASIC' | 'Business' | 'Premium';
  trialStatus?: 'Active' | 'Trial' | 'Expired' | 'Suspended' | 'Paid';
  trialStartAt?: string;
  trialEndAt?: string;
  maxFirms?: number;
  maxUsers?: number;
  allowedRoles?: UserRole[];
  dynamicOverrides?: DynamicLimitOverride[];
  trialStartDate: string;
  trialExpiryDate: string;
  isTrialActive: boolean;
  trialExpired: boolean;
  paidLicenseActive: boolean;
  maxDevices: number;
  featureToggles: TenantFeatureToggles;
  totalMembersCount?: number;
  totalInvoicesCount?: number;
  totalProductsCount?: number;
  totalPartiesCount?: number;
  lastLoginAt?: string;
  lastSyncAt?: string;
  storageUsedMb?: number;
  storageLimitMb?: number;
  storageBreakdown?: {
    dbRecordsMb: number;
    invoicesArchiveMb: number;
    assetsMediaMb: number;
    auditLogsMb: number;
  };
  // Software Sale & Revenue Tracking
  salePrice?: number;
  amountPaid?: number;
  amountDue?: number;
  saleStatus?: 'Paid' | 'Partial' | 'Pending' | 'Complimentary / Trial';
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Cheque' | 'Other';
  saleDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceEditAuditRecord {
  id: string;
  tenantId?: string;
  invoiceId: string;
  invoiceNumber: string;
  editorId?: string;
  editorName?: string;
  editorRole?: string;
  editedByUserId?: string;
  editedByUserName?: string;
  editedByUserRole?: string;
  editReason?: string;
  timestamp: string | number;
  reason?: string;
  originalGrandTotal: number;
  newGrandTotal: number;
  originalItemsCount?: number;
  newItemsCount?: number;
  changesSummary: string;
  originalSnapshot?: any;
  updatedSnapshot?: any;
}

export interface DashboardLayoutPreferences {
  viewMode?: 'split' | 'grid';
  gridOrder?: string[];
  mainOrder?: string[];
  sidebarOrder?: string[];
  hiddenSections?: string[];
  expiryThresholdDays?: number;
  lastUpdated?: string;
}

export interface AppUserRecord {
  id: string;
  tenantId?: string;
  name: string;
  username?: string;
  emailOrPhone: string;
  email?: string;
  role: UserRole;
  status: 'Joined' | 'Pending' | 'Invited' | 'Inactive' | 'Active';
  isApproved?: boolean;
  passcode?: string;
  notes?: string;
  canEditInvoices?: boolean;
  canDeleteInvoices?: boolean;
  canReprintInvoices?: boolean;
  lastActive?: string;
  dashboardPreferences?: DashboardLayoutPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserActivityLog {
  id: string;
  tenantId?: string;
  userId?: string;
  userName: string;
  userRole: UserRole;
  action?: string;
  module?: 'Sale' | 'Purchase' | 'Inventory' | 'Cash & Bank' | 'Reports' | 'Users' | 'Settings' | 'Auth' | 'Backup/Restore' | 'Sync & Share' | 'Master Control';
  details: string;
  timestamp: string | number;
}

export interface User {
  id: string; // uid from firebase
  tenantId?: string;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role: Role;
  isApproved?: boolean;
  pin: string; // for simple quick login at counter
  businessId?: string;
  dashboardPreferences?: DashboardLayoutPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExchangeRateItem {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Rate against base currency (1 foreign = rate in base)
  isBase?: boolean;
  isEnabled?: boolean;
  manualOverride?: boolean;
  lastUpdated?: string;
  flag?: string;
}

export interface MultiCurrencySettings {
  baseCurrency: string;
  autoUpdate: boolean;
  autoUpdateFrequency?: 'manual' | 'hourly' | 'daily';
  lastSynced?: string;
  currencies: ExchangeRateItem[];
}

export interface Business {
  id: string;
  tenantId?: string;
  ownerUid: string;
  members: string[];
  name: string;
  logo?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  taxNumber?: string; // NTN / GST
  drugLicenseNo?: string; // Drug License Number
  businessType?: string; // Surgical, Pharmacy, Retail, Wholesale
  currency: string;
  vatPercentage: number;
  invoiceTerms?: string;
  invoicePrefix?: string;
  signature?: string;
  multiCurrency?: MultiCurrencySettings;
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  name: string;
  company?: string;
  partyType?: 'Customer' | 'Supplier';
  type?: 'Customer' | 'Supplier'; // alias for partyType
  category?: string;
  state?: string;
  creditPeriod?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  paymentTerms?: string;
  openingBalance?: number;
  creditLimit?: number;
  balance?: number;
  taxNumber?: string;
  ntn?: string;
  notes?: string;
  bankName?: string;
  bankAccountTitle?: string;
  bankAccountNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PartyPayment {
  id: string;
  partyId: string;
  partyName: string;
  type: 'PAYMENT_IN' | 'PAYMENT_OUT';
  amount: number;
  date: string;
  paymentMode: 'Cash' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash' | 'Cheque';
  referenceNumber?: string;
  receiptNumber?: string;
  method?: string;
  recordedBy?: string;
  notes?: string;
  imageAttachment?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Supplier extends Party {
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  medicineId: string;
  name: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mfgDate?: string;
  quantity: number;
  freeQuantity?: number;
  unit?: string;
  purchasePrice: number;
  mrp?: number;
  sellingPrice?: number;
  discountPercentage?: number;
  taxPercentage?: number;
  total: number;
}

export interface PurchaseBillItem {
  id?: string;
  medicineId?: string;
  name: string;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mfgDate?: string;
  quantity: number;
  freeQuantity?: number;
  unit?: string;
  purchasePrice: number;
  mrp?: number;
  sellingPrice?: number;
  discountPercentage?: number;
  taxPercentage?: number;
  total: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  date: string;
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  transactionType: 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return';
  paymentType: 'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque';
  items: PurchaseBillItem[];
  subTotal: number;
  roundOff?: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  userName?: string;
  status?: 'Paid' | 'Partial' | 'Unpaid' | 'Completed' | 'Pending';
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderNumber?: string;
  billNumber?: string;
  supplierId?: string;
  partyId?: string;
  supplierName?: string;
  partyName?: string;
  date: string;
  paymentType?: 'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque';
  items: PurchaseOrderItem[];
  subTotal?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  description?: string;
  imageAttachment?: string;
  firmName?: string;
  userName?: string;
  status: 'Pending' | 'Completed' | 'Cancelled' | 'Paid' | 'Partial' | 'Unpaid';
  transactionType?: 'Purchase' | 'Payment Out' | 'Purchase Order' | 'Purchase Return';
  createdAt?: string;
  updatedAt?: string;
}

export type StockRotationMethod = 'FIFO' | 'FEFO';

export interface AuditLog {
  id: string;
  date: string;
  timestamp?: string;
  action: 'ADD_STOCK' | 'SALE' | 'ADJUST_STOCK' | 'PO_RECEIVE' | 'PAYMENT_OUT_RECORDED' | 'PAYMENT_OUT_DELETED' | 'PAYMENT_IN_RECORDED' | 'PAYMENT_IN_DELETED' | 'DELETE_MEDICINE' | 'FIFO_OVERRIDE' | 'FEFO_OVERRIDE' | string;
  medicineId?: string;
  medicineName?: string;
  quantityChanged?: number;
  userId: string;
  notes?: string;
  details?: string;
}

export type StockStatus = 'Available' | 'Quarantined' | 'Expired' | 'Damaged' | 'Returned' | 'Recalled';

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  mfgDate?: string;
  quantity: number;
  purchasePrice: number;
  mrp?: number;
  sellingPrice: number;
  status: StockStatus;
  supplierName?: string;
  supplierId?: string;
  purchaseInvoiceNumber?: string;
  purchaseBillId?: string;
  rackLocation?: string;
  shelfLocation?: string;
  binLocation?: string;
  firmId?: string;
  receivedDate?: string;
  purchaseDate?: string;
  createdAt?: string;
  serialNumbers?: string[];
  quarantineReason?: string;
  recallNotice?: string;
}

export interface ProductRecallRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  recallDate: string;
  reason: string;
  issuedBy: string;
  supplierName?: string;
  affectedStockQty: number;
  quarantinedQty: number;
  affectedInvoicesCount: number;
  affectedCustomersCount: number;
  status: 'ACTIVE_RECALL' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}

export interface StockAdjustmentRequest {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber?: string;
  previousQuantity: number;
  adjustedQuantity: number;
  varianceQuantity: number;
  varianceType: 'shortage' | 'overage' | 'damage' | 'expiry' | 'theft' | 'counting_error' | 'supplier_short' | 'internal_use';
  reason: string;
  requestedBy: string;
  requestedRole?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  adminNotes?: string;
}

export interface CashierShiftDenominations {
  n5000?: number;
  n1000?: number;
  n500?: number;
  n100?: number;
  n50?: number;
  n20?: number;
  n10?: number;
  coins?: number;
}

export interface ShiftCashMovement {
  id: string;
  type: 'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'EXPENSE_PAYOUT';
  amount: number;
  reason: string;
  timestamp: string;
  performedBy: string;
  referenceNo?: string;
  approvedBy?: string;
}

export interface CashierShift {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  registerName?: string;
  terminalId?: string;
  shiftType?: 'Morning' | 'Evening' | 'Night' | 'General';
  startTime: string;
  endTime?: string;
  
  // Opening float
  openingCash: number;
  openingBalance?: number;
  openingNotes?: string;
  openingDenominations?: Record<string, number>;
  
  // Reconciled cash totals
  expectedCash?: number;
  actualCash?: number;
  closingCashActual?: number;
  cashDifference?: number;
  discrepancy?: number;
  differenceReason?: string;
  discrepancyReason?: string;
  closingNotes?: string;
  
  // Sales during shift
  cashSales: number;
  cardSales: number;
  bankSales: number;
  creditSales: number;
  totalSales: number;
  invoicesCount: number;
  
  // Returns & Refunds
  cashReturns?: number;
  otherReturns?: number;
  totalReturns?: number;
  returnsCount?: number;
  
  // Movements & Expenses
  cashIn: number;
  cashOut: number;
  expensesPaid?: number;
  expensesTotal?: number;
  cashDropsTotal?: number;
  movements?: ShiftCashMovement[];
  denominations?: CashierShiftDenominations;
  closingDenominations?: Record<string, number>;
  
  notes?: string;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED';
  reconciledBy?: string;
  reconciledAt?: string;
  closedBy?: string;
  supervisorName?: string;
  approvedBy?: string;
  supervisorPinVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierScorecard {
  supplierId: string;
  supplierName: string;
  totalPurchasesAmount: number;
  totalOrdersCount: number;
  avgDeliveryDays: number;
  onTimeDeliveryRate: number;
  returnsCount: number;
  damagedGoodsCount: number;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  bestPrice?: number;
  ratingScore: number;
}

export interface DemandForecast {
  medicineId: string;
  medicineName: string;
  currentStock: number;
  avgDailySales: number;
  estimatedStockoutDays: number;
  suggestedReorderQty: number;
  reorderUrgency: 'CRITICAL' | 'WARNING' | 'OPTIMAL' | 'OVERSTOCKED';
  supplierId?: string;
  supplierName?: string;
}

export interface GenericMaster {
  id: string; // e.g. "GEN-000102"
  genericName: string; // e.g. "Paracetamol"
  alternateNames?: string[]; // e.g. ["Acetaminophen", "APAP"]
  status: 'Active' | 'Inactive';
  strength?: string; // e.g. "500mg"
  dosageForm?: string; // e.g. "Tablet", "Syrup", "Injection"
  therapeuticClass?: string;
  isControlled?: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlledPrintLog {
  printedBy: string;
  userRole?: string;
  timestamp: string;
  isReprint: boolean;
  reason?: string;
}

export interface Medicine {
  id: string;
  barcode: string;
  name: string;
  genericId?: string; // Links to GenericMaster ID (e.g. GEN-000102)
  genericMasterId?: string; // Alias for genericId
  genericName?: string;
  alternateGenericNames?: string[];
  saltComposition?: string; // Salt/Generic active ingredient composition
  strength?: string;
  dosageForm?: string;
  packSize?: string;
  batchNumber: string;
  manufacturer: string;
  supplierName?: string;
  supplierId?: string;
  salePrice?: number;
  category?: string;
  unit?: string;
  description?: string;
  manufacturingDate?: string;
  expiryDate: string;
  quantity: number;
  lowStockThreshold: number;
  purchasePrice: number;
  latestPurchasePrice?: number;
  latestPurchaseDate?: string;
  mrp: number;
  sellingPrice: number;
  gstPercentage: number;
  hsnCode?: string;
  stockStatus?: StockStatus;
  quarantineReason?: string;
  recallNotice?: string;
  recalledAt?: string;
  shelfLocation?: string;
  rackLocation?: string;
  binLocation?: string;
  minStock?: number;
  reorderQuantity?: number;
  leadTimeDays?: number;
  batches?: MedicineBatch[];
  serialNumbers?: string[];
  // Controlled & Regulatory Access Controls
  isControlled?: boolean; // Controlled / Restricted Item: ON/OFF
  showInNormalPOS?: boolean; // Show in Normal POS: ON/OFF (default true)
  showInNormalSearch?: boolean; // Show in Normal Item Search: ON/OFF (default true)
  showInOnlineStore?: boolean; // Show in Online Store: ON/OFF (default true)
  specialAccessRequired?: boolean; // Special Access Required: ON/OFF
  regulatorySchedule?: string; // e.g. "Schedule G / Controlled Narcotic"
  // Online Store & E-Commerce specific fields
  showOnline?: boolean;
  onlineStatus?: 'Published' | 'Draft' | 'Hidden' | 'Out of Stock';
  onlineName?: string;
  onlineDescription?: string;
  onlineImages?: string[];
  onlineCategory?: string;
  onlinePrice?: number; // Independent online store price (does not alter sellingPrice)
  compareAtPrice?: number; // Original/Strike-through price for showing discounts
  onlineDiscount?: number; // Percentage or fixed discount tag
  isFeatured?: boolean;
  onlineStockVisibility?: boolean; // Show exact quantity or just In Stock / Out of Stock
  onlineSortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  useMainSalePrice?: boolean; // If true, uses sellingPrice; if false, uses independent onlinePrice
  onlineStockManagement?: 'SYNC_WITH_INVENTORY' | 'MANUAL';
  manualOnlineStock?: number;
  allowBackorders?: boolean;
  onlineSaleAllowed?: boolean; // Configurable pharmacy regulatory safety toggle
  onlineBadge?: string; // e.g. 'Best Seller', 'Special Deal', 'New Arrival'
  requiresPrescription?: boolean; // Rx required for online/offline order
  coldChain?: boolean; // Cold storage required (2-8°C)
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  searchKeywords?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  genericId?: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  isControlled?: boolean;
  hsnCode?: string;
  batchNumber?: string;
  expiryDate?: string;
  mfgDate?: string;
  quantity: number;
  freeQuantity?: number;
  unit?: string;
  unitPrice?: number;
  price?: number;
  pricePerUnit?: number;
  mrp?: number;
  sellingPrice: number;
  costPrice?: number;
  latestPurchasePrice?: number;
  availableStock?: number;
  discountPercentage?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercentage?: number;
  gstPercentage?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time?: string;
  partyId?: string;
  partyName?: string;
  customerName: string;
  billingName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  transactionType: 'Sale' | 'Estimate' | 'Sale Order' | 'Delivery Challan' | 'Sale Return';
  paymentType: 'Cash' | 'Credit' | 'Bank Transfer' | 'Cheque';
  items: InvoiceItem[];
  subTotal: number;
  discountPercentage?: number;
  discountAmount?: number;
  taxPercentage?: number;
  taxAmount?: number;
  totalCgst?: number;
  totalSgst?: number;
  roundOff?: number;
  grandTotal: number;
  receivedAmount: number;
  paidAmount?: number;
  balanceDue: number;
  balanceAmount?: number;
  description?: string;
  imageAttachment?: string;
  documentAttachment?: string;
  firmName?: string;
  firmId?: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  paymentMethod?: 'Cash' | 'Card' | 'UPI' | 'Credit' | 'Bank Transfer' | 'Cheque';
  cashierId?: string;
  status?: 'Pending' | 'Converted' | 'Completed' | 'Cancelled' | 'Dispatched' | 'Open' | 'Closed';
  validUntil?: string;
  deliveryDueDate?: string;
  vehicleNumber?: string;
  driverName?: string;
  // Special Controlled Sale Regulatory Details
  isControlledSale?: boolean;
  patientName?: string;
  patientCnicOrPhone?: string;
  patientAge?: string;
  patientGender?: string;
  patientAddress?: string;
  patientDiagnosis?: string;
  prescriberDoctorName?: string;
  prescriberDoctorRegNo?: string;
  prescriberHospitalOrClinic?: string;
  prescriberContact?: string;
  prescriptionNumber?: string;
  prescriptionDate?: string;
  prescriptionAttachment?: string;
  controlledApprovalBy?: string;
  controlledApprovalAt?: string;
  controlledAuthorizedNotes?: string;
  controlledPrintCount?: number;
  controlledPrintHistory?: ControlledPrintLog[];
  isWarrantyBill?: boolean;
  warrantyDetails?: {
    warrantyPeriod?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyType?: 'Repair' | 'Replacement' | 'Service';
    warrantyTerms?: string;
    tinNtn?: string;
    claimContact?: string;
    customerSignature?: string;
    sellerSignature?: string;
    shopStamp?: boolean;
    customFields?: Record<string, string>;
    isHeaderEnabled?: boolean;
    isFooterEnabled?: boolean;
    isPrintingEnabled?: boolean;
  };
  returnReason?: string;
  originalInvoiceNumber?: string;
  totalAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalSalesToday: number;
  invoicesToday: number;
  lowStockCount: number;
  expiringSoonCount: number; // within 30 days
}

export interface ExpenseItem {
  id?: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  amount: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'Direct Expense' | 'Indirect Expense';
  description?: string;
  isDefault?: boolean;
}

export interface ExpenseItemMaster {
  id: string;
  name: string;
  category: string;
  defaultPrice?: number;
  unit?: string;
}

export interface Expense {
  id: string;
  expenseNumber?: string;
  category: string;
  expenseType?: 'Direct Expense' | 'Indirect Expense';
  amount: number;
  subTotal?: number;
  roundOff?: number;
  paidAmount?: number;
  balanceDue?: number;
  paymentType?: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';
  paymentMethod?: string;
  expenseName?: string;
  title?: string;
  notes?: string;
  partyId?: string;
  partyName?: string;
  items?: ExpenseItem[];
  date: string;
  description: string;
  imageAttachment?: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BankAccount {
  id: string;
  accountDisplayName: string; // e.g. "MEEZAN", "HBL MAIN"
  bankName: string; // e.g. "Meezan Bank Limited"
  accountHolderName?: string; // e.g. "MBI Inventra"
  accountNumber: string; // e.g. "0214-0103498212"
  ifscCode?: string; // or Branch Code / IBAN (e.g. "MEZN0001" or "PK65MEZN...")
  branchName?: string;
  upiId?: string; // or Raast ID (e.g. "03001234567@raast")
  openingBalance: number;
  asOfDate: string;
  currentBalance: number;
  printOnInvoice?: boolean;
  qrCodeImage?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type BankTransactionType = 
  | 'Deposit' 
  | 'Withdrawal' 
  | 'Bank Transfer In' 
  | 'Bank Transfer Out' 
  | 'Sale Payment' 
  | 'Purchase Payment' 
  | 'Expense Payment' 
  | 'Adjustment' 
  | 'Cheque Deposit' 
  | 'Cheque Issued';

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  type: BankTransactionType;
  flow: 'IN' | 'OUT'; // IN: Credit/Deposit, OUT: Debit/Withdrawal
  amount: number;
  date: string;
  name: string; // Party Name / Source / Recipient / Purpose
  referenceNumber?: string; // Cheque No, Transaction ID, RRN
  referenceNo?: string;
  description?: string;
  transferToBankAccountId?: string;
  transferToBankAccountName?: string;
  transferFromBankAccountId?: string;
  transferFromBankAccountName?: string;
  partyId?: string;
  invoiceId?: string;
  billId?: string;
  expenseId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChequeRecord {
  id: string;
  chequeNumber: string;
  type: 'RECEIVED' | 'ISSUED';
  bankName: string;
  partyName: string;
  partyId?: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';
  bankAccountId?: string;
  bankAccountName?: string;
  clearanceDate?: string;
  notes?: string;
  createdAt: string;
}

export interface LoanAccount {
  id: string;
  accountName: string; // e.g. "Meezan Bank SME Loan", "Partner Loan - Ali"
  lenderName: string;
  loanType: 'BORROWED' | 'LENT';
  loanAmount: number;
  currentBalance: number;
  interestRate?: number;
  tenureMonths?: number;
  startDate: string;
  bankAccountId?: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
}

export type OnlineOrderStatus = 
  | 'New' 
  | 'Confirmed' 
  | 'Processing' 
  | 'Packed' 
  | 'Dispatched' 
  | 'Delivered' 
  | 'Cancelled' 
  | 'Returned' 
  | 'Failed';

export interface OnlineOrderItem {
  medicineId: string;
  name: string;
  genericName?: string;
  category?: string;
  unit?: string;
  packSize?: string;
  image?: string;
  quantity: number;
  price: number; // Applied online store unit price
  compareAtPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  total: number;
}

export interface OnlineCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  areaOrLandmark?: string;
  notes?: string;
}

export interface OnlineOrderStatusLog {
  status: OnlineOrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-2026-1049"
  orderDate: string;
  customer: OnlineCustomerInfo;
  items: OnlineOrderItem[];
  subTotal: number;
  discountAmount: number;
  couponCode?: string;
  deliveryCharges: number;
  grandTotal: number;
  paymentMethod: 'Cash on Delivery' | 'Bank Transfer' | 'Card / Raast';
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  status: OnlineOrderStatus;
  invoiceId?: string; // Linked converted sale invoice in MBI Inventra
  statusHistory?: OnlineOrderStatusLog[];
  trackingNumber?: string;
  riderName?: string;
  riderPhone?: string;
  deliveryNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LicenseInfo {
  isLicensed?: boolean;
  licenseKey?: string;
  plan?: string;
  validUntil?: string;
  [key: string]: any;
}

export interface StorePromotion {
  id: string;
  code: string; // e.g. "WELCOME10", "FREESHIP"
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number;
  createdAt: string;
}

export interface OnlineStoreSettings {
  id: string; // 'default_store_settings'
  storeName: string;
  storeTagline?: string;
  logo?: string;
  bannerImage?: string;
  announcementText?: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  currency: string;
  currencySymbol: string;
  deliveryCharges: number;
  freeDeliveryThreshold: number; // e.g. 2500 PKR for free shipping
  minOrderAmount: number; // e.g. 500 PKR
  isStoreOpen: boolean;
  allowOrderAcceptance: boolean;
  allowBackorders: boolean;
  defaultStockSync: boolean; // default: Sync with inventory
  pharmacyLicenseNotice?: string;
  prescriptionRequiredNotice?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
  featuredCategories?: string[];
  updatedAt: string;
}

export interface CartItem {
  medicineId: string;
  product: Medicine;
  quantity: number;
  selectedUnit?: string;
  price: number; // Effective online price
  compareAtPrice?: number;
}

// 1. Shortage & Lost Demand Record
export interface ShortageItemRecord {
  id: string;
  medicineId?: string;
  medicineName: string;
  genericName?: string;
  companyName?: string;
  requestedQty: number;
  customerName?: string;
  customerPhone?: string;
  urgency: 'Emergency' | 'High' | 'Normal';
  status: 'Pending' | 'Ordered' | 'Fulfilled' | 'Cancelled';
  estimatedPrice?: number;
  supplierId?: string;
  distributorName?: string;
  distributorPhone?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  fulfilledAt?: string;
}

// 2. Narcotics & Controlled Drugs Register (DRAP Form 8 Compliance)
export interface NarcoticsEntryRecord {
  id: string;
  invoiceId?: string;
  patientName: string;
  patientCnicOrPhone?: string;
  patientAge?: number;
  doctorName: string;
  doctorPmdc: string;
  clinicAddress?: string;
  medicineName: string;
  batchNumber: string;
  quantityDispensed: number;
  balanceRemaining: number;
  prescriptionPhoto?: string;
  dispensedBy: string;
  dispensedDate: string;
  notes?: string;
}

// 3. Chronic Patient Refill Record
export interface ChronicPatientRefillRecord {
  id: string;
  patientName: string;
  patientPhone: string;
  diseaseType: 'Diabetes' | 'Hypertension' | 'Cardiac' | 'Asthma' | 'Thyroid' | 'General';
  medicinesList: string;
  refillCycleDays: number; // e.g. 30 days
  lastPurchaseDate: string;
  nextDueDate: string;
  status: 'Upcoming' | 'Overdue' | 'Contacted' | 'Refilled';
  notes?: string;
}

// 4. Supplier Near-Expiry & Breakage Return Challan
export interface SupplierReturnItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  totalAmount: number;
  reason: 'Expired' | 'Near Expiry' | 'Damaged / Broken' | 'Wrong Delivery' | 'Slow Moving';
}

export interface SupplierReturnChallan {
  id: string;
  challanNumber: string;
  supplierId: string;
  supplierName: string;
  returnDate: string;
  items: SupplierReturnItem[];
  totalAmount: number;
  status: 'Draft' | 'Sent to Supplier' | 'Credit Note Received' | 'Settled';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// 5. Customer Loyalty & Points
export interface LoyaltyCustomer {
  id: string;
  customerName: string;
  phone: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  totalPoints: number;
  pointsValue: number; // 1 point = 1 PKR
  totalPurchases: number;
  lastVisit: string;
  createdAt: string;
}

// ============================================================================
// DYNAMIC PLAN & LIMIT DEFINITIONS (SaaS Master Engine)
// ============================================================================

export type SaaSPlanTier = 'Basic' | 'Business' | 'Premium' | string;

export interface SaaSPlanPricing {
  monthly: number;
  yearly: number;
  threeYears: number;
  fiveYears: number;
}

export interface SaaSPlanDefinition {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  pricing: SaaSPlanPricing;
  trialDurationDays: number;
  maxFirms: number;
  maxUsers: number;
  allowedRoles: UserRole[];
  features: TenantFeatureToggles;
  isPopular?: boolean;
  isVisible: boolean;
  order: number;
  notes?: string;
  updatedAt: string;
}

export interface DynamicLimitOverride {
  id: string;
  tenantId: string;
  firmId?: string;
  overrideType: 'max_firms' | 'max_users' | 'role_access' | 'feature_toggle' | 'trial_extension' | 'custom_limit';
  targetField: string;
  previousValue: any;
  newValue: any;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiryDate?: string; // ISO string or undefined for permanent
  status: 'Active' | 'Revoked' | 'Expired';
}

// ============================================================================
// QUICK PRIVATE TRANSACTION PANEL TYPES (Alt + P / Ctrl + Shift + P)
// ============================================================================

export type QuickTransactionType = 
  | 'Sale' 
  | 'Purchase' 
  | 'Sale Return' 
  | 'Purchase Return' 
  | 'Stock Adjustment';

export type QuickTransactionStatus = 'Posted' | 'Draft' | 'Cancelled';

export interface QuickTransactionLineItem {
  id: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  category?: string;
  barcode?: string;
  batchNumber?: string;
  expiryDate?: string;
  packSize?: string;
  unit?: string;
  quantity: number;
  purchaseRate: number; // Cost price
  saleRate: number;     // Selling price
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal: number;
  lineProfit?: number; // Only exposed if user has profit viewing permissions
  adjustmentReason?: 'Damage' | 'Breakage' | 'Physical Audit' | 'Expired' | 'Correction' | 'Other';
}

export interface QuickTransaction {
  id: string;
  tenantId: string;
  firmId: string;
  transactionNumber: string;
  type: QuickTransactionType;
  date: string;
  time: string;
  timestamp: number;
  status: QuickTransactionStatus;
  
  // Party details
  partyId?: string;
  partyName?: string;
  partyType?: 'Customer' | 'Supplier';
  partyPhone?: string;

  // Line items (Detailed item data kept isolated)
  items: QuickTransactionLineItem[];
  itemsCount: number;
  totalQuantity: number;

  // Calculations
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  returnAmount?: number;
  
  // Profit calculations (Restricted viewing)
  totalCost?: number;
  grossProfit?: number;
  netProfit?: number;

  // Payment
  paymentMethod: 'Cash' | 'Bank / Raast' | 'JazzCash / EasyPaisa' | 'Credit / Due' | 'Mixed';
  paidAmount: number;
  changeDue: number;
  balanceDue: number;

  // Metadata
  notes?: string;
  referenceNumber?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdByUserRole: UserRole;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummarySyncMetrics {
  totalSales: number;
  totalPurchases: number;
  totalSalesReturns: number;
  totalPurchaseReturns: number;
  netSales: number;
  netPurchases: number;
  grossProfit: number;
  netProfit: number;
  todaySales: number;
  todayPurchases: number;
  todayProfit: number;
  lastUpdated: string;
}

// Sanitized safe header for recent sales (never exposes item arrays or unit purchase costs)
export interface SanitizedSaleSummary {
  id: string;
  invoiceNumber: string;
  partyName: string;
  customerPhone?: string;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  date: string;
  paymentMode: string;
  status: string;
  itemsCount: number;
}

export interface TopProductSummary {
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

export interface LowStockAlertSummary {
  id: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  unit?: string;
  category?: string;
  sellingPrice: number;
  manufacturer?: string;
  batchNumber?: string;
}

export interface NearExpiryAlertSummary {
  id: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unit?: string;
  daysRemaining?: number;
}

export interface DashboardAggregatedSummary {
  id: string;
  businessId: string;
  timeFilter: 'This Month' | 'Today' | 'This Week' | 'This Year';
  totalSale: number;
  totalPurchase: number;
  totalExpenses: number;
  stockValue: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  todayMetrics: {
    todaySale: number;
    todayCogs: number;
    todayExpenses: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    todayInvoicesCount: number;
  };
  receivablesTotal: number;
  payablesTotal: number;
  recentSales: SanitizedSaleSummary[];
  topProducts: TopProductSummary[];
  lowStockAlerts: LowStockAlertSummary[];
  nearExpiryAlerts: NearExpiryAlertSummary[];
  salesTrend: {
    daily: { name: string; sales: number }[];
    weekly: { name: string; sales: number }[];
  };
  updatedAt: string;
}

export interface AccountUsageRecord {
  id: string; // tenantId
  tenantId: string;
  businessId?: string;
  userCount: number;
  firmCount: number;
  activePlan: string;
  maxUsersAllowed: number;
  maxFirmsAllowed: number;
  isOverLimit: boolean;
  lastUpdated: string;
  usageHistory?: {
    timestamp: string;
    action: 'add_user' | 'remove_user' | 'add_firm' | 'remove_firm' | 'sync';
    userCount: number;
    firmCount: number;
    actor?: string;
  }[];
}

export interface PlatformFeatureSettings {
  // Sales & POS
  onlineStore: boolean;
  aiVoiceAssistant: boolean;
  barcodeScanner: boolean;
  controlledDrugsSchedule: boolean;
  bulkExcelImportExport: boolean;
  customerLoyaltyLedger: boolean;
  cashierShiftManagement: boolean;
  
  // Financials & Stock
  profitAndLossReports: boolean;
  batchExpiryTracking: boolean;
  multiWarehouseSync: boolean;
  supplierIntelligence: boolean;
  autoDemandForecast: boolean;
  warrantyManagement: boolean;
  
  // Security & Core Infrastructure
  cloudSync: boolean;
  emergencyLockdown: boolean;
  multiCurrency: boolean;
  twoFactorAuth: boolean;
  auditTrail: boolean;
  shadowImpersonation: boolean;
}

export interface PlatformSettingsDocument {
  id: string; // 'global'
  features: PlatformFeatureSettings;
  maintenanceMode: boolean;
  announcementBanner?: string;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_PLATFORM_FEATURES: PlatformFeatureSettings = {
  onlineStore: true,
  aiVoiceAssistant: true,
  barcodeScanner: true,
  controlledDrugsSchedule: true,
  bulkExcelImportExport: true,
  customerLoyaltyLedger: true,
  cashierShiftManagement: true,
  profitAndLossReports: true,
  batchExpiryTracking: true,
  multiWarehouseSync: true,
  supplierIntelligence: true,
  autoDemandForecast: true,
  warrantyManagement: true,
  cloudSync: true,
  emergencyLockdown: false,
  multiCurrency: true,
  twoFactorAuth: true,
  auditTrail: true,
  shadowImpersonation: true,
};

// =========================================================================
// CENTRAL MEDICINE DATABASE & CUSTOMER ASSIGNMENT TYPES
// =========================================================================

export type CentralMedicineSource = 
  | 'SYSTEM_PRESET'
  | 'EXCEL_IMPORT'
  | 'CSV_IMPORT'
  | 'CUSTOMER_SYNC'
  | 'MASTER_MANUAL';

export interface CentralMedicine {
  id: string;
  name: string;
  brandName?: string;
  genericName?: string;
  company?: string;
  category: string;
  dosageForm?: string;
  strength?: string;
  unit?: string;
  source: CentralMedicineSource;
  sourceTenantId?: string;
  sourceTenantName?: string;
  assignedTenantIds: string[]; // List of customer/tenant IDs assigned this medicine
  assignedCustomerNames?: string[];
  createdAt: string;
  updatedAt: string;
  isCustomerSynced?: boolean;
}

export interface MedicineAssignmentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  medicineId: string;
  medicineName: string;
  category: string;
  brandName?: string;
  company?: string;
  assignedAt: string;
  assignedBy: string;
  initialStock?: number;
}

export interface CentralMedicineAuditLog {
  id: string;
  timestamp: string;
  action: 'IMPORT' | 'ASSIGN' | 'BULK_ASSIGN' | 'REMOVE_ASSIGNMENT' | 'SHIFT_CATEGORY' | 'ADD_RECORD' | 'EDIT_RECORD' | 'DELETE_RECORD' | 'CUSTOMER_SYNC';
  description: string;
  performedBy: string;
  affectedCount?: number;
  tenantId?: string;
  tenantName?: string;
  details?: Record<string, any>;
}








