import { CashierShift, ShiftCashMovement, Invoice, Expense } from '../types';
import { dbCashierShifts, dbInvoices, dbExpenses } from './db';

export const PAK_DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

/**
 * Calculates live shift metrics from invoices and expenses within shift timeframe
 */
export async function calculateLiveShiftMetrics(shift: CashierShift): Promise<CashierShift> {
  const [allInvoices, allExpenses] = await Promise.all([
    dbInvoices.getAll(),
    dbExpenses.getAll(),
  ]);

  const startTime = new Date(shift.startTime).getTime();
  const endTime = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

  // Filter invoices for this shift period
  const shiftInvoices = (allInvoices || []).filter((inv: any) => {
    const invTime = new Date(inv.date || inv.createdAt || 0).getTime();
    const isWithinTime = invTime >= startTime && invTime <= endTime;
    // Match by cashier if cashierId is specified or match timeframe
    return isWithinTime;
  });

  let cashSales = 0;
  let cardSales = 0;
  let bankSales = 0;
  let creditSales = 0;
  let totalSales = 0;
  let cashReturns = 0;
  let otherReturns = 0;
  let totalReturns = 0;
  let invoicesCount = 0;
  let returnsCount = 0;

  shiftInvoices.forEach((inv: any) => {
    const isReturn = inv.transactionType === 'Sale Return' || inv.invoiceType === 'Sale Return' || inv.isReturn;
    const paymentType = (inv.paymentType || inv.paymentMethod || 'Cash').toLowerCase();
    const amount = Number(inv.grandTotal || inv.totalAmount || inv.paidAmount || 0) || 0;
    const paidAmount = Number(inv.paidAmount ?? inv.grandTotal ?? 0) || 0;

    if (isReturn) {
      returnsCount++;
      totalReturns += amount;
      if (paymentType.includes('cash')) {
        cashReturns += paidAmount || amount;
      } else {
        otherReturns += paidAmount || amount;
      }
    } else {
      invoicesCount++;
      totalSales += amount;
      if (paymentType.includes('cash')) {
        cashSales += paidAmount || amount;
      } else if (paymentType.includes('card') || paymentType.includes('credit card') || paymentType.includes('debit')) {
        cardSales += paidAmount || amount;
      } else if (paymentType.includes('bank') || paymentType.includes('transfer') || paymentType.includes('raast') || paymentType.includes('online')) {
        bankSales += paidAmount || amount;
      } else {
        creditSales += Math.max(0, amount - paidAmount);
        if (paidAmount > 0) {
          cashSales += paidAmount;
        }
      }
    }
  });

  // Calculate Cash Expenses paid during shift
  const shiftExpenses = (allExpenses || []).filter((exp: any) => {
    const expTime = new Date(exp.date || exp.createdAt || 0).getTime();
    const isCash = (exp.paymentType || exp.paymentMethod || 'Cash').toLowerCase().includes('cash');
    return expTime >= startTime && expTime <= endTime && isCash;
  });

  const directExpensesPaid = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Cash movements (Cash In, Cash Out, Safe Drop, Expense Payout)
  let cashIn = 0;
  let cashOut = 0;
  let movementsExpenses = 0;

  (shift.movements || []).forEach((m) => {
    const amt = Number(m.amount) || 0;
    if (m.type === 'CASH_IN') {
      cashIn += amt;
    } else if (m.type === 'CASH_OUT' || m.type === 'SAFE_DROP') {
      cashOut += amt;
    } else if (m.type === 'EXPENSE_PAYOUT') {
      movementsExpenses += amt;
    }
  });

  const totalExpensesPaid = directExpensesPaid + movementsExpenses;

  // Expected Cash = Opening Cash + Cash Sales + Cash In - Cash Out - Expenses Paid - Cash Returns
  const expectedCash = (Number(shift.openingBalance) || 0) + cashSales + cashIn - cashOut - totalExpensesPaid - cashReturns;

  const discrepancy = shift.closingCashActual !== undefined 
    ? (Number(shift.closingCashActual) - expectedCash) 
    : undefined;

  return {
    ...shift,
    cashSales,
    cardSales,
    bankSales,
    creditSales,
    totalSales,
    invoicesCount,
    cashReturns,
    otherReturns,
    totalReturns,
    returnsCount,
    cashIn,
    cashOut,
    expensesPaid: totalExpensesPaid,
    expectedCash: Math.round(expectedCash * 100) / 100,
    discrepancy: discrepancy !== undefined ? Math.round(discrepancy * 100) / 100 : undefined,
  };
}

