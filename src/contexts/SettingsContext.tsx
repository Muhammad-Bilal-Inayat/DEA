import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { saveRecordToFirestore, getFirebaseFirestore } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface Firm {
  id: string;
  name: string;
  isDefault: boolean;
  address?: string;
  phone?: string;
  gstin?: string;
  email?: string;
}

export interface TaxRateItem {
  id: string;
  name: string;
  rate: number;
  type: 'GST' | 'IGST' | 'VAT' | 'WHT' | 'Cess';
  isDefault: boolean;
}

export interface TaxGroupItem {
  id: string;
  name: string;
  rate: number;
  subTaxes: string[];
  description?: string;
}

export interface WarrantyCustomField {
  id: string;
  name: string;
  enabled: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface UserUiPreferences {
  sidebarCollapsed?: boolean;
  sidebarPinned?: boolean;
  privacyMode?: boolean;
  menuOrder?: string[];
  menuVisibility?: Record<string, boolean>;
  showScanButtonInHeader?: boolean;
  showShiftButtonInHeader?: boolean;
  dashboardWidgets?: Record<string, boolean>;
  dashboardMainOrder?: string[];
  dashboardSidebarOrder?: string[];
  tableColumns?: Record<string, string[]>;
  filters?: Record<string, any>;
  posPreferences?: {
    quickEntry?: boolean;
    showProfitOnSale?: boolean;
    doNotShowInvoicePreview?: boolean;
    roundOffType?: 'Nearest' | 'None' | 'Up' | 'Down';
    roundOffValue?: number;
    defaultPaymentMode?: string;
    autoPrintAfterSave?: boolean;
    barcodeAutoAdd?: boolean;
  };
  inventoryPreferences?: {
    lowStockThreshold?: number;
    showLowStockDialog?: boolean;
    expiryThresholdDays?: number;
    stockRotationMethod?: 'FIFO' | 'FEFO';
    allowManualBatchOverride?: boolean;
    enforceExpiredBlock?: boolean;
  };
  fifoFefoSetting?: {
    stockRotationMethod?: 'FIFO' | 'FEFO';
    allowManualBatchOverride?: boolean;
    enforceExpiredBlock?: boolean;
  };
  reorderSettings?: {
    bufferDays?: number;
    velocityDays?: number;
    minSafetyMultiplier?: number;
  };
  displayPreferences?: {
    theme?: 'light' | 'dark' | 'system';
    compactMode?: boolean;
    currencySymbol?: string;
    decimalPlaces?: number;
  };
  expiryThreshold?: number;
  [key: string]: any;
}

export interface FeatureFlags {
  universalSearch: boolean;
  product360: boolean;
  customer360: boolean;
  dataImportWizard: boolean;
  bulkEdit: boolean;
  duplicateDetection: boolean;
  safetyRules: boolean;
  quotationToInvoice: boolean;
  cashierShiftClosing: boolean;
  immutableInvoiceVoid: boolean;
  periodLock: boolean;
  documentAttachments: boolean;
  exceptionCenter: boolean;
  syncHealthCenter: boolean;
  idempotencyProtection: boolean;
  featureFlagsSwitchboard: boolean;
  databaseMigrationDiagnostics: boolean;
  taxEngine: boolean;
  productOnlineControl: boolean;
}

export interface SafetyRulesConfig {
  blockBelowCostSale: boolean;
  warnBelowCostSale: boolean;
  blockNegativeStockBilling: boolean;
  blockExpiredBatchBilling: boolean;
  blockExceededCreditLimit: boolean;
  requireBatchOnSale: boolean;
  requireCustomerPhoneOnCredit: boolean;
  strictBarcodeUniqueCheck: boolean;
}

export interface PeriodLockConfig {
  enabled: boolean;
  lockDate: string;
  allowAdminOverride: boolean;
  reason?: string;
}

export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    enablePasscode: boolean;
    passcode: string;
    currency: string;
    currencySymbol: string;
    decimalPlaces: number;
    tinNumber: boolean;
    tinValue: string;
    estimateQuotation: boolean;
    salePurchaseOrder: boolean;
    otherIncome: boolean;
    fixedAssets: boolean;
    deliveryChallan: boolean;
    deliveryChallanReturn: boolean;
    deliveryChallanPrintAmount: boolean;
    multiFirm: boolean;
    firms: Firm[];
    autoBackup: boolean;
    autoBackupFrequency: 'daily' | 'weekly' | 'onClose';
    lastBackupDate: string;
    enableQrScanner: boolean;
  };
  featureFlags: FeatureFlags;
  safetyRules: SafetyRulesConfig;
  periodLock: PeriodLockConfig;
  transaction: {
    billingNameOfParties: boolean;
    customerPhone: boolean;
    customerPoDetails: boolean;
    freeItemQuantity: boolean;
    countLabelEnabled: boolean;
    countLabelText: string;
    roundOffType: 'Nearest' | 'None' | 'Up' | 'Down';
    roundOffValue: number;
    quickEntry: boolean;
    doNotShowInvoicePreview: boolean;
    enablePasscodeForTxn: boolean;
    discountDuringPayments: boolean;
    linkPaymentsToInvoices: boolean;
    dueDatesAndPaymentTerms: boolean;
    showProfitOnSale: boolean;
    showRecentRatesOnFocus?: boolean;
    showCompanyInRecentRates?: boolean;
    showPurchasePriceInAutocomplete: boolean;
    showBatchInAutocomplete: boolean;
    showStockInAutocomplete: boolean;
    showMrpInAutocomplete: boolean;
    showSalePriceInAutocomplete: boolean;
    showExpDateInAutocomplete: boolean;
    prefixes: {
      sale: string;
      creditNote: string;
      saleOrder: string;
      purchaseOrder: string;
      estimate: string;
      deliveryChallan: string;
      paymentIn: string;
      purchaseBill: string;
      debitNote: string;
    };
    additionalFields: Array<{ id: string; name: string; enabled: boolean; showInPrint: boolean }>;
    transportDetails: {
      enabled: boolean;
      transportName: boolean;
      vehicleNo: boolean;
      lrNo: boolean;
      deliveryLocation: boolean;
    };
    additionalCharges: {
      enabled: boolean;
      shipping: boolean;
      packaging: boolean;
      insurance: boolean;
      labor: boolean;
    };
    warrantyMode: boolean;
    showWarrantyToggle?: boolean;
    showWarrantyType?: boolean;
    showWarrantyPeriod?: boolean;
    showPaymentType?: boolean;
    showCustomerAddButton?: boolean;
    showPartyBalanceCard?: boolean;
    showDescriptionNotes?: boolean;
    showAddImageDoc?: boolean;
    showInvoiceNumberAndDate?: boolean;
    showTopBarcodeVoiceTools?: boolean;
    warrantyCustomFields?: WarrantyCustomField[];
  };
  print: {
    printerType: 'REGULAR' | 'THERMAL';
    theme: string;
    themeColor: string;
    makeRegularDefault: boolean;
    repeatHeader: boolean;
    showCompanyName: boolean;
    companyName: string;
    showCompanyLogo: boolean;
    companyLogo?: string;
    showAddress: boolean;
    address: string;
    showEmail: boolean;
    email: string;
    showPhone: boolean;
    phone: string;
    paperSize: 'A4' | 'A5' | 'Letter' | 'Thermal 80mm' | 'Thermal 58mm';
    companyNameSize: 'Large' | 'Medium' | 'Small';
    invoiceTextSize: 'Large' | 'Medium' | 'Small';
    printOriginalDuplicate: boolean;
    extraSpaceTop: number;
    transactionTitle: string;
    minItemRows: number;
    tableColumns: {
      serialNo: boolean;
      itemName: boolean;
      hsnSac: boolean;
      batchNo: boolean;
      expDate: boolean;
      mfgDate: boolean;
      mrp: boolean;
      quantity: boolean;
      unit: boolean;
      price: boolean;
      discount: boolean;
      taxPercent: boolean;
      taxAmount: boolean;
      total: boolean;
    };
    amountWithDecimal: boolean;
    receivedAmount: boolean;
    balanceAmount: boolean;
    currentPartyBalance: boolean;
    taxDetails: boolean;
    youSaved: boolean;
    amountWithGrouping: boolean;
    printDescription: boolean;
    printTerms: boolean;
    termsAndConditions: string;
    printSignatureText: boolean;
    signatureText: string;
    paymentMode: boolean;
    printAcknowledgement: boolean;
    printBankDetails: boolean;
    bankDetailsText: string;
    printQrCode: boolean;
    pageSetupMode?: 'FIT_SINGLE_PAGE' | 'FORCE_PAGE_BREAK' | 'CONTINUOUS';
    customPrintMarginMm?: number;
    scaleToFitEnabled?: boolean;
    manualScalePercentage?: number;
    sectionOrder?: string[];
    customFooterShopNote?: string;
    developerCreditText?: string;
  };
  taxes: {
    taxRates: TaxRateItem[];
    taxGroups: TaxGroupItem[];
    enableRcm: boolean;
    compositeScheme: boolean;
    enableTcsTds: boolean;
  };
  party: {
    partyGrouping: boolean;
    shippingAddress: boolean;
    enablePaymentReminder: boolean;
    reminderDays: number;
    reminderMessage: string;
    creditLimitWarning: boolean;
    loyaltyPoints: boolean;
    additionalFields: Array<{
      id: string;
      name: string;
      placeholder: string;
      enabled: boolean;
      showInPrint: boolean;
      type: 'text' | 'date';
    }>;
  };
  item: {
    enableItem: boolean;
    barcodeScan: boolean;
    stockMaintenance: boolean;
    manufacturing: boolean;
    showLowStockDialog: boolean;
    itemsUnit: boolean;
    defaultUnit: string;
    itemCategory: boolean;
    partyWiseItemRate: boolean;
    description: boolean;
    itemWiseTax: boolean;
    itemWiseDiscount: boolean;
    updateSalePriceFromTxn: boolean;
    quantityDecimals: number;
    wholesalePrice: boolean;
    onlineStore: boolean;
    mrp: boolean;
    serialTracking: boolean;
    batchTracking: boolean;
    expDate: boolean;
    expDateFormat: 'mm/yy' | 'dd/mm/yy' | 'yyyy-mm-dd';
    mfgDate: boolean;
    mfgDateFormat: 'dd/mm/yy' | 'mm/yy' | 'yyyy-mm-dd';
    modelNo: boolean;
    size: boolean;
    stockRotationMethod: 'FIFO' | 'FEFO';
    allowManualBatchOverride?: boolean;
    enforceExpiredBlock?: boolean;
    itemCustomFields: Array<{ id: string; name: string; enabled: boolean }>;
    warrantyCustomFields?: WarrantyCustomField[];
  };
  pricing: {
    defaultProfitMargin: number;
    pricingMethod: 'Markup on Cost' | 'Gross Margin';
    belowCostAction: 'Warning' | 'Block';
    costIncreaseAlerts: boolean;
    costIncreaseThreshold: number;
    allowManualMarginOverride?: boolean;
    pricingMode?: 'Automatic Margin' | 'Manual / Custom' | 'Hybrid';
  };
  controlledAndGeneric: {
    masterEnabled: boolean;
    genericSystemEnabled: boolean;
    genericSearchEnabled: boolean;
    showAllBrandsByGeneric: boolean;
    controlledItemsEnabled: boolean;
    hideControlledFromNormalPOS: boolean;
    hideControlledFromNormalSearch: boolean;
    specialControlledSaleEnabled: boolean;
    controlledSaleAuthRequired: boolean;
    controlledPrescriptionRequired: boolean;
    controlledRegisterReportEnabled: boolean;
    form7PrintTemplateEnabled: boolean;
    controlledInvoicePrintEnabled: boolean;
    controlledReprintEnabled: boolean;
    controlledOnlineSaleAllowed: boolean;
  };
  modules: {
    sales: boolean;
    purchases: boolean;
    inventory: boolean;
    parties: boolean;
    expenses: boolean;
    banking: boolean;
    reports: boolean;
    pos: boolean;
    syncShare: boolean;
  };
}

