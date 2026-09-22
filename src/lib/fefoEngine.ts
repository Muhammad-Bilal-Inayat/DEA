import { Medicine, MedicineBatch, StockStatus, InvoiceItem, PurchaseBillItem, PurchaseOrderItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * FEFO Batch Model with computed metadata
 */
export interface FEFOBatchItem {
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
  purchaseDate?: string;
  receivedDate?: string;
  rackLocation?: string;
  daysUntilExpiry: number;
  expiryCategory: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'ALERT_90' | 'SAFE';
  isFEFOPrimary: boolean;
  fefoRank: number;
  isExpired: boolean;
  isNearExpiry: boolean;
  isQuarantined: boolean;
}

/**
 * Multi-batch FEFO Allocation Result
 */
export interface FEFOAllocationResult {
  allocations: Array<{
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    sellingPrice: number;
    purchasePrice: number;
    mrp: number;
    rackLocation?: string;
    isFEFO: boolean;
    daysUntilExpiry: number;
  }>;
  requestedQuantity: number;
  fulfilledQuantity: number;
  unfulfilledQuantity: number;
  isFullySatisfied: boolean;
  isMultiBatchSplit: boolean;
  hasNearExpiry: boolean;
  hasExpiredBlocked: boolean;
  primaryBatch?: FEFOBatchItem;
  updatedBatches: MedicineBatch[];
  newTotalStock: number;
}

/**
 * Calculate days remaining until expiry from an ISO or YYYY-MM-DD or MM/YYYY string
 */
export function calculateDaysUntilExpiry(expiryDateStr?: string): number {
  if (!expiryDateStr) return 9999;
  
  let expDate: Date;
  const str = expiryDateStr.trim();
  
  // Format: MM/YYYY or MM-YYYY
  if (str.includes('/') && str.split('/').length === 2) {
    const [month, year] = str.split('/');
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    // End of the month
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
 * Categorize days to expiry into standard risk buckets
 */
export function getExpiryCategory(days: number): FEFOBatchItem['expiryCategory'] {
  if (days <= 0) return 'EXPIRED';
  if (days <= 30) return 'CRITICAL_30';
  if (days <= 60) return 'WARNING_60';
  if (days <= 90) return 'ALERT_90';
  return 'SAFE';
}

/**
 * Parse an ISO date or timestamp into a comparable unix millisecond number
 */
function getTimestamp(dateStr?: string, fallback: number = 9999999999999): number {
  if (!dateStr) return fallback;
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? fallback : t;
}

/**
 * Get all batches for a medicine sorted strictly by FEFO rules:
 * 1. Earliest Expiry Date (ASC)
 * 2. Earliest Purchase Date / Received Date (ASC)
 * 3. Batch Number (ASC)
 * 
 * Also incorporates sibling medicine records (e.g., if different lots were added as separate product rows).
 */
export function getFEFOSortedBatches(
  medicine: Medicine,
  allMedicines: Medicine[] = [],
  allowExpired: boolean = false
): FEFOBatchItem[] {
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
    purchaseDate?: string;
    receivedDate?: string;
    rackLocation?: string;
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
        purchaseDate: b.purchaseDate || b.receivedDate || medicine.createdAt,
        receivedDate: b.receivedDate || b.purchaseDate || medicine.createdAt,
        rackLocation: b.rackLocation || medicine.rackLocation || medicine.shelfLocation,
      });
    });
  }

  // 2. Also check if other medicine records exist with the same name (multi-record sync compatibility)
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
            purchaseDate: b.purchaseDate || sib.createdAt,
            receivedDate: b.receivedDate || sib.createdAt,
            rackLocation: b.rackLocation || sib.rackLocation,
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

  // If no batches collected yet, create standard batch from the main medicine object
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
      purchaseDate: medicine.createdAt,
      receivedDate: medicine.createdAt,
      rackLocation: medicine.rackLocation || medicine.shelfLocation,
    });
  }

  // Remove exact duplicates by id
  const seenIds = new Set<string>();
  const uniqueBatches = rawBatches.filter(b => {
    const key = `${b.batchNumber}-${b.expiryDate}`;
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });

  // Calculate metadata for each batch
  const enrichedBatches: FEFOBatchItem[] = uniqueBatches.map(b => {
    const days = calculateDaysUntilExpiry(b.expiryDate);
    const category = getExpiryCategory(days);
    const isExp = days <= 0;
    const isNear = days > 0 && days <= 90;
    const isQuar = b.status === 'Quarantined' || b.status === 'Recalled' || b.status === 'Damaged';

    return {
      ...b,
      daysUntilExpiry: days,
      expiryCategory: category,
      isExpired: isExp,
      isNearExpiry: isNear,
      isQuarantined: isQuar,
      isFEFOPrimary: false,
      fefoRank: 0,
    };
  });

  // STRICT FEFO SORTING ENGINE:
  // 1. Active/Available stock before Expired / Quarantined
  // 2. Earliest Expiry Date (ASC)
  // 3. Earliest Received/Purchase Date (ASC)
  // 4. Batch Number (ASC)
  const sorted = [...enrichedBatches].sort((a, b) => {
    // Quarantine/Recall check
    if (a.isQuarantined !== b.isQuarantined) {
      return a.isQuarantined ? 1 : -1;
    }

    // Expired check (unless allowExpired is true)
    if (!allowExpired && a.isExpired !== b.isExpired) {
      return a.isExpired ? 1 : -1;
    }

    // Expiry Date Comparison (Earliest first)
    const expTimeA = getTimestamp(a.expiryDate);
    const expTimeB = getTimestamp(b.expiryDate);
    if (expTimeA !== expTimeB) {
      return expTimeA - expTimeB;
    }

    // Received/Purchase Date Comparison (Earliest first)
    const purTimeA = getTimestamp(a.purchaseDate);
    const purTimeB = getTimestamp(b.purchaseDate);
    if (purTimeA !== purTimeB) {
      return purTimeA - purTimeB;
    }

    // Batch Number Lexicographical
    return a.batchNumber.localeCompare(b.batchNumber);
  });

  // Assign FEFO rank & primary flag to the first eligible batch with quantity > 0
  let primaryFound = false;
  return sorted.map((b, idx) => {
    const isEligible = !b.isQuarantined && (!b.isExpired || allowExpired) && b.quantity > 0;
    const isPrimary = !primaryFound && isEligible;
    if (isPrimary) {
      primaryFound = true;
    }
    return {
      ...b,
      isFEFOPrimary: isPrimary,
      fefoRank: idx + 1,
    };
  });
}

