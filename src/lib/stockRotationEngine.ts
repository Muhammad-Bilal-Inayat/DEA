import { Medicine, MedicineBatch, StockStatus, StockRotationMethod, AuditLog, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard Stock Rotation Batch Item with computed FIFO & FEFO metadata
 */
export interface StockRotationBatchItem {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  mfgDate?: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  status: StockStatus;
  supplierName?: string;
  supplierId?: string;
  purchaseInvoiceNumber?: string;
  purchaseBillId?: string;
  purchaseDate?: string;
  receivedDate?: string;
  rackLocation?: string;
  shelfLocation?: string;
  firmId?: string;
  
  // Computed Rotation Metadata
  daysUntilExpiry: number;
  ageInDays: number;
  expiryCategory: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'ALERT_90' | 'SAFE';
  ageCategory: 'FRESH_30' | 'MEDIUM_60' | 'AGING_90' | 'OLD_STOCK_90_PLUS';
  isPrimary: boolean;
  priorityRank: number;
  rank: number;
  fefoRank: number;
  fifoRank: number;
  isExpired: boolean;
  isNearExpiry: boolean;
  isQuarantined: boolean;
}

/**
 * Stock Allocation Item resulting from a sale or stock deduction
 */
export interface BatchAllocationItem {
  batchId: string;
  batchNumber: string;
  purchaseDate?: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  mrp: number;
  supplierName?: string;
  rackLocation?: string;
  isPrimary: boolean;
  daysUntilExpiry: number;
  ageInDays: number;
}

/**
 * Multi-batch Stock Rotation Allocation Result
 */
export interface StockAllocationResult {
  allocations: BatchAllocationItem[];
  requestedQuantity: number;
  fulfilledQuantity: number;
  unfulfilledQuantity: number;
  isFullySatisfied: boolean;
  isMultiBatchSplit: boolean;
  hasNearExpiry: boolean;
  hasExpiredBlocked: boolean;
  primaryBatch?: StockRotationBatchItem;
  updatedBatches: MedicineBatch[];
  newTotalStock: number;
  methodUsed: StockRotationMethod;
}

/**
 * Calculate days remaining until expiry
 */
export function calculateDaysUntilExpiry(expiryDateStr?: string): number {
  if (!expiryDateStr) return 9999;
  
  let expDate: Date;
  const str = expiryDateStr.trim();
  
  if (str.includes('/') && str.split('/').length === 2) {
    const [month, year] = str.split('/');
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    expDate = new Date(fullYear, monthNum, 0, 23, 59, 59);
  } else if (str.includes('-') && str.split('-').length === 2) {
    const [year, month] = str.split('-');
    const fullYear = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    expDate = new Date(fullYear, monthNum, 0, 23, 59, 59);
  } else {
    expDate = new Date(str);
  }

  if (isNaN(expDate.getTime())) return 9999;

  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate age of stock in days from purchase / received date
 */
export function calculateStockAgeInDays(purchaseDateStr?: string): number {
  if (!purchaseDateStr) return 0;
  const purDate = new Date(purchaseDateStr);
  if (isNaN(purDate.getTime())) return 0;
  const now = new Date();
  const diffTime = now.getTime() - purDate.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Expiry Risk Category
 */
export function getExpiryCategory(days: number): StockRotationBatchItem['expiryCategory'] {
  if (days <= 0) return 'EXPIRED';
  if (days <= 30) return 'CRITICAL_30';
  if (days <= 60) return 'WARNING_60';
  if (days <= 90) return 'ALERT_90';
  return 'SAFE';
}

/**
 * Stock Age Category (FIFO tracking)
 */
export function getStockAgeCategory(ageInDays: number): StockRotationBatchItem['ageCategory'] {
  if (ageInDays <= 30) return 'FRESH_30';
  if (ageInDays <= 60) return 'MEDIUM_60';
  if (ageInDays <= 90) return 'AGING_90';
  return 'OLD_STOCK_90_PLUS';
}

/**
 * Timestamp parser with fallback
 */
function parseTimestamp(dateStr?: string, fallback: number = 9999999999999): number {
  if (!dateStr) return fallback;
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? fallback : t;
}

/**
 * Get sorted batches for a medicine according to FIFO or FEFO rules
 * 
 * @param medicine - The medicine object containing batches
 * @param allMedicines - Sibling medicines array for cross-product compatibility
 * @param method - 'FIFO' (First In, First Out) or 'FEFO' (First Expiry, First Out)
 * @param allowExpired - Whether to include expired stock in eligible pool (default false)
 */
export function getStockRotationSortedBatches(
  medicine: Medicine,
  allMedicines: Medicine[] = [],
  method: StockRotationMethod = 'FIFO',
  allowExpired: boolean = false
): StockRotationBatchItem[] {
  const rawBatches: Array<{
    id: string;
    medicineId: string;
    batchNumber: string;
    expiryDate: string;
    mfgDate?: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    mrp: number;
    status: StockStatus;
    supplierName?: string;
    supplierId?: string;
    purchaseInvoiceNumber?: string;
    purchaseBillId?: string;
    purchaseDate?: string;
    receivedDate?: string;
    rackLocation?: string;
    shelfLocation?: string;
    firmId?: string;
  }> = [];

  // 1. Collect from medicine.batches if defined
  if (medicine.batches && medicine.batches.length > 0) {
    medicine.batches.forEach(b => {
      rawBatches.push({
        id: b.id || `${medicine.id}-${b.batchNumber}`,
        medicineId: medicine.id,
        batchNumber: b.batchNumber || 'DEFAULT',
        expiryDate: b.expiryDate || medicine.expiryDate || '2099-12-31',
        mfgDate: b.mfgDate || medicine.manufacturingDate,
        quantity: typeof b.quantity === 'number' ? b.quantity : 0,
        purchasePrice: b.purchasePrice || medicine.purchasePrice || 0,
        sellingPrice: b.sellingPrice || medicine.sellingPrice || 0,
        mrp: b.mrp || medicine.mrp || medicine.sellingPrice || 0,
        status: b.status || medicine.stockStatus || 'Available',
        supplierName: b.supplierName || medicine.manufacturer,
        supplierId: b.supplierId,
        purchaseInvoiceNumber: b.purchaseInvoiceNumber,
        purchaseBillId: b.purchaseBillId,
        purchaseDate: b.purchaseDate || b.receivedDate || medicine.createdAt,
        receivedDate: b.receivedDate || b.purchaseDate || medicine.createdAt,
        rackLocation: b.rackLocation || medicine.rackLocation || medicine.shelfLocation,
        shelfLocation: b.shelfLocation,
        firmId: b.firmId,
      });
    });
  }

  // 2. Check sibling medicine records (multi-record sync compatibility)
  if (allMedicines.length > 0) {
    const medNameNormalized = medicine.name.trim().toLowerCase();
    const siblings = allMedicines.filter(m => 
      m.id !== medicine.id &&
      m.name.trim().toLowerCase() === medNameNormalized &&
      (m.quantity > 0 || (m.batches && m.batches.some(b => b.quantity > 0)))
    );

    siblings.forEach(sib => {
      if (sib.batches && sib.batches.length > 0) {
        sib.batches.forEach(b => {
          rawBatches.push({
            id: b.id || `${sib.id}-${b.batchNumber}`,
            medicineId: sib.id,
            batchNumber: b.batchNumber || sib.batchNumber || 'DEFAULT',
            expiryDate: b.expiryDate || sib.expiryDate || '2099-12-31',
            mfgDate: b.mfgDate || sib.manufacturingDate,
            quantity: typeof b.quantity === 'number' ? b.quantity : 0,
            purchasePrice: b.purchasePrice || sib.purchasePrice || 0,
            sellingPrice: b.sellingPrice || sib.sellingPrice || 0,
            mrp: b.mrp || sib.mrp || sib.sellingPrice || 0,
            status: b.status || sib.stockStatus || 'Available',
            supplierName: b.supplierName || sib.manufacturer,
            supplierId: b.supplierId,
            purchaseInvoiceNumber: b.purchaseInvoiceNumber,
            purchaseBillId: b.purchaseBillId,
            purchaseDate: b.purchaseDate || sib.createdAt,
            receivedDate: b.receivedDate || sib.createdAt,
            rackLocation: b.rackLocation || sib.rackLocation,
            shelfLocation: b.shelfLocation,
            firmId: b.firmId,
          });
        });
      } else {
        rawBatches.push({
          id: sib.id,
          medicineId: sib.id,
          batchNumber: sib.batchNumber || 'DEFAULT',
          expiryDate: sib.expiryDate || '2099-12-31',
          mfgDate: sib.manufacturingDate,
          quantity: sib.quantity || 0,
          purchasePrice: sib.purchasePrice || 0,
          sellingPrice: sib.sellingPrice || 0,
          mrp: sib.mrp || sib.sellingPrice || 0,
          status: sib.stockStatus || 'Available',
          supplierName: sib.manufacturer,
          purchaseDate: sib.createdAt,
          receivedDate: sib.createdAt,
          rackLocation: sib.rackLocation || sib.shelfLocation,
        });
      }
    });
  }

  // 3. Fallback default batch if none found
  if (rawBatches.length === 0) {
    rawBatches.push({
      id: `${medicine.id}-default`,
      medicineId: medicine.id,
      batchNumber: medicine.batchNumber || 'DEFAULT-01',
      expiryDate: medicine.expiryDate || '2099-12-31',
      mfgDate: medicine.manufacturingDate,
      quantity: medicine.quantity || 0,
      purchasePrice: medicine.purchasePrice || 0,
      sellingPrice: medicine.sellingPrice || 0,
      mrp: medicine.mrp || medicine.sellingPrice || 0,
      status: medicine.stockStatus || 'Available',
      supplierName: medicine.manufacturer,
      purchaseDate: medicine.createdAt || new Date().toISOString(),
      receivedDate: medicine.createdAt || new Date().toISOString(),
      rackLocation: medicine.rackLocation || medicine.shelfLocation,
    });
  }

  // Remove exact duplicates by composite key
  const seenKeys = new Set<string>();
  const uniqueBatches = rawBatches.filter(b => {
    const key = `${b.batchNumber}-${b.expiryDate}-${b.purchaseDate || ''}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  // Calculate computed metadata for each batch
  const enrichedBatches: StockRotationBatchItem[] = uniqueBatches.map(b => {
    const daysExp = calculateDaysUntilExpiry(b.expiryDate);
    const ageDays = calculateStockAgeInDays(b.purchaseDate || b.receivedDate);
    const expCat = getExpiryCategory(daysExp);
    const ageCat = getStockAgeCategory(ageDays);
    const isExp = daysExp <= 0;
    const isNear = daysExp > 0 && daysExp <= 90;
    const isQuar = b.status === 'Quarantined' || b.status === 'Recalled' || b.status === 'Damaged';

    return {
      ...b,
      daysUntilExpiry: daysExp,
      ageInDays: ageDays,
      expiryCategory: expCat,
      ageCategory: ageCat,
      isExpired: isExp,
      isNearExpiry: isNear,
      isQuarantined: isQuar,
      isPrimary: false,
      priorityRank: 0,
      rank: 0,
      fefoRank: 0,
      fifoRank: 0,
    };
  });

  // ROTATION SORTING RULES:
  const sorted = [...enrichedBatches].sort((a, b) => {
    // 1. Quarantined / Recalled stock is always pushed to bottom
    if (a.isQuarantined !== b.isQuarantined) {
      return a.isQuarantined ? 1 : -1;
    }

    // 2. Expired stock protection: Expired stock pushed to bottom if !allowExpired
    if (!allowExpired && a.isExpired !== b.isExpired) {
      return a.isExpired ? 1 : -1;
    }

    if (method === 'FIFO') {
      // FIFO PRIORITY:
      // A. Earliest Purchase/Received Date (ASC - Oldest stock first)
      const purTimeA = parseTimestamp(a.purchaseDate || a.receivedDate);
      const purTimeB = parseTimestamp(b.purchaseDate || b.receivedDate);
      if (purTimeA !== purTimeB) {
        return purTimeA - purTimeB;
      }

      // B. Tie-breaker 1: Earliest Expiry Date (ASC)
      const expTimeA = parseTimestamp(a.expiryDate);
      const expTimeB = parseTimestamp(b.expiryDate);
      if (expTimeA !== expTimeB) {
        return expTimeA - expTimeB;
      }

      // C. Tie-breaker 2: Batch Number lexicographical
      return a.batchNumber.localeCompare(b.batchNumber);
    } else {
      // FEFO PRIORITY:
      // A. Earliest Expiry Date (ASC - Earliest expiring first)
      const expTimeA = parseTimestamp(a.expiryDate);
      const expTimeB = parseTimestamp(b.expiryDate);
      if (expTimeA !== expTimeB) {
        return expTimeA - expTimeB;
      }

      // B. Tie-breaker 1: Earliest Purchase/Received Date (ASC)
      const purTimeA = parseTimestamp(a.purchaseDate || a.receivedDate);
      const purTimeB = parseTimestamp(b.purchaseDate || b.receivedDate);
      if (purTimeA !== purTimeB) {
        return purTimeA - purTimeB;
      }

      // C. Tie-breaker 2: Batch Number lexicographical
      return a.batchNumber.localeCompare(b.batchNumber);
    }
  });

  // Assign priority rank & primary flag to the first eligible batch with quantity > 0
  let primaryFound = false;
  return sorted.map((b, idx) => {
    const isEligible = !b.isQuarantined && (!b.isExpired || allowExpired) && b.quantity > 0;
    const isPrimary = !primaryFound && isEligible;
    if (isPrimary) {
      primaryFound = true;
    }
    return {
      ...b,
      isPrimary: isPrimary,
      priorityRank: idx + 1,
      rank: idx + 1,
      fefoRank: idx + 1,
      fifoRank: idx + 1,
    };
  });
}

/**
 * Universal Stock Allocation Engine (FIFO & FEFO with Multi-Batch Split Support)
 * 
 * Given requested quantity, auto-allocates stock across batches in strict FIFO or FEFO order.
 * If requestedQty > stock in batch 1, automatically splits and consumes from batch 2, 3, etc.
 */
export function allocateStock(
  medicine: Medicine,
  requestedQuantity: number,
  options: {
    method?: StockRotationMethod;
    preferredBatchNumber?: string;
    allowExpired?: boolean;
    allMedicines?: Medicine[];
  } = {}
): StockAllocationResult {
  const { 
    method = 'FIFO', 
    preferredBatchNumber, 
    allowExpired = false, 
    allMedicines = [] 
  } = options;

  const sortedBatches = getStockRotationSortedBatches(medicine, allMedicines, method, allowExpired);

  const allocations: BatchAllocationItem[] = [];
  let remainingNeeded = Math.max(0, requestedQuantity);
  let totalFulfilled = 0;
  let hasNearExpiry = false;
  let hasExpiredBlocked = false;

  // If user selected a specific preferred batch, prioritize that batch first (Manual Override)
  let targetBatches = [...sortedBatches];
  if (preferredBatchNumber) {
    const preferredIdx = targetBatches.findIndex(b => b.batchNumber.toLowerCase() === preferredBatchNumber.toLowerCase());
    if (preferredIdx > 0) {
      const [pref] = targetBatches.splice(preferredIdx, 1);
      targetBatches.unshift(pref);
    }
  }

  // Work with a mutable copy of existing batches to calculate post-sale stock
  const currentBatchMap = new Map<string, MedicineBatch>();
  if (medicine.batches && medicine.batches.length > 0) {
    medicine.batches.forEach(b => {
      currentBatchMap.set(b.batchNumber.toUpperCase(), { ...b });
    });
  } else {
    // Seed default batch
    const defBatchNo = medicine.batchNumber || 'DEFAULT-01';
    currentBatchMap.set(defBatchNo.toUpperCase(), {
      id: `${medicine.id}-default`,
      medicineId: medicine.id,
      batchNumber: defBatchNo,
      expiryDate: medicine.expiryDate || '2099-12-31',
      quantity: medicine.quantity || 0,
      purchasePrice: medicine.purchasePrice || 0,
      sellingPrice: medicine.sellingPrice || 0,
      mrp: medicine.mrp || medicine.sellingPrice || 0,
      status: medicine.stockStatus || 'Available',
      purchaseDate: medicine.createdAt || new Date().toISOString(),
    });
  }

  for (const batch of targetBatches) {
    if (remainingNeeded <= 0) break;

    // Check quarantine
    if (batch.isQuarantined) continue;

    // Check expiry protection
    if (batch.isExpired && !allowExpired) {
      hasExpiredBlocked = true;
      continue;
    }

    if (batch.isNearExpiry) {
      hasNearExpiry = true;
    }

    const availableInBatch = Math.max(0, batch.quantity);
    if (availableInBatch <= 0) continue;

    const takeQty = Math.min(availableInBatch, remainingNeeded);
    if (takeQty > 0) {
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        purchaseDate: batch.purchaseDate,
        expiryDate: batch.expiryDate,
        quantity: takeQty,
        sellingPrice: batch.sellingPrice || medicine.sellingPrice,
        purchasePrice: batch.purchasePrice || medicine.purchasePrice,
        mrp: batch.mrp || medicine.mrp || medicine.sellingPrice,
        supplierName: batch.supplierName,
        rackLocation: batch.rackLocation,
        isPrimary: batch.isPrimary,
        daysUntilExpiry: batch.daysUntilExpiry,
        ageInDays: batch.ageInDays,
      });

      totalFulfilled += takeQty;
      remainingNeeded -= takeQty;

      // Update current batch map
      const existing = currentBatchMap.get(batch.batchNumber.toUpperCase());
      if (existing) {
        existing.quantity = Math.max(0, existing.quantity - takeQty);
      }
    }
  }

  // If there wasn't enough tracked batch stock, fallback gracefully
  if (remainingNeeded > 0) {
    const fallbackBatch = targetBatches[0];
    if (allocations.length === 0 && fallbackBatch) {
      allocations.push({
        batchId: fallbackBatch.id,
        batchNumber: fallbackBatch.batchNumber,
        purchaseDate: fallbackBatch.purchaseDate,
        expiryDate: fallbackBatch.expiryDate,
        quantity: requestedQuantity,
        sellingPrice: fallbackBatch.sellingPrice || medicine.sellingPrice,
        purchasePrice: fallbackBatch.purchasePrice || medicine.purchasePrice,
        mrp: fallbackBatch.mrp || medicine.mrp || medicine.sellingPrice,
        supplierName: fallbackBatch.supplierName,
        rackLocation: fallbackBatch.rackLocation,
        isPrimary: true,
        daysUntilExpiry: fallbackBatch.daysUntilExpiry,
        ageInDays: fallbackBatch.ageInDays,
      });
      totalFulfilled = requestedQuantity;
      remainingNeeded = 0;

      const existing = currentBatchMap.get(fallbackBatch.batchNumber.toUpperCase());
      if (existing) {
        existing.quantity = Math.max(0, existing.quantity - requestedQuantity);
      }
    }
  }

  const updatedBatches = Array.from(currentBatchMap.values());
  const newTotalStock = updatedBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);

  return {
    allocations,
    requestedQuantity,
    fulfilledQuantity: totalFulfilled,
    unfulfilledQuantity: remainingNeeded,
    isFullySatisfied: remainingNeeded === 0,
    isMultiBatchSplit: allocations.length > 1,
    hasNearExpiry,
    hasExpiredBlocked,
    primaryBatch: sortedBatches.find(b => b.isPrimary) || sortedBatches[0],
    updatedBatches,
    newTotalStock,
    methodUsed: method,
  };
}

/**
 * Deduct Stock from Medicine upon Sale (FIFO / FEFO aware)
 */
export function deductStockFromMedicine(
  medicine: Medicine,
  soldQuantity: number,
  options: {
    specificBatchNumber?: string;
    method?: StockRotationMethod;
    allowExpired?: boolean;
  } = {}
): Medicine {
  const { specificBatchNumber, method = 'FIFO', allowExpired = false } = options;

  const allocation = allocateStock(medicine, soldQuantity, {
    preferredBatchNumber: specificBatchNumber,
    method,
    allowExpired,
  });

  const remainingBatches = allocation.updatedBatches;
  const newTotalQuantity = Math.max(0, (medicine.quantity || 0) - soldQuantity);

  // Find the next active batch in order
  const activeSortedBatches = getStockRotationSortedBatches({
    ...medicine,
    batches: remainingBatches,
    quantity: newTotalQuantity
  }, [], method, allowExpired);
  
  const nextActiveBatch = activeSortedBatches.find(b => b.quantity > 0 && !b.isQuarantined) || activeSortedBatches[0];

  return {
    ...medicine,
    quantity: newTotalQuantity,
    batches: remainingBatches,
    batchNumber: nextActiveBatch?.batchNumber || medicine.batchNumber,
    expiryDate: nextActiveBatch?.expiryDate || medicine.expiryDate,
    sellingPrice: nextActiveBatch?.sellingPrice || medicine.sellingPrice,
    mrp: nextActiveBatch?.mrp || medicine.mrp,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sale Return Restock (Restores units to original batch, preserving FIFO history)
 */
export function restockSaleReturn(
  medicine: Medicine,
  returnQuantity: number,
  batchNumber?: string,
  originalPurchaseDate?: string
): Medicine {
  const targetBatchNo = (batchNumber || medicine.batchNumber || 'DEFAULT-01').trim();
  const existingBatches = [...(medicine.batches || [])];

  const batchIdx = existingBatches.findIndex(
    b => b.batchNumber.toLowerCase() === targetBatchNo.toLowerCase()
  );

  if (batchIdx >= 0) {
    existingBatches[batchIdx] = {
      ...existingBatches[batchIdx],
      quantity: (existingBatches[batchIdx].quantity || 0) + returnQuantity,
    };
  } else {
    existingBatches.push({
      id: uuidv4(),
      medicineId: medicine.id,
      batchNumber: targetBatchNo,
      expiryDate: medicine.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
      quantity: returnQuantity,
      purchasePrice: medicine.purchasePrice || 0,
      sellingPrice: medicine.sellingPrice || 0,
      mrp: medicine.mrp || medicine.sellingPrice || 0,
      status: 'Available',
      purchaseDate: originalPurchaseDate || medicine.createdAt || new Date().toISOString(),
      receivedDate: originalPurchaseDate || medicine.createdAt || new Date().toISOString(),
    });
  }

  const newTotal = (medicine.quantity || 0) + returnQuantity;

  return {
    ...medicine,
    quantity: newTotal,
    batches: existingBatches,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Add Purchase Stock to Medicine (Records new batch with exact purchase/received date)
 */
export function addPurchaseStockToMedicine(
  existingMedicine: Medicine | null,
  purchaseItem: {
    name: string;
    batchNumber?: string;
    expiryDate?: string;
    mfgDate?: string;
    quantity: number;
    freeQuantity?: number;
    purchasePrice: number;
    sellingPrice?: number;
    mrp?: number;
    unit?: string;
    taxPercentage?: number;
    hsnCode?: string;
    rackLocation?: string;
    purchaseInvoiceNumber?: string;
    purchaseBillId?: string;
    firmId?: string;
  },
  supplierName: string = 'Direct Supplier',
  purchaseDate: string = new Date().toISOString(),
  optionsOrMethod?: StockRotationMethod | {
    purchaseInvoiceNumber?: string;
    purchaseBillId?: string;
    firmId?: string;
    method?: StockRotationMethod;
  }
): Medicine {
  const method: StockRotationMethod = typeof optionsOrMethod === 'string'
    ? optionsOrMethod
    : optionsOrMethod?.method || 'FIFO';

  const extraInvoiceNo = typeof optionsOrMethod === 'object' ? optionsOrMethod.purchaseInvoiceNumber : undefined;
  const extraBillId = typeof optionsOrMethod === 'object' ? optionsOrMethod.purchaseBillId : undefined;
  const extraFirmId = typeof optionsOrMethod === 'object' ? optionsOrMethod.firmId : undefined;

  const totalQtyReceived = (Number(purchaseItem.quantity) || 0) + (Number(purchaseItem.freeQuantity) || 0);
  const batchNo = (purchaseItem.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`).trim();
  const expDate = purchaseItem.expiryDate ? purchaseItem.expiryDate.slice(0, 10) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10);
  const purPrice = Number(purchaseItem.purchasePrice) || 0;
  const mrpVal = Number(purchaseItem.mrp) || (purPrice * 1.3);
  const sellPrice = Number(purchaseItem.sellingPrice) || (mrpVal * 0.95);

  if (!existingMedicine) {
    const medId = `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const initialBatch: MedicineBatch = {
      id: uuidv4(),
      medicineId: medId,
      batchNumber: batchNo,
      expiryDate: expDate,
      mfgDate: purchaseItem.mfgDate,
      quantity: totalQtyReceived,
      purchasePrice: purPrice,
      sellingPrice: sellPrice,
      mrp: mrpVal,
      status: 'Available',
      supplierName: supplierName,
      purchaseInvoiceNumber: extraInvoiceNo || purchaseItem.purchaseInvoiceNumber,
      purchaseBillId: extraBillId || purchaseItem.purchaseBillId,
      purchaseDate: purchaseDate,
      receivedDate: purchaseDate,
      rackLocation: purchaseItem.rackLocation || 'Rack A-1',
      firmId: extraFirmId || purchaseItem.firmId,
    };

    return {
      id: medId,
      barcode: `8964${Math.floor(100000000 + Math.random() * 900000000)}`,
      name: purchaseItem.name.trim(),
      batchNumber: batchNo,
      manufacturer: supplierName,
      unit: purchaseItem.unit || 'PCS',
      expiryDate: expDate,
      manufacturingDate: purchaseItem.mfgDate,
      quantity: totalQtyReceived,
      lowStockThreshold: 10,
      purchasePrice: purPrice,
      latestPurchasePrice: purPrice,
      latestPurchaseDate: purchaseDate,
      mrp: mrpVal,
      sellingPrice: sellPrice,
      gstPercentage: purchaseItem.taxPercentage || 0,
      hsnCode: purchaseItem.hsnCode || '3004.9090',
      rackLocation: purchaseItem.rackLocation || 'Rack A-1',
      stockStatus: 'Available',
      batches: [initialBatch],
      createdAt: purchaseDate,
      updatedAt: purchaseDate,
    };
  }

  const existingBatches = [...(existingMedicine.batches || [])];

  if (existingBatches.length === 0 && (existingMedicine.quantity || 0) > 0) {
    existingBatches.push({
      id: uuidv4(),
      medicineId: existingMedicine.id,
      batchNumber: existingMedicine.batchNumber || 'BATCH-LEGACY',
      expiryDate: existingMedicine.expiryDate || '2028-12-31',
      mfgDate: existingMedicine.manufacturingDate,
      quantity: existingMedicine.quantity || 0,
      purchasePrice: existingMedicine.purchasePrice || 0,
      sellingPrice: existingMedicine.sellingPrice || 0,
      mrp: existingMedicine.mrp || 0,
      status: existingMedicine.stockStatus || 'Available',
      supplierName: existingMedicine.manufacturer,
      purchaseDate: existingMedicine.createdAt || new Date().toISOString(),
      receivedDate: existingMedicine.createdAt || new Date().toISOString(),
    });
  }

  // Matching batch check (by batch number and expiry month)
  const existingBatchIdx = existingBatches.findIndex(
    b => b.batchNumber.toLowerCase() === batchNo.toLowerCase() &&
         (!b.expiryDate || b.expiryDate.slice(0, 7) === expDate.slice(0, 7))
  );

  if (existingBatchIdx >= 0) {
    const curB = existingBatches[existingBatchIdx];
    const prevQty = curB.quantity || 0;
    const newQty = prevQty + totalQtyReceived;

    // Weighted average cost for this specific batch
    const newBatchCost = prevQty + totalQtyReceived > 0
      ? ((prevQty * (curB.purchasePrice || 0)) + (totalQtyReceived * purPrice)) / (prevQty + totalQtyReceived)
      : purPrice;

    existingBatches[existingBatchIdx] = {
      ...curB,
      quantity: newQty,
      purchasePrice: Number(newBatchCost.toFixed(2)),
      sellingPrice: sellPrice || curB.sellingPrice,
      mrp: mrpVal || curB.mrp,
      expiryDate: expDate || curB.expiryDate,
      mfgDate: purchaseItem.mfgDate || curB.mfgDate,
      supplierName: supplierName || curB.supplierName,
      purchaseInvoiceNumber: purchaseItem.purchaseInvoiceNumber || curB.purchaseInvoiceNumber,
      purchaseBillId: purchaseItem.purchaseBillId || curB.purchaseBillId,
      purchaseDate: purchaseDate || curB.purchaseDate,
      status: 'Available',
    };
  } else {
    // Append new traceable batch
    existingBatches.push({
      id: uuidv4(),
      medicineId: existingMedicine.id,
      batchNumber: batchNo,
      expiryDate: expDate,
      mfgDate: purchaseItem.mfgDate,
      quantity: totalQtyReceived,
      purchasePrice: purPrice,
      sellingPrice: sellPrice,
      mrp: mrpVal,
      status: 'Available',
      supplierName: supplierName,
      purchaseInvoiceNumber: purchaseItem.purchaseInvoiceNumber,
      purchaseBillId: purchaseItem.purchaseBillId,
      purchaseDate: purchaseDate,
      receivedDate: purchaseDate,
      rackLocation: purchaseItem.rackLocation || existingMedicine.rackLocation,
      firmId: purchaseItem.firmId,
    });
  }

  // Overall new stock quantity & weighted average purchase cost
  const oldStock = existingMedicine.quantity || 0;
  const newTotalQuantity = oldStock + totalQtyReceived;
  const overallAvgCost = newTotalQuantity > 0
    ? ((oldStock * (existingMedicine.purchasePrice || 0)) + (totalQtyReceived * purPrice)) / newTotalQuantity
    : purPrice;

  // Sort batches by current rotation method to set the medicine's primary batch
  const sortedRotation = getStockRotationSortedBatches({
    ...existingMedicine,
    batches: existingBatches,
    quantity: newTotalQuantity,
  }, [], method);
  const bestBatch = sortedRotation.find(b => b.quantity > 0 && !b.isQuarantined) || sortedRotation[0];

  return {
    ...existingMedicine,
    quantity: newTotalQuantity,
    purchasePrice: Number(overallAvgCost.toFixed(2)),
    latestPurchasePrice: purPrice,
    latestPurchaseDate: purchaseDate,
    sellingPrice: bestBatch?.sellingPrice || existingMedicine.sellingPrice,
    mrp: bestBatch?.mrp || existingMedicine.mrp,
    batchNumber: bestBatch?.batchNumber || existingMedicine.batchNumber,
    expiryDate: bestBatch?.expiryDate || existingMedicine.expiryDate,
    batches: existingBatches,
    unit: purchaseItem.unit && purchaseItem.unit !== 'NONE' ? purchaseItem.unit : existingMedicine.unit,
    hsnCode: purchaseItem.hsnCode || existingMedicine.hsnCode,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deduct Purchase Return from a specific batch of medicine
 */
export function deductPurchaseReturnFromMedicine(
  medicine: Medicine,
  returnQty: number,
  batchNumber?: string
): Medicine {
  const targetBatchNo = (batchNumber || medicine.batchNumber || '').trim();
  const batches = [...(medicine.batches || [])];

  if (batches.length > 0 && targetBatchNo) {
    const idx = batches.findIndex(b => b.batchNumber.toLowerCase() === targetBatchNo.toLowerCase());
    if (idx >= 0) {
      batches[idx] = {
        ...batches[idx],
        quantity: Math.max(0, (batches[idx].quantity || 0) - returnQty),
      };
    }
  }

  const newTotalQty = Math.max(0, (medicine.quantity || 0) - returnQty);

  return {
    ...medicine,
    quantity: newTotalQty,
    batches: batches.length > 0 ? batches : undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Adjust stock at a specific batch level
 */
export function adjustBatchStockQuantity(
  medicine: Medicine,
  batchNumber: string,
  newQuantity: number,
  reason?: string
): Medicine {
  const batches = [...(medicine.batches || [])];
  const targetBatchNo = batchNumber.trim();

  const idx = batches.findIndex(b => b.batchNumber.toLowerCase() === targetBatchNo.toLowerCase());
  if (idx >= 0) {
    batches[idx] = {
      ...batches[idx],
      quantity: Math.max(0, newQuantity),
    };
  } else {
    batches.push({
      id: uuidv4(),
      medicineId: medicine.id,
      batchNumber: targetBatchNo || 'ADJ-BATCH',
      expiryDate: medicine.expiryDate || '2028-12-31',
      quantity: Math.max(0, newQuantity),
      purchasePrice: medicine.purchasePrice || 0,
      sellingPrice: medicine.sellingPrice || 0,
      mrp: medicine.mrp || medicine.sellingPrice || 0,
      status: 'Available',
      purchaseDate: new Date().toISOString(),
    });
  }

  const newTotal = batches.reduce((acc, b) => acc + (b.quantity || 0), 0);

  return {
    ...medicine,
    quantity: newTotal,
    batches: batches,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Log Manual Batch Override for Audit Trail
 */
export async function logStockRotationOverride(
  dbAuditLogs: any,
  user: { id?: string; name?: string; role?: string } | User | null,
  medicineName: string,
  defaultBatch: string,
  selectedBatch: string,
  quantity: number,
  method: StockRotationMethod,
  reason: string = 'User Manual Override in POS'
) {
  try {
    const log: AuditLog = {
      id: uuidv4(),
      date: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      action: method === 'FIFO' ? 'FIFO_OVERRIDE' : 'FEFO_OVERRIDE',
      medicineName: medicineName,
      quantityChanged: quantity,
      userId: user?.id || 'system',
      notes: `${method} override on ${medicineName}. System recommended batch "${defaultBatch}", user selected "${selectedBatch}". Qty: ${quantity}. Reason: ${reason}`,
      details: JSON.stringify({
        method,
        medicineName,
        defaultBatch,
        selectedBatch,
        quantity,
        reason,
        userName: user?.name || 'Cashier',
        timestamp: new Date().toISOString(),
      }),
    };
    await dbAuditLogs.add(log);
  } catch (err) {
    console.error('Failed to log stock rotation override:', err);
  }
}

/**
 * Comprehensive FIFO & Stock Aging Analytics
 */
export function calculateFIFOInventoryAnalytics(medicines: Medicine[]) {
  let totalBatchesCount = 0;
  let totalStockUnits = 0;
  let totalValuationFIFO = 0;
  
  let fresh30DaysUnits = 0;
  let fresh30DaysValue = 0;
  let medium60DaysUnits = 0;
  let medium60DaysValue = 0;
  let aging90DaysUnits = 0;
  let aging90DaysValue = 0;
  let oldStock90PlusUnits = 0;
  let oldStock90PlusValue = 0;

  let expiredBatchesCount = 0;
  let expiredUnits = 0;
  let expiredValue = 0;

  const slowMovingBatches: Array<{
    medicineId: string;
    medicineName: string;
    batchNumber: string;
    purchaseDate: string;
    ageInDays: number;
    quantity: number;
    purchasePrice: number;
    totalValue: number;
    supplierName?: string;
  }> = [];

  medicines.forEach(m => {
    const batches = getStockRotationSortedBatches(m, [], 'FIFO', true);

    batches.forEach(b => {
      totalBatchesCount++;
      const qty = b.quantity || 0;
      totalStockUnits += qty;

      const rate = b.purchasePrice || m.purchasePrice || 0;
      const batchVal = qty * rate;
      totalValuationFIFO += batchVal;

      if (b.isExpired) {
        expiredBatchesCount++;
        expiredUnits += qty;
        expiredValue += batchVal;
      }

      if (b.ageInDays <= 30) {
        fresh30DaysUnits += qty;
        fresh30DaysValue += batchVal;
      } else if (b.ageInDays <= 60) {
        medium60DaysUnits += qty;
        medium60DaysValue += batchVal;
      } else if (b.ageInDays <= 90) {
        aging90DaysUnits += qty;
        aging90DaysValue += batchVal;
      } else {
        oldStock90PlusUnits += qty;
        oldStock90PlusValue += batchVal;
        if (qty > 0) {
          slowMovingBatches.push({
            medicineId: m.id,
            medicineName: m.name,
            batchNumber: b.batchNumber,
            purchaseDate: b.purchaseDate || 'N/A',
            ageInDays: b.ageInDays,
            quantity: qty,
            purchasePrice: rate,
            totalValue: batchVal,
            supplierName: b.supplierName,
          });
        }
      }
    });
  });

  // Sort slow moving batches by oldest first
  slowMovingBatches.sort((a, b) => b.ageInDays - a.ageInDays);

  return {
    totalBatchesCount,
    totalStockUnits,
    totalValuationFIFO,
    aging: {
      fresh30: { units: fresh30DaysUnits, value: fresh30DaysValue },
      medium60: { units: medium60DaysUnits, value: medium60DaysValue },
      aging90: { units: aging90DaysUnits, value: aging90DaysValue },
      oldStock90Plus: { units: oldStock90PlusUnits, value: oldStock90PlusValue },
    },
    expired: { count: expiredBatchesCount, units: expiredUnits, value: expiredValue },
    slowMovingBatches: slowMovingBatches.slice(0, 50),
  };
}