export const defaultSettings: AppSettings = {
  general: {
    theme: 'light',
    enablePasscode: false,
    passcode: '',
    currency: 'PKR (Rs.)',
    currencySymbol: 'Rs.',
    decimalPlaces: 2,
    tinNumber: true,
    tinValue: 'PK-NTN-4928172-9',
    estimateQuotation: true,
    salePurchaseOrder: true,
    otherIncome: true,
    fixedAssets: true,
    deliveryChallan: true,
    deliveryChallanReturn: false,
    deliveryChallanPrintAmount: true,
    multiFirm: false,
    firms: [
      {
        id: 'firm-1',
        name: 'MBI INVENTRA',
        isDefault: true,
        address: 'Sargodha',
        phone: '03364585863',
        gstin: 'PK-NTN-4928172-9',
        email: 'support@mbinventra.com',
      },
    ],
    autoBackup: true,
    autoBackupFrequency: 'daily',
    lastBackupDate: '01/09/2026 | 09:09 AM',
    enableQrScanner: true,
  },
  featureFlags: {
    universalSearch: true,
    product360: true,
    customer360: true,
    dataImportWizard: true,
    bulkEdit: true,
    duplicateDetection: true,
    safetyRules: true,
    quotationToInvoice: true,
    cashierShiftClosing: true,
    immutableInvoiceVoid: true,
    periodLock: true,
    documentAttachments: true,
    exceptionCenter: true,
    syncHealthCenter: true,
    idempotencyProtection: true,
    featureFlagsSwitchboard: true,
    databaseMigrationDiagnostics: true,
    taxEngine: true,
    productOnlineControl: true,
  },
  safetyRules: {
    blockBelowCostSale: false,
    warnBelowCostSale: true,
    blockNegativeStockBilling: false,
    blockExpiredBatchBilling: true,
    blockExceededCreditLimit: false,
    requireBatchOnSale: false,
    requireCustomerPhoneOnCredit: true,
    strictBarcodeUniqueCheck: true,
  },
  periodLock: {
    enabled: false,
    lockDate: '',
    allowAdminOverride: true,
    reason: 'Fiscal year-end audit lock',
  },
  transaction: {
    billingNameOfParties: true,
    customerPhone: true,
    customerPoDetails: true,
    freeItemQuantity: true,
    countLabelEnabled: true,
    countLabelText: 'Total Items Count',
    roundOffType: 'Nearest',
    roundOffValue: 1,
    quickEntry: true,
    doNotShowInvoicePreview: false,
    enablePasscodeForTxn: false,
    discountDuringPayments: true,
    linkPaymentsToInvoices: true,
    dueDatesAndPaymentTerms: true,
    showProfitOnSale: true,
    showRecentRatesOnFocus: true,
    showCompanyInRecentRates: true,
    showPurchasePriceInAutocomplete: true,
    showBatchInAutocomplete: true,
    showStockInAutocomplete: true,
    showMrpInAutocomplete: true,
    showSalePriceInAutocomplete: true,
    showExpDateInAutocomplete: false,
    prefixes: {
      sale: 'INV-',
      creditNote: 'CN-',
      saleOrder: 'SO-',
      purchaseOrder: 'PO-',
      estimate: 'EST-',
      deliveryChallan: 'DC-',
      paymentIn: 'REC-',
      purchaseBill: 'BILL-',
      debitNote: 'DN-',
    },
    additionalFields: [
      { id: 'f1', name: 'P.O. Number', enabled: true, showInPrint: true },
      { id: 'f2', name: 'E-Way Bill No', enabled: false, showInPrint: false },
      { id: 'f3', name: 'Vehicle / Driver No', enabled: true, showInPrint: true },
    ],
    transportDetails: {
      enabled: true,
      transportName: true,
      vehicleNo: true,
      lrNo: true,
      deliveryLocation: true,
    },
    additionalCharges: {
      enabled: true,
      shipping: true,
      packaging: true,
      insurance: false,
      labor: false,
    },
    warrantyMode: false,
    showWarrantyToggle: true,
    showWarrantyType: false,
    showWarrantyPeriod: false,
    showPaymentType: true,
    showCustomerAddButton: true,
    showPartyBalanceCard: true,
    showDescriptionNotes: true,
    showAddImageDoc: true,
    showInvoiceNumberAndDate: true,
    showTopBarcodeVoiceTools: false,
    warrantyCustomFields: [
      { id: 'wcf-1', name: 'Warranty Type', enabled: true, defaultValue: 'Replacement', placeholder: 'e.g. Replacement / Repair / Service' },
      { id: 'wcf-2', name: 'Warranty Period', enabled: true, defaultValue: '1 Year', placeholder: 'e.g. 1 Year / 6 Months / 30 Days' },
    ],
  },
  print: {
    printerType: 'REGULAR',
    theme: 'Tax Theme 1',
    themeColor: '#2563eb', // Primary Blue
    makeRegularDefault: true,
    repeatHeader: true,
    showCompanyName: true,
    companyName: 'MBI INVENTRA',
    showCompanyLogo: true,
    showAddress: true,
    address: 'Sargodha',
    showEmail: true,
    email: 'support@mbinventra.com',
    showPhone: true,
    phone: '03364585863',
    paperSize: 'A4',
    companyNameSize: 'Large',
    invoiceTextSize: 'Medium',
    printOriginalDuplicate: true,
    extraSpaceTop: 0,
    transactionTitle: 'TAX INVOICE',
    minItemRows: 5,
    tableColumns: {
      serialNo: true,
      itemName: true,
      hsnSac: true,
      batchNo: true,
      expDate: true,
      mfgDate: false,
      mrp: true,
      quantity: true,
      unit: true,
      price: true,
      discount: true,
      taxPercent: true,
      taxAmount: true,
      total: true,
    },
    amountWithDecimal: true,
    receivedAmount: true,
    balanceAmount: true,
    currentPartyBalance: true,
    taxDetails: true,
    youSaved: true,
    amountWithGrouping: true,
    printDescription: true,
    printTerms: true,
    termsAndConditions: '1. Goods once sold will not be taken back without original invoice.\n2. Warranty as per manufacturer policy.\n3. Payment due within specified terms.',
    printSignatureText: true,
    signatureText: 'Authorized Signatory',
    paymentMode: true,
    printAcknowledgement: false,
    printBankDetails: true,
    bankDetailsText: 'Bank: Meezan Bank Ltd | A/C: 0102-0103456789 | Title: MBI Inventra | IBAN: PK36MEZN0001020103456789',
    printQrCode: true,
    pageSetupMode: 'FIT_SINGLE_PAGE',
    customPrintMarginMm: 5,
    scaleToFitEnabled: true,
    manualScalePercentage: 100,
    sectionOrder: ['HEADER', 'CUSTOMER', 'ITEMS', 'WARRANTY_TERMS', 'TOTALS_BANK', 'SIGNATURES'],
    customFooterShopNote: 'THANKS FOR SHOPPING!',
    developerCreditText: 'DEVELOPED BY MBI INVENTRA - M BILAL INAYAT 0328-1302636',
  },
  taxes: {
    taxRates: [
      { id: 'tax-0', name: 'Exempted / Zero Tax (0%)', rate: 0, type: 'GST', isDefault: false },
      { id: 'tax-5', name: 'GST 5%', rate: 5, type: 'GST', isDefault: false },
      { id: 'tax-12', name: 'GST 12%', rate: 12, type: 'GST', isDefault: false },
      { id: 'tax-18', name: 'Standard GST (18%)', rate: 18, type: 'GST', isDefault: true },
      { id: 'tax-28', name: 'Luxury / Extra Tax (28%)', rate: 28, type: 'GST', isDefault: false },
      { id: 'tax-wht', name: 'WHT / Advance Tax 4.5%', rate: 4.5, type: 'WHT', isDefault: false },
    ],
    taxGroups: [
      { id: 'tg-1', name: 'GST 18% (CGST 9% + SGST 9%)', rate: 18, subTaxes: ['CGST 9%', 'SGST 9%'], description: 'Standard Intra-state tax split' },
      { id: 'tg-2', name: 'GST 18% + 1% Extra Cess', rate: 19, subTaxes: ['GST 18%', 'Cess 1%'], description: 'Medical equipment cess levy' },
    ],
    enableRcm: false,
    compositeScheme: false,
    enableTcsTds: true,
  },
  party: {
    partyGrouping: true,
    shippingAddress: true,
    enablePaymentReminder: true,
    reminderDays: 1,
    reminderMessage: 'Dear {party_name}, this is a gentle reminder from {firm_name} that your outstanding invoice balance of Rs. {due_amount} is due on {due_date}. Kindly arrange the payment. Thank you!',
    creditLimitWarning: true,
    loyaltyPoints: true,
    additionalFields: [
      { id: 'pf1', name: 'Drug License / DL No.', placeholder: 'e.g. DL-09-2024-KTM', enabled: true, showInPrint: true, type: 'text' },
      { id: 'pf2', name: 'Area / Delivery Route', placeholder: 'e.g. Sargodha Main Road', enabled: true, showInPrint: false, type: 'text' },
      { id: 'pf3', name: 'Sales Representative', placeholder: 'e.g. Tariq Mehmood', enabled: true, showInPrint: true, type: 'text' },
      { id: 'pf4', name: 'License Validity Date', placeholder: 'dd/mm/yy', enabled: true, showInPrint: true, type: 'date' },
    ],
  },
  item: {
    enableItem: true,
    barcodeScan: true,
    stockMaintenance: true,
    manufacturing: false,
    showLowStockDialog: true,
    itemsUnit: true,
    defaultUnit: 'PCS',
    itemCategory: true,
    partyWiseItemRate: true,
    description: true,
    itemWiseTax: true,
    itemWiseDiscount: true,
    updateSalePriceFromTxn: true,
    quantityDecimals: 2,
    wholesalePrice: true,
    onlineStore: false,
    mrp: true,
    serialTracking: true,
    batchTracking: true,
    expDate: true,
    expDateFormat: 'mm/yy',
    mfgDate: true,
    mfgDateFormat: 'dd/mm/yy',
    modelNo: true,
    size: true,
    stockRotationMethod: 'FIFO',
    allowManualBatchOverride: true,
    enforceExpiredBlock: true,
    itemCustomFields: [
      { id: 'icf1', name: 'Generic Formula / Salt', enabled: true },
      { id: 'icf2', name: 'Storage Temperature', enabled: true },
    ],
    warrantyCustomFields: [
      { id: 'wcf-1', name: 'Warranty Type', enabled: true, defaultValue: 'Replacement', placeholder: 'e.g. Replacement / Repair / Service' },
      { id: 'wcf-2', name: 'Warranty Period', enabled: true, defaultValue: '1 Year', placeholder: 'e.g. 1 Year / 6 Months / 30 Days' },
    ],
  },
  pricing: {
    defaultProfitMargin: 22,
    pricingMethod: 'Markup on Cost',
    belowCostAction: 'Warning',
    costIncreaseAlerts: true,
    costIncreaseThreshold: 5,
    allowManualMarginOverride: true,
    pricingMode: 'Hybrid',
  },
  controlledAndGeneric: {
    masterEnabled: true,
    genericSystemEnabled: true,
    genericSearchEnabled: true,
    showAllBrandsByGeneric: true,
    controlledItemsEnabled: true,
    hideControlledFromNormalPOS: true,
    hideControlledFromNormalSearch: true,
    specialControlledSaleEnabled: true,
    controlledSaleAuthRequired: true,
    controlledPrescriptionRequired: true,
    controlledRegisterReportEnabled: true,
    form7PrintTemplateEnabled: true,
    controlledInvoicePrintEnabled: true,
    controlledReprintEnabled: true,
    controlledOnlineSaleAllowed: false,
  },
  modules: {
    sales: true,
    purchases: true,
    inventory: true,
    parties: true,
    expenses: true,
    banking: true,
    reports: true,
    pos: true,
    syncShare: true,
  },
};

