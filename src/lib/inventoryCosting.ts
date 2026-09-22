import { PurchaseOrder, Invoice, PurchaseBillItem, Medicine } from '../types';

/**
 * Retrieve the single most authoritative Latest Purchase Price for an item.
 * Searches:
 * 1. Latest recorded purchase bill item for this medicine (sorted by newest bill date)
 * 2. Medicine's latest batch purchase price
 * 3. Medicine's latestPurchasePrice / purchasePrice field
 */
export function getAuthoritativeLatestPurchasePrice(
  medicine?: Medicine | null,
  purchaseOrders?: PurchaseOrder[],
  overrideName?: string
): number {
  const nameToMatch = (overrideName || medicine?.name || '').trim().toLowerCase();
  const medId = medicine?.id;

  // 1. Search purchase orders sorted by newest date/timestamp first
  if (purchaseOrders && purchaseOrders.length > 0) {
    const validPurchases = [...purchaseOrders].sort((a, b) => {
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    for (const po of validPurchases) {
      if (po.transactionType === 'Purchase Return' || !po.items) continue;
      for (const item of po.items) {
        const matchesId = medId && item.medicineId === medId;
        const matchesName = nameToMatch && item.name && item.name.trim().toLowerCase() === nameToMatch;
        const price = Number(item.purchasePrice) || 0;
        if ((matchesId || matchesName) && price > 0) {
          return price;
        }
      }
    }
  }

  // 2. Check medicine's latest batches
  if (medicine?.batches && Array.isArray(medicine.batches) && medicine.batches.length > 0) {
    const sortedBatches = [...medicine.batches].sort((a, b) => {
      const timeA = new Date(a.purchaseDate || a.receivedDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.purchaseDate || b.receivedDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    for (const b of sortedBatches) {
      if (b.purchasePrice && Number(b.purchasePrice) > 0) {
        return Number(b.purchasePrice);
      }
    }
  }

  // 3. Check medicine latestPurchasePrice or purchasePrice
  if ((medicine as any)?.latestPurchasePrice && Number((medicine as any).latestPurchasePrice) > 0) {
    return Number((medicine as any).latestPurchasePrice);
  }
  if (medicine?.purchasePrice && Number(medicine.purchasePrice) > 0) {
    return Number(medicine.purchasePrice);
  }

  return 0;
}

export interface RecentRateDetail {
  price: number;
  date: string;
  partyName: string;
  companyName: string;
  docNumber?: string;
  quantity?: number;
  unit?: string;
  batchNumber?: string;
}

export function getDetailedRecentPurchaseRates(
  medicineId: string,
  medicineName: string,
  purchaseOrders: PurchaseOrder[],
  defaultCompany: string = ''
): RecentRateDetail[] {
  const entries: RecentRateDetail[] = [];
  const qName = medicineName ? medicineName.toLowerCase().trim() : '';

  for (const po of purchaseOrders) {
    if (!po.items || !Array.isArray(po.items)) continue;
    for (const item of po.items) {
      const matchId = medicineId && item.medicineId === medicineId;
      const matchName = qName && item.name && item.name.toLowerCase().trim() === qName;
      const price = Number(item.purchasePrice) || 0;
      if ((matchId || matchName) && price > 0) {
        entries.push({
          price,
          date: po.date || po.createdAt || '',
          partyName: po.supplierName || po.partyName || 'Supplier',
          companyName: (item as any).company || (item as any).manufacturer || defaultCompany || '',
          docNumber: po.billNumber || po.poNumber || po.orderNumber,
          quantity: item.quantity,
          unit: item.unit,
          batchNumber: item.batchNumber
        });
      }
    }
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  // Return up to 5 entries
  return entries.slice(0, 5);
}

export function getDetailedRecentSaleRates(
  medicineId: string,
  medicineName: string,
  invoices: Invoice[],
  defaultCompany: string = ''
): RecentRateDetail[] {
  const entries: RecentRateDetail[] = [];
  const qName = medicineName ? medicineName.toLowerCase().trim() : '';

  for (const inv of invoices) {
    if (!inv.items || !Array.isArray(inv.items) || inv.transactionType === 'Sale Return') continue;
    for (const item of inv.items) {
      const matchId = medicineId && item.medicineId === medicineId;
      const matchName = qName && item.name && item.name.toLowerCase().trim() === qName;
      const unitPrice = Number(item.sellingPrice !== undefined ? item.sellingPrice : item.pricePerUnit) || 0;
      if ((matchId || matchName) && unitPrice > 0) {
        entries.push({
          price: unitPrice,
          date: inv.date || inv.createdAt || '',
          partyName: inv.customerName || inv.billingName || (inv as any).partyName || 'Customer',
          companyName: (item as any).company || (item as any).manufacturer || defaultCompany || '',
          docNumber: inv.invoiceNumber,
          quantity: item.quantity,
          unit: item.unit,
          batchNumber: item.batchNumber
        });
      }
    }
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  // Return up to 5 entries
  return entries.slice(0, 5);
}

export function getRecentPurchasePrices(medicineId: string, medicineName: string, purchaseOrders: PurchaseOrder[]): number[] {
  const prices: { date: string; price: number }[] = [];
  
  for (const po of purchaseOrders) {
    if (!po.items) continue;
    for (const item of po.items) {
      const matchId = medicineId && item.medicineId === medicineId;
      const matchName = medicineName && item.name.toLowerCase().trim() === medicineName.toLowerCase().trim();
      if ((matchId || matchName) && item.purchasePrice > 0) {
        prices.push({
          date: po.date || po.createdAt || '1970-01-01',
          price: Number(item.purchasePrice)
        });
      }
    }
  }

  // Sort newest first
  prices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get distinct prices, limit to 5
  const distinctPrices: number[] = [];
  for (const p of prices) {
    if (!distinctPrices.includes(p.price)) {
      distinctPrices.push(p.price);
    }
    if (distinctPrices.length >= 5) break;
  }

  return distinctPrices;
}

export function getRecentSalePrices(medicineId: string, medicineName: string, invoices: Invoice[]): number[] {
  const prices: { date: string; price: number }[] = [];
  
  for (const inv of invoices) {
    if (!inv.items || inv.transactionType === 'Sale Return') continue;
    for (const item of inv.items) {
      const matchId = medicineId && item.medicineId === medicineId;
      const matchName = medicineName && item.name.toLowerCase().trim() === medicineName.toLowerCase().trim();
      const unitPrice = item.sellingPrice || item.pricePerUnit || 0;
      if ((matchId || matchName) && unitPrice > 0) {
        prices.push({
          date: inv.date || inv.createdAt || '1970-01-01',
          price: Number(unitPrice)
        });
      }
    }
  }

  // Sort newest first
  prices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Get distinct prices, limit to 5
  const distinctPrices: number[] = [];
  for (const p of prices) {
    if (!distinctPrices.includes(p.price)) {
      distinctPrices.push(p.price);
    }
    if (distinctPrices.length >= 5) break;
  }

  return distinctPrices;
}

export interface AdditionalExpenses {
  transport: number;
  shipping: number;
  handling: number;
  loading: number;
  unloading: number;
  delivery: number;
  other: number;
}

export function calculateProportionalExpenses(
  items: PurchaseBillItem[],
  expenses: AdditionalExpenses
): { adjustedItems: (PurchaseBillItem & { allocatedExpensePerUnit?: number; adjustedUnitCost?: number })[]; totalAdditional: number } {
  const totalAdditional = Object.values(expenses).reduce((acc, val) => acc + (Number(val) || 0), 0);
  
  const baseValues = items.map(item => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.purchasePrice) || 0;
    return qty * price;
  });

  const totalBaseValue = baseValues.reduce((acc, val) => acc + val, 0);

  let allocatedSum = 0;
  const adjustedItems = items.map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.purchasePrice) || 0;
    const baseVal = baseValues[index];

    let itemExpenseShare = 0;
    if (totalBaseValue > 0 && totalAdditional > 0) {
      itemExpenseShare = (baseVal / totalBaseValue) * totalAdditional;
    }

    // Handle last item rounding reconciliation
    if (index === items.length - 1 && totalAdditional > 0) {
      itemExpenseShare = totalAdditional - allocatedSum;
    } else {
      allocatedSum += itemExpenseShare;
    }

    const allocatedExpensePerUnit = qty > 0 ? itemExpenseShare / qty : 0;
    const adjustedUnitCost = price + allocatedExpensePerUnit;

    return {
      ...item,
      allocatedExpensePerUnit: Number(allocatedExpensePerUnit.toFixed(2)),
      adjustedUnitCost: Number(adjustedUnitCost.toFixed(2))
    };
  });

  return {
    adjustedItems,
    totalAdditional: Number(totalAdditional.toFixed(2))
  };
}

export function calculateWeightedAverageCost(
  existingQty: number,
  existingAvgCost: number,
  newQty: number,
  newAdjustedUnitCost: number
): number {
  const extQty = Math.max(0, Number(existingQty) || 0);
  const extCost = Math.max(0, Number(existingAvgCost) || 0);
  const nQty = Math.max(0, Number(newQty) || 0);
  const nCost = Math.max(0, Number(newAdjustedUnitCost) || 0);

  const totalQty = extQty + nQty;
  if (totalQty <= 0) return nCost;

  const weightedAvg = (extQty * extCost + nQty * nCost) / totalQty;
  return Number(weightedAvg.toFixed(2));
}

export function calculateCostChangePercentage(previousPrice: number, newPrice: number): { percent: number; type: 'increase' | 'decrease' | 'equal' } {
  const prev = Number(previousPrice) || 0;
  const curr = Number(newPrice) || 0;
  if (prev <= 0 || prev === curr) return { percent: 0, type: 'equal' };

  const diff = curr - prev;
  const percent = Number(((Math.abs(diff) / prev) * 100).toFixed(2));

  return {
    percent,
    type: diff > 0 ? 'increase' : 'decrease'
  };
}
