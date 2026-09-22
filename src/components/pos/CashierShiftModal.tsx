import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Clock, Wallet, DollarSign, ArrowDownLeft, ArrowUpRight, 
  AlertTriangle, CheckCircle2, ShieldCheck, Printer, RefreshCw, 
  History, Plus, Lock, Unlock, HelpCircle, FileText, Download,
  Coins, CreditCard, Layers, Eye, UserCheck, AlertCircle
} from 'lucide-react';
import { CashierShift, ShiftCashMovement, Invoice, Expense } from '../../types';
import { dbCashierShifts } from '../../lib/db';
import { 
  calculateLiveShiftMetrics, 
  startNewShift, 
  addShiftMovement, 
  closeCashierShift, 
  PAK_DENOMINATIONS 
} from '../../lib/cashierShiftManager';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../lib/excelUtils';

interface CashierShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftStatusChange?: (shift: CashierShift | null) => void;
}

export const CashierShiftModal: React.FC<CashierShiftModalProps> = ({
  isOpen,
  onClose,
  onShiftStatusChange,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MOVEMENTS' | 'CLOSING' | 'HISTORY'>('OVERVIEW');
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [allShifts, setAllShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistoricalShift, setSelectedHistoricalShift] = useState<CashierShift | null>(null);

  // New Shift Form State
  const [newRegisterName, setNewRegisterName] = useState('Main POS Counter 1');
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(5000);
  const [newOpeningNotes, setNewOpeningNotes] = useState('');
  const [openingDenoms, setOpeningDenoms] = useState<Record<number, number>>({
    5000: 0,
    1000: 3,
    500: 2,
    100: 8,
    50: 4,
    20: 0,
    10: 0,
  });

  // Cash Movement Form State
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT' | 'SAFE_DROP' | 'EXPENSE_PAYOUT'>('SAFE_DROP');
  const [movementAmount, setMovementAmount] = useState<number | ''>('');
  const [movementReason, setMovementReason] = useState('');
  const [movementRefNo, setMovementRefNo] = useState('');
  const [movementApprover, setMovementApprover] = useState('');

  // Closing Form State
  const [closingDenoms, setClosingDenoms] = useState<Record<number, number>>({
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [manualCountedCash, setManualCountedCash] = useState<number | ''>('');
  const [useDenominationCounter, setUseDenominationCounter] = useState(true);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [supervisorApprover, setSupervisorApprover] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'BALANCED' | 'DISCREPANCY'>('ALL');

  // Load shifts on open
  const loadShifts = async () => {
    try {
      setLoading(true);
      const shifts = await dbCashierShifts.getAll();
      const sorted = (shifts || []).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setAllShifts(sorted);

      const openShift = sorted.find(s => s.status === 'OPEN') || null;
      if (openShift) {
        const live = await calculateLiveShiftMetrics(openShift);
        setActiveShift(live);
        onShiftStatusChange?.(live);
      } else {
        setActiveShift(null);
        onShiftStatusChange?.(null);
      }
    } catch (err) {
      console.error('Failed to load cashier shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShifts();
    }
  }, [isOpen]);

  // Recalculate opening balance total from denominations
  const totalFromOpeningDenoms = useMemo(() => {
    return Object.entries(openingDenoms).reduce((sum, [denom, count]) => {
      return sum + (Number(denom) * (Number(count) || 0));
    }, 0);
  }, [openingDenoms]);

  // Recalculate closing counted total from denominations
  const totalFromClosingDenoms = useMemo(() => {
    return Object.entries(closingDenoms).reduce((sum, [denom, count]) => {
      return sum + (Number(denom) * (Number(count) || 0));
    }, 0);
  }, [closingDenoms]);

  const effectiveCountedCash = useDenominationCounter 
    ? totalFromClosingDenoms 
    : (Number(manualCountedCash) || 0);

  const calculatedDiscrepancy = useMemo(() => {
    if (!activeShift) return 0;
    return Math.round((effectiveCountedCash - activeShift.expectedCash) * 100) / 100;
  }, [effectiveCountedCash, activeShift?.expectedCash]);

  // Handle Opening New Shift
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const finalOpening = useDenominationCounter && totalFromOpeningDenoms > 0 
        ? totalFromOpeningDenoms 
        : Number(newOpeningBalance) || 0;

      const cashierName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Counter Cashier';
      const cashierId = currentUser?.uid || currentUser?.id || 'cashier_1';

      const shift = await startNewShift({
        cashierId,
        cashierName,
        registerName: newRegisterName,
        openingBalance: finalOpening,
        openingNotes: newOpeningNotes,
        openingDenominations: openingDenoms,
      });

      const live = await calculateLiveShiftMetrics(shift);
      setActiveShift(live);
      onShiftStatusChange?.(live);
      setActiveTab('OVERVIEW');
      await loadShifts();
    } catch (err: any) {
      alert(`Error starting shift: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Adding Cash Movement
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    if (!movementAmount || Number(movementAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const cashierName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Cashier';
      
      const updated = await addShiftMovement(activeShift.id, {
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason || `${movementType.replace('_', ' ')} recorded`,
        performedBy: cashierName,
        referenceNo: movementRefNo,
        approvedBy: movementApprover,
      });

      setActiveShift(updated);
      onShiftStatusChange?.(updated);
      setMovementAmount('');
      setMovementReason('');
      setMovementRefNo('');
      setMovementApprover('');
      await loadShifts();
      alert(`Cash movement successfully recorded!`);
    } catch (err: any) {
      alert(`Error recording movement: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Closing Shift
  const handleCloseShift = async () => {
    if (!activeShift) return;
    
    if (calculatedDiscrepancy !== 0 && !discrepancyReason.trim()) {
      if (!confirm(`There is a cash ${calculatedDiscrepancy < 0 ? 'shortage' : 'overage'} of Rs ${Math.abs(calculatedDiscrepancy).toLocaleString()}. Do you want to proceed without entering a discrepancy reason?`)) {
        return;
      }
    }

    if (!confirm('Are you sure you want to finalize and CLOSE this cashier shift? This action will freeze the session and generate the final reconciliation certificate.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const closedBy = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Cashier';

      const closed = await closeCashierShift({
        shiftId: activeShift.id,
        closingCashActual: effectiveCountedCash,
        closingDenominations: closingDenoms,
        discrepancyReason,
        closingNotes,
        closedBy,
        approvedBy: supervisorApprover,
      });

      setActiveShift(null);
      onShiftStatusChange?.(null);
      setSelectedHistoricalShift(closed);
      await loadShifts();
      setActiveTab('HISTORY');
      alert(`Shift #${closed.shiftNumber} successfully closed and reconciled!`);
    } catch (err: any) {
      alert(`Error closing shift: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print Shift Thermal / Reconciliation Report
  const handlePrintReconciliation = (shiftToPrint: CashierShift) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const startDate = new Date(shiftToPrint.startTime).toLocaleString('en-PK');
    const endDate = shiftToPrint.endTime ? new Date(shiftToPrint.endTime).toLocaleString('en-PK') : 'In Progress (Active)';
    const discrepancy = shiftToPrint.discrepancy ?? (shiftToPrint.closingCashActual !== undefined ? shiftToPrint.closingCashActual - shiftToPrint.expectedCash : 0);

    const movementsRows = (shiftToPrint.movements || []).map(m => `
      <tr>
        <td style="padding: 4px; border-bottom: 1px dashed #ccc;">${new Date(m.timestamp).toLocaleTimeString()}</td>
        <td style="padding: 4px; border-bottom: 1px dashed #ccc;">${m.type.replace('_', ' ')}</td>
        <td style="padding: 4px; border-bottom: 1px dashed #ccc;">${m.reason || '-'}</td>
        <td style="padding: 4px; border-bottom: 1px dashed #ccc; text-align: right; font-weight: bold;">Rs ${(m.amount || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shift Reconciliation - ${shiftToPrint.shiftNumber}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 15px; color: #111; max-width: 380px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #333; margin: 8px 0; }
          .double-divider { border-top: 2px solid #333; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
          th { text-align: left; border-bottom: 1px solid #333; padding: 4px; }
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 2px 0; font-size: 16px;">MBI INVENTRA ERP</h2>
          <div style="font-size: 11px;">CASHIER SHIFT CLOSING & RECONCILIATION</div>
          <div class="bold" style="font-size: 13px; margin: 4px 0;">${shiftToPrint.shiftNumber}</div>
        </div>
        <div class="divider"></div>
        <div class="row"><span>Terminal / Register:</span> <span class="bold">${shiftToPrint.registerName}</span></div>
        <div class="row"><span>Cashier Name:</span> <span class="bold">${shiftToPrint.cashierName}</span></div>
        <div class="row"><span>Shift Start:</span> <span>${startDate}</span></div>
        <div class="row"><span>Shift End:</span> <span>${endDate}</span></div>
        <div class="row"><span>Status:</span> <span class="bold">${shiftToPrint.status}</span></div>
        <div class="divider"></div>

        <div class="center bold" style="margin: 4px 0;">SALES & REVENUE SUMMARY</div>
        <div class="row"><span>Total Invoices Count:</span> <span class="bold">${shiftToPrint.invoicesCount || 0}</span></div>
        <div class="row"><span>Cash Sales:</span> <span>Rs ${(shiftToPrint.cashSales || 0).toLocaleString()}</span></div>
        <div class="row"><span>Credit/Debit Card Sales:</span> <span>Rs ${(shiftToPrint.cardSales || 0).toLocaleString()}</span></div>
        <div class="row"><span>Bank / Raast Sales:</span> <span>Rs ${(shiftToPrint.bankSales || 0).toLocaleString()}</span></div>
        <div class="row"><span>Credit (Receivable) Sales:</span> <span>Rs ${(shiftToPrint.creditSales || 0).toLocaleString()}</span></div>
        <div class="row bold" style="font-size: 13px;"><span>Gross Sales:</span> <span>Rs ${(shiftToPrint.totalSales || 0).toLocaleString()}</span></div>
        
        <div class="divider"></div>
        <div class="row"><span>Sales Returns / Refunds (${shiftToPrint.returnsCount || 0}):</span> <span style="color: #c00;">-Rs ${(shiftToPrint.cashReturns || 0).toLocaleString()}</span></div>
        
        <div class="divider"></div>
        <div class="center bold" style="margin: 4px 0;">CASH DRAWER TILL AUDIT</div>
        <div class="row"><span>(+) Opening Cash Float:</span> <span>Rs ${(shiftToPrint.openingBalance || 0).toLocaleString()}</span></div>
        <div class="row"><span>(+) Cash Sales Collected:</span> <span>Rs ${(shiftToPrint.cashSales || 0).toLocaleString()}</span></div>
        <div class="row"><span>(+) Float Injections (Cash In):</span> <span>Rs ${(shiftToPrint.cashIn || 0).toLocaleString()}</span></div>
        <div class="row"><span>(-) Safe Drops (Cash Out):</span> <span>-Rs ${(shiftToPrint.cashOut || 0).toLocaleString()}</span></div>
        <div class="row"><span>(-) Direct Register Expenses:</span> <span>-Rs ${(shiftToPrint.expensesPaid || 0).toLocaleString()}</span></div>
        <div class="row"><span>(-) Cash Refunds:</span> <span>-Rs ${(shiftToPrint.cashReturns || 0).toLocaleString()}</span></div>
        <div class="double-divider"></div>
        <div class="row bold" style="font-size: 13px;"><span>EXPECTED CASH IN DRAWER:</span> <span>Rs ${(shiftToPrint.expectedCash || 0).toLocaleString()}</span></div>
        
        ${shiftToPrint.closingCashActual !== undefined ? `
          <div class="row bold" style="font-size: 13px;"><span>PHYSICAL CASH COUNTED:</span> <span>Rs ${shiftToPrint.closingCashActual.toLocaleString()}</span></div>
          <div class="double-divider"></div>
          <div class="row bold" style="font-size: 14px; color: ${discrepancy === 0 ? '#008000' : discrepancy < 0 ? '#cc0000' : '#d97706'};">
            <span>DISCREPANCY (${discrepancy === 0 ? 'BALANCED' : discrepancy < 0 ? 'SHORTAGE' : 'OVERAGE'}):</span>
            <span>Rs ${discrepancy >= 0 ? '+' : ''}${discrepancy.toLocaleString()}</span>
          </div>
          ${shiftToPrint.discrepancyReason ? `<div style="font-size: 11px; margin-top: 4px;"><strong>Reason:</strong> ${shiftToPrint.discrepancyReason}</div>` : ''}
        ` : ''}

        ${(shiftToPrint.movements && shiftToPrint.movements.length > 0) ? `
          <div class="divider"></div>
          <div class="bold" style="font-size: 11px; margin: 4px 0;">CASH MOVEMENTS LOG:</div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Reason</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${movementsRows}
            </tbody>
          </table>
        ` : ''}

        <div class="divider" style="margin-top: 20px;"></div>
        <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>
            <div>___________________</div>
            <div class="bold">Cashier Signature</div>
            <div>${shiftToPrint.cashierName}</div>
          </div>
          <div style="text-align: right;">
            <div>___________________</div>
            <div class="bold">Manager Sign-off</div>
            <div>${shiftToPrint.approvedBy || 'Supervisor'}</div>
          </div>
        </div>
        <div class="center" style="margin-top: 15px; font-size: 10px; color: #666;">
          System generated via MBI Inventra POS & ERP
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Export Shifts to Excel
  const handleExportShifts = () => {
    const exportData = allShifts.map(s => ({
      'Shift #': s.shiftNumber,
      'Register': s.registerName,
      'Cashier': s.cashierName,
      'Start Time': new Date(s.startTime).toLocaleString(),
      'End Time': s.endTime ? new Date(s.endTime).toLocaleString() : 'Open',
      'Status': s.status,
      'Opening Balance (PKR)': s.openingBalance,
      'Cash Sales (PKR)': s.cashSales,
      'Card Sales (PKR)': s.cardSales,
      'Bank Sales (PKR)': s.bankSales,
      'Credit Sales (PKR)': s.creditSales,
      'Total Sales (PKR)': s.totalSales,
      'Invoices Count': s.invoicesCount,
      'Cash In (PKR)': s.cashIn,
      'Cash Out (PKR)': s.cashOut,
      'Expenses Paid (PKR)': s.expensesPaid,
      'Cash Returns (PKR)': s.cashReturns,
      'Expected Cash (PKR)': s.expectedCash,
      'Actual Cash Counted (PKR)': s.closingCashActual ?? 'N/A',
      'Discrepancy (PKR)': s.discrepancy ?? 'N/A',
      'Discrepancy Reason': s.discrepancyReason || '',
      'Closed By': s.closedBy || '',
      'Approved By': s.approvedBy || '',
    }));

    exportToExcel(exportData, `Cashier_Shifts_Reconciliation_${new Date().toISOString().split('T')[0]}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 rounded-xl border border-blue-500/40 text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Cashier Shift & Register Closing</h2>
                {activeShift ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE SHIFT: {activeShift.shiftNumber}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    NO ACTIVE SHIFT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Opening balances, cash drawer movements, expense payouts, and end-of-shift reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeShift && (
              <button
                onClick={() => loadShifts()}
                disabled={loading}
                className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Refresh Live Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="px-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Shift Overview</span>
            </button>

            {activeShift && (
              <>
                <button
                  onClick={() => setActiveTab('MOVEMENTS')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'MOVEMENTS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Cash In / Out Drops</span>
                  {activeShift.movements?.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-700/50 text-[10px] rounded-full">
                      {activeShift.movements.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('CLOSING')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'CLOSING'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Close & Reconcile Shift</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Shift History ({allShifts.length})</span>
            </button>
          </div>

          {activeShift && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-500">Live Till Expected:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Rs {activeShift.expectedCash.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* ========================================================================= */}
          {/* 1. OVERVIEW TAB */}
          {/* ========================================================================= */}
          {activeTab === 'OVERVIEW' && (
            <div>
              {activeShift ? (
                <div className="space-y-5">
                  {/* Shift Information Header Card */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-200">
                        <Unlock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base">{activeShift.registerName}</h3>
                          <span className="text-xs text-slate-500">({activeShift.shiftNumber})</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Cashier: <strong className="text-slate-800">{activeShift.cashierName}</strong> • Started:{' '}
                          {new Date(activeShift.startTime).toLocaleString('en-PK')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrintReconciliation(activeShift)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Print Interim Slip</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('CLOSING')}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>End Shift</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opening Cash Float</div>
                      <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                        Rs {activeShift.openingBalance.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Initial drawer balance</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Cash Sales</div>
                      <div className="text-base sm:text-lg font-black text-emerald-700 mt-1">
                        Rs {activeShift.cashSales.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{activeShift.invoicesCount} total invoices</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Net Cash Flow</div>
                      <div className="text-base sm:text-lg font-black text-blue-700 mt-1">
                        Rs {(activeShift.cashIn - activeShift.cashOut - activeShift.expensesPaid - activeShift.cashReturns).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">In/Out, drops & expenses</div>
                    </div>

                    <div className="bg-emerald-500 text-white p-3.5 rounded-xl shadow-xs">
                      <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Expected in Drawer</div>
                      <div className="text-lg sm:text-xl font-black mt-1">
                        Rs {activeShift.expectedCash.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-emerald-100 mt-0.5">Physical till target</div>
                    </div>
                  </div>

                  {/* Cash Flow Audit Formula Equation Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Live Cash Reconciliation Audit
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-semibold">Opening Float</div>
                        <div className="font-bold text-slate-800 mt-0.5">Rs {activeShift.openingBalance.toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-semibold">(+) Cash Sales</div>
                        <div className="font-bold text-emerald-800 mt-0.5">+Rs {activeShift.cashSales.toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-[10px] text-blue-700 font-semibold">(+) Cash In</div>
                        <div className="font-bold text-blue-800 mt-0.5">+Rs {activeShift.cashIn.toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="text-[10px] text-amber-700 font-semibold">(-) Safe Drops</div>
                        <div className="font-bold text-amber-800 mt-0.5">-Rs {activeShift.cashOut.toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                        <div className="text-[10px] text-rose-700 font-semibold">(-) Expenses & Refunds</div>
                        <div className="font-bold text-rose-800 mt-0.5">-Rs {(activeShift.expensesPaid + activeShift.cashReturns).toLocaleString()}</div>
                      </div>
                      <div className="p-2.5 bg-slate-900 text-white rounded-lg">
                        <div className="text-[10px] text-slate-400 font-semibold">(=) Expected Till</div>
                        <div className="font-black text-emerald-400 mt-0.5">Rs {activeShift.expectedCash.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown & Recent Movements Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Sales by Payment Method */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        Sales by Payment Method
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-700">Cash Payments</span>
                          <span className="font-bold text-slate-900">Rs {activeShift.cashSales.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-700">Credit / Debit Cards</span>
                          <span className="font-bold text-slate-900">Rs {activeShift.cardSales.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-700">Bank Transfer / Raast</span>
                          <span className="font-bold text-slate-900">Rs {activeShift.bankSales.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                          <span className="font-medium text-slate-700">Customer Credit (Unpaid Ledger)</span>
                          <span className="font-bold text-slate-900">Rs {activeShift.creditSales.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm text-slate-900">
                          <span>Total Shift Revenue:</span>
                          <span className="text-blue-600">Rs {activeShift.totalSales.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Cash In / Out Movements in Shift */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-600" />
                          Drawer Cash Adjustments ({activeShift.movements?.length || 0})
                        </h4>
                        <button
                          onClick={() => setActiveTab('MOVEMENTS')}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          + Record Movement
                        </button>
                      </div>

                      {activeShift.movements && activeShift.movements.length > 0 ? (
                        <div className="space-y-2 max-h-44 overflow-y-auto text-xs divide-y divide-slate-100">
                          {activeShift.movements.map((m) => (
                            <div key={m.id} className="pt-2 first:pt-0 flex items-center justify-between">
                              <div>
                                <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                                  m.type === 'CASH_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {m.type.replace('_', ' ')}
                                </span>
                                <span className="text-slate-600 ml-1.5">{m.reason}</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold ${m.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {m.type === 'CASH_IN' ? '+' : '-'}Rs {m.amount.toLocaleString()}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No intermediate cash drops or float additions during this shift.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* START NEW SHIFT VIEW                                      */
                /* ========================================================= */
                <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-200">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">Start Cashier Shift</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Open a new POS register session to track cash drawer balance and sales
                    </p>
                  </div>

                  <form onSubmit={handleStartShift} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">POS Terminal / Register *</label>
                        <input
                          type="text"
                          value={newRegisterName}
                          onChange={(e) => setNewRegisterName(e.target.value)}
                          required
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Counter 1 - Main POS"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cashier Name</label>
                        <input
                          type="text"
                          disabled
                          value={currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Cashier 1'}
                          className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Opening Balance input + Pakistani Currency Note Counter */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-emerald-600" />
                          Opening Cash Float Breakdown
                        </label>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Total Float: Rs {totalFromOpeningDenoms.toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PAK_DENOMINATIONS.slice(0, 7).map((denom) => (
                          <div key={denom} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-600 w-12 shrink-0">Rs {denom}:</span>
                            <input
                              type="number"
                              min="0"
                              value={openingDenoms[denom] || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setOpeningDenoms(prev => ({ ...prev, [denom]: val }));
                              }}
                              placeholder="0"
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 text-right font-semibold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Opening Notes (Optional)</label>
                      <input
                        type="text"
                        value={newOpeningNotes}
                        onChange={(e) => setNewOpeningNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. Morning shift opening with 5000 float"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{isSubmitting ? 'Opening Shift...' : `Start Shift (Rs ${totalFromOpeningDenoms.toLocaleString()} Float)`}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. CASH MOVEMENTS (CASH IN / SAFE DROPS / EXPENSES)                      */}
          {/* ========================================================================= */}
          {activeTab === 'MOVEMENTS' && activeShift && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Movement Entry Form */}
              <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-600" />
                  Record Cash Movement
                </h3>

                <form onSubmit={handleAddMovement} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Movement Type *</label>
                    <select
                      value={movementType}
                      onChange={(e: any) => setMovementType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800"
                    >
                      <option value="SAFE_DROP">Safe Drop / Cash Out (Transfer to Main Safe)</option>
                      <option value="CASH_IN">Cash In (Float Top-up / Coin Deposit)</option>
                      <option value="CASH_OUT">General Cash Out (Manual Withdrawal)</option>
                      <option value="EXPENSE_PAYOUT">Direct Register Expense Payout</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount (PKR) *</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 10000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reason / Description *</label>
                    <input
                      type="text"
                      required
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                      placeholder="e.g. Mid-day excess cash drop to manager safe"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Voucher / Slip Reference #</label>
                    <input
                      type="text"
                      value={movementRefNo}
                      onChange={(e) => setMovementRefNo(e.target.value)}
                      placeholder="e.g. DROP-0941"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Approved By (Supervisor / Manager)</label>
                    <input
                      type="text"
                      value={movementApprover}
                      onChange={(e) => setMovementApprover(e.target.value)}
                      placeholder="e.g. M Bilal Inayat"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer mt-2"
                  >
                    {isSubmitting ? 'Recording...' : 'Record Cash Movement'}
                  </button>
                </form>
              </div>

              {/* Movements History Table */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                  <span>Shift Cash Movements Ledger</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total Movements: <strong>{activeShift.movements?.length || 0}</strong>
                  </span>
                </h3>

                {activeShift.movements && activeShift.movements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="p-2.5">Time</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Reason</th>
                          <th className="p-2.5">Ref #</th>
                          <th className="p-2.5">Approver</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeShift.movements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/70">
                            <td className="p-2.5 text-slate-500">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.type === 'CASH_IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {m.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-2.5 font-medium text-slate-800">{m.reason}</td>
                            <td className="p-2.5 text-slate-500">{m.referenceNo || '-'}</td>
                            <td className="p-2.5 text-slate-500">{m.approvedBy || '-'}</td>
                            <td className={`p-2.5 text-right font-bold ${
                              m.type === 'CASH_IN' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {m.type === 'CASH_IN' ? '+' : '-'}Rs {m.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                    <Coins className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No cash movements logged yet for this shift.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. CLOSING & RECONCILIATION TAB                                          */}
          {/* ========================================================================= */}
          {activeTab === 'CLOSING' && activeShift && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Closing Header */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-rose-600" />
                    Physical Cash Drawer Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Count the physical cash in till and reconcile against expected total for {activeShift.shiftNumber}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Method:</span>
                  <button
                    type="button"
                    onClick={() => setUseDenominationCounter(!useDenominationCounter)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    {useDenominationCounter ? 'Switch to Manual Total' : 'Switch to Note Breakdown'}
                  </button>
                </div>
              </div>

              {/* Denomination Counter Grid or Manual Total Input */}
              {useDenominationCounter ? (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      Physical Currency Notes Counter (PKR)
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Total Counted: Rs {totalFromClosingDenoms.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PAK_DENOMINATIONS.map((denom) => {
                      const count = closingDenoms[denom] || 0;
                      const subtotal = denom * count;
                      return (
                        <div key={denom} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>Rs {denom.toLocaleString()}</span>
                            <span className="text-slate-400 text-[11px]">= Rs {subtotal.toLocaleString()}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={closingDenoms[denom] || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setClosingDenoms(prev => ({ ...prev, [denom]: val }));
                            }}
                            placeholder="0 count"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 text-right"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Direct Counted Cash in Drawer (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={manualCountedCash}
                    onChange={(e) => setManualCountedCash(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter total physical cash counted in drawer"
                    className="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-black text-slate-900"
                  />
                </div>
              )}

              {/* Real-time Discrepancy & Audit Card */}
              <div className={`p-5 rounded-xl border shadow-sm transition-all ${
                calculatedDiscrepancy === 0
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : calculatedDiscrepancy < 0
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div>
                    <div className="text-[11px] font-bold opacity-75 uppercase tracking-wider">System Expected Cash</div>
                    <div className="text-lg font-black mt-0.5">Rs {activeShift.expectedCash.toLocaleString()}</div>
                    <div className="text-[11px] opacity-75">Opening + Cash Sales ± Adjustments</div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold opacity-75 uppercase tracking-wider">Counted Physical Cash</div>
                    <div className="text-lg font-black mt-0.5">Rs {effectiveCountedCash.toLocaleString()}</div>
                    <div className="text-[11px] opacity-75">Physical drawer count</div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-[11px] font-bold opacity-75 uppercase tracking-wider">Reconciliation Status</div>
                    <div className="text-xl font-black mt-0.5 flex items-center sm:justify-end gap-1.5">
                      {calculatedDiscrepancy === 0 ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Exact Match (Rs 0.00)</span>
                        </>
                      ) : calculatedDiscrepancy < 0 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-rose-600" />
                          <span>Shortage: -Rs {Math.abs(calculatedDiscrepancy).toLocaleString()}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                          <span>Surplus: +Rs {calculatedDiscrepancy.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] opacity-75 font-semibold">
                      {calculatedDiscrepancy === 0
                        ? '100% Balanced - Financial integrity verified'
                        : calculatedDiscrepancy < 0
                        ? 'Cash drawer is short compared to system'
                        : 'Cash drawer has excess cash surplus'}
                    </div>
                  </div>
                </div>

                {/* Discrepancy explanation required if not balanced */}
                {calculatedDiscrepancy !== 0 && (
                  <div className="mt-4 pt-3 border-t border-rose-200/60">
                    <label className="block text-xs font-bold mb-1">
                      Discrepancy Explanation & Root Cause *
                    </label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder="e.g. Small change rounding difference / pending receipt"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Sign-off and Notes */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closing Notes / Comments</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="e.g. End of shift, drawer locked"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supervisor / Manager Sign-off</label>
                  <input
                    type="text"
                    value={supervisorApprover}
                    onChange={(e) => setSupervisorApprover(e.target.value)}
                    placeholder="e.g. Approved by Branch Manager"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCloseShift}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Closing Shift...' : 'Finalize & Close Shift'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. HISTORY & AUDIT TAB                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              {/* History Search & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search shift #, cashier, or register..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                    <button
                      onClick={() => setHistoryFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        historyFilter === 'ALL' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600'
                      }`}
                    >
                      All ({allShifts.length})
                    </button>
                    <button
                      onClick={() => setHistoryFilter('BALANCED')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        historyFilter === 'BALANCED' ? 'bg-white shadow-xs text-emerald-600 font-bold' : 'text-slate-600'
                      }`}
                    >
                      Balanced
                    </button>
                    <button
                      onClick={() => setHistoryFilter('DISCREPANCY')}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        historyFilter === 'DISCREPANCY' ? 'bg-white shadow-xs text-rose-600 font-bold' : 'text-slate-600'
                      }`}
                    >
                      Discrepancies
                    </button>
                  </div>

                  <button
                    onClick={handleExportShifts}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Shifts Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">Shift #</th>
                        <th className="p-3">Register / Terminal</th>
                        <th className="p-3">Cashier</th>
                        <th className="p-3">Timeframe</th>
                        <th className="p-3 text-right">Opening Float</th>
                        <th className="p-3 text-right">Cash Sales</th>
                        <th className="p-3 text-right">Expected Till</th>
                        <th className="p-3 text-right">Counted Cash</th>
                        <th className="p-3 text-center">Discrepancy</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allShifts
                        .filter(s => {
                          const matchesQ = !historySearch || 
                            s.shiftNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
                            s.cashierName.toLowerCase().includes(historySearch.toLowerCase()) ||
                            s.registerName.toLowerCase().includes(historySearch.toLowerCase());
                          
                          if (historyFilter === 'BALANCED') {
                            return matchesQ && s.discrepancy === 0;
                          }
                          if (historyFilter === 'DISCREPANCY') {
                            return matchesQ && s.discrepancy !== undefined && s.discrepancy !== 0;
                          }
                          return matchesQ;
                        })
                        .map((shift) => {
                          const isBalanced = shift.discrepancy === 0;
                          const hasDiscrepancy = shift.discrepancy !== undefined && shift.discrepancy !== 0;

                          return (
                            <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-bold text-slate-900">{shift.shiftNumber}</td>
                              <td className="p-3 font-medium text-slate-700">{shift.registerName}</td>
                              <td className="p-3 text-slate-700">{shift.cashierName}</td>
                              <td className="p-3 text-slate-500">
                                <div>{new Date(shift.startTime).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                  {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                </div>
                              </td>
                              <td className="p-3 text-right font-medium">Rs {shift.openingBalance.toLocaleString()}</td>
                              <td className="p-3 text-right font-medium text-emerald-600">Rs {shift.cashSales.toLocaleString()}</td>
                              <td className="p-3 text-right font-bold text-slate-900">Rs {shift.expectedCash.toLocaleString()}</td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {shift.closingCashActual !== undefined ? `Rs ${shift.closingCashActual.toLocaleString()}` : '-'}
                              </td>
                              <td className="p-3 text-center">
                                {shift.status === 'OPEN' ? (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                ) : isBalanced ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Exact 0.00
                                  </span>
                                ) : hasDiscrepancy ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    (shift.discrepancy || 0) < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {(shift.discrepancy || 0) > 0 ? '+' : ''}{shift.discrepancy?.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  shift.status === 'OPEN' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {shift.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handlePrintReconciliation(shift)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                                  title="Print Shift Reconciliation Certificate"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted POS Till Audit & Discrepancy Tracking</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