const STORAGE_KEY = 'vyapar_system_app_settings_v2';

export function buildSettingsScopeKey(userId?: string | null, tenantId?: string | null, firmId?: string | null): string {
  const u = (userId || 'user-default').trim();
  const t = (tenantId || 'tenant-default').trim();
  const f = (firmId || 'firm-1').trim();
  return `${u}__${t}__${f}`;
}

export const DEFAULT_DASHBOARD_MAIN_SECTIONS = [
  'todays_profit',
  'recent_sales',
  'sales_expenses',
  'receivables_payables',
  'top_products',
  'sales_trend',
];

export const DEFAULT_DASHBOARD_SIDEBAR_SECTIONS = [
  'low_stock_alerts',
  'privacy_mode',
  'stock_inventory',
  'bank_accounts',
  'reorder_suggestions',
  'expiry_alerts',
];

export const DEFAULT_DASHBOARD_WIDGET_VISIBILITY: Record<string, boolean> = {
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
};

export const defaultUiPreferences: UserUiPreferences = {
  sidebarCollapsed: false,
  sidebarPinned: true,
  privacyMode: false,
  menuOrder: [],
  menuVisibility: {},
  showScanButtonInHeader: true,
  showShiftButtonInHeader: true,
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
  dashboardMainOrder: DEFAULT_DASHBOARD_MAIN_SECTIONS,
  dashboardSidebarOrder: DEFAULT_DASHBOARD_SIDEBAR_SECTIONS,
  tableColumns: {},
  filters: {},
  posPreferences: {
    quickEntry: false,
    showProfitOnSale: false,
    doNotShowInvoicePreview: false,
    roundOffType: 'Nearest',
    roundOffValue: 1,
    defaultPaymentMode: 'Cash',
    autoPrintAfterSave: false,
    barcodeAutoAdd: true,
  },
  inventoryPreferences: {
    lowStockThreshold: 10,
    showLowStockDialog: true,
    expiryThresholdDays: 60,
    stockRotationMethod: 'FIFO',
    allowManualBatchOverride: true,
    enforceExpiredBlock: true,
  },
  fifoFefoSetting: {
    stockRotationMethod: 'FIFO',
    allowManualBatchOverride: true,
    enforceExpiredBlock: true,
  },
  reorderSettings: {
    bufferDays: 14,
    velocityDays: 30,
    minSafetyMultiplier: 1.5,
  },
  displayPreferences: {
    theme: 'light',
    compactMode: false,
    currencySymbol: 'Rs.',
    decimalPlaces: 2,
  },
  expiryThreshold: 60,
};

