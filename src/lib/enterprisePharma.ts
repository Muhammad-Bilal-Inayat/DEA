import { Medicine, Invoice, PurchaseOrder, Supplier, StockAdjustmentRequest, ProductRecallRecord, CashierShift, DemandForecast, SupplierScorecard, StockStatus, MedicineBatch } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * FEFO Engine (First Expiry, First Out)
 * Returns medicines/batches sorted by earliest expiry date first,
 * filtering out Expired or Quarantined/Recalled stock.
 */
export function getFEFOBatches(medicine: Medicine, allMedicines: Medicine[] = []): Array<{
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  sellingPrice: number;
  purchasePrice: number;
  mrp: number;
  stockStatus: StockStatus;
  rackLocation?: string;
  isSoonestExpiry: boolean;
}> {
  // If the medicine has explicit batches defined
  if (medicine.batches && medicine.batches.length > 0) {
    const validBatches = medicine.batches.filter(b => b.status === 'Available' || !b.status);
    const sorted = [...validBatches].sort((a, b) => {
      const expA = new Date(a.expiryDate || '2099-12-31').getTime();
      const expB = new Date(b.expiryDate || '2099-12-31').getTime();
      return expA - expB;
    });

    return sorted.map((b, idx) => ({
      id: b.id || `${medicine.id}-${b.batchNumber}`,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      quantity: b.quantity,
      sellingPrice: b.sellingPrice || medicine.sellingPrice,
      purchasePrice: b.purchasePrice || medicine.purchasePrice,
      mrp: b.mrp || medicine.mrp || medicine.sellingPrice,
      stockStatus: b.status || 'Available',
      rackLocation: b.rackLocation || medicine.rackLocation,
      isSoonestExpiry: idx === 0
    }));
  }

  // Also check other records with the same medicine name to provide multi-batch FEFO
  const siblings = allMedicines.filter(m => 
    m.name.trim().toLowerCase() === medicine.name.trim().toLowerCase() &&
    (m.stockStatus === 'Available' || !m.stockStatus) &&
    m.quantity > 0
  );

  const sortedSiblings = [...(siblings.length > 0 ? siblings : [medicine])].sort((a, b) => {
    const expA = new Date(a.expiryDate || '2099-12-31').getTime();
    const expB = new Date(b.expiryDate || '2099-12-31').getTime();
    return expA - expB;
  });

  return sortedSiblings.map((m, idx) => ({
    id: m.id,
    batchNumber: m.batchNumber || 'DEFAULT',
    expiryDate: m.expiryDate,
    quantity: m.quantity,
    sellingPrice: m.sellingPrice,
    purchasePrice: m.purchasePrice,
    mrp: m.mrp,
    stockStatus: m.stockStatus || 'Available',
    rackLocation: m.rackLocation || m.shelfLocation,
    isSoonestExpiry: idx === 0
  }));
}

/**
 * Full Product & Batch Lifecycle Traceability
 * Computes complete audit trail from Supplier -> PO -> Warehouse -> Sale -> Customer -> Return
 */
export interface BatchTraceabilityReport {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  stockStatus: StockStatus;
  totalReceived: number;
  totalSold: number;
  totalReturned: number;
  currentStock: number;
  suppliers: Array<{
    supplierName: string;
    poNumber: string;
    date: string;
    quantity: number;
    purchasePrice: number;
  }>;
  sales: Array<{
    invoiceNumber: string;
    customerName: string;
    customerPhone?: string;
    date: string;
    quantity: number;
    sellingPrice: number;
    isWarranty: boolean;
  }>;
  returns: Array<{
    invoiceNumber: string;
    customerName: string;
    date: string;
    quantity: number;
    reason?: string;
  }>;
}