/**
 * Core FEFO Stock Allocation Engine:
 * Given a requested quantity, auto-allocates stock across batches in strict FEFO order.
 * If requestedQty > stock in batch 1, automatically splits and consumes from batch 2, 3, etc.
 */
export function allocateFEFOStock(
  medicine: Medicine,
  requestedQuantity: number,
  options: {
    preferredBatchNumber?: string;
    allowExpired?: boolean;
    allMedicines?: Medicine[];
  } = {}
): FEFOAllocationResult {
  const { preferredBatchNumber, allowExpired = false, allMedicines = [] } = options;
  const sortedBatches = getFEFOSortedBatches(medicine, allMedicines, allowExpired);

  const allocations: FEFOAllocationResult['allocations'] = [];
  let remainingNeeded = Math.max(0, requestedQuantity);
  let totalFulfilled = 0;
  let hasNearExpiry = false;
  let hasExpiredBlocked = false;

  // If user selected a specific preferred batch, prioritize that batch first
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
    });
  }

  for (const batch of targetBatches) {
    if (remainingNeeded <= 0) break;

    // Check if batch is quarantined
    if (batch.isQuarantined) continue;

    // Check if batch is expired
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
        expiryDate: batch.expiryDate,
        quantity: takeQty,
        sellingPrice: batch.sellingPrice || medicine.sellingPrice,
        purchasePrice: batch.purchasePrice || medicine.purchasePrice,
        mrp: batch.mrp || medicine.mrp || medicine.sellingPrice,
        rackLocation: batch.rackLocation,
        isFEFO: batch.isFEFOPrimary,
        daysUntilExpiry: batch.daysUntilExpiry,
      });

      totalFulfilled += takeQty;
      remainingNeeded -= takeQty;

      // Update the batch map
      const existing = currentBatchMap.get(batch.batchNumber.toUpperCase());
      if (existing) {
        existing.quantity = Math.max(0, existing.quantity - takeQty);
      }
    }
  }

  // If there wasn't enough stock in tracked batches, still fulfill from unallocated if needed
  if (remainingNeeded > 0) {
    // Take from primary batch or create unallocated line
    const fallbackBatch = targetBatches[0];
    if (allocations.length === 0 && fallbackBatch) {
      allocations.push({
        batchId: fallbackBatch.id,
        batchNumber: fallbackBatch.batchNumber,
        expiryDate: fallbackBatch.expiryDate,
        quantity: requestedQuantity,
        sellingPrice: fallbackBatch.sellingPrice || medicine.sellingPrice,
        purchasePrice: fallbackBatch.purchasePrice || medicine.purchasePrice,
        mrp: fallbackBatch.mrp || medicine.mrp || medicine.sellingPrice,
        rackLocation: fallbackBatch.rackLocation,
        isFEFO: true,
        daysUntilExpiry: fallbackBatch.daysUntilExpiry,
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
    primaryBatch: sortedBatches.find(b => b.isFEFOPrimary) || sortedBatches[0],
    updatedBatches,
    newTotalStock,
  };
}

/**
 * Apply FEFO Stock Deduction to a Medicine object upon Sale
 * Deducts quantities from `medicine.batches`, updates `medicine.quantity`,
 * and syncs `batchNumber` & `expiryDate` to the next soonest active FEFO batch.
 */
export function deductFEFOFromMedicine(
  medicine: Medicine,
  soldQuantity: number,
  specificBatchNumber?: string
): Medicine {
  const allocation = allocateFEFOStock(medicine, soldQuantity, {
    preferredBatchNumber: specificBatchNumber,
    allowExpired: false,
  });

  const remainingBatches = allocation.updatedBatches;
  const newTotalQuantity = Math.max(0, (medicine.quantity || 0) - soldQuantity);

  // Find the next active FEFO batch with stock > 0
  const activeSortedBatches = getFEFOSortedBatches({
    ...medicine,
    batches: remainingBatches,
    quantity: newTotalQuantity
  });
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
 * Apply Sale Return Restock to a Medicine object
 * Restocks quantity to the specific batch or latest active batch.
 */
export function restockFEFOSaleReturn(
  medicine: Medicine,
  returnQuantity: number,
  batchNumber?: string
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
 * Apply Purchase Stock to a Medicine (or create initial batch on receiving goods)
 * Automatically creates or updates the batch record, calculates weighted average purchase price,
 * and maintains complete FEFO traceability.
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
  },
  supplierName: string = 'Direct Supplier',
  purchaseDate: string = new Date().toISOString()
): Medicine {
  const totalQtyReceived = (Number(purchaseItem.quantity) || 0) + (Number(purchaseItem.freeQuantity) || 0);
  const batchNo = (purchaseItem.batchNumber || 'BATCH-01').trim();
  const expDate = purchaseItem.expiryDate ? purchaseItem.expiryDate.slice(0, 10) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10);
  const purPrice = Number(purchaseItem.purchasePrice) || 0;
  const mrpVal = Number(purchaseItem.mrp) || (purPrice * 1.3);
  const sellPrice = Number(purchaseItem.sellingPrice) || (mrpVal * 0.95);

  if (!existingMedicine) {
    // Create new medicine record with initial batch
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
      purchaseDate: purchaseDate,
      receivedDate: purchaseDate,
      rackLocation: purchaseItem.rackLocation || 'Rack A-1',
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

  // Update existing medicine
  const existingBatches = [...(existingMedicine.batches || [])];
  
  // If no batches previously existed on medicine, create one for existing stock first
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
      purchaseDate: existingMedicine.createdAt,
    });
  }

  // Check if matching batch exists
  const existingBatchIdx = existingBatches.findIndex(
    b => b.batchNumber.toLowerCase() === batchNo.toLowerCase() &&
         (!b.expiryDate || b.expiryDate.slice(0, 7) === expDate.slice(0, 7))
  );

  if (existingBatchIdx >= 0) {
    const curB = existingBatches[existingBatchIdx];
    const prevQty = curB.quantity || 0;
    const newQty = prevQty + totalQtyReceived;
    // Calculate batch weighted average cost
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
      purchaseDate: purchaseDate,
      status: 'Available',
    };
  } else {
    // Append new batch
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
      purchaseDate: purchaseDate,
      receivedDate: purchaseDate,
      rackLocation: purchaseItem.rackLocation || existingMedicine.rackLocation,
    });
  }

  // Calculate overall new stock quantity & weighted average purchase cost
  const oldStock = existingMedicine.quantity || 0;
  const newTotalQuantity = oldStock + totalQtyReceived;
  const overallAvgCost = newTotalQuantity > 0
    ? ((oldStock * (existingMedicine.purchasePrice || 0)) + (totalQtyReceived * purPrice)) / newTotalQuantity
    : purPrice;

  // Sort batches by FEFO to set the medicine's primary batch and expiry
  const sortedFEFO = getFEFOSortedBatches({
    ...existingMedicine,
    batches: existingBatches,
    quantity: newTotalQuantity,
  });
  const bestBatch = sortedFEFO.find(b => b.quantity > 0 && !b.isQuarantined) || sortedFEFO[0];

  return {
    ...existingMedicine,
    quantity: newTotalQuantity,
    purchasePrice: Number(overallAvgCost.toFixed(2)),
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
    // Add batch with specified quantity
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
 * Comprehensive FEFO Analytics & Health Score
 */
export function calculateFEFOInventoryAnalytics(medicines: Medicine[]) {
  let totalBatchesCount = 0;
  let totalStockUnits = 0;
  let expiredBatchesCount = 0;
  let expiredUnits = 0;
  let expiredValue = 0;
  let in30DaysBatchesCount = 0;
  let in30DaysUnits = 0;
  let in30DaysValue = 0;
  let in60DaysBatchesCount = 0;
  let in60DaysUnits = 0;
  let in60DaysValue = 0;
  let in90DaysBatchesCount = 0;
  let in90DaysUnits = 0;
  let in90DaysValue = 0;
  let quarantinedBatchesCount = 0;
  let multiBatchProductsCount = 0;

  medicines.forEach(m => {
    const batches = getFEFOSortedBatches(m);
    if (batches.length > 1) {
      multiBatchProductsCount++;
    }

    batches.forEach(b => {
      totalBatchesCount++;
      totalStockUnits += (b.quantity || 0);

      const val = (b.quantity || 0) * (b.purchasePrice || m.purchasePrice || 0);

      if (b.isQuarantined) {
        quarantinedBatchesCount++;
      }

      switch (b.expiryCategory) {
        case 'EXPIRED':
          expiredBatchesCount++;
          expiredUnits += b.quantity;
          expiredValue += val;
          break;
        case 'CRITICAL_30':
          in30DaysBatchesCount++;
          in30DaysUnits += b.quantity;
          in30DaysValue += val;
          break;
        case 'WARNING_60':
          in60DaysBatchesCount++;
          in60DaysUnits += b.quantity;
          in60DaysValue += val;
          break;
        case 'ALERT_90':
          in90DaysBatchesCount++;
          in90DaysUnits += b.quantity;
          in90DaysValue += val;
          break;
      }
    });
  });

  const totalAtRiskValue = expiredValue + in30DaysValue + in60DaysValue + in90DaysValue;
  const fefoEfficiencyScore = totalBatchesCount > 0
    ? Math.max(0, Math.round(((totalBatchesCount - (expiredBatchesCount * 2 + in30DaysBatchesCount)) / totalBatchesCount) * 100))
    : 100;

  return {
    totalBatchesCount,
    totalStockUnits,
    multiBatchProductsCount,
    quarantinedBatchesCount,
    expired: { count: expiredBatchesCount, units: expiredUnits, value: expiredValue },
    in30Days: { count: in30DaysBatchesCount, units: in30DaysUnits, value: in30DaysValue },
    in60Days: { count: in60DaysBatchesCount, units: in60DaysUnits, value: in60DaysValue },
    in90Days: { count: in90DaysBatchesCount, units: in90DaysUnits, value: in90DaysValue },
    totalAtRiskValue,
    fefoEfficiencyScore,
  };
}
