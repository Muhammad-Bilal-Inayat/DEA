import React, { useState, useMemo } from 'react';
import { 
  X, DollarSign, Clock, ShieldCheck, AlertCircle, 
  ArrowUpRight, ArrowDownLeft, CheckCircle2, Lock, 
  Printer, Calculator, Banknote, Sparkles, TrendingUp,
  Receipt, FileText
} from 'lucide-react';
import { CashierShift, Invoice, Expense, PartyPayment, CashierShiftDenominations } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { calculateShiftFinancials, printShiftZReport, sumDenominations } from '../../lib/shiftManager';

interface CashierShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: CashierShift | null;
  cashierName: string;
  invoicesToday: Invoice[];
  expensesToday?: Expense[];
  partyPaymentsToday?: PartyPayment[];
  onOpenShift: (openingCash: number, notes?: string, shiftType?: 'Morning' | 'Evening' | 'Night' | 'General') => void;
  onCloseShift: (
    actualCash: number, 
    diffReason?: string, 
    notes?: string, 
    denominations?: CashierShiftDenominations,
    supervisorName?: string
  ) => void;
}

export const CashierShiftModal: React.FC<CashierShiftModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  cashierName,
  invoicesToday,
  expensesToday = [],
  partyPaymentsToday = [],
  onOpenShift,
  onCloseShift
}) => {
  if (!isOpen) return null;

  const [openingCashInput, setOpeningCashInput] = useState<number>(5000);
  const [shiftType, setShiftType] = useState<'Morning' | 'Evening' | 'Night' | 'General'>('Morning');
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [diffReason, setDiffReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [useDenomCounter, setUseDenomCounter] = useState<boolean>(true);
  const [denoms, setDenoms] = useState<CashierShiftDenominations>({
    n5000: 0,
    n1000: 0,
    n500: 0,
    n100: 0,
    n50: 0,
    n20: 0,
    n10: 0,
    coins: 0
  });

  const [mode, setMode] = useState<'VIEW' | 'OPEN_FORM' | 'CLOSE_FORM'>(
    currentShift && currentShift.status === 'OPEN' ? 'VIEW' : 'OPEN_FORM'
  );

  // Financial calculations
  const financialSummary = useMemo(() => {
    if (!currentShift) {
      return null;
    }
    return calculateShiftFinancials(currentShift, invoicesToday, expensesToday, partyPaymentsToday);
  }, [currentShift, invoicesToday, expensesToday, partyPaymentsToday]);

  const denomSum = useMemo(() => sumDenominations(denoms), [denoms]);

  const handleDenomChange = (key: keyof CashierShiftDenominations, val: number) => {
    const next = { ...denoms, [key]: Math.max(0, val) };
    setDenoms(next);
    setActualCashInput(sumDenominations(next));
  };

  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenShift(openingCashInput, notes, shiftType);
    setMode('VIEW');
  };

  const handleEndShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalActual = useDenomCounter ? denomSum : actualCashInput;
    onCloseShift(finalActual, diffReason, notes, denoms, supervisorName);
    onClose();
  };

  const handlePrintZReport = () => {
    if (!currentShift || !financialSummary) return;
    const business = JSON.parse(localStorage.getItem('mock_business') || '{}');
    printShiftZReport(
      {
        ...financialSummary,
        actualCash: actualCashInput || financialSummary.expectedCash
      },
      currentShift,
      business
    );
  };

  const expectedCash = financialSummary ? financialSummary.expectedCash : (openingCashInput);
  const finalActual = useDenomCounter ? denomSum : actualCashInput;
  const difference = finalActual - expectedCash;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Cashier Shift & Cash Drawer Reconciliation
              </h2>
              <p className="text-xs text-slate-300">
                Cashier: <strong className="text-amber-300">{cashierName}</strong>
                {currentShift?.shiftType && <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded text-[10px] text-blue-300">{currentShift.shiftType} Shift</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentShift && currentShift.status === 'OPEN' && (
              <button
                type="button"
                onClick={handlePrintZReport}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                title="Print Shift Slip"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Slip</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs max-h-[80vh]">
          
          {/* Shift Status Banner */}
          {currentShift && currentShift.status === 'OPEN' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-sm">Shift ACTIVE (#{currentShift.shiftNumber})</span>
              </div>
              <span className="text-[11px] text-slate-600 font-medium">
                Started: {formatDate(currentShift.startTime)}
              </span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Clock className="w-4 h-4 text-amber-600" />
                No Active Shift Open for this Terminal
              </div>
              <button
                onClick={() => setMode('OPEN_FORM')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                Open New Shift
              </button>
            </div>
          )}

          {/* Mode 1: OPEN SHIFT FORM */}
          {mode === 'OPEN_FORM' && (
            <form onSubmit={handleStartShiftSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Banknote className="w-4 h-4 text-blue-600" />
                Open Cash Drawer Shift
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift Type</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Morning">Morning Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="General">General Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Opening Cash Float in Drawer (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={openingCashInput}
                    onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shift Notes / Float Details</label>
                <input
                  type="text"
                  placeholder="e.g. Morning counter shift with Rs. 5000 small change float"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Start Shift
              </button>
            </form>
          )}

          {/* Mode 2: ACTIVE SHIFT DASHBOARD */}
          {mode === 'VIEW' && currentShift && financialSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Opening Float</span>
                  <span className="text-sm font-black text-slate-900">{formatCurrency(financialSummary.openingCash)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Cash Sales</span>
                  <span className="text-sm font-black text-emerald-950">+{formatCurrency(financialSummary.cashSales)}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-700 block uppercase">Digital / Card</span>
                  <span className="text-sm font-black text-blue-950">{formatCurrency(financialSummary.cardSales + financialSummary.bankSales)}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-700 block uppercase">Shift Expenses</span>
                  <span className="text-sm font-black text-rose-950">-{formatCurrency(financialSummary.expensesTotal)}</span>
                </div>
              </div>

              {/* Cash Reconciliation Live Breakdown Box */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>(+) Opening Float:</span>
                  <span>{formatCurrency(financialSummary.openingCash)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>(+) Cash Sales ({financialSummary.shiftInvoices.filter(i => (i.paymentType || i.paymentMethod) === 'Cash').length} bills):</span>
                  <span>+{formatCurrency(financialSummary.cashSales)}</span>
                </div>
                {financialSummary.cashIn > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>(+) Customer Recoveries / Cash In:</span>
                    <span>+{formatCurrency(financialSummary.cashIn)}</span>
                  </div>
                )}
                {financialSummary.cashOut > 0 && (
                  <div className="flex justify-between text-xs text-amber-300">
                    <span>(-) Cash Sales Returns / Refunds:</span>
                    <span>-{formatCurrency(financialSummary.cashOut)}</span>
                  </div>
                )}
                {financialSummary.expensesTotal > 0 && (
                  <div className="flex justify-between text-xs text-rose-300">
                    <span>(-) Cash Expenses Paid from Drawer:</span>
                    <span>-{formatCurrency(financialSummary.expensesTotal)}</span>
                  </div>
                )}
                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-bold text-amber-300">
                  <span>Expected Drawer Cash Balance:</span>
                  <span className="text-base font-black">{formatCurrency(financialSummary.expectedCash)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrintZReport}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> Print Z-Slip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActualCashInput(financialSummary.expectedCash);
                    setMode('CLOSE_FORM');
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Lock className="w-4 h-4" /> End Shift & Reconcile
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: CLOSE SHIFT FORM */}
          {mode === 'CLOSE_FORM' && (
            <form onSubmit={handleEndShiftSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-rose-600" />
                  Close Shift & Reconcile Drawer Cash
                </h3>
                <button
                  type="button"
                  onClick={() => setUseDenomCounter(!useDenomCounter)}
                  className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  {useDenomCounter ? 'Switch to Simple Amount' : 'Use Note Denomination Counter'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Expected in Drawer:</span>
                  <span className="text-base font-black text-slate-900">{formatCurrency(expectedCash)}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Cash Discrepancy / Variance:</span>
                  <span className={`text-base font-black ${difference < -0.5 ? 'text-rose-600' : difference > 0.5 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {difference > 0 ? `+${formatCurrency(difference)} (Overage)` : difference < 0 ? `${formatCurrency(difference)} (Shortage)` : 'Exact (Balanced)'}
                  </span>
                </div>
              </div>

              {/* Denomination Counter Breakdown */}
              {useDenomCounter ? (
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1">
                    <span>Pakistani Currency Denominations</span>
                    <span className="text-blue-600 font-black">Sum: {formatCurrency(denomSum)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 5,000</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n5000 || ''}
                        onChange={(e) => handleDenomChange('n5000', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 1,000</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n1000 || ''}
                        onChange={(e) => handleDenomChange('n1000', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 500</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n500 || ''}
                        onChange={(e) => handleDenomChange('n500', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 100</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n100 || ''}
                        onChange={(e) => handleDenomChange('n100', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 50</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n50 || ''}
                        onChange={(e) => handleDenomChange('n50', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 20</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n20 || ''}
                        onChange={(e) => handleDenomChange('n20', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Rs. 10</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.n10 || ''}
                        onChange={(e) => handleDenomChange('n10', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">Coins / Change</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={denoms.coins || ''}
                        onChange={(e) => handleDenomChange('coins', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Physical Cash Counted in Drawer (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}

              {Math.abs(difference) > 0.5 && (
                <div>
                  <label className="font-bold text-rose-700 block mb-1">Variance Reason / Explanation (Required when difference exists)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Minor coin shortage, Unrecorded tea petty cash payout"
                    value={diffReason}
                    onChange={(e) => setDiffReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Supervisor / Auditor Sign-off (Optional)</label>
                <input
                  type="text"
                  placeholder="Manager / Supervisor Name"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('VIEW')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" /> Confirm & Finalize Shift Close
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            All shift reconciliation events are logged to audit trail.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