export function generateBatchTraceability(
  medicine: Medicine,
  targetBatch: string,
  invoices: Invoice[],
  purchaseOrders: PurchaseOrder[],
  suppliers: Supplier[]
): BatchTraceabilityReport {
  const batch = targetBatch || medicine.batchNumber || 'DEFAULT';

  // 1. Trace purchases
  const supplierPurchases: BatchTraceabilityReport['suppliers'] = [];
  let totalReceived = 0;

  purchaseOrders.forEach(po => {
    po.items.forEach(item => {
      const isMatch = (item.medicineId === medicine.id || item.name.toLowerCase() === medicine.name.toLowerCase()) &&
        (!item.batchNumber || item.batchNumber.toLowerCase() === batch.toLowerCase());
      if (isMatch) {
        const qty = item.quantity + (item.freeQuantity || 0);
        totalReceived += qty;
        supplierPurchases.push({
          supplierName: po.supplierName || po.partyName || 'Direct Purchase',
          poNumber: po.poNumber || po.billNumber || po.id,
          date: po.date,
          quantity: qty,
          purchasePrice: item.purchasePrice || 0
        });
      }
    });
  });

  // If no PO found but medicine has initial stock, treat as opening stock
  if (supplierPurchases.length === 0 && medicine.quantity > 0) {
    totalReceived = medicine.quantity;
    supplierPurchases.push({
      supplierName: medicine.manufacturer || 'Opening Stock',
      poNumber: 'INIT-STOCK',
      date: medicine.createdAt ? medicine.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      quantity: medicine.quantity,
      purchasePrice: medicine.purchasePrice
    });
  }

  // 2. Trace sales & customers
  const salesHistory: BatchTraceabilityReport['sales'] = [];
  const returnsHistory: BatchTraceabilityReport['returns'] = [];
  let totalSold = 0;
  let totalReturned = 0;

  invoices.forEach(inv => {
    inv.items.forEach(item => {
      const isMatch = (item.medicineId === medicine.id || item.name.toLowerCase() === medicine.name.toLowerCase()) &&
        (!item.batchNumber || item.batchNumber.toLowerCase() === batch.toLowerCase());

      if (isMatch) {
        if (inv.transactionType === 'Sale Return') {
          totalReturned += item.quantity;
          returnsHistory.push({
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || 'Counter Customer',
            date: inv.date,
            quantity: item.quantity,
            reason: inv.returnReason || inv.description
          });
        } else {
          totalSold += item.quantity;
          salesHistory.push({
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName || 'Walk-in Customer',
            customerPhone: inv.customerPhone,
            date: inv.date,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            isWarranty: !!inv.isWarrantyBill
          });
        }
      }
    });
  });

  return {
    medicineId: medicine.id,
    medicineName: medicine.name,
    batchNumber: batch,
    expiryDate: medicine.expiryDate,
    stockStatus: medicine.stockStatus || 'Available',
    totalReceived,
    totalSold,
    totalReturned,
    currentStock: medicine.quantity,
    suppliers: supplierPurchases,
    sales: salesHistory,
    returns: returnsHistory
  };
}

/**
 * Demand Forecasting & Reorder Engine
 * Analyzes past sales history to calculate daily sales velocity and recommend stock reorders.
 */
export function calculateDemandForecasts(
  medicines: Medicine[],
  invoices: Invoice[],
  analysisDays: number = 30
): DemandForecast[] {
  const now = Date.now();
  const thresholdTime = now - analysisDays * 24 * 60 * 60 * 1000;

  // Aggregate quantity sold per medicine in the period
  const salesMap = new Map<string, number>();

  invoices.forEach(inv => {
    const invTime = new Date(inv.date).getTime();
    if (invTime >= thresholdTime && inv.transactionType !== 'Sale Return') {
      inv.items.forEach(item => {
        const key = item.medicineId || item.name.toLowerCase().trim();
        salesMap.set(key, (salesMap.get(key) || 0) + item.quantity);
      });
    }
  });

  return medicines.map(med => {
    const key = med.id;
    const nameKey = med.name.toLowerCase().trim();
    const totalSold = (salesMap.get(key) || 0) + (salesMap.get(nameKey) || 0);
    const avgDailySales = Number((totalSold / analysisDays).toFixed(2));

    const currentStock = med.quantity || 0;
    const minStock = med.minStock || med.lowStockThreshold || 10;
    const leadTimeDays = med.leadTimeDays || 4; // default 4 days supplier lead time

    let estimatedStockoutDays = 999;
    if (avgDailySales > 0) {
      estimatedStockoutDays = Math.max(0, Math.round(currentStock / avgDailySales));
    } else if (currentStock <= 0) {
      estimatedStockoutDays = 0;
    }

    // Suggested reorder quantity = (Lead time + 14 days safety stock) * avg daily - current stock
    const targetBufferDays = 18;
    const targetStock = Math.max(minStock * 2, Math.ceil(avgDailySales * targetBufferDays));
    const rawSuggested = targetStock - currentStock;
    const suggestedReorderQty = Math.max(0, Math.ceil(rawSuggested / 10) * 10); // round to nearest 10

    let reorderUrgency: DemandForecast['reorderUrgency'] = 'OPTIMAL';
    if (currentStock <= 0 || estimatedStockoutDays <= 2) {
      reorderUrgency = 'CRITICAL';
    } else if (currentStock <= minStock || estimatedStockoutDays <= leadTimeDays + 2) {
      reorderUrgency = 'WARNING';
    } else if (currentStock > targetStock * 2.5 && avgDailySales < 0.2) {
      reorderUrgency = 'OVERSTOCKED';
    }

    return {
      medicineId: med.id,
      medicineName: med.name,
      currentStock,
      avgDailySales,
      estimatedStockoutDays,
      suggestedReorderQty: suggestedReorderQty || (currentStock < minStock ? minStock * 2 : 0),
      reorderUrgency,
      supplierName: med.manufacturer
    };
  });
}