/**
 * Generate a sequential shift number
 */
export async function generateShiftNumber(): Promise<string> {
  const shifts = await dbCashierShifts.getAll();
  const year = new Date().getFullYear();
  const count = (shifts?.length || 0) + 1;
  return `SHF-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Opens a new cashier shift
 */
export async function startNewShift(params: {
  cashierId: string;
  cashierName: string;
  registerName?: string;
  openingBalance: number;
  openingNotes?: string;
  openingDenominations?: Record<string, number>;
}): Promise<CashierShift> {
  const shiftNumber = await generateShiftNumber();
  const newShift: CashierShift = {
    id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    shiftNumber,
    registerName: params.registerName || 'Main Counter POS 1',
    cashierId: params.cashierId,
    cashierName: params.cashierName,
    startTime: new Date().toISOString(),
    status: 'OPEN',
    openingCash: Number(params.openingBalance) || 0,
    openingBalance: Number(params.openingBalance) || 0,
    openingNotes: params.openingNotes || '',
    openingDenominations: params.openingDenominations || {},
    cashSales: 0,
    cardSales: 0,
    bankSales: 0,
    creditSales: 0,
    totalSales: 0,
    invoicesCount: 0,
    cashReturns: 0,
    otherReturns: 0,
    totalReturns: 0,
    returnsCount: 0,
    cashIn: 0,
    cashOut: 0,
    expensesPaid: 0,
    movements: [],
    expectedCash: Number(params.openingBalance) || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await dbCashierShifts.save(newShift);
  return saved;
}

/**
 * Records Cash In, Cash Out, Safe Drop or Register Expense
 */
export async function addShiftMovement(
  shiftId: string, 
  movement: Omit<ShiftCashMovement, 'id' | 'timestamp'>
): Promise<CashierShift> {
  const shift = await dbCashierShifts.getById(shiftId);
  if (!shift) throw new Error('Shift not found');
  if (shift.status !== 'OPEN') throw new Error('Cannot modify a closed shift');

  const newMovement: ShiftCashMovement = {
    ...movement,
    id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
  };

  const updatedMovements = [...(shift.movements || []), newMovement];
  const updatedShift: CashierShift = {
    ...shift,
    movements: updatedMovements,
    updatedAt: new Date().toISOString(),
  };

  const calculated = await calculateLiveShiftMetrics(updatedShift);
  const saved = await dbCashierShifts.save(calculated);
  return saved;
}

/**
 * Closes the shift and calculates discrepancy
 */
export async function closeCashierShift(params: {
  shiftId: string;
  closingCashActual: number;
  closingDenominations?: Record<string, number>;
  discrepancyReason?: string;
  closingNotes?: string;
  closedBy: string;
  approvedBy?: string;
}): Promise<CashierShift> {
  const shift = await dbCashierShifts.getById(params.shiftId);
  if (!shift) throw new Error('Shift not found');

  const shiftWithEnd: CashierShift = {
    ...shift,
    endTime: new Date().toISOString(),
    status: 'CLOSED',
    closingCashActual: Number(params.closingCashActual) || 0,
    closingDenominations: params.closingDenominations || {},
    discrepancyReason: params.discrepancyReason || '',
    closingNotes: params.closingNotes || '',
    closedBy: params.closedBy,
    approvedBy: params.approvedBy || '',
    updatedAt: new Date().toISOString(),
  };

  const finalized = await calculateLiveShiftMetrics(shiftWithEnd);
  const saved = await dbCashierShifts.save(finalized);
  return saved;
}
