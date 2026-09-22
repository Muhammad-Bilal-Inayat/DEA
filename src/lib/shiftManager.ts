import { CashierShift, Invoice, Expense, PartyPayment, CashierShiftDenominations } from '../types';

export interface ShiftFinancialSummary {
  shiftId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  bankSales: number;
  creditSales: number;
  totalSales: number;
  invoicesCount: number;
  cashIn: number; // Customer payments / recoveries in cash
  cashOut: number; // Sale returns in cash
  expensesTotal: number; // Direct cash expenses
  cashDropsTotal: number; // Safe drops
  expectedCash: number;
  actualCash: number;
  variance: number;
  varianceStatus: 'BALANCED' | 'OVERAGE' | 'SHORTAGE';
  shiftInvoices: Invoice[];
  shiftExpenses: Expense[];
  shiftPartyPayments: PartyPayment[];
}

export function sumDenominations(denoms?: CashierShiftDenominations): number {
  if (!denoms) return 0;
  return (
    (denoms.n5000 || 0) * 5000 +
    (denoms.n1000 || 0) * 1000 +
    (denoms.n500 || 0) * 500 +
    (denoms.n100 || 0) * 100 +
    (denoms.n50 || 0) * 50 +
    (denoms.n20 || 0) * 20 +
    (denoms.n10 || 0) * 10 +
    (denoms.coins || 0)
  );
}

export function calculateShiftFinancials(
  shift: CashierShift,
  invoices: Invoice[],
  expenses: Expense[] = [],
  partyPayments: PartyPayment[] = []
): ShiftFinancialSummary {
  const shiftStart = new Date(shift.startTime).getTime();
  const shiftEnd = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

  // 1. Filter Invoices within Shift Timeframe
  const shiftInvoices = invoices.filter(inv => {
    const invTime = new Date(inv.date || inv.createdAt || 0).getTime();
    return invTime >= shiftStart && invTime <= shiftEnd;
  });

  // 2. Compute Sales by Payment Method
  let cashSales = 0;
  let cardSales = 0;
  let bankSales = 0;
  let creditSales = 0;
  let cashOut = 0; // Return refunds in cash

  shiftInvoices.forEach(inv => {
    const isReturn = inv.transactionType === 'Sale Return';
    const amount = inv.receivedAmount !== undefined ? inv.receivedAmount : (inv.grandTotal || 0);

    if (isReturn) {
      if (inv.paymentType === 'Cash' || inv.paymentMethod === 'Cash') {
        cashOut += amount;
      }
      return;
    }

    const payType = String(inv.paymentType || inv.paymentMethod || 'Cash');

    if (payType === 'Cash') {
      cashSales += amount;
    } else if (payType === 'Card' || payType.includes('Card')) {
      cardSales += amount;
    } else if (payType === 'Bank Transfer' || payType === 'Online' || payType === 'UPI' || payType === 'Bank') {
      bankSales += amount;
    } else if (payType === 'Credit' || payType.includes('Credit')) {
      creditSales += (inv.balanceDue || inv.grandTotal || 0);
      if (inv.receivedAmount && inv.receivedAmount > 0) {
        cashSales += inv.receivedAmount;
      }
    } else {
      cashSales += amount;
    }
  });

  const totalSales = cashSales + cardSales + bankSales + creditSales;

  // 3. Filter Expenses paid in Cash within Shift
  const shiftExpenses = expenses.filter(exp => {
    const expTime = new Date(exp.date || exp.createdAt || 0).getTime();
    const isCash = !exp.paymentType || exp.paymentType === 'Cash';
    return isCash && expTime >= shiftStart && expTime <= shiftEnd;
  });

  const expensesTotal = shiftExpenses.reduce((sum, e) => sum + (e.paidAmount || e.amount || 0), 0);

  // 4. Filter Cash Recoveries / Payments Received from Customers
  const shiftPartyPayments = partyPayments.filter(pay => {
    const payTime = new Date(pay.date || pay.createdAt || 0).getTime();
    const isCash = pay.paymentMode === 'Cash';
    return isCash && pay.type === 'PAYMENT_IN' && payTime >= shiftStart && payTime <= shiftEnd;
  });

  const cashIn = shiftPartyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashDropsTotal = shift.cashDropsTotal || 0;

  // 5. Expected Cash Formula:
  // Expected = Opening Float + Cash Sales + Cash Recoveries (In) - Cash Returns - Cash Expenses - Cash Drops
  const openingCash = shift.openingCash || 0;
  const expectedCash = openingCash + cashSales + cashIn - cashOut - expensesTotal - cashDropsTotal;
  const actualCash = shift.actualCash !== undefined ? shift.actualCash : expectedCash;
  const variance = actualCash - expectedCash;

  let varianceStatus: 'BALANCED' | 'OVERAGE' | 'SHORTAGE' = 'BALANCED';
  if (variance > 0.5) varianceStatus = 'OVERAGE';
  else if (variance < -0.5) varianceStatus = 'SHORTAGE';

  return {
    shiftId: shift.id,
    cashierName: shift.cashierName,
    startTime: shift.startTime,
    endTime: shift.endTime,
    openingCash,
    cashSales,
    cardSales,
    bankSales,
    creditSales,
    totalSales,
    invoicesCount: shiftInvoices.length,
    cashIn,
    cashOut,
    expensesTotal,
    cashDropsTotal,
    expectedCash,
    actualCash,
    variance,
    varianceStatus,
    shiftInvoices,
    shiftExpenses,
    shiftPartyPayments
  };
}