/**
 * Expiry Risk Analytics Engine
 * Categorizes inventory into 4 standard risk buckets (Expired, <30d, <60d, <90d)
 */
export function calculateExpiryAnalytics(medicines: Medicine[]) {
  const now = new Date();
  const todayMs = now.getTime();
  const day30Ms = todayMs + 30 * 24 * 60 * 60 * 1000;
  const day60Ms = todayMs + 60 * 24 * 60 * 60 * 1000;
  const day90Ms = todayMs + 90 * 24 * 60 * 60 * 1000;
  const day180Ms = todayMs + 180 * 24 * 60 * 60 * 1000;

  const expired: Medicine[] = [];
  const in30Days: Medicine[] = [];
  const in60Days: Medicine[] = [];
  const in90Days: Medicine[] = [];
  const in180Days: Medicine[] = [];

  medicines.forEach(m => {
    if (!m.expiryDate) return;
    const expMs = new Date(m.expiryDate).getTime();
    if (expMs <= todayMs) {
      expired.push(m);
    } else if (expMs <= day30Ms) {
      in30Days.push(m);
    } else if (expMs <= day60Ms) {
      in60Days.push(m);
    } else if (expMs <= day90Ms) {
      in90Days.push(m);
    } else if (expMs <= day180Ms) {
      in180Days.push(m);
    }
  });

  const getMetrics = (items: Medicine[]) => {
    const totalQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const costValue = items.reduce((acc, i) => acc + (i.quantity || 0) * (i.purchasePrice || 0), 0);
    const mrpValue = items.reduce((acc, i) => acc + (i.quantity || 0) * (i.mrp || i.sellingPrice || 0), 0);
    return { count: items.length, totalQty, costValue, mrpValue, items };
  };

  return {
    expired: getMetrics(expired),
    in30Days: getMetrics(in30Days),
    in60Days: getMetrics(in60Days),
    in90Days: getMetrics(in90Days),
    in180Days: getMetrics(in180Days),
    in6Months: getMetrics(in180Days),
    totalAtRiskCost: getMetrics([...expired, ...in30Days, ...in60Days]).costValue
  };
}

/**
 * Supplier Intelligence Scorecard Builder
 */
export function calculateSupplierScorecards(
  suppliers: Supplier[],
  purchaseOrders: PurchaseOrder[]
): SupplierScorecard[] {
  return suppliers.map(sup => {
    const pos = purchaseOrders.filter(p => p.supplierId === sup.id || p.partyName?.toLowerCase() === sup.name.toLowerCase());
    const totalPurchasesAmount = pos.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
    const totalOrdersCount = pos.length;

    // Last purchase info
    const sortedPos = [...pos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastPurchaseDate = sortedPos[0]?.date;
    const lastPurchasePrice = sortedPos[0]?.items?.[0]?.purchasePrice;

    // Rating based on order fulfillment
    const completedCount = pos.filter(p => p.status === 'Completed' || p.status === 'Paid').length;
    const onTimeDeliveryRate = totalOrdersCount > 0 ? Math.round((completedCount / totalOrdersCount) * 100) : 95;

    return {
      supplierId: sup.id,
      supplierName: sup.name,
      totalPurchasesAmount,
      totalOrdersCount,
      avgDeliveryDays: 3,
      onTimeDeliveryRate,
      returnsCount: 0,
      damagedGoodsCount: 0,
      lastPurchaseDate,
      lastPurchasePrice,
      ratingScore: Number((Math.min(5, (onTimeDeliveryRate / 100) * 5)).toFixed(1))
    };
  });
}