export function sanitizeUserPreferences(raw: any): UserUiPreferences {
  const prefs = { ...defaultUiPreferences, ...(raw || {}) };
  const validMain = new Set(DEFAULT_DASHBOARD_MAIN_SECTIONS);
  const validSidebar = new Set(DEFAULT_DASHBOARD_SIDEBAR_SECTIONS);
  const allValid = new Set([...DEFAULT_DASHBOARD_MAIN_SECTIONS, ...DEFAULT_DASHBOARD_SIDEBAR_SECTIONS]);

  // If dashboardMainOrder has no valid main sections or contains obsolete placeholder keys
  if (
    !Array.isArray(prefs.dashboardMainOrder) ||
    prefs.dashboardMainOrder.some((id: string) => id === 'statCards' || id === 'quickActionPills') ||
    !prefs.dashboardMainOrder.some((id: string) => validMain.has(id))
  ) {
    prefs.dashboardMainOrder = DEFAULT_DASHBOARD_MAIN_SECTIONS;
  } else {
    // Keep only valid IDs and ensure defaults are present
    const filtered = prefs.dashboardMainOrder.filter((id: string) => validMain.has(id));
    DEFAULT_DASHBOARD_MAIN_SECTIONS.forEach(id => {
      if (!filtered.includes(id)) filtered.push(id);
    });
    prefs.dashboardMainOrder = filtered;
  }

  // If dashboardSidebarOrder has no valid sidebar sections or contains obsolete placeholder keys
  if (
    !Array.isArray(prefs.dashboardSidebarOrder) ||
    prefs.dashboardSidebarOrder.some((id: string) => id === 'criticalDrapAlerts' || id === 'dailyProfitCard') ||
    !prefs.dashboardSidebarOrder.some((id: string) => validSidebar.has(id))
  ) {
    prefs.dashboardSidebarOrder = DEFAULT_DASHBOARD_SIDEBAR_SECTIONS;
  } else {
    const filtered = prefs.dashboardSidebarOrder.filter((id: string) => validSidebar.has(id));
    DEFAULT_DASHBOARD_SIDEBAR_SECTIONS.forEach(id => {
      if (!filtered.includes(id)) filtered.push(id);
    });
    prefs.dashboardSidebarOrder = filtered;
  }

  // Clean dashboardWidgets to only retain known widget IDs
  if (prefs.dashboardWidgets && typeof prefs.dashboardWidgets === 'object') {
    const cleanedWidgets: Record<string, boolean> = { ...DEFAULT_DASHBOARD_WIDGET_VISIBILITY };
    Object.entries(prefs.dashboardWidgets).forEach(([k, v]) => {
      if (allValid.has(k)) {
        cleanedWidgets[k] = Boolean(v);
      }
    });
    prefs.dashboardWidgets = cleanedWidgets;
  } else {
    prefs.dashboardWidgets = DEFAULT_DASHBOARD_WIDGET_VISIBILITY;
  }

  return prefs;
}