export function printShiftZReport(
  summary: ShiftFinancialSummary,
  shift: CashierShift,
  businessInfo?: { name?: string; address?: string; phone?: string; taxNumber?: string; drugLicenseNo?: string }
) {
  const printWindow = window.open('', '_blank', 'width=450,height=750');
  if (!printWindow) return;

  const nowFormatted = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const startFormatted = new Date(summary.startTime).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' });
  const endFormatted = summary.endTime ? new Date(summary.endTime).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }) : 'Still Active';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Z-Report Shift Reconciliation #${shift.shiftNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            line-height: 1.35;
            padding: 4px;
            max-width: 78mm;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            font-weight: bold;
            border: 1px solid #000;
            border-radius: 3px;
          }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          th, td { padding: 2px 0; font-size: 11px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="font-bold text-lg">${businessInfo?.name || 'MBI INVENTRA PHARMACY'}</div>
          <div>${businessInfo?.address || 'Main Commercial Market'}</div>
          <div>Tel: ${businessInfo?.phone || '+92 300 1234567'}</div>
          ${businessInfo?.taxNumber ? `<div>NTN/GST: ${businessInfo.taxNumber}</div>` : ''}
          ${businessInfo?.drugLicenseNo ? `<div>D.L. #: ${businessInfo.drugLicenseNo}</div>` : ''}
          <div class="divider"></div>
          <div class="font-bold text-lg">*** END OF SHIFT Z-REPORT ***</div>
          <div>DRAWER CASH RECONCILIATION</div>
        </div>

        <div class="divider"></div>

        <div class="flex">
          <span>Shift Ref:</span>
          <span class="font-bold">#${shift.shiftNumber} (${shift.shiftType || 'General'})</span>
        </div>
        <div class="flex">
          <span>Cashier:</span>
          <span class="font-bold">${shift.cashierName}</span>
        </div>
        <div class="flex">
          <span>Shift Start:</span>
          <span>${startFormatted}</span>
        </div>
        <div class="flex">
          <span>Shift End:</span>
          <span>${endFormatted}</span>
        </div>
        <div class="flex">
          <span>Printed At:</span>
          <span>${nowFormatted}</span>
        </div>

        <div class="divider"></div>
        <div class="font-bold text-center">--- SALES SUMMARY ---</div>

        <div class="flex">
          <span>Cash Sales (${summary.shiftInvoices.filter(i => (i.paymentType || i.paymentMethod) === 'Cash').length} bills):</span>
          <span class="font-bold">Rs. ${summary.cashSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Card / Digital Sales:</span>
          <span>Rs. ${summary.cardSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Bank Transfer / UPI:</span>
          <span>Rs. ${summary.bankSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Credit / Due Sales:</span>
          <span>Rs. ${summary.creditSales.toFixed(2)}</span>
        </div>
        <div class="flex font-bold" style="border-top: 1px dotted #000; margin-top: 2px; padding-top: 2px;">
          <span>GROSS SALES (${summary.invoicesCount} Invoices):</span>
          <span>Rs. ${summary.totalSales.toFixed(2)}</span>
        </div>

        <div class="divider"></div>
        <div class="font-bold text-center">--- CASH DRAWER AUDIT ---</div>

        <div class="flex">
          <span>(+) Opening Float:</span>
          <span>Rs. ${summary.openingCash.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(+) Cash Sales:</span>
          <span>Rs. ${summary.cashSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(+) Customer Recoveries (In):</span>
          <span>Rs. ${summary.cashIn.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(-) Cash Refunds/Returns:</span>
          <span>Rs. ${summary.cashOut.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(-) Shift Cash Expenses:</span>
          <span>Rs. ${summary.expensesTotal.toFixed(2)}</span>
        </div>
        ${summary.cashDropsTotal > 0 ? `
          <div class="flex">
            <span>(-) Safe Drops / Transfer:</span>
            <span>Rs. ${summary.cashDropsTotal.toFixed(2)}</span>
          </div>
        ` : ''}

        <div class="divider"></div>

        <div class="flex font-bold text-lg">
          <span>EXPECTED CASH:</span>
          <span>Rs. ${summary.expectedCash.toFixed(2)}</span>
        </div>
        <div class="flex font-bold text-lg">
          <span>ACTUAL COUNTED CASH:</span>
          <span>Rs. ${summary.actualCash.toFixed(2)}</span>
        </div>

        <div class="double-divider"></div>

        <div class="flex font-bold text-lg" style="padding: 3px 0;">
          <span>CASH VARIANCE:</span>
          <span>${summary.variance > 0 ? '+' : ''}Rs. ${summary.variance.toFixed(2)}</span>
        </div>
        <div class="text-center font-bold" style="margin-top: 2px;">
          STATUS: [ ${summary.varianceStatus} ]
        </div>

        ${shift.differenceReason ? `
          <div style="margin-top: 6px; padding: 4px; border: 1px dashed #000;">
            <strong>Discrepancy Note:</strong> ${shift.differenceReason}
          </div>
        ` : ''}

        ${shift.denominations ? `
          <div class="divider"></div>
          <div class="font-bold text-center">--- PHYSICAL NOTE COUNT ---</div>
          <table>
            <tr><td>5000 x ${shift.denominations.n5000 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n5000 || 0) * 5000).toFixed(0)}</td></tr>
            <tr><td>1000 x ${shift.denominations.n1000 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n1000 || 0) * 1000).toFixed(0)}</td></tr>
            <tr><td>500 x ${shift.denominations.n500 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n500 || 0) * 500).toFixed(0)}</td></tr>
            <tr><td>100 x ${shift.denominations.n100 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n100 || 0) * 100).toFixed(0)}</td></tr>
            <tr><td>50 x ${shift.denominations.n50 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n50 || 0) * 50).toFixed(0)}</td></tr>
            <tr><td>20 x ${shift.denominations.n20 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n20 || 0) * 20).toFixed(0)}</td></tr>
            <tr><td>10 x ${shift.denominations.n10 || 0}</td><td class="text-right">Rs. ${((shift.denominations.n10 || 0) * 10).toFixed(0)}</td></tr>
            <tr><td>Coins</td><td class="text-right">Rs. ${(shift.denominations.coins || 0).toFixed(0)}</td></tr>
          </table>
        ` : ''}

        <div class="double-divider"></div>

        <div style="margin-top: 25px;">
          <div class="flex">
            <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px;">
              Cashier Signature
            </div>
            <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px;">
              Manager / Auditor
            </div>
          </div>
        </div>

        <div class="text-center" style="margin-top: 14px; font-size: 9px;">
          Powered by MBI Inventra POS & ERP
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
