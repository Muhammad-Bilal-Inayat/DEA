import { v4 as uuidv4 } from 'uuid';
import { 
  QuickTransaction, 
  QuickTransactionLineItem, 
  QuickTransactionType, 
  DashboardSummarySyncMetrics,
  Medicine,
  UserRole
} from '../types';
import { dbMedicines } from './db';
import { saveRecordToFirestore, fetchCollectionFromFirestore } from './firebase';

const QUICK_TXN_STORAGE_KEY = 'mbi_quick_private_transactions_v2';
const DASHBOARD_METRICS_KEY = 'mbi_dashboard_summary_metrics_v2';

/**
 * Retrieve all local quick transactions (filtered by tenant & firm if provided)
 */
export function getStoredQuickTransactions(tenantId?: string, firmId?: string): QuickTransaction[] {
  try {
    const raw = localStorage.getItem(QUICK_TXN_STORAGE_KEY);
    if (raw) {
      const parsed: QuickTransaction[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(t => {
          if (tenantId && t.tenantId && t.tenantId !== tenantId) return false;
          if (firmId && t.firmId && t.firmId !== firmId) return false;
          return true;
        });
      }
    }
  } catch (e) {
    console.error('Failed to parse quick transactions:', e);
  }
  return [];
}

/**
 * Save and execute a Quick Private Transaction
 */
export async function saveQuickTransaction(
  txnData: Omit<QuickTransaction, 'id' | 'createdAt' | 'updatedAt' | 'isSynced' | 'timestamp'>,
  options?: {
    updateStock?: boolean;
  }
): Promise<QuickTransaction> {
  const allTxns = getStoredQuickTransactions();
  const id = 'qtx_' + Date.now() + '_' + uuidv4().substring(0, 6);
  const now = new Date().toISOString();

  const newTxn: QuickTransaction = {
    ...txnData,
    id,
    timestamp: Date.now(),
    isSynced: false,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Stock / Inventory Adjustment if requested and not draft
  if (options?.updateStock !== false && newTxn.status === 'Posted') {
    try {
      const allMeds = await dbMedicines.getAll();
      for (const item of newTxn.items) {
        if (!item.name) continue;
        const matched = allMeds.find(m => 
          (item.medicineId && m.id === item.medicineId) ||
          (item.barcode && m.barcode === item.barcode) ||
          m.name.toLowerCase() === item.name.toLowerCase()
        );

        if (matched) {
          let currentQty = matched.quantity || 0;
          if (newTxn.type === 'Sale' || newTxn.type === 'Purchase Return') {
            currentQty = Math.max(0, currentQty - item.quantity);
          } else if (newTxn.type === 'Purchase' || newTxn.type === 'Sale Return') {
            currentQty += item.quantity;
          } else if (newTxn.type === 'Stock Adjustment') {
            // If negative adjustment or damage
            if (item.adjustmentReason === 'Damage' || item.adjustmentReason === 'Breakage' || item.adjustmentReason === 'Expired') {
              currentQty = Math.max(0, currentQty - item.quantity);
            } else {
              currentQty = Math.max(0, item.quantity);
            }
          }

          const updatedMed: Medicine = {
            ...matched,
            quantity: currentQty,
            purchasePrice: item.purchaseRate > 0 ? item.purchaseRate : matched.purchasePrice,
            sellingPrice: item.saleRate > 0 ? item.saleRate : matched.sellingPrice,
            updatedAt: now
          };
          await dbMedicines.save(updatedMed);
        }
      }
    } catch (stockErr) {
      console.warn('Stock update notice during quick transaction:', stockErr);
    }
  }

  // 2. Save locally in client storage
  allTxns.unshift(newTxn);
  localStorage.setItem(QUICK_TXN_STORAGE_KEY, JSON.stringify(allTxns));

  // 3. Compute and store approved aggregate summary metrics for Dashboard
  syncDashboardSummaryMetrics(newTxn.tenantId, newTxn.firmId);

  // 4. Cloud Firestore Save (Isolated tenant path)
  if (navigator.onLine && newTxn.tenantId) {
    const firmPath = newTxn.firmId || 'default';
    saveRecordToFirestore(
      `tenants/${newTxn.tenantId}/firms/${firmPath}/quickTransactions`,
      newTxn.id,
      newTxn
    ).then(() => {
      newTxn.isSynced = true;
      const updated = allTxns.map(t => t.id === newTxn.id ? { ...t, isSynced: true } : t);
      localStorage.setItem(QUICK_TXN_STORAGE_KEY, JSON.stringify(updated));
    }).catch(err => {
      console.warn('Cloud quick transaction backup pending:', err);
    });
  }

  // Dispatch global event so UI reacts
  window.dispatchEvent(new CustomEvent('quick-transaction-saved', { detail: newTxn }));

  return newTxn;
}

/**
 * Recomputes aggregate summary metrics from transactions and updates Dashboard summary.
 * IMPORTANT: This aggregates ONLY numbers (Total Sales, Purchases, Returns, Profits)
 * and never exposes individual item names to the Dashboard.
 */
export function syncDashboardSummaryMetrics(tenantId?: string, firmId?: string): DashboardSummarySyncMetrics {
  const transactions = getStoredQuickTransactions(tenantId, firmId);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let totalSales = 0;
  let totalPurchases = 0;
  let totalSalesReturns = 0;
  let totalPurchaseReturns = 0;
  let grossProfit = 0;
  let todaySales = 0;
  let todayPurchases = 0;
  let todayProfit = 0;

  for (const txn of transactions) {
    if (txn.status !== 'Posted') continue;

    const isToday = txn.date === todayStr || txn.createdAt.startsWith(todayStr);
    const amount = Number(txn.grandTotal) || 0;
    const profit = Number(txn.grossProfit) || 0;

    switch (txn.type) {
      case 'Sale':
        totalSales += amount;
        grossProfit += profit;
        if (isToday) {
          todaySales += amount;
          todayProfit += profit;
        }
        break;

      case 'Purchase':
        totalPurchases += amount;
        if (isToday) todayPurchases += amount;
        break;

      case 'Sale Return':
        totalSalesReturns += amount;
        grossProfit -= profit;
        if (isToday) {
          todaySales -= amount;
          todayProfit -= profit;
        }
        break;

      case 'Purchase Return':
        totalPurchaseReturns += amount;
        if (isToday) todayPurchases -= amount;
        break;

      case 'Stock Adjustment':
        // Stock adjustments do not alter sales directly
        break;
    }
  }

  const netSales = Math.max(0, totalSales - totalSalesReturns);
  const netPurchases = Math.max(0, totalPurchases - totalPurchaseReturns);
  const netProfit = grossProfit; // Net before overheads

  const summaryMetrics: DashboardSummarySyncMetrics = {
    totalSales,
    totalPurchases,
    totalSalesReturns,
    totalPurchaseReturns,
    netSales,
    netPurchases,
    grossProfit,
    netProfit,
    todaySales: Math.max(0, todaySales),
    todayPurchases: Math.max(0, todayPurchases),
    todayProfit,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(DASHBOARD_METRICS_KEY, JSON.stringify(summaryMetrics));
  window.dispatchEvent(new CustomEvent('dashboard-metrics-updated', { detail: summaryMetrics }));

  return summaryMetrics;
}

/**
 * Retrieve current cached Dashboard Summary Metrics
 */
export function getDashboardSummaryMetrics(): DashboardSummarySyncMetrics {
  try {
    const raw = localStorage.getItem(DASHBOARD_METRICS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}

  return syncDashboardSummaryMetrics();
}