interface SettingsContextType {
  settings: AppSettings;
  userPreferences: UserUiPreferences;
  updateUserPreferences: (prefs: Partial<UserUiPreferences>) => void;
  dashboardWidgets: Record<string, boolean>;
  dashboardMainOrder: string[];
  dashboardSidebarOrder: string[];
  updateDashboardWidgetVisibility: (widgetId: string, isVisible: boolean) => void;
  updateDashboardWidgetOrder: (mainOrder: string[], sidebarOrder: string[]) => void;
  reorderDashboardSection: (zone: 'main' | 'sidebar', activeId: string, overId: string) => void;
  moveDashboardWidgetZone: (widgetId: string, targetZone: 'main' | 'sidebar', targetIndex?: number) => void;
  resetDashboardWidgets: () => void;
  currentScope: { userId: string; tenantId: string; firmId: string };
  theme: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateGeneral: (data: Partial<AppSettings['general']>) => void;
  updateFeatureFlags: (data: Partial<AppSettings['featureFlags']>) => void;
  updateSafetyRules: (data: Partial<AppSettings['safetyRules']>) => void;
  updatePeriodLock: (data: Partial<AppSettings['periodLock']>) => void;
  updateTransaction: (data: Partial<AppSettings['transaction']>) => void;
  updateTransactionSettings: (data: Partial<AppSettings['transaction']>) => void;
  updatePrint: (data: Partial<AppSettings['print']>) => void;
  updatePrintSettings: (data: Partial<AppSettings['print']>) => void;
  updateTaxes: (data: Partial<AppSettings['taxes']>) => void;
  updateParty: (data: Partial<AppSettings['party']>) => void;
  updateItem: (data: Partial<AppSettings['item']>) => void;
  updatePricing: (data: Partial<AppSettings['pricing']>) => void;
  updateControlledAndGeneric: (data: Partial<AppSettings['controlledAndGeneric']>) => void;
  updateModules: (data: Partial<AppSettings['modules']>) => void;
  addTaxRate: (item: Omit<TaxRateItem, 'id'>) => void;
  deleteTaxRate: (id: string) => void;
  addTaxGroup: (item: Omit<TaxGroupItem, 'id'>) => void;
  deleteTaxGroup: (id: string) => void;
  addFirm: (firm: Omit<Firm, 'id'>) => void;
  updateFirm: (id: string, data: Partial<Firm>) => void;
  deleteFirm: (id: string) => void;
  setDefaultFirm: (id: string) => void;
  resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function useAuthSafe() {
  try {
    return useAuth();
  } catch (e) {
    return null;
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authContext = useAuthSafe();
  const userId = authContext?.activeUser?.id || authContext?.currentUser?.uid || 'user-default';
  const tenantId = authContext?.tenantId || authContext?.tenant?.id || authContext?.business?.tenantId || 'tenant-default';

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          general: { ...defaultSettings.general, ...(parsed.general || {}) },
          featureFlags: { ...defaultSettings.featureFlags, ...(parsed.featureFlags || {}) },
          safetyRules: { ...defaultSettings.safetyRules, ...(parsed.safetyRules || {}) },
          periodLock: { ...defaultSettings.periodLock, ...(parsed.periodLock || {}) },
          transaction: { ...defaultSettings.transaction, ...(parsed.transaction || {}) },
          print: { ...defaultSettings.print, ...(parsed.print || {}) },
          taxes: { ...defaultSettings.taxes, ...(parsed.taxes || {}) },
          party: { ...defaultSettings.party, ...(parsed.party || {}) },
          item: { ...defaultSettings.item, ...(parsed.item || {}) },
          pricing: { ...defaultSettings.pricing, ...(parsed.pricing || {}) },
          controlledAndGeneric: { ...defaultSettings.controlledAndGeneric, ...(parsed.controlledAndGeneric || {}) },
          modules: { ...defaultSettings.modules, ...(parsed.modules || {}) },
        };
      }
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
    return defaultSettings;
  });

  const activeFirm = settings.general?.firms?.find(f => f.isDefault) || settings.general?.firms?.[0];
  const firmId = activeFirm?.id || 'firm-1';
  const scopeKey = buildSettingsScopeKey(userId, tenantId, firmId);

  const [userPreferences, setUserPreferences] = useState<UserUiPreferences>(() => {
    try {
      const savedScoped = localStorage.getItem(`mbi_user_ui_prefs_${scopeKey}`);
      if (savedScoped) {
        return sanitizeUserPreferences(JSON.parse(savedScoped));
      }
      const legacySidebar = localStorage.getItem('mbi_sidebar_collapsed') === 'true';
      const legacyPrivacy = localStorage.getItem('mbi_privacy_mode') === 'true';
      const legacyWidgets = localStorage.getItem('mbi_dashboard_widgets_v2');
      const legacyMainOrder = localStorage.getItem('mbi_dashboard_main_order_v3');
      const legacySidebarOrder = localStorage.getItem('mbi_dashboard_sidebar_order_v3');
      const legacyExpiry = localStorage.getItem('mbi_expiry_threshold');
      return sanitizeUserPreferences({
        ...defaultUiPreferences,
        sidebarCollapsed: legacySidebar,
        privacyMode: legacyPrivacy,
        dashboardWidgets: legacyWidgets ? JSON.parse(legacyWidgets) : defaultUiPreferences.dashboardWidgets,
        dashboardMainOrder: legacyMainOrder ? JSON.parse(legacyMainOrder) : defaultUiPreferences.dashboardMainOrder,
        dashboardSidebarOrder: legacySidebarOrder ? JSON.parse(legacySidebarOrder) : defaultUiPreferences.dashboardSidebarOrder,
        expiryThreshold: legacyExpiry ? parseInt(legacyExpiry, 10) : 60,
      });
    } catch (e) {
      return defaultUiPreferences;
    }
  });

  // When userId, tenantId, or firmId scope changes, load the persisted settings for that exact scope
  useEffect(() => {
    if (!scopeKey) return;
    try {
      const scopedSettings = localStorage.getItem(`mbi_user_settings_${scopeKey}`);
      if (scopedSettings) {
        const parsed = JSON.parse(scopedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          general: { ...prev.general, ...(parsed.general || {}) },
          featureFlags: { ...prev.featureFlags, ...(parsed.featureFlags || {}) },
          safetyRules: { ...prev.safetyRules, ...(parsed.safetyRules || {}) },
          periodLock: { ...prev.periodLock, ...(parsed.periodLock || {}) },
          transaction: { ...prev.transaction, ...(parsed.transaction || {}) },
          print: { ...prev.print, ...(parsed.print || {}) },
          taxes: { ...prev.taxes, ...(parsed.taxes || {}) },
          party: { ...prev.party, ...(parsed.party || {}) },
          item: { ...prev.item, ...(parsed.item || {}) },
          pricing: { ...prev.pricing, ...(parsed.pricing || {}) },
          controlledAndGeneric: { ...prev.controlledAndGeneric, ...(parsed.controlledAndGeneric || {}) },
          modules: { ...prev.modules, ...(parsed.modules || {}) },
        }));
      }

      const scopedUi = localStorage.getItem(`mbi_user_ui_prefs_${scopeKey}`);
      if (scopedUi) {
        const parsedUi = JSON.parse(scopedUi);
        setUserPreferences(prev => sanitizeUserPreferences({ ...prev, ...parsedUi }));
      }
    } catch (e) {}

    // Asynchronously check Cloud Firestore for newer / cloud-synced settings
    let isCancelled = false;
    const fetchFromCloud = async () => {
      try {
        const db = getFirebaseFirestore();
        if (!db) return;
        const docRef = doc(db, 'userSettings', scopeKey);
        const snap = await getDoc(docRef);
        if (snap.exists() && !isCancelled) {
          const data = snap.data();
          if (data?.settings) {
            setSettings(prev => ({
              ...prev,
              ...data.settings,
              general: { ...prev.general, ...(data.settings.general || {}) },
              item: { ...prev.item, ...(data.settings.item || {}) },
              featureFlags: { ...prev.featureFlags, ...(data.settings.featureFlags || {}) },
              safetyRules: { ...prev.safetyRules, ...(data.settings.safetyRules || {}) },
              taxes: { ...prev.taxes, ...(data.settings.taxes || {}) },
              party: { ...prev.party, ...(data.settings.party || {}) },
              pricing: { ...prev.pricing, ...(data.settings.pricing || {}) },
              controlledAndGeneric: { ...prev.controlledAndGeneric, ...(data.settings.controlledAndGeneric || {}) },
              modules: { ...prev.modules, ...(data.settings.modules || {}) },
              periodLock: { ...prev.periodLock, ...(data.settings.periodLock || {}) },
              transaction: { ...prev.transaction, ...(data.settings.transaction || {}) },
              print: { ...prev.print, ...(data.settings.print || {}) },
            }));
            localStorage.setItem(`mbi_user_settings_${scopeKey}`, JSON.stringify(data.settings));
          }
          if (data?.userPreferences) {
            const sanitized = sanitizeUserPreferences(data.userPreferences);
            setUserPreferences(prev => ({ ...prev, ...sanitized }));
            localStorage.setItem(`mbi_user_ui_prefs_${scopeKey}`, JSON.stringify(sanitized));
          }
        }
      } catch (err) {
        // Offline operation operates gracefully
      }
    };

    fetchFromCloud();
    return () => {
      isCancelled = true;
    };
  }, [scopeKey]);

  // Persist settings locally and sync to Firestore
  useEffect(() => {
    if (!scopeKey) return;
    try {
      localStorage.setItem(`mbi_user_settings_${scopeKey}`, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(`mbi_pending_settings_sync_${scopeKey}`, 'true');
    } catch (e) {}

    const timer = setTimeout(() => {
      saveRecordToFirestore('userSettings', scopeKey, {
        userId,
        tenantId,
        firmId,
        settings,
        userPreferences,
        updatedAt: new Date().toISOString()
      }).then(() => {
        try {
          localStorage.removeItem(`mbi_pending_settings_sync_${scopeKey}`);
        } catch (e) {}
      }).catch((err) => {
        console.warn('Firestore userSettings background sync queued for retry:', err);
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [settings, scopeKey, userId, tenantId, firmId, userPreferences]);

  // Automatic sync upon re-establishing network connection or tab focus
  useEffect(() => {
    if (!scopeKey) return;

    const handleReconnectionSync = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const isPending = localStorage.getItem(`mbi_pending_settings_sync_${scopeKey}`) === 'true';
      if (isPending || navigator.onLine) {
        saveRecordToFirestore('userSettings', scopeKey, {
          userId,
          tenantId,
          firmId,
          settings,
          userPreferences,
          updatedAt: new Date().toISOString()
        }).then(() => {
          localStorage.removeItem(`mbi_pending_settings_sync_${scopeKey}`);
          console.log('[SettingsContext] Reconnection sync completed successfully for FIFO/FEFO & user preferences');
        }).catch(err => {
          console.warn('[SettingsContext] Reconnection sync retry scheduled:', err);
        });
      }
    };

    window.addEventListener('online', handleReconnectionSync);
    window.addEventListener('focus', handleReconnectionSync);
    return () => {
      window.removeEventListener('online', handleReconnectionSync);
      window.removeEventListener('focus', handleReconnectionSync);
    };
  }, [scopeKey, userId, tenantId, firmId, settings, userPreferences]);

  const persistUserPreferencesImmediate = useCallback((updated: UserUiPreferences) => {
    try {
      localStorage.setItem(`mbi_user_ui_prefs_${scopeKey}`, JSON.stringify(updated));
      if (updated.sidebarCollapsed !== undefined) {
        localStorage.setItem('mbi_sidebar_collapsed', String(updated.sidebarCollapsed));
      }
      if (updated.privacyMode !== undefined) {
        localStorage.setItem('mbi_privacy_mode', String(updated.privacyMode));
      }
      if (updated.dashboardWidgets !== undefined) {
        localStorage.setItem('mbi_dashboard_widgets_v2', JSON.stringify(updated.dashboardWidgets));
      }
      if (updated.dashboardMainOrder !== undefined) {
        localStorage.setItem('mbi_dashboard_main_order_v3', JSON.stringify(updated.dashboardMainOrder));
      }
      if (updated.dashboardSidebarOrder !== undefined) {
        localStorage.setItem('mbi_dashboard_sidebar_order_v3', JSON.stringify(updated.dashboardSidebarOrder));
      }
      if (updated.expiryThreshold !== undefined) {
        localStorage.setItem('mbi_expiry_threshold', String(updated.expiryThreshold));
      }
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    saveRecordToFirestore('userSettings', scopeKey, {
      userId,
      tenantId,
      firmId,
      settings,
      userPreferences: updated,
      updatedAt: new Date().toISOString()
    }).catch(err => {
      console.warn('Firestore userSettings sync error:', err);
    });
  }, [scopeKey, userId, tenantId, firmId, settings]);

  const updateUserPreferences = useCallback((partial: Partial<UserUiPreferences>) => {
    setUserPreferences(prev => {
      const updated = sanitizeUserPreferences({ ...prev, ...partial });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const dashboardWidgets = userPreferences?.dashboardWidgets || DEFAULT_DASHBOARD_WIDGET_VISIBILITY;
  const dashboardMainOrder = userPreferences?.dashboardMainOrder || DEFAULT_DASHBOARD_MAIN_SECTIONS;
  const dashboardSidebarOrder = userPreferences?.dashboardSidebarOrder || DEFAULT_DASHBOARD_SIDEBAR_SECTIONS;

  const updateDashboardWidgetVisibility = useCallback((widgetId: string, visible: boolean) => {
    setUserPreferences(prev => {
      const currentWidgets = { ...(prev.dashboardWidgets || DEFAULT_DASHBOARD_WIDGET_VISIBILITY) };
      currentWidgets[widgetId] = visible;
      const updated = sanitizeUserPreferences({
        ...prev,
        dashboardWidgets: currentWidgets,
      });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const updateDashboardWidgetOrder = useCallback((newMainOrder: string[], newSidebarOrder: string[]) => {
    setUserPreferences(prev => {
      const updated = sanitizeUserPreferences({
        ...prev,
        dashboardMainOrder: newMainOrder,
        dashboardSidebarOrder: newSidebarOrder,
      });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const reorderDashboardSection = useCallback((zone: 'main' | 'sidebar', activeId: string, overId: string) => {
    if (activeId === overId) return;
    setUserPreferences(prev => {
      const currentMain = prev.dashboardMainOrder || DEFAULT_DASHBOARD_MAIN_SECTIONS;
      const currentSidebar = prev.dashboardSidebarOrder || DEFAULT_DASHBOARD_SIDEBAR_SECTIONS;
      
      const list = zone === 'main' ? [...currentMain] : [...currentSidebar];
      const oldIndex = list.indexOf(activeId);
      const newIndex = list.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      list.splice(oldIndex, 1);
      list.splice(newIndex, 0, activeId);

      const updated = sanitizeUserPreferences({
        ...prev,
        dashboardMainOrder: zone === 'main' ? list : currentMain,
        dashboardSidebarOrder: zone === 'sidebar' ? list : currentSidebar,
      });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const moveDashboardWidgetZone = useCallback((widgetId: string, targetZone: 'main' | 'sidebar', targetIndex?: number) => {
    setUserPreferences(prev => {
      let main = [...(prev.dashboardMainOrder || DEFAULT_DASHBOARD_MAIN_SECTIONS)];
      let sidebar = [...(prev.dashboardSidebarOrder || DEFAULT_DASHBOARD_SIDEBAR_SECTIONS)];

      main = main.filter(id => id !== widgetId);
      sidebar = sidebar.filter(id => id !== widgetId);

      if (targetZone === 'main') {
        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= main.length) {
          main.splice(targetIndex, 0, widgetId);
        } else {
          main.push(widgetId);
        }
      } else {
        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= sidebar.length) {
          sidebar.splice(targetIndex, 0, widgetId);
        } else {
          sidebar.push(widgetId);
        }
      }

      const updated = sanitizeUserPreferences({
        ...prev,
        dashboardMainOrder: main,
        dashboardSidebarOrder: sidebar,
      });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const resetDashboardWidgets = useCallback(() => {
    setUserPreferences(prev => {
      const updated = sanitizeUserPreferences({
        ...prev,
        dashboardWidgets: DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
        dashboardMainOrder: DEFAULT_DASHBOARD_MAIN_SECTIONS,
        dashboardSidebarOrder: DEFAULT_DASHBOARD_SIDEBAR_SECTIONS,
      });
      persistUserPreferencesImmediate(updated);
      return updated;
    });
  }, [persistUserPreferencesImmediate]);

  const updateGeneral = (data: Partial<AppSettings['general']>) => {
    setSettings(prev => ({ ...prev, general: { ...prev.general, ...data } }));
  };

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const activeTheme = settings.general.theme || 'light';
  const isDarkMode = activeTheme === 'dark' || (activeTheme === 'system' && systemPrefersDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    if (isDarkMode) {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    updateGeneral({ theme: newTheme });
  };

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    updateGeneral({ theme: nextTheme });
  };

  const updateFeatureFlags = (data: Partial<AppSettings['featureFlags']>) => {
    setSettings(prev => ({ ...prev, featureFlags: { ...prev.featureFlags, ...data } }));
  };

  const updateSafetyRules = (data: Partial<AppSettings['safetyRules']>) => {
    setSettings(prev => ({ ...prev, safetyRules: { ...prev.safetyRules, ...data } }));
  };

  const updatePeriodLock = (data: Partial<AppSettings['periodLock']>) => {
    setSettings(prev => ({ ...prev, periodLock: { ...prev.periodLock, ...data } }));
  };

  const updateModules = (data: Partial<AppSettings['modules']>) => {
    setSettings(prev => ({ ...prev, modules: { ...prev.modules, ...data } }));
  };

  const updateTransaction = (data: Partial<AppSettings['transaction']>) => {
    setSettings(prev => ({
      ...prev,
      transaction: {
        ...prev.transaction,
        ...data,
        prefixes: data.prefixes ? { ...prev.transaction.prefixes, ...data.prefixes } : prev.transaction.prefixes,
        transportDetails: data.transportDetails ? { ...prev.transaction.transportDetails, ...data.transportDetails } : prev.transaction.transportDetails,
      },
      item: data.warrantyCustomFields ? {
        ...prev.item,
        warrantyCustomFields: data.warrantyCustomFields
      } : prev.item
    }));
  };

  const updatePrint = (data: Partial<AppSettings['print']>) => {
    setSettings(prev => ({
      ...prev,
      print: {
        ...prev.print,
        ...data,
        tableColumns: data.tableColumns ? { ...prev.print.tableColumns, ...data.tableColumns } : prev.print.tableColumns,
      }
    }));
  };

  const updateTaxes = (data: Partial<AppSettings['taxes']>) => {
    setSettings(prev => ({ ...prev, taxes: { ...prev.taxes, ...data } }));
  };

  const updateParty = (data: Partial<AppSettings['party']>) => {
    setSettings(prev => ({ ...prev, party: { ...prev.party, ...data } }));
  };

  const updateItem = (data: Partial<AppSettings['item']>) => {
    setSettings(prev => ({
      ...prev,
      item: { ...prev.item, ...data },
      transaction: data.warrantyCustomFields ? {
        ...prev.transaction,
        warrantyCustomFields: data.warrantyCustomFields
      } : prev.transaction
    }));
  };

  const updatePricing = (data: Partial<AppSettings['pricing']>) => {
    setSettings(prev => ({ ...prev, pricing: { ...prev.pricing, ...data } }));
  };

  const updateControlledAndGeneric = (data: Partial<AppSettings['controlledAndGeneric']>) => {
    setSettings(prev => ({ ...prev, controlledAndGeneric: { ...prev.controlledAndGeneric, ...data } }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      general: newSettings.general ? { ...prev.general, ...newSettings.general } : prev.general,
      transaction: newSettings.transaction ? { ...prev.transaction, ...newSettings.transaction } : prev.transaction,
      print: newSettings.print ? { ...prev.print, ...newSettings.print } : prev.print,
      taxes: newSettings.taxes ? { ...prev.taxes, ...newSettings.taxes } : prev.taxes,
      party: newSettings.party ? { ...prev.party, ...newSettings.party } : prev.party,
      item: newSettings.item ? { ...prev.item, ...newSettings.item } : prev.item,
      pricing: newSettings.pricing ? { ...prev.pricing, ...newSettings.pricing } : prev.pricing,
      controlledAndGeneric: newSettings.controlledAndGeneric ? { ...prev.controlledAndGeneric, ...newSettings.controlledAndGeneric } : prev.controlledAndGeneric,
      modules: newSettings.modules ? { ...prev.modules, ...newSettings.modules } : prev.modules,
    }));
  };

  const addTaxRate = (item: Omit<TaxRateItem, 'id'>) => {
    const newRate: TaxRateItem = { ...item, id: `tax-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxRates: [...prev.taxes.taxRates, newRate] },
    }));
  };

  const deleteTaxRate = (id: string) => {
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxRates: prev.taxes.taxRates.filter(t => t.id !== id) },
    }));
  };

  const addTaxGroup = (item: Omit<TaxGroupItem, 'id'>) => {
    const newGroup: TaxGroupItem = { ...item, id: `tg-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxGroups: [...prev.taxes.taxGroups, newGroup] },
    }));
  };

  const deleteTaxGroup = (id: string) => {
    setSettings(prev => ({
      ...prev,
      taxes: { ...prev.taxes, taxGroups: prev.taxes.taxGroups.filter(tg => tg.id !== id) },
    }));
  };

  const addFirm = (firm: Omit<Firm, 'id'>) => {
    const newFirm: Firm = { ...firm, id: `firm-${Date.now()}` };
    setSettings(prev => ({
      ...prev,
      general: { ...prev.general, firms: [...prev.general.firms, newFirm] },
    }));
  };

  const updateFirm = (id: string, data: Partial<Firm>) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.map(f => (f.id === id ? { ...f, ...data } : f)),
      },
    }));
  };

  const deleteFirm = (id: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.filter(f => f.id !== id),
      },
    }));
  };

  const setDefaultFirm = (id: string) => {
    setSettings(prev => ({
      ...prev,
      general: {
        ...prev.general,
        firms: prev.general.firms.map(f => ({ ...f, isDefault: f.id === id })),
      },
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
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
        currentScope: { userId, tenantId, firmId },
        theme: activeTheme,
        isDarkMode,
        toggleTheme,
        setTheme,
        updateSettings,
        updateGeneral,
        updateFeatureFlags,
        updateSafetyRules,
        updatePeriodLock,
        updateTransaction,
        updateTransactionSettings: updateTransaction,
        updatePrint,
        updatePrintSettings: updatePrint,
        updateTaxes,
        updateParty,
        updateItem,
        updatePricing,
        updateControlledAndGeneric,
        updateModules,
        addTaxRate,
        deleteTaxRate,
        addTaxGroup,
        deleteTaxGroup,
        addFirm,
        updateFirm,
        deleteFirm,
        setDefaultFirm,
        resetToDefaults,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
